import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { KOMDIGI_FRAMEWORK, getLiteracyLevel } from '../../utils/scoring';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { BookOpen, Users, Activity, TrendingUp, Wifi } from 'lucide-react';

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 flex items-start gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-3xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [stats, setStats] = useState({ modules: 0, sessions: 0, submissions: 0, index: 0 });
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch modules + sessions in parallel
        const [modulesSnap, sessionsSnap] = await Promise.all([
          getDocs(collection(db, 'modules')),
          getDocs(query(collection(db, 'sessions'), orderBy('createdAt', 'desc'))),
        ]);

        // 2. For each session, read its `submissions` SUBCOLLECTION.
        //    We use submissionCount from the session doc (written by QuizPage via
        //    increment()) as the fast count, and only query subcollections for
        //    computing pillar averages.  This avoids reading the entire subcollections
        //    just for a count — an important cost-saving pattern.
        const KOMDIGI_KEYS = Object.keys(KOMDIGI_FRAMEWORK); // ['DSK','DET','DSA','DCU']
        const pillarTotals = Object.fromEntries(KOMDIGI_KEYS.map((k) => [k, 0]));
        const pillarCounts = Object.fromEntries(KOMDIGI_KEYS.map((k) => [k, 0]));

        let totalSubmissions = 0;

        await Promise.all(
          sessionsSnap.docs.map(async (sessionDoc) => {
            const sessionData = sessionDoc.data();

            // Fast count: use the denormalised counter maintained by QuizPage
            const count = Number(sessionData.submissionCount) || 0;
            totalSubmissions += count;

            // Only fetch sub-docs when the session has at least one submission
            // so we don't waste reads on empty sessions.
            if (count === 0) return;

            const subSnap = await getDocs(
              collection(db, 'sessions', sessionDoc.id, 'submissions'),
            );

            subSnap.docs.forEach((subDoc) => {
              const { scores = {} } = subDoc.data();
              KOMDIGI_KEYS.forEach((code) => {
                const val = scores[code];
                if (typeof val === 'number') {
                  pillarTotals[code] += val;
                  pillarCounts[code] += 1;
                }
              });
            });
          }),
        );

        // 3. Compute per-pillar averages
        const avgPillar = Object.fromEntries(
          KOMDIGI_KEYS.map((code) => [
            code,
            pillarCounts[code] > 0 ? Math.round(pillarTotals[code] / pillarCounts[code]) : 0,
          ]),
        );

        // 4. Overall index: only average pillars that actually have data
        const activePillarValues = KOMDIGI_KEYS
          .map((code) => avgPillar[code])
          .filter((v, i) => pillarCounts[KOMDIGI_KEYS[i]] > 0);

        const overallIndex =
          activePillarValues.length > 0
            ? Math.round(activePillarValues.reduce((a, b) => a + b, 0) / activePillarValues.length)
            : 0;

        setStats({
          modules: modulesSnap.size,
          sessions: sessionsSnap.size,
          submissions: totalSubmissions,
          index: overallIndex,
        });

        setChartData(
          KOMDIGI_KEYS.map((code) => ({
            pillar: KOMDIGI_FRAMEWORK[code].label,
            value: avgPillar[code],
          })),
        );
      } catch (e) {
        console.error('OverviewPage fetchData error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const level = getLiteracyLevel(stats.index);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Ringkasan data pengukuran literasi digital</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Modul" value={stats.modules} sub="modul soal tersedia" icon={BookOpen} color="bg-blue-500" />
        <StatCard label="Total Sesi" value={stats.sessions} sub="sesi pengujian" icon={Wifi} color="bg-indigo-500" />
        <StatCard label="Submission" value={stats.submissions} sub="peserta telah mengisi" icon={Users} color="bg-emerald-500" />
        <StatCard
          label="Indeks Literasi"
          value={`${stats.index}%`}
          sub={<span className={level.color}>{level.label}</span>}
          icon={TrendingUp}
          color="bg-amber-500"
        />
      </div>

      {/* Charts */}
      {stats.submissions > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-700 mb-4">Skor Rata-rata per Pilar</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="pillar" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Rata-rata']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-700 mb-4">Profil Literasi Digital</h2>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={chartData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Radar name="Literasi" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <Activity size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Belum ada data submission</p>
          <p className="text-slate-400 text-sm mt-1">
            Buat sesi dan bagikan kode kepada peserta untuk mulai mengumpulkan data.
          </p>
        </div>
      )}
    </div>
  );
}
