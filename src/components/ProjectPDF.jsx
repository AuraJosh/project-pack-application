import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Image, 
  Link
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 60,
    fontSize: 10,
    color: '#334155',
    fontFamily: 'Helvetica',
  },
  coverPage: {
    padding: 0,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  coverHeader: {
    position: 'absolute',
    top: 60,
    width: '100%',
    textAlign: 'center',
  },
  coverTitle: {
    fontSize: 42,
    color: '#ffffff',
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 10,
  },
  coverSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 4,
  },
  coverImageContainer: {
    width: '100%',
    height: '40%',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  coverFooter: {
    position: 'absolute',
    bottom: 60,
    textAlign: 'center',
    width: '100%',
  },
  coverAddress: {
    fontSize: 12,
    color: '#ffffff',
    marginBottom: 5,
  },
  coverRef: {
    fontSize: 10,
    color: '#6366f1',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 20,
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
    borderBottom: 0.5,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  label: {
    width: 150,
    color: '#64748b',
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
    color: '#1e293b',
  },
  contentsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    color: '#334155',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 60,
    right: 60,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTop: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  boilerplate: {
    fontSize: 9,
    lineHeight: 1.6,
    color: '#475569',
    textAlign: 'justify',
  },
  button: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#6366f1',
    color: '#ffffff',
    textAlign: 'center',
    borderRadius: 4,
    textDecoration: 'none',
  }
});

export const ProjectPDF = ({ data, settings }) => {
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <Document>
      {/* Page 1: Premium Cover */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverHeader}>
          <Text style={styles.coverTitle}>PROJECT PACK</Text>
          <Text style={styles.coverSubtitle}>REF: {data.internalRef || 'PENDING'}</Text>
        </View>

        <View style={styles.coverImageContainer}>
          {data.coverImage ? (
            <Image src={data.coverImage} style={styles.coverImage} />
          ) : (
            <View style={{ backgroundColor: '#1e293b', width: '100%', height: '100%' }} />
          )}
        </View>

        <View style={styles.coverFooter}>
          <Text style={styles.coverAddress}>{data.address || 'Address Not Provided'}</Text>
          <Text style={styles.coverRef}>PRIVATE & CONFIDENTIAL</Text>
        </View>
      </Page>

      {/* Page 2: Index */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>Contents</Text>
        <View style={styles.section}>
          <View style={styles.contentsItem}><Text>1. Cover</Text><Text>01</Text></View>
          <View style={styles.contentsItem}><Text>2. Index</Text><Text>02</Text></View>
          <View style={styles.contentsItem}><Text>3. Executive Summary</Text><Text>03</Text></View>
          <View style={styles.contentsItem}><Text>4. Project Documents Index</Text><Text>04</Text></View>
          <View style={styles.contentsItem}><Text>5. Site Location & Aerial View</Text><Text>05</Text></View>
          <View style={styles.contentsItem}><Text>6. Technical Pack Strategy</Text><Text>06</Text></View>
          <View style={styles.contentsItem}><Text>7. Terms & Conditions</Text><Text>07</Text></View>
        </View>
        <Text style={styles.footer}>Pack Generated: {date}</Text>
      </Page>

      {/* Page 3: Summary */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>Executive Summary</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Internal Reference</Text>
            <Text style={styles.value}>{data.internalRef}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Site Address</Text>
            <Text style={styles.value}>{data.address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Planning Status</Text>
            <Text style={styles.value}>{data.approvalStatus}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Architectural Drawings</Text>
            <Text style={styles.value}>{data.architecturalDrawings}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Structural Calculations</Text>
            <Text style={styles.value}>{data.structuralCalculations}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { marginBottom: 10 }]}>Project Description</Text>
          <Text style={styles.boilerplate}>{data.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { marginBottom: 10 }]}>Homeowner Contact Info</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{data.homeownerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contact No</Text>
            <Text style={styles.value}>{data.homeownerPhone}</Text>
          </View>
        </View>
        <Text style={styles.footer}>Strictly Private & Confidential | Page 03</Text>
      </Page>

      {/* Page 4: Documents Index */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>Project Documents Index</Text>
        <View style={styles.section}>
          {data.documents && data.documents.map((doc, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.label}>{doc.name}</Text>
              <Link src={doc.url} style={{ color: '#6366f1' }}>[Link to Document]</Link>
            </View>
          ))}
          {!data.documents && <Text>No documents attached to this project.</Text>}
        </View>
        <Text style={styles.footer}>Strictly Private & Confidential | Page 04</Text>
      </Page>

      {/* Page 5: Aerial Map */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>Site Location & Aerial View</Text>
        {data.aerialMap && (
          <Image src={data.aerialMap} style={{ width: '100%', height: 400, borderRadius: 8, marginBottom: 20 }} />
        )}
        <View style={styles.section}>
          <Text style={styles.boilerplate}>
            Satellite imagery showing site boundaries and adjacent properties for context.
          </Text>
        </View>
        <Text style={styles.footer}>Strictly Private & Confidential | Page 05</Text>
      </Page>

      {/* Page 6: Technical Pack */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>Technical Pack Strategy</Text>
        <View style={styles.section}>
          <Text style={styles.boilerplate}>
            {settings?.technicalPack || "The information contained in this pack is intended for use by qualified contractors and professionals for the purpose of quoting and executing the proposed works. All measurements and specifications should be verified on site."}
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.boilerplate}>
            • Architectural Drawings: {data.architecturalDrawings}
            {"\n"}• Structural Strategy: {data.structuralCalculations}
            {"\n"}• Building Regulations: Compliance strategy based on approved plans.
          </Text>
        </View>
        <Text style={styles.footer}>Strictly Private & Confidential | Page 06</Text>
      </Page>

      {/* Page 7: Terms & Conditions */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.pageTitle}>Terms & Conditions</Text>
        <View style={styles.section}>
          <Text style={styles.boilerplate}>
            {settings?.terms || "Standard non-circumvention terms apply. Any introduction made through this document is subject to the agreed commission structure. All project data is provided in good faith but should be subject to independent verification."}
          </Text>
        </View>
        <Text style={styles.footer}>Strictly Private & Confidential | Page 07</Text>
      </Page>
    </Document>
  );
};
