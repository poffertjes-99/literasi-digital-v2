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
            // ✅ User is an admin – set their role from the database
            const adminData = adminSnap.data();
            setIsAdmin(true);
            setUser(currentUser);
            setRole(adminData.role || 'admin');
          } else {
            // ✅ User is NOT an admin – accept them as a student
            //    Do NOT sign them out; JoinPage will validate the email format.
            setIsAdmin(false);
            setUser(currentUser);
            setRole('student');
          }
        } else {
          setUser(null);
          setIsAdmin(false);
          setRole(null);
        }
      } catch (e) {
        console.error('Auth check failed:', e);
        // On error, still keep the user object to avoid infinite loading states
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