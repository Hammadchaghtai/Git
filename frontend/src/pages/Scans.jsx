import React, { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import API from '../api/axios';
import { CheckCircle, XCircle, Clock, Search, ChevronDown, ChevronRight, AlertTriangle, Calendar, Activity, ShieldCheck, ShieldAlert, Zap, Info } from 'lucide-react';
import Toast from '../components/Toast';

export default function Scans() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedAgentId, setExpandedAgentId] = useState(null);
  const [selectedScanIndex, setSelectedScanIndex] = useState({});   // { agentId: index }
  const [expandedFailures, setExpandedFailures] = useState({});

  const fetchScans = useCallback(() => {
    setLoading(true);
    API.get('scans/')
      .then((res) => setScans(res.data.results || res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchScans(); }, [fetchScans]);

  /* Group scans by agent ID */
  const groupedByAgent = useMemo(() => {
    const groups = {};
    scans.forEach((scan) => {
      const key = scan.agent_id || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(scan);
    });
    // Sort each agent's scans by date descending (newest first)
    Object.values(groups).forEach((arr) =>
      arr.sort((a, b) => new Date(b.scan_date) - new Date(a.scan_date))
    );
    return groups;
  }, [scans]);

  /* Filter agents by search */
  const filteredAgents = useMemo(() => {
    if (!search.trim()) return Object.entries(groupedByAgent);
    const q = search.toLowerCase();
    return Object.entries(groupedByAgent).filter(([agentId, agentScans]) => {
      if (`agent ${agentId}`.includes(q)) return true;
      return agentScans.some((scan) =>
        scan.results?.some((r) =>
          `${r.control_code} ${r.rule_description} ${r.wazuh_rule_id} ${r.framework_name}`.toLowerCase().includes(q)
        )
      );
    });
  }, [groupedByAgent, search]);

  const toggleFailure = useCallback((resultId) => {
    setExpandedFailures((prev) => ({ ...prev, [resultId]: !prev[resultId] }));
  }, []);

  const handleToggleAgent = useCallback((agentId) => {
    setExpandedAgentId((prev) => prev === agentId ? null : agentId);
    setExpandedFailures({});
  }, []);

  const handleScanSelect = useCallback((agentId, index) => {
    setSelectedScanIndex((prev) => ({ ...prev, [agentId]: index }));
    setExpandedFailures({});
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Security Telemetry</h1>
          <p className="text-slate-500 font-medium mt-1">Real-time compliance scan results ingested from Wazuh SIEM agents.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border border-brand-100 dark:border-brand-800">
           <Activity className="w-4 h-4" />
           <span className="text-xs font-black uppercase tracking-widest">System Active</span>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-8 cyber-card p-2">
        <div className="flex items-center gap-3 px-4 py-2">
          <Search className="h-5 w-5 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by agent ID, control code, vulnerability ID, or framework..."
            className="w-full text-sm font-semibold text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none bg-transparent" />
        </div>
      </div>

      {filteredAgents.length === 0 ? (
        <div className="cyber-card p-20 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 mb-6">
             <AlertTriangle className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">No telemetry data found</h3>
          <p className="text-slate-400 max-w-sm mx-auto font-medium">Initialize a scan from the Dashboard to begin ingesting compliance data from your Wazuh infrastructure.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAgents.map(([agentId, agentScans]) => {
            const latest = agentScans[0];
            const isExpanded = expandedAgentId === agentId;
            const activeIndex = selectedScanIndex[agentId] || 0;
            const activeScan = agentScans[activeIndex] || latest;

            return (
              <div key={agentId} className={`cyber-card transition-all duration-500 ${isExpanded ? 'ring-2 ring-brand-600/20' : ''}`}>
                {/* Agent Header */}
                <button
                  onClick={() => handleToggleAgent(agentId)}
                  className="flex w-full items-center justify-between px-8 py-6 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-6">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${isExpanded ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30 rotate-3' : 'bg-brand-50 dark:bg-brand-900/20 text-brand-600'}`}>
                      <Zap className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Agent {agentId}</p>
                      <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-tighter mt-1">
                        <Clock className="w-3 h-3" />
                        {agentScans.length} historical scans · Latest: {new Date(latest.scan_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right hidden sm:block">
                      <div className="flex items-center justify-end gap-3 mb-1">
                         <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Confidence Score</span>
                         <span className={`text-2xl font-black tracking-tighter ${latest.overall_score >= 70 ? 'text-brand-600' : 'text-amber-500'}`}>
                           {latest.overall_score}%
                         </span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                         <ShieldCheck className="w-3 h-3 text-emerald-500" />
                         <p className="text-xs font-bold text-slate-500">{latest.passed_checks}/{latest.total_checks} Checks Passed</p>
                      </div>
                    </div>
                    <div className={`p-2 rounded-full transition-all ${isExpanded ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                       {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                  </div>
                </button>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-500">

                    {/* ── Scan History Selector ── */}
                    {agentScans.length > 1 && (
                      <div className="px-8 pt-8 pb-4">
                        <div className="flex flex-col gap-4">
                          <span className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">
                            <Calendar className="h-4 w-4 text-brand-600" /> Assessment History Registry
                          </span>
                          <div className="flex gap-2 flex-wrap pb-4">
                            {agentScans.map((scan, idx) => (
                              <button
                                key={scan.id}
                                onClick={() => handleScanSelect(agentId, idx)}
                                className={`rounded-xl px-4 py-3 transition-all cursor-pointer border ${
                                  idx === activeIndex
                                    ? 'bg-brand-600 text-white border-brand-600 shadow-xl shadow-brand-600/30'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-brand-600/50'
                                }`}
                              >
                                <div className="flex flex-col items-start gap-1">
                                   <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">
                                      {new Date(scan.scan_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                   </span>
                                   <span className={`text-sm font-black ${idx === activeIndex ? 'text-white' : scan.overall_score >= 70 ? 'text-brand-600' : 'text-amber-500'}`}>
                                     {scan.overall_score}% COMPLIANT
                                   </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Active Scan Details ── */}
                    {activeScan.results && activeScan.results.length > 0 ? (
                      <div className="px-8 py-6">
                        {/* Scan info banner */}
                        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-950 px-4 py-2 border border-slate-100 dark:border-slate-800 shadow-sm">
                               <ShieldCheck className="h-4 w-4 text-emerald-500" />
                               <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{activeScan.results.filter((r) => r.is_passed).length} Validated</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-slate-950 px-4 py-2 border border-slate-100 dark:border-slate-800 shadow-sm">
                               <ShieldAlert className="h-4 w-4 text-rose-500" />
                               <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">{activeScan.results.filter((r) => !r.is_passed).length} Discrepancies</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Execution Timestamp</p>
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{new Date(activeScan.scan_date).toLocaleString()}</p>
                             </div>
                             <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block"></div>
                             <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Final Score</p>
                                <p className="text-xs font-black text-brand-600">{activeScan.overall_score}%</p>
                             </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="hidden md:flex items-center px-4 mb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                            <span className="w-48">Security Status</span>
                            <span className="w-32">Registry ID</span>
                            <span className="flex-1">Discrepancy Detail</span>
                            <span className="w-40">Mapped Control</span>
                            <span className="w-32 text-right">Framework</span>
                          </div>

                          {activeScan.results.map((r) => (
                            <div key={r.id} className="flex flex-col">
                              <div 
                                onClick={() => !r.is_passed && toggleFailure(r.id)}
                                className={`flex flex-col md:flex-row md:items-center px-6 py-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 transition-all shadow-sm ${!r.is_passed ? 'cursor-pointer hover:border-brand-100 dark:hover:border-brand-900/30' : ''}`}
                              >
                                <div className="w-48 flex-shrink-0 mb-2 md:mb-0">
                                  {r.is_passed ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                                      <ShieldCheck className="h-3.5 w-3.5" /> SECURE
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                       <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest">
                                         <ShieldAlert className="h-3.5 w-3.5" /> VULNERABLE
                                       </span>
                                       <ChevronDown className={`h-4 w-4 text-slate-300 transition-transform ${expandedFailures[r.id] ? 'rotate-180' : ''}`} />
                                    </div>
                                  )}
                                </div>

                                <div className="w-32 flex-shrink-0 mb-2 md:mb-0">
                                   <span className="font-mono text-[10px] font-black text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded">
                                      {r.wazuh_rule_id}
                                   </span>
                                </div>

                                <div className="flex-1 min-w-0 pr-4 mb-2 md:mb-0">
                                   <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed truncate md:whitespace-normal md:line-clamp-1">
                                      {r.rule_description}
                                   </p>
                                </div>

                                <div className="w-40 flex-shrink-0 mb-2 md:mb-0">
                                   <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                      {r.control_code}
                                   </span>
                                </div>

                                <div className="w-32 flex-shrink-0 text-right">
                                  <span className="text-[9px] font-black uppercase text-brand-600 dark:text-brand-400 tracking-widest bg-brand-50/50 dark:bg-brand-900/10 px-2 py-0.5 rounded-lg border border-brand-100 dark:border-brand-900/20">
                                    {r.framework_name}
                                  </span>
                                </div>
                              </div>

                              {/* Expanded evidence for failed checks */}
                              {!r.is_passed && expandedFailures[r.id] && (
                                <div className="mx-4 bg-slate-50 dark:bg-slate-900/30 rounded-b-3xl border-x border-b border-slate-100 dark:border-slate-800 p-8 mb-4 animate-in slide-in-from-top-4 duration-500">
                                  <div className="flex items-center gap-2.5 mb-6">
                                     <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/30">
                                        <Info className="w-3.5 h-3.5" />
                                     </div>
                                     <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Remediation Blueprint & Evidence</h4>
                                  </div>
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                     <div className="space-y-4">
                                        <div>
                                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Technical Observation</p>
                                           <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">{r.rule_description || 'Compliance rule violation detected at endpoint.'}</p>
                                        </div>
                                        <div>
                                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Governance Alignment</p>
                                           <div className="flex items-center gap-3 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                              <ShieldCheck className="w-4 h-4 text-brand-600" />
                                              <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                 {r.control_code} <span className="text-slate-400 mx-2">|</span> {r.control_title || 'Governance Control Requirement'}
                                              </p>
                                           </div>
                                        </div>
                                     </div>
                                     {r.remediation && (
                                        <div className="bg-brand-600 rounded-2xl p-6 shadow-xl shadow-brand-600/20 relative overflow-hidden group">
                                           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                              <Zap className="w-16 h-16 text-white" />
                                           </div>
                                           <p className="text-[10px] font-black text-brand-100 uppercase tracking-widest mb-3 flex items-center gap-2">
                                              <Activity className="w-3.5 h-3.5" /> Remediation Strategy
                                           </p>
                                           <p className="text-sm font-black text-white leading-relaxed">
                                              "{r.remediation}"
                                           </p>
                                        </div>
                                     )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="px-8 py-16 text-center">
                        <AlertTriangle className="mx-auto h-12 w-12 text-slate-200 mb-4" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No granular evidence records available.</p>
                      </div>
                    )}
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
