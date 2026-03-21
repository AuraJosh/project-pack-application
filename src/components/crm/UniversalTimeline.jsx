import React from 'react';
import { Phone, Mail, Briefcase, MessageSquare, Calendar } from 'lucide-react';

export default function UniversalTimeline({ interactions }) {
  if (!interactions || interactions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-[#111218] text-gray-400">
        <MessageSquare size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
        <p>No activity logged yet.</p>
        <p className="text-sm mt-1">Activities logged will appear here in chronological order.</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50/50 dark:bg-[#111218] min-h-full">
      <div className="relative border-l-2 border-gray-200 dark:border-[#2e303a] ml-4 pl-8 space-y-10">
        {interactions.map(interaction => (
          <div key={interaction.id} className="relative group">
            {/* Timeline Dot */}
            <span className={`absolute -left-[43px] bg-white dark:bg-[#16171d] p-1.5 rounded-full border-2 ${getIconColor(interaction.type)} z-10 shadow-sm transition-transform group-hover:scale-110`}>
              {getIconForType(interaction.type)}
            </span>
            
            {/* Content Card */}
            <div className="bg-white dark:bg-[#1c1d25] p-5 rounded-2xl border border-gray-200 dark:border-[#2e303a] shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${getTypeBadgeColor(interaction.type)}`}>
                  {interaction.type}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {interaction.timestamp ? new Date(interaction.timestamp.toMillis()).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                  }) : 'Just now'}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {interaction.summary}
              </p>
              {interaction.next_action_date && (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#2e303a] flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg inline-flex">
                  <Calendar size={14} />
                  Next action: {new Date(interaction.next_action_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
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

function getTypeBadgeColor(type) {
  switch (type) {
    case 'Call': return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
    case 'Email': return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400';
    case 'Meeting': return 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400';
    case 'Note': default: return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400';
  }
}

function getIconForType(type) {
  switch (type) {
    case 'Call': return <Phone size={16} />;
    case 'Email': return <Mail size={16} />;
    case 'Meeting': return <Briefcase size={16} />;
    case 'Note': default: return <MessageSquare size={16} />;
  }
}
