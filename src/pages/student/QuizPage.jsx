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

  // Mengambil studentSession dari AuthContext (tahan refresh via localStorage)
  const { studentSession, setStudentSession } = useAuth();

  // Preferensi data dari studentSession, fallback ke router state
  const sessionId = studentSession?.sessionId || state?.sessionId;
  const studentId = studentSession?.studentId || 'UNKNOWN';
  const jurusan = studentSession?.jurusan || 'GUEST';
  const angkatan = studentSession?.angkatan || 'OTHER';
  const email = studentSession?.email || 'N/A';

  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Jika tidak ada sessionId di memori atau storage, tendang ke halaman Join
    if (!sessionId) {
      navigate('/join');
      return;
    }

    async function load() {
      try {
        const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
        if (!sessionDoc.exists()) {
          setError('Sesi tidak ditemukan atau sudah dihapus.');
          return;
        }

        const sessionData = sessionDoc.data();
        setSession(sessionData);

        // Mengambil soal dari modul yang terkait dengan sesi ini
        const qSnap = await getDocs(collection(db, 'modules', sessionData.moduleId, 'questions'));
        const qs = qSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        if (qs.length === 0) {
          setError('Modul ini belum memiliki butir soal skenario.');
          return;
        }

        setQuestions(qs);
      } catch (e) {
        setError('Gagal memuat kuis. Periksa koneksi internet Anda.');
        console.error("Load Quiz Error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId, navigate]);

  const handleSelect = (optionIndex) => setSelected(optionIndex);

  const handleNext = async () => {
    if (selected === null) return;

    const q = questions[current];
    const opt = q.options[selected];

    // Simpan jawaban beserta kode mapping untuk kalkulasi skor akhir
    const newAnswers = [...answers, {
      questionId: q.id,
      pillarCode: q.pillarCode, // Komdigi
      areaCode: q.areaCode,     // UNESCO Area
      selectedWeight: opt.weight
    }];

    setAnswers(newAnswers);
    setSelected(null);

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      // PROSES SUBMIT AKHIR
      setSubmitting(true);
      try {
        const { scores, overallIndex } = calculateScores(newAnswers);

        // 🚨 FIX ERROR 5 SEGMENTS: Bersihkan ID dari karakter ilegal seperti "/" 
        // yang biasanya ada di string "N/A" atau format email tertentu.
        const safeDocId = studentId.replace(/[^a-zA-Z0-9_-]/g, '_');

        const submission = {
          studentId,
          email,
          jurusan,
          angkatan,
          submittedAt: serverTimestamp(),
          scores,
          overallIndex,
          rawAnswers: newAnswers
        };

        // 1. Simpan hasil ke sub-koleksi submissions di dalam dokumen session
        const submissionRef = doc(db, 'sessions', sessionId, 'submissions', safeDocId);
        await setDoc(submissionRef, submission);

        // 2. Update counter jumlah peserta pada dokumen utama sesi
        const sessionRef = doc(db, 'sessions', sessionId);
        await updateDoc(sessionRef, {
          submissionCount: increment(1)
        });

        // Jangan hapus studentSession di sini agar ResultPage masih bisa membaca NIM-nya
        // Penghapusan sesi dilakukan di ResultPage setelah render selesai.
        navigate('/results', { state: { scores, overallIndex, studentId, sessionId } });
      } catch (e) {
        setError('Gagal mengirim hasil. Silakan coba lagi.');
        setSubmitting(false);
        console.error("Submission Error:", e);
      }
    }
  };

  const progress = questions.length > 0 ? ((current) / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-bold animate-pulse tracking-widest uppercase text-xs">Menyiapkan Skenario...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-red-100 shadow-xl p-10 text-center max-w-md">
          <AlertCircle size={50} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-800 mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">{error}</p>
          <button
            onClick={() => navigate('/join')}
            className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-black transition-all"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const charLabels = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Quiz Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Sesi Aktif</span>
              <span className="text-sm font-bold text-slate-800">{sessionCode}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
              <div className="text-sm font-bold text-slate-800">{current + 1} <span className="text-slate-300 font-medium">/ {questions.length}</span></div>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 space-y-6">

        {/* Scenario Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldCheck size={100} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg uppercase tracking-widest">Skenario {current + 1}</span>
              <div className="h-px flex-1 bg-slate-50" />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 leading-relaxed italic">
              "{q.text}"
            </h2>
          </div>
        </div>

        {/* Options List */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2 mb-2">
            <Info size={14} className="text-slate-400" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Pilih tindakan terbaik Anda:</p>
          </div>

          {q.options?.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={`w-full text-left flex items-start gap-4 p-5 rounded-2xl border-2 transition-all duration-300 ${selected === i
                ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-100 ring-4 ring-blue-50'
                : 'border-white bg-white hover:border-slate-200 shadow-sm'
                }`}
            >
              <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-black transition-all ${selected === i ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'
                }`}>
                {charLabels[i]}
              </div>
              <span className={`flex-1 text-sm md:text-base leading-relaxed font-medium ${selected === i ? 'text-blue-900' : 'text-slate-600'
                }`}>
                {opt.text}
              </span>
            </button>
          ))}
        </div>

        {/* Footer Navigation */}
        <div className="pt-6 flex justify-between items-center">
          <p className="text-[10px] text-slate-400 font-medium italic">Data NIM: {studentId}</p>
          <button
            onClick={handleNext}
            disabled={selected === null || submitting}
            className="group flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black disabled:opacity-20 disabled:grayscale transition-all shadow-xl active:scale-95"
          >
            {submitting ? (
              <><Loader2 size={18} className="animate-spin" /> Mengirim...</>
            ) : current + 1 === questions.length ? (
              <>Selesaikan Pengukuran ✓</>
            ) : (
              <>Pertanyaan Berikutnya <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}