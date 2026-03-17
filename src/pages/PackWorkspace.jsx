import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Globe, Map as MapIcon, Loader2, Save, FolderOpen, Wand2, ExternalLink, Copy, Check, RefreshCw, Upload, File, Trash2, Eye } from 'lucide-react'
import { getProjectById, updateProject } from '../services/db'
import PDFPreviewModal from '../components/PDFPreviewModal'
import { generateCustomProjectId } from '../utils/projectIds'
import axios from 'axios'
import { vertexAI } from '../firebase'
import { getGenerativeModel } from "@firebase/vertexai-preview"
import { useToast } from '../components/ToastProvider'
import { useConfirm } from '../components/ConfirmProvider'

const FUNCTIONS_BASE_URL = 'https://us-central1-project-pack-app.cloudfunctions.net';

const getStoragePath = (projectId, address = '') => {
  if (!address) return `projects/${projectId}`;
  const slug = address.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30);
  return `projects/${slug}_${projectId}`;
};

export default function PackWorkspace() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isDriveLoading, setIsDriveLoading] = useState(false)
  const [isAILoading, setIsAILoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [previewData, setPreviewData] = useState({ isOpen: false, initialIndex: 0 })

  // Workspace Specific Details
  const [customId, setCustomId] = useState('')
  const [aiDescription, setAiDescription] = useState('')
  const [driveUrl, setDriveUrl] = useState('')
  const [googleDriveDocsId, setGoogleDriveDocsId] = useState('')
  const [projectFiles, setProjectFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const data = await getProjectById(id)
        if (data) {
          setProject(data)
          // Pre-generate ID if not exists
          const ref = data.reference || data.internalRef
          if (!data.customId && ref) {
            const newId = generateCustomProjectId(data.address, ref, data.coordinates)
            setCustomId(newId)
          } else {
            setCustomId(data.customId || '')
          }
          setAiDescription(data.aiDescription || '')
          setDriveUrl(data.driveUrl || '')
          setGoogleDriveDocsId(data.googleDriveDocsId || '')
          setProjectFiles(data.projectFiles || [])
        }
      } catch (error) {
        console.error("Error loading project", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProject()
  }, [id])

  const handleStartWorkspace = async () => {
    const ref = project.reference || project.internalRef
    if (!ref) {
      toast.error("Missing portal reference for this project. Cannot scrape.")
      return
    }

    setIsDriveLoading(true)
    try {
      // 1. Trigger Robot Scrape (Now using Firebase Storage)
      const scrapeResponse = await axios.post(`${FUNCTIONS_BASE_URL}/createProjectWorkspace`, { 
        address: project.address,
        id: id,
        keyVal: ref
      })
      
      const newFiles = scrapeResponse.data.files || []
      const docsId = scrapeResponse.data.docsFolderId;
      const folderId = scrapeResponse.data.folderId;
      const newDriveUrl = `https://drive.google.com/drive/folders/${folderId}`;
      
      // 2. Refresh local state
      setProjectFiles(newFiles)
      setGoogleDriveDocsId(docsId)
      setDriveUrl(newDriveUrl)
      setProject(prev => ({ ...prev, projectFiles: newFiles, googleDriveDocsId: docsId, driveUrl: newDriveUrl, workspaceStarted: true }))

      // 3. Save to database
      await updateProject(id, { 
        projectFiles: newFiles,
        googleDriveDocsId: docsId,
        driveUrl: newDriveUrl,
        workspaceStarted: true 
      })

      toast.success(`Workspace initialized! ${newFiles.length} documents secured.`)
    } catch (error) {
      console.error("Workspace init error", error)
      toast.error("Failed to initialize workspace. The robot could not find any documents.")
    } finally {
      setIsDriveLoading(false)
    }
  }

  const handleGenerateAI = async () => {
    if (!projectFiles || projectFiles.length === 0) {
      toast.warning("No documents found. Please upload or scrape documents first.");
      return;
    }

    setIsAILoading(true);
    try {
      const model = getGenerativeModel(vertexAI, { 
        model: "gemini-2.5-pro" 
      });

      const folderPath = getStoragePath(id, project.address);
      const bucketName = "project-pack-app.firebasestorage.app";
      
      // Select the first 5 relevant files, similar to the cloud function logic
      const relevantFiles = projectFiles
        .filter(f => f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().match(/\.(jpg|jpeg|png)$/))
        .sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          if (aName.includes('plan') || aName.includes('elevation')) return -1;
          if (bName.includes('plan') || bName.includes('elevation')) return 1;
          return 0;
        })
        .slice(0, 5);

      if (relevantFiles.length === 0) {
        throw new Error("No PDF or image files found to analyze.");
      }

      const promptText = `You are an expert construction estimator. Review the attached architectural plans and project details to create a PERFECT SUMMARY for a builder.

SITE CONTEXT:
Address: ${project.address}
Planning Portal Description: ${project.description || "N/A"}
Status: ${project.approvalStatus || "Unknown"}

YOUR TASK:
1. Review the floor plans and elevations provided.
2. Generate a floor-by-floor technical summary of the works.
3. Identify structural requirements (e.g., RSJs, removals) and major technical challenges (drainage, glazing, roof types).
4. Explain the homeowner's ultimate intent and the "vibe" of the project.

FORMAT: Use professional, technical language with clear headers and bullet points. Focus on what the builder needs to know before visiting.`;

      // Create parts for the model request
      const parts = [
        { text: promptText },
        ...relevantFiles.map(file => ({
          fileData: {
            mimeType: file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            fileUri: `gs://${bucketName}/${folderPath}/documents/${file.name}`
          }
        }))
      ];

      const result = await model.generateContent({
        contents: [{ role: 'user', parts }]
      });

      const response = await result.response;
      const text = response.text();

      if (text) {
        setAiDescription(text);
      } else {
        throw new Error("AI returned empty response.");
      }
    } catch (error) {
       console.error("AI Error", error);
       toast.error(`AI Generation failed: ${error.message}. Check if Vertex AI is enabled.`);
    } finally {
      setIsAILoading(false);
    }
  }

  const handleSaveWorkspace = async () => {
    setLoading(true)
    try {
      await updateProject(id, { 
        customId, 
        aiDescription, 
        driveUrl 
      })
      toast.success("Workspace saved successfully!")
    } catch (error) {
      toast.error("Error saving workspace: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const processFiles = async (files) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const results = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('projectId', id)
        formData.append('address', project.address)

        const resp = await axios.post(`${FUNCTIONS_BASE_URL}/uploadToDrive`, formData)
        if (resp.data.files) results.push(...resp.data.files)
      }
      
      const updatedFiles = [...projectFiles, ...results]
      setProjectFiles(updatedFiles)
      await updateProject(id, { projectFiles: updatedFiles })

      toast.success("Files uploaded successfully!")
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      console.error("Upload error", error)
      toast.error(`Failed to upload file(s): ${errorMsg}`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteFile = async (fileName) => {
    const isConfirmed = await confirm(`Are you sure you want to permanently delete ${fileName}?`);
    if (!isConfirmed) return;

    try {
      // 1. Delete from Firebase Storage via Cloud Function
      await axios.post(`${FUNCTIONS_BASE_URL}/deleteFileFromStorage`, {
        projectId: id,
        fileName: fileName
      })

      // 2. Update local state and Firestore
      const updatedFiles = projectFiles.filter(f => f.name !== fileName)
      setProjectFiles(updatedFiles)
      await updateProject(id, { projectFiles: updatedFiles })
      
      toast.success("File deleted successfully")
    } catch (error) {
      console.error("Delete error", error)
      toast.error("Failed to delete file from storage.")
    }
  }


  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading && !project) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-8 animate-in fade-in duration-500">
      {/* Top Header & Research Links */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <h2 className="text-2xl font-bold dark:text-white">Pack Creation Workspace</h2>
        </div>

        <div className="flex items-center gap-3">
          {project.url && (
            <a 
              href={project.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-[#2e303a] rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/10 dark:text-white transition-all"
            >
              <Globe size={18} className="text-blue-500" />
              Planning Portal
            </a>
          )}
          <a 
            href={`https://www.zoopla.co.uk/house-prices/${encodeURIComponent(project.address)}`}
            target="_blank" 
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-[#2e303a] rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/10 dark:text-white transition-all"
          >
            <MapIcon size={18} className="text-purple-500" />
            Zoopla (Prices)
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project Info Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="premium-card p-6 space-y-6">
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Project ID</p>
              <div className="relative">
                <input 
                  type="text" 
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  className="w-full p-3 pr-16 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-xl font-mono text-sm dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <button 
                  onClick={() => copyToClipboard(customId)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-purple-500"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-[#2e303a]">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Property Address</p>
              <p className="text-sm font-medium dark:text-white leading-relaxed">{project.address}</p>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-[#2e303a]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FolderOpen size={16} className="text-purple-500" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Project Assets</p>
                </div>
                {projectFiles && projectFiles.length > 0 && (
                  <button 
                     onClick={() => setPreviewData({ isOpen: true, initialIndex: 0 })}
                     className="text-[9px] font-black text-purple-500 hover:text-purple-700 flex items-center gap-1 uppercase tracking-tighter"
                   >
                     <Eye size={10} />
                     Preview All
                   </button>
                )}
              </div>
              
              <div className="bg-gray-50/50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5 space-y-4 shadow-inner">
                <div className="space-y-4">
                  {/* Scrape Trigger (Always available if list is small/empty) */}
                  {projectFiles && projectFiles.length < 5 && (
                    <button 
                      onClick={handleStartWorkspace}
                      disabled={isDriveLoading}
                      className="w-full py-2.5 bg-white dark:bg-[#0a0a0c] border border-purple-500/30 text-purple-500 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-500/10 disabled:opacity-50 transition-all"
                    >
                      {isDriveLoading ? <Loader2 className="animate-spin" size={12} /> : <Wand2 size={12} />}
                      {projectFiles.length > 0 ? "Scrape for more files" : "Initialize Auto-Scrape"}
                    </button>
                  )}

                  {projectFiles && projectFiles.length > 0 && (
                    <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-bold">
                      <Check size={12} />
                      {projectFiles.length} files secured successfully
                    </div>
                  )}
                  
                  {projectFiles && projectFiles.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                      {projectFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-white dark:bg-[#0a0a0c] rounded-xl border border-gray-200 dark:border-[#2e303a] group hover:border-purple-500 transition-all shadow-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                             <File size={14} className="text-purple-500 shrink-0" />
                             <span className="text-[11px] font-bold dark:text-gray-200 truncate">{file.name}</span>
                          </div>
                           <div className="flex items-center gap-1">
                             <button 
                               onClick={() => setPreviewData({ isOpen: true, initialIndex: idx })} 
                               className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg text-gray-400 hover:text-purple-500 transition-all"
                               title="Preview Page"
                             >
                               <Eye size={14} />
                             </button>
                             <a href={file.url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg text-gray-400 hover:text-blue-500 transition-all">
                               <ExternalLink size={14} />
                             </a>
                             <button 
                               onClick={() => copyToClipboard(file.url)} 
                               className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg text-gray-400 hover:text-purple-500 transition-all"
                               title="Copy Link"
                             >
                               <Copy size={14} />
                             </button>
                             <button 
                               onClick={() => handleDeleteFile(file.name)} 
                               className="p-1.5 hover:bg-purple-50 dark:hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-all"
                               title="Delete File"
                             >
                               <Trash2 size={14} />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    <label 
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
                      }}
                      className="flex flex-col items-center justify-center py-6 px-4 border-2 border-dashed border-gray-200 dark:border-[#2e303a] rounded-2xl cursor-pointer hover:border-purple-500 hover:bg-purple-500/5 transition-all group"
                    >
                      <div className="flex flex-col items-center justify-center gap-2 pointer-events-none text-center">
                        {isUploading ? (
                          <Loader2 className="animate-spin text-purple-500" size={24} />
                        ) : (
                          <Upload className="text-gray-300 group-hover:text-purple-500" size={24} />
                        )}
                        <p className="text-[11px] font-bold dark:text-gray-400">
                          {isUploading ? "Uploading..." : projectFiles.length > 0 ? "Add more files" : "Drop ZIP or PDFs here"}
                        </p>
                      </div>
                      <input type="file" multiple className="hidden" onChange={(e) => processFiles(e.target.files)} disabled={isUploading} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Workspace Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="premium-card p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                  <Wand2 className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold dark:text-white">AI Floor-by-Floor Description</h3>
                  <p className="text-xs text-gray-500">Expert construction estimator output</p>
                </div>
              </div>
              
              <button 
                onClick={handleGenerateAI}
                disabled={isAILoading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl text-xs font-bold hover:bg-purple-600 hover:text-white transition-all disabled:opacity-50"
              >
                {isAILoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                {aiDescription ? 'Regenerate' : 'Generate Description'}
              </button>
            </div>

            <textarea 
              rows="15"
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              placeholder="Click 'Generate' to create a detailed summary of the proposed work..."
              className="w-full p-6 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-2xl dark:text-white text-sm leading-relaxed focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none shadow-inner"
            ></textarea>

            <div className="flex justify-end gap-3 pt-4">
              <button 
                onClick={handleSaveWorkspace}
                className="btn-primary flex items-center gap-2 px-8 py-3"
              >
                <Save size={18} />
                Save Workspace Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {previewData.isOpen && (
        <PDFPreviewModal 
          files={projectFiles} 
          initialIndex={previewData.initialIndex} 
          onClose={() => setPreviewData({ ...previewData, isOpen: false })} 
        />
      )}
    </div>
  )
}
