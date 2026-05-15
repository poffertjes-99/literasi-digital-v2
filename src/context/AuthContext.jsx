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

          // 1️⃣ Check the admins collection first
          const adminSnap = await getDoc(doc(db, 'admins', email));
          if (adminSnap.exists()) {
            const adminData = adminSnap.data();
            setIsAdmin(true);
            setUser(currentUser);
            setRole(adminData.roleType || adminData.role || 'admin');
            return; // short-circuit – no need to check further
          }

          // 2️⃣ Not an admin – check the management collection
          const mgmtSnap = await getDoc(doc(db, 'management', email));
          if (mgmtSnap.exists()) {
            // Management users can access the dashboard (read-only), so isAdmin = true
            // but role = 'management' so the UI can hide destructive actions.
            setIsAdmin(true);
            setUser(currentUser);
            setRole('management');
            return; // short-circuit
          }

          // 3️⃣ Not in either privileged collection – treat as a regular student
          setIsAdmin(false);
          setUser(currentUser);
          setRole('student');
        } else {
          setUser(null);
          setIsAdmin(false);
          setRole(null);
        }
      } catch (e) {
        console.error('Auth check failed:', e);
        // On error keep the user object to avoid an infinite loading state
        setUser(currentUser);
        setIsAdmin(false);
        setRole('student');
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