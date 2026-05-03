import { useEffect, useState, useMemo } from 'react';
import API from '../api/axios';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle, AlertCircle, Download, Loader2, FileText, Database, 
  History, Activity, Calendar, Layout, User, ListFilter, ArrowUpDown, RefreshCw, XCircle,
  UserPlus, UserMinus, UserCheck, UserX, Lock, Trash2, Zap
} from 'lucide-react';
import { logFailure } from '../utils/logFailure';

const STATUS_STYLES = {
  success: { badge: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', icon: CheckCircle },
  alert:   { badge: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400', iconBg: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400', icon: AlertCircle },
  failed:  { badge: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400', iconBg: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400', icon: XCircle },
  system:  { badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', iconBg: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', icon: User },
};

export default function Reports() {
  const [frameworks, setFrameworks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedFw, setSelectedFw] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [isFwOpen, setIsFwOpen] = useState(false);
  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingAudit, setGeneratingAudit] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('latest');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [reportCount, setReportCount] = useState(0);
  const { role: userRole } = useAuth();

  useEffect(() => {
    // Load global report count from database
    API.get('settings/').then((res) => {
      setReportCount(res.data.total_reports_generated || 0);
    }).catch(() => {});

    API.get('frameworks/').then((res) => {
      const fws = res.data.results || res.data;
      setFrameworks(fws || []);
      // Default is already 'all'
    }).catch(() => {});

    API.get('departments/?page_size=100').then((res) => {
      setDepartments(res.data.results || res.data || []);
    }).catch(() => {});

    API.get('audit-logs/?page_size=50')
      .then((res) => setAuditLogs(res.data.results || res.data || []))
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }, []);

  const handleDownload = async () => {
    setGenerating(true);
    
    try {
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      // Fetch fresh data (pass framework_id too so backend filters dept scores by framework)
      const fwParam = selectedFw !== 'all' ? `&framework_id=${selectedFw}` : '';
      const { data } = await API.get(`dashboard-summary/?department_id=${selectedDept}${fwParam}`);
      const doc = new jsPDF();
      const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // Determine report scope
      const isAllFw = selectedFw === 'all';
      const isAllDept = selectedDept === 'all';
      const selectedFwData = isAllFw 
        ? data.framework_scores 
        : data.framework_scores.filter(f => f.framework_id.toString() === selectedFw.toString());

      // ── Filter department/policy/PC data by selected dept ──
      const deptLabel = isAllDept 
        ? 'All Departments' 
        : (departments.find(d => d.id.toString() === selectedDept.toString())?.name || 'Department');

      // Filter department_scores to selected dept if needed
      const filteredDeptScores = isAllDept
        ? (data.department_scores || [])
        : (data.department_scores || []).filter(d => d.department === deptLabel);

      // Filter failed_policies_by_dept to selected dept if needed
      const filteredFailedPolicies = isAllDept
        ? (data.failed_policies_by_dept || [])
        : (data.failed_policies_by_dept || []).filter(d => d.department === deptLabel);

      // Filter pc_scores to selected dept if needed
      const filteredPcScores = isAllDept
        ? (data.pc_scores || [])
        : (data.pc_scores || []).filter(pc => pc.department === deptLabel);

      // ── Header ──
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(56, 189, 248);
      doc.setFontSize(22);
      doc.setFont(undefined, 'bold');
      doc.text('Compliance Executive Summary', 14, 18);
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(148, 163, 184);
      // Dynamically show Admin or Auditor based on userRole state
      const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);
      const fwLabel = isAllFw ? 'All Frameworks' : (selectedFwData[0]?.framework_name || 'Framework');
      doc.text(`Generated: ${now}  |  Dept: ${deptLabel}  |  Framework: ${fwLabel}  |  Auth: ${roleLabel}`, 14, 28);

      let y = 50;

      // ── Executive Summary Section ──
      const threshold = data.passing_threshold || 90;
      const score = isAllFw ? data.overall_compliance_score : (selectedFwData[0]?.score || 0);
      const status = score >= threshold ? 'Safe' : 'Critical';
      const agents = data.total_agents_scanned || 0;

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(22);
      doc.setFont(undefined, 'bold');
      doc.text('Executive Summary', 14, y);
      y += 15;

      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Overall Compliance Score:  ${score}%`, 14, y);
      y += 8;
      doc.text(`Departmental Compliance Score:  ${data.departmental_compliance_score ?? 0}%`, 14, y);
      y += 8;
      doc.text(`System Status:  ${status}`, 14, y);
      y += 8;
      doc.text(`Passing Threshold:  ${threshold}%`, 14, y);
      y += 8;
      doc.text(`Agents Scanned:  ${agents}`, 14, y);
      y += 15;

      // ── Score Overview ──
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(isAllFw ? 'Framework Compliance Status (Combined)' : `${selectedFwData[0]?.framework_name || 'Framework'} Compliance Status`, 14, y);
      y += 5;

      doc.autoTable({
        startY: y,
        head: [['Framework', 'Total Controls', 'Passed', 'Compliance Score']],
        body: selectedFwData.map((fw) => [
          fw.framework_name,
          fw.total_checks,
          fw.passed_checks,
          `${fw.score}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: [56, 189, 248], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 }
      });

      y = doc.lastAutoTable.finalY + 15;

      // ── Top Failed Controls ──
      const failedControls = isAllFw 
        ? data.top_failed_controls 
        : data.top_failed_controls.filter(c => {
            const fwNameInLog = (c.framework_name || '').trim().toLowerCase();
            const selectedFwName = (selectedFwData[0]?.framework_name || '').trim().toLowerCase();
            // Use partial matching to be more robust (e.g. "ISO" matching "ISO 27001")
            return fwNameInLog === selectedFwName || 
                   fwNameInLog.includes(selectedFwName) || 
                   selectedFwName.includes(fwNameInLog);
          });

      if (failedControls?.length) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Critical Vulnerabilities (Top Failed Controls)', 14, y);
        y += 5;

        doc.autoTable({
          startY: y,
          head: [['Control ID', 'Title', 'Framework', 'Total Failures']],
          body: failedControls.map((c) => [
            c.control_code,
            c.control_title,
            c.framework_name,
            c.fail_count
          ]),
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 3 }
        });
      }

      // ── Department Summary ──
      if (filteredDeptScores.length > 0) {
        y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : y;
        if (y > 250) { doc.addPage(); y = 20; }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Department Summary (Policy-Based)', 14, y);
        y += 5;

        doc.autoTable({
          startY: y,
          head: [['Department', 'PCs', 'Total Controls', 'Failed Controls', 'Score']],
          body: filteredDeptScores.map((dept) => [
            dept.department,
            dept.pc_count,
            dept.total_controls ?? '-',
            dept.failed_controls ?? '-',
            `${dept.score}%`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 3 },
          didParseCell: (hookData) => {
            if (hookData.column.index === 4 && hookData.section === 'body') {
              const score = parseFloat(hookData.cell.raw);
              hookData.cell.styles.fontStyle = 'bold';
              hookData.cell.styles.textColor = score >= (data.passing_threshold || 90) ? [16, 185, 129] : score >= 50 ? [245, 158, 11] : [239, 68, 68];
            }
          }
        });
      }

      // ── Failed Policies by Department ──
      if (filteredFailedPolicies.length > 0) {
        y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : y;
        if (y > 250) { doc.addPage(); y = 20; }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Failed Policies by Department', 14, y);
        y += 5;

        const failedPolicyRows = [];
        filteredFailedPolicies.forEach(dept => {
          dept.failed_policies.forEach((policy, i) => {
            failedPolicyRows.push([
              i === 0 ? dept.department : '',
              policy
            ]);
          });
        });

        doc.autoTable({
          startY: y,
          head: [['Department', 'Failed Policy']],
          body: failedPolicyRows,
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
        });
      }

      // ── PC Assessment ──
      if (filteredPcScores.length > 0) {
        y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : y;
        if (y > 250) { doc.addPage(); y = 20; }

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('PC Assessment', 14, y);
        y += 5;

        doc.autoTable({
          startY: y,
          head: [['PC Alias / Agent ID', 'Department', 'Compliance Score', 'Status']],
          body: filteredPcScores.map((pc) => [
            pc.display_name,
            pc.department,
            `${pc.score}%`,
            pc.score >= (data.passing_threshold || 90) ? 'PASS' : 'FAIL'
          ]),
          theme: 'striped',
          headStyles: { fillColor: [56, 189, 248], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 3 },
          didParseCell: (hookData) => {
            if (hookData.column.index === 3 && hookData.section === 'body') {
              hookData.cell.styles.fontStyle = 'bold';
              hookData.cell.styles.textColor = hookData.cell.raw === 'PASS' ? [16, 185, 129] : [239, 68, 68];
            }
          }
        });
      }

      // ── Footer ──
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`GRC Compliance Platform  ·  Confidential Report  ·  Page ${i} of ${pageCount}`, 14, 285);
      }

      const fileName = isAllFw ? 'Compliance_Report_Combined' : `Compliance_Report_${selectedFwData[0]?.framework_name || 'Export'}`;
      doc.save(`${fileName}_${new Date().toISOString().slice(0, 10)}.pdf`);
      
      // Log the action to Audit Trail
      await API.post('audit-logs/', {
        action: `Generated Compliance Report: ${isAllFw ? 'Combined' : selectedFwData[0]?.framework_name} for ${deptLabel}`,
        module: 'Intelligence & Reports',
        status: 'Success'
      }).catch(() => {});

      // Refresh logs list to show the new entry
      API.get('audit-logs/?page_size=50').then(res => setAuditLogs(res.data.results || res.data || []));

      // Increment the global database counter
      API.post('increment-report-count/').then((res) => {
        setReportCount(res.data.total_reports_generated);
      }).catch(() => {
        setReportCount(prev => prev + 1);
      });
      setToast({ msg: 'Compliance report generated and downloaded.', type: 'success' });
    } catch (err) {
      console.error('PDF Error:', err);
      const errMsg = err?.message || 'Unknown error';
      // Log the Failure to Audit Trail
      API.post('audit-logs/', {
        action: `Failed to Generate Compliance Report: ${selectedFw === 'all' ? 'Combined' : 'Specific Framework'}`,
        module: 'Intelligence & Reports',
        status: 'Failed'
      }).catch(() => {});
      logFailure(`PDF Report generation failed: ${errMsg}`, 'Intelligence & Reports');
      setToast({ msg: `Failed to generate report: ${errMsg}`, type: 'error' });
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
      doc.setFontSize(22);
      doc.setFont(undefined, 'bold');
      doc.text('System Audit Trail', 14, 18);
      
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text(`Exported: ${now}  |  Entries Found: ${filteredLogs.length}`, 14, 28);

      doc.autoTable({
        startY: 45,
        head: [['User', 'Action', 'Module', 'Status', 'Timestamp']],
        body: filteredLogs.map((log) => [
          log.user || 'System',
          log.action,
          log.module,
          log.status,
          new Date(log.timestamp).toLocaleString()
        ]),
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: [56, 189, 248], fontSize: 10 },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          1: { cellWidth: 70 }
        }
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`GRC Platform Audit Log  ·  Page ${i} of ${pageCount}`, 14, 285);
      }

      doc.save(`GRC_Audit_Trail_${new Date().toISOString().slice(0, 10)}.pdf`);
      
      // Log the action to Audit Trail
      await API.post('audit-logs/', {
        action: 'Exported System Audit Trail (PDF)',
        module: 'Audit Trail',
        status: 'Success'
      }).catch(() => {});

      // Refresh logs list to show the new entry
      API.get('audit-logs/?page_size=50').then(res => setAuditLogs(res.data.results || res.data || []));

      setToast({ msg: 'Audit trail log exported successfully.', type: 'success' });
    } catch (err) {
      const errMsg = err?.message || 'Unknown error';
      // Log the Failure to Audit Trail
      API.post('audit-logs/', {
        action: 'Failed to Export System Audit Trail',
        module: 'Audit Trail',
        status: 'Failed'
      }).catch(() => {});
      logFailure(`Audit Trail PDF export failed: ${errMsg}`, 'Audit Trail');

      setToast({ msg: 'Failed to generate audit report.', type: 'error' });
    } finally {
      setGeneratingAudit(false);
    }
  };


  const resetCount = async () => {
    setIsResetting(true);
    try {
      await API.post('reset-report-count/');
      setReportCount(0);
      setToast({ msg: 'Report counter has been successfully reset to zero.', type: 'success' });
    } catch {
      setToast({ msg: 'Reset failed. Only Super Admin can reset the counter.', type: 'error' });
    } finally {
      setTimeout(() => setIsResetting(false), 600);
    }
  };

  const filteredLogs = useMemo(() => {
    let result = [...auditLogs];
    
    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(l => {
        const a = (l.action || '').toLowerCase();
        const rawStatus = (l.status || '').toLowerCase();
        
        // System logs are things like invites, revokes, blocks, etc.
        // We want to reclassify them as 'System' UNLESS they explicitly failed.
        const isSystemAction = !l.user || 
                         a.includes('admin') || 
                         a.includes('access') || 
                         a.includes('invite') || 
                         a.includes('revoke') || 
                         a.includes('restore') || 
                         a.includes('expired') ||
                         a.includes('credential') ||
                         a.includes('password') ||
                         a.includes('block') ||
                         a.includes('reset') ||
                         a.includes('account');
        
        const isFailed = rawStatus === 'failed' || rawStatus === 'alert';
        const isSystem = isSystemAction && !isFailed;
        
        if (statusFilter === 'system') return isSystem;
        if (isSystem) return false; 
        return rawStatus === statusFilter.toLowerCase();
      });
    }

    // Date Range Filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(l => new Date(l.timestamp) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(l => new Date(l.timestamp) <= end);
    }

    return result.sort((a, b) => {
      const tA = new Date(a.timestamp).getTime();
      const tB = new Date(b.timestamp).getTime();
      return sortOrder === 'latest' ? tB - tA : tA - tB;
    });
  }, [auditLogs, statusFilter, sortOrder, startDate, endDate]);

  // Use local date string (YYYY-MM-DD) instead of UTC to avoid timezone lag
  const today = new Date().toLocaleDateString('en-CA'); 

  return (
    <>
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
      <div className="max-w-7xl mx-auto pb-10">

      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Intelligence &amp; Audits</h1>
        <p className="text-slate-500 font-medium mt-1">Export executive compliance summaries and historical activity logs.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 items-start">
        {/* Left — Report Generator */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm relative overflow-hidden">
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
                  <div className="relative">
                    <button 
                      onClick={() => setIsFwOpen(!isFwOpen)}
                      className="input-field pl-12 pr-10 cursor-pointer w-full text-left flex items-center justify-between group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                    >
                      <Database className="absolute left-4 top-3.5 h-4 w-4 text-brand-600 dark:text-brand-400 transition-colors" />
                      <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {frameworks.find(f => f.id.toString() === selectedFw.toString())?.name || 'Select Framework'} Compliance Profile
                      </span>
                      <ArrowUpDown className={`w-4 h-4 transition-all ${isFwOpen ? 'rotate-180 text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                    </button>

                    {isFwOpen && (
                      <div className="absolute top-full left-0 w-full mt-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                        <button
                          onClick={() => {
                            setSelectedFw('all');
                            setIsFwOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm font-bold transition-all flex items-center justify-between
                            ${selectedFw === 'all' 
                              ? 'bg-brand-600 text-white' 
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                          Combined Framework Registry (Both)
                          {selectedFw === 'all' && <CheckCircle className="w-4 h-4" />}
                        </button>
                        {frameworks.map((fw) => {
                          const isSelected = fw.id.toString() === selectedFw.toString();
                          return (
                            <button
                              key={fw.id}
                              onClick={() => {
                                setSelectedFw(fw.id);
                                setIsFwOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 text-sm font-bold transition-all flex items-center justify-between
                                ${isSelected 
                                  ? 'bg-brand-600 text-white' 
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                            >
                              {fw.name} Compliance Profile
                              {isSelected && <CheckCircle className="w-4 h-4" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {isFwOpen && <div className="fixed inset-0 z-40" onClick={() => setIsFwOpen(false)} />}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-slate-400">Department Scope</label>
                  <div className="relative">
                    <button 
                      onClick={() => setIsDeptOpen(!isDeptOpen)}
                      className="input-field pl-12 pr-10 cursor-pointer w-full text-left flex items-center justify-between group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                    >
                      <User className="absolute left-4 top-3.5 h-4 w-4 text-brand-600 dark:text-brand-400 transition-colors" />
                      <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {selectedDept === 'all' ? 'All Departments' : (departments.find(d => d.id.toString() === selectedDept.toString())?.name || 'Select Department')}
                      </span>
                      <ArrowUpDown className={`w-4 h-4 transition-all ${isDeptOpen ? 'rotate-180 text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                    </button>

                    {isDeptOpen && (
                      <div className="absolute top-full left-0 w-full mt-2 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                        <button
                          onClick={() => {
                            setSelectedDept('all');
                            setIsDeptOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm font-bold transition-all flex items-center justify-between
                            ${selectedDept === 'all' 
                              ? 'bg-brand-600 text-white' 
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                          All Departments
                          {selectedDept === 'all' && <CheckCircle className="w-4 h-4" />}
                        </button>
                        {departments.map((dept) => {
                          const isSelected = dept.id.toString() === selectedDept.toString();
                          return (
                            <button
                              key={dept.id}
                              onClick={() => {
                                setSelectedDept(dept.id);
                                setIsDeptOpen(false);
                              }}
                              className={`w-full text-left px-4 py-3 text-sm font-bold transition-all flex items-center justify-between
                                ${isSelected 
                                  ? 'bg-brand-600 text-white' 
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                            >
                              {dept.name}
                              {isSelected && <CheckCircle className="w-4 h-4" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {isDeptOpen && <div className="fixed inset-0 z-40" onClick={() => setIsDeptOpen(false)} />}
                  </div>
                </div>

                <div className="pt-2">
                  <button onClick={handleDownload} disabled={generating || !selectedFw}
                    className="btn-primary w-full py-4 flex items-center justify-center gap-3 shadow-xl shadow-brand-600/20">
                    {generating ? (
                      <><Loader2 className="h-5 w-5 animate-spin" /> DISPATCHING...</>
                    ) : (
                      <><Download className="h-5 w-5" /> DOWNLOAD COMPLIANCE REPORT</>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-8 relative overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-center items-center text-center">
                {userRole === 'super_admin' && (
                  <button onClick={resetCount} className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 transition-all z-20" title="Reset Counter (Super Admin Only)">
                    <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin [animation-duration:0.4s]' : ''}`} />
                  </button>
                )}
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 mt-2">Total Reports Generated</p>
                <h4 className="text-4xl font-black text-brand-600 dark:text-brand-400 mb-2">{reportCount}</h4>
              </div>

              <div className="mt-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-l-4 border-l-brand-600 border border-slate-200 dark:border-slate-800 shadow-sm">
                 <div className="flex items-start gap-3 text-left">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                      <Zap className="w-4 h-4 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-widest">PRO TIP</p>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">PDF reports include top failed controls, agent-specific breakdowns, and threshold compliance status.</p>
                    </div>
                 </div>
              </div>
            </div>
            <FileText className="absolute -right-6 -bottom-6 h-32 w-32 text-brand-600/5 rotate-12" />
          </div>
        </div>

        {/* Right — Audit Trail */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-100/30 dark:bg-slate-900/20">
            <div className="flex items-center gap-3">
               <History className="w-6 h-6 text-slate-400" />
               <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">System Event Log</h3>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 mr-1">
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                 </span>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Telemetry</span>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setIsStatusOpen(!isStatusOpen)}
                  className={`p-2.5 rounded-xl border transition-all shadow-sm ${
                    statusFilter === 'all' 
                      ? 'border-slate-200 dark:border-slate-800 text-slate-500 bg-white dark:bg-slate-900' 
                      : statusFilter === 'success'
                        ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-slate-950'
                        : statusFilter === 'failed'
                          ? 'border-red-500 text-red-600 bg-red-50 dark:bg-slate-950'
                          : 'border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-slate-950'
                  }`} 
                  title="Filter Status"
                >
                  <ListFilter className="w-4 h-4" />
                </button>
                {isStatusOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsStatusOpen(false)} />
                    <div className="absolute top-full right-0 mt-2 w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 py-2">
                      {['all', 'success', 'failed', 'system'].map(s => (
                        <button key={s} onClick={() => { setStatusFilter(s); setIsStatusOpen(false); }}
                          className={`w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${statusFilter === s ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button 
                onClick={() => setSortOrder(sortOrder === 'latest' ? 'oldest' : 'latest')}
                className={`p-2.5 rounded-xl border transition-all shadow-sm ${
                  sortOrder === 'latest' 
                    ? 'border-slate-200 dark:border-slate-800 text-slate-500 bg-white dark:bg-slate-900' 
                    : 'border-sky-500 text-sky-600 bg-sky-50 dark:bg-slate-950'
                }`} 
                title="Sort Order"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-8 relative h-[480px] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-950">
            {/* Timeline Line */}
            <div className="absolute left-1/2 top-8 bottom-8 w-px bg-slate-200 dark:bg-slate-800 -translate-x-1/2 hidden md:block z-0" />

            {loadingLogs ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-brand-600" />
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Audit Registry...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-20 text-center relative z-10 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <History className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">No events logged.</p>
              </div>
            ) : (
              <div className="space-y-6 relative z-10">
                {filteredLogs.map((log, idx) => {
                  let status = (log.status || 'system').toLowerCase();
                  let actionTitle = log.action; // E.g., 'Invited Admin: xyz@email.com'
                  let description = log.user ? `Action performed by ${log.user}` : 'Triggered by System Automation';

                  const lowerAction = actionTitle.toLowerCase();
                  
                  const isActionSystemKeywords = !log.user || 
                                       lowerAction.includes('admin') || 
                                       lowerAction.includes('access') || 
                                       lowerAction.includes('invite') || 
                                       lowerAction.includes('revoke') || 
                                       lowerAction.includes('restore') || 
                                       lowerAction.includes('expired') ||
                                       lowerAction.includes('credential') ||
                                       lowerAction.includes('password') ||
                                       lowerAction.includes('block') ||
                                       lowerAction.includes('reset') ||
                                       lowerAction.includes('account');

                  // If it's a failed action, keep it failed. Otherwise, if it matches system keywords, make it 'system'.
                  const isFailedStatus = status === 'failed' || status === 'alert';
                  const isSystemAction = isActionSystemKeywords && !isFailedStatus;

                  if (isSystemAction) {
                    status = 'system';
                  }

                  const style = STATUS_STYLES[status] || STATUS_STYLES.system;
                  
                  // Action-specific icon overrides
                  let StatusIcon = style.icon;
                  if (lowerAction.includes('invite') || lowerAction.includes('added')) StatusIcon = UserPlus;
                  else if (lowerAction.includes('revoke')) StatusIcon = Lock;
                  else if (lowerAction.includes('restore')) StatusIcon = UserCheck;
                  else if (lowerAction.includes('expired')) StatusIcon = UserMinus;
                  else if (lowerAction.includes('delete') || lowerAction.includes('removed')) StatusIcon = Trash2;
                  const isLeft = idx % 2 === 0;

                  const dateObj = new Date(log.timestamp);
                  // Optional standard locale formatting 
                  const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={log.id} className={`flex items-center w-full ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                      <div className="w-full md:w-[45%]">
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                          
                          <div className="flex items-center justify-between mb-3 gap-2">
                             <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${style.badge}`}>
                               {status}
                             </span>
                             <span className="text-[10px] font-semibold text-slate-400 text-right">
                               {dateStr}, {timeStr}
                             </span>
                          </div>
                          
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1.5 leading-snug">
                            {actionTitle}
                          </h4>
                          
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                            {description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="hidden md:flex items-center justify-center w-[10%] relative z-20">
                         <div className={`p-2 rounded-full ${style.iconBg} border-2 border-white dark:border-slate-950 shadow-sm`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                         </div>
                      </div>
                      <div className="hidden md:block w-[45%]" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-200 dark:border-slate-900 bg-slate-100/30 dark:bg-slate-900/20 z-20">
            <div className="flex flex-col md:flex-row items-end gap-4 justify-between">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto relative pt-5">
                <span className="absolute top-0 left-0 text-[9px] font-black uppercase tracking-widest text-slate-400">Audit Date Range</span>
                <div className="relative group w-full sm:w-auto">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || today}
                    className="input-field pl-9 pr-4 py-2 text-xs w-full bg-slate-50 dark:bg-slate-900" title="Start Date" />
                </div>
                <span className="text-slate-300 hidden sm:block">-</span>
                <div className="relative group w-full sm:w-auto">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    max={today}
                    className="input-field pl-9 pr-4 py-2 text-xs w-full bg-slate-50 dark:bg-slate-900" title="End Date" />
                </div>
              </div>

              <button onClick={handleDownloadAudit} disabled={generatingAudit || auditLogs.length === 0}
                className="w-full md:w-auto px-6 py-2.5 flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest text-[10px] shadow-sm hover:shadow-md transition-all disabled:opacity-60">
                {generatingAudit ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> DISPATCHING...</>
                ) : (
                  <><Download className="h-3.5 w-3.5" /> EXPORT AUDIT TRAIL</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
