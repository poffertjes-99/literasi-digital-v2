import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { KOMDIGI_FRAMEWORK, getLiteracyLevel } from '../../utils/scoring';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell,
} from 'recharts';
import { BarChart2, ChevronDown, Loader2 } from 'lucide-react';

// KOMDIGI 4-pillar keys — must match the `scores` field written by QuizPage
const KOMDIGI_KEYS = Object.keys(KOMDIGI_FRAMEWORK); // ['DSK','DET','DSA','DCU']

const PILLAR_COLORS = { DSK: '#3b82f6', DET: '#10b981', DSA: '#f59e0b', DCU: '#8b5cf6' };

// ──────────────────────────────────────────────────────────────────────────────
// aggregate — Compute avg pillar scores + overall index from a submissions array
// ──────────────────────────────────────────────────────────────────────────────
function aggregate(submissions) {
  if (!submissions || submissions.length === 0) {
    return {
      scores: Object.fromEntries(KOMDIGI_KEYS.map((k) => [k, 0])),
      index: 0,
    };
  }

  const totals = Object.fromEntries(KOMDIGI_KEYS.map((k) => [k, 0]));
  const counts = Object.fromEntries(KOMDIGI_KEYS.map((k) => [k, 0]));

  submissions.forEach(({ scores = {} }) => {
    KOMDIGI_KEYS.forEach((code) => {
      const val = scores[code];
      if (typeof val === 'number') {
        totals[code] += val;
        counts[code] += 1;
      }
    });
  });

  const avg = Object.fromEntries(
    KOMDIGI_KEYS.map((code) => [
      code,
      counts[code] > 0 ? Math.round(totals[code] / counts[code]) : 0,
    ]),
  );

  // Only average pillars that actually received answers (avoids zero-credit drag)
  const activePillarValues = KOMDIGI_KEYS
    .map((code) => avg[code])
    .filter((_, i) => counts[KOMDIGI_KEYS[i]] > 0);

  const index =
    activePillarValues.length > 0
      ? Math.round(activePillarValues.reduce((a, b) => a + b, 0) / activePillarValues.length)
      : 0;

  return { scores: avg, index };
}

// ──────────────────────────────────────────────────────────────────────────────
// AnalyticsPage
// Strategy: fetch ONLY the sessions list on mount (cheap).  When the admin
// selects a specific session from the dropdown, fetch that session's submissions
// subcollection on demand.  The "All Sessions" view pre-fetches all
// subcollections once (triggered by the initial mount after sessions load).
// This eliminates the N+1 read storm that previously fired unconditionally.
// ──────────────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [sessions, setSessions] = useState([]);
  // Cache so repeated dropdown changes don't re-fetch already-loaded data
  const [submissionsCache, setSubmissionsCache] = useState({});
  const [selectedId, setSelectedId] = useState('all');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Determine which submission docs contribute to the current view
  const selectedSubmissions =
    selectedId === 'all'
      ? Object.values(submissionsCache).flat()
      : (submissionsCache[selectedId] || []);

  // ── Step 1: Load sessions list on mount ──────────────────────────────────
  useEffect(() => {
    async function fetchSessions() {
      try {
        const snap = await getDocs(
          query(collection(db, 'sessions'), orderBy('createdAt', 'desc')),
        );
        setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to load sessions:', err);
      } finally {
        setLoadingSessions(false);
      }
    }
    fetchSessions();
  }, []);

  // ── Step 2: Fetch submissions for the selected session (lazy) ────────────
  const fetchSubmissionsForSession = useCallback(
    async (sessionId) => {
      // Already cached — skip the network round-trip
      if (submissionsCache[sessionId] !== undefined) return;

      setLoadingSubmissions(true);
      try {
        const snap = await getDocs(
          collection(db, 'sessions', sessionId, 'submissions'),
        );
        const docs = snap.docs.map((d) => d.data());
        setSubmissionsCache((prev) => ({ ...prev, [sessionId]: docs }));
      } catch (err) {
        console.error(`Failed to load submissions for session ${sessionId}:`, err);
      } finally {
        setLoadingSubmissions(false);
      }
    },
    [submissionsCache],
  );

  // ── Step 3: Handle dropdown change ───────────────────────────────────────
  const handleSessionChange = useCallback(
    async (id) => {
      setSelectedId(id);
      if (id === 'all') {
        // Fetch all sessions that haven't been cached yet
        setLoadingSubmissions(true);
        try {
          const missing = sessions.filter((s) => submissionsCache[s.id] === undefined);
          await Promise.all(missing.map((s) => fetchSubmissionsForSession(s.id)));
        } finally {
          setLoadingSubmissions(false);
        }
      } else {
        await fetchSubmissionsForSession(id);
      }
    },
    [sessions, submissionsCache, fetchSubmissionsForSession],
  );

  // ── Step 4: Auto-load first session on initial data arrival ──────────────
  useEffect(() => {
    if (sessions.length > 0 && selectedId === 'all') {
      // Kick off a background fetch for "all" view so charts populate immediately
      handleSessionChange('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  // ── Derived chart data ────────────────────────────────────────────────────
  const { scores, index } = aggregate(selectedSubmissions);
  const level = getLiteracyLevel(index);

  const barData = KOMDIGI_KEYS.map((code) => ({
    name: KOMDIGI_FRAMEWORK[code].label,
    code,
    value: scores[code],
  }));

  const radarData = KOMDIGI_KEYS.map((code) => ({
    pillar: KOMDIGI_FRAMEWORK[code].label,
    value: scores[code],
  }));

  const tableData = KOMDIGI_KEYS.map((code) => ({
    code,
    label: KOMDIGI_FRAMEWORK[code].label,
    score: scores[code],
    level: getLiteracyLevel(scores[code]),
  }));

  if (loadingSessions) {
    return <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics — Index Overview</h1>
          <p className="text-slate-500 text-sm mt-1">
            Kalkulasi indeks literasi digital otomatis berdasarkan submission peserta
          </p>
        </div>

        {/* Session Filter */}
        <div className="relative">
          <select
            id="session-filter"
            value={selectedId}
            onChange={(e) => handleSessionChange(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-sm"
          >
            <option value="all">Semua Sesi</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.sessionCode}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Index Hero Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white flex items-center justify-between flex-wrap gap-6 shadow-lg">
        <div>
          <p className="text-blue-200 text-sm font-medium mb-1">Indeks Literasi Digital Keseluruhan</p>
          <div className="text-7xl font-black tracking-tight">
            {loadingSubmissions ? (
              <Loader2 size={48} className="animate-spin text-blue-200" />
            ) : (
              <>{index}<span className="text-3xl font-semibold text-blue-200">%</span></>
            )}
          </div>
          <p className="text-blue-100 mt-2 font-medium">{level.label}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">Total Peserta</p>
            <p className="text-2xl font-bold mt-1">{selectedSubmissions.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <p className="text-blue-200 text-xs uppercase tracking-wider font-semibold">Sesi Dipilih</p>
            <p className="text-2xl font-bold mt-1">
              {selectedId === 'all' ? sessions.length : 1}
            </p>
          </div>
        </div>
      </div>

      {loadingSubmissions ? (
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      ) : selectedSubmissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <BarChart2 size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Belum ada submission untuk filter ini</p>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Skor per Pilar (%)</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(v) => [`${v}%`]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {barData.map((entry) => (
                      <Cell key={entry.code} fill={PILLAR_COLORS[entry.code]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Profil Radar Literasi</h2>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Radar name="Skor" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="#6366f1" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pillar Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Breakdown per Pilar</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 font-semibold">Kode</th>
                  <th className="text-left px-6 py-3 font-semibold">Pilar</th>
                  <th className="text-right px-6 py-3 font-semibold">Skor Rata-rata</th>
                  <th className="text-right px-6 py-3 font-semibold">Level</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map(({ code, label, score, level: lv }) => (
                  <tr key={code} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <span
                        className="font-mono font-bold text-xs px-2 py-1 rounded-md"
                        style={{ background: PILLAR_COLORS[code] + '22', color: PILLAR_COLORS[code] }}
                      >
                        {code}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 font-medium">{label}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-slate-800">{score}%</td>
                    <td className="px-6 py-3.5 text-right">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${lv.color.replace('text', 'bg').replace('600', '50')} ${lv.color} ${lv.color.replace('text', 'border').replace('600', '200')}`}
                      >
                        {lv.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}