import { useState, useCallback, createContext, useContext } from 'react';
import { X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration !== Infinity) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toast = {
    info: (msg, dur) => addToast(msg, 'info', dur),
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    loading: (msg) => addToast(msg, 'loading', Infinity),
    dismiss: (id) => removeToast(id),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const Toast = ({ message, type, onDismiss }) => {
  const icons = {
    success: <CheckCircle className="text-emerald-500" size={20} />,
    error: <AlertCircle className="text-red-500" size={20} />,
    warning: <AlertCircle className="text-amber-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
    loading: <Loader2 className="text-purple-500 animate-spin" size={20} />
  };

  const colors = {
    success: 'border-emerald-500/20 bg-emerald-50/90 dark:bg-emerald-500/10',
    error: 'border-red-500/20 bg-red-50/90 dark:bg-red-500/10',
    warning: 'border-amber-500/20 bg-amber-50/90 dark:bg-amber-500/10',
    info: 'border-blue-500/20 bg-blue-50/90 dark:bg-blue-500/10',
    loading: 'border-purple-500/20 bg-purple-50/90 dark:bg-purple-500/10'
  };

  return (
    <div className={`
      pointer-events-auto
      flex items-center gap-4 min-w-[300px] max-w-md p-4 
      bg-white dark:bg-[#16171d] backdrop-blur-xl border
      shadow-2xl shadow-purple-500/10 rounded-2xl
      transition-all duration-300 transform translate-x-0 opacity-100
      ${colors[type]}
    `}>
      <div className="shrink-0">{icons[type]}</div>
      <div className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 leading-relaxed">
        {message}
      </div>
      <button 
        onClick={onDismiss}
        className="shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-gray-400 transition-all"
      >
        <X size={16} />
      </button>
    </div>
  );
};
