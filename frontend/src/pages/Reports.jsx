import { useEffect, useState } from 'react';
import API from '../api/axios';
import { CheckCircle, AlertCircle, Info, Download, Loader2, FileText, Database, History, ShieldCheck, Activity, ChevronRight, Zap } from 'lucide-react';

const STATUS_STYLES = {
  Success: { icon: CheckCircle, bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', iconColor: 'text-emerald-500' },
  Alert:   { icon: AlertCircle, bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', iconColor: 'text-rose-500' },
  System:  { icon: Info, bg: 'bg-brand-50 dark:bg-brand-900/20', text: 'text-brand-600 dark:text-brand-400', iconColor: 'text-brand-500' },
};

export default function Reports() {
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFw, setSelectedFw] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingAudit, setGeneratingAudit] = useState(false);

  useEffect(() => {
    API.get('frameworks/').then((res) => {
      const fws = res.data.results || res.data;
      setFrameworks(fws);
      if (fws.length) setSelectedFw(fws[0].id);
    }).catch(() => {});

    API.get('audit-logs/?page_size=50')
      .then((res) => setAuditLogs(res.data.results || res.data))
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }, []);

  const handleDownload = async () => {
    if (!selectedFw) return;
    setGenerating(true);
    try {
      const response = await API.get(`generate-report/?framework_id=${selectedFw}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let fileName = `Compliance_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch && fileNameMatch.length === 2) {
          fileName = fileNameMatch[1];
        }
      }
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadAudit = async () => {
    setGeneratingAudit(true);
    try {
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      const doc = new jsPDF();
      const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(124, 58, 237);
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Audit Trail Report', 14, 17);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${now}  |  Total Entries: ${auditLogs.length}`, 14, 27);

      let y = 45;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Audit Log Entries', 14, y);
      y += 3;

      doc.autoTable({
        startY: y,
        head: [['User', 'Action', 'Module', 'Status', 'Timestamp']],
        body: auditLogs.map((log) => [
          log.user || 'System',
          log.action.length > 50 ? log.action.slice(0, 50) + '...' : log.action,
          log.module,
          log.status,
          new Date(log.timestamp).toLocaleString(),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: [124, 58, 237], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 62 }, 2: { cellWidth: 28 }, 3: { cellWidth: 22 }, 4: { cellWidth: 40 } },
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`GRC Compliance Platform  ·  Audit Trail  ·  Page ${i} of ${pageCount}`, 14, 290);
      }
      doc.save(`GRC_Audit_Trail_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Audit PDF generation failed:', err);
    } finally {
      setGeneratingAudit(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Intelligence & Audits</h1>
        <p className="text-slate-500 font-medium mt-1">Export executive compliance summaries and historical activity logs.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 items-start">
        {/* Left — Report Generator */}
        <div className="lg:col-span-2 cyber-card p-8 bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-950 dark:to-slate-900/30 overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
               <div className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-900/20 text-brand-600 shadow-sm">
                  <FileText className="w-6 h-6" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Compliance Summary</h3>
                  <p className="text-[10px] font-black uppercase text-brand-600 tracking-widest mt-0.5">PDF Export Engine</p>
               </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Target Framework Registry</label>
                <div className="relative group">
                  <Database className="absolute left-4 top-3.5 h-4 w-4 text-slate-300 group-focus-within:text-brand-600 transition-colors" />
                  <select value={selectedFw} onChange={(e) => setSelectedFw(e.target.value)}
                    className="input-field pl-12 cursor-pointer appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1em_1em]">
                    {frameworks.map((fw) => (
                      <option key={fw.id} value={fw.id}>{fw.name} Compliance Profile</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <button onClick={handleDownload} disabled={generating}
                  className="btn-primary w-full py-4 flex items-center justify-center gap-3 shadow-xl shadow-brand-600/20">
                  {generating ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> DISPATCHING...</>
                  ) : (
                    <><Download className="h-5 w-5" /> GENERATE EXECUTIVE PDF</>
                  )}
                </button>

                <button onClick={handleDownloadAudit} disabled={generatingAudit || auditLogs.length === 0}
                  className="w-full py-4 flex items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest text-xs hover:bg-slate-50 dark:hover:bg-slate-900 transition-all disabled:opacity-60">
                  {generatingAudit ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> DISPATCHING...</>
                  ) : (
                    <><ShieldCheck className="h-5 w-5" /> EXPORT FULL AUDIT TRAIL</>
                  )}
                </button>
              </div>
            </div>
            
            <div className="mt-10 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
               <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                    <Zap className="w-4 h-4 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">PRO TIP</p>
                    <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">PDF reports include top failed controls, agent-specific breakdowns, and threshold compliance status.</p>
                  </div>
               </div>
            </div>
          </div>
          <FileText className="absolute -right-6 -bottom-6 h-32 w-32 text-brand-600/5 rotate-12" />
        </div>

        {/* Right — Audit Trail */}
        <div className="lg:col-span-3 cyber-card bg-white dark:bg-slate-950 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <History className="w-5 h-5 text-slate-400" />
               <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">System Event Log</h3>
            </div>
            <div className="flex items-center gap-2">
               <Activity className="w-4 h-4 text-emerald-500" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Telemetry</span>
            </div>
          </div>

          <div className="p-2">
            {loadingLogs ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-brand-600" />
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Audit Registry...</p>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-20 text-center">
                <History className="mx-auto h-12 w-12 text-slate-100 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">No events logged in current session.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {auditLogs.map((log) => {
                  const style = STATUS_STYLES[log.status] || STATUS_STYLES.System;
                  const StatusIcon = style.icon;
                  return (
                    <div key={log.id} className="group flex items-start gap-4 p-5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                      <div className={`mt-1 p-2 rounded-xl ${style.bg} ${style.iconColor} shadow-sm group-hover:scale-110 transition-transform`}>
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                           <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                             <span className="text-brand-600 dark:text-brand-400 font-black">{log.user || 'System'}</span> {log.action}
                           </p>
                           <span className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${style.bg} ${style.text}`}>
                             {log.status}
                           </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                          <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                          <p className="text-[10px] font-black text-brand-600/60 dark:text-brand-400/60 uppercase tracking-widest">
                            {log.module}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors self-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
