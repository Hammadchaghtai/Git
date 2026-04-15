import { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import Toast from '../components/Toast';

const STATUS_COLORS = {
  active:   'bg-emerald-50 text-emerald-700',
  draft:    'bg-amber-50 text-amber-700',
  disabled: 'bg-gray-100 text-gray-500',
};

/* ── Policy Modal (Create + Edit) ────────────── */
function PolicyModal({ open, onClose, onSaved, editingPolicy, allControls }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [selectedControlIds, setSelectedControlIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!editingPolicy;

  useEffect(() => {
    if (editingPolicy) {
      setTitle(editingPolicy.title || '');
      setDescription(editingPolicy.description || '');
      setStatus(editingPolicy.status || 'active');
      setSelectedControlIds(editingPolicy.controls?.map(c => c.id) || []);
    } else {
      setTitle('');
      setDescription('');
      setStatus('active');
      setSelectedControlIds([]);
    }
  }, [editingPolicy, open]);

  if (!open) return null;

  const toggleControl = (id) => {
    setSelectedControlIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Policy name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        status,
        control_ids: selectedControlIds,
      };
      if (isEdit) {
        await API.patch(`policies/${editingPolicy.id}/`, payload);
      } else {
        await API.post('policies/', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.title?.[0] || 'Failed to save policy.');
    } finally {
      setSaving(false);
    }
  };

  // Group controls by framework
  const grouped = {};
  allControls.forEach(c => {
    const key = c.framework_name || 'Uncategorized';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#0f172a]">{isEdit ? 'Edit Policy' : 'Create New Policy'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="h-5 w-5" /></button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-xs font-semibold text-red-600">⚠️ {error}</div>
        )}

        <div className="mt-5 space-y-4 text-left">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Policy Name</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Access Control Policy"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#38bdf8] focus:outline-none" />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the policy scope and objectives..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#38bdf8] focus:outline-none resize-none" />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#38bdf8] focus:outline-none cursor-pointer">
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          {/* Multi-select controls */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Link Controls ({selectedControlIds.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
              {Object.entries(grouped).map(([fwName, ctrls]) => (
                <div key={fwName} className="mb-3 last:mb-0">
                  <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">{fwName}</p>
                  {ctrls.map(c => (
                    <label key={c.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white cursor-pointer transition-colors">
                      <input type="checkbox" checked={selectedControlIds.includes(c.id)}
                        onChange={() => toggleControl(c.id)}
                        className="h-3.5 w-3.5 accent-[#38bdf8] rounded" />
                      <span className="font-mono text-xs font-semibold text-[#0f172a]">{c.control_code}</span>
                      <span className="text-xs text-gray-500 truncate">{c.title}</span>
                    </label>
                  ))}
                </div>
              ))}
              {allControls.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No controls available.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="rounded-lg bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e293b] cursor-pointer disabled:opacity-60">
            {saving ? 'Saving...' : isEdit ? 'Update Policy' : 'Create Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Policies Page ──────────────────────────── */
export default function Policies() {
  const { role } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [allControls, setAllControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const [expandedId, setExpandedId] = useState(null);
  const perPage = 8;

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      API.get('policies/?page_size=200'),
      API.get('controls/?page_size=200'),
    ])
      .then(([polRes, ctrlRes]) => {
        setPolicies(polRes.data.results || polRes.data);
        setAllControls(ctrlRes.data.results || ctrlRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleSaved = () => {
    fetchData();
    showToast(editingPolicy ? 'Policy updated successfully!' : 'Policy created successfully!');
    setEditingPolicy(null);
  };

  const openEdit = (policy) => {
    setEditingPolicy(policy);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingPolicy(null);
    setShowModal(true);
  };

  const handleDelete = async (policy) => {
    if (!confirm(`Delete policy "${policy.title}"? This cannot be undone.`)) return;
    try {
      await API.delete(`policies/${policy.id}/`);
      fetchData();
      showToast(`Policy "${policy.title}" deleted successfully.`);
    } catch {
      showToast('Failed to delete policy.', 'error');
    }
  };

  const handleStatusChange = async (policy, newStatus) => {
    try {
      await API.patch(`policies/${policy.id}/`, { status: newStatus });
      fetchData();
      showToast(`Status updated to "${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}"`);
    } catch {
      showToast('Failed to update status.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#38bdf8]" />
      </div>
    );
  }

  const filtered = policies.filter((p) =>
    (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0f172a]">Policy Manager</h1>
        {role !== 'auditor' && (
          <button onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e293b] cursor-pointer">
            <Plus className="h-4 w-4" /> Create New Policy
          </button>
        )}
      </div>


      <div className="mb-5 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 px-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search policies by name or description..."
            className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none" />
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <th className="py-3 pl-5 pr-4">Policy Name</th>
              <th className="py-3 pr-4">Linked Controls</th>
              <th className="py-3 pr-4">Last Updated</th>
              <th className="py-3 pr-4">Status</th>
              {role !== 'auditor' && <th className="py-3 pr-5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-gray-400">No policies found.</td></tr>
            ) : (
              paginated.map((p) => (
                <>
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                    <td className="py-3.5 pl-5 pr-4 font-semibold text-[#0f172a]">{p.title}</td>
                    <td className="py-3.5 pr-4 text-gray-500">
                      {p.controls?.length ? p.controls.map(c => c.control_code).join(', ') : '—'}
                    </td>
                    <td className="py-3.5 pr-4 text-gray-400 text-xs">
                      {new Date(p.updated_at || p.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 pr-4">
                      {role !== 'auditor' ? (
                        <select
                          value={p.status || 'active'}
                          onChange={(e) => { e.stopPropagation(); handleStatusChange(p, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          className={`appearance-none rounded-full px-3 py-1 text-xs font-semibold border-0 cursor-pointer outline-none bg-transparent ${STATUS_COLORS[p.status] || STATUS_COLORS.active}`}
                        >
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      ) : (
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[p.status] || STATUS_COLORS.active}`}>
                          {p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : 'Active'}
                        </span>
                      )}
                    </td>
                    {role !== 'auditor' && (
                      <td className="py-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 cursor-pointer">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }}
                            className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 cursor-pointer transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {/* Expanded row: show linked controls with Wazuh mappings */}
                  {expandedId === p.id && p.controls?.length > 0 && (
                    <tr key={`${p.id}-expanded`}>
                      <td colSpan={5} className="bg-gray-50/70 px-5 py-4">
                        <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Linked Controls & Wazuh Rule Mappings</p>
                        <div className="space-y-2">
                          {p.controls.map(c => (
                            <div key={c.id} className="rounded-lg border border-gray-100 bg-white px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#0f172a]">{c.control_code}</span>
                                <span className="text-xs text-gray-500">{c.title}</span>
                              </div>
                              {c.wazuh_mappings?.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {c.wazuh_mappings.map(m => (
                                    <span key={m.id} className="rounded bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700"
                                      title={m.rule_description}>
                                      🔗 {m.wazuh_rule_id}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-1 text-[10px] text-gray-400">No Wazuh mappings for this control.</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 py-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="h-9 w-9 rounded-lg text-sm font-semibold text-gray-400 hover:bg-gray-100 disabled:opacity-40 cursor-pointer">‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setPage(n)}
                className={`h-9 w-9 rounded-lg text-sm font-semibold cursor-pointer ${
                  n === page ? 'bg-[#0f172a] text-white' : 'text-gray-400 hover:bg-gray-100'
                }`}>{n}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="h-9 w-9 rounded-lg text-sm font-semibold text-gray-400 hover:bg-gray-100 disabled:opacity-40 cursor-pointer">›</button>
          </div>
        )}
      </div>

      <PolicyModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingPolicy(null); }}
        onSaved={handleSaved}
        editingPolicy={editingPolicy}
        allControls={allControls}
      />
    </div>
  );
}
