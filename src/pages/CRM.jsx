import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import KanbanBoard from '../components/crm/KanbanBoard';
import ContactDetail from '../components/crm/ContactDetail';

export default function CRM() {
  const [view, setView] = useState('homeowners'); // 'homeowners' | 'builders'
  const [contacts, setContacts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null); // { type: 'project' | 'contact', data: {...} }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch contacts
    const qContacts = query(collection(db, 'contacts'));
    const unsubscribeContacts = onSnapshot(qContacts, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setContacts(data);
    });

    // Fetch projects
    const qProjects = query(collection(db, 'projects'));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(data);
    });

    // Fetch interactions
    const qInteractions = query(collection(db, 'interactions'));
    const unsubscribeInteractions = onSnapshot(qInteractions, (snapshot) => {
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
  const projectCards = projects;

  return (
    <div className="h-full flex flex-col space-y-4 relative w-full overflow-hidden">
      <div className="flex justify-between items-center bg-white dark:bg-[#16171d] p-6 rounded-2xl border border-gray-200 dark:border-[#2e303a] shadow-sm shrink-0">
        <div>
          <h2 className="text-2xl font-bold dark:text-white mb-1">CRM Pipeline</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your homeowners and builders.</p>
        </div>
        
        {/* Master Toggle */}
        <div className="flex bg-gray-100 dark:bg-[#0a0a0c] p-1.5 rounded-xl">
          <button
            onClick={() => setView('homeowners')}
            className={`px-8 py-2.5 rounded-lg font-semibold transition-all duration-200 ${view === 'homeowners' ? 'bg-white dark:bg-[#2e303a] shadow-sm text-purple-600 dark:text-purple-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            Homeowners View
          </button>
          <button
            onClick={() => setView('builders')}
            className={`px-8 py-2.5 rounded-lg font-semibold transition-all duration-200 ${view === 'builders' ? 'bg-white dark:bg-[#2e303a] shadow-sm text-purple-600 dark:text-purple-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
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
        <div className="flex-1 min-h-0 w-full overflow-hidden flex">
          <KanbanBoard 
            view={view}
            builderCards={builderCards}
            projectCards={projectCards}
            contacts={contacts}
            onCardClick={setSelectedEntity}
          />
        </div>
      )}

      {selectedEntity && (
        <ContactDetail 
          entity={selectedEntity}
          contacts={contacts}
          projects={projects}
          interactions={interactions}
          onClose={() => setSelectedEntity(null)}
        />
      )}
    </div>
  );
}
