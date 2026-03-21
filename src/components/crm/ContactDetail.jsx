import React, { useState } from 'react';
import { X, Phone, Mail, MapPin, Calendar, Plus, Filter, MessageSquare, Link as LinkIcon, Briefcase } from 'lucide-react';
import LogActivityModal from './LogActivityModal';

export default function ContactDetail({ entity, contacts, projects, interactions, onClose }) {
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('All'); // 'All', 'Call', 'Email', 'Note', 'Meeting'
  
  const isProject = entity.type === 'project';
  const data = entity.data;

  // Determine static info
  let title = '';
  let subtitle = '';
  let email = '';
  let phone = '';
  let address = '';
  
  // Linked data
  let linkedHomeowner = null;
  let linkedBuilders = [];
  let linkedProjects = [];

  if (isProject) {
    title = data.name || 'Untitled Project';
    linkedHomeowner = contacts.find(c => c.id === data.homeowner_id);
    subtitle = linkedHomeowner ? `Homeowner: ${linkedHomeowner.name}` : 'No Homeowner Linked';
    address = data.address || '';
    if (linkedHomeowner) {
      email = linkedHomeowner.email;
      phone = linkedHomeowner.phone;
    }
  } else {
    title = data.name || 'Unknown Contact';
    subtitle = data.contact_type || 'Builder';
    email = data.email || '';
    phone = data.phone || '';
    linkedProjects = projects.filter(p => p.assigned_builder_id === data.id); // Or some relation array
  }

  // Filter interactions
  const entityInteractions = interactions.filter(i => {
    if (isProject) return i.project_id === data.id;
    return i.contact_id === data.id;
  });

  const filteredInteractions = entityInteractions.filter(i => 
    filterType === 'All' ? true : i.type === filterType
  );

  return (
    <>
      <div className="absolute inset-0 z-40 flex justify-end bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose}>
        <div 
          className="w-full max-w-5xl h-full bg-white dark:bg-[#16171d] shadow-2xl flex flex-col md:flex-row animate-slide-in"
          onClick={e => e.stopPropagation()}
        >
          {/* Main Info Column (Left) */}
          <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-[#2e303a] p-6 flex flex-col h-full overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{title}</h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isProject ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                  {subtitle}
                </span>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 md:hidden">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {phone && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Phone size={16} />
                  </div>
                  <a href={`tel:${phone}`} className="hover:underline">{phone}</a>
                </div>
              )}
              {email && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Mail size={16} />
                  </div>
                  <a href={`mailto:${email}`} className="hover:underline break-all">{email}</a>
                </div>
              )}
              {address && (
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                  <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <MapPin size={16} />
                  </div>
                  <span>{address}</span>
                </div>
              )}
            </div>

            <div className="mt-auto pt-6 border-t border-gray-200 dark:border-[#2e303a]">
              <button
                onClick={() => setIsLogModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-purple-500/25 transition-all transform hover:scale-[1.02]"
              >
                <Plus size={18} />
                Log Activity
              </button>
            </div>
          </div>

          {/* Timeline Column (Right) */}
          <div className="w-full md:w-2/3 h-full flex flex-col bg-gray-50/50 dark:bg-[#111218]">
            {/* Header / Filters */}
            <div className="p-4 md:p-6 border-b border-gray-200 dark:border-[#2e303a] flex items-center justify-between bg-white dark:bg-[#16171d]">
              <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-semibold">
                <MessageSquare size={20} className="text-purple-500" />
                Interactions Timeline
              </div>
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#252630] p-1 rounded-lg">
                  {['All', 'Note', 'Call', 'Email', 'Meeting'].map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === type ? 'bg-white dark:bg-[#3a3c46] shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrolling Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {filteredInteractions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <MessageSquare size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
                  <p>No interactions logged yet.</p>
                </div>
              ) : (
                <div className="relative border-l border-gray-200 dark:border-[#2e303a] ml-4 pl-6 space-y-8">
                  {filteredInteractions.map(interaction => (
                    <div key={interaction.id} className="relative">
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[33px] bg-white dark:bg-[#16171d] p-1 rounded-full border-2 ${getIconColor(interaction.type)}`}>
                        {getIconForType(interaction.type)}
                      </span>
                      
                      {/* Content Card */}
                      <div className="bg-white dark:bg-[#1c1d25] p-5 rounded-2xl border border-gray-200 dark:border-[#2e303a] shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {interaction.type}
                          </h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {interaction.timestamp ? new Date(interaction.timestamp.toMillis()).toLocaleString() : 'Just now'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {interaction.summary}
                        </p>
                        {interaction.next_action_date && (
                          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#2e303a] flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500 font-medium">
                            <Calendar size={14} />
                            Next action: {new Date(interaction.next_action_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isLogModalOpen && (
        <LogActivityModal 
          isOpen={isLogModalOpen} 
          onClose={() => setIsLogModalOpen(false)} 
          entity={entity} 
        />
      )}
    </>
  );
}

function getIconColor(type) {
  switch (type) {
    case 'Call': return 'border-blue-500 text-blue-500';
    case 'Email': return 'border-amber-500 text-amber-500';
    case 'Meeting': return 'border-purple-500 text-purple-500';
    case 'Note': default: return 'border-emerald-500 text-emerald-500';
  }
}

function getIconForType(type) {
  switch (type) {
    case 'Call': return <Phone size={14} />;
    case 'Email': return <Mail size={14} />;
    case 'Meeting': return <Briefcase size={14} />;
    case 'Note': default: return <MessageSquare size={14} />;
  }
}
