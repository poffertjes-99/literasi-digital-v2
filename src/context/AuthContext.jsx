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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        const email = currentUser.email.toLowerCase();

        // Door 1: Check the 'admins' collection
        const adminSnap = await getDoc(doc(db, 'admins', email));

        if (adminSnap.exists()) {
          setIsAdmin(true);
          setUser(currentUser);
          setRole('admin'); // They get full access
        } else {
          // Door 2: Check the 'management' collection
          const managementSnap = await getDoc(doc(db, 'management', email));

          if (managementSnap.exists()) {
            setIsAdmin(true);
            setUser(currentUser);
            setRole('management'); // They only get view access
          } else {
            // Not in either collection? Kick them out.
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
    <AuthContext.Provider value={{ user, isAdmin, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}