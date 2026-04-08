import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Trash2, Ban, CheckCircle, User, X, Copy, RefreshCw, Key, Eye, EyeOff, Lock } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#0f172a]">🎉 Admin Created Successfully</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="h-5 w-5" /></button>
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
              <span className="text-sm font-semibold text-violet-700">{data.role}</span>
            </div>
            {data.totp_secret && (
              <div className="rounded bg-sky-50 border border-sky-100 px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 flex items-center gap-1"><Key className="h-3.5 w-3.5" /> TOTP Secret Key:</span>
                  <button onClick={() => setShowSecret(s => !s)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
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
          <button onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">
            <Copy className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy All'}
          </button>
          <button onClick={onClose}
            className="flex-1 rounded-lg bg-[#0f172a] py-2.5 text-sm font-semibold text-white hover:bg-[#1e293b] cursor-pointer">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Invite Modal ─────────────────────────────────── */
function InviteModal({ open, onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await API.post('users/', { email, role });
      onInvited(res.data);
      setEmail(''); setRole('admin');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#0f172a]">Invite New Administrator</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <p className="mt-2 text-xs text-gray-400">
            A unique password with special characters + a QR code barcode will be generated and sent to the admin's email.
          </p>
          {error && <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">⚠️ {error}</div>}
          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com" required
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#38bdf8] focus:outline-none" />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#38bdf8] focus:outline-none cursor-pointer">
              <option value="admin">Admin</option>
              <option value="auditor">Auditor</option>
            </select>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b] cursor-pointer disabled:opacity-60">
              {saving ? 'Creating...' : '📧 Create & Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Change Password Modal ────────────────────────── */
function ChangePasswordModal({ open, onClose, onSuccess }) {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await API.post('auth/change-password/', {
        old_password: oldPass,
        new_password: newPass,
        new_password2: newPass2,
      });
      onSuccess();
      setOldPass(''); setNewPass(''); setNewPass2('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#0f172a] flex items-center gap-2"><Lock className="h-5 w-5" /> Change Password</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">⚠️ {error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { label: 'Current Password', val: oldPass, set: setOldPass },
            { label: 'New Password', val: newPass, set: setNewPass },
            { label: 'Confirm New Password', val: newPass2, set: setNewPass2 },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</label>
              <input type="password" value={val} onChange={(e) => set(e.target.value)} required
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#38bdf8] focus:outline-none" />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 cursor-pointer">Cancel</button>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b] cursor-pointer disabled:opacity-60">
              {saving ? 'Saving...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────── */
export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [credData, setCredData] = useState(null);
  const [regenerating, setRegenerating] = useState(null); // user id being regenerated
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);

  const fetchUsers = () => {
    setLoading(true);
    API.get('users/')
      .then((res) => {
        const data = res.data.results || res.data;
        setAdmins(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleInvited = (data) => {
    fetchUsers();
    setCredData(data);
  };

  const handleToggleActive = async (user) => {
    const action = user.is_active ? 'Revoke' : 'Restore';
    if (!confirm(`${action} access for ${user.username}?`)) return;
    try {
      await API.patch(`users/${user.id}/toggle-active/`);
      fetchUsers();
      showToast(`Access ${action.toLowerCase()}d for ${user.username}`);
    } catch {
      showToast(`Failed to ${action.toLowerCase()} access.`, 'error');
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Permanently delete ${user.username}? This cannot be undone!`)) return;
    try {
      await API.delete(`users/${user.id}/`);
      fetchUsers();
      showToast(`Administrator ${user.username} deleted permanently`);
    } catch {
      showToast('Failed to delete user.', 'error');
    }
  };

  const handleRegenerate = async (user) => {
    if (!confirm(`Regenerate credentials for ${user.username}?\n\nThis will create a new password AND new QR code, then send them to ${user.email}.\n\n(Use this when admin's phone is stolen)`)) return;
    setRegenerating(user.id);
    try {
      const res = await API.post(`users/${user.id}/regenerate-credentials/`);
      fetchUsers();
      setCredData(res.data);
      showToast(`New credentials sent to ${user.email}`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to regenerate credentials.', 'error');
    } finally {
      setRegenerating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#38bdf8]" />
      </div>
    );
  }

  return (
    <div>
      {/* Floating Toast — no layout shift */}
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Manage Administrators</h1>
          <p className="text-sm text-gray-400">Add, remove, or modify administrator access</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowChangePw(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">
            <Lock className="h-4 w-4" /> Change My Password
          </button>
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e293b] cursor-pointer">
            <UserPlus className="h-4 w-4" /> Invite New Admin
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <th className="py-3 pl-5 pr-4">Username</th>
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Pwd Changed</th>
              <th className="py-3 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  <User className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  No administrators found. Click "Invite New Admin" to add one.
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3.5 pl-5 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50">
                        <User className="h-4 w-4 text-sky-500" />
                      </div>
                      <span className="font-semibold text-[#0f172a]">{admin.username}</span>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-gray-500 text-xs">{admin.email}</td>
                  <td className="py-3.5 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      admin.role === 'super_admin' ? 'bg-amber-50 text-amber-700'
                      : admin.role === 'auditor' ? 'bg-sky-50 text-sky-700'
                      : 'bg-violet-50 text-violet-700'
                    }`}>
                      {admin.role === 'super_admin' ? 'Super Admin' : admin.role === 'auditor' ? 'Auditor' : 'Admin'}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      admin.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {admin.is_active ? 'Active' : 'Revoked'}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-xs text-gray-400">
                    {admin.password_changed_at
                      ? new Date(admin.password_changed_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                      : <span className="text-gray-300 italic">Never</span>
                    }
                  </td>
                  <td className="py-3.5 pr-5">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Revoke / Restore */}
                      {admin.is_active ? (
                        <button onClick={() => handleToggleActive(admin)}
                          className="flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 cursor-pointer">
                          <Ban className="h-3.5 w-3.5" /> Revoke
                        </button>
                      ) : (
                        <button onClick={() => handleToggleActive(admin)}
                          className="flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 cursor-pointer">
                          <CheckCircle className="h-3.5 w-3.5" /> Restore
                        </button>
                      )}
                      {/* Regenerate Credentials */}
                      <button onClick={() => handleRegenerate(admin)}
                        disabled={regenerating === admin.id}
                        title="Regenerate password & QR code (lost phone)"
                        className="flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 cursor-pointer disabled:opacity-50">
                        <RefreshCw className={`h-3.5 w-3.5 ${regenerating === admin.id ? 'animate-spin' : ''}`} />
                        {regenerating === admin.id ? '...' : 'Reset'}
                      </button>
                      {/* Delete */}
                      <button onClick={() => handleDelete(admin)}
                        className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 cursor-pointer">
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
      <CredentialModal open={!!credData} onClose={() => setCredData(null)} data={credData} />
      <ChangePasswordModal
        open={showChangePw}
        onClose={() => setShowChangePw(false)}
        onSuccess={() => showToast('Password changed! Please log in again.')}
      />
    </div>
  );
}
