import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import BuilderProfile from '../components/crm/BuilderProfile';
import HomeownerProfile from '../components/crm/HomeownerProfile';
import AddProfileModal from '../components/crm/AddProfileModal';
import { User, Briefcase, Search, Plus, Calendar, ArrowRight, X } from 'lucide-react';

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
  const activeProjects = projects.filter(p => p.crm_active === true);
  
  // Filter search
  const filteredBuilders = builderCards.filter(b => b.name?.toLowerCase().includes(searchQuery.toLowerCase()) || b.company?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredProjects = activeProjects.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.address?.toLowerCase().includes(searchQuery.toLowerCase()));

  const selectedBuilder = builderCards.find(b => b.id === selectedBuilderId);
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const getEntityInteractions = (isHomeownerView, id) => {
    return interactions.filter(i => isHomeownerView ? i.project_id === id : i.contact_id === id);
  };

  const getDaysAgo = (entityInteractions) => {
    if (!entityInteractions || entityInteractions.length === 0) return null;
    const last = entityInteractions[0];
    if (last.timestamp) {
      return Math.floor((new Date() - last.timestamp.toMillis()) / (1000 * 60 * 60 * 24));
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-[#16171d] p-6 rounded-2xl border border-gray-200 dark:border-[#2e303a] shadow-sm shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold dark:text-white mb-1">CRM Pipeline</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your active builder profiles and homeowner scoping.</p>
        </div>
        
        {/* Master Toggle */}
        <div className="flex bg-gray-100 dark:bg-[#0a0a0c] p-1.5 rounded-xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => { setView('homeowners'); setSearchQuery(''); }}
            className={`flex-1 md:flex-none px-8 py-2.5 rounded-lg font-semibold transition-all duration-200 whitespace-nowrap ${view === 'homeowners' ? 'bg-white dark:bg-[#2e303a] shadow-sm text-amber-600 dark:text-amber-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            Homeowners View
          </button>
          <button
            onClick={() => { setView('builders'); setSearchQuery(''); }}
            className={`flex-1 md:flex-none px-8 py-2.5 rounded-lg font-semibold transition-all duration-200 whitespace-nowrap ${view === 'builders' ? 'bg-white dark:bg-[#2e303a] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
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
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#16171d] rounded-2xl shadow-sm border border-gray-200 dark:border-[#2e303a] overflow-hidden">
          
          {/* Action & Search Bar */}
          <div className="p-4 border-b border-gray-200 dark:border-[#2e303a] flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50 dark:bg-[#111218]/50">
             <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search ${view}...`}
                  className="w-full bg-white dark:bg-[#1c1d25] border border-gray-200 dark:border-[#3a3c46] text-gray-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 transition-shadow shadow-sm"
                />
             </div>
             <button 
                onClick={() => setIsAddModalOpen(true)}
                className={`w-full md:w-auto px-6 py-2.5 rounded-xl font-medium text-white shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2 ${view === 'builders' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25'}`}
             >
                <Plus size={18} />
                {view === 'builders' ? 'Add Builder Profile' : 'Link/Add Homeowner Project'}
             </button>
          </div>

          {/* CRM Grid List */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-[#0a0a0c]/30">
             {view === 'builders' ? (
                filteredBuilders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 space-y-4">
                    <Briefcase size={48} className="opacity-50" />
                    <p>No builder profiles match your search.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredBuilders.map(b => {
                       const bInteractions = getEntityInteractions(false, b.id);
                       const days = getDaysAgo(bInteractions);
                       return (
                         <div 
                           key={b.id} 
                           onClick={() => setSelectedBuilderId(b.id)}
                           className="bg-white dark:bg-[#1c1d25] p-5 rounded-2xl border border-gray-200 dark:border-[#2e303a] shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/50 cursor-pointer transition-all group flex flex-col h-full"
                         >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{b.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1"><Briefcase size={14} />{b.company || 'Independent'}</p>
                              </div>
                              <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full border ${b.status === 'Active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-[#2e303a] dark:border-[#3a3c46] dark:text-gray-300'}`}>
                                {b.status || 'Vetting'}
                              </span>
                            </div>
                            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-[#2e303a] flex items-center justify-between">
                               <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                  <Calendar size={14} className={days > 14 ? 'text-red-500' : 'text-emerald-500'} />
                                  {days === null ? 'No Contact' : days === 0 ? 'Contacted Today' : `Contacted ${days}d ago`}
                               </div>
                               <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                            </div>
                         </div>
                       )
                    })}
                  </div>
                )
             ) : (
                filteredProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 space-y-4">
                    <User size={48} className="opacity-50" />
                    <p>No homeowner projects currently active in the CRM.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProjects.map(p => {
                       const pInteractions = getEntityInteractions(true, p.id);
                       const days = getDaysAgo(pInteractions);
                       const homeowner = contacts.find(c => c.id === p.homeowner_id);
                       return (
                         <div 
                           key={p.id} 
                           onClick={() => setSelectedProjectId(p.id)}
                           className="bg-white dark:bg-[#1c1d25] p-5 rounded-2xl border border-gray-200 dark:border-[#2e303a] shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-500/50 cursor-pointer transition-all group flex flex-col h-full"
                         >
                            <div className="flex justify-between items-start mb-4">
                              <div className="pr-4">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors line-clamp-2">{p.address || p.name || 'Untitled Project'}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-2"><User size={14} className="text-amber-500" />{homeowner?.name || 'Unknown Homeowner'}</p>
                              </div>
                            </div>
                            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-[#2e303a] flex items-center justify-between">
                               <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                  <Calendar size={14} className={days > 14 ? 'text-red-500' : 'text-emerald-500'} />
                                  {days === null ? 'No Contact' : days === 0 ? 'Contacted Today' : `Contacted ${days}d ago`}
                               </div>
                               <ArrowRight size={16} className="text-gray-300 group-hover:text-amber-500 transition-colors" />
                            </div>
                         </div>
                       )
                    })}
                  </div>
                )
             )}
          </div>
        </div>
      )}

      {/* Pop-Out Modals for Profiles */}
      {view === 'builders' && selectedBuilder && (
        <div className="fixed inset-0 z-50 flex justify-center pt-8 pb-4 px-4 bg-black/60 backdrop-blur-sm overflow-hidden animate-scale-in">
           <div className="relative w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl rounded-3xl overflow-hidden bg-white dark:bg-[#16171d] ring-1 ring-white/10">
              {/* Close Button placed explicitly above or inset */}
              <button 
                onClick={() => setSelectedBuilderId(null)}
                className="absolute top-4 right-4 z-50 p-2.5 bg-gray-100 dark:bg-black/50 hover:bg-gray-200 dark:hover:bg-black/80 text-gray-600 dark:text-gray-300 rounded-full transition-colors shadow-sm"
              >
                 <X size={20} />
              </button>
              <div className="flex-1 overflow-y-auto">
                 <BuilderProfile 
                   builder={selectedBuilder} 
                   interactions={getEntityInteractions(false, selectedBuilder.id)} 
                 />
              </div>
           </div>
        </div>
      )}

      {view === 'homeowners' && selectedProject && (
        <div className="fixed inset-0 z-50 flex justify-center pt-8 pb-4 px-4 bg-black/60 backdrop-blur-sm overflow-hidden animate-scale-in">
           <div className="relative w-full max-w-6xl max-h-[96vh] flex flex-col shadow-2xl rounded-3xl overflow-hidden bg-white dark:bg-[#16171d] ring-1 ring-white/10">
              {/* Close Button */}
              <button 
                onClick={() => setSelectedProjectId(null)}
                className="absolute top-4 right-4 z-[60] p-2.5 bg-gray-100 dark:bg-black/50 hover:bg-gray-200 dark:hover:bg-black/80 text-gray-600 dark:text-gray-300 rounded-full transition-colors shadow-sm"
              >
                 <X size={20} />
              </button>
              <div className="flex-1 overflow-y-auto relative h-full">
                 <HomeownerProfile 
                   project={selectedProject} 
                   homeowner={contacts.find(c => c.id === selectedProject.homeowner_id)}
                   interactions={getEntityInteractions(true, selectedProject.id)} 
                 />
              </div>
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
