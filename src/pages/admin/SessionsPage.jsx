import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../context/AuthContext';
import { generateSessionCode } from '../../utils/scoring';
import { Wifi, Plus, Copy, CheckCircle2, ToggleLeft, ToggleRight, Loader2, Lock, Unlock } from 'lucide-react';

const STATUS = {
  active: { label: 'Aktif', class: 'bg-emerald-100 text-emerald-700', icon: Unlock },
  closed: { label: 'Ditutup', class: 'bg-slate-100 text-slate-500', icon: Lock },
};

export default function SessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ moduleId: '', name: '' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const fetchAll = async () => {
    const [sessionsSnap, modulesSnap] = await Promise.all([
      getDocs(query(collection(db, 'sessions'), orderBy('createdAt', 'desc'))),
      getDocs(collection(db, 'modules')),
    ]);
    setSessions(sessionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setModules(modulesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.moduleId) return;
    setSaving(true);
    try {
      const sessionCode = generateSessionCode();
      await addDoc(collection(db, 'sessions'), {
        sessionCode,
        moduleId: form.moduleId,
        name: form.name || `Sesi ${sessionCode}`,
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
        submissions: [],
      });
      setForm({ moduleId: '', name: '' });
      setShowForm(false);
      fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleToggleStatus = async (session) => {
    setTogglingId(session.id);
    const newStatus = session.status === 'active' ? 'closed' : 'active';
    try {
      await updateDoc(doc(db, 'sessions', session.id), { status: newStatus });
      setSessions((prev) => prev.map((s) => s.id === session.id ? { ...s, status: newStatus } : s));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sesi Pengujian</h1>
          <p className="text-slate-500 text-sm mt-1">Buat dan kelola sesi untuk berbagi ke peserta</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Buat Sesi
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-blue-900 mb-4">Sesi Baru</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Pilih Modul *</label>
              {modules.length === 0 ? (
                <p className="text-sm text-amber-600">⚠ Belum ada modul. Buat modul terlebih dahulu.</p>
              ) : (
                <select
                  value={form.moduleId}
                  onChange={(e) => setForm({ ...form, moduleId: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">-- Pilih Modul --</option>
                  {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nama Sesi (opsional)</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Kelas A — Angkatan 2022"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <p className="text-xs text-slate-500">
              Kode sesi akan dibuat otomatis (6 karakter alfanumerik).
            </p>
            <div className="flex gap-3">
              <button type="submit" disabled={saving || modules.length === 0} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? 'Membuat...' : 'Buat Sesi'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sessions List */}
      {loading ? (
        <div className="space-y-3">{[1,2].map(i=><div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse"/>)}</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <Wifi size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Belum ada sesi</p>
          <p className="text-slate-400 text-sm mt-1">Klik "Buat Sesi" untuk membuat sesi pertama.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const status = STATUS[s.status] || STATUS.closed;
            const StatusIcon = status.icon;
            const moduleName = modules.find((m) => m.id === s.moduleId)?.title || s.moduleId;
            const joinUrl = `${window.location.origin}/quiz/${s.sessionCode}`;
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-slate-800">{s.name}</h3>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${status.class}`}>
                        <StatusIcon size={11} />{status.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{moduleName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.submissions?.length || 0} submission</p>
                  </div>

                  {/* Session Code */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xl font-bold tracking-widest text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl">
                        {s.sessionCode}
                      </span>
                      <button
                        onClick={() => handleCopy(s.sessionCode)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Salin kode"
                      >
                        {copied === s.sessionCode ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(s)}
                      disabled={togglingId === s.id}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        s.status === 'active'
                          ? 'text-slate-600 hover:bg-red-50 hover:text-red-600'
                          : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'
                      }`}
                    >
                      {togglingId === s.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : s.status === 'active' ? (
                        <ToggleRight size={14} />
                      ) : (
                        <ToggleLeft size={14} />
                      )}
                      {s.status === 'active' ? 'Tutup Sesi' : 'Buka Sesi'}
                    </button>
                  </div>
                </div>

                {/* Join URL */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <span className="text-xs text-slate-400 truncate flex-1 font-mono">{joinUrl}</span>
                  <button
                    onClick={() => handleCopy(joinUrl)}
                    className="text-xs text-blue-600 hover:underline flex-shrink-0"
                  >
                    {copied === joinUrl ? '✓ Tersalin' : 'Salin Link'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
