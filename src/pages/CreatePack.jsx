import { useState, useEffect } from 'react'
import { Wand2, Save, Globe, Map as MapIcon, Upload, Loader2, Download, ArrowLeft } from 'lucide-react'
import { scrapePlanning, scrapePropertyImage, getAerialMapUrl } from '../services/api'
import { createProject, getProjectById } from '../services/db'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { ProjectPDF } from '../components/ProjectPDF'
import { useSearchParams, Link } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'

export default function CreatePack() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('id')
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [dataFetched, setDataFetched] = useState(false)
  const [formData, setFormData] = useState({
    planningUrl: '',
    zooplaUrl: '',
    internalRef: '',
    address: '',
    description: '',
    homeownerName: '',
    homeownerPhone: '',
    approvalStatus: 'Pending',
    architecturalDrawings: 'Awaiting',
    structuralCalculations: 'Awaiting',
    coverImage: '',
    aerialMap: ''
  })

  useEffect(() => {
    if (projectId) {
      const fetchProject = async () => {
        setLoading(true)
        try {
          const project = await getProjectById(projectId)
          if (project) {
            setFormData(prev => ({ ...prev, ...project }))
            setDataFetched(true)
          }
        } catch (error) {
          console.error("Error loading project", error)
        } finally {
          setLoading(false)
        }
      }
      fetchProject()
    }
  }, [projectId])

  const handleFetchData = async () => {
    setLoading(true)
    try {
      if (formData.planningUrl) {
        const planningResponse = await scrapePlanning(formData.planningUrl)
        if (planningResponse.success) {
          setDataFetched(true)
          setFormData(prev => ({
            ...prev,
            address: planningResponse.data.address || prev.address,
            description: planningResponse.data.description || prev.description,
            internalRef: planningResponse.data.portalRef || prev.internalRef,
            homeownerName: planningResponse.data.homeownerName || prev.homeownerName,
            approvalStatus: planningResponse.data.status || prev.approvalStatus
          }))
        }
      }

      if (formData.zooplaUrl) {
        const imageResponse = await scrapePropertyImage(formData.zooplaUrl)
        if (imageResponse.success) {
          setFormData(prev => ({ ...prev, coverImage: imageResponse.imageUrl }))
        }
      }
    } catch (error) {
      console.error("Fetch error", error)
      toast.error("Failed to fetch data. Check links and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleFetchMap = () => {
    if (!formData.address) {
      toast.warning("Please provide an address first.")
      return
    }
    const mapUrl = getAerialMapUrl(formData.address)
    setFormData(prev => ({ ...prev, aerialMap: mapUrl }))
  }

  const handleSave = async () => {
    try {
      await createProject(formData)
      toast.success("Project saved successfully!")
    } catch (error) {
      toast.error("Error saving project: " + error.message)
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/" className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
          <ArrowLeft size={20} className="text-gray-500" />
        </Link>
        <h2 className="text-2xl font-bold dark:text-white">
          {projectId ? 'Edit Project Pack' : 'Create New Pack'}
        </h2>
      </div>

      {/* Auto-Fill Section */}
      <section className="premium-card p-8 space-y-6 bg-gradient-to-br from-white to-purple-50/30 dark:from-[#16171d] dark:to-purple-900/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
            <Wand2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold dark:text-white">Smart Auto-Fill</h3>
            <p className="text-sm text-gray-500">Provide the links to fetch project data automatically.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Planning Portal URL</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="url" 
                value={formData.planningUrl}
                onChange={(e) => setFormData({ ...formData, planningUrl: e.target.value })}
                placeholder="https://planning.council.gov.uk/..." 
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all dark:text-white"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Zoopla/Rightmove URL</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="url" 
                value={formData.zooplaUrl}
                onChange={(e) => setFormData({ ...formData, zooplaUrl: e.target.value })}
                placeholder="https://www.zoopla.co.uk/..." 
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all dark:text-white"
              />
            </div>
          </div>
        </div>

        <button 
          onClick={handleFetchData}
          disabled={loading}
          className="w-full py-3 bg-white dark:bg-white/5 border-2 border-dashed border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 rounded-xl font-bold hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : <span>Fetch Data from Portals</span>}
        </button>
      </section>

      {/* Project Details Form */}
      <section className="premium-card p-8 space-y-8">
        <h3 className="text-lg font-bold dark:text-white border-b border-gray-100 dark:border-[#2e303a] pb-4">Manual Project Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Internal Reference</label>
              <input 
                type="text" 
                value={formData.internalRef}
                onChange={(e) => setFormData({ ...formData, internalRef: e.target.value })}
                className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-xl dark:text-white" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Site Address</label>
              <textarea 
                rows="2" 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-xl dark:text-white"
              ></textarea>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Project Description</label>
              <textarea 
                rows="4" 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-xl dark:text-white"
              ></textarea>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Homeowner Name</label>
              <input 
                type="text" 
                value={formData.homeownerName}
                onChange={(e) => setFormData({ ...formData, homeownerName: e.target.value })}
                className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-xl dark:text-white" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
              <input 
                type="tel" 
                value={formData.homeownerPhone}
                onChange={(e) => setFormData({ ...formData, homeownerPhone: e.target.value })}
                className="w-full p-3 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-xl dark:text-white" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div 
                onClick={handleFetchMap}
                className="space-y-2 text-center p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-[#2e303a] cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all"
              >
                {formData.aerialMap ? (
                   <img src={formData.aerialMap} className="w-full h-12 object-cover rounded-md mb-2" alt="Aerial Preview" />
                ) : (
                  <MapIcon className="mx-auto text-purple-500 mb-2" size={32} />
                )}
                <p className="text-xs font-bold uppercase text-gray-500">Aerial Map</p>
                <button className="text-[10px] text-purple-600 font-bold hover:underline">RE-FETCH</button>
              </div>
              <div className="space-y-2 text-center p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-[#2e303a]">
                <Upload className="mx-auto text-blue-500 mb-2" size={32} />
                <p className="text-xs font-bold uppercase text-gray-500">Cover Image</p>
                <button className="text-[10px] text-blue-600 font-bold hover:underline">UPLOAD</button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center gap-4 pt-4">
          <PDFDownloadLink 
            document={<ProjectPDF data={formData} />} 
            fileName={`${formData.internalRef || 'Project'}-Pack.pdf`}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-white rounded-xl font-medium transition-all"
          >
            {({ loading }) => (
              <>
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                <span>Download PDF Pack</span>
              </>
            )}
          </PDFDownloadLink>

          <button 
            onClick={handleSave}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={20} />
            <span>Save Project Data</span>
          </button>
        </div>
      </section>
    </div>
  )
}
