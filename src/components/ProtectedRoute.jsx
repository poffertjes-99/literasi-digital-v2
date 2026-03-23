import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AuthSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Memverifikasi...</p>
      </div>
    </div>
  );
}

export function AdminRoute({ children }) {
  const { isAdmin, loading, user } = useAuth();
  if (loading) return <AuthSpinner />;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;
  return children;
}

export function StudentRoute({ children }) {
  // Logic based on session state
  const { loading } = useAuth();
  if (loading) return <AuthSpinner />;
  return children;
}

export default AdminRoute;