import { useEffect, useState } from 'react';
import API from '../api/axios';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#38bdf8]" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[#0f172a]">Frameworks & Controls</h1>

      {frameworks.length === 0 ? (
        <p className="text-gray-400">No frameworks found.</p>
      ) : (
        <div className="space-y-4">
          {frameworks.map((fw) => {
            const fwControls = controls.filter((c) => c.framework === fw.id);
            const isExpanded = expandedFw === fw.id;

            return (
              <div
                key={fw.id}
                className="rounded-xl border border-gray-100 bg-white shadow-sm"
              >
                {/* Framework Header */}
                <button
                  onClick={() => toggleExpand(fw.id)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0f172a]">
                      <span className="text-sm font-bold text-[#38bdf8]">
                        {fw.name.slice(0, 3).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0f172a]">{fw.name}</h3>
                      <p className="text-xs text-gray-400">
                        Version {fw.version} · {fw.controls_count} control(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
                      {fw.controls_count} controls
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Controls List with Wazuh Mapping badges */}
                {isExpanded && fwControls.length > 0 && (
                  <div className="border-t border-gray-100 px-6 py-4">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          <th className="pb-2 pr-4">Code</th>
                          <th className="pb-2 pr-4">Title</th>
                          <th className="pb-2 pr-4">Wazuh Mappings</th>
                          <th className="pb-2 pr-4 text-right">Weight</th>
                          <th className="pb-2 text-center">Ref</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fwControls.map((ctrl) => (
                          <tr key={ctrl.id} className="border-t border-gray-50">
                            <td className="py-2.5 pr-4 font-mono text-xs font-semibold text-[#0f172a]">
                              {ctrl.control_code}
                            </td>
                            <td className="py-2.5 pr-4 font-medium text-gray-700">
                              {ctrl.title}
                            </td>
                            <td className="py-2.5 pr-4">
                              {ctrl.wazuh_mappings?.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {ctrl.wazuh_mappings.map(m => (
                                    <span key={m.id}
                                      className="rounded bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 cursor-default"
                                      title={m.rule_description}>
                                      🔗 {m.wazuh_rule_id}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">No mappings</span>
                              )}
                            </td>
                            <td className="py-2.5 pr-4 text-right">
                              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                                {ctrl.weight}
                              </span>
                            </td>
                            <td className="py-2.5 text-center">
                              <a
                                href="https://google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View external documentation"
                                className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-sky-500 dark:text-slate-500 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all duration-200"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
