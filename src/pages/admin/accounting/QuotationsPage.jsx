import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function QuotationsPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ quotation_number:'', quotation_date:'', party_name:'', party_type:'customer', item_type:'fabric', item_name:'', design_number:'', quantity:'', rate:'', amount:'', valid_until:'', notes:'' });
  const [saving, setSaving] = useState(false);

  useEffect(()=>{ fetchQuotes(); }, []);
  async function fetchQuotes() {
    setLoading(true);
    const { data } = await supabase.from('quotations').select('*').order('quotation_date',{ascending:false});
    setQuotes(data||[]);
    setLoading(false);
  }
  async function saveQuote() {
    if (!form.quotation_number||!form.quotation_date||!form.party_name) { alert('Quote No, Date, Party required'); return; }
    setSaving(true);
    const row = { ...form, quantity:parseFloat(form.quantity)||0, rate:parseFloat(form.rate)||0, amount:parseFloat(form.amount)||0, status:'pending' };
    const { error } = await supabase.from('quotations').upsert(row,{onConflict:'quotation_number'});
    if (error) alert(error.message); else { setShowForm(false); fetchQuotes(); }
    setSaving(false);
  }
  async function updateStatus(id, status) {
    await supabase.from('quotations').update({ status }).eq('id', id);
    fetchQuotes();
  }

  const filtered = quotes.filter(q => {
    const m = q.party_name?.toLowerCase().includes(search.toLowerCase()) || q.quotation_number?.toLowerCase().includes(search.toLowerCase());
    return statusFilter==='all' ? m : m && q.status===statusFilter;
  });
  const fmt = n => '₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
  const BTN = e => ({ padding:'8px 16px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', ...e });

  const statusColors = { pending:['#FFF8E8','#D4920A'], approved:['#E8FFF4','#1E9E5A'], rejected:['#FFF3F3','#ef4444'], expired:['#f1f5f9','#94a3b8'] };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'var(--bg,#F4FBFA)', minHeight:'100vh' }}>
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}><span>📋</span> Quotations</div>
          <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>Price quotes for customers · Fabric pricing</p>
        </div>
        <button onClick={()=>setShowForm(true)} style={BTN({ background:'#E8A800', color:'#fff' })}>+ New Quotation</button>
      </div>

      <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {[['All',quotes.length,'#2468C8'],['Pending',quotes.filter(q=>q.status==='pending').length,'#D4920A'],
            ['Approved',quotes.filter(q=>q.status==='approved').length,'#1E9E5A'],['Rejected',quotes.filter(q=>q.status==='rejected').length,'#ef4444']
          ].map(([l,v,c])=>(
            <div key={l} onClick={()=>setStatusFilter(l.toLowerCase()==='all'?'all':l.toLowerCase())}
              style={{ background:'#fff', borderRadius:12, padding:'14px 18px', boxShadow:'0 2px 10px rgba(0,0,0,.07)', border:`2px solid ${statusFilter===(l.toLowerCase()==='all'?'all':l.toLowerCase())?c:'rgba(43,168,152,.12)'}`, cursor:'pointer' }}>
              <div style={{ fontSize:11, color:'#6A9B95', marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:22, fontWeight:800, color:c }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search party, quote no…"
            style={{ flex:1, maxWidth:400, padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13 }} />
        </div>

        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 2px 10px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.12)', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead><tr style={{ background:'#F4FBFA' }}>
              {['Quote No','Date','Party','Item','Design','Qty','Rate','Amount','Valid Until','Status','Actions'].map(h=>(
                <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, color:'#0B2E2B', borderBottom:'1px solid rgba(43,168,152,.15)', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {loading?<tr><td colSpan={11} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>Loading…</td></tr>
              :filtered.length===0?<tr><td colSpan={11} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>No quotations found.</td></tr>
              :filtered.map(q=>{
                const [bg,tc]=statusColors[q.status]||['#f1f5f9','#64748b'];
                return (
                  <tr key={q.id} style={{ borderBottom:'1px solid rgba(43,168,152,.08)' }}>
                    <td style={{ padding:'9px 12px', fontWeight:600, color:'#2468C8' }}>{q.quotation_number}</td>
                    <td style={{ padding:'9px 12px', color:'#4A7A74' }}>{q.quotation_date}</td>
                    <td style={{ padding:'9px 12px', fontWeight:500 }}>{q.party_name}</td>
                    <td style={{ padding:'9px 12px', color:'#4A7A74', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.item_name||'—'}</td>
                    <td style={{ padding:'9px 12px', color:'#2468C8' }}>{q.design_number||'—'}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right' }}>{q.quantity||'—'}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right' }}>{q.rate?fmt(q.rate):'—'}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:700 }}>{fmt(q.amount)}</td>
                    <td style={{ padding:'9px 12px', color: new Date(q.valid_until)<new Date()?'#ef4444':'#4A7A74' }}>{q.valid_until||'—'}</td>
                    <td style={{ padding:'9px 12px' }}>
                      <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700, background:bg, color:tc }}>{q.status||'pending'}</span>
                    </td>
                    <td style={{ padding:'9px 12px' }}>
                      <select value={q.status||'pending'} onChange={e=>updateStatus(q.id,e.target.value)}
                        style={{ padding:'3px 6px', borderRadius:6, border:'1px solid rgba(43,168,152,.3)', fontSize:11 }}>
                        <option value="pending">Pending</option>
                        <option value="approved">Approve</option>
                        <option value="rejected">Reject</option>
                        <option value="expired">Expire</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, width:520, maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, marginBottom:16, display:'flex', justifyContent:'space-between' }}>
              New Quotation <button onClick={()=>setShowForm(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer' }}>×</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[['quotation_number','Quote No *'],['quotation_date','Date *'],['party_name','Party Name *'],
                ['party_type','Party Type'],['item_type','Item Type'],['item_name','Item Name'],
                ['design_number','Design No'],['quantity','Quantity'],['rate','Rate/Metre'],
                ['amount','Total Amount'],['valid_until','Valid Until']].map(([k,l])=>(
                <div key={k}>
                  <label style={{ fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 }}>{l}</label>
                  {['party_type','item_type'].includes(k)?(
                    <select value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
                      style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13 }}>
                      {k==='party_type'?<><option value="customer">Customer</option><option value="supplier">Supplier</option></>
                       :<><option value="fabric">Fabric</option><option value="design">Design</option><option value="garment">Garment</option></>}
                    </select>
                  ):(
                    <input type={['quantity','rate','amount'].includes(k)?'number':['quotation_date','valid_until'].includes(k)?'date':'text'}
                      value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
                      style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, boxSizing:'border-box' }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={saveQuote} disabled={saving} style={BTN({ background:'linear-gradient(135deg,#3DBFAE,#2BA898)', color:'#fff', flex:1, padding:'10px' })}>
                {saving?'Saving…':'Save Quotation'}
              </button>
              <button onClick={()=>setShowForm(false)} style={BTN({ background:'#f1f5f9', color:'#4A7A74' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
