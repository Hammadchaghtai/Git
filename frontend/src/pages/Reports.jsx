import { useEffect, useState } from 'react';
import API from '../api/axios';
import { CheckCircle, AlertCircle, Info, Download, Loader2 } from 'lucide-react';

const STATUS_STYLES = {
  Success: { icon: CheckCircle, bg: 'bg-emerald-50', text: 'text-emerald-700', iconColor: 'text-emerald-500' },
  Alert:   { icon: AlertCircle, bg: 'bg-red-50', text: 'text-red-700', iconColor: 'text-red-500' },
  System:  { icon: Info, bg: 'bg-sky-50', text: 'text-sky-700', iconColor: 'text-sky-500' },
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
      if (fws.length) setSelectedFw(fws[0].name);
    }).catch(() => {});

    API.get('audit-logs/?page_size=50')
      .then((res) => setAuditLogs(res.data.results || res.data))
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }, []);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      // Dynamically import jspdf to keep initial bundle small
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      // Fetch dashboard data
      const { data } = await API.get('dashboard-summary/');

      const doc = new jsPDF();
      const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // ── Header ──
      doc.setFillColor(15, 23, 42); // #0f172a
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(56, 189, 248); // #38bdf8
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('GRC Compliance Report', 14, 17);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${now}  |  Framework: ${selectedFw || 'All'}`, 14, 27);

      // ── Score Summary ──
      let y = 45;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Executive Summary', 14, y);
      y += 10;

      const score = data.overall_compliance_score || 0;
      const status = data.status || 'No Data';
      const threshold = data.passing_threshold || 80;
      const agents = data.total_agents_scanned || 0;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Overall Compliance Score:  ${score}%`, 14, y); y += 7;
      doc.text(`System Status:  ${status}`, 14, y); y += 7;
      doc.text(`Passing Threshold:  ${threshold}%`, 14, y); y += 7;
      doc.text(`Agents Scanned:  ${agents}`, 14, y); y += 12;

      // ── Framework Breakdown ──
      if (data.framework_scores?.length) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Framework Compliance Breakdown', 14, y);
        y += 3;

        doc.autoTable({
          startY: y,
          head: [['Framework', 'Checks', 'Passed', 'Score (%)']],
          body: data.framework_scores.map((fw) => [
            fw.framework_name,
            fw.total_checks,
            fw.passed_checks,
            `${fw.score}%`,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [56, 189, 248] },
          styles: { fontSize: 9 },
        });
        y = doc.lastAutoTable.finalY + 12;
      }

      // ── Failed Controls ──
      if (data.top_failed_controls?.length) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Top Failed Controls', 14, y);
        y += 3;

        doc.autoTable({
          startY: y,
          head: [['Control Code', 'Title', 'Framework', 'Failures']],
          body: data.top_failed_controls.map((c) => [
            c.control_code,
            c.control_title,
            c.framework_name,
            c.fail_count,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255] },
          styles: { fontSize: 9 },
        });
      }

      // ── Footer ──
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`GRC Compliance Platform  ·  Page ${i} of ${pageCount}`, 14, 290);
      }

      doc.save(`GRC_Compliance_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
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

      // ── Header ──
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(56, 189, 248);
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Audit Trail Report', 14, 17);
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${now}  |  Total Entries: ${auditLogs.length}`, 14, 27);

      // ── Summary ──
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
        headStyles: { fillColor: [15, 23, 42], textColor: [56, 189, 248], fontSize: 9 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 62 },
          2: { cellWidth: 28 },
          3: { cellWidth: 22 },
          4: { cellWidth: 40 },
        },
      });

      // ── Footer ──
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
      alert('Failed to generate Audit PDF. Please try again.');
    } finally {
      setGeneratingAudit(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#0f172a]">Reports & Audit</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left — Report Generator */}
        <div className="lg:col-span-2 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-[#0f172a]">Generate Compliance Report</h3>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Select Framework</label>
            <select value={selectedFw} onChange={(e) => setSelectedFw(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-[#38bdf8] focus:outline-none cursor-pointer">
              {frameworks.map((fw) => (
                <option key={fw.id} value={fw.name}>{fw.name} v{fw.version}</option>
              ))}
            </select>
          </div>

          <button onClick={handleDownload} disabled={generating}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f172a] py-3 text-sm font-semibold text-white hover:bg-[#1e293b] cursor-pointer disabled:opacity-60">
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating PDF...</>
            ) : (
              <><Download className="h-4 w-4" /> Download PDF Report</>
            )}
          </button>

          <button onClick={handleDownloadAudit} disabled={generatingAudit || auditLogs.length === 0}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[#0f172a] py-3 text-sm font-semibold text-[#0f172a] hover:bg-[#0f172a] hover:text-white cursor-pointer disabled:opacity-60 transition-colors">
            {generatingAudit ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating PDF...</>
            ) : (
              <><Download className="h-4 w-4" /> Download Audit Log (PDF)</>
            )}
          </button>
        </div>

        {/* Right — Audit Trail */}
        <div className="lg:col-span-3 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-[#0f172a]">Audit Trail</h3>

          {loadingLogs ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#38bdf8]" />
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="py-10 text-center text-gray-400">No audit log entries found.</p>
          ) : (
            <div className="space-y-0">
              {auditLogs.map((log) => {
                const style = STATUS_STYLES[log.status] || STATUS_STYLES.System;
                const StatusIcon = style.icon;
                return (
                  <div key={log.id} className="flex items-start gap-3 border-b border-gray-50 py-3 last:border-0">
                    <StatusIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${style.iconColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">{log.user || 'System'}</span> {log.action}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(log.timestamp).toLocaleString()}
                        <span className="ml-2 text-gray-300">·</span>
                        <span className="ml-2">{log.module}</span>
                      </p>
                    </div>
                    <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${style.bg} ${style.text}`}>
                      {log.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
