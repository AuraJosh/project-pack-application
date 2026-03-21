import React, { useState } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, Phone, Mail, FileText, Briefcase } from 'lucide-react';

export default function LogActivityModal({ isOpen, onClose, entity }) {
  const [type, setType] = useState('Note');
  const [summary, setSummary] = useState('');
  const [nextActionDate, setNextActionDate] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const types = [
    { 
      id: 'Note', 
      icon: FileText, 
      activeClass: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
      hoverClass: 'hover:border-emerald-300 dark:hover:border-emerald-700'
    },
    { 
      id: 'Call', 
      icon: Phone, 
      activeClass: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      hoverClass: 'hover:border-blue-300 dark:hover:border-blue-700'
    },
    { 
      id: 'Email', 
      icon: Mail, 
      activeClass: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
      hoverClass: 'hover:border-amber-300 dark:hover:border-amber-700'
    },
    { 
      id: 'Meeting', 
      icon: Briefcase, 
      activeClass: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      hoverClass: 'hover:border-purple-300 dark:hover:border-purple-700'
    },
  ];

  const handleSubmitContext = async (e) => {
    e.preventDefault();
    if (!summary.trim()) return;

    setLoading(true);
    try {
      const isProject = entity.type === 'project';
      
      const payload = {
        type,
        summary,
        timestamp: serverTimestamp(),
        next_action_date: nextActionDate || null,
      };

      if (isProject) {
        payload.project_id = entity.data.id;
        payload.contact_id = entity.data.homeowner_id || null; // Connect to homeowner as well
      } else {
        payload.contact_id = entity.data.id;
      }

      await addDoc(collection(db, 'interactions'), payload);
      onClose();
    } catch (err) {
      console.error("Error logging activity:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pt-24 pb-4 px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white dark:bg-[#16171d] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in relative z-10 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-[#2e303a] flex items-center justify-between shrink-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Log Activity</h3>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252630]">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto w-full">
          <form id="activity-form" onSubmit={handleSubmitContext} className="p-6 space-y-6">
            {/* Interaction Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Activity Type</label>
              <div className="grid grid-cols-4 gap-3">
                {types.map(({ id, icon: Icon, activeClass, hoverClass }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setType(id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${type === id ? activeClass : 'border-gray-200 dark:border-[#2e303a] text-gray-500 ' + hoverClass}`}
                  >
                    <Icon size={20} className="mb-1" />
                    <span className="text-xs font-semibold">{id}</span>
                  </button>
                ))}
              </div>
            </div>

          {/* Details / Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Details</label>
            <textarea
              required
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What was discussed?"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all dark:text-white resize-none"
            />
          </div>

          {/* Next Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Next Action Date <span className="text-xs text-gray-400 font-normal">(Optional)</span></label>
            <input
              type="date"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0a0a0c] border border-gray-200 dark:border-[#2e303a] rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all dark:text-white"
            />
          </div>

          </form>
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-[#2e303a] bg-white dark:bg-[#16171d] shrink-0">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#252630] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="activity-form"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-500/25 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Save Activity'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
