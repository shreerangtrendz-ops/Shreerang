import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function JobWorkBillsPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bill_number:'', bill_date:'', job_worker_name:'', design_number:'', process_type:'', quantity:'', rate:'', amount:'', notes:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBills(); }, []);
  async function fetchBills() {
    setLoading(true);
    const { data } = await supabase.from('job_work_bills').select('*').order('bill_date', { ascending:false });
    setBills(data || []);
    setLoading(false);
  }
  async function saveBill() {
    if (!form.bill_number || !form.bill_date || !form.job_worker_name) { alert('Bill No, Date, Job Worker required'); return; }
    setSaving(true);
    const row = { ...form, quantity:parseFloat(form.quantity)||0, rate:parseFloat(form.rate)||0, amount:parseFloat(form.amount)||0, status:'pending' };
    const { error } = await supabase.from('job_work_bills').upsert(row, { onConflict:'bill_number' });
    if (error) alert(error.message); else { setShowForm(false); fetchBills(); }
    setSaving(false);
  }

  const filtered = bills.filter(b =>
    b.job_worker_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.bill_number?.toLowerCase().includes(search.toLowerCase()) ||
    b.design_number?.toLowerCase().includes(search.toLowerCase())
  );
  const fmt = n => '₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
  const BTN = e => ({ padding:'8px 16px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', ...e });
  const CARD = { background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 2px 10px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.12)' };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'var(--bg,#F4FBFA)', minHeight:'100vh' }}>
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}><span>🧾</span> Job Work Bills</div>
          <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>Job worker billing · Processing charges</p>
        </div>
        <button onClick={()=>setShowForm(true)} style={BTN({ background:'#E8A800', color:'#fff' })}>+ Add Bill</button>
      </div>

      <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { label:'Total Bills', value:filtered.length, color:'#2468C8' },
            { label:'Total Amount', value:fmt(filtered.reduce((s,b)=>s+Number(b.amount||0),0)), color:'#E8A800' },
            { label:'Pending', value:filtered.filter(b=>b.status==='pending').length, color:'#ef4444' },
          ].map((c,i)=>(
            <div key={i} style={CARD}><div style={{ fontSize:11, color:'#6A9B95', marginBottom:4 }}>{c.label}</div><div style={{ fontSize:20, fontWeight:800, color:c.color }}>{c.value}</div></div>
          ))}
        </div>

        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search job worker, bill no, design no…"
          style={{ padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13, maxWidth:400 }} />

        <div style={{ ...CARD, padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead><tr style={{ background:'#F4FBFA' }}>
              {['Bill No','Date','Job Worker','Design No','Process','Qty','Rate','Amount','Status'].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#0B2E2B', borderBottom:'1px solid rgba(43,168,152,.15)', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading?<tr><td colSpan={9} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>Loading…</td></tr>
              :filtered.length===0?<tr><td colSpan={9} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>No bills yet. Add one above.</td></tr>
              :filtered.map(b=>(
                <tr key={b.id} style={{ borderBottom:'1px solid rgba(43,168,152,.08)' }}>
                  <td style={{ padding:'9px 14px', fontWeight:600 }}>{b.bill_number}</td>
                  <td style={{ padding:'9px 14px', color:'#4A7A74' }}>{b.bill_date}</td>
                  <td style={{ padding:'9px 14px', fontWeight:500 }}>{b.job_worker_name}</td>
                  <td style={{ padding:'9px 14px', color:'#2468C8', fontWeight:600 }}>{b.design_number||'—'}</td>
                  <td style={{ padding:'9px 14px', color:'#4A7A74' }}>{b.process_type||'—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.quantity||'—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.rate?fmt(b.rate):'—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', fontWeight:700, color:'#D4920A' }}>{fmt(b.amount)}</td>
                  <td style={{ padding:'9px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700,
                      background:b.status==='paid'?'#E8FFF4':b.status==='pending'?'#FFF3F3':'#FFF8E8',
                      color:b.status==='paid'?'#1E9E5A':b.status==='pending'?'#ef4444':'#D4920A' }}>
                      {b.status||'pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, width:480 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, marginBottom:16, display:'flex', justifyContent:'space-between' }}>
              Add Job Work Bill <button onClick={()=>setShowForm(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer' }}>×</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[['bill_number','Bill No *'],['bill_date','Date *'],['job_worker_name','Job Worker *'],['design_number','Design No'],
                ['process_type','Process Type'],['quantity','Qty'],['rate','Rate'],['amount','Amount *']].map(([k,l])=>(
                <div key={k}>
                  <label style={{ fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 }}>{l}</label>
                  <input type={['quantity','rate','amount'].includes(k)?'number':k==='bill_date'?'date':'text'}
                    value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, boxSizing:'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={saveBill} disabled={saving} style={BTN({ background:'linear-gradient(135deg,#3DBFAE,#2BA898)', color:'#fff', flex:1, padding:'10px' })}>
                {saving?'Saving…':'Save Bill'}
              </button>
              <button onClick={()=>setShowForm(false)} style={BTN({ background:'#f1f5f9', color:'#4A7A74' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
