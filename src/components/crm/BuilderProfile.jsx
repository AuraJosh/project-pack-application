import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Clock, Briefcase, MapPin, Phone, Mail, MessageSquare, Plus } from 'lucide-react';
import LogActivityModal from './LogActivityModal';
import UniversalTimeline from './UniversalTimeline';

export default function BuilderProfile({ builder, interactions }) {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [nextStep, setNextStep] = useState(builder.next_step || '');
  const [isSavingNextStep, setIsSavingNextStep] = useState(false);

  // Auto-calculate "Last Contact"
  let daysAgo = null;
  if (interactions.length > 0) {
    const lastInteraction = interactions[0];
    if (lastInteraction.timestamp) {
      const msDiff = new Date() - lastInteraction.timestamp.toMillis();
      daysAgo = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    }
  }

  const handleUpdateNextStep = async () => {
    setIsSavingNextStep(true);
    try {
      await updateDoc(doc(db, 'contacts', builder.id), {
        next_step: nextStep
      });
    } catch (err) {
      console.error("Error updating next step:", err);
    } finally {
      setIsSavingNextStep(false);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      await updateDoc(doc(db, 'contacts', builder.id), {
        status: newStatus
      });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const statusOptions = ['Vetting', 'Active', 'On a Job', 'Unavailable'];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#16171d] rounded-2xl shadow-sm border border-gray-200 dark:border-[#2e303a] overflow-hidden">
      {/* Top Half: Dedicated Dashboard */}
      <div className="p-6 border-b border-gray-200 dark:border-[#2e303a] shrink-0 bg-gray-50/50 dark:bg-[#111218]/50">
        
        {/* Header & Timer */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{builder.name || 'Unnamed Builder'}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {builder.company && (
                <span className="flex items-center gap-1.5"><Briefcase size={16} className="text-blue-500" /> {builder.company}</span>
              )}
              {builder.phone && (
                <span className="flex items-center gap-1.5"><Phone size={16} className="text-gray-400" /> {builder.phone}</span>
              )}
              {builder.email && (
                <span className="flex items-center gap-1.5"><Mail size={16} className="text-gray-400" /> {builder.email}</span>
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

             {/* Current Status Dropdown */}
             <select 
                value={builder.status || 'Vetting'} 
                onChange={handleStatusChange}
                className="bg-white dark:bg-[#252630] border border-gray-200 dark:border-[#3a3c46] text-sm font-semibold text-gray-700 dark:text-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
             >
                {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
             </select>
          </div>
        </div>

        {/* Next Step Block */}
        <div className="bg-white dark:bg-[#1c1d25] p-5 rounded-xl border-l-4 border-l-blue-500 border-t border-r border-b border-gray-200 dark:border-[#2e303a] shadow-sm">
          <label className="block text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">The Next Step</label>
          <div className="relative">
            <textarea 
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              onBlur={handleUpdateNextStep}
              placeholder="What needs to happen next? (e.g. Call back on Friday to verify refs)"
              className="w-full bg-transparent resize-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
              rows={2}
            />
            {isSavingNextStep && <span className="absolute bottom-2 right-2 text-xs text-gray-400">Saving...</span>}
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
          entity={{ type: 'contact', data: builder }} 
        />
      )}
    </div>
  );
}
