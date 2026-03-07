import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function JobWorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({ worker_name:'', specialization:'', process_type:'', phone:'', email:'', city:'', rate:'', rate_unit:'Meter', bank_name:'', bank_account_number:'', ifsc_code:'', account_holder_name:'', notes:'', status:'active' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchWorkers(); }, []);
  async function fetchWorkers() {
    setLoading(true);
    const { data } = await supabase.from('job_workers').select('*').order('worker_name');
    setWorkers(data || []);
    setLoading(false);
  }
  function openAdd() { setForm({ worker_name:'', specialization:'', process_type:'', phone:'', email:'', city:'', rate:'', rate_unit:'Meter', bank_name:'', bank_account_number:'', ifsc_code:'', account_holder_name:'', notes:'', status:'active' }); setEditRow(null); setShowForm(true); }
  function openEdit(w) { setForm({ ...w }); setEditRow(w.id); setShowForm(true); }
  async function saveWorker() {
    if (!form.worker_name) { alert('Worker name required'); return; }
    setSaving(true);
    const row = { ...form, rate: parseFloat(form.rate)||0 };
    if (editRow) { await supabase.from('job_workers').update(row).eq('id', editRow); }
    else { await supabase.from('job_workers').insert(row); }
    setShowForm(false); fetchWorkers(); setSaving(false);
  }
  async function toggleStatus(id, status) {
    await supabase.from('job_workers').update({ status: status==='active'?'inactive':'active' }).eq('id', id);
    fetchWorkers();
  }

  const filtered = workers.filter(w => w.worker_name?.toLowerCase().includes(search.toLowerCase()) || w.specialization?.toLowerCase().includes(search.toLowerCase()));
  const BTN = e => ({ padding:'8px 16px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", ...e });
  const CARD = { background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 2px 10px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.12)' };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'var(--bg,#F4FBFA)', minHeight:'100vh' }}>
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}><span>🏭</span> Job Workers</div>
          <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>Manage processing partners · Embroidery, printing, dyeing</p>
        </div>
        <button onClick={openAdd} style={BTN({ background:'#E8A800', color:'#fff' })}>+ Add Worker</button>
      </div>

      <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { label:'Total Workers', value:workers.length, color:'#2468C8' },
            { label:'Active', value:workers.filter(w=>w.status==='active').length, color:'#1E9E5A' },
            { label:'Inactive', value:workers.filter(w=>w.status!=='active').length, color:'#94a3b8' },
          ].map((c,i)=>(
            <div key={i} style={CARD}><div style={{ fontSize:11, color:'#6A9B95', marginBottom:4 }}>{c.label}</div><div style={{ fontSize:22, fontWeight:800, color:c.color }}>{c.value}</div></div>
          ))}
        </div>

        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search worker name, specialization…"
          style={{ padding:'9px 14px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13, maxWidth:400 }} />

        <div style={{ ...CARD, padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead><tr style={{ background:'#F4FBFA' }}>
              {['Worker Name','Specialization','Process','Phone','City','Rate','Bank','Status','Actions'].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#0B2E2B', borderBottom:'1px solid rgba(43,168,152,.15)', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading?<tr><td colSpan={9} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>Loading…</td></tr>
              :filtered.length===0?<tr><td colSpan={9} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>No workers found.</td></tr>
              :filtered.map(w=>(
                <tr key={w.id} style={{ borderBottom:'1px solid rgba(43,168,152,.08)' }}>
                  <td style={{ padding:'9px 14px', fontWeight:600 }}>{w.worker_name}</td>
                  <td style={{ padding:'9px 14px', color:'#2468C8' }}>{w.specialization||'—'}</td>
                  <td style={{ padding:'9px 14px', color:'#4A7A74' }}>{w.process_type||'—'}</td>
                  <td style={{ padding:'9px 14px' }}>{w.phone||'—'}</td>
                  <td style={{ padding:'9px 14px' }}>{w.city||'—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', fontWeight:600 }}>{w.rate?`₹${w.rate}/${w.rate_unit||'m'}`:'—'}</td>
                  <td style={{ padding:'9px 14px', fontSize:11, color:'#4A7A74' }}>{w.bank_name||'—'}</td>
                  <td style={{ padding:'9px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700,
                      background:w.status==='active'?'#E8FFF4':'#f1f5f9', color:w.status==='active'?'#1E9E5A':'#94a3b8' }}>
                      {w.status||'active'}
                    </span>
                  </td>
                  <td style={{ padding:'9px 14px', display:'flex', gap:6 }}>
                    <button onClick={()=>openEdit(w)} style={BTN({ background:'#EEF6FF', color:'#2468C8', padding:'4px 10px', fontSize:11 })}>Edit</button>
                    <button onClick={()=>toggleStatus(w.id, w.status)} style={BTN({ background:'#f1f5f9', color:'#64748b', padding:'4px 10px', fontSize:11 })}>
                      {w.status==='active'?'Deactivate':'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, width:560, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, marginBottom:16, display:'flex', justifyContent:'space-between' }}>
              {editRow ? 'Edit Job Worker' : 'Add Job Worker'}
              <button onClick={()=>setShowForm(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer' }}>×</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[['worker_name','Worker Name *'],['specialization','Specialization'],['process_type','Process Type'],
                ['phone','Phone'],['email','Email'],['city','City'],['rate','Rate (₹)'],['rate_unit','Rate Unit'],
                ['bank_name','Bank Name'],['bank_account_number','Account No'],['ifsc_code','IFSC Code'],
                ['account_holder_name','Account Holder']].map(([k,l])=>(
                <div key={k}>
                  <label style={{ fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 }}>{l}</label>
                  <input type={k==='rate'?'number':'text'} value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 }}>Notes</label>
                <textarea value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, boxSizing:'border-box' }} />
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={saveWorker} disabled={saving} style={BTN({ background:'linear-gradient(135deg,#3DBFAE,#2BA898)', color:'#fff', flex:1, padding:'10px' })}>
                {saving?'Saving…':'Save Worker'}
              </button>
              <button onClick={()=>setShowForm(false)} style={BTN({ background:'#f1f5f9', color:'#4A7A74' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
