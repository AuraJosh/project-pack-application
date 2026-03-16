import { useState, createContext, useContext, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    resolve: null
  });

  const confirm = useCallback((message, title = 'Are you sure?') => {
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        title,
        message,
        resolve
      });
    });
  }, []);

  const handleConfirm = () => {
    modal.resolve(true);
    setModal({ ...modal, isOpen: false });
  };

  const handleCancel = () => {
    modal.resolve(false);
    setModal({ ...modal, isOpen: false });
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={handleCancel}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-[#16171d] rounded-3xl shadow-2xl border border-gray-200 dark:border-[#2e303a] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold dark:text-white">{modal.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please confirm this action</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-[#0a0a0c] rounded-2xl border border-gray-100 dark:border-[#2e303a]">
                <p className="text-sm dark:text-gray-200 leading-relaxed">
                  {modal.message}
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleCancel}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-white rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirm}
                  className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
