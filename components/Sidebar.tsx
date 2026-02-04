import React from 'react';
import { FlaggedQuestions } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  questionIndices: number[];
  currentIndex: number;
  attempts: { [index: number]: string };
  flagged: FlaggedQuestions;
  quizId: string;
  isSubmitted: boolean;
  correctAnswers: string[]; // Array of correct answers matching indices order
  onNavigate: (index: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  questionIndices,
  attempts,
  flagged,
  quizId,
  isSubmitted,
  correctAnswers,
  onNavigate
}) => {
  const getStorageKey = (idx: number) => `${quizId}-${idx}`;

  const renderGrid = (indices: number[], onlyFlagged: boolean = false) => {
    return (
      <div className="grid grid-cols-5 gap-2">
        {indices.map((realIndex, displayIndex) => {
          const key = getStorageKey(realIndex);
          const isFlagged = flagged[key];
          
          if (onlyFlagged && !isFlagged) return null;

          const hasAttempt = attempts.hasOwnProperty(realIndex);
          let btnClass = "w-full aspect-square rounded-lg text-sm font-bold flex items-center justify-center transition-transform active:scale-95 ";
          
          if (isSubmitted) {
            const isCorrect = attempts[realIndex] === correctAnswers[displayIndex];
            btnClass += isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white";
          } else {
             // Normal mode
             if (hasAttempt) {
               btnClass += "bg-primary-600 text-white";
             } else {
               btnClass += "bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-600";
             }
             if (isFlagged) btnClass += " border-2 border-yellow-400 text-yellow-600";
          }

          return (
            <button
              key={realIndex}
              onClick={() => {
                onNavigate(realIndex);
                onClose();
              }}
              className={btnClass}
            >
              {displayIndex + 1}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <aside 
        className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl transform transition-transform duration-300 z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Navigazione</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="mb-6">
            <h4 className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-3">Domande</h4>
            {renderGrid(questionIndices)}
          </div>
          
          <div id="flagged-section">
            <h4 className="text-sm uppercase tracking-wider text-yellow-600 dark:text-yellow-500 font-semibold mb-3 border-t border-gray-200 dark:border-gray-700 pt-4">Segnalate</h4>
             {renderGrid(questionIndices, true)}
          </div>
        </div>
      </aside>
    </>
  );
};