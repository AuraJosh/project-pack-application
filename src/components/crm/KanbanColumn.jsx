import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';

export default function KanbanColumn({ id, title, cards, view, contacts, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div 
      className={`min-w-[320px] max-w-[320px] flex flex-col bg-gray-50 dark:bg-[#1c1d25] rounded-2xl snap-start border ${isOver ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/10' : 'border-gray-200 dark:border-[#2e303a]'}`}
    >
      <div className="p-4 border-b border-gray-200 dark:border-[#2e303a] flex items-center justify-between sticky top-0 z-10 bg-gray-50 dark:bg-[#1c1d25] rounded-t-2xl">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
        <span className="bg-white dark:bg-[#2e303a] px-3 py-1 rounded-full text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#3a3c46] shadow-sm">
          {cards.length}
        </span>
      </div>

      <div 
        ref={setNodeRef}
        className="flex-1 p-3 overflow-y-auto space-y-3"
      >
        <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map(card => (
            <KanbanCard 
              key={card.id} 
              card={card} 
              view={view}
              contacts={contacts}
              onCardClick={onCardClick}
            />
          ))}
        </SortableContext>
        
        {/* Empty state or placeholder to maintain droppable area */}
        {cards.length === 0 && (
          <div className="h-24 border-2 border-dashed border-gray-200 dark:border-[#3a3c46] rounded-xl flex flex-col items-center justify-center text-sm text-gray-400 dark:text-gray-500 m-1 opacity-50">
            <span>Drop cards here</span>
          </div>
        )}
      </div>
    </div>
  );
}
