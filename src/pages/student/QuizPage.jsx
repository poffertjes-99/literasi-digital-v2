import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../context/AuthContext';
import { calculateScores } from '../../utils/scoring';
import { ChevronRight, ShieldCheck, Loader2, AlertCircle, Info } from 'lucide-react';

export default function QuizPage() {
  const { sessionCode } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  // 🚨 SYNC: Gunakan studentSession dari AuthContext
  const { studentSession } = useAuth();

  const sessionId = studentSession?.sessionId || state?.sessionId;
  const studentId = studentSession?.studentId || 'GUEST_USER';
  const jurusan = studentSession?.jurusan || 'GENERAL';
  const angkatan = studentSession?.angkatan || '2024';

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) { navigate('/join'); return; }
    async function load() {
      try {
        const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
        if (!sessionDoc.exists()) { setError('Sesi tidak ditemukan.'); return; }
        const sessionData = sessionDoc.data();
        setSession(sessionData);

        const qSnap = await getDocs(collection(db, 'modules', sessionData.moduleId, 'questions'));
        const qs = qSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (qs.length === 0) { setError('Modul ini belum memiliki soal.'); return; }
        setQuestions(qs);
      } catch (e) {
        setError('Gagal memuat soal. Periksa koneksi internet Anda.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, navigate]);

  const handleSelect = (index) => setSelected(index);

  const handleNext = async () => {
    if (selected === null) return;
    const q = questions[current];
    const opt = q.options[selected];

    const newAnswers = [...answers, {
      questionId: q.id,
      pillarCode: q.pillarCode || 'DSK',
      areaCode: q.areaCode || '1',
      selectedWeight: opt.weight
    }];
    setAnswers(newAnswers);
    setSelected(null);

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      setSubmitting(true);
      try {
        const { scores, overallIndex } = calculateScores(newAnswers);

        // 🚨 FIX: Menghapus karakter terlarang (seperti / atau .) dari ID dokumen
        const safeDocId = studentId.replace(/[^a-zA-Z0-9_-]/g, '_');

        const submissionRef = doc(db, 'sessions', sessionId, 'submissions', safeDocId);

        await setDoc(submissionRef, {
          studentId: studentId,
          email: studentSession?.email || 'guest@example.com',
          jurusan: jurusan,
          angkatan: angkatan,
          submittedAt: serverTimestamp(),
          scores: scores,
          overallIndex: overallIndex,
          rawAnswers: newAnswers
        });

        const sessionRef = doc(db, 'sessions', sessionId);
        await updateDoc(sessionRef, {
          submissionCount: increment(1)
        });

        // Pindah ke hasil tanpa menghapus sesi (akan dihapus di ResultPage)
        navigate('/results', { state: { scores, overallIndex, studentId, sessionId } });
      } catch (e) {
        console.error("Submission failed:", e);
        setError('Gagal mengirim jawaban: ' + e.message);
        setSubmitting(false);
      }
    }
  };

  const progress = questions.length > 0 ? (current / questions.length) * 100 : 0;

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Menyiapkan Skenario...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 text-center max-w-md shadow-xl border border-red-50">
        <AlertCircle size={50} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-black text-slate-800 mb-2">Terjadi Masalah</h2>
        <p className="text-slate-500 text-sm mb-6">{error}</p>
        <button onClick={() => navigate('/join')} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold">Kembali ke Beranda</button>
      </div>
    </div>
  );

  const q = questions[current];
  const charLabels = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Sesi Aktif</span>
              <div className="text-sm font-bold text-slate-800">{sessionCode}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
              <div className="text-sm font-bold text-slate-800">{current + 1} / {questions.length}</div>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldCheck size={100} /></div>
          <div className="relative z-10">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg uppercase tracking-widest mb-4 inline-block">Skenario {current + 1}</span>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 leading-relaxed italic">"{q.text}"</h2>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2 mb-2">
            <Info size={14} className="text-slate-400" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Pilih respons terbaik Anda:</p>
          </div>
          {q.options?.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={`w-full text-left flex items-start gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${selected === i ? 'border-blue-500 bg-blue-50/50 shadow-lg ring-4 ring-blue-50' : 'border-white bg-white hover:border-slate-200'
                }`}
            >
              <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black ${selected === i ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'
                }`}>{charLabels[i]}</div>
              <span className={`flex-1 text-sm font-medium ${selected === i ? 'text-blue-900' : 'text-slate-600'}`}>{opt.text}</span>
            </button>
          ))}
        </div>

        <div className="pt-6 flex justify-between items-center">
          <p className="text-[10px] text-slate-400 font-medium italic">ID Peserta: {studentId}</p>
          <button
            onClick={handleNext}
            disabled={selected === null || submitting}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black disabled:opacity-20 transition-all shadow-xl active:scale-95"
          >
            {submitting ? 'Mengirim...' : (current + 1 === questions.length ? 'Selesaikan Ujian ✓' : 'Lanjut →')}
          </button>
        </div>
      </main>
    </div>
  );
}