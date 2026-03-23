import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../context/AuthContext';
import { calculateScores } from '../../utils/scoring';
import { ChevronRight, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

export default function QuizPage() {
  const { sessionCode } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { studentMeta, clearStudentSession } = useAuth();

  // Prefer context metadata (set by JoinPage), fall back to router state for resilience
  const sessionId = studentMeta?.sessionId || state?.sessionId;
  const studentId = studentMeta?.studentId || 'N/A';
  const jurusan   = studentMeta?.jurusan   || 'N/A';
  const angkatan  = studentMeta?.angkatan  || 'N/A';
  const studentName = studentId !== 'N/A' ? `${studentId} (${jurusan} ${angkatan})` : 'Peserta';

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
        setError('Gagal memuat soal. Coba lagi.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  const handleSelect = (optionIndex) => setSelected(optionIndex);

  const handleNext = async () => {
    if (selected === null) return;
    const q = questions[current];
    const opt = q.options[selected];
    const newAnswers = [...answers, { questionId: q.id, pillarCode: q.pillarCode, selectedWeight: opt.weight }];
    setAnswers(newAnswers);
    setSelected(null);

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      // Final submission
      setSubmitting(true);
      try {
        const { scores, overallIndex } = calculateScores(newAnswers);
        // Note: serverTimestamp() is NOT allowed inside arrayUnion().
        // Timestamp.now() is the correct approach for array elements.
        const submission = {
          studentId,
          jurusan,
          angkatan,
          studentName,
          submittedAt: Timestamp.now(),
          scores,
          overallIndex,
        };
        await updateDoc(doc(db, 'sessions', sessionId), {
          submissions: arrayUnion(submission),
        });
        clearStudentSession();
        navigate('/results', { state: { scores, overallIndex, studentId, jurusan, angkatan } });
      } catch (e) {
        setError('Gagal mengirim jawaban. Coba lagi.');
        setSubmitting(false);
        console.error(e);
      }
    }
  };

  const progress = questions.length > 0 ? ((current) / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-blue-600">
          <Loader2 size={32} className="animate-spin" />
          <p className="text-sm font-medium">Memuat soal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow p-8 text-center max-w-sm">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
          <h2 className="font-bold text-slate-800 mb-2">Oops!</h2>
          <p className="text-slate-500 text-sm">{error}</p>
          <a href="/join" className="mt-4 inline-block text-sm text-blue-600 hover:underline">← Kembali ke halaman masuk</a>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const charLabels = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Top Progress Header */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
              <ShieldCheck size={14} className="text-blue-600" />
              <span className="text-blue-700 font-semibold">Kode: {sessionCode}</span>
            </span>
            <span className="text-slate-500">Soal <span className="font-bold text-slate-800">{current + 1}</span> / {questions.length}</span>
          </div>
          {/* Progress Bar */}
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Question Card */}
      <main className="flex-1 flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-2xl space-y-4">
          {/* Scenario Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
            <div className="mb-2">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                Skenario {current + 1}
              </span>
            </div>
            <p className="text-slate-800 text-base md:text-lg font-medium leading-relaxed mt-3">
              {q.text}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Pilih responsmu:</p>
            {q.options?.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={`w-full text-left flex items-start gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                  selected === i
                    ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.01]'
                    : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/50 shadow-sm'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 mt-0.5 transition-colors ${
                  selected === i ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-slate-200 text-slate-500'
                }`}>
                  {charLabels[i]}
                </div>
                <span className={`flex-1 text-sm leading-relaxed ${selected === i ? 'text-blue-800 font-medium' : 'text-slate-700'}`}>
                  {opt.text}
                </span>
              </button>
            ))}
          </div>

          {/* Next / Submit Button */}
          <div className="flex justify-end">
            <button
              onClick={handleNext}
              disabled={selected === null || submitting}
              className="flex items-center gap-2 px-7 py-3.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Mengirim...</>
              ) : current + 1 === questions.length ? (
                <>Selesai & Kirim ✓</>
              ) : (
                <>Selanjutnya <ChevronRight size={16} /></>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
