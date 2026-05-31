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

  // ── SBA field fallbacks ─────────────────────────────────────────────────────
  // New schema: { scenarioText, questionText, options[] }
  // Old schema: { text, options[] }
  // The || operator makes both schemas render correctly without crashing.
  const scenarioText = q.scenarioText || q.text || '';
  const questionText = q.questionText || '';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Sticky header: session label + progress bar ── */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto flex justify-between items-center mb-2">
          <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">
            Sesi: {sessionCode}
          </span>
          <span className="text-xs font-bold text-slate-400 tabular-nums">
            {current + 1} / {questions.length}
          </span>
        </div>
        <div className="max-w-2xl mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-5">

        {/* ── Stimulus / Scenario Box ─────────────────────────────────────── */}
        <div className="bg-slate-50 border-l-4 border-indigo-600 p-5 rounded-r-lg shadow-sm">
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.18em] mb-2">
            🗂 Skenario Kasus
          </p>
          <p className="text-sm text-slate-700 leading-relaxed">
            {scenarioText}
          </p>
        </div>

        {/* ── Question Text ───────────────────────────────────────────────── */}
        <div className="px-1">
          {questionText ? (
            <p className="text-xl font-semibold text-slate-800 leading-snug">
              {questionText}
            </p>
          ) : (
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
              Pilih tindakan terbaik yang akan Anda lakukan:
            </p>
          )}
        </div>

        {/* ── Weighted Option Cards ───────────────────────────────────────── */}
        <div className="space-y-3">
          {q.options?.map((opt, i) => {
            const isSelected = selected === i;
            return (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 group ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-100'
                    : 'border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-sm'
                }`}
              >
                <div className="flex gap-4 items-start">
                  {/* Letter badge */}
                  <div
                    className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                  {/* Option text */}
                  <span
                    className={`text-sm font-medium leading-relaxed transition-colors ${
                      isSelected ? 'text-indigo-900' : 'text-slate-700'
                    }`}
                  >
                    {opt.text}
                  </span>
                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Navigation / Submit Button ──────────────────────────────────── */}
        <div className="pt-4 flex justify-end">
          <button
            onClick={handleNext}
            disabled={selected === null || submitting}
            className="inline-flex items-center gap-2 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black disabled:opacity-20 transition-all shadow-xl active:scale-95"
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Mengirim...</>
            ) : current + 1 === questions.length ? (
              <><ShieldCheck size={16} /> Submit</>
            ) : (
              <>Selanjutnya <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}