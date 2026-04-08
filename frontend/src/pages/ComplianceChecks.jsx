import { useEffect, useState } from 'react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Search, PlayCircle, CheckCircle, XCircle, ShieldCheck,
  Laptop, UserCheck, Bug, Sliders, EyeOff, CloudUpload, Router, Key,
} from 'lucide-react';

/* icon lookup by control code prefix */
const ICON_MAP = {
  'A.8.1': Laptop, 'A.8.19': Laptop,
  'A.8.2': UserCheck, 'A.8.3': UserCheck, 'A.8.4': UserCheck, 'A.8.5': UserCheck,
  'A.8.7': Bug,
  'A.8.9': Sliders, 'A.8.6': Sliders,
  'A.8.12': EyeOff, 'A.8.10': EyeOff,
  'A.8.13': CloudUpload, 'A.8.14': CloudUpload,
  'A.8.20': Router, 'A.8.21': Router, 'A.8.22': Router,
  'A.8.24': Key,
};

function getIcon(code) {
  for (const [prefix, Icon] of Object.entries(ICON_MAP)) {
    if (code && code.startsWith(prefix)) return Icon;
  }
  return ShieldCheck;
}

export default function ComplianceChecks() {
  const { role } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState('');
  const [scanMsg, setScanMsg] = useState('');

  const fetchResults = () => {
    API.get('scan-results/?page_size=100')
      .then((res) => setResults(res.data.results || res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchResults(); }, []);

  const runManualScan = async () => {
    setScanning(true);
    setScanMsg('');
    try {
      const res = await API.post('run-scan/');
      setScanMsg(res.data.message || 'Scan completed successfully!');
      fetchResults(); // refresh
    } catch (err) {
      setScanMsg('Scan failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#38bdf8]" />
      </div>
    );
  }

  const filtered = results.filter((r) => {
    const text = `${r.control_code} ${r.control_title} ${r.rule_description} ${r.wazuh_rule_id}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0f172a]">Compliance Checks</h1>
        {role !== 'auditor' && (
          <button onClick={runManualScan} disabled={scanning}
            className="flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e293b] disabled:opacity-60 cursor-pointer">
            {scanning ? (
              <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Scanning...</>
            ) : (
              <><PlayCircle className="h-4 w-4" /> Run Manual Scan</>
            )}
          </button>
        )}
      </div>

      {scanMsg && (
        <div className={`mb-5 rounded-lg px-4 py-3 text-sm font-medium ${
          scanMsg.includes('failed') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          {scanMsg}
        </div>
      )}

      {/* Search */}
      <div className="mb-5 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 px-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by control ID or keyword..."
            className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none" />
        </div>
      </div>

      {/* Check Cards */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-10">No compliance check results found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const Icon = getIcon(r.control_code);
            return (
              <div key={r.id} className="rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                      <Icon className="h-5 w-5 text-[#0f172a]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0f172a]">
                        {r.control_code} — {r.control_title || 'Untitled'}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">{r.rule_description || 'No description'}</p>
                    </div>
                  </div>
                  {r.is_passed ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
                      <CheckCircle className="h-3.5 w-3.5" /> PASS
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500">
                      <XCircle className="h-3.5 w-3.5" /> FAIL
                    </span>
                  )}
                </div>

                {!r.is_passed && (
                  <div className="mx-5 mb-4 rounded-lg bg-gray-50 px-4 py-2.5 text-xs text-gray-500">
                    <span className="font-semibold">ℹ️ Evidence:</span> Check "{r.wazuh_rule_id}" — rule failed on agent scan.
                    {r.remediation && <span className="block mt-1">💡 Remediation: {r.remediation}</span>}
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
