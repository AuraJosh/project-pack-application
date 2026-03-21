import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock, User, Briefcase, Mail, Phone } from 'lucide-react';

export default function KanbanCard({ card, view, contacts, onCardClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isHomeownerView = view === 'homeowners'; // card is a Project
  const type = isHomeownerView ? 'project' : 'contact';
  
  // Format based on view
  let title = '';
  let subtitle = '';
  let meta = '';

  if (isHomeownerView) {
    title = card.name || 'Untitled Project';
    const homeowner = contacts.find(c => c.id === card.homeowner_id);
    subtitle = homeowner?.name || 'Unknown Homeowner';
    meta = card.date_added ? new Date(card.date_added).toLocaleDateString() : '';
  } else {
    title = card.name || 'Unknown Builder';
    subtitle = card.email || card.phone || 'No contact info';
    meta = card.date_added ? new Date(card.date_added).toLocaleDateString() : '';
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-[#252630] p-4 rounded-xl border border-gray-200 dark:border-[#3a3c46] shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-2 relative group ${isDragging ? 'ring-2 ring-purple-500 shadow-xl z-50' : ''}`}
      onClick={(e) => {
        if (!e.defaultPrevented) {
          onCardClick({ type, data: card });
        }
      }}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-3 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical size={16} />
      </div>

      <div className="pr-6">
        <h4 className="font-semibold text-gray-900 dark:text-white truncate">{title}</h4>
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1 gap-1.5 line-clamp-1">
           {isHomeownerView ? <User size={14} className="shrink-0 text-amber-500" /> : <Briefcase size={14} className="shrink-0 text-blue-500" />}
           <span className="truncate">{subtitle}</span>
        </div>
      </div>

      <div className="mt-2 pt-3 border-t border-gray-100 dark:border-[#3a3c46] flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <div className="flex items-center gap-1 text-purple-600/70 dark:text-purple-400/70 font-medium">
          {isHomeownerView ? 'Project' : 'Builder Profile'}
        </div>
        <div className="flex items-center gap-1">
          <Clock size={12} />
          {meta || 'No date'}
        </div>
      </div>
    </div>
  );
}
