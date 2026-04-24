// Shared floating Toast component — appears in top-right, never shifts layout
import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    if (message) {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  if (!message) return null;

  const isSuccess = type === 'success';
  return (
    <div
      className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-2xl px-5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)]
        transition-all duration-300 animate-slideIn max-w-sm w-full
        ${isSuccess
          ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-slate-900 dark:border-emerald-500 dark:text-emerald-400'
          : 'bg-red-50 border border-red-300 text-red-800 dark:bg-slate-900 dark:border-red-500 dark:text-red-400'
        }`}
    >
      <div className={`p-1.5 rounded-lg flex-shrink-0 ${isSuccess ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-red-100 dark:bg-red-500/10'}`}>
        {isSuccess
          ? <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        }
      </div>
      <span className="text-sm font-bold flex-1">{message}</span>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
