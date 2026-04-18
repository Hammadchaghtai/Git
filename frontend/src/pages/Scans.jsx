import React, { useEffect, useState, useMemo, useCallback } from 'react';
import API from '../api/axios';
import { CheckCircle, XCircle, Clock, Search, ChevronDown, ChevronRight, AlertTriangle, Calendar } from 'lucide-react';

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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#38bdf8]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Scan Results</h1>
          <p className="text-sm text-gray-400 mt-0.5">Compliance scan results grouped by Wazuh agent</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-5 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 px-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by agent ID, control code, rule ID, or keyword..."
            className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent" />
        </div>
      </div>

      {filteredAgents.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 shadow-sm text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-400">No scan results found. Run a scan from the Dashboard to ingest data.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredAgents.map(([agentId, agentScans]) => {
            const latest = agentScans[0];
            const isExpanded = expandedAgentId === agentId;
            const activeIndex = selectedScanIndex[agentId] || 0;
            const activeScan = agentScans[activeIndex] || latest;

            return (
              <div key={agentId} className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                {/* Agent Header */}
                <button
                  onClick={() => handleToggleAgent(agentId)}
                  className="flex w-full items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50">
                      <Clock className="h-5 w-5 text-sky-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-[#0f172a]">Agent {agentId}</p>
                      <p className="text-xs text-gray-400">
                        {agentScans.length} scan{agentScans.length > 1 ? 's' : ''} · Latest: {new Date(latest.scan_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${latest.overall_score >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {latest.overall_score}%
                      </span>
                      <p className="text-xs text-gray-400">{latest.passed_checks}/{latest.total_checks} passed</p>
                    </div>
                    {isExpanded
                      ? <ChevronDown className="h-5 w-5 text-gray-400" />
                      : <ChevronRight className="h-5 w-5 text-gray-400" />
                    }
                  </div>
                </button>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100">

                    {/* ── Scan History Selector (only show if more than 1 scan) ── */}
                    {agentScans.length > 1 && (
                      <div className="px-6 pt-4 pb-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <Calendar className="h-3.5 w-3.5" /> Scan History
                          </span>
                          <div className="flex gap-1.5 flex-wrap">
                            {agentScans.map((scan, idx) => (
                              <button
                                key={scan.id}
                                onClick={() => handleScanSelect(agentId, idx)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer border ${
                                  idx === activeIndex
                                    ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-sm'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <span>{new Date(scan.scan_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                <span className={`ml-1.5 ${scan.overall_score >= 70 ? 'text-emerald-400' : 'text-amber-400'} ${idx === activeIndex ? '' : scan.overall_score >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                  {scan.overall_score}%
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Active Scan Details ── */}
                    {activeScan.results && activeScan.results.length > 0 ? (
                      <div className="px-6 py-4">
                        {/* Scan info banner */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                              <CheckCircle className="h-3.5 w-3.5" />
                              {activeScan.results.filter((r) => r.is_passed).length} Passed
                            </span>
                            <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-500">
                              <XCircle className="h-3.5 w-3.5" />
                              {activeScan.results.filter((r) => !r.is_passed).length} Failed
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(activeScan.scan_date).toLocaleString()} · Score: {activeScan.overall_score}%
                          </span>
                        </div>

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
                            {activeScan.results.map((r) => (
                              <React.Fragment key={r.id}>
                                <tr
                                  className={`border-t border-gray-50 ${!r.is_passed ? 'cursor-pointer hover:bg-red-50/30' : ''} transition-colors`}
                                  onClick={() => !r.is_passed && toggleFailure(r.id)}
                                >
                                  <td className="py-2.5 pr-4">
                                    {r.is_passed ? (
                                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                                        <CheckCircle className="h-4 w-4" /> PASS
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
                                        <XCircle className="h-4 w-4" /> FAIL
                                        <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${expandedFailures[r.id] ? 'rotate-180' : ''}`} />
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
                                {/* Expanded evidence for failed checks */}
                                {!r.is_passed && expandedFailures[r.id] && (
                                  <tr key={`${r.id}-evidence`}>
                                    <td colSpan={5} className="py-0">
                                      <div className="mx-4 mb-3 mt-1 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-xs text-gray-600">
                                        <p className="font-semibold text-gray-700 mb-1">🔍 Wazuh Mapping Evidence</p>
                                        <div className="space-y-1">
                                          <p><span className="font-medium text-gray-500">Rule ID:</span> {r.wazuh_rule_id}</p>
                                          <p><span className="font-medium text-gray-500">Rule Description:</span> {r.rule_description || 'No description available'}</p>
                                          <p><span className="font-medium text-gray-500">Mapped Control:</span> {r.control_code} — {r.control_title || 'Untitled'}</p>
                                          <p><span className="font-medium text-gray-500">Framework:</span> {r.framework_name}</p>
                                          {r.remediation && (
                                            <p className="mt-2 p-2 rounded bg-amber-50 border border-amber-100 text-amber-700">
                                              <span className="font-semibold">💡 Remediation:</span> {r.remediation}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="px-6 py-6 text-center text-sm text-gray-400">
                        No detailed results available for this scan.
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
