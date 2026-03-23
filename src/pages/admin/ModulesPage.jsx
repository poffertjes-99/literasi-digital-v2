import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { BookOpen, Plus, Trash2, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ModulesPage() {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchModules = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'modules'), orderBy('createdAt', 'desc')));
      setModules(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModules(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'modules'), { ...form, createdAt: serverTimestamp() });
      setForm({ title: '', description: '' });
      setShowForm(false);
      fetchModules();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus modul ini? Semua soal di dalamnya juga akan dihapus.')) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'modules', id));
      setModules((prev) => prev.filter((m) => m.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Modul Soal</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola modul dan soal skenario berbasis pilar literasi digital</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Buat Modul
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-blue-800 mb-4">Modul Baru</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Judul Modul *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Literasi Digital 2024 — Batch 1"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Deskripsi</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi singkat tentang modul ini..."
                rows={2}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? 'Menyimpan...' : 'Simpan Modul'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modules List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : modules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Belum ada modul</p>
          <p className="text-slate-400 text-sm mt-1">Klik "Buat Modul" untuk memulai.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((module) => (
            <div key={module.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 p-5 hover:border-blue-200 hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen size={18} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/admin/modules/${module.id}`)}>
                <p className="font-semibold text-slate-800 truncate">{module.title}</p>
                {module.description && <p className="text-sm text-slate-400 mt-0.5 truncate">{module.description}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => navigate(`/admin/modules/${module.id}`)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 font-medium transition-colors">
                  Kelola Soal <ChevronRight size={12} />
                </button>
                <button
                  onClick={() => handleDelete(module.id)}
                  disabled={deletingId === module.id}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  {deletingId === module.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
