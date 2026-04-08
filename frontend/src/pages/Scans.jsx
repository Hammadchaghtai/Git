import { useEffect, useState } from 'react';
import API from '../api/axios';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function Scans() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('scans/')
      .then((res) => setScans(res.data.results || res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#38bdf8]" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#0f172a]">Compliance Scans</h1>

      {scans.length === 0 ? (
        <p className="text-gray-400">No scans found. Run the sync command to ingest data.</p>
      ) : (
        <div className="space-y-5">
          {scans.map((scan) => (
            <div key={scan.id} className="rounded-xl border border-gray-100 bg-white shadow-sm">
              {/* Scan Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50">
                    <Clock className="h-5 w-5 text-sky-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0f172a]">Agent {scan.agent_id}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(scan.scan_date).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-2xl font-bold ${
                      scan.overall_score >= 70 ? 'text-emerald-500' : 'text-amber-500'
                    }`}
                  >
                    {scan.overall_score}%
                  </span>
                  <p className="text-xs text-gray-400">
                    {scan.passed_checks}/{scan.total_checks} passed
                  </p>
                </div>
              </div>

              {/* Results Table */}
              {scan.results && scan.results.length > 0 && (
                <div className="overflow-x-auto px-6 py-4">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <th className="pb-2 pr-4">Status</th>
                        <th className="pb-2 pr-4">Rule ID</th>
                        <th className="pb-2 pr-4">Description</th>
                        <th className="pb-2 pr-4">Control</th>
                        <th className="pb-2">Framework</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scan.results.map((r) => (
                        <tr key={r.id} className="border-t border-gray-50">
                          <td className="py-2.5 pr-4">
                            {r.is_passed ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                                <CheckCircle className="h-4 w-4" /> PASS
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
                                <XCircle className="h-4 w-4" /> FAIL
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-xs">{r.wazuh_rule_id}</td>
                          <td className="py-2.5 pr-4 text-gray-600 max-w-xs truncate">{r.rule_description}</td>
                          <td className="py-2.5 pr-4 font-semibold text-[#0f172a]">{r.control_code}</td>
                          <td className="py-2.5">
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-600">
                              {r.framework_name}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
