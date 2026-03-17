const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const cheerio = require("cheerio");
const axios = require("axios");
const AdmZip = require("adm-zip");
const crypto = require("crypto");


admin.initializeApp();

const db = admin.firestore();
const BASE_URL = 'https://planningaccess.york.gov.uk/online-applications';

/**
 * Generates a consistent, human-readable folder name for storage
 */
function getStoragePath(projectId, address = '') {
  if (!address) return `projects/${projectId}`;
  const slug = address.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30); // Keep it reasonably short
  return `projects/${slug}_${projectId}`;
}

function parseDetailPagesLogic(htmlList) {
  const fields = {};
  for (const html of htmlList) {
    const $ = cheerio.load(html);
    $('table tr, #simpleDetailsTable tr').each((i, row) => {
      const th = $(row).find('th').text().replace(/\s+/g, ' ').trim().toLowerCase();
      const td = $(row).find('td').text().replace(/\s+/g, ' ').trim();
      if (th && td && !fields[th]) {
        fields[th] = td;
      }
    });
  }

  const rawStatus = fields['status'] || null;
  const decisionText = fields['decision'] || null;
  const effectiveStatus = (rawStatus && rawStatus !== 'Unknown') ? rawStatus : (decisionText || rawStatus || 'Unknown');

  return {
    reference: fields['reference'] || fields['ref. no:'] || null,
    applicantName: fields['applicant name'] || fields['applicant'] || null,
    applicationReceived: fields['application received'] || fields['date received'] || null,
    applicationValidated: fields['application validated'] || fields['date validated'] || null,
    appStatus: effectiveStatus,
    decisionText: decisionText,
    decisionDateStr: fields['decision issued date'] || fields['decision date'] || null,
    fullDescription: fields['proposal'] || fields['description'] || null,
  };
}

exports.scraper = onRequest({ 
  cors: true,
  invoker: "public",
  timeoutSeconds: 540,
  memory: "2GiB" 
}, async (req, res) => {
  const puppeteer = require("puppeteer-core");
  const chromium = require("@sparticuz/chromium");
  
  const stats = { added: 0, existing: 0, errors: 0 };
  let browser = null;

  try {
    const targetWeek = req.body.targetWeek || req.query.targetWeek || null;
    logger.info("Starting scraper for week:", targetWeek);

    const executablePath = await chromium.executablePath();
    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath || undefined,
      headless: true,
    });

    const page = await browser.newPage();
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';
    await page.setUserAgent(UA);

    // Phase 1: Search Weekly List
    await page.goto(`${BASE_URL}/search.do?action=weeklyList`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('select#week', { timeout: 10000 });

    if (targetWeek) {
      await page.select('select#week', targetWeek);
    }

    // Select Decided - Benchmark Logic
    await page.click('input[name="dateType"][value="DC_Decided"]').catch(() => {});
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('input[type="submit"].button.primary')
    ]);

    // Phase 2: Iterate results
    let hasNextPage = true;
    while (hasNextPage) {
      await page.waitForSelector('#searchresults', { timeout: 10000 });
      const results = await page.evaluate(() => 
        Array.from(document.querySelectorAll('#searchresults .searchresult')).map(el => ({
          href: el.querySelector('a')?.getAttribute('href'),
          addr: el.querySelector('.address') ? el.querySelector('.address').innerText.replace(/\s+/g, ' ').trim() : '',
          desc: el.querySelector('a') ? el.querySelector('a').innerText.replace(/\s+/g, ' ').trim() : ''
        }))
      );

      for (const app of results) {
        if (!app.desc.toLowerCase().includes('extension')) continue;

        const keyVal = new URLSearchParams(app.href.split('?')[1]).get('keyVal');
        const docRef = db.collection('projects').doc(keyVal);
        const existingDoc = await docRef.get();

        // PHASE 3: Navigate and Scrape (Identical to Benchmark flow)
        const detailPage = await browser.newPage();
        try {
          await detailPage.goto(`${BASE_URL}/applicationDetails.do?activeTab=summary&keyVal=${keyVal}`, { waitUntil: 'networkidle2', timeout: 30000 });
          const summaryHtml = await detailPage.content();

          let furtherHtml = '';
          try {
            await detailPage.click('#subtab_details');
            await detailPage.waitForSelector('table tr', { timeout: 10000 });
            furtherHtml = await detailPage.content();
          } catch (e) { logger.warn(`[${keyVal}] No further info tab`); }

          const parsed = parseDetailPagesLogic([summaryHtml, furtherHtml]);
          
          // Default Decided Date to 'Now' if missing (Matching Benchmark Logic)
          let decidedDate = new Date();
          if (parsed.decisionDateStr) {
            const p = new Date(parsed.decisionDateStr);
            if (!isNaN(p)) decidedDate = p;
          }

          const projectData = {
            id: keyVal,
            reference: parsed.reference || null,
            address: app.addr,
            description: parsed.fullDescription || app.desc,
            applicationStatus: parsed.appStatus,
            applicantName: parsed.applicantName || 'Unknown',
            dateReceived: parsed.applicationReceived || null,
            dateValidated: parsed.applicationValidated || null,
            dateDecided: decidedDate.toISOString(),
            url: `https://planningaccess.york.gov.uk/online-applications/applicationDetails.do?activeTab=summary&keyVal=${keyVal}`,
            status: 'New', // Internal Status
            timestamp: new Date().toISOString()
          };

          // Geocoding logic
          try {
            const encoded = encodeURIComponent(`${app.addr}, York, UK`);
            const geo = await axios.get(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
              { headers: { 'User-Agent': 'BenchmarkIntelligence/1.0 (jamie.dark.business@gmail.com)' }, timeout: 8000 }
            );
            if (geo.data && geo.data.length > 0) {
              projectData.coordinates = {
                lat: parseFloat(geo.data[0].lat),
                lng: parseFloat(geo.data[0].lon),
              };
            }
          } catch (geoErr) {
            logger.warn(`Geocoding failed for ${app.addr}`, geoErr);
          }

          // Use set with merge to replicate benchmark update behavior
          await docRef.set(projectData, { merge: true });
          
          if (existingDoc.exists) stats.existing++;
          else stats.added++;

        } catch (detailErr) {
          logger.error(`Error scraping detail page for ${keyVal}`, detailErr);
          stats.errors++;
        } finally {
          await detailPage.close();
        }
      }

      // Next page?
      hasNextPage = await page.evaluate(() => {
        const next = document.querySelector('a.next');
        if (next) { next.click(); return true; }
        return false;
      });
      if (hasNextPage) await page.waitForNavigation({ waitUntil: 'networkidle2' });
    }

    res.json({ success: true, stats });
  } catch (error) {
    logger.error("Scraper fatal error", error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

// Single URL Planning Scraper
exports.scrapePlanningData = onRequest({ 
  cors: true,
  invoker: "public",
  timeoutSeconds: 60,
  memory: "512MiB" 
}, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send({ success: false, error: "No URL provided" });

  try {
    const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(response.data);
    
    const result = {
      address: $(".address").first().text().trim(),
      portalRef: $("th:contains('Reference')").next().text().trim(),
      description: $("th:contains('Proposal')").next().text().trim(),
      status: $("th:contains('Status')").next().text().trim(),
    };

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// Single URL Property Image Scraper
exports.scrapePropertyImage = onRequest({ 
  cors: true, 
  invoker: "public",
  timeoutSeconds: 60, 
  memory: "256MiB" 
}, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send({ success: false, error: "No URL provided" });

  try {
    const response = await axios.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } 
    });
    const $ = cheerio.load(response.data);
    const imageUrl = $("meta[property='og:image']").attr("content");
    res.json({ success: true, imageUrl });
  } catch (error) {
    logger.error("Image error", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

/**
 * Google Drive Workspace Creation
 * Requires service account credentials in secret: GOOGLE_DRIVE_CONFIG
 */
exports.createProjectWorkspace = onRequest({
  cors: true,
  invoker: "public",
  timeoutSeconds: 300,
  memory: "2GiB",
  secrets: ["GOOGLE_DRIVE_CONFIG"]
}, async (req, res) => {
  const { address, keyVal } = req.body;
  if (!address) return res.status(400).json({ error: "Missing address" });

  let browser = null;
  try {
    const { google } = require("googleapis");
    const puppeteer = require("puppeteer-core");
    const chromium = require("@sparticuz/chromium");
    
    const driveCreds = process.env.GOOGLE_DRIVE_CONFIG ? JSON.parse(process.env.GOOGLE_DRIVE_CONFIG) : null;
    if (!driveCreds) throw new Error("Google Drive credentials not configured.");

    const settingsSnap = await db.collection('settings').doc('global').get();
    let googleDriveFolderId = settingsSnap.exists ? settingsSnap.data().googleDriveFolderId : "1gZwFfBYS5idiyV9ZMuVyUwEhYXuijAxY";

    const auth = new google.auth.GoogleAuth({
      credentials: driveCreds,
      scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/drive.file"],
    });
    const drive = google.drive({ version: "v3", auth });

    const findOrCreateFolder = async (name, parentId = null) => {
      let q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      if (parentId) q += ` and '${parentId}' in parents`;
      const list = await drive.files.list({ q, fields: "files(id)" });
      if (list.data.files && list.data.files.length > 0) {
        return list.data.files[0].id;
      }
      const metadata = { name, mimeType: "application/vnd.google-apps.folder" };
      if (parentId) metadata.parents = [parentId];
      const folder = await drive.files.create({ 
        resource: metadata, 
        fields: "id",
        supportsAllDrives: true 
      });
      return folder.data.id;
    };

    let parentRootId = googleDriveFolderId || null;
    let propertyFolderId = await findOrCreateFolder(address, parentRootId);
    const docsFolderId = await findOrCreateFolder("Documents", propertyFolderId);
    const previewsFolderId = await findOrCreateFolder("Previews", propertyFolderId);

    const uploadedFiles = [];
    if (keyVal) {
      logger.info(`Starting scrape for project: ${keyVal}`);
      const executablePath = await chromium.executablePath();
      browser = await puppeteer.launch({
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: executablePath || undefined,
        headless: true,
      });
      const page = await browser.newPage();
      
      let realKeyVal = keyVal;
      
      // If keyVal contains a slash, it's a reference number, not a keyVal
      if (keyVal.includes('/')) {
        logger.info(`Searching for real keyVal using ref: ${keyVal}`);
        await page.goto(`${BASE_URL}/search.do?action=simple&searchType=Application`);
        await page.type('#caseAddressNumber', keyVal); // Sometimes works in address field
        // More reliably, use the actual reference field if possible, but Simple Search is usually enough
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        const currentUrl = page.url();
        if (currentUrl.includes('keyVal=')) {
           realKeyVal = new URLSearchParams(currentUrl.split('?')[1]).get('keyVal');
           logger.info(`Found realKeyVal: ${realKeyVal}`);
        }
      }

      const docsUrl = `${BASE_URL}/applicationDetails.do?activeTab=documents&keyVal=${realKeyVal}`;
      await page.goto(docsUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      const docLinks = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('#Documents tr, #documents tr'));
        return rows.map(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 3) return null;
          const a = row.querySelector('a.recaptcha-link, a[href*="pdf"]');
          const description = cells[cells.length - 2]?.innerText.trim() || 'Document';
          const type = cells[1]?.innerText.trim() || '';
          return {
             name: `${type}_${description}`.replace(/[^a-z0-9]/gi, '_'),
             url: a ? a.href : null
          };
        }).filter(d => d && d.url);
      });

      for (const doc of docLinks) {
        try {
          const base64Data = await page.evaluate(async (url) => {
            const resp = await fetch(url);
            const blob = await resp.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(blob);
            });
          }, doc.url);

          const stream = require('stream');
          const bufferStream = new stream.PassThrough();
          bufferStream.end(Buffer.from(base64Data, 'base64'));

          const file = await drive.files.create({
            requestBody: { name: `${doc.name}.pdf`, parents: [docsFolderId] },
            media: { mimeType: 'application/pdf', body: bufferStream },
            supportsAllDrives: true,
            fields: "id,webViewLink"
          });
          uploadedFiles.push({ name: `${doc.name}.pdf`, url: file.data.webViewLink });
        } catch (e) { logger.warn(`Scrape skip: ${doc.name}`); }
      }

      // Summary Screenshot
      try {
        await page.goto(`${BASE_URL}/applicationDetails.do?activeTab=summary&keyVal=${keyVal}`, { waitUntil: 'networkidle2' });
        const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
        const stream = require('stream');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(screenshot);
        
        const file = await drive.files.create({
          requestBody: { name: 'summary.jpg', parents: [previewsFolderId] },
          media: { mimeType: 'image/jpeg', body: bufferStream },
          supportsAllDrives: true,
          fields: "id,webViewLink"
        });
        uploadedFiles.push({ name: 'summary_preview.jpg', url: file.data.webViewLink, isPreview: true });
      } catch (e) { logger.warn(`Preview skip`); }
    }

    res.json({ 
      success: true, 
      folderId: propertyFolderId, 
      docsFolderId: docsFolderId,
      files: uploadedFiles 
    });
  } catch (error) {
    logger.error("Workspace fatal error", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

/**
 * Upload File to Drive (Method A)
 */
exports.uploadToDrive = onRequest({
  cors: true,
  invoker: "public",
  timeoutSeconds: 300,
  memory: "512MiB"
}, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const Busboy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  return new Promise((resolve) => {
    const busboy = Busboy({ headers: req.headers });
    const fileUploads = [];
    let projectId = null;
    let address = null;

    busboy.on("field", (fieldname, val) => {
      if (fieldname === "projectId" || fieldname === "folderId") {
         projectId = val;
      }
      if (fieldname === "address") {
         address = val;
      }
    });

    busboy.on("file", (fieldname, file, info) => {
      const { filename, mimeType } = info;
      const filepath = path.join(os.tmpdir(), filename);
      const writeStream = fs.createWriteStream(filepath);
      
      const filePromise = new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      fileUploads.push({ file: filepath, name: filename, type: mimeType, promise: filePromise });
      file.pipe(writeStream);
    });

    busboy.on("finish", async () => {
      try {
        await Promise.all(fileUploads.map(f => f.promise));

        if (!projectId) throw new Error("Missing projectId in request");
        
        const bucket = admin.storage().bucket();
        const uploadedFiles = [];

        // Check for existing folder with this ID to maintain consistency
        const [files] = await bucket.getFiles({ prefix: 'projects/' });
        const existingFolder = files.find(f => f.name.includes(`_${projectId}/`))?.name.split('/')[1];
        
        let folderPath = existingFolder ? `projects/${existingFolder}` : getStoragePath(projectId, address);

        for (const up of fileUploads) {
          const isZip = up.type === 'application/zip' || 
                        up.type === 'application/x-zip-compressed' || 
                        up.name.toLowerCase().endsWith('.zip');

          if (isZip) {
            logger.info(`Extracting ZIP: ${up.name}`);
            const zip = new AdmZip(up.file);
            const zipEntries = zip.getEntries();
            
            for (const entry of zipEntries) {
              if (!entry.isDirectory && entry.entryName.toLowerCase().endsWith('.pdf')) {
                const entryBuffer = entry.getData();
                const entryName = path.basename(entry.entryName);
                const dest = `${folderPath}/documents/${entryName}`;
                
                logger.info(`Uploading extracted PDF: ${entryName}`);
                const token = crypto.randomUUID();
                const fileRef = bucket.file(dest);
                await fileRef.save(entryBuffer, {
                  metadata: { 
                    contentType: 'application/pdf',
                    metadata: { firebaseStorageDownloadTokens: token }
                  }
                });

                const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;
                uploadedFiles.push({ name: entryName, url });
              }
            }
          } else {
            const dest = `${folderPath}/documents/${up.name}`;
            const token = crypto.randomUUID();
            await bucket.upload(up.file, {
              destination: dest,
              metadata: { 
                contentType: up.type,
                metadata: { firebaseStorageDownloadTokens: token }
              }
            });

            const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;
            uploadedFiles.push({ name: up.name, url });
          }
          
          if (fs.existsSync(up.file)) fs.unlinkSync(up.file);
        }

        res.json({ success: true, files: uploadedFiles });
        resolve();
      } catch (error) {
        logger.error("Firebase Storage Upload Error", error);
        res.status(500).json({ error: error.message });
        resolve();
      }
    });

    if (req.rawBody) {
      busboy.end(req.rawBody);
    } else {
      req.pipe(busboy);
    }
  });
});

/**
 * AI Description Generator
 * Requires API key in secret: GEMINI_API_KEY
 */
exports.generateAIDescription = onRequest({
  cors: true,
  invoker: "public",
  timeoutSeconds: 540,
  memory: "2GiB",
  secrets: ["GEMINI_API_KEY"]
}, async (req, res) => {
  const { projectData } = req.body;
  if (!projectData || !projectData.id) return res.status(400).json({ error: "Missing project data" });

  try {
    const { VertexAI } = require('@google-cloud/vertexai');
    
    // Vertex AI automatically uses your project's service account - no API key needed!
    const vertex_ai = new VertexAI({project: 'project-pack-app', location: 'us-central1'});
    const model = vertex_ai.getGenerativeModel({
      model: 'gemini-1.5-flash-002',
    });

    const bucket = admin.storage().bucket();
    const [allFiles] = await bucket.getFiles({ prefix: 'projects/' });
    const projectFolder = allFiles.find(f => f.name.includes(`_${projectData.id}/`))?.name.split('/')[1] || projectData.id;
    const [projectFiles] = await bucket.getFiles({ prefix: `projects/${projectFolder}/documents/` });
    
    const relevantFiles = projectFiles
      .filter(f => f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().match(/\.(jpg|jpeg|png)$/))
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        if (aName.includes('plan') || aName.includes('elevation')) return -1;
        return 1;
      })
      .slice(0, 5);

    const promptText = `You are an expert construction estimator. Review the attached architectural plans and project details to create a PERFECT SUMMARY for a builder.

SITE CONTEXT:
Address: ${projectData.address}
Planning Portal Description: ${projectData.description}
Status: ${projectData.approvalStatus}

YOUR TASK:
1. Review the floor plans and elevations provided.
2. Generate a floor-by-floor technical summary of the works.
3. Identify structural requirements (e.g., RSJs, removals) and major technical challenges (drainage, glazing, roof types).
4. Explain the homeowner's ultimate intent and the "vibe" of the project.

FORMAT: Use professional, technical language with clear headers and bullet points. Focus on what the builder needs to know before visiting.`;

    const parts = [{ text: promptText }];
    
    for (const file of relevantFiles) {
      try {
        const [buffer] = await file.download();
        parts.push({
          inlineData: {
            mimeType: file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            data: buffer.toString("base64")
          }
        });
        logger.info(`Attached to Vertex: ${file.name}`);
      } catch (e) {
        logger.warn(`File error: ${file.name}`);
      }
    }

    const resp = await model.generateContent({
      contents: [{ role: 'user', parts: parts }]
    });
    const contentResponse = await resp.response;
    const text = contentResponse.candidates[0].content.parts[0].text;

    if (!text) throw new Error("Vertex AI returned an empty response.");

    res.json({ success: true, description: text });
  } catch (error) {
    logger.error("Vertex AI failed", error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: "Check if Vertex AI API is enabled in Google Cloud Console."
    });
  }
});
/**
 * Delete File from Storage
 */
exports.deleteFileFromStorage = onRequest({
  cors: true,
  invoker: "public",
  timeoutSeconds: 60,
  memory: "256MiB"
}, async (req, res) => {
  const { projectId, fileName } = req.body;
  if (!projectId || !fileName) {
    return res.status(400).json({ error: "Missing projectId or fileName" });
  }

  try {
    const bucket = admin.storage().bucket();
    
    // Find the folder that contains this project ID
    const [files] = await bucket.getFiles({ prefix: 'projects/' });
    const folderName = files.find(f => f.name.includes(`_${projectId}/`))?.name.split('/')[1] || projectId;
    
    const filePath = `projects/${folderName}/documents/${fileName}`;
    const file = bucket.file(filePath);

    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
      logger.info(`Deleted file: ${filePath}`);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error("Delete error", error);
    res.status(500).json({ error: error.message });
  }
});
