import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  ShieldAlert, ShieldCheck, Activity, AlertTriangle, Users, Clock, PlayCircle, ArrowUpRight
} from 'lucide-react';

const COLORS = {
  pass: '#22c55e', // Green-500
  fail: '#e2e8f0', // Slate-200 (for the empty track)
  bars: ['#38bdf8', '#818cf8', '#6366f1', '#4f46e5'], 
};

/* ── Stat Card ──────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, bgColor }) {
  return (
    <div className="cyber-card group p-6 flex flex-col gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${bgColor} dark:bg-opacity-10 transition-transform group-hover:scale-110 duration-300`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</p>
      </div>
    </div>
  );
}

/* ── Custom Tooltip ─────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="cyber-card !p-3 !bg-slate-900 !border-0 shadow-2xl">
      <p className="font-bold text-white mb-1">{label}</p>
      <p className="text-brand-400 font-medium">{payload[0].value}% compliant</p>
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────── */
export default function Dashboard() {
  const { role } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: 'success' });

  const fetchDashboard = useCallback(() => {
    API.get('dashboard-summary/')
      .then((res) => setData(res.data))
      .catch((err) => console.error('Dashboard fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleRunScan = useCallback(async () => {
    setScanning(true);
    try {
      await API.post('run-scan/');
      setToast({ msg: 'Scan completed successfully! Dashboard data refreshed.', type: 'success' });
      fetchDashboard();
    } catch (err) {
      setToast({ msg: err.response?.data?.error || 'Scan failed. Please try again.', type: 'error' });
    } finally {
      setScanning(false);
    }
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 font-medium">
        Failed to load dashboard data.
      </div>
    );
  }

  const { total_agents_scanned, overall_compliance_score, framework_scores, top_failed_controls, recent_scans } = data;

  /* Donut data */
  const donutData = [
    { name: 'Compliant', value: overall_compliance_score },
    { name: 'Gap', value: 100 - overall_compliance_score },
  ];

  /* Bar data */
  const barData = framework_scores.map((fw) => ({
    name: fw.framework_name.length > 18 ? fw.framework_name.slice(0, 18) + '…' : fw.framework_name,
    score: fw.score,
    passed: fw.passed_checks,
    total: fw.total_checks,
  }));

  return (
    <>
      <Toast message={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: 'success' })} />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">Real-time governance and security compliance monitoring.</p>
        </div>
        {role !== 'auditor' && (
          <button onClick={handleRunScan} disabled={scanning} className="btn-primary">
            {scanning ? (
              <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing Scan...</>
            ) : (
              <><PlayCircle className="h-5 w-5" /> Run Manual Scan</>
            )}
          </button>
        )}
      </div>

      {/* ── Stat Cards Row ──────────────────── */}
      <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <Link to="/scans" className="block no-underline">
          <StatCard icon={Activity} label="Active Agents" value={total_agents_scanned} color="text-brand-600" bgColor="bg-brand-50" />
        </Link>
        <StatCard icon={ShieldCheck} label="Overall Score" value={`${overall_compliance_score}%`} color="text-emerald-600" bgColor="bg-emerald-50" />
        <Link to="/frameworks" className="block no-underline">
          <StatCard icon={ShieldAlert} label="Frameworks" value={framework_scores.length} color="text-indigo-600" bgColor="bg-indigo-50" />
        </Link>
        <Link to="/reports" className="block no-underline">
          <StatCard icon={AlertTriangle} label="Critical Gaps" value={top_failed_controls.length} color="text-red-600" bgColor="bg-red-50" />
        </Link>
        <Link to="/manage-admins" className="block no-underline">
          <StatCard icon={Users} label="Auth Admins" value={data.total_admins} color="text-amber-600" bgColor="bg-amber-50" />
        </Link>
      </div>

      {/* ── Charts Row ──────────────────────── */}
      <div className="mb-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Donut — Overall Score */}
        <div className="cyber-card p-8 flex flex-col items-center justify-center min-h-[340px]">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Security Posture</h3>
          <div className="relative h-56 w-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  innerRadius={75}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  <Cell fill={COLORS.pass} className="drop-shadow-lg" />
                  <Cell fill={COLORS.fail} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-slate-900 dark:text-white">{overall_compliance_score}%</span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Compliant</span>
            </div>
          </div>
        </div>

        {/* Bar Chart — Framework Breakdown */}
        <div className="cyber-card p-8 lg:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Framework Breakdown</h3>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">Compliance Benchmark</p>
            </div>
            <Link to="/frameworks" className="text-brand-600 hover:text-brand-700 font-bold text-sm flex items-center gap-1 transition-colors">
              Details <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barCategoryGap="35%">
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(124, 58, 237, 0.04)' }} />
                <Bar dataKey="score" radius={[8, 8, 8, 8]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={COLORS.bars[i % COLORS.bars.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Failed Controls Table ───────────── */}
      <div className="cyber-card p-8 overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Critical Gaps</h3>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">Non-Compliant Controls</p>
          </div>
          <span className="status-pill bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {top_failed_controls.length} Action Items
          </span>
        </div>

        {top_failed_controls.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
             <ShieldCheck className="w-12 h-12 text-emerald-500 mb-4" />
             <p className="text-slate-500 font-semibold uppercase tracking-widest text-sm">All Systems Secure</p>
             <p className="text-slate-400 text-xs mt-1">No critical control failures detected.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {top_failed_controls.map((ctrl) => (
              <div key={ctrl.control_id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl group hover:shadow-md transition-all border border-transparent hover:border-brand-100 dark:hover:border-brand-900/30">
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  <div className="flex flex-col min-w-[100px]">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Control Code</span>
                    <span className="font-black text-brand-700 dark:text-brand-400">{ctrl.control_code}</span>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Requirement</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{ctrl.control_title}</span>
                  </div>
                  <div className="hidden lg:flex flex-col min-w-[140px]">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Source</span>
                    <span className="text-[10px] font-black uppercase text-brand-600 dark:text-white tracking-widest bg-brand-50 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-brand-100 dark:border-sky-500/30 shadow-sm self-start">
                      {ctrl.framework_name}
                    </span>
                  </div>
                </div>
                <div className="text-right mt-4 md:mt-0 ml-0 md:ml-6 flex md:block items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Incidents</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-100/50 dark:border-red-500/20">
                    {ctrl.fail_count} Failed Agents
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom Row (Recent Scans + Activity Log) ───────── */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        
        {/* Recent Scans */}
        {recent_scans.length > 0 && (
          <div className="cyber-card p-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Recent Reports</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recent_scans.slice(0, 3).map((scan) => (
                <div key={scan.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center transition-all hover:shadow-md">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Agent {scan.agent_id}</span>
                  <div className={`mt-2 text-2xl font-black ${scan.overall_score >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {scan.overall_score}%
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-slate-400 flex items-center justify-center gap-1.5 uppercase">
                     <Clock className="w-3.5 h-3.5" /> {new Date(scan.scan_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mini Audit Log */}
        {data.recent_activity?.length > 0 && (
          <div className="cyber-card p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Events</h3>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">Audit Trail</p>
              </div>
              <Link to="/reports" className="text-brand-600 hover:text-brand-700 font-bold text-sm no-underline">See Full Log</Link>
            </div>
            <div className="space-y-5">
              {data.recent_activity.slice(0, 4).map((log) => (
                <div key={log.id} className="flex items-start gap-4 group">
                  <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-600 shadow-lg shadow-brand-600/40" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <span className="text-slate-900 dark:text-white">{log.user__username}</span> {log.action}
                    </p>
                    <div className="mt-1 flex gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5">{log.module}</span>
                      <span>{new Date(log.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

