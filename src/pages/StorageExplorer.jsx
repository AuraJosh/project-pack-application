import { useState, useEffect } from 'react';
import { ref, listAll, getDownloadURL, deleteObject, getMetadata } from "firebase/storage";
import { storage } from "../firebase";
import { getProjects, updateProject, getProjectById } from "../services/db";
import { 
  HardDrive, Search, ExternalLink, Loader2, Folder, 
  ArrowLeft, FileText, Trash2, Download, Eye, 
  ChevronRight, Info, AlertCircle, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StorageExplorer() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderFiles, setFolderFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewType, setViewType] = useState('grid'); // 'grid' or 'list'
  const navigate = useNavigate();

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const projectsList = await getProjects();
      
      // Try to list from 'projects' folder
      let res;
      try {
        const projectsRef = ref(storage, 'projects');
        res = await listAll(projectsRef);
      } catch (err) {
        console.warn("'projects' folder not found, checking root...");
        const rootRef = ref(storage);
        res = await listAll(rootRef);
      }
      
      const folderData = res.prefixes.map(prefix => {
        const path = prefix.fullPath;
        const folderName = path.split('/').filter(Boolean).pop(); // Handle trailing slashes
        
        // Extract ID from name_ID format
        let id = folderName;
        if (folderName.includes('_')) {
          const parts = folderName.split('_');
          id = parts[parts.length - 1];
        }

        const project = projectsList.find(p => p.id === id);
        
        return {
          name: folderName,
          path: path,
          projectId: id,
          projectName: project ? project.address : (folderName.length > 15 ? 'Unknown / Code' : folderName),
          projectStatus: project ? project.status : 'System / Orphaned',
          exists: !!project,
          projectData: project
        };
      });

      // Filter out system folders like 'projects' if we are at root
      const finalFolders = folderData.filter(f => f.name !== 'projects');

      setFolders(finalFolders.sort((a, b) => b.exists - a.exists));
    } catch (error) {
      console.error("Error exploring storage:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async (folder) => {
    setSelectedFolder(folder);
    setFilesLoading(true);
    try {
      const folderRef = ref(storage, `${folder.path}/documents`);
      const res = await listAll(folderRef);
      
      const filesData = await Promise.all(res.items.map(async (item) => {
        const metadata = await getMetadata(item);
        const url = await getDownloadURL(item);
        return {
          name: item.name,
          fullPath: item.fullPath,
          size: metadata.size,
          updated: metadata.updated,
          contentType: metadata.contentType,
          url: url
        };
      }));
      
      setFolderFiles(filesData);
    } catch (error) {
      console.error("Error fetching files:", error);
      setFolderFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Are you sure you want to delete ${file.name}?`)) return;
    
    try {
      // 1. Delete from Storage
      const fileRef = ref(storage, file.fullPath);
      await deleteObject(fileRef);

      // 2. Update Firestore if project exists
      if (selectedFolder.exists) {
        const project = await getProjectById(selectedFolder.projectId);
        const updatedFiles = (project.projectFiles || []).filter(f => f.name !== file.name);
        await updateProject(selectedFolder.projectId, { projectFiles: updatedFiles });
      }

      // 3. Refresh local view
      setFolderFiles(prev => prev.filter(f => f.fullPath !== file.fullPath));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete file.");
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin text-purple-500" size={40} />
        <p className="text-gray-500 font-medium">Indexing Enterprise Storage...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg shadow-purple-500/20">
            <HardDrive className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Project Assets Manager</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Clock size={12} />
              Last indexed: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>

        {!selectedFolder && (
          <div className="relative group min-w-[320px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search by address or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white dark:bg-[#16171d] border border-gray-200 dark:border-white/5 rounded-2xl w-full focus:ring-2 focus:ring-purple-500 outline-none transition-all shadow-sm dark:text-white"
            />
          </div>
        )}

        {selectedFolder && (
          <button 
            onClick={() => setSelectedFolder(null)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 hover:text-purple-500 hover:bg-purple-500/5 rounded-xl transition-all"
          >
            <ArrowLeft size={18} />
            Back to Roots
          </button>
        )}
      </div>

      {!selectedFolder ? (
        filteredFolders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFolders.map((folder, idx) => (
              <div 
                key={idx}
                onClick={() => fetchFiles(folder)}
                className="premium-card p-6 group cursor-pointer hover:border-purple-500/50 transition-all border-transparent"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 bg-amber-500/10 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-all text-amber-600">
                    <Folder size={24} />
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${
                    folder.exists ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {folder.exists ? 'Synced' : 'Orphaned'}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-sm font-bold dark:text-white line-clamp-1 group-hover:text-purple-500 transition-colors">
                    {folder.projectName}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                    ID: <span className="text-gray-500">{folder.projectId}</span>
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-100 dark:border-white/5 pt-4">
                  <div className="flex items-center gap-1.5 font-medium">
                    {folder.projectStatus}
                  </div>
                  <ChevronRight size={14} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="premium-card p-32 text-center space-y-6">
            <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-300">
               <HardDrive size={40} />
            </div>
            <div className="space-y-2">
               <h2 className="text-2xl font-bold dark:text-white">Disconnected Storage</h2>
               <p className="text-gray-500 max-w-md mx-auto">
                 We couldn't find any folders in your <code className="bg-gray-100 dark:bg-white/10 px-1 rounded">projects/</code> directory. 
                 Try uploading a file in a project workspace to initialize the storage.
               </p>
            </div>
            <button 
              onClick={fetchFolders}
              className="px-6 py-2 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-all"
            >
              Refresh Explorer
            </button>
          </div>
        )
      ) : (
        <div className="space-y-6">
          {/* Selected Folder Header */}
          <div className="premium-card p-6 border-l-4 border-l-purple-500">
             <div className="flex items-start justify-between">
                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-purple-500 uppercase tracking-widest">
                     <Info size={12} />
                     Currently Exploring
                   </div>
                   <h2 className="text-xl font-bold dark:text-white">{selectedFolder.projectName}</h2>
                   <p className="text-xs text-gray-500 font-mono">{selectedFolder.path}</p>
                </div>
                <button 
                  onClick={() => navigate(`/workspace/${selectedFolder.projectId}`)}
                  className="px-4 py-2 bg-purple-500 text-white text-xs font-bold rounded-xl hover:bg-purple-600 transition-all shadow-lg shadow-purple-500/20"
                >
                  Jump to Workspace
                </button>
             </div>
          </div>

          {/* Files Grid */}
          {filesLoading ? (
            <div className="h-60 flex items-center justify-center">
              <Loader2 className="animate-spin text-purple-500" />
            </div>
          ) : folderFiles.length === 0 ? (
            <div className="premium-card p-20 text-center space-y-4">
               <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-400">
                  <AlertCircle size={32} />
               </div>
               <div className="space-y-1">
                  <h3 className="text-lg font-bold dark:text-white">Empty Vault</h3>
                  <p className="text-sm text-gray-500">No documents found in the /documents path of this project.</p>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {folderFiles.map((file, idx) => (
                <div key={idx} className="premium-card overflow-hidden group">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 flex items-center justify-center h-32 relative">
                    {file.contentType?.includes('image') ? (
                      <img src={file.url} className="h-full w-full object-cover rounded-lg" alt={file.name} />
                    ) : (
                      <div className="w-16 h-16 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center text-red-500 shadow-sm">
                        <FileText size={32} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-purple-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                       <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 bg-white text-purple-600 rounded-lg hover:scale-110 transition-transform shadow-xl"
                       >
                         <Eye size={18} />
                       </a>
                       <button 
                        onClick={() => handleDeleteFile(file)}
                        className="p-2 bg-white text-red-500 rounded-lg hover:scale-110 transition-transform shadow-xl"
                       >
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                        <p className="text-xs font-bold dark:text-white truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[10px] text-gray-500 flex items-center justify-between">
                          <span>{new Date(file.updated).toLocaleDateString()}</span>
                          <span>{formatSize(file.size)}</span>
                        </p>
                    </div>
                    <a 
                      href={file.url} 
                      download 
                      className="w-full py-2 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-[10px] font-bold text-gray-600 dark:text-gray-400 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                    >
                      <Download size={12} />
                      Download Final PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
