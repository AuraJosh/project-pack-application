import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Clock, MapPin, Phone, Mail, MessageSquare, Plus, CheckSquare, Square, User } from 'lucide-react';
import LogActivityModal from './LogActivityModal';
import UniversalTimeline from './UniversalTimeline';

export default function HomeownerProfile({ project, homeowner, interactions }) {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [situation, setSituation] = useState(project.situation || '');
  const [isSavingSituation, setIsSavingSituation] = useState(false);

  // Auto-calculate "Last Contact"
  let daysAgo = null;
  if (interactions.length > 0) {
    const lastInteraction = interactions[0];
    if (lastInteraction.timestamp) {
      const msDiff = new Date() - lastInteraction.timestamp.toMillis();
      daysAgo = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    }
  }

  const handleUpdateSituation = async () => {
    setIsSavingSituation(true);
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        situation: situation
      });
    } catch (err) {
      console.error("Error updating situation:", err);
    } finally {
      setIsSavingSituation(false);
    }
  };

  const toggleChecklist = async (field) => {
    const newValue = !project[field];
    try {
      await updateDoc(doc(db, 'projects', project.id), {
        [field]: newValue
      });
      // Updating UI optimistically managed by firestore real-time sync in CRM.jsx
    } catch (err) {
      console.error("Error updating checklist:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#16171d] rounded-2xl shadow-sm border border-gray-200 dark:border-[#2e303a] overflow-hidden">
      {/* Top Half: Dedicated Dashboard */}
      <div className="p-6 border-b border-gray-200 dark:border-[#2e303a] shrink-0 bg-gray-50/50 dark:bg-[#111218]/50 overflow-y-auto">
        
        {/* Header & Timer */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              {project.name || 'Untitled Project'}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {homeowner?.name && (
                <span className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/10 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
                  <User size={16} /> {homeowner.name}
                </span>
              )}
              {project.address && (
                <span className="flex items-center gap-1.5"><MapPin size={16} className="text-gray-400" /> {project.address}</span>
              )}
              {homeowner?.phone && (
                <span className="flex items-center gap-1.5"><Phone size={16} className="text-gray-400" /> {homeowner.phone}</span>
              )}
              {homeowner?.email && (
                <span className="flex items-center gap-1.5"><Mail size={16} className="text-gray-400" /> {homeowner.email}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
             {/* Auto-calculating Timer Badge */}
             {daysAgo !== null ? (
               <div className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 flex items-center gap-2 ${daysAgo > 14 ? 'border-red-500/30 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'border-emerald-500/30 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                 <Clock size={16} />
                 Last Contact: {daysAgo === 0 ? 'Today' : `${daysAgo} Days Ago`}
               </div>
             ) : (
               <div className="px-4 py-1.5 rounded-full text-sm font-bold border-2 border-gray-200 dark:border-[#2e303a] bg-gray-50 dark:bg-[#1c1d25] text-gray-500">
                 <Clock size={16} />
                 No Contact Yet
               </div>
             )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Situation Box */}
          <div className="bg-white dark:bg-[#1c1d25] p-5 rounded-xl border-l-4 border-l-amber-500 border-t border-r border-b border-gray-200 dark:border-[#2e303a] shadow-sm flex flex-col h-full">
            <label className="block text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-2">The Situation</label>
            <div className="relative flex-1">
              <textarea 
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                onBlur={handleUpdateSituation}
                placeholder="Job context (e.g. Roof leaking, budget tight, urgent)"
                className="w-full h-full min-h-[100px] bg-transparent resize-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
              />
              {isSavingSituation && <span className="absolute bottom-2 right-2 text-xs text-gray-400">Saving...</span>}
            </div>
          </div>

          {/* Scoping Checklist */}
          <div className="bg-white dark:bg-[#1c1d25] p-5 rounded-xl border border-gray-200 dark:border-[#2e303a] shadow-sm">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-[#2e303a] pb-2">Scoping Checklist</label>
            <div className="space-y-3">
              {[
                { id: 'house_visited', label: 'House Visited?' },
                { id: 'details_gathered', label: 'Details / Specs Gathered?' },
                { id: 'followed_up', label: 'Followed up on missing details?' },
                { id: 'details_sent', label: 'Details sent over to Builders?' }
              ].map(({ id, label }) => {
                const isChecked = !!project[id];
                return (
                  <button 
                    key={id} 
                    onClick={() => toggleChecklist(id)}
                    className="flex items-center gap-3 w-full text-left group"
                  >
                    <div className={`p-0.5 rounded transition-colors ${isChecked ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600 group-hover:text-amber-300'}`}>
                      {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${isChecked ? 'text-gray-900 dark:text-white line-through opacity-70' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Half: History / Universal Timeline */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-[#16171d]">
         <div className="p-4 border-b border-gray-100 dark:border-[#2e303a] flex items-center justify-between">
           <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
             <MessageSquare size={18} className="text-purple-500" />
             Universal Timeline
           </h3>
           <button
              onClick={() => setIsLogModalOpen(true)}
              className="flex items-center gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={16} />
              Log Activity
            </button>
         </div>
         <div className="flex-1 overflow-y-auto">
           <UniversalTimeline interactions={interactions} />
         </div>
      </div>

      {isLogModalOpen && (
        <LogActivityModal 
          isOpen={isLogModalOpen} 
          onClose={() => setIsLogModalOpen(false)} 
          entity={{ type: 'project', data: { ...project, homeowner_id: homeowner?.id } }} 
        />
      )}
    </div>
  );
}
