import { useLocation, useNavigate } from 'react-router-dom';
import { PILLARS, getLiteracyLevel } from '../../utils/scoring';
import { Award, ArrowLeft, ShieldCheck, Printer, AlertCircle } from 'lucide-react';

export default function ResultPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  // 🚨 THE SHIELD: If they access this link directly without taking the quiz, prevent the crash
  if (!state || !state.scores) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Sesi Telah Berakhir</h2>
          <p className="text-slate-500 text-sm mb-6">
            Hasil ujian tidak ditemukan atau Anda mengakses tautan ini secara langsung. Silakan masuk kembali menggunakan kode sesi.
          </p>
          <button
            onClick={() => navigate('/join')}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Kembali ke Halaman Masuk
          </button>
        </div>
      </div>
    );
  }

  const { scores, overallIndex, studentId, jurusan, angkatan } = state;
  const level = getLiteracyLevel(overallIndex);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8 flex justify-center items-start print:bg-white print:p-0">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden print:shadow-none print:border-none print:rounded-none">

        {/* Header - Brand */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-center text-white print:bg-white print:text-slate-800 print:border-b print:border-slate-200">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm print:bg-blue-100 print:text-blue-600">
            <ShieldCheck size={32} className="print:text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Hasil Pengukuran Literasi Digital</h1>
          <p className="text-blue-200 text-sm print:text-slate-500">Kampus XYZ · Tahun Akademik {angkatan}</p>
        </div>

        <div className="p-8">
          {/* Student Info Card */}
          <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-4 print:bg-white print:border-slate-200">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Identitas Peserta</p>
              <p className="text-lg font-bold text-slate-800">{studentId}</p>
              <p className="text-sm text-slate-600">Program Studi {jurusan}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Waktu Penyelesaian</p>
              <p className="text-sm font-medium text-slate-800">
                {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Main Score Area */}
          <div className="flex flex-col items-center justify-center text-center mb-10">
            <div className="relative">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle cx="80" cy="80" r="70" className="stroke-slate-100" strokeWidth="12" fill="none" />
                <circle
                  cx="80" cy="80" r="70"
                  className={`stroke-current ${level.color}`}
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray="439.8"
                  strokeDashoffset={439.8 - (439.8 * overallIndex) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <span className="text-4xl font-black text-slate-800">{overallIndex}</span>
                <span className="text-sm font-bold text-slate-400 block mt-[-4px]">/ 100</span>
              </div>
            </div>
            <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full ${level.color.replace('text', 'bg').replace('600', '50')} border border-current border-opacity-20`}>
              <Award size={18} className={level.color} />
              <span className={`font-bold text-sm ${level.color}`}>Predikat: {level.label}</span>
            </div>
          </div>

          {/* Pillars Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Rincian per Pilar</h3>
            {Object.entries(scores).map(([code, score]) => {
              const pillar = PILLARS[code];
              if (!pillar) return null; // Safety check
              return (
                <div key={code} className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${pillar.bgColor} ${pillar.textColor}`}>
                    {code}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-sm font-semibold text-slate-700">{pillar.label}</span>
                      <span className="text-sm font-bold text-slate-800">{score}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${pillar.bgColor.replace('100', '500')}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions - Hidden when printing */}
          <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3 print:hidden">
            <button
              onClick={() => navigate('/join')}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-semibold transition-colors"
            >
              <ArrowLeft size={18} /> Selesai
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
            >
              <Printer size={18} /> Cetak Hasil (PDF)
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}