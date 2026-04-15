import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  ShieldAlert, ShieldCheck, Activity, AlertTriangle, Users, Clock
} from 'lucide-react';

const COLORS = {
  pass: '#22c55e',
  fail: '#e2e8f0',
  bars: ['#38bdf8', '#818cf8', '#a78bfa', '#f472b6'],
};

/* ── Stat Card ──────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, bgColor }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${bgColor}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="text-xl font-bold text-[#0f172a]">{value}</p>
      </div>
    </div>
  );
}

/* ── Custom Tooltip ─────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#0f172a] px-3 py-2 text-xs text-white shadow-lg">
      <p className="font-semibold">{label}</p>
      <p className="text-[#38bdf8]">{payload[0].value}% compliant</p>
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────── */
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('dashboard-summary/')
      .then((res) => setData(res.data))
      .catch((err) => console.error('Dashboard fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#38bdf8]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
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
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#0f172a]">Executive Dashboard</h1>

      {/* ── Stat Cards Row ──────────────────── */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Activity} label="Agents Scanned" value={total_agents_scanned} color="text-sky-500" bgColor="bg-sky-50" />
        <StatCard icon={ShieldCheck} label="Compliance Score" value={`${overall_compliance_score}%`} color="text-emerald-500" bgColor="bg-emerald-50" />
        <StatCard icon={ShieldAlert} label="Frameworks Tracked" value={framework_scores.length} color="text-violet-500" bgColor="bg-violet-50" />
        <StatCard icon={AlertTriangle} label="Failed Controls" value={top_failed_controls.length} color="text-amber-500" bgColor="bg-amber-50" />
        <Link to="/manage-admins" className="block no-underline">
          <StatCard icon={Users} label="Total Admins" value={data.total_admins} color="text-pink-500" bgColor="bg-pink-50" />
        </Link>
      </div>

      {/* ── Charts Row ──────────────────────── */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Donut — Overall Score */}
        <div className="flex flex-col items-center rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-600">Overall Compliance</h3>
          <div className="relative h-48 w-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  innerRadius={64}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                >
                  <Cell fill={COLORS.pass} />
                  <Cell fill={COLORS.fail} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-[#0f172a]">{overall_compliance_score}%</span>
              <span className="text-xs text-gray-400">Compliant</span>
            </div>
          </div>
        </div>

        {/* Bar Chart — Framework Breakdown */}
        <div className="col-span-1 rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-600">Compliance by Framework</h3>
              <p className="text-xs text-gray-400">Pass rate per governance framework</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barCategoryGap="30%">
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
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
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-600">Top Failed Controls</h3>

        {top_failed_controls.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            🎉 All mapped controls are passing. Great job!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="pb-3 pr-6">Control</th>
                  <th className="pb-3 pr-6">Title</th>
                  <th className="pb-3 pr-6">Framework</th>
                  <th className="pb-3 text-right">Failures</th>
                </tr>
              </thead>
              <tbody>
                {top_failed_controls.map((ctrl) => (
                  <tr key={ctrl.control_id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 pr-6 font-mono text-xs font-semibold text-[#0f172a]">
                      {ctrl.control_code}
                    </td>
                    <td className="py-3 pr-6 font-medium text-gray-700">{ctrl.control_title}</td>
                    <td className="py-3 pr-6">
                      <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600">
                        {ctrl.framework_name}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                        {ctrl.fail_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Bottom Row (Recent Scans + Activity Log) ───────── */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Scans */}
        {recent_scans.length > 0 && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-600">Recent Scans</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {recent_scans.slice(0, 3).map((scan) => (
                <div key={scan.id} className="flex flex-col items-center justify-center rounded-lg border border-gray-100 p-4 text-center">
                  <span className="text-xs text-gray-400">Agent {scan.agent_id}</span>
                  <span className={`mt-1 text-xl font-bold ${scan.overall_score >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {scan.overall_score}%
                  </span>
                  <span className="mt-1 text-[10px] text-gray-300 flex items-center gap-1">
                     <Clock className="w-3 h-3" /> {new Date(scan.scan_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mini Audit Log */}
        {data.recent_activity?.length > 0 && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-600">Recent Activity</h3>
              <Link to="/reports" className="text-xs font-semibold text-sky-500 hover:text-sky-600 cursor-pointer no-underline">View All →</Link>
            </div>
            <div className="space-y-4">
              {data.recent_activity.slice(0, 4).map((log) => (
                <div key={log.id} className="flex items-start gap-4 border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                  <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-sky-500" />
                  <div>
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{log.user__username}</span> {log.action}
                    </p>
                    <p className="mt-0.5 flex gap-2 text-xs font-medium text-slate-400">
                      <span className="rounded bg-slate-100 px-1.5">{log.module}</span>
                      <span>{new Date(log.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
