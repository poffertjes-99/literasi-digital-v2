import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { PILLARS, getLiteracyLevel } from '../../utils/scoring';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, Cell
} from 'recharts';
import { BarChart2, Users, TrendingUp, ChevronDown } from 'lucide-react';

const PILLAR_COLORS = { DSK: '#3b82f6', DET: '#10b981', DSA: '#f59e0b', DCU: '#8b5cf6' };

function aggregate(submissions) {
  if (!submissions.length) return { scores: { DSK: 0, DET: 0, DSA: 0, DCU: 0 }, index: 0 };
  const totals = { DSK: 0, DET: 0, DSA: 0, DCU: 0 };
  const counts = { DSK: 0, DET: 0, DSA: 0, DCU: 0 };
  submissions.forEach(({ scores = {} }) => {
    Object.keys(PILLARS).forEach((code) => {
      if (scores[code] !== undefined) { totals[code] += scores[code]; counts[code]++; }
    });
  });
  const avg = {};
  Object.keys(PILLARS).forEach((code) => { avg[code] = counts[code] > 0 ? Math.round(totals[code] / counts[code]) : 0; });
  const index = Math.round(Object.values(avg).reduce((a, b) => a + b, 0) / 4);
  return { scores: avg, index };
}

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, 'sessions'), orderBy('createdAt', 'desc'))).then((snap) => {
      setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const selectedSubmissions = selectedId === 'all'
    ? sessions.flatMap((s) => s.submissions || [])
    : (sessions.find((s) => s.id === selectedId)?.submissions || []);

  const { scores, index } = aggregate(selectedSubmissions);
  const level = getLiteracyLevel(index);

  const barData = Object.keys(PILLARS).map((code) => ({
    name: PILLARS[code].label,
    code,
    value: scores[code],
  }));
  const radarData = Object.keys(PILLARS).map((code) => ({
    pillar: code,
    value: scores[code],
  }));

  const tableData = Object.keys(PILLARS).map((code) => ({ code, label: PILLARS[code].label, score: scores[code], level: getLiteracyLevel(scores[code]) }));

  if (loading) return <div className="h-96 bg-slate-100 rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics — Index Overview</h1>
          <p className="text-slate-500 text-sm mt-1">Kalkulasi indeks literasi digital otomatis berdasarkan submission peserta</p>
        </div>
        {/* Session Filter */}
        <div className="relative">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
          >
            <option value="all">Semua Sesi</option>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.name || s.sessionCode}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Index Hero Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white flex items-center justify-between flex-wrap gap-6">
        <div>
          <p className="text-blue-200 text-sm font-medium mb-1">Indeks Literasi Digital Keseluruhan</p>
          <div className="text-7xl font-black tracking-tight">{index}<span className="text-3xl font-semibold text-blue-200">%</span></div>
          <p className="text-blue-100 mt-2 font-medium">{level.label}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-blue-200 text-xs">Total Peserta</p>
            <p className="text-2xl font-bold mt-1">{selectedSubmissions.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-blue-200 text-xs">Sesi Dipilih</p>
            <p className="text-2xl font-bold mt-1">{selectedId === 'all' ? sessions.length : 1}</p>
          </div>
        </div>
      </div>

      {selectedSubmissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <BarChart2 size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Belum ada submission untuk sesi ini</p>
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
                  <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
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
                  <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Radar name="Skor" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
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
                      <span className="font-mono font-bold text-xs px-2 py-1 rounded-md" style={{ background: PILLAR_COLORS[code] + '22', color: PILLAR_COLORS[code] }}>
                        {code}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-700">{label}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-slate-800">{score}%</td>
                    <td className="px-6 py-3.5 text-right">
                      <span className={`text-xs font-medium ${lv.color}`}>{lv.label}</span>
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
