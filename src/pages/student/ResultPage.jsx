import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getLiteracyLevel, PILLARS } from '../../utils/scoring';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setStudentSession } = useAuth();
  const { scores, overallIndex, studentId } = location.state || {};

  useEffect(() => {
    // 🚨 MEMBERSIHKAN SESI: Agar mahasiswa bisa masuk ke sesi kuis lain nantinya
    if (location.state) {
      setStudentSession(null);
      localStorage.removeItem('student_session');
    }
  }, [location.state, setStudentSession]);

  if (!scores) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
        <p className="text-slate-500 mb-4 font-medium">Data hasil kuis tidak ditemukan.</p>
        <button onClick={() => navigate('/join')} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Kembali ke Halaman Masuk</button>
      </div>
    );
  }

  const level = getLiteracyLevel(overallIndex);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm text-center">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-800">Ujian Berhasil Dikirim!</h1>
          <p className="text-slate-500">Terima kasih atas partisipasinya, <span className="font-bold text-slate-800">{studentId}</span>.</p>

          <div className="mt-8 py-8 border-y border-slate-50">
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Index Literasi Digital Anda</p>
            <div className="text-7xl font-black text-blue-600 mb-2">{overallIndex}%</div>
            <div className={`text-lg font-bold ${level.color}`}>{level.label}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(scores).map(([code, score]) => {
            const pillar = PILLARS[code];
            return (
              <div key={code} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase">Area Global {code}</div>
                  <div className="text-sm font-bold text-slate-700">{pillar?.label}</div>
                </div>
                <div className="text-2xl font-black text-slate-800">{score}%</div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl active:scale-95"
        >
          Selesai & Keluar <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}