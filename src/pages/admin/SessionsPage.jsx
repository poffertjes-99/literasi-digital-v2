import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { PILLARS, generateSessionCode } from '../../utils/scoring';
import { Wifi, Plus, Trash2, Loader2, Play, CircleSlash, ExternalLink, Calendar, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ moduleId: '', label: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null); // State untuk tracking proses hapus

  const fetchData = async () => {
    try {
      const [sessionsSnap, modulesSnap] = await Promise.all([
        getDocs(query(collection(db, 'sessions'), orderBy('createdAt', 'desc'))),
        getDocs(collection(db, 'modules'))
      ]);

      setSessions(sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setModules(modulesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.moduleId) return;
    setSaving(true);
    try {
      const selectedModule = modules.find(m => m.id === form.moduleId);
      await addDoc(collection(db, 'sessions'), {
        ...form,
        moduleTitle: selectedModule.title,
        sessionCode: generateSessionCode(),
        status: 'active',
        submissionCount: 0,
        createdAt: serverTimestamp(),
      });
      setForm({ moduleId: '', label: '' });
      setShowForm(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  // 🚨 FUNGSI BARU: Hapus Sesi
  const handleDelete = async (sessionId) => {
    if (!confirm('Hapus sesi ini? Seluruh data jawaban mahasiswa di dalamnya akan ikut terhapus dan tidak bisa dikembalikan.')) return;

    setDeletingId(sessionId);
    try {
      await deleteDoc(doc(db, 'sessions', sessionId));
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error("Error deleting session:", err);
      alert("Gagal menghapus sesi. Cek koneksi Anda.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleStatus = async (sessionId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'closed' : 'active';
    await updateDoc(doc(db, 'sessions', sessionId), { status: newStatus });
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: newStatus } : s));
  };

  if (loading) return <div className="p-8 space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sesi Ujian</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola akses dan kode masuk untuk peserta kuis</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          {showForm ? 'Batal' : <><Plus size={16} /> Buka Sesi Baru</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Pilih Modul Soal</label>
              <select
                value={form.moduleId}
                onChange={(e) => setForm({ ...form, moduleId: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">-- Pilih Modul --</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Label Sesi (Opsional)</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Misal: Batch 1 - Kelas A"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Memproses...' : 'Generate Kode Sesi'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
            Belum ada sesi aktif. Klik "Buka Sesi Baru" untuk memulai.
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${session.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <Wifi size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800">{session.moduleTitle}</h3>
                      {session.label && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase">{session.label}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {session.createdAt?.toDate().toLocaleDateString('id-ID')}</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {session.submissionCount || 0} Partisipan</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-xl">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode Sesi</p>
                    <p className="text-xl font-black text-blue-600 font-mono tracking-tighter leading-none mt-1">{session.sessionCode}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Toggle */}
                    <button
                      onClick={() => toggleStatus(session.id, session.status)}
                      className={`p-2.5 rounded-xl border transition-all ${session.status === 'active'
                        ? 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50'
                        : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'
                        }`}
                      title={session.status === 'active' ? 'Tutup Sesi' : 'Aktifkan Sesi'}
                    >
                      {session.status === 'active' ? <CircleSlash size={18} /> : <Play size={18} />}
                    </button>

                    {/* View Analytics */}
                    <button
                      onClick={() => navigate('/admin/analytics', { state: { sessionId: session.id } })}
                      className="p-2.5 bg-white text-blue-600 border border-blue-100 rounded-xl hover:bg-blue-50 transition-all"
                      title="Lihat Hasil"
                    >
                      <ExternalLink size={18} />
                    </button>

                    {/* 🚨 DELETE BUTTON */}
                    <button
                      onClick={() => handleDelete(session.id)}
                      disabled={deletingId === session.id}
                      className="p-2.5 bg-white text-slate-300 border border-slate-100 rounded-xl hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition-all"
                      title="Hapus Sesi"
                    >
                      {deletingId === session.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}