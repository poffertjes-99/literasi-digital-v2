import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { KOMDIGI_FRAMEWORK, getLiteracyLevel } from '../../utils/scoring';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell,
} from 'recharts';
import { BarChart2, ChevronDown, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

// Module-level constants — defined once, never recreated
const KOMDIGI_KEYS = Object.keys(KOMDIGI_FRAMEWORK); // ['DSK','DET','DSA','DCU']
const PILLAR_COLORS = { DSK: '#3b82f6', DET: '#10b981', DSA: '#f59e0b', DCU: '#8b5cf6' };

// ──────────────────────────────────────────────────────────────────────────────
// aggregate — Pure function: computes avg KOMDIGI pillar scores from submissions
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
//
// Fetch strategy (cost-optimised):
//   • Sessions list: fetched once on mount.
//   • Submissions:   fetched lazily, keyed by session ID in an in-memory cache
//     (submissionsCacheRef).  A React ref is used as the cache backing store so
//     that useCallback functions always read the LATEST cache value without
//     needing it in their dependency arrays — this is the correct pattern to
//     avoid both stale-closure bugs and unnecessary re-creation of callbacks.
//   • A mounted-flag ref prevents setState calls after unmount (memory-leak
//     guard for the async Firestore fetches).
// ──────────────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [sessions, setSessions] = useState([]);
  // Trigger re-renders when the cache changes (ref alone won't trigger renders)
  const [cacheVersion, setCacheVersion] = useState(0);
  const [selectedId, setSelectedId] = useState('all');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // ✅ FIX 1: Use a ref as the cache backing store so callbacks always read the
  //    latest data without listing it in their dependency arrays.
  //    This eliminates the stale-closure risk AND the infinite-loop risk that
  //    would arise from `[submissionsCache]` in useCallback deps.
  const submissionsCacheRef = useRef({});

  // ✅ FIX 2: Unmount guard — prevents calling setState on an unmounted component
  //    (which fires when the admin navigates away while a Firestore fetch is in
  //    flight).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Step 1: Load sessions list on mount ──────────────────────────────────
  useEffect(() => {
    let cancelled = false; // local cancellation flag for this specific effect run
    async function fetchSessions() {
      setFetchError(null);
      try {
        const snap = await getDocs(
          query(collection(db, 'sessions'), orderBy('createdAt', 'desc')),
        );
        if (!cancelled && mountedRef.current) {
          setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      } catch (err) {
        console.error('AnalyticsPage: Failed to load sessions:', err);
        if (!cancelled && mountedRef.current) {
          setFetchError('Gagal memuat daftar sesi. Periksa koneksi internet Anda.');
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoadingSessions(false);
        }
      }
    }
    fetchSessions();
    return () => { cancelled = true; }; // cleanup if component remounts
  }, []);

  // ── Step 2: Core fetch function (stable reference — no deps on cache) ─────
  // ✅ FIX 3: Empty dep array [] — the function reads submissionsCacheRef.current
  //    directly (always fresh) instead of closing over a stale state snapshot.
  const fetchSubmissionsForSession = useCallback(async (sessionId) => {
    // Already cached — skip the network round-trip
    if (submissionsCacheRef.current[sessionId] !== undefined) return;

    try {
      const snap = await getDocs(
        collection(db, 'sessions', sessionId, 'submissions'),
      );
      if (!mountedRef.current) return; // unmounted during fetch — discard result
      const docs = snap.docs.map((d) => d.data());
      submissionsCacheRef.current = { ...submissionsCacheRef.current, [sessionId]: docs };
      setCacheVersion((v) => v + 1); // trigger re-render with the new cache data
    } catch (err) {
      console.error(`AnalyticsPage: Failed to load submissions for ${sessionId}:`, err);
      if (mountedRef.current) {
        setFetchError(`Gagal memuat submission untuk sesi ${sessionId}.`);
      }
    }
  }, []); // ✅ stable — no deps needed because we read from ref, not state

  // ── Step 3: Handle dropdown change ───────────────────────────────────────
  // ✅ FIX 4: `sessions` is the only real dependency here. `submissionsCacheRef`
  //    is a ref (stable identity), so it doesn't need to be listed.
  const handleSessionChange = useCallback(async (id) => {
    setSelectedId(id);
    setFetchError(null);
    setLoadingSubmissions(true);
    try {
      if (id === 'all') {
        // Fetch only sessions not yet in the cache
        const missing = sessions.filter(
          (s) => submissionsCacheRef.current[s.id] === undefined,
        );
        await Promise.all(missing.map((s) => fetchSubmissionsForSession(s.id)));
      } else {
        await fetchSubmissionsForSession(id);
      }
    } finally {
      if (mountedRef.current) setLoadingSubmissions(false);
    }
  }, [sessions, fetchSubmissionsForSession]); // ✅ correct — no cache state dep

  // ── Step 4: Auto-load "all" view after sessions are first fetched ─────────
  // The eslint-disable is intentional: we only want this to fire when `sessions`
  // changes (i.e., data first arrives), NOT every time handleSessionChange
  // changes identity. handleSessionChange IS stable (fixed deps above), but
  // we keep the comment to be explicit for future maintainers.
  useEffect(() => {
    if (sessions.length > 0 && selectedId === 'all') {
      handleSessionChange('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]); // intentional: only react to sessions arriving

  // ── Derived data (computed each render from the ref snapshot) ────────────
  // `cacheVersion` is intentionally read here to force re-evaluation after
  // the ref is mutated — this is the correct ref+version pattern.
  void cacheVersion; // suppress unused-var lint warnings
  const cache = submissionsCacheRef.current;

  const selectedSubmissions =
    selectedId === 'all'
      ? Object.values(cache).flat()
      : (cache[selectedId] || []);

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

  // ── Render states ─────────────────────────────────────────────────────────
  if (loadingSessions) {
    return <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />;
  }

  if (fetchError && sessions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-12 text-center">
        <AlertTriangle size={40} className="mx-auto text-red-400 mb-3" />
        <p className="text-slate-700 font-semibold">{fetchError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-black transition-colors"
        >
          <RefreshCw size={14} /> Muat Ulang
        </button>
      </div>
    );
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
            disabled={loadingSubmissions}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Non-blocking per-session error banner */}
      {fetchError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>{fetchError}</span>
          <button
            onClick={() => setFetchError(null)}
            className="ml-auto text-red-400 hover:text-red-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Index Hero Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white flex items-center justify-between flex-wrap gap-6 shadow-lg">
        <div>
          <p className="text-blue-200 text-sm font-medium mb-1">Indeks Literasi Digital Keseluruhan</p>
          <div className="text-7xl font-black tracking-tight min-h-[72px] flex items-center">
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
          <p className="text-slate-400 text-sm mt-1">
            {selectedId === 'all'
              ? 'Bagikan kode sesi kepada peserta untuk mulai mengumpulkan data.'
              : 'Sesi ini belum memiliki peserta yang menyelesaikan kuis.'}
          </p>
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