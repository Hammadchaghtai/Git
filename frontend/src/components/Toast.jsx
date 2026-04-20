// Shared floating Toast component — appears in top-right, never shifts layout
import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const isSuccess = type === 'success';
  return (
    <div
      className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-xl px-5 py-3.5 shadow-2xl
        transition-all duration-300 animate-slideIn max-w-sm toast-dark-fix
        ${isSuccess
          ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 dark:border-emerald-500 dark:text-emerald-300'
          : 'bg-red-50 border border-red-300 text-red-800 dark:border-red-500 dark:text-red-300'
        }`}
    >
      {isSuccess
        ? <CheckCircle className="h-5 w-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
        : <XCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0" />
      }
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 flex-shrink-0 cursor-pointer">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
