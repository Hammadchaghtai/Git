import { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Search, PlayCircle, CheckCircle, XCircle, ShieldCheck,
  Laptop, UserCheck, Bug, Sliders, EyeOff, CloudUpload, Router, Key,
  Zap, Info, ArrowRight, ShieldAlert, Activity, RefreshCw
} from 'lucide-react';

/* icon lookup by control code prefix */
const ICON_MAP = {
  'A.8.1': Laptop, 'A.8.19': Laptop,
  'A.8.2': UserCheck, 'A.8.3': UserCheck, 'A.8.4': UserCheck, 'A.8.5': UserCheck,
  'A.8.7': Bug,
  'A.8.9': Sliders, 'A.8.6': Sliders,
  'A.8.12': EyeOff, 'A.8.10': EyeOff,
  'A.8.13': CloudUpload, 'A.8.14': CloudUpload,
  'A.8.20': Router, 'A.8.21': Router, 'A.8.22': Router,
  'A.8.24': Key,
};

function getIcon(code) {
  for (const [prefix, Icon] of Object.entries(ICON_MAP)) {
    if (code && code.startsWith(prefix)) return Icon;
  }
  return ShieldCheck;
}

export default function ComplianceChecks() {
  const { role } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState('');
  const [scanMsg, setScanMsg] = useState('');

  const fetchResults = () => {
    API.get('scan-results/?page_size=100')
      .then((res) => setResults(res.data.results || res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchResults(); }, []);

  const runManualScan = async () => {
    setScanning(true);
    setScanMsg('');
    try {
      const res = await API.post('run-scan/');
      setScanMsg(res.data.message || 'Scan completed successfully!');
      fetchResults();
    } catch (err) {
      setScanMsg('Scan failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
      </div>
    );
  }

  const filtered = results.filter((r) => {
    const text = `${r.control_code} ${r.control_title} ${r.rule_description} ${r.wazuh_rule_id}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Technical Audits</h1>
          <p className="text-slate-500 font-medium mt-1">Real-time validation of technical controls via Wazuh agent telemetry.</p>
        </div>
        {role !== 'auditor' && (
          <button onClick={runManualScan} disabled={scanning}
            className="btn-primary flex items-center gap-2 shadow-xl shadow-brand-600/20">
            {scanning ? (
              <><RefreshCw className="h-5 w-5 animate-spin" /> DISPATCHING AUDIT...</>
            ) : (
              <><PlayCircle className="h-5 w-5" /> INITIATE FULL SCAN</>
            )}
          </button>
        )}
      </div>

      {scanMsg && (
        <div className={`mb-8 rounded-2xl p-5 flex items-center gap-4 animate-in slide-in-from-top-4 duration-500 border shadow-sm ${
          scanMsg.includes('failed') ? 'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400'
        }`}>
          {scanMsg.includes('failed') ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          <p className="text-sm font-black uppercase tracking-widest">{scanMsg}</p>
        </div>
      )}

      {/* Search Hub */}
      <div className="cyber-card p-2 mb-10 border-slate-200 shadow-xl shadow-slate-200/40">
        <div className="relative group">
          <Search className="absolute left-6 top-4.5 h-5 w-5 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by control code, rule ID, or technical keyword..."
            className="w-full pl-16 pr-8 py-4 bg-transparent text-slate-700 dark:text-slate-200 font-bold placeholder-slate-400 outline-none" />
        </div>
      </div>

      {/* Check Cards */}
      {filtered.length === 0 ? (
        <div className="cyber-card p-20 text-center">
           <Activity className="mx-auto h-16 w-16 text-slate-100 mb-6" />
           <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No telemetry records match your query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((r) => {
            const Icon = getIcon(r.control_code);
            return (
              <div key={r.id} className={`cyber-card group transition-all duration-300 hover:translate-x-1 ${!r.is_passed ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-emerald-500'}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-8 py-7">
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm flex-shrink-0 transition-transform group-hover:scale-105 ${!r.is_passed ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-500' : 'bg-brand-50 dark:bg-brand-900/20 text-brand-600'}`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                         <span className="font-mono text-[10px] font-black text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2.5 py-1 rounded-lg border border-brand-100 dark:border-brand-900/30">
                           {r.control_code}
                         </span>
                         <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                           {r.control_title || 'Untitled Check'}
                         </h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed max-w-2xl">
                        {r.rule_description || 'Technical validation logic for control requirement.'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 self-end lg:self-center pl-8 lg:border-l border-slate-100 dark:border-slate-800">
                    <div className="hidden xl:flex flex-col items-end">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Telemetry ID</span>
                       <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">RULE {r.wazuh_rule_id}</span>
                    </div>
                    {r.is_passed ? (
                      <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-black uppercase tracking-widest">Compliant</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 shadow-sm">
                        <XCircle className="h-4 w-4" />
                        <span className="text-xs font-black uppercase tracking-widest">Non-Compliant</span>
                      </div>
                    )}
                  </div>
                </div>

                {!r.is_passed && (
                  <div className="mx-8 mb-8 mt-2 p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <Info className="w-4 h-4 text-brand-600" /> Evidence Logs
                         </p>
                         <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                           Technical evaluation of telemetry rule "{r.wazuh_rule_id}" failed. The current configuration state at the endpoint deviates from the required security baseline for {r.control_code}.
                         </p>
                       </div>
                       {r.remediation && (
                         <div className="bg-brand-600 rounded-3xl p-7 shadow-xl shadow-brand-600/20 relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-4 opacity-10">
                             <Zap className="w-16 h-16 text-white" />
                           </div>
                           <p className="text-[10px] font-black text-brand-100 uppercase tracking-widest mb-3 flex items-center gap-2">
                             <Activity className="w-4 h-4" /> Remediation Blueprint
                           </p>
                           <p className="text-sm font-black text-white leading-relaxed italic">
                             "{r.remediation}"
                           </p>
                         </div>
                       )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
