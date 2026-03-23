import React from "react";
import { NavLink, Outlet } from "react-router-dom"; // navigate removed
import { LayoutDashboard, BookOpen, LogOut, ShieldCheck, BarChart2, Wifi } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "./context/AuthContext";

// Define exactly who can see what
const ALL_NAV_ITEMS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true, allowedRoles: ['admin', 'management'] },
  { to: "/admin/modules", label: "Modul", icon: BookOpen, allowedRoles: ['admin'] },
  { to: "/admin/sessions", label: "Sesi", icon: Wifi, allowedRoles: ['admin'] },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart2, allowedRoles: ['admin', 'management'] },
];

const AdminLayout = () => {
  const { role } = useAuth(); // Pulls 'admin' or 'management'

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // 🚨 THE FIX: No navigate("/login") here. 
      // The <AdminRoute> component will automatically detect that the user is null 
      // and redirect them safely to the login screen without causing a race condition.
    } catch (error) {
      console.error("Gagal logout:", error);
    }
  };

  // Filter the sidebar items based on the user's role (defaults to admin if undefined to prevent breaking)
  const safeRole = role || 'admin';
  const visibleNavItems = ALL_NAV_ITEMS.filter(item => item.allowedRoles.includes(safeRole));

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed top-0 left-0 h-full z-10">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight">Literasi Digital</h2>
              <p className="text-xs text-slate-400 capitalize">{safeRole} Console</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {visibleNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? "bg-blue-50 text-blue-700 border border-blue-100" : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64 min-h-screen">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <span className="text-slate-500 text-sm font-medium">Sistem Pengukuran Literasi Digital · Kampus XYZ</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border ${safeRole === 'admin'
              ? 'text-blue-700 bg-blue-50 border-blue-100'
              : 'text-emerald-700 bg-emerald-50 border-emerald-100'
              }`}>
              {safeRole}
            </span>
          </div>
        </header>
        <div className="p-8"> <Outlet /> </div>
      </main>
    </div>
  );
};

export default AdminLayout;