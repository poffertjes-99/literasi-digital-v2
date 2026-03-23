import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { AdminRoute, StudentRoute } from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import AdminLayout from './AdminLayout'
import OverviewPage from './pages/admin/OverviewPage'
import ModulesPage from './pages/admin/ModulesPage'
import ModuleDetailPage from './pages/admin/ModuleDetailPage'
import SessionsPage from './pages/admin/SessionsPage'
import AnalyticsPage from './pages/admin/AnalyticsPage'
import JoinPage from './pages/student/JoinPage'
import QuizPage from './pages/student/QuizPage'
import ResultPage from './pages/student/ResultPage'

function App() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <Routes>
      <Route path="/login" element={isAdmin ? <Navigate to="/admin/overview" replace /> : <LoginPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/quiz/:sessionCode" element={<StudentRoute><QuizPage /></StudentRoute>} />
      <Route path="/results" element={<ResultPage />} />
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="modules/:moduleId" element={<ModuleDetailPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Route>
      <Route path="/" element={<Navigate to={isAdmin ? '/admin/overview' : '/join'} replace />} />
      <Route path="*" element={<Navigate to={isAdmin ? '/admin/overview' : '/join'} replace />} />
    </Routes>
  );
}

export default App;