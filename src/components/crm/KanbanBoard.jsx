import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const HOMEOWNER_COLUMNS = ['Lead Received', 'Scoping Job', 'Sourcing Builders', 'Job Active', 'Completed'];
const BUILDER_COLUMNS = ['Initial Contact', 'Vetting/Checking Refs', 'Approved/Active', 'Unavailable'];

export default function KanbanBoard({ view, builderCards, projectCards, contacts, onCardClick }) {
  const isHomeownerView = view === 'homeowners';
  const columns = isHomeownerView ? HOMEOWNER_COLUMNS : BUILDER_COLUMNS;
  const items = isHomeownerView ? projectCards : builderCards;
  
  // Create local state for optimistic UI updates
  const [boardCards, setBoardCards] = useState(items);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    setBoardCards(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Check if dragging over a column or another card
    const overColId = columns.includes(overId) ? overId : boardCards.find(c => c.id === overId)?.status || columns[0];
    const item = boardCards.find(c => c.id === activeId);
    
    if (!item) return;

    if (item.status !== overColId) {
      // Optimistic updatre
      setBoardCards(prev => prev.map(c => c.id === activeId ? { ...c, status: overColId } : c));
      
      // DB update
      try {
        const docRef = doc(db, isHomeownerView ? 'projects' : 'contacts', activeId);
        await updateDoc(docRef, { status: overColId });
      } catch (err) {
        console.error("Error updating status:", err);
      }
    }
  };

  const activeCard = boardCards.find(c => c.id === activeId);

  return (
    <div className="flex-1 w-full overflow-x-auto min-h-0 pt-2 pb-4 flex gap-6 snap-x snap-mandatory hide-scrollbar">
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {columns.map((colConfig, index) => {
          const colCards = boardCards.filter(c => (c.status || columns[0]) === colConfig);
          return (
            <KanbanColumn 
              key={colConfig} 
              id={colConfig} 
              title={colConfig} 
              cards={colCards} 
              view={view}
              contacts={contacts}
              onCardClick={onCardClick}
            />
          );
        })}
        <DragOverlay>
          {activeCard ? (
            <div className="opacity-80 rotate-3 scale-105 transition-transform duration-200">
              <KanbanCard 
                card={activeCard} 
                view={view} 
                contacts={contacts}
                onCardClick={() => {}} 
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .hide-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .hide-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
          border: 3px solid transparent;
          background-clip: content-box;
        }
        .dark .hide-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
        }
      `}</style>
    </div>
  );
}
