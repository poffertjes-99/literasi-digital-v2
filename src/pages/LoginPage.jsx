import { useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth, db, googleProvider } from '../../firebase';
import { ShieldCheck, BookOpen, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // 🚨 THE FIX: Force Google to show the Account Chooser pop-up
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // ─── THE WHITELIST CHECK ────────────────────────────────────────────────
      // We check the 'admins' collection using the lowercase email as the ID
      const adminRef = doc(db, 'admins', user.email.toLowerCase());
      const adminSnap = await getDoc(adminRef);

      // We also check the 'management' collection if they aren't an admin
      const managementRef = doc(db, 'management', user.email.toLowerCase());
      const managementSnap = await getDoc(managementRef);

      if (!adminSnap.exists() && !managementSnap.exists()) {
        // If the email is not in either whitelist, show error and sign out immediately
        setError('Akses Ditolak: Email Anda tidak terdaftar dalam sistem Admin/Management.');
        await signOut(auth); // Ensure they are not left in a "half-logged" state
        return;
      }

      // If authorized, proceed to the dashboard
      navigate('/admin/overview');

    } catch (err) {
      setError('Login gagal. Silakan periksa koneksi Anda dan coba lagi.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full opacity-50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-100 rounded-full opacity-50 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-8 text-white text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <ShieldCheck size={32} className="text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Literasi Digital</h1>
            <p className="text-blue-100 text-sm mt-1">Sistem Pengukuran Literasi Digital</p>
          </div>

          <div className="px-8 py-8">
            <div className="mb-6 text-center">
              <h2 className="text-lg font-semibold text-slate-800">Admin Console</h2>
              <p className="text-slate-500 text-sm mt-1">
                Masuk menggunakan akun Google institusi Anda
              </p>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              )}
              {loading ? 'Memproses...' : 'Masuk dengan Google'}
            </button>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-slate-400 text-xs">
                Bukan admin?{' '}
                <a href="/join" className="text-blue-600 hover:underline font-medium">
                  Masuk sebagai peserta →
                </a>
              </p>
            </div>
          </div>

          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
            <BookOpen size={12} />
            <span>Kampus XYZ</span>
          </div>
        </div>
      </div>
    </div>
  );
}