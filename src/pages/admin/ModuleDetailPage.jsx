import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { PILLARS } from '../../utils/scoring';
import { ArrowLeft, Plus, Trash2, Loader2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

const PILLAR_OPTIONS = Object.values(PILLARS);
const WEIGHT_LABELS = { 1: 'Sangat Rendah', 2: 'Rendah', 3: 'Cukup', 4: 'Baik', 5: 'Sangat Baik' };
const emptyQuestion = () => ({
  text: '',
  pillarCode: 'DSK',
  options: [
    { text: '', weight: 1 },
    { text: '', weight: 2 },
    { text: '', weight: 3 },
    { text: '', weight: 4 },
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.text.trim() || form.options.some((o) => !o.text.trim())) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'modules', moduleId, 'questions'), {
        ...form,
        createdAt: serverTimestamp(),
      });
      setForm(emptyQuestion());
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

  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse"/>)}</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <button onClick={() => navigate('/admin/modules')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={16} /> Kembali ke Daftar Modul
      </button>

      {/* Module Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{module?.title}</h1>
            {module?.description && <p className="text-slate-500 text-sm mt-1">{module.description}</p>}
          </div>
          <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-3 py-1.5 rounded-full">{questions.length} Soal</span>
        </div>
      </div>

      {/* Add Question CTA */}
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-slate-700">Daftar Soal</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} /> Tambah Soal
        </button>
      </div>

      {/* Add Question Form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-5">
          <h3 className="font-semibold text-blue-900 text-sm">Soal Baru</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Scenario Text */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Teks Skenario *</label>
              <textarea
                rows={3}
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                placeholder="Tuliskan skenario atau situasi yang harus dihadapi peserta..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                required
              />
            </div>

            {/* Pillar Code */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Pilar Kompetensi</label>
              <select
                value={form.pillarCode}
                onChange={(e) => setForm({ ...form, pillarCode: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {PILLAR_OPTIONS.map((p) => (
                  <option key={p.code} value={p.code}>{p.code} — {p.label}</option>
                ))}
              </select>
            </div>

            {/* Options */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-600">Pilihan Jawaban (min. 2, maks. 5)</label>
                {form.options.length < 5 && (
                  <button type="button" onClick={handleAddOption} className="text-xs text-blue-600 hover:underline">+ Tambah pilihan</button>
                )}
              </div>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => handleOptionChange(i, 'text', e.target.value)}
                        placeholder={`Pilihan ${String.fromCharCode(65 + i)}...`}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        required
                      />
                    </div>
                    <div>
                      <select
                        value={opt.weight}
                        onChange={(e) => handleOptionChange(i, 'weight', e.target.value)}
                        className="px-2 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                        title="Bobot jawaban"
                      >
                        {[1,2,3,4,5].map(w => (
                          <option key={w} value={w}>{w} — {WEIGHT_LABELS[w]}</option>
                        ))}
                      </select>
                    </div>
                    {form.options.length > 2 && (
                      <button type="button" onClick={() => handleRemoveOption(i)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? 'Menyimpan...' : 'Simpan Soal'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm(emptyQuestion()); }} className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Question List */}
      {questions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <HelpCircle size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Belum ada soal pada modul ini</p>
          <p className="text-slate-400 text-sm mt-1">Klik "Tambah Soal" untuk membuat soal skenario pertama.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => {
            const pillar = PILLARS[q.pillarCode] || {};
            const isExpanded = expandedId === q.id;
            return (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div
                  className="flex items-start gap-4 p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                >
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 line-clamp-2">{q.text}</p>
                    <span className={`inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${pillar.bgColor} ${pillar.textColor}`}>
                      {q.pillarCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                      disabled={deletingId === q.id}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      {deletingId === q.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 pb-5 pt-3">
                    <p className="text-xs font-medium text-slate-500 mb-2">Pilihan Jawaban:</p>
                    <div className="space-y-1.5">
                      {q.options?.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-3 text-sm">
                          <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-500">
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <span className="flex-1 text-slate-700">{opt.text}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${opt.weight >= 4 ? 'bg-emerald-100 text-emerald-700' : opt.weight <= 2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            Bobot {opt.weight}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
