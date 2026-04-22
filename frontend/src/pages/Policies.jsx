import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Pencil, Trash2, X, FileText, ChevronDown, ChevronUp, Link as LinkIcon, Activity, AlertTriangle } from 'lucide-react';
import Toast from '../components/Toast';

const STATUS_COLORS = {
  active:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  draft:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  disabled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-950 p-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isEdit ? 'Edit Governance Policy' : 'Create New Policy'}
            </h3>
            <p className="text-slate-500 text-sm font-medium">Define security rules and map them to frameworks.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-rose-50 dark:bg-rose-900/20 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2 border border-rose-100 dark:border-rose-900/30">
            <X className="h-4 w-4" /> {error}
          </div>
        )}

        <div className="space-y-6 text-left">
          {/* Name */}
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Policy Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Identity & Access Management Policy"
              className="input-field" />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Policy Intent</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly explain the security requirements and scope..."
              rows={3}
              className="input-field min-h-[100px] resize-none" />
          </div>

          {/* Status */}
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Lifecycle Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="input-field cursor-pointer appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]">
              <option value="active">Active & Enforced</option>
              <option value="draft">Draft / Under Review</option>
              <option value="disabled">Archived / Disabled</option>
            </select>
          </div>

          {/* Multi-select controls */}
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Framework Mapping ({selectedControlIds.length} Selected)
            </label>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 space-y-4">
              {Object.entries(grouped).map(([fwName, ctrls]) => (
                <div key={fwName} className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-brand-600 tracking-tighter mb-1 px-2">{fwName}</p>
                  {ctrls.map(c => (
                    <label key={c.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                      <input type="checkbox" checked={selectedControlIds.includes(c.id)}
                        onChange={() => toggleControl(c.id)}
                        className="h-4 w-4 accent-brand-600 rounded border-slate-300" />
                      <span className="font-black text-xs text-brand-700 dark:text-brand-400 w-16 shrink-0">{c.control_code}</span>
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{c.title}</span>
                    </label>
                  ))}
                </div>
              ))}
              {allControls.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4 font-medium uppercase tracking-widest">No available controls.</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            Discard
          </button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Processing...' : isEdit ? 'Save Changes' : 'Initialize Policy'}
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
  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
  const [expandedId, setExpandedId] = useState(null);
  const perPage = 8;

  const fetchData = useCallback(() => {
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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaved = useCallback(() => {
    fetchData();
    showToast(editingPolicy ? 'Policy updated successfully!' : 'Policy created successfully!');
    setEditingPolicy(null);
  }, [fetchData, showToast, editingPolicy]);

  const openEdit = useCallback((policy) => {
    setEditingPolicy(policy);
    setShowModal(true);
  }, []);

  const openCreate = useCallback(() => {
    setEditingPolicy(null);
    setShowModal(true);
  }, []);

  const handleDelete = useCallback(async (policy) => {
    if (!confirm(`Delete policy "${policy.title}"? This cannot be undone.`)) return;
    try {
      await API.delete(`policies/${policy.id}/`);
      fetchData();
      showToast(`Policy "${policy.title}" deleted successfully.`);
    } catch {
      showToast('Failed to delete policy.', 'error');
    }
  }, [fetchData, showToast]);

  const handleStatusChange = useCallback(async (policy, newStatus) => {
    try {
      await API.patch(`policies/${policy.id}/`, { status: newStatus });
      fetchData();
      showToast(`Status updated to "${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}"`);
    } catch {
      showToast('Failed to update status.', 'error');
    }
  }, [fetchData, showToast]);

  const filtered = useMemo(() => policies.filter((p) =>
    (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  ), [policies, search]);

  const totalPages = useMemo(() => Math.ceil(filtered.length / perPage), [filtered, perPage]);
  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page, perPage]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Policy Manager</h1>
          <p className="text-slate-500 font-medium mt-1">Design and enforce governance requirements across the platform.</p>
        </div>
        {role !== 'auditor' && (
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-5 w-5" /> Initialize Policy
          </button>
        )}
      </div>

      <div className="mb-8 cyber-card p-2">
        <div className="flex items-center gap-3 px-4 py-2">
          <Search className="h-5 w-5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search security policies, descriptions, or requirements..."
            className="w-full text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none bg-transparent" />
        </div>
      </div>

      <div className="space-y-4">
        {paginated.length === 0 ? (
          <div className="cyber-card py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
            No policies found in registry.
          </div>
        ) : (
          paginated.map((p) => (
            <div key={p.id} className="flex flex-col">
              <div 
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                className="cyber-card p-5 group cursor-pointer transition-all hover:translate-x-1 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-transparent hover:border-brand-100 dark:hover:border-brand-900/30"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 shadow-sm flex-shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-black text-slate-900 dark:text-white text-lg truncate">
                      {p.title}
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Updated {new Date(p.updated_at || p.created_at).toLocaleDateString()}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${STATUS_COLORS[p.status] || STATUS_COLORS.active}`}>
                        {p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-12 md:gap-16">
                  <div className="flex flex-col min-w-[120px]">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mapped Controls</span>
                    <div className="flex flex-wrap gap-1">
                      {p.controls?.length ? p.controls.slice(0, 2).map(c => (
                        <span key={c.id} className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900 text-brand-700 dark:text-brand-400 border border-slate-100 dark:border-slate-800">
                          {c.control_code}
                        </span>
                      )) : <span className="text-slate-400 font-bold text-xs">—</span>}
                      {p.controls?.length > 2 && <span className="text-[10px] font-bold text-slate-400">+{p.controls.length - 2}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {role !== 'auditor' && (
                      <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} className="p-2.5 rounded-xl border border-brand-100 text-brand-600 hover:bg-brand-50 dark:border-brand-900/30 dark:text-brand-400 dark:hover:bg-brand-900/30 transition-all shadow-sm" title="Edit Policy">
                          <Pencil className="h-4.5 w-4.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }} className="p-2.5 rounded-xl border border-rose-100 text-rose-500 hover:bg-rose-50 dark:border-rose-900/30 dark:text-rose-500 dark:hover:bg-rose-900/30 transition-all shadow-sm" title="Delete Policy">
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    )}
                    {expandedId === p.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-brand-600 transition-colors" />}
                  </div>
                </div>
              </div>

              {expandedId === p.id && (
                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 mt-2 mb-6 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                      <LinkIcon className="w-4 h-4 text-brand-600" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Governance Control Mappings</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">Linked frameworks and telemetry rules.</p>
                    </div>
                  </div>
                  
                  {p.controls?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {p.controls.map(c => (
                        <div key={c.id} className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:border-brand-100 dark:hover:border-brand-900/20">
                          <div className="flex flex-col h-full">
                            <div className="flex-1">
                              <span className="text-[9px] font-black text-brand-700 bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded-lg mb-3 inline-block uppercase tracking-widest">
                                {c.control_code}
                              </span>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed mb-4">{c.title}</p>
                            </div>
                            <div className="pt-4 border-t border-slate-50 dark:border-slate-900">
                              {c.wazuh_mappings?.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {c.wazuh_mappings.map(m => (
                                    <span key={m.id} className="text-[9px] font-black px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 flex items-center gap-1.5" title={m.rule_description}>
                                      <Activity className="w-3 h-3 text-emerald-500" /> RULE {m.wazuh_rule_id}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-slate-300">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">No telemetry mappings</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-white dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No active control mappings.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-8 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="h-10 w-10 rounded-xl text-sm font-black text-slate-400 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-40 transition-all cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-800">‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => setPage(n)}
              className={`h-10 w-10 rounded-xl text-sm font-black transition-all cursor-pointer ${
                n === page ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-100 dark:hover:border-slate-800'
              }`}>{n}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="h-10 w-10 rounded-xl text-sm font-black text-slate-400 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-40 transition-all cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-800">›</button>
        </div>
      )}

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
