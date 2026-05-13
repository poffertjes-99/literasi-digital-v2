import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../../firebase';
import { useAuth } from '../../context/AuthContext';
import { parseStudentEmail } from '../../utils/studentEmailParser';
import {
  GraduationCap,
  ArrowRight,
  Loader2,
  AlertCircle,
  LogOut,
  Hash,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Helper – force Google to always show the account-chooser dialog
// ---------------------------------------------------------------------------
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default function JoinPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, setStudentSession } = useAuth();

  const [code, setCode] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState('');

  // Derive parsed info from the Google-authenticated user
  const parsed = user ? parseStudentEmail(user.email) : null;
  const isValidDomain = parsed?.valid && parsed?.isInstitutional;

  // ─── Step 1: Google Sign-In ─────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError('');
    setLoadingGoogle(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged in AuthContext will update `user` automatically
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error('Google sign-in error:', err);
        setError('Gagal masuk dengan Google. Silakan coba lagi.');
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  // ─── Step 2: Logout / switch account ────────────────────────────────────
  const handleLogout = async () => {
    setError('');
    await signOut(auth);
    setCode('');
  };

  // ─── Step 3: Submit session code ─────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!parsed || !isValidDomain) {
      setError('Gunakan akun @students.ithb.ac.id untuk mengikuti ujian.');
      return;
    }

    if (!code.trim()) {
      setError('Kode sesi tidak boleh kosong.');
      return;
    }

    setLoadingSubmit(true);
    try {
      // Verify session code against Firestore
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

      // Status must be exactly 'active'
      if (session.status !== 'active') {
        setError(
          'Kode sesi tidak aktif. Sesi ini mungkin belum dibuka atau sudah ditutup. Hubungi admin untuk informasi lebih lanjut.'
        );
        return;
      }

      // 🚨 ANTI-CHEATING CHECK: Has this NIM already submitted?
      const submissionRef = doc(db, 'sessions', sessionId, 'submissions', parsed.studentId);
      const submissionSnap = await getDoc(submissionRef);

      if (submissionSnap.exists()) {
        setError(
          `Akses Ditolak: NIM ${parsed.studentId} sudah menyelesaikan ujian untuk sesi ini.`
        );
        return;
      }

      // All good – register student session in context and navigate
      const sessionCode = code.trim().toUpperCase();

      setStudentSession({
        studentId: parsed.studentId,
        jurusan: parsed.jurusan,
        angkatan: parsed.angkatan,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        sessionId,
        sessionCode,
      });

      navigate(`/quiz/${sessionCode}`, { state: { sessionId } });
    } catch (err) {
      console.error(err);
      setError('Koneksi gagal. Periksa jaringan Anda dan coba lagi.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
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
          <p className="text-blue-200 mt-1 text-sm">
            Pengukuran Tingkat Literasi Digital · ITHB
          </p>
        </div>

        {/* Glassmorphism Card */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8">
          {/* Show loading spinner while Firebase Auth is initialising */}
          {authLoading ? (
            <div className="flex flex-col items-center gap-3 py-6 text-white">
              <Loader2 size={32} className="animate-spin text-blue-200" />
              <p className="text-sm text-blue-200">Memuat...</p>
            </div>
          ) : !user ? (
            /* ── STATE A: Not signed in ── */
            <>
              <h2 className="text-xl font-bold text-white mb-1">Masuk sebagai Peserta</h2>
              <p className="text-blue-200 text-sm mb-6">
                Gunakan akun Google kampus{' '}
                <span className="font-semibold text-white">@students.ithb.ac.id</span> Anda untuk
                melanjutkan.
              </p>

              {error && (
                <div className="flex items-start gap-2.5 px-4 py-3 mb-4 bg-red-500/20 border border-red-400/40 rounded-xl text-red-100 text-sm backdrop-blur-sm">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-300" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleGoogleSignIn}
                disabled={loadingGoogle}
                id="btn-google-signin"
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-white/20 hover:scale-[1.02] active:scale-100"
              >
                {loadingGoogle ? (
                  <Loader2 size={18} className="animate-spin text-blue-500" />
                ) : (
                  /* Google "G" logo SVG */
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                )}
                {loadingGoogle ? 'Menghubungkan...' : 'Masuk dengan Google'}
              </button>
            </>
          ) : !isValidDomain ? (
            /* ── STATE B: Signed in but wrong email domain ── */
            <>
              <div className="flex flex-col items-center gap-3 mb-5">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-14 h-14 rounded-full border-2 border-white/30 shadow-lg"
                  />
                ) : (
                  <UserCircle2 size={56} className="text-white/60" />
                )}
                <p className="text-white font-semibold text-sm">{user.displayName}</p>
                <p className="text-blue-300 text-xs break-all">{user.email}</p>
              </div>

              <div className="flex items-start gap-2.5 px-4 py-3 mb-5 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-100 text-sm backdrop-blur-sm">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-amber-300" />
                <span>
                  Akun ini bukan akun kampus ITHB. Harap gunakan akun{' '}
                  <strong className="text-white">@students.ithb.ac.id</strong> untuk mengikuti
                  ujian.
                </span>
              </div>

              <button
                onClick={handleLogout}
                id="btn-logout-wrong-account"
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white/15 border border-white/25 text-white rounded-xl font-semibold text-sm hover:bg-white/25 transition-all"
              >
                <LogOut size={16} />
                Ganti Akun / Logout
              </button>
            </>
          ) : (
            /* ── STATE C: Signed in with valid ITHB email → show session code form ── */
            <>
              {/* Verified identity badge */}
              <div className="flex items-center gap-3 p-3 mb-5 bg-emerald-500/15 border border-emerald-400/30 rounded-2xl">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-10 h-10 rounded-full border-2 border-emerald-400/40 flex-shrink-0"
                  />
                ) : (
                  <UserCircle2 size={40} className="text-emerald-300 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">
                    {user.displayName || parsed.studentId}
                  </p>
                  <p className="text-emerald-300 text-xs truncate">{user.email}</p>
                  <p className="text-emerald-400/80 text-xs mt-0.5">
                    NIM: <strong>{parsed.studentId}</strong> · Jurusan:{' '}
                    <strong>{parsed.jurusan.toUpperCase()}</strong> · Angkatan:{' '}
                    <strong>{parsed.angkatan}</strong>
                  </p>
                </div>
                <ShieldCheck size={20} className="text-emerald-400 flex-shrink-0 ml-auto" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Session Code */}
                <div>
                  <label
                    htmlFor="session-code-input"
                    className="block text-xs font-semibold text-blue-100 mb-1.5 flex items-center gap-1.5"
                  >
                    <Hash size={12} />
                    Kode Sesi *
                  </label>
                  <input
                    id="session-code-input"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g., AB12CD"
                    maxLength={6}
                    required
                    disabled={loadingSubmit}
                    className="w-full px-4 py-3.5 bg-white/10 border border-white/25 rounded-xl text-center text-2xl font-mono font-bold tracking-widest text-white uppercase placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/15 transition-all disabled:opacity-50"
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
                  id="btn-mulai-ujian"
                  type="submit"
                  disabled={loadingSubmit || !code.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-white/20 hover:scale-[1.02] active:scale-100 mt-1"
                >
                  {loadingSubmit ? (
                    <Loader2 size={18} className="animate-spin text-blue-600" />
                  ) : (
                    <ArrowRight size={18} />
                  )}
                  {loadingSubmit ? 'Memeriksa...' : 'Mulai Ujian'}
                </button>

                {/* Switch account */}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loadingSubmit}
                  id="btn-ganti-akun"
                  className="w-full flex items-center justify-center gap-2 text-blue-300 hover:text-white text-xs py-1 transition-colors disabled:opacity-50"
                >
                  <LogOut size={13} />
                  Ganti Akun
                </button>
              </form>
            </>
          )}
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