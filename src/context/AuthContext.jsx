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

  const [studentSession, setStudentSession] = useState(() => {
    const saved = localStorage.getItem('student_session');
    return saved ? JSON.parse(saved) : null;
  });

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
      try {
        if (currentUser) {
          const email = currentUser.email.toLowerCase();
          const adminSnap = await getDoc(doc(db, 'admins', email));
          if (adminSnap.exists()) {
            setIsAdmin(true);
            setUser(currentUser);
            setRole('admin');
          } else {
            setIsAdmin(false);
            setUser(null);
            setRole(null);
          }
        } else {
          setUser(null);
          setIsAdmin(false);
          setRole(null);
        }
      } catch (e) {
        console.error("Auth check failed:", e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, role, loading, studentSession, setStudentSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}