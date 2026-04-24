import { useEffect, useState, Fragment } from 'react';
import API from '../api/axios';
import { ChevronDown, ChevronRight, ExternalLink, Shield, BookOpen, Layers, Zap, Info, Link as LinkIcon } from 'lucide-react';

export default function Frameworks() {
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFw, setExpandedFw] = useState(null);

  useEffect(() => {
    Promise.all([
      API.get('frameworks/'),
      API.get('controls/?page_size=200'),
    ])
      .then(([fwRes, ctrlRes]) => {
        setFrameworks(fwRes.data.results || fwRes.data);
        setControls(ctrlRes.data.results || ctrlRes.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id) => setExpandedFw(expandedFw === id ? null : id);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Compliance Frameworks</h1>
        <p className="text-slate-500 font-medium mt-1">Regulatory catalogs and security controls mapped to technical telemetry.</p>
      </div>

      {frameworks.length === 0 ? (
        <div className="cyber-card p-20 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-200 mb-4" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No frameworks cataloged in registry.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {frameworks.map((fw) => {
            const fwControls = controls.filter((c) => c.framework === fw.id);
            const isExpanded = expandedFw === fw.id;

            return (
              <div
                key={fw.id}
                className={`cyber-card transition-all duration-500 ${isExpanded ? 'ring-2 ring-brand-600/20 shadow-2xl shadow-brand-600/10' : ''}`}
              >
                {/* Framework Header */}
                <button
                  onClick={() => toggleExpand(fw.id)}
                  className="flex w-full items-center justify-between px-8 py-6 text-left cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all ${isExpanded ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'bg-brand-50 dark:bg-brand-900/20 text-brand-600'}`}>
                      <Shield className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{fw.name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mt-1 flex items-center gap-2">
                        <Layers className="w-3 h-3" /> Version {fw.version} · {fw.controls_count} Governance Controls
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <Zap className="h-3.5 w-3.5 text-brand-600" />
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        {fw.controls_count} ACTIVE
                      </span>
                    </div>
                    <div className={`p-2 rounded-full transition-all ${isExpanded ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                  </div>
                </button>

                {/* Controls List */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="px-8 pb-8 pt-6 space-y-3">
                      <div className="hidden md:flex items-center px-4 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span className="w-32">Control Code</span>
                        <span className="flex-1">Title & Objective</span>
                        <span className="w-48">Telemetry Integration</span>
                        <span className="w-24 text-right">Impact</span>
                        <span className="w-24 text-center">Docs</span>
                      </div>

                      {fwControls.length > 0 ? fwControls.map((ctrl) => (
                        <div key={ctrl.id} className="flex flex-col md:flex-row md:items-center px-6 py-4 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 transition-all shadow-sm hover:translate-x-1 hover:border-brand-100 dark:hover:border-brand-900/30">
                          <div className="w-32 flex-shrink-0 mb-2 md:mb-0">
                            <span className="font-mono text-xs font-black text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded">
                              {ctrl.control_code}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0 pr-4 mb-2 md:mb-0">
                            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm leading-relaxed">{ctrl.title}</p>
                          </div>

                          <div className="w-48 flex-shrink-0 mb-2 md:mb-0">
                            {ctrl.wazuh_mappings?.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {ctrl.wazuh_mappings.map(m => (
                                  <span key={m.id} className="inline-flex items-center gap-1.5 text-[9px] font-black px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 transition-all hover:border-brand-600/50 cursor-help" title={m.rule_description}>
                                    <LinkIcon className="w-3 h-3 text-brand-600" /> {m.wazuh_rule_id}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <Info className="w-3 h-3" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Manual Verification</span>
                              </div>
                            )}
                          </div>

                          <div className="w-24 flex-shrink-0 text-right mb-2 md:mb-0">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg border ${ctrl.weight >= 10 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800'}`}>
                              W: {ctrl.weight}
                            </span>
                          </div>

                          <div className="w-24 flex-shrink-0 flex justify-center">
                            <a href="https://google.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        </div>
                      )) : (
                        <div className="py-12 text-center bg-white dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                           <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No controls registered for this framework.</p>
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
