import { useEffect, useState, useMemo } from 'react';
import API from '../api/axios';
import { 
  Shield, BookOpen, Layers, Zap, Info, Link as LinkIcon, 
  ChevronDown, Activity, LayoutGrid, X, FileText, CheckCircle2
} from 'lucide-react';
import { logFailure } from '../utils/logFailure';

export default function Frameworks() {
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedFw, setExpandedFw] = useState(null);
  const [filterMode, setFilterMode] = useState('all');
  const [selectedControl, setSelectedControl] = useState(null);

  const fetchData = () => {
    Promise.all([
      API.get('frameworks/'),
      API.get('controls/?page_size=500'),
      API.get('dashboard-summary/'),
      API.get('scan-results/?page_size=1000'),
    ])
      .then(([fwRes, ctrlRes, dashRes, scanRes]) => {
        setFrameworks(fwRes.data.results || fwRes.data);
        setControls(ctrlRes.data.results || ctrlRes.data);
        
        // Map scores by framework ID
        const scoreMap = {};
        if (dashRes.data.framework_scores) {
          dashRes.data.framework_scores.forEach(fs => {
            scoreMap[fs.framework_id] = fs.score;
          });
        }
        setScores(scoreMap);

        // 1. Map top_failed_controls for FAIL status
        const statusMap = {};
        if (dashRes.data.top_failed_controls) {
          dashRes.data.top_failed_controls.forEach(fc => {
            const key = `${fc.control_code}-${fc.framework_name}`.toLowerCase().trim();
            statusMap[key] = 'FAIL';
          });
        }

        // 2. Map actual scan results to distinguish between PASS and PENDING
        const results = scanRes.data.results || scanRes.data;
        results.forEach(res => {
          const key = `${res.control_code}-${res.framework_name}`.toLowerCase().trim();
          if (statusMap[key] !== 'FAIL' && res.is_passed) {
            statusMap[key] = 'PASS';
          }
        });
        setControlStatuses(statusMap);
      })
      .catch((err) => {
        console.error(err);
        logFailure('Failed to fetch framework data', 'System');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Auto-refresh every 30 seconds to keep in sync with Dashboard scans
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const [controlStatuses, setControlStatuses] = useState({});

  const toggleExpand = (id) => setExpandedFw(expandedFw === id ? null : id);

  const getStatusBadge = (ctrl, fwName) => {
    if (!ctrl.wazuh_mappings?.length) {
      return { label: 'MANUAL', class: 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700' };
    }
    
    const key = `${ctrl.control_code}-${fwName}`.toLowerCase().trim();
    const status = controlStatuses[key];
    
    if (status === 'FAIL') {
      return { label: 'FAIL', class: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' };
    }
    if (status === 'PASS') {
      return { label: 'PASS', class: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' };
    }
    
    // If it has mapping but no explicit pass/fail in the latest data, it's PENDING
    return { label: 'PENDING', class: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' };
  };

  const getImpactData = (weight) => {
    const w = parseInt(weight || 0);
    if (w >= 7) return { label: 'CRITICAL', class: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400' };
    if (w >= 4) return { label: 'HIGH', class: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400' };
    return { label: 'MEDIUM', class: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400' };
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-brand-600" />
          <Shield className="absolute inset-0 m-auto h-5 w-5 text-brand-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Section - Scaled Down */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-600 mb-0.5 block">Compliance Registry</span>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Frameworks</h1>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl leading-relaxed text-sm">
            Regulatory catalogs and security controls mapped to automated technical telemetry.
          </p>
        </div>

        <div className="flex items-center gap-4">
           <div className="px-5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center min-w-[130px]">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Registries</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">{frameworks.length}</span>
           </div>
           <div className="px-5 py-2.5 rounded-2xl bg-slate-900 dark:bg-brand-600 shadow-lg shadow-brand-600/20 flex flex-col items-center min-w-[130px]">
              <span className="text-[8px] font-black text-slate-400 dark:text-brand-100 uppercase tracking-widest mb-0.5">Controls</span>
              <span className="text-xl font-black text-white">{controls.length}</span>
           </div>
        </div>
      </div>

      <div className="space-y-5">
        {frameworks.map((fw) => {
          const isExpanded = expandedFw === fw.id;
          const fwControls = controls.filter((c) => c.framework === fw.id);
          
          // Get Real Compliance Score from dashboard data
          // Get Real Compliance Score from dashboard data - mapped by ID
          const percentage = scores[fw.id] !== undefined ? scores[fw.id] : 0;
          
          const filteredControls = filterMode === 'automated' 
            ? fwControls.filter(c => c.wazuh_mappings?.length > 0)
            : fwControls;

          return (
            <div key={fw.id} className={`cyber-card overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-brand-600/10' : ''}`}>
              {/* Card Header - Compact */}
              <div 
                onClick={() => toggleExpand(fw.id)}
                className={`px-6 py-5 flex items-center justify-between cursor-pointer transition-all ${isExpanded ? 'bg-slate-50/50 dark:bg-slate-900/40' : 'hover:bg-slate-50/30 dark:hover:bg-slate-800/20'}`}
              >
                <div className="flex items-center gap-5">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${isExpanded ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Shield className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">{fw.name}</h3>
                      <span className="px-2 py-0.5 rounded-lg text-[8px] font-black bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 uppercase tracking-widest shadow-sm">V{fw.version || '2022'}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{fw.controls_count} Governance Controls</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active Verification</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="hidden md:flex flex-col items-end gap-1 min-w-[200px]">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Compliance Health</span>
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shadow-inner">
                            <div 
                              className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-1000 ease-out" 
                              style={{ width: `${percentage}%` }} 
                            />
                        </div>
                        <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 tracking-tighter whitespace-nowrap">{percentage}% Compliant</span>
                      </div>
                  </div>
                  <div className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-brand-600 text-white rotate-180 shadow-lg shadow-brand-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <ChevronDown className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Expanded Content - Scaled Down */}
              {isExpanded && (
                <div className="p-6 pt-2 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-4 duration-500">
                  {/* Detailed Table Header - Medium Aligned */}
                  <div className="flex items-center gap-7 px-8 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 dark:border-slate-800 pb-3">
                    <div className="w-24 flex-shrink-0 pl-4">Code</div>
                    <div className="flex-1">Requirement & Objective</div>
                    <div className="w-56 text-center">Telemetry Mapping</div>
                    <div className="w-32 text-center">Live Status</div>
                    <div className="w-24 text-right">Details</div>
                  </div>

                  {/* List - Medium structure */}
                  <div className="space-y-3 max-h-[550px] overflow-y-auto pr-3 custom-scrollbar">
                    {filteredControls.length > 0 ? filteredControls.map((ctrl, idx) => {
                      const status = getStatusBadge(ctrl, fw.name);
                      return (
                        <div key={ctrl.id} className={`group flex items-center gap-7 px-8 py-4.5 rounded-[1.25rem] border transition-all ${
                          idx % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-900/20' : 'bg-white dark:bg-slate-900/40'
                        } border-slate-100 dark:border-slate-800 hover:border-brand-600/30 hover:shadow-md transition-all`}>
                          
                          <div className="w-24 flex-shrink-0">
                             <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 font-mono text-[11px] font-black border border-slate-200 dark:border-slate-700 group-hover:bg-brand-600 group-hover:text-white transition-all">
                                {ctrl.control_code}
                             </div>
                          </div>

                          <div className="flex-1">
                             <h5 className="text-[14px] font-black text-slate-800 dark:text-slate-100 group-hover:text-brand-600 transition-colors uppercase tracking-tight">{ctrl.title}</h5>
                             <div className="flex items-center gap-2">
                                <Activity className="w-3 h-3 text-slate-400" />
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Compliance Benchmark Mapping</p>
                             </div>
                          </div>

                          <div className="w-56 flex justify-center">
                             {ctrl.wazuh_mappings?.length > 0 ? (
                               <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                                  <div className={`w-1.5 h-1.5 rounded-full ${status.label === 'PASS' ? 'bg-emerald-500' : status.label === 'FAIL' ? 'bg-red-500' : 'bg-blue-500'} animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]`} />
                                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase font-mono">{ctrl.wazuh_mappings[0].wazuh_rule_id}</span>
                                  <Zap className="w-3.5 h-3.5 text-brand-500" />
                               </div>
                             ) : (
                               <div className="flex items-center gap-2 text-slate-300 dark:text-slate-700">
                                  <Info className="w-4 h-4" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Manual Audit</span>
                                </div>
                             )}
                          </div>

                          <div className="w-32 flex justify-center pl-6">
                             <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${status.class}`}>
                                {status.label}
                             </div>
                          </div>

                          <div className="w-24 flex justify-end">
                             <button 
                               onClick={() => setSelectedControl(ctrl)}
                               className="h-10 w-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-white hover:bg-brand-600 border border-slate-200 dark:border-slate-700 transition-all shadow-sm active:scale-95"
                             >
                                <FileText className="w-5 h-5" />
                             </button>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="py-16 text-center rounded-2xl border border-dashed border-slate-100 dark:border-slate-800">
                         <Activity className="w-8 h-8 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No matching control requirements found.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compact Control Detail Dialog */}
      {selectedControl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedControl(null)} />
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
               <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white shadow-xl shadow-brand-600/30">
                     <FileText className="w-7 h-7" />
                  </div>
                  <div>
                     <span className="text-[9px] font-black text-brand-600 uppercase tracking-[0.2em] mb-0.5 block">Requirement</span>
                     <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedControl.control_code}</h2>
                  </div>
               </div>
               <button onClick={() => setSelectedControl(null)} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-all">
                  <X className="w-6 h-6" />
               </button>
            </div>
            
            <div className="p-8 pt-6 space-y-6">
               <div>
                  <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Requirement Title</h3>
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight leading-tight">{selectedControl.title}</p>
               </div>
               
               <div>
                  <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Description & Guidance</h3>
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-inner">
                     <div className="space-y-4">
                        <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                           {selectedControl.description ||
                             `This control requirement (${selectedControl.control_code}) establishes essential governance benchmarks for organizational security posture. It mandates that technical implementations remain fully aligned with applicable regulatory standards through structured policy enforcement, continuous telemetric monitoring, and automated verification cycles.`}
                        </p>
                        <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                           Organizations must ensure documented evidence of compliance, periodic internal reviews, and remediation workflows for any detected deviations. Furthermore, this benchmark strictly dictates that access controls, configuration management, and vulnerability assessments must be executed systematically. 
                        </p>
                        <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                           Responsible personnel must be assigned for continuous oversight, and immutable audit trails must be maintained to support third-party assessments and regulatory inspections. Failure to comply with these stringent measures may expose the organization to significant operational risks and regulatory penalties.
                        </p>
                     </div>
                  </div>
               </div>

               <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                  <button onClick={() => setSelectedControl(null)} className="btn-primary px-12 py-3 text-[10px] font-black uppercase tracking-widest">Acknowledge</button>
               </div>
            </div>

          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
      `}} />
    </div>
  );
}
