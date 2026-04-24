import { useEffect, useState, useCallback, useMemo } from 'react';
import { UserPlus, Trash2, Ban, CheckCircle, User, X, Copy, RefreshCw, Key, Eye, EyeOff, Bell, Clock, ShieldCheck, ShieldAlert, Mail, Phone, Briefcase, AtSign, ChevronRight, Lock, Unlock, Shield, Calendar, QrCode } from 'lucide-react';
import API from '../api/axios';
import Toast from '../components/Toast';

const getNowForInput = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

/* ── Invite Modal ────────────────────────────────── */
function InviteModal({ open, onClose, onInvited }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'admin',
    account_expiry_date: getNowForInput()
  });

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post('users/', formData);
      onInvited(res.data);
      setFormData({ email: '', role: 'admin', account_expiry_date: getNowForInput() });
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Invite failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-[420px] rounded-[3rem] bg-white dark:bg-slate-900 p-10 shadow-2xl border border-white/20 animate-in zoom-in duration-300">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Invite Identity</h3>
          <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:rotate-90 transition-all text-slate-400 hover:text-rose-500"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Connection</label>
            <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/50 border-none focus:ring-2 focus:ring-sky-500/50 transition-all text-sm font-bold text-slate-700 dark:text-white shadow-inner" placeholder="admin@enterprise.com" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Identity Role</label>
            <div className="flex p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-[1.8rem] shadow-inner">
              <button type="button" onClick={() => setFormData({...formData, role: 'admin'})} className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${formData.role === 'admin' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400'}`}>Admin</button>
              <button type="button" onClick={() => setFormData({...formData, role: 'auditor'})} className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${formData.role === 'auditor' ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-400'}`}>Auditor</button>
            </div>
          </div>
          {formData.role === 'auditor' && (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Access Window</label>
              <input required type="datetime-local" value={formData.account_expiry_date} onChange={e => setFormData({...formData, account_expiry_date: e.target.value})} className="w-full p-5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/50 border-none focus:ring-2 focus:ring-sky-500/50 transition-all text-sm font-bold text-slate-700 dark:text-white shadow-inner" />
            </div>
          )}
          <button disabled={loading} type="submit" className="w-full py-5 bg-[#121927] dark:bg-sky-500 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all mt-4">
            {loading ? 'Processing...' : 'Create Identity & Send Credentials'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Regenerate Modal ──────────────────────────────── */
function RegenerateModal({ user, onClose, onRegenerated }) {
  const [loading, setLoading] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    if (user) {
      setEditEmail(user.email || '');
      setExpiryDate(getNowForInput());
    }
  }, [user]);

  if (!user) return null;

  const handleRegenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { email: editEmail };
      if (user.role === 'auditor' && expiryDate) payload.account_expiry_date = new Date(expiryDate).toISOString();
      const res = await API.post(`users/${user.id}/regenerate-credentials/`, payload);
      onRegenerated(res.data);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-[400px] rounded-[3.5rem] bg-white dark:bg-slate-900 p-10 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-sky-50 dark:bg-sky-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
          <RefreshCw className={`w-10 h-10 text-sky-500 ${loading ? 'animate-spin' : ''}`} />
        </div>
        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2 text-center tracking-tight">Identity Reset</h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs mb-8 text-center px-4 leading-relaxed tracking-tight">Confirm dispatch destination and access window for new credentials.</p>
        <form onSubmit={handleRegenerate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirmation Email</label>
            <input required type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full p-5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/50 border-none focus:ring-2 focus:ring-sky-500/50 transition-all text-sm font-bold text-slate-700 dark:text-white shadow-inner" />
          </div>
          {user.role === 'auditor' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Access Expiry</label>
              <input required type="datetime-local" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="w-full p-5 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800/50 border-none focus:ring-2 focus:ring-sky-500/50 transition-all text-sm font-bold text-slate-700 dark:text-white shadow-inner" />
            </div>
          )}
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-5 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-[1.5rem] font-black text-xs uppercase tracking-widest">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-5 bg-sky-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-sky-500/20 active:scale-[0.98]">
              {loading ? 'Wait...' : 'Reset Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Credential Modal ──────────────────────────────── */
function CredentialModal({ open, onClose, data }) {
  const [showSecret, setShowSecret] = useState(false);
  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-[380px] rounded-[3.5rem] bg-white dark:bg-slate-900 p-10 shadow-2xl border border-white/10 animate-in zoom-in duration-300">
        <div className="flex items-center justify-between mb-8">
           <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 rounded-[1.5rem] flex items-center justify-center text-2xl shadow-inner">🎉</div>
           <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:rotate-90 transition-all text-slate-400 hover:text-rose-500"><X className="h-5 w-5" /></button>
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 tracking-tight">Identity Armed</h3>
        <p className="text-slate-500 text-[9px] mb-8 font-bold uppercase tracking-widest">Access nodes initialized.</p>
        <div className="space-y-4 mb-8">
          <div className="p-5 rounded-[1.8rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Username</span>
            <span className="font-mono text-xs font-black text-slate-900 dark:text-white">{data.username}</span>
          </div>
          <div className="p-5 rounded-[1.8rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Password</span>
            <span className="font-mono text-xs font-black text-sky-600">{data.temp_password}</span>
          </div>
          <div className="p-5 rounded-[1.8rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Security Node (Secret)</span>
              <span className={`font-mono text-xs font-black text-slate-900 dark:text-white transition-all duration-300 ${showSecret ? 'blur-0' : 'blur-md select-none'}`}>
                {data.totp_secret || 'RESTRICTED_SYNC'}
              </span>
            </div>
            <button onClick={() => setShowSecret(!showSecret)} className="p-2.5 bg-white dark:bg-slate-900 rounded-xl text-slate-400 hover:text-sky-500 shadow-sm transition-all">
               {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button onClick={onClose} className="w-full py-4.5 bg-slate-900 dark:bg-sky-500 text-white rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
          Done & Secure
        </button>
      </div>
    </div>
  );
}

/* ── View Details Modal ──────────────────────────── */
function ViewDetailsModal({ user, onClose, onAction, onRegenerate, onImageClick, onSendReminder, now }) {
  const timeLeft = useMemo(() => {
    if (!user || user.role !== 'auditor' || !user.account_expiry_date) return null;
    const diff = new Date(user.account_expiry_date) - now;
    if (diff <= 0) return 'EXPIRED';
    const d = Math.floor(diff / 86400000);
    const h = String(Math.floor((diff / 3600000) % 24)).padStart(2, '0');
    const m = String(Math.floor((diff / 60000) % 60)).padStart(2, '0');
    const s = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
    return `${d > 0 ? `${d}:` : ''}${h}:${m}:${s}`;
  }, [user, now]);

  const isExpired = timeLeft === 'EXPIRED';
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-[3.5rem] bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 my-8 animate-in zoom-in duration-300">
        <div className="flex items-center justify-between px-10 py-8 border-b border-slate-50 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Identity Detail</h3>
            <p className="text-[9px] text-slate-400 uppercase tracking-[0.3em] font-black mt-1">Enterprise Hub Control</p>
          </div>
          <button onClick={onClose} className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl hover:rotate-90 transition-all text-slate-400 hover:text-rose-500"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-10 py-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
           <div className="flex flex-col items-center mb-10">
              <div className="relative group">
                <div className="w-28 h-28 rounded-full flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-900 shadow-2xl mb-5 cursor-pointer transition-transform group-hover:scale-105"
                  style={{ background: user.profile_picture ? undefined : (user.role === 'super_admin' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : user.role === 'auditor' ? 'linear-gradient(135deg,#38bdf8,#0284c7)' : 'linear-gradient(135deg,#a78bfa,#7c3aed)') }}
                  onClick={() => user.profile_picture && onImageClick(user.profile_picture)}>
                   {user.profile_picture ? <img src={user.profile_picture} className="w-full h-full object-cover" alt="" /> : <span className="text-4xl font-black text-white drop-shadow-md">{(user.display_name || user.username || '').slice(0,2).toUpperCase()}</span>}
                </div>
                <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center ${(!user.is_active || (user.role === 'auditor' && isExpired)) ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`}>
                   {(!user.is_active || (user.role === 'auditor' && isExpired)) ? <X className="w-4 h-4 text-white" /> : <CheckCircle className="w-4 h-4 text-white" />}
                </div>
              </div>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{user.display_name || user.username}</h4>
              <span className="px-4 py-1 text-[9px] font-black uppercase tracking-[0.2em] rounded-full mt-3 bg-slate-100 dark:bg-slate-800 text-slate-500">{user.role ? user.role.replace('_', ' ') : ''}</span>
           </div>
           <div className="grid grid-cols-3 gap-5 mb-10">
              <button onClick={() => onRegenerate(user)} className="flex flex-col items-center gap-3 p-5 rounded-[2.2rem] bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-sky-400 border border-slate-200/50 dark:border-sky-500/20 hover:bg-sky-500 hover:text-white dark:hover:bg-sky-500 dark:hover:text-white transition-all group active:scale-95 shadow-sm">
                 <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center group-hover:bg-transparent shadow-sm"><RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-all duration-700" /></div>
                 <span className="text-[10px] font-black uppercase tracking-widest">Reset</span>
              </button>
              <button onClick={() => onAction(user, user.is_active ? 'Revoke' : 'Restore')} className={`flex flex-col items-center gap-3 p-5 rounded-[2.2rem] border transition-all group active:scale-95 shadow-sm ${user.is_active ? 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-amber-400 border-slate-200/50 dark:border-amber-500/20 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white' : 'bg-emerald-50 dark:bg-emerald-800/80 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-500 hover:text-white'}`}>
                 <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center group-hover:bg-transparent shadow-sm">{user.is_active ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}</div>
                 <span className="text-[10px] font-black uppercase tracking-widest">{user.is_active ? 'Revoke' : 'Restore'}</span>
              </button>
              <button onClick={() => onAction(user, 'Delete')} className="flex flex-col items-center gap-3 p-5 rounded-[2.2rem] bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-rose-400 border border-slate-200/50 dark:border-rose-500/20 hover:bg-rose-500 hover:text-white dark:hover:bg-rose-500 dark:hover:text-white transition-all group active:scale-95 shadow-sm">
                 <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center group-hover:bg-transparent shadow-sm"><Trash2 className="w-5 h-5" /></div>
                 <span className="text-[10px] font-black uppercase tracking-widest">Trash</span>
              </button>
           </div>
           <div className="grid grid-cols-2 gap-x-12 gap-y-7 mb-8 px-2">
              {[ {l: 'Login ID', v: user.username, I: AtSign}, {l: 'Email Route', v: user.email, I: Mail}, {l: 'Position', v: user.designation || 'NONE', I: Briefcase}, {l: 'Contact', v: user.phone_number || 'NONE', I: Phone} ].map(item => {
                const Icon = item.I;
                return (
                  <div key={item.l} className="space-y-1.5">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Icon className="w-3.5 h-3.5" /> {item.l}</p>
                     <p className="text-sm font-black text-slate-700 dark:text-slate-200 font-mono break-all">{item.v}</p>
                  </div>
                );
              })}
           </div>
           <div className={`p-6 rounded-[2.5rem] border-2 border-dashed ${user.password_changed_at ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20' : 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20'}`}>
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-4">
                    <div className={`p-3.5 rounded-2xl ${user.password_changed_at ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
                       {user.password_changed_at ? <ShieldCheck className="w-7 h-7 text-emerald-600" /> : <ShieldAlert className="w-7 h-7 text-rose-500 animate-pulse" />}
                    </div>
                    <div>
                       <p className={`text-[10px] font-black uppercase tracking-widest ${user.password_changed_at ? 'text-emerald-700' : 'text-rose-700'}`}>Security Check</p>
                       <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {user.password_changed_at ? `Password changed on ${new Date(user.password_changed_at).toLocaleDateString()}` : 'Alert: Action Required!'}
                       </p>
                    </div>
                 </div>
                 {!user.password_changed_at && (
                    <button onClick={() => onSendReminder(user.id, user.email)} className="p-3.5 bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-sm text-rose-500 hover:bg-rose-500 hover:text-white hover:scale-110 active:scale-90 transition-all border border-rose-50"><Bell className="w-5 h-5" /></button>
                 )}
              </div>
              {user.role === 'auditor' && user.account_expiry_date && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700 border-dashed">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock className="w-4 h-4" /> Access Timer</span>
                   <span className={`font-mono text-base font-black ${isExpired ? 'text-rose-500' : 'text-sky-600 dark:text-sky-400'}`}>{timeLeft}</span>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────── */
export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [credData, setCredData] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [regeneratingUser, setRegeneratingUser] = useState(null);
  const [fullscreenPic, setFullscreenPic] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
  const handleCloseToast = useCallback(() => setToast({ msg: '', type: 'success' }), []);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    API.get('users/')
      .then((res) => setAdmins(Array.isArray(res.data.results || res.data) ? (res.data.results || res.data) : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async (user, action) => {
    if (action === 'Delete' && !confirm(`Delete ${user.username}?`)) return;
    try {
      if (action === 'Delete') await API.delete(`users/${user.id}/`);
      else await API.patch(`users/${user.id}/toggle-active/`);
      fetchUsers(); if (viewingUser?.id === user.id) setViewingUser(null);
      showToast(`Success: ${action} completed`);
    } catch { showToast('Operation failed', 'error'); }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500" /></div>;

  return (
    <>
      <Toast message={toast.msg} type={toast.type} onClose={handleCloseToast} />
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-12">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 px-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Manage Administrators</h1>
          <p className="text-[11px] font-black text-slate-400 mt-1 uppercase tracking-[0.4em]">System Node Oversight</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center justify-center gap-3 rounded-[2rem] bg-slate-900 dark:bg-sky-500 px-10 py-5.5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-2xl hover:scale-[1.03] active:scale-[0.97] transition-all">
          <UserPlus className="h-5 w-5" /> Invite Identity
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {admins.map((admin) => {
          const isExpired = admin.role === 'auditor' && admin.account_expiry_date && (new Date(admin.account_expiry_date) - now <= 0);
          const status = !admin.is_active ? 'REVOKED' : (isExpired ? 'EXPIRED' : 'ACTIVE');
          
          return (
            <div key={admin.id} onClick={() => setViewingUser(admin)} className="group relative bg-white dark:bg-slate-900 rounded-[3rem] px-7 py-6 shadow-sm hover:shadow-[0_30px_60px_rgba(0,0,0,0.2)] hover:-translate-y-2 transition-all cursor-pointer border border-slate-100 dark:border-slate-800">
               <div className="absolute top-8 right-7">
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                     {status}
                  </span>
               </div>

               <div className="flex flex-col items-start">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden mb-5 shadow-2xl group-hover:rotate-6 group-hover:scale-110 transition-all duration-500 ${admin.profile_picture ? '' : (admin.role === 'super_admin' ? 'bg-gradient-to-br from-amber-400 to-orange-500' : admin.role === 'auditor' ? 'bg-gradient-to-br from-sky-400 to-blue-600' : 'bg-gradient-to-br from-violet-400 to-purple-600')}`}>
                     {admin.profile_picture ? <img src={admin.profile_picture} className="w-full h-full object-cover" alt="" /> : <span className="text-xl font-black text-white drop-shadow-md">{(admin.display_name || admin.username || '').slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 w-full pr-10 tracking-tight break-words">{admin.display_name || admin.username}</h3>
                  <p className="text-[10px] font-bold text-slate-400 w-full mb-6 uppercase tracking-widest break-all">{admin.email}</p>

                  <div className="flex items-center justify-between w-full pt-5 border-t border-slate-50 dark:border-slate-800">
                     <span className={`px-2.5 py-0.5 text-[7px] font-black uppercase tracking-[0.2em] rounded-lg ${admin.role === 'super_admin' ? 'bg-amber-100 text-amber-700' : admin.role === 'auditor' ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700'}`}>{admin.role ? admin.role.replace('_', ' ') : ''}</span>
                     <div className="flex items-center gap-2.5">
                        {admin.password_changed_at ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />}
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-sky-500 transition-all shadow-sm"><ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" /></div>
                     </div>
                  </div>
               </div>
            </div>
          );
        })}
      </div>

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} onInvited={(d) => { fetchUsers(); setCredData(d); }} />
      <RegenerateModal user={regeneratingUser} onClose={() => setRegeneratingUser(null)} onRegenerated={(data) => { fetchUsers(); showToast(data.message); }} />
      <CredentialModal open={!!credData} onClose={() => setCredData(null)} data={credData} />
      <ViewDetailsModal user={viewingUser} onClose={() => setViewingUser(null)} onAction={handleAction} onRegenerate={(u) => { setRegeneratingUser(u); setViewingUser(null); }} onImageClick={setFullscreenPic} onSendReminder={(id, email) => API.post(`users/${id}/send-reminder/`).then(()=>showToast(`Reminder sent to ${email}`))} now={now} />
      {fullscreenPic && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setFullscreenPic(null)}>
          <img src={fullscreenPic} className="max-w-[90vw] max-h-[90vh] object-contain rounded-[3.5rem] shadow-2xl" alt="Profile" />
        </div>
      )}
    </div>
    </>
  );
}
