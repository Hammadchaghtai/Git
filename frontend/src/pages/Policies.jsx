// GRC Policy Manager v2.1
import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Pencil, Trash2, X, FileText, ChevronDown, ChevronUp, Link as LinkIcon, Activity, AlertTriangle, ShieldCheck, ListFilter, ArrowUpDown, Building2, ArrowLeft, Monitor } from 'lucide-react';
import Toast from '../components/Toast';
import { logFailure } from '../utils/logFailure';

const STATUS_COLORS = {
  active:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  draft:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  disabled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

/* ── Policy Modal (Create + Edit) ────────────── */
function PolicyModal({ open, onClose, onSaved, editingPolicy, allControls, allDepartments, initialDeptId, onAddDept }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [selectedControlIds, setSelectedControlIds] = useState([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);
  const [controlSearch, setControlSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [showAddDept, setShowAddDept] = useState(false);
  const [addingDept, setAddingDept] = useState(false);
  const isEdit = !!editingPolicy;

  useEffect(() => {
    if (editingPolicy) {
      setTitle(editingPolicy.title || '');
      setDescription(editingPolicy.description || '');
      setStatus(editingPolicy.status || 'active');
      setSelectedControlIds(editingPolicy.controls?.map(c => c.id) || []);
      setSelectedDeptIds(editingPolicy.departments?.map(d => d.id) || []);
    } else {
      setTitle('');
      setDescription('');
      setStatus('active');
      setSelectedControlIds([]);
      // Pre-select department if initialDeptId passed (ensure Number type)
      setSelectedDeptIds(initialDeptId ? [Number(initialDeptId)] : []);
    }
    setControlSearch('');
    setError('');
    setShowAddDept(false);
    setNewDeptName('');
  }, [editingPolicy, open, initialDeptId]);

  if (!open) return null;

  const toggleControl = (id) => {
    setSelectedControlIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  const toggleDept = (id) => {
    setSelectedDeptIds(prev =>
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
        department_ids: selectedDeptIds,
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
      logFailure(`Failed to ${isEdit ? 'update' : 'create'} policy '${title}'`, 'Policy');
    } finally {
      setSaving(false);
    }
  };

  // Filter and group controls
  const filteredControls = allControls.filter(c => 
    (c.control_code || '').toLowerCase().includes(controlSearch.toLowerCase()) ||
    (c.title || '').toLowerCase().includes(controlSearch.toLowerCase()) ||
    (c.framework_name || '').toLowerCase().includes(controlSearch.toLowerCase())
  );

  const grouped = {};
  filteredControls.forEach(c => {
    const key = c.framework_name || 'Uncategorized';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-300">
      <div className="w-full max-w-2xl rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] dark:shadow-brand-500/10 max-h-[92vh] overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col relative">
        
        {/* Glow Effect Top Left */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-500/10 blur-[80px] pointer-events-none rounded-full" />

        {/* Header */}
        <div className="flex items-center justify-between p-8 pb-6 border-b border-slate-100 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 relative z-10">
          <div className="flex items-center gap-5">
            <div className="p-3.5 rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30 rotate-3">
               <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {isEdit ? 'Refine Policy' : 'Forge New Policy'}
              </h3>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.15em] mt-1 flex items-center gap-2">
                 <ShieldCheck className="w-3 h-3 text-emerald-500" /> Compliance Registry Interface
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-2xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar relative z-10">
          {error && (
            <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 px-5 py-4 text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-3 border border-red-100 dark:border-red-900/30 animate-shake">
              <AlertTriangle className="h-5 w-5" /> {error}
            </div>
          )}

          <div className="space-y-8">
            {/* Title Section */}
            <div className="group">
              <div className="flex items-center justify-between mb-2.5">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 group-focus-within:text-brand-600 transition-colors">
                   <Activity className="w-3 h-3" /> Policy Designation
                </label>
                <span className={`text-[9px] font-bold ${title.length > 50 ? 'text-amber-500' : 'text-slate-300'}`}>{title.length}/100</span>
              </div>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Identity & Data Sovereignty Policy..."
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 shadow-sm" />
            </div>

            {/* Description Section */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                   <LinkIcon className="w-3 h-3" /> Governance Intent
                </label>
                <span className={`text-[9px] font-bold ${description.length > 200 ? 'text-amber-500' : 'text-slate-300'}`}>{description.length}/500</span>
              </div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                placeholder="Describe the enforcement scope and technical controls..."
                rows={3}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all placeholder:text-slate-400 min-h-[120px] resize-none shadow-sm" />
            </div>

            {/* Status Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="md:col-span-2">
                <label className="mb-2.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">Policy Lifecycle</label>
                <div className="grid grid-cols-3 gap-3">
                   {['active', 'draft', 'disabled'].map((s) => (
                     <button key={s} onClick={() => setStatus(s)}
                       className={`px-4 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                         status === s 
                         ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-600/30' 
                         : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-brand-500'
                       }`}>
                       {s === 'active' ? '🟢 Active' : s === 'draft' ? '🟡 Draft' : '⚪ Disabled'}
                     </button>
                   ))}
                </div>
               </div>
            </div>

            {/* Department Assignment */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800/60">
               <div className="flex items-center justify-between mb-3">
                 <label className="block text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Assign to Departments</label>
                 <button
                   type="button"
                   onClick={() => setShowAddDept(v => !v)}
                   className="flex items-center gap-1.5 text-[10px] font-black text-brand-600 uppercase tracking-widest hover:bg-brand-50 dark:hover:bg-brand-900/30 px-3 py-1.5 rounded-xl transition-all border border-brand-100 dark:border-brand-800"
                 >
                   <Plus className="w-3 h-3" /> Add New Dept
                 </button>
               </div>

               {/* Inline Add Department */}
               {showAddDept && (
                 <div className="mb-3 flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                   <input
                     type="text"
                     value={newDeptName}
                     onChange={e => setNewDeptName(e.target.value)}
                     placeholder="Department name..."
                     className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/20"
                   />
                   <button
                     type="button"
                     disabled={addingDept || !newDeptName.trim()}
                     onClick={async () => {
                       if (!newDeptName.trim()) return;
                       setAddingDept(true);
                       try {
                         const res = await (await import('../api/axios')).default.post('departments/', { name: newDeptName.trim() });
                         onAddDept && onAddDept(res.data);
                         setNewDeptName('');
                         setShowAddDept(false);
                         // auto-select new dept
                         setSelectedDeptIds(prev => [...prev, res.data.id]);
                       } catch {}
                       setAddingDept(false);
                     }}
                     className="px-4 py-2 rounded-xl bg-brand-600 text-white text-[10px] font-black uppercase disabled:opacity-50 transition-all"
                   >
                     {addingDept ? '...' : 'Save'}
                   </button>
                   <button type="button" onClick={() => setShowAddDept(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                     <X className="w-3.5 h-3.5" />
                   </button>
                 </div>
               )}

               <div className="flex flex-wrap gap-2">
                 {(allDepartments || []).map(d => (
                   <button key={d.id} type="button" onClick={() => toggleDept(d.id)}
                     className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                       selectedDeptIds.includes(Number(d.id))
                         ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-600/30'
                         : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-brand-500'
                     }`}>
                     {d.name}
                   </button>
                 ))}
               </div>
            </div>

            {/* Mapping Section */}
            <div className="pt-8 border-t border-slate-100 dark:border-slate-800/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Framework Mapping</label>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Bind controls to this policy</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={(e) => {
                    e.preventDefault();
                    setSelectedControlIds(allControls.map(c => c.id));
                  }} className="px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-all border border-brand-100 dark:border-brand-800">
                    Select All
                  </button>
                  <button onClick={(e) => {
                    e.preventDefault();
                    setSelectedControlIds([]);
                  }} className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-500 uppercase hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700">
                    Clear All
                  </button>
                  <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" value={controlSearch} onChange={(e) => setControlSearch(e.target.value)}
                      placeholder="Search..."
                      className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-500/50 outline-none w-32" />
                  </div>
                </div>
              </div>
              
              <div className="max-h-[320px] overflow-y-auto rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-5 space-y-8 custom-scrollbar">
                {Object.entries(grouped).length > 0 ? Object.entries(grouped).map(([fwName, ctrls]) => (
                  <div key={fwName} className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1 h-3 bg-brand-600 rounded-full" />
                      <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">{fwName}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ctrls.map(c => {
                        const isSelected = selectedControlIds.includes(c.id);
                        return (
                          <label key={c.id}
                            className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-all border group relative overflow-hidden select-none ${
                              isSelected 
                                ? 'bg-brand-50/50 dark:bg-brand-900/20 border-brand-400 dark:border-brand-600 shadow-md ring-1 ring-brand-500/20' 
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-sm'
                            }`}>
                            <input 
                              type="checkbox" 
                              className="sr-only" 
                              checked={isSelected}
                              onChange={() => toggleControl(c.id)} 
                            />
                            {isSelected && <div className="absolute top-0 right-0 p-1.5"><div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" /></div>}
                            <div className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                              isSelected ? 'bg-brand-600 border-brand-600 scale-110' : 'bg-transparent border-slate-300 dark:border-slate-600 group-hover:border-brand-500'
                            }`}>
                              {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isSelected ? 'text-brand-700 dark:text-brand-400' : 'text-slate-400'}`}>{c.control_code}</p>
                              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed">{c.title}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 flex flex-col items-center">
                    <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                       <Search className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest">No matching controls found</p>
                    <button onClick={() => setControlSearch('')} className="mt-2 text-[10px] font-black text-brand-600 uppercase hover:underline">Clear Search</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex justify-end gap-4 relative z-10">
          <button onClick={onClose}
            className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all">
            Discard Changes
          </button>
          <button onClick={handleSubmit} disabled={saving} 
            className="px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-brand-600 hover:bg-brand-700 text-white shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)] hover:shadow-brand-600/50 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Synchronizing...</>
            ) : isEdit ? 'Update Protocol' : 'Deploy Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Policies Page ──────────────────────────── */
export default function Policies() {
  const { role } = useAuth();
  const { departmentId } = useParams();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [allControls, setAllControls] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), []);
  const [expandedId, setExpandedId] = useState(null);
  const [sortBy, setSortBy] = useState('a-z');
  const [perPage, setPerPage] = useState(5);       // inner policy list default
  const [deptPerPage, setDeptPerPage] = useState(6); // outer dept list: 6/12/18/24
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isPerPageOpen, setIsPerPageOpen] = useState(false);
  const [isDeptPerPageOpen, setIsDeptPerPageOpen] = useState(false);
  // Department CRUD
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptName, setDeptName] = useState('');
  const [initialDeptId, setInitialDeptId] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const policyUrl = departmentId ? `policies/?page_size=200&department_id=${departmentId}` : 'policies/?page_size=200';
    Promise.all([
      API.get(policyUrl),
      API.get('controls/?page_size=200'),
      API.get('departments/?page_size=100'),
    ])
      .then(([polRes, ctrlRes, deptRes]) => {
        setPolicies(polRes.data.results || polRes.data);
        setAllControls(ctrlRes.data.results || ctrlRes.data);
        setDepartments(deptRes.data.results || deptRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [departmentId]);

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

  const openCreate = useCallback((preDeptId) => {
    setEditingPolicy(null);
    setShowModal(true);
    // Pass pre-selected dept to modal via a ref trick — handled via initialDeptId state
    setInitialDeptId(preDeptId || null);
  }, []);

  const handleDelete = useCallback(async (policy) => {
    if (!confirm(`Delete policy "${policy.title}"? This cannot be undone.`)) return;
    try {
      await API.delete(`policies/${policy.id}/`);
      fetchData();
      showToast(`Policy "${policy.title}" deleted successfully.`);
    } catch {
      showToast('Failed to delete policy.', 'error');
      logFailure(`Failed to delete policy '${policy.title}'`, 'Policy');
    }
  }, [fetchData, showToast]);

  const handleStatusChange = useCallback(async (policy, newStatus) => {
    try {
      await API.patch(`policies/${policy.id}/`, { status: newStatus });
      fetchData();
      showToast(`Status updated to "${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}"`);
    } catch {
      showToast('Failed to update status.', 'error');
      logFailure(`Failed to update status for policy '${policy.title}'`, 'Policy');
    }
  }, [fetchData, showToast]);

  // Department-aware filtering
  const filteredDepts = useMemo(() => {
    if (!search) return departments;
    return departments.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  }, [departments, search]);

  const filtered = useMemo(() => {
    let result = policies.filter((p) =>
      (p.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase())
    );
    if (sortBy === 'a-z') result.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'z-a') result.sort((a, b) => b.title.localeCompare(a.title));
    else if (sortBy === 'latest') result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sortBy === 'oldest') result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return result;
  }, [policies, search, sortBy]);

  const deptTotalPages = useMemo(() => Math.ceil(filteredDepts.length / deptPerPage), [filteredDepts, deptPerPage]);
  const deptPaginated = useMemo(() => filteredDepts.slice((page - 1) * deptPerPage, page * deptPerPage), [filteredDepts, page, deptPerPage]);

  const totalPages = useMemo(() => Math.ceil(filtered.length / perPage), [filtered, perPage]);
  const paginated = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page, perPage]);

  const currentDeptName = departments.find(d => String(d.id) === String(departmentId))?.name || '';

  // Department CRUD
  const handleSaveDept = async () => {
    if (!deptName.trim()) return;
    try {
      if (editingDept) {
        await API.patch(`departments/${editingDept.id}/`, { name: deptName.trim() });
        showToast(`Department "${deptName}" updated.`);
      } else {
        await API.post('departments/', { name: deptName.trim() });
        showToast(`Department "${deptName}" created.`);
      }
      setShowDeptModal(false); setEditingDept(null); setDeptName('');
      fetchData();
    } catch {
      showToast('Failed to save department.', 'error');
      logFailure(`Failed to save department '${deptName}'`, 'Policy');
    }
  };

  const handleDeleteDept = async (dept) => {
    if (!confirm(`Delete department "${dept.name}"? Policies won't be deleted.`)) return;
    try {
      await API.delete(`departments/${dept.id}/`);
      showToast(`Department "${dept.name}" deleted.`);
      fetchData();
    } catch {
      showToast('Failed to delete department.', 'error');
      logFailure(`Failed to delete department '${dept.name}'`, 'Policy');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
      </div>
    );
  }

  // ── DEPARTMENT LIST VIEW (when no departmentId in URL) ──
  if (!departmentId) {
    return (
      <>
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Policy Manager</h1>
              <p className="text-slate-500 font-medium mt-1">Select a department to manage its policies.</p>
            </div>
            {role !== 'auditor' && (
              <button onClick={() => openCreate()} className="btn-primary">
                <Plus className="h-5 w-5" /> Add Policy
              </button>
            )}
          </div>

          <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full max-w-xl group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
              <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search departments..."
                className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none shadow-sm transition-all" />
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button onClick={() => setIsDeptPerPageOpen(!isDeptPerPageOpen)}
                  className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-3 rounded-2xl shadow-sm hover:border-brand-500 transition-all group">
                  <ListFilter className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Show</span>
                  <span className="text-xs font-black text-brand-600 dark:text-brand-400">{deptPerPage}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isDeptPerPageOpen ? 'rotate-180' : ''}`} />
                </button>
                {isDeptPerPageOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsDeptPerPageOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 w-32 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 py-2">
                      {[6, 12, 18, 24].map(v => (
                        <button key={v} onClick={() => { setDeptPerPage(v); setPage(1); setIsDeptPerPageOpen(false); }}
                          className={`w-full px-4 py-2.5 text-left text-xs font-black transition-colors ${deptPerPage === v ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                          {v} Depts
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deptPaginated.map(dept => (
              <div key={dept.id}
                onClick={() => navigate(`/policies/${dept.id}`)}
                className="cyber-card p-6 cursor-pointer group transition-all hover:translate-y-[-2px] hover:shadow-xl border border-transparent hover:border-brand-200 dark:hover:border-brand-800">
                <div className="flex items-center gap-4 mb-5">
                  <div className="p-3.5 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 shadow-sm group-hover:shadow-lg group-hover:scale-110 transition-all">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{dept.name}</h3>
                </div>
                <div className="flex items-center gap-6 text-sm font-black uppercase tracking-wide text-slate-500 mb-4">
                  <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {dept.policy_count || 0} Policies</span>
                  <span className="flex items-center gap-1.5"><Monitor className="w-4 h-4" /> {dept.agent_count || 0} PCs</span>
                </div>
                {role !== 'auditor' && (
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={(e) => { e.stopPropagation(); setEditingDept(dept); setDeptName(dept.name); setShowDeptModal(true); }}
                      className="p-2 rounded-xl border border-brand-100 text-brand-600 hover:bg-brand-50 dark:border-brand-900/30 transition-all"><Pencil className="h-4 w-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteDept(dept); }}
                      className="p-2 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 dark:border-red-900/30 transition-all"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {deptPaginated.length === 0 && (
            <div className="cyber-card py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No departments found.</div>
          )}

          {deptTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 mt-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="h-10 w-10 rounded-xl text-sm font-black text-slate-400 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-40 transition-all border border-transparent hover:border-slate-100">‹</button>
              {Array.from({ length: deptTotalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)}
                  className={`h-10 w-10 rounded-xl text-sm font-black transition-all ${n === page ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white'}`}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(deptTotalPages, p + 1))} disabled={page === deptTotalPages}
                className="h-10 w-10 rounded-xl text-sm font-black text-slate-400 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-40 transition-all border border-transparent hover:border-slate-100">›</button>
            </div>
          )}

          {/* Department Add/Edit Modal */}
          {showDeptModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
              <div className="w-full max-w-md rounded-[2rem] bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-8">
                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">{editingDept ? 'Edit Department' : 'Add Department'}</h2>
                <input type="text" value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="Department name"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none mb-6" />
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setShowDeptModal(false); setEditingDept(null); }}
                    className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:text-slate-900 transition-all">Cancel</button>
                  <button onClick={handleSaveDept}
                    className="px-8 py-3 rounded-2xl text-[10px] font-black uppercase bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-all">{editingDept ? 'Update' : 'Create'}</button>
                </div>
              </div>
            </div>
          )}

          {/* Policy Modal — available in dept list view too */}
          <PolicyModal
            open={showModal}
            onClose={() => { setShowModal(false); setEditingPolicy(null); setInitialDeptId(null); }}
            onSaved={handleSaved}
            editingPolicy={editingPolicy}
            allControls={allControls}
            allDepartments={departments}
            initialDeptId={initialDeptId}
            onAddDept={(newDept) => setDepartments(prev => [...prev, newDept])}
          />
        </div>
      </>
    );
  }

  // ── INNER POLICY VIEW (when departmentId is present) ──

  return (
      <>
        <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 transition-all shadow-sm">
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>
              <div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{currentDeptName || 'Department'} Policies</h1>
                <p className="text-slate-500 font-medium mt-1">Manage policies assigned to this department.</p>
              </div>
          </div>
        </div>

      <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-xl group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search policies by name or ID..."
            className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none shadow-sm transition-all" />
        </div>
        
        <div className="flex items-center gap-3">
          {/* Items Per Page Dropdown */}
          <div className="relative">
            <button onClick={() => setIsPerPageOpen(!isPerPageOpen)} 
              className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-3 rounded-2xl shadow-sm hover:border-brand-500 transition-all group">
              <ListFilter className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Show</span>
              <span className="text-xs font-black text-brand-600 dark:text-brand-400 min-w-[20px]">{perPage}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-300 ${isPerPageOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isPerPageOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsPerPageOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-32 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {[5, 10, 15, 20, 25, 50].map(v => (
                    <button key={v} onClick={() => { setPerPage(v); setPage(1); setIsPerPageOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-xs font-black transition-colors flex items-center justify-between ${
                        perPage === v ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}>
                      {v} Items
                      {perPage === v && <div className="w-1.5 h-1.5 rounded-full bg-brand-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-3 rounded-2xl shadow-sm hover:border-brand-500 transition-all group">
              <ArrowUpDown className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
              <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                {sortBy === 'latest' ? 'Latest' : sortBy === 'oldest' ? 'Oldest' : sortBy === 'a-z' ? 'A-Z' : 'Z-A'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsSortOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-44 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-30 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {[
                    { val: 'a-z', lab: 'Name (A-Z)' },
                    { val: 'z-a', lab: 'Name (Z-A)' },
                    { val: 'latest', lab: 'Latest First' },
                    { val: 'oldest', lab: 'Oldest First' }
                  ].map(item => (
                    <button key={item.val} onClick={() => { setSortBy(item.val); setIsSortOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-tight transition-colors flex items-center justify-between ${
                        sortBy === item.val ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}>
                      {item.lab}
                      {sortBy === item.val && <div className="w-1.5 h-1.5 rounded-full bg-brand-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
                        <span key={c.id} className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-brand-50 dark:bg-slate-900/80 text-brand-700 dark:text-white border border-brand-100 dark:border-sky-500/20 shadow-sm transition-all">
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
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(p); }} className="p-2.5 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 dark:border-red-900/30 dark:text-red-500 dark:hover:bg-red-900/30 transition-all shadow-sm" title="Delete Policy">
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
                              <span className="text-[9px] font-black text-brand-700 dark:text-white bg-brand-50 dark:bg-slate-900/80 px-2 py-1 rounded-lg mb-3 inline-block uppercase tracking-widest border border-brand-100 dark:border-sky-500/20 shadow-sm">
                                {c.control_code}
                              </span>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed mb-4">{c.title}</p>
                            </div>
                            <div className="pt-4 border-t border-slate-50 dark:border-slate-900">
                              {c.wazuh_mappings?.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {c.wazuh_mappings.map(m => (
                                    <span key={m.id} className="text-[9px] font-black px-2 py-1 rounded-lg bg-brand-50 dark:bg-slate-900/80 text-brand-700 dark:text-white border border-brand-100 dark:border-sky-500/20 shadow-sm flex items-center gap-1.5 transition-all" title={m.rule_description}>
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
        <div className="flex items-center justify-center gap-2 py-4 mt-2">
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
        onClose={() => { setShowModal(false); setEditingPolicy(null); setInitialDeptId(null); }}
        onSaved={handleSaved}
        editingPolicy={editingPolicy}
        allControls={allControls}
        allDepartments={departments}
        initialDeptId={initialDeptId}
        onAddDept={(newDept) => setDepartments(prev => [...prev, newDept])}
      />
    </div>
    </>
  );
}

