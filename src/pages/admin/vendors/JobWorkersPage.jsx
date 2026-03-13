import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit2, Phone, X, Check } from 'lucide-react';

const C = { teal:'#2BA898',tealDark:'#0B2E2B',tealLight:'#EEF8F6',gold:'#D4920A',border:'#D6EEE9',text:'#0D2E2B',muted:'#4A7A74',error:'#D93A3A',green:'#1E9E5A',surface:'#fff',surface2:'#F8FBFA' };
const inp = { width:'100%',padding:'8px 11px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.text,outline:'none',boxSizing:'border-box',background:'#fff' };
const PROCESS_TYPES = ['Printing','Digital Print','Embroidery','Schiffli','Dyeing','Finishing','Washing','Cutting'];

const EMPTY = { name:'',process_type:'Printing',phone:'',address:'',gst_no:'',rate_per_metre:'',status:'active',notes:'' };

export default function JobWorkersPage() {
  const { toast } = useToast();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const up = (f,v) => setForm(p => ({...p,[f]:v}));

  useEffect(() => { fetchWorkers(); }, []);

  async function fetchWorkers() {
    setLoading(true);
    const { data, error } = await supabase.from('job_workers').select('*').order('name');
    if (!error) setWorkers(data || []);
    setLoading(false);
  }

  function openNew() { setForm(EMPTY); setEditing(null); setShowForm(true); }
  function openEdit(w) { setForm({...w, rate_per_metre: w.rate_per_metre||''}); setEditing(w.id); setShowForm(true); }

  async function handleSave() {
    if (!form.name.trim()) { toast({ variant:'destructive', description:'Name required' }); return; }
    setSaving(true);
    const rec = { name:form.name.trim(), process_type:form.process_type, phone:form.phone||null, address:form.address||null, gst_no:form.gst_no||null, rate_per_metre:form.rate_per_metre?parseFloat(form.rate_per_metre):null, status:form.status, notes:form.notes||null };
    const { error } = editing
      ? await supabase.from('job_workers').update(rec).eq('id',editing)
      : await supabase.from('job_workers').insert(rec);
    setSaving(false);
    if (error) { toast({ variant:'destructive', description:error.message }); return; }
    toast({ description: editing ? '✅ Updated' : '✅ Job worker added' });
    setShowForm(false);
    fetchWorkers();
  }

  async function toggleStatus(w) {
    const ns = w.status === 'active' ? 'inactive' : 'active';
    await supabase.from('job_workers').update({ status:ns }).eq('id',w.id);
    fetchWorkers();
  }

  const filtered = workers.filter(w => !search || w.name.toLowerCase().includes(search.toLowerCase()) || (w.process_type||'').toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#f4f9f8', minHeight:'100vh', color:C.text }}>
      <div style={{ background:`linear-gradient(135deg,${C.tealDark} 0%,#1a4a44 100%)`, padding:'16px 28px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ color:'#fff', fontWeight:700, fontSize:18 }}>🤝 Job Workers</div>
          <div style={{ color:'#81c5bc', fontSize:12 }}>Manage your process partners — printers, embroiderers, finishers</div>
        </div>
        <button onClick={openNew} style={{ padding:'9px 18px', background:C.teal, color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          <Plus size={16}/> Add Worker
        </button>
      </div>

      <div style={{ maxWidth:1000, margin:'0 auto', padding:20 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search by name or process..." style={{...inp, marginBottom:16, maxWidth:360}}/>

        {loading ? <div style={{textAlign:'center',color:C.muted,padding:40}}>Loading…</div> : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
            {filtered.length===0 && <div style={{color:C.muted,gridColumn:'1/-1',textAlign:'center',padding:40}}>No job workers yet. Add your first one!</div>}
            {filtered.map(w => (
              <div key={w.id} style={{ background:C.surface, borderRadius:12, border:`1.5px solid ${w.status==='active'?C.border:'#f0e0e0'}`, padding:18, opacity:w.status==='active'?1:0.65 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:C.tealDark }}>{w.name}</div>
                    <span style={{ fontSize:11, background:`${C.teal}22`, color:C.teal, padding:'2px 8px', borderRadius:10, fontWeight:600 }}>{w.process_type}</span>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={()=>openEdit(w)} style={{ padding:'5px 10px', borderRadius:7, border:`1px solid ${C.border}`, background:'#fff', cursor:'pointer', fontSize:12, color:C.muted }}>✏️</button>
                    <button onClick={()=>toggleStatus(w)} style={{ padding:'5px 10px', borderRadius:7, border:'none', background:w.status==='active'?'#fee2e2':'#dcfce7', cursor:'pointer', fontSize:12 }}>
                      {w.status==='active'?'Deactivate':'Activate'}
                    </button>
                  </div>
                </div>
                {w.phone&&<div style={{fontSize:12,color:C.muted,marginBottom:4}}>📱 {w.phone}</div>}
                {w.rate_per_metre&&<div style={{fontSize:12,color:C.gold,fontWeight:600}}>₹{w.rate_per_metre}/m</div>}
                {w.gst_no&&<div style={{fontSize:11,color:C.muted,marginTop:4}}>GST: {w.gst_no}</div>}
                {w.notes&&<div style={{fontSize:11,color:C.muted,marginTop:6,fontStyle:'italic'}}>{w.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
          <div style={{ background:'#fff',borderRadius:14,padding:28,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
              <div style={{ fontWeight:700,fontSize:16,color:C.tealDark }}>{editing?'Edit Job Worker':'New Job Worker'}</div>
              <button onClick={()=>setShowForm(false)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:20,color:C.muted }}>×</button>
            </div>
            {[
              { label:'Name *', field:'name', placeholder:'e.g. Rajesh Printing Works' },
              { label:'Phone', field:'phone', placeholder:'9876543210' },
              { label:'GST Number', field:'gst_no', placeholder:'27XXXXX...' },
              { label:'Default Rate (₹/m)', field:'rate_per_metre', placeholder:'0.00', type:'number' },
              { label:'Address', field:'address', placeholder:'Surat, Gujarat' },
            ].map(({ label, field, placeholder, type }) => (
              <div key={field} style={{ marginBottom:12 }}>
                <label style={{ fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.8,display:'block',marginBottom:4 }}>{label}</label>
                <input type={type||'text'} value={form[field]||''} onChange={e=>up(field,e.target.value)} placeholder={placeholder} style={inp}/>
              </div>
            ))}
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.8,display:'block',marginBottom:4 }}>Process Type</label>
              <select value={form.process_type} onChange={e=>up('process_type',e.target.value)} style={inp}>
                {PROCESS_TYPES.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.8,display:'block',marginBottom:4 }}>Notes</label>
              <textarea value={form.notes||''} onChange={e=>up('notes',e.target.value)} rows={2} style={{...inp,resize:'vertical'}} placeholder="Any special notes..."/>
            </div>
            <button onClick={handleSave} disabled={saving} style={{ width:'100%',padding:11,background:saving?'#94a3b8':C.teal,color:'#fff',border:'none',borderRadius:9,fontWeight:700,fontSize:14,cursor:saving?'not-allowed':'pointer' }}>
              {saving?'Saving…':editing?'💾 Save Changes':'✅ Add Job Worker'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
