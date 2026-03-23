import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { PILLARS, KOMDIGI_FRAMEWORK, calculateFrameworkCoverage } from '../../utils/scoring';
import { ArrowLeft, Plus, Trash2, Loader2, HelpCircle, ChevronDown, ChevronUp, Pencil, Target, ShieldCheck, FileUp, Tag, Info, Layout } from 'lucide-react';

const emptyQuestion = () => ({
  text: '',
  pillarCode: 'DSK',
  areaCode: '1',
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
  const fileInputRef = useRef(null);
  const [module, setModule] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyQuestion());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  // Sync Competency when Area changes
  useEffect(() => {
    if (!editingId) {
      const selectedArea = PILLARS[form.areaCode];
      if (selectedArea && selectedArea.indicators?.length > 0) {
        setForm(prev => ({ ...prev, competencyCode: selectedArea.indicators[0].code }));
      }
    }
  }, [form.areaCode, editingId]);

  const coverage = calculateFrameworkCoverage(questions);
  const currentCompetency = PILLARS[form.areaCode]?.indicators.find(i => i.code === form.competencyCode);

  const handleEdit = (q) => {
    setForm({
      text: q.text,
      pillarCode: q.pillarCode || 'DSK',
      areaCode: q.areaCode || '1',
      competencyCode: q.competencyCode || '1.1',
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

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const rows = text.split('\n').filter(row => row.trim() !== '');
        if (rows[0].toLowerCase().includes('text')) rows.shift();
        const batch = rows.map(row => {
          const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length < 11) return null;
          return {
            text: cols[0],
            pillarCode: 'DSK', areaCode: '1', competencyCode: '1.1',
            options: Array.from({ length: 5 }, (_, i) => ({ text: cols[1 + i * 2], weight: parseInt(cols[2 + i * 2]) || (i + 1) })),
            createdAt: serverTimestamp(),
          };
        }).filter(Boolean);
        if (batch.length > 0) {
          await Promise.all(batch.map(q => addDoc(collection(db, 'modules', moduleId, 'questions'), q)));
          fetchData();
        }
      } finally {
        setUploading(false);
        e.target.value = null;
      }
    };
    reader.readAsText(file);
  };

  if (loading) return <div className="p-8 space-y-4 animate-pulse">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 px-4">
      <div className="flex justify-between items-center">
        <button onClick={() => navigate('/admin/modules')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-medium">
          <ArrowLeft size={16} /> Kembali ke Modul
        </button>
        <div className="flex gap-2">
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} className="hidden" />
          <button onClick={() => fileInputRef.current.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />} Import CSV
          </button>
          <button
            onClick={() => { if (showForm && editingId) { setEditingId(null); setForm(emptyQuestion()); } else setShowForm(!showForm); }}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
          >
            {showForm && editingId ? 'Batal Edit' : <><Plus size={16} className="inline mr-1" /> Tambah Soal</>}
          </button>
        </div>
      </div>

      {/* Coverage Dashboard */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <ShieldCheck size={120} className="text-blue-600" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Active Module</span>
            <h1 className="text-2xl font-black text-slate-800 mt-3">{module?.title}</h1>
            <p className="text-slate-500 text-sm mt-1">{module?.description || 'Pengukuran literasi menggunakan dual-framework mapping.'}</p>
          </div>
          <div className="w-full md:w-72 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UNESCO Global Coverage</span>
              <span className="text-xl font-black text-blue-600">{coverage}%</span>
            </div>
            <div className="h-3 bg-white rounded-full overflow-hidden border border-slate-200 shadow-inner">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000" style={{ width: `${coverage}%` }} />
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Box 1: Skenario & Komdigi */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-5 bg-blue-600 rounded-full" /> 1. Skenario & Klasifikasi Nasional
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Skenario Masalah (Problem Statement)</label>
                    <textarea
                      rows={4}
                      value={form.text}
                      onChange={(e) => setForm({ ...form, text: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                      placeholder="Masukkan situasi atau pertanyaan..."
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">🇮🇩 Pilar Nasional (Komdigi)</label>
                    <select value={form.pillarCode} onChange={(e) => setForm({ ...form, pillarCode: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none">
                      {Object.keys(KOMDIGI_FRAMEWORK).map(k => <option key={k} value={k}>{KOMDIGI_FRAMEWORK[k].label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Box 2: Jawaban */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-5 bg-emerald-500 rounded-full" /> 2. Opsi Respons & Skala Bobot
                </h3>
                <div className="space-y-3">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex gap-3 items-center group">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-400 group-focus-within:bg-blue-600 group-focus-within:text-white transition-all">
                        {String.fromCharCode(65 + i)}
                      </div>
                      <input type="text" value={opt.text} onChange={(e) => handleOptionChange(i, 'text', e.target.value)} placeholder={`Respons ${i + 1}`} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-400" required />
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-black text-slate-400">BOBOT</span>
                        <select value={opt.weight} onChange={(e) => handleOptionChange(i, 'weight', e.target.value)} className="bg-transparent text-xs font-black text-blue-600 outline-none">
                          {[1, 2, 3, 4, 5].map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Box 3: UNESCO Mapping (Sidebar Style) */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm sticky top-24">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-5 bg-violet-600 rounded-full" /> 3. Pemetaan Global (UNESCO)
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Framework Area</label>
                    <select value={form.areaCode} onChange={(e) => setForm({ ...form, areaCode: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none mb-3">
                      {Object.values(PILLARS).map(a => <option key={a.code} value={a.code}>Area {a.code}: {a.label}</option>)}
                    </select>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Digital Competency</label>
                    <select value={form.competencyCode} onChange={(e) => setForm({ ...form, competencyCode: e.target.value })} className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-xs font-black text-blue-600 outline-none shadow-sm shadow-blue-50">
                      {PILLARS[form.areaCode]?.indicators.map(comp => <option key={comp.code} value={comp.code}>{comp.code}: {comp.label}</option>)}
                    </select>
                  </div>

                  {/* UNESCO Description Box */}
                  <div className="bg-violet-50 rounded-2xl p-5 border border-violet-100">
                    <div className="flex items-center gap-2 text-violet-700 mb-2">
                      <Info size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Deskripsi Kompetensi</span>
                    </div>
                    <p className="text-xs text-violet-900 font-bold leading-relaxed">
                      {currentCompetency?.label}
                    </p>
                    <p className="text-[10px] text-violet-600 mt-2 leading-relaxed opacity-80">
                      Kompetensi ini mengukur kemampuan dalam konteks {PILLARS[form.areaCode]?.label.toLowerCase()}.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button type="submit" disabled={saving} className={`flex-1 py-4 rounded-2xl text-xs font-black text-white shadow-lg transition-all active:scale-95 ${editingId ? 'bg-amber-600 shadow-amber-200' : 'bg-blue-600 shadow-blue-200'}`}>
                      {saving ? 'Processing...' : (editingId ? 'Update Soal' : 'Simpan ke Database')}
                    </button>
                    <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyQuestion()); }} className="px-6 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all">Batal</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Display List */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <Layout size={16} className="text-slate-400" />
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Item Bank ({questions.length} Butir)</h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {questions.map((q, idx) => {
            const area = PILLARS[q.areaCode];
            const indicator = area?.indicators.find(i => i.code === q.competencyCode);
            const isExpanded = expandedId === q.id;

            return (
              <div key={q.id} className={`bg-white rounded-3xl border transition-all duration-300 ${isExpanded ? 'border-blue-400 shadow-xl ring-4 ring-blue-50' : 'border-slate-100 shadow-sm hover:border-slate-300'}`}>
                <div className="flex items-start gap-4 p-6 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : q.id)}>
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400 mt-1 flex-shrink-0">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 leading-relaxed mb-3">{q.text}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-[9px] font-black px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest">🇮🇩 {q.pillarCode}</span>
                      <span className="text-[9px] font-black px-3 py-1.5 rounded-xl bg-violet-50 text-violet-700 border border-violet-100 uppercase tracking-widest">🌍 {q.competencyCode}</span>
                      {isExpanded && <span className="text-[9px] font-bold text-slate-400 px-3 py-1.5">{indicator?.label}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(q); }} className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Pencil size={18} /></button>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('Hapus?')) deleteDoc(doc(db, 'modules', moduleId, 'questions', q.id)).then(fetchData); }} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                    {isExpanded ? <ChevronUp size={22} className="text-slate-300 ml-2" /> : <ChevronDown size={22} className="text-slate-300 ml-2" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-6 pb-8 animate-in fade-in duration-300">
                    <div className="h-px bg-slate-100 mb-6" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options?.map((o, oi) => (
                        <div key={oi} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                          <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-300">{String.fromCharCode(65 + oi)}</span>
                          <span className="flex-1 text-xs text-slate-600 font-medium">{o.text}</span>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${o.weight >= 4 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : o.weight <= 2 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>B{o.weight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}