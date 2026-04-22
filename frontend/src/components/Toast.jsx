// Shared floating Toast component — appears in top-right, never shifts layout
import { useEffect } from 'react';
import { CheckCircle, XCircle, X, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const isSuccess = type === 'success';
  
  return (
    <div
      className={`fixed top-8 right-8 z-[9999] flex items-center gap-4 rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-xl border-2
        transition-all duration-500 animate-in fade-in slide-in-from-right-8 max-w-md
        ${isSuccess
          ? 'bg-emerald-50/90 border-emerald-100 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-900/50 dark:text-emerald-300 shadow-emerald-500/10'
          : 'bg-rose-50/90 border-rose-100 text-rose-800 dark:bg-rose-950/90 dark:border-rose-900/50 dark:text-rose-300 shadow-rose-500/10'
        }`}
    >
      <div className={`p-2 rounded-xl ${isSuccess ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
        {isSuccess
          ? <ShieldCheck className="h-5 w-5" />
          : <ShieldAlert className="h-5 w-5" />
        }
      </div>
      
      <div className="flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-0.5">
          {isSuccess ? 'System Verified' : 'Security Alert'}
        </p>
        <span className="text-sm font-black tracking-tight leading-tight">{message}</span>
      </div>

      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-all cursor-pointer">
        <X className="h-4 w-4" />
      </button>
      
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 animate-toast-progress rounded-full" />
    </div>
  );
}
