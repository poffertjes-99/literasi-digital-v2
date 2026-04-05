import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../context/AuthContext';
import { calculateScores } from '../../utils/scoring';
import { ChevronRight, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

export default function QuizPage() {
  const { sessionCode } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { studentSession } = useAuth();

  const sessionId = studentSession?.sessionId || state?.sessionId;
  const studentId = studentSession?.studentId || 'GUEST';
  const jurusan = studentSession?.jurusan || 'N/A';
  const angkatan = studentSession?.angkatan || 'N/A';

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
        setError('Gagal memuat kuis.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, navigate]);

  const handleNext = async () => {
    if (selected === null) return;
    const q = questions[current];
    const opt = q.options[selected];
    const newAnswers = [...answers, {
      questionId: q.id,
      pillarCode: q.pillarCode,
      areaCode: q.areaCode,
      selectedWeight: opt.weight
    }];
    setAnswers(newAnswers);
    setSelected(null);

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      setSubmitting(true);
      try {
        const { komdigiScores, areaScores, overallIndex } = calculateScores(newAnswers);

        // Sanitise studentId: remove '/' and other Firestore-illegal chars
        const safeId = studentId.replace(/[^a-zA-Z0-9_-]/g, '_');

        const submission = {
          studentId, jurusan, angkatan,
          // komdigiScores is keyed DSK/DET/DSA/DCU — used by admin analytics
          scores: komdigiScores,
          // areaScores is keyed '0'–'6' — stored for potential UNESCO breakdown views
          areaScores,
          overallIndex,
          submittedAt: serverTimestamp(),
          rawAnswers: newAnswers
        };

        // 1. Simpan hasil
        await setDoc(doc(db, 'sessions', sessionId, 'submissions', safeId), submission);

        // 2. Update Counter Sesi (Butuh Rules 'allow update' di atas)
        await updateDoc(doc(db, 'sessions', sessionId), {
          submissionCount: increment(1)
        });

        navigate('/results', { state: { scores: komdigiScores, overallIndex, studentId } });
      } catch (e) {
        console.error("Submission failed:", e);
        setError('Gagal mengirim jawaban: ' + e.message);
        setSubmitting(false);
      }
    }
  };

  const progress = questions.length > 0 ? (current / questions.length) * 100 : 0;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm border border-red-100">
        <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
        <h2 className="text-lg font-bold text-slate-800">Gagal Mengirim</h2>
        <p className="text-slate-500 text-sm mt-2">{error}</p>
        <button onClick={() => navigate('/join')} className="mt-6 w-full py-3 bg-slate-800 text-white rounded-xl font-bold">Kembali</button>
      </div>
    </div>
  );

  const q = questions[current];
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Sesi: {sessionCode}</span>
          <span className="text-xs font-bold text-slate-400">{current + 1} / {questions.length}</span>
        </div>
        <div className="max-w-2xl mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 py-8 space-y-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 block">Skenario {current + 1}</span>
          <h2 className="text-lg font-bold text-slate-800 leading-relaxed italic">"{q.text}"</h2>
        </div>

        <div className="space-y-3">
          {q.options?.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${selected === i ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-white bg-white hover:border-slate-200'
                }`}
            >
              <div className="flex gap-4 items-start">
                <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black ${selected === i ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span className={`text-sm font-medium ${selected === i ? 'text-blue-900' : 'text-slate-700'}`}>{opt.text}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="pt-6 flex justify-end">
          <button
            onClick={handleNext}
            disabled={selected === null || submitting}
            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black disabled:opacity-20 shadow-xl"
          >
            {submitting ? 'Mengirim...' : (current + 1 === questions.length ? 'Submit ✓' : 'Selanjutnya →')}
          </button>
        </div>
      </main>
    </div>
  );
}