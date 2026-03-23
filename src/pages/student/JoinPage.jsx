import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../context/AuthContext';
import { parseStudentEmail } from '../../utils/studentEmailParser';
import { GraduationCap, ArrowRight, Loader2, AlertCircle, Mail, Hash, Info } from 'lucide-react';

export default function JoinPage() {
  const navigate = useNavigate();
  const { setStudentSession } = useAuth();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Real-time parsed preview (only show when something is typed)
  const preview = email.trim() ? parseStudentEmail(email) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Step 1 – Validate email format client-side
    const parsed = parseStudentEmail(email);
    if (!parsed.valid) {
      setError(parsed.message);
      return;
    }

    if (!code.trim()) {
      setError('Kode sesi tidak boleh kosong.');
      return;
    }

    setLoading(true);
    try {
      // Step 2 – Verify session code against Firestore
      const q = query(
        collection(db, 'sessions'),
        where('sessionCode', '==', code.trim().toUpperCase())
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setError('Kode sesi tidak ditemukan. Periksa kembali kode dari admin.');
        return;
      }

      const sessionDoc = snap.docs[0];
      const session = sessionDoc.data();
      const sessionId = sessionDoc.id;

      // Step 3 – Status must be exactly 'active'
      if (session.status !== 'active') {
        setError('Kode sesi tidak aktif. Sesi ini mungkin belum dibuka atau sudah ditutup. Hubungi admin untuk informasi lebih lanjut.');
        return;
      }

      // 🚨 ANTI-CHEATING CHECK: Does this NIM already have a submission?
      const submissionRef = doc(db, 'sessions', sessionId, 'submissions', parsed.studentId);
      const submissionSnap = await getDoc(submissionRef);

      if (submissionSnap.exists()) {
        setError(`Akses Ditolak: NIM ${parsed.studentId} sudah menyelesaikan ujian untuk sesi ini.`);
        return;
      }

      // Step 4 – All good: register student session in context
      const sessionCode = code.trim().toUpperCase();

      setStudentSession({
        studentId: parsed.studentId,
        jurusan: parsed.jurusan,
        angkatan: parsed.angkatan,
        email: email.trim(),
        sessionId,
        sessionCode,
      });

      navigate(`/quiz/${sessionCode}`, {
        state: { sessionId },
      });
    } catch (err) {
      console.error(err);
      setError('Koneksi gagal. Periksa jaringan Anda dan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-400/30 rounded-full blur-3xl animate-pulse [animation-delay:1.5s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-300/20 rounded-full blur-2xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Hero header */}
        <div className="text-center mb-8 text-white">
          <div className="w-16 h-16 bg-white/15 border border-white/25 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-xl">
            <GraduationCap size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Literasi Digital</h1>
          <p className="text-blue-200 mt-1 text-sm">Pengukuran Tingkat Literasi Digital · Kampus XYZ</p>
        </div>

        {/* Glassmorphism Card */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-1">Masuk sebagai Peserta</h2>
          <p className="text-blue-200 text-sm mb-6">Gunakan email kampus dan kode sesi dari dosen Anda.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Kampus Email */}
            <div>
              <label className="block text-xs font-semibold text-blue-100 mb-1.5 flex items-center gap-1.5">
                <Mail size={12} />
                Email Kampus *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="NIM_Jurusan_Angkatan@domain.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-white/10 border border-white/25 rounded-xl text-sm text-white placeholder-blue-300/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/15 transition-all"
              />
              {/* Real-time hint */}
              <div className="mt-2 flex items-start gap-1.5 text-xs">
                {preview ? (
                  preview.valid ? (
                    <span className="text-emerald-300 flex items-center gap-1">
                      <Info size={11} />
                      NIM: <strong>{preview.studentId}</strong> · Jurusan: <strong>{preview.jurusan}</strong> · Angkatan: <strong>{preview.angkatan}</strong>
                    </span>
                  ) : (
                    <span className="text-amber-300 flex items-center gap-1">
                      <Info size={11} />
                      Format: <em>NIM_Jurusan_Angkatan@domain.com</em>
                    </span>
                  )
                ) : (
                  <span className="text-blue-300/70 flex items-center gap-1">
                    <Info size={11} />
                    Contoh: 20230001_IF_2023@kampusxyz.ac.id
                  </span>
                )}
              </div>
            </div>

            {/* Session Code */}
            <div>
              <label className="block text-xs font-semibold text-blue-100 mb-1.5 flex items-center gap-1.5">
                <Hash size={12} />
                Kode Sesi *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g., AB12CD"
                maxLength={6}
                required
                className="w-full px-4 py-3.5 bg-white/10 border border-white/25 rounded-xl text-center text-2xl font-mono font-bold tracking-widest text-white uppercase placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/15 transition-all"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-red-500/20 border border-red-400/40 rounded-xl text-red-100 text-sm backdrop-blur-sm">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-300" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !code.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-white/20 hover:scale-[1.02] active:scale-100 mt-1"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin text-blue-600" />
              ) : (
                <ArrowRight size={18} />
              )}
              {loading ? 'Memeriksa...' : 'Mulai Ujian'}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-200/70 text-xs mt-6">
          Admin?{' '}
          <a href="/login" className="text-white underline hover:text-blue-100 transition-colors">
            Masuk ke console →
          </a>
        </p>
      </div>
    </div>
  );
}