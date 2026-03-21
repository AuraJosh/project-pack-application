import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import BuilderProfile from '../components/crm/BuilderProfile';
import HomeownerProfile from '../components/crm/HomeownerProfile';
import AddProfileModal from '../components/crm/AddProfileModal';
import { User, Briefcase, Search, Plus } from 'lucide-react';

export default function CRM() {
  const [view, setView] = useState('homeowners'); // 'homeowners' | 'builders'
  const [contacts, setContacts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [selectedBuilderId, setSelectedBuilderId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribeContacts = onSnapshot(collection(db, 'contacts'), (snapshot) => {
      setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeInteractions = onSnapshot(collection(db, 'interactions'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
      setInteractions(data);
      setLoading(false);
    });

    return () => {
      unsubscribeContacts();
      unsubscribeProjects();
      unsubscribeInteractions();
    };
  }, []);

  const builderCards = contacts.filter(c => c.contact_type === 'Builder');
  
  // Filter search
  const filteredBuilders = builderCards.filter(b => b.name?.toLowerCase().includes(searchQuery.toLowerCase()) || b.company?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredProjects = projects.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  const selectedBuilder = builderCards.find(b => b.id === selectedBuilderId);
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const getEntityInteractions = (isHomeownerView, id) => {
    return interactions.filter(i => isHomeownerView ? i.project_id === id : i.contact_id === id);
  };

  return (
    <div className="h-full flex flex-col space-y-4 relative w-full overflow-hidden">
      <div className="flex justify-between items-center bg-white dark:bg-[#16171d] p-6 rounded-2xl border border-gray-200 dark:border-[#2e303a] shadow-sm shrink-0">
        <div>
          <h2 className="text-2xl font-bold dark:text-white mb-1">CRM Pipeline</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your builder profiles and homeowner scoping.</p>
        </div>
        
        {/* Master Toggle */}
        <div className="flex bg-gray-100 dark:bg-[#0a0a0c] p-1.5 rounded-xl">
          <button
            onClick={() => { setView('homeowners'); setSearchQuery(''); }}
            className={`px-8 py-2.5 rounded-lg font-semibold transition-all duration-200 ${view === 'homeowners' ? 'bg-white dark:bg-[#2e303a] shadow-sm text-amber-600 dark:text-amber-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            Homeowners View
          </button>
          <button
            onClick={() => { setView('builders'); setSearchQuery(''); }}
            className={`px-8 py-2.5 rounded-lg font-semibold transition-all duration-200 ${view === 'builders' ? 'bg-white dark:bg-[#2e303a] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            Builders View
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
           <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full flex gap-4">
          {/* Master List (Left Sidebar) */}
          <div className="w-80 shrink-0 bg-white dark:bg-[#16171d] rounded-2xl shadow-sm border border-gray-200 dark:border-[#2e303a] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-[#2e303a] space-y-4">
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-medium shadow-sm transition-transform hover:scale-[1.02] ${view === 'builders' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                <Plus size={18} />
                {view === 'builders' ? 'Add Builder' : 'Link Homeowner'}
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search ${view}...`}
                  className="w-full bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] text-gray-900 dark:text-white rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {view === 'builders' && (
                filteredBuilders.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">No builders found</p> :
                filteredBuilders.map(b => (
                  <button 
                    key={b.id}
                    onClick={() => setSelectedBuilderId(b.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${selectedBuilderId === b.id ? 'bg-blue-50 dark:bg-blue-900/20 shadow-sm border border-blue-200 dark:border-blue-900/50' : 'hover:bg-gray-50 dark:hover:bg-[#252630] border border-transparent'}`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white">{b.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                      <Briefcase size={12} className={selectedBuilderId === b.id ? 'text-blue-500' : ''} /> 
                      <span className="truncate">{b.company || 'Independent'}</span>
                    </div>
                  </button>
                ))
              )}

              {view === 'homeowners' && (
                filteredProjects.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">No projects found</p> :
                filteredProjects.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${selectedProjectId === p.id ? 'bg-amber-50 dark:bg-amber-900/20 shadow-sm border border-amber-200 dark:border-amber-900/50' : 'hover:bg-gray-50 dark:hover:bg-[#252630] border border-transparent'}`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white">{p.name || 'Untitled Project'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                      <User size={12} className={selectedProjectId === p.id ? 'text-amber-500' : ''} /> 
                      <span className="truncate">{contacts.find(c => c.id === p.homeowner_id)?.name || 'Unknown'}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Detail View (Main Content) */}
          <div className="flex-1 bg-gray-50 dark:bg-[#0a0a0c] rounded-2xl flex flex-col overflow-hidden relative">
            {view === 'builders' && selectedBuilder ? (
               <BuilderProfile 
                 builder={selectedBuilder} 
                 interactions={getEntityInteractions(false, selectedBuilder.id)} 
               />
            ) : view === 'homeowners' && selectedProject ? (
               <HomeownerProfile 
                 project={selectedProject} 
                 homeowner={contacts.find(c => c.id === selectedProject.homeowner_id)}
                 interactions={getEntityInteractions(true, selectedProject.id)} 
               />
            ) : (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-white/50 dark:bg-[#16171d]/50 rounded-2xl border border-gray-200 dark:border-[#2e303a]">
                 <Search size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
                 <p className="font-medium text-gray-500 dark:text-gray-400">Select a profile from the list to view details</p>
               </div>
            )}
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <AddProfileModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          view={view}
          projects={projects}
        />
      )}
    </div>
  );
}
