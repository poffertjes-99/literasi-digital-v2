import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { PILLARS } from '../../utils/scoring';
import { ArrowLeft, Plus, Trash2, Loader2, HelpCircle, ChevronDown, ChevronUp, Pencil, Tag } from 'lucide-react';

const PILLAR_OPTIONS = Object.values(PILLARS);
const WEIGHT_LABELS = { 1: 'Sangat Rendah', 2: 'Rendah', 3: 'Cukup', 4: 'Baik', 5: 'Sangat Baik' };

const emptyQuestion = () => ({
  text: '',
  pillarCode: 'DSK',
  indicatorCode: '',
  options: [
    { text: '', weight: 1 },
    { text: '', weight: 2 },
    { text: '', weight: 3 },
    { text: '', weight: 4 },
    { text: '', weight: 5 }, // 🚨 Tambahkan opsi ke-5 sebagai default
  ],
});

export default function ModuleDetailPage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyQuestion());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    const [moduleDoc, questionsSnap] = await Promise.all([
      getDoc(doc(db, 'modules', moduleId)),
      getDocs(query(collection(db, 'modules', moduleId, 'questions'), orderBy('createdAt', 'asc'))),
    ]);
    if (moduleDoc.exists()) setModule({ id: moduleDoc.id, ...moduleDoc.data() });
    setQuestions(questionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [moduleId]);

  // Otomatis pilih indikator pertama saat pilar berubah
  useEffect(() => {
    if (!editingId) {
      const firstIndicator = PILLARS[form.pillarCode]?.indicators[0]?.code || '';
      setForm(prev => ({ ...prev, indicatorCode: firstIndicator }));
    }
  }, [form.pillarCode, editingId]);

  const handleOptionChange = (index, field, value) => {
    const updated = form.options.map((opt, i) =>
      i === index ? { ...opt, [field]: field === 'weight' ? parseInt(value) : value } : opt
    );
    setForm({ ...form, options: updated });
  };

  const handleAddOption = () => {
    if (form.options.length < 5) {
      setForm({ ...form, options: [...form.options, { text: '', weight: 3 }] });
    }
  };

  const handleRemoveOption = (index) => {
    if (form.options.length > 2) {
      setForm({ ...form, options: form.options.filter((_, i) => i !== index) });
    }
  };

  const handleEdit = (q) => {
    setForm({
      text: q.text,
      pillarCode: q.pillarCode,
      indicatorCode: q.indicatorCode || '',
      options: q.options,
    });
    setEditingId(q.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.text.trim() || form.options.some((o) => !o.text.trim())) return;
    setSaving(true);
    try {
      const payload = { ...form, updatedAt: serverTimestamp() };
      if (editingId) {
        await updateDoc(doc(db, 'modules', moduleId, 'questions', editingId), payload);
      } else {
        await addDoc(collection(db, 'modules', moduleId, 'questions'), { ...payload, createdAt: serverTimestamp() });
      }
      setForm(emptyQuestion());
      setEditingId(null);
      setShowForm(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (qId) => {
    if (!confirm('Hapus soal ini?')) return;
    setDeletingId(qId);
    try {
      await deleteDoc(doc(db, 'modules', moduleId, 'questions', qId));
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="space-y-3 p-8 animate-pulse">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/admin/modules')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={16} /> Kembali
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h1 className="text-xl font-bold text-slate-800">{module?.title}</h1>
        <p className="text-slate-500 text-sm mt-1">{module?.description || 'Tidak ada deskripsi'}</p>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-slate-700">Manajemen Soal</h2>
        <button onClick={() => { if (showForm && editingId) { setEditingId(null); setForm(emptyQuestion()); } else setShowForm(!showForm); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
          {showForm && editingId ? 'Batal Edit' : <><Plus size={15} /> Tambah Soal</>}
        </button>
      </div>

      {showForm && (
        <div className={`border rounded-2xl p-6 space-y-5 transition-all ${editingId ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
          <h3 className={`font-semibold text-sm ${editingId ? 'text-amber-900' : 'text-blue-900'}`}>{editingId ? 'Edit Soal' : 'Soal Baru'}</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Teks Skenario Soal *</label>
              <textarea rows={3} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400" required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Pilar Utama</label>
                <select value={form.pillarCode} onChange={(e) => setForm({ ...form, pillarCode: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                  {PILLAR_OPTIONS.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Indikator Resmi</label>
                <select value={form.indicatorCode} onChange={(e) => setForm({ ...form, indicatorCode: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm">
                  {PILLARS[form.pillarCode]?.indicators.map((ind) => <option key={ind.code} value={ind.code}>{ind.code} — {ind.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Pilihan Respons & Bobot</label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input type="text" value={opt.text} onChange={(e) => handleOptionChange(i, 'text', e.target.value)} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" required />
                  <select value={opt.weight} onChange={(e) => handleOptionChange(i, 'weight', e.target.value)} className="px-2 py-2 border border-slate-200 rounded-lg text-xs">
                    {[1, 2, 3, 4, 5].map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all ${editingId ? 'bg-amber-600' : 'bg-blue-600'}`}>
                {saving ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Terbitkan Soal')}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyQuestion()); }} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium">Batal</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">Belum ada soal</div>
        ) : (
          questions.map((q, idx) => {
            const pillar = PILLARS[q.pillarCode] || {};
            const indicator = pillar.indicators?.find(i => i.code === q.indicatorCode);
            const isExpanded = expandedId === q.id;
            return (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-start gap-4 p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : q.id)}>
                  <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400">{idx + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{q.text}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${pillar.bgColor} ${pillar.textColor}`}>{q.pillarCode}</span>
                      {q.indicatorCode && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase flex items-center gap-1"><Tag size={8} /> {q.indicatorCode} — {indicator?.label}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(q); }} className="p-1.5 text-slate-400 hover:text-blue-600"><Pencil size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}