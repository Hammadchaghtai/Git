import { useEffect, useState, useCallback, Fragment } from 'react';
import { UserPlus, Trash2, Ban, CheckCircle, User, X, Copy, RefreshCw, Key, Eye, EyeOff, Bell, Clock, Shield, ShieldCheck, ShieldAlert, Mail, Smartphone, Briefcase, ChevronRight, Activity } from 'lucide-react';
import API from '../api/axios';
import Toast from '../components/Toast';

/* ── Credential Modal ─────────────────────────────── */
function CredentialModal({ open, onClose, data }) {
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  if (!open || !data) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `Username: ${data.username}\nPassword: ${data.temp_password}\nTOTP Secret: ${data.totp_secret || 'N/A'}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-950 p-8 shadow-2xl border border-emerald-100 dark:border-emerald-900/30 animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Identity Provisioned</h3>
            <p className="text-emerald-600 text-xs font-black uppercase tracking-widest mt-1">Status: Success</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-6 mb-8">
          <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 mb-4 tracking-tighter flex items-center gap-2">
            <ShieldCheck className="w-3 h-3" /> Secure Credential Registry
          </p>
          <div className="space-y-3">
            <div className="flex flex-col gap-1 p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username</span>
              <span className="font-mono text-sm font-black text-slate-900 dark:text-white">{data.username}</span>
            </div>
            <div className="flex flex-col gap-1 p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temporary Password</span>
              <span className="font-mono text-sm font-black text-slate-900 dark:text-white">{data.temp_password}</span>
            </div>
            {data.totp_secret && (
              <div className="flex flex-col gap-1 p-3 bg-brand-50 dark:bg-brand-900/10 rounded-xl border border-brand-100 dark:border-brand-900/30">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">MFA Secret Key</span>
                   <button onClick={() => setShowSecret(s => !s)} className="text-brand-400 hover:text-brand-600">
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                   </button>
                </div>
                <span className={`font-mono text-xs font-black text-brand-700 dark:text-brand-400 break-all ${!showSecret ? 'blur-sm select-none' : ''}`}>
                  {data.totp_secret}
                </span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-4 text-center">
            ⚠️ Credentials are encrypted post-view. Document them immediately.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 py-3 text-sm font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
            <Copy className="h-4 w-4" /> {copied ? 'Copied' : 'Extract All'}
          </button>
          <button onClick={onClose} className="flex-1 btn-primary">
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Regenerate Modal ─────────────────────────────────── */
function RegenerateModal({ user, onClose, onRegenerated }) {
  const [email, setEmail] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setNewExpiry('');
    }
  }, [user]);

  if (!user) return null;

  const isAuditor = user.role === 'auditor';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { email };
      if (isAuditor && newExpiry) {
        payload.account_expiry_date = new Date(newExpiry).toISOString();
      }
      const res = await API.post(`users/${user.id}/regenerate-credentials/`, payload);
      onRegenerated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to regenerate credentials.');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-950 p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3 mb-6">
           <div className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 shadow-sm">
              <RefreshCw className="w-6 h-6" />
           </div>
           <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Cycle Identity</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">Revoke & Reissue Credentials</p>
           </div>
        </div>

        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
          Executing this will immediately invalidate current access. A new <strong className="text-slate-900 dark:text-white">secure cryptographic secret</strong> will be generated for <span className="text-brand-600 font-bold">{user.username}</span>.
        </p>

        {error && (
          <div className="mb-6 rounded-2xl bg-rose-50 dark:bg-rose-900/20 p-4 text-xs font-black text-rose-600 uppercase tracking-widest border border-rose-100 dark:border-rose-900/30">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Delivery Endpoint (Email)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              placeholder="admin@company.com"
            />
          </div>

          {isAuditor && (
            <div className="rounded-2xl border border-brand-100 dark:border-brand-900/30 bg-brand-50 dark:bg-brand-900/10 p-5">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">
                Extension: Access Expiry
              </label>
              <input
                type="datetime-local"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
                className="input-field border-brand-200"
              />
              <p className="text-[10px] text-brand-500 font-bold uppercase tracking-tighter mt-2">
                Set a new lifecycle boundary for this identity.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
             <button type="button" onClick={onClose} className="flex-1 py-3 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">Discard</button>
             <button type="submit" disabled={saving} className="flex-[2] btn-primary flex items-center justify-center gap-2">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} 
                Authorize Cycle
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Invite Modal ─────────────────────────────────── */
function InviteModal({ open, onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin');
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    
    let account_expiry_date = null;
    if (role === 'auditor' && expiryDate) {
      account_expiry_date = new Date(expiryDate).toISOString();
    }

    try {
      const res = await API.post('users/', { email, role, account_expiry_date });
      onInvited(res.data);
      setEmail(''); setRole('admin'); setExpiryDate('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user.');
    } finally { setSaving(false); }
  };

  const getMinDateTime = () => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000; 
    return (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-950 p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Onboard Identity</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Platform-Wide Access Provisioning</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 p-4 text-xs font-black text-rose-600 uppercase tracking-widest border border-rose-100 dark:border-rose-900/30">
              ⚠️ {error}
            </div>
          )}
          
          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Target Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="input-field" placeholder="admin@security.io" />
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Assign Privilege Tier</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field cursor-pointer appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]">
              <option value="admin">Administrator</option>
              <option value="auditor">External Auditor</option>
            </select>
          </div>

          {role === 'auditor' && (
            <div className="p-5 bg-brand-50 dark:bg-brand-900/10 rounded-2xl border border-brand-100 dark:border-brand-900/30">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-brand-600 dark:text-brand-400">Automatic Access Revocation</label>
              <input type="datetime-local" min={getMinDateTime()} value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                className="input-field border-brand-200" required />
              <div className="mt-3 flex items-start gap-2">
                 <Clock className="w-3.5 h-3.5 text-brand-500 mt-0.5" />
                 <p className="text-[10px] text-brand-600 font-bold leading-tight uppercase tracking-tighter">
                   Identity will be purged precisely at the configured timestamp.
                 </p>
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-6">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-sm font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest">Cancel</button>
            <button type="submit" disabled={saving} className="flex-[2] btn-primary flex items-center justify-center gap-2">
              {saving ? <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <Mail className="w-4 h-4" />} 
              {saving ? 'Provisioning...' : 'Dispatch Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── View Details Slide-out Panel ─────────────────── */
function ViewDetailsPanel({ user, onClose, showToast, onImageClick }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    if (!user || !user.account_expiry_date) return;
    const interval = setInterval(() => {
      const diff = new Date(user.account_expiry_date) - new Date();
      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / 3600000) % 24);
        const m = Math.floor((diff % 3600000) / 60000);
        setTimeLeft(`${days > 0 ? `${days}d ` : ''}${h}h ${m}m remaining`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const handleSendReminder = async () => {
    setSendingReminder(true);
    try {
      await API.post(`users/${user.id}/send-reminder/`);
      showToast(`Reminder email officially queued for ${user.email}`);
    } catch {
      showToast('Failed to queue reminder email.', 'error');
    }
    setSendingReminder(false);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-md bg-white dark:bg-slate-950 shadow-2xl border-l border-slate-100 dark:border-slate-800 animate-in slide-in-from-right duration-500">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-900">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Identity Profile</h3>
            <p className="text-[10px] font-black uppercase text-brand-600 tracking-widest mt-0.5">UID: {user.id.toString().slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="rounded-2xl p-2 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-400 transition-all"><X className="h-6 w-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-10 space-y-10">
          <div className="flex flex-col items-center text-center">
            <div className="h-32 w-32 rounded-3xl border-4 border-white dark:border-slate-900 shadow-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden mb-6 relative group">
              {user.profile_picture ? (
                 <img 
                   src={user.profile_picture} 
                   className="h-full w-full object-cover cursor-pointer group-hover:scale-110 transition-transform duration-500" 
                   alt="Avatar"
                   onClick={() => onImageClick(user.profile_picture)}
                 />
              ) : (
                 <User className="h-14 w-14 text-slate-300" />
              )}
            </div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{user.display_name || user.username}</h4>
            <span className="status-pill bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 font-black mt-3">
              <Shield className="w-3 h-3" /> {user.role.toUpperCase()}
            </span>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{user.email}</p>
               </div>
               <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Smartphone className="w-3 h-3" /> Registry ID</p>
                  <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 truncate">{user.username}</p>
               </div>
               <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Briefcase className="w-3 h-3" /> Designation</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{user.designation || 'Security Admin'}</p>
               </div>
               <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Smartphone className="w-3 h-3" /> Mobile</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{user.phone_number || 'Not Linked'}</p>
               </div>
            </div>

            <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-6 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-600" /> Identity Lifecycle Status
              </p>
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-2">Password Compliance</p>
                  {user.password_changed_at ? (
                    <div className="flex items-center gap-2">
                       <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                       <p className="text-xs font-black text-emerald-600">Secure: Updated {new Date(user.password_changed_at).toLocaleDateString()}</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                          <p className="text-xs font-black text-rose-500 uppercase tracking-widest">Action Required</p>
                       </div>
                       <button onClick={handleSendReminder} disabled={sendingReminder} 
                         className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-brand-600 transition-all shadow-sm">
                          <Bell className={`w-4 h-4 ${sendingReminder ? 'animate-bounce' : ''}`} />
                       </button>
                    </div>
                  )}
                </div>

                {user.account_expiry_date && (
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-2">Auditor Lease Expiry</p>
                    <div className={`flex items-center gap-2 text-xs font-black p-3 rounded-xl ${timeLeft === 'Expired' ? 'bg-rose-100 text-rose-700' : 'bg-brand-50 text-brand-700'}`}>
                      <Clock className="w-4 h-4" /> {timeLeft.toUpperCase()}
                    </div>
                  </div>
                )}
                
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-2">Account Availability</p>
                   <span className={`status-pill ${user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} border-none shadow-none font-black`}>
                      {user.is_active ? 'ENABLED & ACTIVE' : 'ACCESS REVOKED'}
                   </span>
                </div>
              </div>
            </div>
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
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [fullscreenPic, setFullscreenPic] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    API.get('users/')
      .then((res) => {
        const data = res.data.results || res.data;
        setAdmins(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleInvited = useCallback((data) => {
    fetchUsers();
    setCredData(data);
  }, [fetchUsers]);

  const handleToggleActive = useCallback(async (user) => {
    const action = user.is_active ? 'Revoke' : 'Restore';
    if (!confirm(`${action} access for ${user.username}?`)) return;
    try {
      await API.patch(`users/${user.id}/toggle-active/`);
      fetchUsers();
      if (viewingUser?.id === user.id) setViewingUser({...viewingUser, is_active: !user.is_active});
      showToast(`Access ${action.toLowerCase()}d for ${user.username}`);
    } catch {
      showToast(`Failed to ${action.toLowerCase()} access.`, 'error');
    }
  }, [fetchUsers, showToast, viewingUser]);

  const handleDelete = useCallback(async (user) => {
    if (!confirm(`Permanently delete ${user.username}? This cannot be undone!`)) return;
    try {
      await API.delete(`users/${user.id}/`);
      fetchUsers();
      if(viewingUser?.id === user.id) setViewingUser(null);
      showToast(`Administrator ${user.username} deleted permanently`);
    } catch {
      showToast('Failed to delete user.', 'error');
    }
  }, [fetchUsers, showToast, viewingUser]);

  const handleSendReminderGrid = useCallback(async (user) => {
    try {
      await API.post(`users/${user.id}/send-reminder/`);
      showToast(`Reminder email queued for ${user.email}`);
    } catch {
      showToast('Failed to queue reminder.', 'error');
    }
  }, [showToast]);

  const handleRegenerated = useCallback((data) => {
     fetchUsers();
     showToast(data.message || `New credentials securely emailed to ${data.email}`);
  }, [fetchUsers, showToast]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto relative">
      {viewingUser && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[50] animate-in fade-in duration-300" onClick={() => setViewingUser(null)} />}
      
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Identity Governance</h1>
          <p className="text-slate-500 font-medium mt-1">Manage privileged access and enforce identity lifecycle requirements.</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-primary flex items-center gap-2">
          <UserPlus className="h-5 w-5" /> Provision Identity
        </button>
      </div>

      <div className="space-y-4">
        {admins.length === 0 ? (
          <div className="cyber-card py-20 text-center text-slate-400">
            <User className="mx-auto h-12 w-12 text-slate-200 mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">No identity records found in registry.</p>
          </div>
        ) : (
          admins.map((admin) => (
            <div key={admin.id} className="cyber-card p-5 group transition-all hover:translate-x-1 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-transparent hover:border-brand-100 dark:hover:border-brand-900/30">
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-transform group-hover:scale-105 flex-shrink-0">
                  {admin.profile_picture ? (
                    <img src={admin.profile_picture} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                      <User className="h-7 w-7 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-slate-900 dark:text-white truncate cursor-pointer hover:text-brand-600 transition-colors text-lg" onClick={() => setViewingUser(admin)}>
                      {admin.display_name || admin.username}
                    </span>
                    <span className={`status-pill text-[9px] py-0.5 px-2 ${
                      admin.role === 'super_admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-none'
                      : admin.role === 'auditor' ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 border-none'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-none'
                    } font-black`}>
                      {admin.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 lowercase truncate">{admin.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:flex items-center gap-8 md:gap-16">
                <div className="flex flex-col min-w-[100px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Access Status</span>
                  {(() => {
                    const isExpired = admin.role === 'auditor' && admin.account_expiry_date && new Date(admin.account_expiry_date) < now;
                    if (isExpired) return (
                      <span className="status-pill bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-none animate-pulse w-fit">EXPIRED</span>
                    );
                    return (
                      <span className={`status-pill ${admin.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-none' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-none'} font-black w-fit`}>
                        {admin.is_active ? 'ACTIVE' : 'REVOKED'}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex flex-col min-w-[100px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Compliance</span>
                  {admin.password_changed_at ? (
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">Compliant</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded text-rose-600 border border-rose-100 dark:border-rose-900/30 uppercase tracking-tighter">Insecure</span>
                      <button onClick={() => handleSendReminderGrid(admin)} title="Trigger Security Warning" className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-400 hover:text-rose-600 transition-all shadow-sm">
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 border-t md:border-none pt-4 md:pt-0">
                {admin.is_active ? (
                  <button onClick={() => handleToggleActive(admin)} title="Suspend Identity" className="p-2.5 rounded-xl border border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-500 dark:hover:bg-amber-900/30 transition-all shadow-sm">
                    <Ban className="h-4.5 w-4.5" />
                  </button>
                ) : (
                  <button onClick={() => handleToggleActive(admin)} title="Activate Identity" className="p-2.5 rounded-xl border border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-500 dark:hover:bg-emerald-900/30 transition-all shadow-sm">
                    <CheckCircle className="h-4.5 w-4.5" />
                  </button>
                )}
                <button onClick={() => setRegeneratingUser(admin)} title="Cycle Credentials" className="p-2.5 rounded-xl border border-brand-200 text-brand-600 hover:bg-brand-50 dark:border-brand-900/50 dark:text-brand-400 dark:hover:bg-brand-900/30 transition-all shadow-sm">
                  <RefreshCw className="h-4.5 w-4.5" />
                </button>
                <button onClick={() => handleDelete(admin)} title="Purge Identity" className="p-2.5 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-500 dark:hover:bg-rose-900/30 transition-all shadow-sm">
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} onInvited={handleInvited} />
      <RegenerateModal user={regeneratingUser} onClose={() => setRegeneratingUser(null)} onRegenerated={handleRegenerated} />
      <CredentialModal open={!!credData} onClose={() => setCredData(null)} data={credData} />
      <ViewDetailsPanel user={viewingUser} onClose={() => setViewingUser(null)} showToast={showToast} onImageClick={setFullscreenPic} />

      {/* Fullscreen Picture Modal */}
      {fullscreenPic && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 backdrop-blur-xl p-8" onClick={() => setFullscreenPic(null)}>
          <button className="absolute top-8 right-8 text-white hover:text-brand-400 transition-colors" onClick={() => setFullscreenPic(null)}>
            <X className="w-10 h-10" />
          </button>
          <img src={fullscreenPic} className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl animate-in zoom-in-95 duration-500 border border-slate-800" alt="Identity Proof" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
