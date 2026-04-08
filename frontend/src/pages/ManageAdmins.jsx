import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Ban, CheckCircle, User, X, Copy } from 'lucide-react';
import API from '../api/axios';

/* ── Credential Modal (persistent, must dismiss manually) ── */
function CredentialModal({ open, onClose, data }) {
  const [copied, setCopied] = useState(false);
  if (!open || !data) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`Username: ${data.username}\nPassword: ${data.temp_password}`);
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
          <p className="text-xs font-semibold uppercase text-amber-600 mb-2">⚠️ Save these credentials — they won't be shown again!</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded bg-white px-3 py-2 border border-amber-100">
              <span className="text-sm text-gray-600">Username:</span>
              <span className="font-mono text-sm font-bold text-[#0f172a]">{data.username}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-white px-3 py-2 border border-amber-100">
              <span className="text-sm text-gray-600">Temp Password:</span>
              <span className="font-mono text-sm font-bold text-[#0f172a]">{data.temp_password}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-white px-3 py-2 border border-amber-100">
              <span className="text-sm text-gray-600">Role:</span>
              <span className="text-sm font-semibold text-violet-700">{data.role}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">
            <Copy className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy Credentials'}
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

/* ── Invite Modal ───────────────────────────── */
function InviteModal({ open, onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await API.post('users/', { email, role });
      onInvited(res.data);
      setEmail('');
      setRole('admin');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
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
            Enter the email address of the person you want to invite. A random password will be generated.
          </p>

          {error && (
            <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">⚠️ {error}</div>
          )}

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
              {saving ? 'Creating...' : '📧 Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [credData, setCredData] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

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

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const handleInvited = (data) => {
    fetchUsers();
    // Show persistent credential modal instead of a quick toast
    setCredData(data);
  };

  const handleToggleActive = async (user) => {
    const action = user.is_active ? 'Revoke' : 'Restore';
    if (!confirm(`${action} access for ${user.username}?`)) return;

    try {
      await API.patch(`users/${user.id}/toggle-active/`);
      fetchUsers();
      showMsg('success', `Access ${action.toLowerCase()}d for ${user.username}`);
    } catch {
      showMsg('error', `Failed to ${action.toLowerCase()} access.`);
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Permanently delete ${user.username}? This cannot be undone!`)) return;

    try {
      await API.delete(`users/${user.id}/`);
      fetchUsers();
      showMsg('success', `Administrator ${user.username} deleted permanently`);
    } catch {
      showMsg('error', 'Failed to delete user.');
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Manage Administrators</h1>
          <p className="text-sm text-gray-400">Add, remove, or modify administrator access</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e293b] cursor-pointer">
          <UserPlus className="h-4 w-4" /> Invite New Admin
        </button>
      </div>

      {message.text && (
        <div className={`mb-5 rounded-lg px-4 py-3 text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <th className="py-3 pl-5 pr-4">Username</th>
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
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
                  <td className="py-3.5 pr-4 text-gray-500">{admin.email}</td>
                  <td className="py-3.5 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      admin.role === 'super_admin'
                        ? 'bg-amber-50 text-amber-700'
                        : admin.role === 'auditor'
                        ? 'bg-sky-50 text-sky-700'
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
                  <td className="py-3.5 pr-5 text-right">
                    <div className="flex items-center justify-end gap-2">
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
    </div>
  );
}
