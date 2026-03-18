import { useState, useEffect } from 'react'
import { Plus, Search, FileText, Clock, CheckCircle, Loader2, RefreshCw, Filter, Map as MapIcon, List, HardDrive, LayoutDashboard } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { getProjects, updateProject } from '../services/db'
import { generateCustomProjectId } from '../utils/projectIds'
import axios from 'axios'
import { useToast } from '../components/ToastProvider'
import { useConfirm } from '../components/ConfirmProvider'

// Leaflet imports for Map view
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix for default marker icon in Vite/React
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

const FUNCTIONS_BASE_URL = 'https://us-central1-project-pack-app.cloudfunctions.net';

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState('')
  const [weeks, setWeeks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [viewMode, setViewMode] = useState('table') // 'table' or 'map'
  const [selectedProject, setSelectedProject] = useState(null)
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    const generateWeeks = () => {
      const dates = []
      const now = new Date()
      const day = now.getDay()
      const diffToMonday = day === 0 ? -6 : 1 - day
      const currentMonday = new Date(now.getTime() + diffToMonday * 24 * 60 * 60 * 1000)

      for (let i = 0; i < 52; i++) {
        const d = new Date(currentMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        dates.push(`${String(d.getDate()).padStart(2, '0')} ${monthNames[d.getMonth()]} ${d.getFullYear()}`)
      }
      setWeeks(dates)
      setSelectedWeek(dates[0])
    }
    generateWeeks()
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const data = await getProjects()
      // Default Sort: Decided (Newest) - Matching Benchmark
      setProjects(data.sort((a, b) => new Date(b.dateDecided || 0) - new Date(a.dateDecided || 0)))
    } catch (error) {
      console.error("Error fetching projects", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const response = await axios.post(`${FUNCTIONS_BASE_URL}/scraper`, { targetWeek: selectedWeek })
      toast.success(`Sync Complete! Added: ${response.data.stats.added}, Existing: ${response.data.stats.existing}`)
      fetchProjects()
    } catch (error) {
      toast.error("Sync failed. Check Cloud Functions logs.")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleBulkUpdateIds = async () => {
    const isConfirmed = await confirm(
      "Big Flush: This will geocode missing addresses and recalculate ALL Sector IDs based on your new coordinate grid. Proceed?",
      "Database Refactoring"
    );
    if (!isConfirmed) return;
    
    setIsSyncing(true);
    let updatedCount = 0;
    let geocodedCount = 0;
    
    console.log("🚀 Starting Big Flush...");
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    try {
      for (const p of projects) {
        let coords = p.coordinates;
        const ref = p.internalRef || p.reference;
        
        if (!p.address || !ref) {
          continue;
        }

        // 1. Try to geocode if coordinates are missing (Postcode ONLY)
        if (!coords || !coords.lat || !coords.lng) {
          try {
            const postcodeMatch = p.address?.match(/[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][A-Z]{2}/i);
            if (postcodeMatch) {
              const postcode = postcodeMatch[0];
              console.log(`🔍 Geocoding Postcode: ${postcode}`);
              
              const geo = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(postcode + ', York, UK')}&limit=1`);
              
              if (geo.data && geo.data.length > 0) {
                coords = { 
                  lat: parseFloat(geo.data[0].lat), 
                  lng: parseFloat(geo.data[0].lon) 
                };
                console.log(`✅ Fixed with Postcode: ${postcode}`);
                await updateProject(p.id, { coordinates: coords });
                geocodedCount++;
              }
            }
          } catch (err) {
            console.error(`❌ Geocoding error`, err);
          }
        }

        // 2. Generate and Update ID
        const newId = generateCustomProjectId(p.address, ref, coords);
        if (newId !== p.customId) {
          console.log(`📌 ID Change: ${newId}`);
          await updateProject(p.id, { customId: newId });
          updatedCount++;
        }
      }
      
      toast.success(`Big Flush Complete! ${updatedCount} IDs updated.`);
      fetchProjects();
    } catch (error) {
       console.error("Big Flush Fatal Error", error);
       toast.error("Big Flush failed: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  }

  const filteredProjects = projects.filter(p => {
    const searchTerms = searchQuery.toLowerCase();
    const matchesSearch = 
      p.address?.toLowerCase().includes(searchTerms) || 
      p.reference?.toLowerCase().includes(searchTerms) ||
      p.applicantName?.toLowerCase().includes(searchTerms) ||
      p.description?.toLowerCase().includes(searchTerms)

    const matchesStatus = statusFilter === 'All' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Sync Control Header */}
      <div className="premium-card p-6 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center shadow-sm">
            <RefreshCw className={isSyncing ? "animate-spin text-purple-500" : "text-purple-500"} size={24} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold dark:text-white">Project Weekly Sync</h2>
            <p className="text-sm text-gray-500">Scraping York extension projects</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="p-3 bg-white dark:bg-[#16171d] border border-gray-200 dark:border-[#2e303a] rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
          >
            {weeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="btn-primary flex items-center gap-2 px-8 py-3"
          >
            {isSyncing ? 'Syncing...' : 'Start Sync'}
          </button>

          <button 
            onClick={handleBulkUpdateIds}
            disabled={isSyncing}
            className="p-3 bg-white dark:bg-white/5 border border-red-500/30 text-red-500 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shadow-sm"
            title="Recalculate all IDs based on new Grid mapping"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            Big Flush
          </button>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by address or applicant..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white dark:bg-[#16171d] border border-gray-200 dark:border-[#2e303a] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white transition-all w-full"
            />
          </div>
          
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-3 bg-white dark:bg-[#16171d] border border-gray-200 dark:border-[#2e303a] rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-purple-500 outline-none min-w-[160px]"
          >
            <option value="All">All Statuses</option>
            <option value="New">New</option>
            <option value="Won">Won</option>
            <option value="Archive">Archive</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-[#16171d] border border-gray-200 dark:border-[#2e303a] rounded-xl p-1.5 flex gap-1">
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List size={20} />
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'map' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <MapIcon size={20} />
            </button>
          </div>

          <Link to="/storage" className="px-6 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-[#2e303a] text-gray-700 dark:text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/10 transition-all">
            <HardDrive size={18} className="text-purple-500" />
            <span>Asset Explorer</span>
          </Link>

          <Link to="/create" className="btn-primary flex items-center gap-2 px-6">
            <Plus size={20} />
            <span>Manual Add</span>
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="premium-card overflow-hidden min-h-[500px] flex flex-col">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto mini-scroll">
            <table className="w-full text-left text-sm text-gray-600 border-separate border-spacing-0">
              <thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase text-gray-500 dark:text-gray-400 sticky top-0 z-10 shadow-sm border-b border-gray-100 dark:border-[#2e303a]">
                <tr>
                  <th className="px-6 py-4 font-medium">Address</th>
                  <th className="px-6 py-4 font-medium">Description</th>
                  <th className="px-6 py-4 font-medium w-32">Status</th>
                  <th className="px-6 py-4 font-medium w-32">Decided</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#2e303a] bg-white dark:bg-transparent">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <Loader2 className="animate-spin mx-auto text-purple-500" />
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">
                      No matching projects found.
                    </td>
                  </tr>
                ) : filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50/50 dark:hover:bg-white/3 transition-colors group cursor-pointer" onClick={() => setSelectedProject(project)}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-[#0f172a] dark:text-white mb-0.5">{project.address}</div>
                      <div className="text-[10px] tracking-wider text-gray-400 uppercase font-mono">{project.reference}</div>
                    </td>
                    <td className="px-6 py-4 truncate max-w-xs text-xs text-gray-500 dark:text-gray-400" title={project.description}>
                      {project.description}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                        project.status === 'Won' ? 'border-green-200 bg-green-50 text-green-700' :
                        project.status === 'Archive' ? 'border-gray-200 bg-gray-50 text-gray-700' :
                        project.status === 'Paid' ? 'border-purple-200 bg-purple-50 text-purple-700' :
                        'border-yellow-200 bg-yellow-50 text-yellow-700'
                      }`}>
                        {project.status || 'New'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {project.dateDecided ? new Date(project.dateDecided).toLocaleDateString('en-GB') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/workspace/${project.id}`); }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-sm"
                        >
                          <LayoutDashboard size={14} />
                          Pack Creation
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 h-[600px] relative z-0">
            <MapContainer 
              center={[53.9591, -1.0815]} 
              zoom={13} 
              className="h-full w-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {filteredProjects.filter(p => p.coordinates).map(project => (
                <Marker 
                  key={project.id} 
                  position={[project.coordinates.lat, project.coordinates.lng]}
                >
                  <Popup className="premium-popup">
                    <div className="p-2 space-y-2">
                      <div className="font-bold text-sm">{project.address}</div>
                      <div className="text-xs text-gray-500">{project.applicantName}</div>
                      <button 
                        onClick={() => setSelectedProject(project)}
                        className="w-full mt-2 py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded-lg"
                      >
                        VIEW DETAILS
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedProject(null)} />
          <div className="relative bg-white dark:bg-[#16171d] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-[#2e303a] flex items-center justify-between bg-gray-50 dark:bg-white/5">
              <div>
                <h3 className="text-xl font-bold dark:text-white">Project Details</h3>
                <p className="text-xs text-gray-400 font-mono mt-1">{selectedProject.id}</p>
              </div>
              <button 
                onClick={() => setSelectedProject(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-gray-400 dark:text-gray-500 transition-colors"
              >
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto mini-scroll">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Address Section */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Address</p>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <MapIcon className="text-blue-500" size={18} />
                    </div>
                    <p className="text-lg font-medium dark:text-white leading-snug">
                      {selectedProject.address}
                    </p>
                  </div>
                </div>

                {/* Description Section */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-light">
                    {selectedProject.description || "No description provided."}
                  </p>
                </div>
              </div>

              {/* Info Grid Card - Matching Benchmark Timeline Style */}
              <div className="bg-gray-50 dark:bg-white/5 rounded-3xl p-8 border border-gray-100 dark:border-[#2e303a] relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  <a 
                    href={selectedProject.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold bg-white dark:bg-[#16171d] border border-gray-200 dark:border-[#2e303a] rounded-lg text-[#0f172a] dark:text-white hover:bg-gray-50 transition-all shadow-sm"
                  >
                    Portal
                    <RefreshCw className="-rotate-45" size={12} />
                  </a>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-8">
                  <div className="lg:col-span-3 pb-4 border-b border-gray-200 dark:border-[#2e303a] -mt-2">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reference</p>
                        <p className="text-sm font-bold dark:text-white">{selectedProject.reference || 'N/A'}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">App Status</p>
                        <p className="text-sm font-bold dark:text-white">{selectedProject.applicationStatus || 'Pending'}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Applicant</p>
                        <p className="text-sm font-bold dark:text-white">{selectedProject.applicantName || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Row */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Received</p>
                    <p className="text-sm font-medium dark:text-white">{selectedProject.dateReceived || 'N/A'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Validated</p>
                    <p className="text-sm font-medium dark:text-white">{selectedProject.dateValidated || 'N/A'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Decided</p>
                    <p className="text-sm font-medium dark:text-white">{selectedProject.dateDecided ? new Date(selectedProject.dateDecided).toLocaleDateString('en-GB') : 'N/A'}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-10 pt-8 border-t border-gray-100 dark:border-[#2e303a]">
                  <button 
                    onClick={() => navigate(`/workspace/${selectedProject.id}`)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20 hover:bg-purple-700 transition-all"
                  >
                    <LayoutDashboard size={14} />
                    Pack Creation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
