import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🚨 TAMBAHKAN: Inisialisasi dari localStorage agar data tidak hilang saat refresh
  const [studentSession, setStudentSession] = useState(() => {
    const saved = localStorage.getItem('student_session');
    return saved ? JSON.parse(saved) : null;
  });

  // 🚨 TAMBAHKAN: Simpan ke localStorage setiap kali studentSession berubah
  useEffect(() => {
    if (studentSession) {
      localStorage.setItem('student_session', JSON.stringify(studentSession));
    } else {
      localStorage.removeItem('student_session');
    }
  }, [studentSession]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        const email = currentUser.email.toLowerCase();
        const adminSnap = await getDoc(doc(db, 'admins', email));

        if (adminSnap.exists()) {
          setIsAdmin(true);
          setUser(currentUser);
          setRole('admin');
        } else {
          const managementSnap = await getDoc(doc(db, 'management', email));
          if (managementSnap.exists()) {
            setIsAdmin(true);
            setUser(currentUser);
            setRole('management');
          } else {
            setIsAdmin(false);
            setUser(null);
            setRole(null);
            await auth.signOut();
          }
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isAdmin, role, loading,
      studentSession, setStudentSession // Pastikan ini diekspor
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}