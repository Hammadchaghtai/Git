import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Trash2, Ban, CheckCircle, User, X, Copy, RefreshCw, Key, Eye, EyeOff, Bell, Clock } from 'lucide-react';
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#0f172a]">🎉 Admin Created Successfully</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-xs font-semibold uppercase text-amber-600 mb-3">⚠️ Save these credentials — they won't be shown again!</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded bg-white px-3 py-2 border border-amber-100">
              <span className="text-sm text-gray-600">Username:</span>
              <span className="font-mono text-sm font-bold text-[#0f172a]">{data.username}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-white px-3 py-2 border border-amber-100">
              <span className="text-sm text-gray-600">Password:</span>
              <span className="font-mono text-sm font-bold text-[#0f172a]">{data.temp_password}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-white px-3 py-2 border border-amber-100">
              <span className="text-sm text-gray-600">Role:</span>
              <span className="text-sm font-semibold text-violet-700">{data.role || 'Admin'}</span>
            </div>
            {data.totp_secret && (
              <div className="rounded bg-sky-50 border border-sky-100 px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 flex items-center gap-1"><Key className="h-3.5 w-3.5" /> TOTP Secret Key:</span>
                  <button onClick={() => setShowSecret(s => !s)} className="text-gray-400 hover:text-gray-600">
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <span className={`font-mono text-xs font-bold text-sky-800 break-all ${!showSecret ? 'blur-sm select-none' : ''}`}>
                  {data.totp_secret}
                </span>
                <p className="text-[10px] text-sky-600 mt-1">📱 QR code + credentials also sent to admin's email.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Copy className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy All'}
          </button>
          <button onClick={onClose} className="flex-1 rounded-lg bg-[#0f172a] py-2.5 text-sm font-semibold text-white hover:bg-[#1e293b]">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Regenerate Modal ─────────────────────────────────── */
function RegenerateModal({ user, onClose, onRegenerated }) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) setEmail(user.email);
  }, [user]);

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await API.post(`users/${user.id}/regenerate-credentials/`, { email });
      onRegenerated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to regenerate credentials.');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-[#0f172a] mb-2 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-500" /> Regenerate Credentials
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          This will void existing credentials and trigger a <strong>new password & TOTP QR code</strong> setup process.
        </p>

        {error && <div className="mb-4 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
             Target Delivery Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full input-field"
            placeholder="Where should the new invite be sent?"
          />
          <p className="text-[10px] text-gray-400 mt-1 mb-6">
            You can modify the email if the administrator lost access to their old address.
          </p>

          <div className="flex justify-end gap-2">
             <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100">Cancel</button>
             <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 flex items-center gap-2">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} 
                Confirm Regeneration
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

  // Get current datetime string formatted for datetime-local input
  const getMinDateTime = () => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000; 
    return (new Date(Date.now() - tzOffset)).toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#0f172a]">Invite New Administrator</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <p className="mt-2 text-xs text-gray-400">
            A unique password with special characters + a QR code barcode will be generated and sent to the email.
          </p>
          {error && <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">⚠️ {error}</div>}
          
          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full input-field" placeholder="admin@company.com" />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full input-field cursor-pointer">
              <option value="admin">Admin</option>
              <option value="auditor">Auditor</option>
            </select>
          </div>

          {role === 'auditor' && (
            <div className="mt-3 p-3 bg-sky-50 rounded-lg border border-sky-100">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-sky-800">Access Expiry Date & Time</label>
              <input type="datetime-local" min={getMinDateTime()} value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                className="w-full input-field border-sky-200" required />
              <p className="text-[10px] text-sky-600 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Account will auto-revoke precisely at this time.</p>
              <p className="text-[10px] text-gray-400 mt-0.5 italic">(Saved in UTC, currently adjusting for your local timezone)</p>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:opacity-60 flex items-center gap-2">
              {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : '📧'} 
              {saving ? 'Creating...' : 'Create & Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── View Details Slide-out Panel ─────────────────── */
function ViewDetailsPanel({ user, onClose, showToast }) {
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
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl border-l border-gray-100 transform transition-transform translate-x-0 duration-300">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-bold text-[#0f172a]">User Details</h3>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden mb-3">
              {user.profile_picture ? (
                 <img src={`${import.meta.env.VITE_API_URL}${user.profile_picture}`} className="h-full w-full object-cover" alt="Avatar"/>
              ) : (
                 <User className="h-10 w-10 text-slate-400" />
              )}
            </div>
            <h4 className="text-xl font-bold text-slate-800">{user.display_name || user.username}</h4>
            <span className="text-sm font-semibold text-sky-600 uppercase tracking-widest mt-1">{user.role}</span>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Email</p>
              <p className="text-sm font-medium text-slate-800">{user.email}</p>
            </div>
            {(user.display_name && user.display_name !== user.username) && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">System Username</p>
                <p className="font-mono text-sm font-medium text-slate-800">{user.username}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Designation</p>
              <p className="text-sm font-medium text-slate-800">{user.designation || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Phone Number</p>
              <p className="text-sm font-medium text-slate-800">{user.phone_number || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Status</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                {user.is_active ? 'Active Account' : 'Access Revoked'}
              </span>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Security Status</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Password Changed At</p>
                  {user.password_changed_at ? (
                    <p className="text-sm font-semibold text-emerald-600">{new Date(user.password_changed_at).toLocaleString()}</p>
                  ) : (
                    <div className="flex items-center gap-2">
                       <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">NEVER CHANGED</span>
                       <button onClick={handleSendReminder} disabled={sendingReminder} title="Send reminder to change password"
                        className={`rounded-full p-1 border transition-colors ${sendingReminder ? 'bg-slate-300 border-slate-300' : 'bg-white border-slate-200 hover:bg-slate-100'}`}>
                          <Bell className={`w-3.5 h-3.5 ${sendingReminder ? 'text-slate-400' : 'text-slate-600'}`} />
                       </button>
                    </div>
                  )}
                </div>

                {user.account_expiry_date && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Auditor Access Expiry</p>
                    <div className={`flex items-center gap-2 text-sm font-semibold ${timeLeft === 'Expired' ? 'text-rose-600' : 'text-sky-700'}`}>
                      <Clock className="w-4 h-4" /> {timeLeft}
                    </div>
                  </div>
                )}
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#38bdf8]" />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Black backdrop if viewing user */}
      {viewingUser && <div className="fixed inset-0 bg-black/20 z-[40]" onClick={() => setViewingUser(null)} />}
      
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a] dark:text-white">Manage Administrators</h1>
          <p className="text-sm text-gray-400">Add, remove, or modify administrator access via strict identities</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 rounded-lg bg-[#0f172a] dark:bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e293b] dark:hover:bg-sky-600 transition-colors shadow-sm">
          <UserPlus className="h-4 w-4" /> Invite Administrator
        </button>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden dark:bg-navy-800 dark:border-navy-700">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:bg-navy-900 dark:border-navy-700">
              <th className="py-3 pl-5 pr-4">Admin Details</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Pwd Changed</th>
              <th className="py-3 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  <User className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  No administrators found. Click "Invite Administrator" to add identity.
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="border-b border-gray-50 hover:bg-slate-50 transition-colors dark:border-navy-700/50 dark:hover:bg-navy-900/50">
                  <td className="py-3.5 pl-5 pr-4 group">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-navy-700 overflow-hidden border border-slate-200 dark:border-navy-600">
                        {admin.profile_picture ? (
                           <img src={`${import.meta.env.VITE_API_URL}${admin.profile_picture}`} className="w-full h-full object-cover" />
                        ) : (
                           <User className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 cursor-pointer hover:underline" onClick={() => setViewingUser(admin)}>
                          {admin.display_name || admin.username}
                          <Eye className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{admin.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase ${
                      admin.role === 'super_admin' ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/50'
                      : admin.role === 'auditor' ? 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-900/50'
                      : 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-900/50'
                    }`}>
                      {admin.role}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      admin.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {admin.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-xs font-medium">
                    {admin.password_changed_at ? (
                      <span className="text-slate-500 px-2">Changed</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 tracking-wider dark:bg-rose-900/30 dark:border-rose-900/50 border border-rose-200">NEVER</span>
                        <button onClick={() => handleSendReminderGrid(admin)} title="Force Send Reset Reminder" className="text-rose-400 hover:text-rose-600 transition-colors p-1 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20">
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 pr-5">
                    <div className="flex items-center justify-end gap-1.5">
                      {admin.is_active ? (
                        <button onClick={() => handleToggleActive(admin)} title="Revoke Access"
                          className="flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:border-amber-900/50 dark:text-amber-500 dark:hover:bg-amber-900/30 transition-colors">
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button onClick={() => handleToggleActive(admin)} title="Restore Access"
                          className="flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-500 dark:hover:bg-emerald-900/30 transition-colors">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => setRegeneratingUser(admin)} title="Regenerate Credentials"
                        className="flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-500 dark:hover:bg-blue-900/30 transition-colors">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(admin)} title="Delete Admin"
                        className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-900/50 dark:text-red-500 dark:hover:bg-red-900/30 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} onInvited={handleInvited} />
      <RegenerateModal user={regeneratingUser} onClose={() => setRegeneratingUser(null)} onRegenerated={handleRegenerated} />
      <CredentialModal open={!!credData} onClose={() => setCredData(null)} data={credData} />
      <ViewDetailsPanel user={viewingUser} onClose={() => setViewingUser(null)} showToast={showToast} />
    </div>
  );
}
