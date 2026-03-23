import { useLocation } from 'react-router-dom';
import { PILLARS, getLiteracyLevel } from '../../utils/scoring';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { CheckCircle2, ShieldCheck } from 'lucide-react';

export default function ResultPage() {
  const { state } = useLocation();

  // If navigated here directly without state, show fallback
  if (!state?.scores) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl p-8 text-center shadow border border-slate-100 max-w-sm">
          <p className="text-slate-500 mb-4">Tidak ada hasil untuk ditampilkan.</p>
          <a href="/join" className="text-blue-600 text-sm hover:underline">
            Kembali ke halaman masuk →
          </a>
        </div>
      </div>
    );
  }

  const { scores, overallIndex, studentId, jurusan, angkatan } = state;
  const level = getLiteracyLevel(overallIndex);
  const displayName = studentId && studentId !== 'N/A'
    ? `${studentId} · ${jurusan} ${angkatan}`
    : 'Peserta';

  const radarData = Object.keys(PILLARS).map((code) => ({
    pillar: PILLARS[code].label,
    value: scores[code] || 0,
  }));

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 65) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">Literasi Digital · Kampus XYZ</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Success Banner */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Ujian Selesai!</h1>
          <p className="text-slate-500 text-sm mt-1">
            Jawaban Anda telah berhasil disimpan.
          </p>
          {studentId && studentId !== 'N/A' && (
            <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 text-xs text-blue-700 font-medium">
              <span>NIM: <strong>{studentId}</strong></span>
              <span className="text-blue-300">·</span>
              <span>{jurusan}</span>
              <span className="text-blue-300">·</span>
              <span>Angkatan {angkatan}</span>
            </div>
          )}
        </div>

        {/* Overall Index Hero */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white text-center shadow-lg">
          <p className="text-blue-200 text-sm font-medium mb-1">Indeks Literasi Digital Anda</p>
          <div className="text-8xl font-black tracking-tight mt-2">
            {overallIndex}<span className="text-4xl text-blue-200">%</span>
          </div>
          <p className={`mt-3 text-lg font-bold ${level.color.replace('text-', 'text-')} bg-white/15 inline-block px-4 py-1 rounded-full`}>
            {level.label}
          </p>
        </div>

        {/* Pillar Score Cards */}
        <div className="grid grid-cols-2 gap-3">
          {Object.keys(PILLARS).map((code) => {
            const pillar = PILLARS[code];
            const score = scores[code] || 0;
            const pillarlevel = getLiteracyLevel(score);
            return (
              <div key={code} className={`bg-white rounded-2xl border-2 ${pillar.borderColor} p-5 shadow-sm flex flex-col`}>
                <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${pillar.bgColor} ${pillar.textColor} self-start mb-3`}>
                  {code}
                </div>
                <p className="text-xs text-slate-500 mb-0.5">{pillar.label}</p>
                <p className={`text-3xl font-black ${getScoreColor(score)}`}>{score}<span className="text-base font-medium text-slate-400">%</span></p>
                <p className={`text-xs font-medium mt-1 ${pillarlevel.color}`}>{pillarlevel.label}</p>
                {/* Mini progress bar */}
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${score}%`, backgroundColor: pillar.color }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Radar Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Profil Literasi Digital Anda</h2>
          <p className="text-xs text-slate-400 mb-4">Visualisasi keseimbangan 4 pilar kompetensi</p>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10, fill: '#64748b' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Radar name="Skor" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda Pilar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Keterangan Pilar</h2>
          <div className="space-y-2">
            {Object.keys(PILLARS).map((code) => (
              <div key={code} className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${PILLARS[code].bgColor} ${PILLARS[code].textColor}`}>{code}</span>
                <span className="text-sm text-slate-600">{PILLARS[code].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-2 pb-8">
          <p className="text-slate-400 text-xs">
            Hasil ini telah dicatat oleh sistem. Silakan tutup halaman ini.
          </p>
        </div>
      </main>
    </div>
  );
}
