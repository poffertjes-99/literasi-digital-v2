import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { GLOBAL_FRAMEWORK, calculateFrameworkCoverage } from '../../utils/scoring';
import { ArrowLeft, Plus, Trash2, Loader2, HelpCircle, ChevronDown, ChevronUp, Pencil, Target, ShieldCheck } from 'lucide-react';

const FRAMEWORK_AREAS = Object.values(GLOBAL_FRAMEWORK);

const emptyQuestion = () => ({
  text: '',
  areaCode: '1', // Default to Information Literacy
  competencyCode: '1.1',
  options: [
    { text: '', weight: 1 },
    { text: '', weight: 2 },
    { text: '', weight: 3 },
    { text: '', weight: 4 },
    { text: '', weight: 5 },
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

  // Handle auto-select first competency when area changes
  useEffect(() => {
    if (!editingId) {
      const selectedArea = FRAMEWORK_AREAS.find(a => a.code === form.areaCode);
      if (selectedArea && selectedArea.competencies.length > 0) {
        setForm(prev => ({ ...prev, competencyCode: selectedArea.competencies[0].code }));
      }
    }
  }, [form.areaCode, editingId]);

  const coverage = calculateFrameworkCoverage(questions);

  const handleOptionChange = (index, field, value) => {
    const updated = form.options.map((opt, i) =>
      i === index ? { ...opt, [field]: field === 'weight' ? parseInt(value) : value } : opt
    );
    setForm({ ...form, options: updated });
  };

  const handleEdit = (q) => {
    setForm({
      text: q.text,
      areaCode: q.areaCode,
      competencyCode: q.competencyCode,
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

  if (loading) return <div className="p-8 space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <button onClick={() => navigate('/admin/modules')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Kembali
      </button>

      {/* Coverage Dashboard */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <ShieldCheck size={80} className="text-blue-600" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800">{module?.title}</h1>
            <p className="text-slate-500 text-sm mt-1">Status Coverage: <span className="font-bold text-blue-600 uppercase tracking-widest text-xs">Global Framework (UNESCO)</span></p>
          </div>
          <div className="w-full md:w-64">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Framework Coverage</span>
              <span className="text-lg font-black text-blue-600">{coverage}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${coverage}%` }} />
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic text-right">*Target: 26 Kompetensi Digital Global</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="font-bold text-slate-700 flex items-center gap-2">
          <Target size={18} className="text-blue-500" />
          Manajemen Butir Soal
        </h2>
        <button
          onClick={() => { if (showForm && editingId) { setEditingId(null); setForm(emptyQuestion()); } else setShowForm(!showForm); }}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          {showForm && editingId ? 'Batal Edit' : <><Plus size={16} className="inline mr-1" /> Tambah Soal</>}
        </button>
      </div>

      {showForm && (
        <div className={`border-2 rounded-3xl p-8 space-y-6 transition-all ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200 shadow-xl shadow-blue-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${editingId ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
              <Pencil size={18} />
            </div>
            <h3 className="font-black text-slate-800">{editingId ? 'Update Skenario' : 'Buat Skenario Baru'}</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Teks Skenario (Problem Statement)</label>
              <textarea
                rows={3}
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none shadow-inner"
                placeholder="Contoh: Saat menerima pesan berisi tautan berhadiah dari nomor tidak dikenal, apa yang sebaiknya Anda lakukan?"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Area Pillar</label>
                <select
                  value={form.areaCode}
                  onChange={(e) => setForm({ ...form, areaCode: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"
                >
                  {FRAMEWORK_AREAS.map((a) => <option key={a.code} value={a.code}>Area {a.code}: {a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Kompetensi Digital</label>
                <select
                  value={form.competencyCode}
                  onChange={(e) => setForm({ ...form, competencyCode: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700"
                >
                  {GLOBAL_FRAMEWORK[`AREA_${form.areaCode}`]?.competencies.map((comp) => (
                    <option key={comp.code} value={comp.code}>{comp.code}: {comp.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Opsi Respons & Bobot Skala</label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-3 items-center group">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-400 group-focus-within:bg-blue-600 group-focus-within:text-white transition-all">
                    {String.fromCharCode(65 + i)}
                  </div>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleOptionChange(i, 'text', e.target.value)}
                    placeholder={`Opsi Respons ${i + 1}`}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400"
                    required
                  />
                  <select
                    value={opt.weight}
                    onChange={(e) => handleOptionChange(i, 'weight', e.target.value)}
                    className="px-3 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {[1, 2, 3, 4, 5].map(w => <option key={w} value={w}>B{w}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-4">
              <button type="submit" disabled={saving} className={`flex-1 py-4 rounded-2xl text-sm font-black text-white shadow-lg transition-all active:scale-95 ${editingId ? 'bg-amber-600 shadow-amber-200' : 'bg-blue-600 shadow-blue-200'}`}>
                {saving ? 'Processing...' : (editingId ? 'Update Soal' : 'Terbitkan Soal')}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyQuestion()); }} className="px-10 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-sm font-bold hover:bg-slate-50">Batal</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {questions.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-100 p-20 text-center">
            <HelpCircle size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold">Belum ada soal skenario</p>
            <p className="text-slate-300 text-sm mt-1">Petunjuk: Buat soal minimal mencakup 1 Area Framework.</p>
          </div>
        ) : (
          questions.map((q, idx) => {
            const area = Object.values(GLOBAL_FRAMEWORK).find(a => a.code === q.areaCode);
            const isExpanded = expandedId === q.id;
            return (
              <div key={q.id} className={`bg-white rounded-3xl border border-slate-100 transition-all ${isExpanded ? 'ring-2 ring-blue-500/10 shadow-xl' : 'hover:shadow-md shadow-sm'}`}>
                <div className="flex items-start gap-4 p-6 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : q.id)}>
                  <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 mt-1">{idx + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">{q.text}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${area?.bgColor} ${area?.textColor}`}>AREA {q.areaCode}</span>
                      <span className="text-[9px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">COMP {q.competencyCode}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(q); }} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl"><Pencil size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>
                    {isExpanded ? <ChevronUp size={20} className="text-slate-300 ml-1" /> : <ChevronDown size={20} className="text-slate-300 ml-1" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-50 bg-slate-50/20 p-6 rounded-b-3xl">
                    <div className="grid grid-cols-1 gap-2">
                      {q.options?.map((o, oi) => (
                        <div key={oi} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <span className="text-[10px] font-black text-slate-300 w-5">{String.fromCharCode(65 + oi)}</span>
                          <span className="flex-1 text-xs text-slate-600">{o.text}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${o.weight >= 4 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>Weight {o.weight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}