import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { BookOpen, Plus, Trash2, ChevronRight, Loader2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ModulesPage() {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null); // 🚨 Track which module is being edited

  const fetchModules = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'modules'), orderBy('createdAt', 'desc')));
      setModules(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModules(); }, []);

  // 🚨 NEW: Handle Edit Mode
  const handleEdit = (module) => {
    setForm({ title: module.title, description: module.description || '' });
    setEditingId(module.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        // 🚨 UPDATE existing module
        await updateDoc(doc(db, 'modules', editingId), {
          ...form,
          updatedAt: serverTimestamp()
        });
      } else {
        // CREATE new module
        await addDoc(collection(db, 'modules'), { ...form, createdAt: serverTimestamp() });
      }

      setForm({ title: '', description: '' });
      setEditingId(null);
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
          <p className="text-slate-500 text-sm mt-1">Kelola modul dan soal skenario berbasis framework global</p>
        </div>
        <button
          onClick={() => {
            if (showForm && editingId) {
              setEditingId(null);
              setForm({ title: '', description: '' });
            } else {
              setShowForm(!showForm);
            }
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          {showForm && editingId ? 'Batal Edit' : <><Plus size={16} /> Buat Modul</>}
        </button>
      </div>

      {/* Form (Create & Edit) */}
      {showForm && (
        <div className={`border rounded-2xl p-6 transition-all ${editingId ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
          <h2 className={`text-sm font-semibold mb-4 ${editingId ? 'text-amber-800' : 'text-blue-800'}`}>
            {editingId ? 'Edit Modul' : 'Modul Baru'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Judul Modul *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Literasi Digital 2024 — Batch 1"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Deskripsi</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Deskripsi singkat..."
                rows={2}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-colors ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : (editingId ? <Pencil size={14} /> : <Plus size={14} />)}
                {saving ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Simpan Modul')}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); setForm({ title: '', description: '' }); }}
                className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
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
                {/* 🚨 EDIT BUTTON */}
                <button
                  onClick={() => handleEdit(module)}
                  className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  <Pencil size={16} />
                </button>
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