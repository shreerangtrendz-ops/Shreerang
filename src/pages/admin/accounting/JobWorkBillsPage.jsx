import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function JobWorkBillsPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const emptyForm = {
    bill_number:'', bill_date:'', job_worker_name:'', gst_number:'',
    process_type:'', design_number:'', design_name:'',
    igst_amount:'', cgst_amount:'', sgst_amount:'', round_off:'', amount:'',
    notes:'',
    line_items: [{ item_name:'', quantity:'', rate:'', charges:'' }]
  };
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBills(); }, []);
  async function fetchBills() {
    setLoading(true);
    const [manual, synced] = await Promise.all([
      supabase.from('job_work_bills').select('*').order('bill_date', { ascending:false }),
      supabase.from('process_issues').select('*').order('issue_date', { ascending:false })
    ]);
    const combined = [
      ...(manual.data || []).map(m => ({ ...m, source: 'Manual' })),
      ...(synced.data || []).map(s => ({
        ...s,
        bill_number: s.challan_no || s.voucher_number || `CH-${s.id}`,
        bill_date: s.issue_date,
        job_worker_name: s.worker_name || s.mill_name,
        design_number: s.design_no,
        amount: s.job_amount,
        quantity: s.metres_received || s.metres_issued,
        rate: s.job_rate,
        status: 'synced',
        source: 'Tally'
      }))
    ];
    setBills(combined.sort((a,b) => new Date(b.bill_date) - new Date(a.bill_date)));
    setLoading(false);
  }
  async function saveBill() {
    if (!form.bill_number || !form.bill_date || !form.job_worker_name) { alert('Bill No, Date, Job Worker required'); return; }
    if (form.line_items.some(l => !l.item_name || !l.charges)) { alert('All line items need a Fabric Name and Charges'); return; }
    setSaving(true);
    const cleanItems = form.line_items.map(l => ({
      item_name: l.item_name,
      quantity: parseFloat(l.quantity) || 0,
      rate: parseFloat(l.rate) || 0,
      charges: parseFloat(l.charges) || 0
    }));
    const itemsTotal = cleanItems.reduce((s, a) => s + a.charges, 0);
    const taxTotal = (parseFloat(form.igst_amount)||0) + (parseFloat(form.cgst_amount)||0) + (parseFloat(form.sgst_amount)||0);
    const finalAmt = parseFloat(form.amount) || (itemsTotal + taxTotal + (parseFloat(form.round_off)||0));
    const row = {
      bill_number: form.bill_number, bill_date: form.bill_date,
      job_worker_name: form.job_worker_name, gst_number: form.gst_number || null,
      process_type: form.process_type || null, design_number: form.design_number || null,
      design_name: form.design_name || null, notes: form.notes || null,
      line_items: cleanItems,
      igst_amount: parseFloat(form.igst_amount)||0,
      cgst_amount: parseFloat(form.cgst_amount)||0,
      sgst_amount: parseFloat(form.sgst_amount)||0,
      round_off: parseFloat(form.round_off)||0,
      amount: finalAmt,
      status: 'pending_push', tally_sync_status: 'pending'
    };
    const { error } = await supabase.from('job_work_bills').upsert(row, { onConflict:'bill_number' });
    if (error) alert(error.message); else { setShowForm(false); setForm(emptyForm); fetchBills(); }
    setSaving(false);
  }

  const filtered = bills.filter(b =>
    b.job_worker_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.bill_number?.toLowerCase().includes(search.toLowerCase()) ||
    b.design_number?.toLowerCase().includes(search.toLowerCase())
  );
<<<<<<< HEAD
  const fmt = n => 'â‚¹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
=======
  const fmt = n => '\u20B9'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
>>>>>>> 261966f0bae1b36f05912d180f7e44890042182a
  const BTN = e => ({ padding:'8px 16px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', ...e });
  const CARD = { background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 2px 10px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.12)' };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'var(--bg,#F4FBFA)', minHeight:'100vh' }}>
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
<<<<<<< HEAD
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}><span>ðŸ§¾</span> Job Work Bills</div>
          <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>Job worker billing Â· Processing charges</p>
=======
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}><span>\uD83E\uDDFE</span> Job Work Bills</div>
          <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>Job worker billing \u00B7 Processing charges</p>
>>>>>>> 261966f0bae1b36f05912d180f7e44890042182a
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

<<<<<<< HEAD
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search job worker, bill no, design noâ€¦"
=======
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search job worker, bill no, design no\u2026"
>>>>>>> 261966f0bae1b36f05912d180f7e44890042182a
          style={{ padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13, maxWidth:400 }} />

        <div style={{ ...CARD, padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead><tr style={{ background:'#F4FBFA' }}>
              {['Bill No','Date','Job Worker','Design No','Process','Qty','Rate','Amount','Status','Source'].map(h=>(
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#0B2E2B', borderBottom:'1px solid rgba(43,168,152,.15)', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
<<<<<<< HEAD
              {loading?<tr><td colSpan={9} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>Loadingâ€¦</td></tr>
=======
              {loading?<tr><td colSpan={9} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>Loading\u2026</td></tr>
>>>>>>> 261966f0bae1b36f05912d180f7e44890042182a
              :filtered.length===0?<tr><td colSpan={9} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>No bills yet. Add one above.</td></tr>
              :filtered.map(b=>(
                <tr key={b.id} style={{ borderBottom:'1px solid rgba(43,168,152,.08)' }}>
                  <td style={{ padding:'9px 14px', fontWeight:600 }}>{b.bill_number}</td>
                  <td style={{ padding:'9px 14px', color:'#4A7A74' }}>{b.bill_date}</td>
                  <td style={{ padding:'9px 14px', fontWeight:500 }}>{b.job_worker_name}</td>
<<<<<<< HEAD
                  <td style={{ padding:'9px 14px', color:'#2468C8', fontWeight:600 }}>{b.design_number||'â€”'}</td>
                  <td style={{ padding:'9px 14px', color:'#4A7A74' }}>{b.process_type||'â€”'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.quantity||'â€”'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.rate?fmt(b.rate):'â€”'}</td>
=======
                  <td style={{ padding:'9px 14px', color:'#2468C8', fontWeight:600 }}>{b.design_number||'\u2014'}</td>
                  <td style={{ padding:'9px 14px', color:'#4A7A74' }}>{b.process_type||'\u2014'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.quantity||'\u2014'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.rate?fmt(b.rate):'\u2014'}</td>
>>>>>>> 261966f0bae1b36f05912d180f7e44890042182a
                  <td style={{ padding:'9px 14px', textAlign:'right', fontWeight:700, color:'#D4920A' }}>{fmt(b.amount)}</td>
                  <td style={{ padding:'9px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700,
                      background:b.status==='paid'?'#E8FFF4':b.status==='synced'?'#F0F4FF':b.status==='pending'?'#FFF3F3':'#FFF8E8',
                      color:b.status==='paid'?'#1E9E5A':b.status==='synced'?'#2468C8':b.status==='pending'?'#ef4444':'#D4920A' }}>
                      {b.status||'pending'}
                    </span>
                  </td>
                  <td style={{ padding:'9px 14px', color:'#6A9B95', fontSize:11 }}>{b.source||'Manual'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:800, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, marginBottom:16, display:'flex', justifyContent:'space-between', color:'#0B2E2B' }}>
<<<<<<< HEAD
              Create Job Work Bill <button onClick={()=>setShowForm(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer' }}>Ã—</button>
=======
              Create Job Work Bill <button onClick={()=>setShowForm(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer' }}>\u00D7</button>
>>>>>>> 261966f0bae1b36f05912d180f7e44890042182a
            </div>

            <div style={{ background:'#F8FAFC', padding:16, borderRadius:8, marginBottom:16, border:'1px solid #E2E8F0' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>1. Bill & Contractor Details</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                {[['bill_number','Bill No *'],['bill_date','Date *','date'],['job_worker_name','Job Worker / Mill *'],
                  ['gst_number','Job Worker GSTIN'],['process_type','Process Type'],['design_number','Design No']
                ].map(([k,l,t])=>(
                  <div key={k}>
                    <label style={{ fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 }}>{l}</label>
                    <input type={t||'text'} value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
                      style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, boxSizing:'border-box' }} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:'#F8FAFC', padding:16, borderRadius:8, marginBottom:16, border:'1px solid #E2E8F0' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em' }}>2. Fabric Issued (Line Items)</div>
                <button onClick={() => setForm(p => ({...p, line_items:[...p.line_items,{item_name:'',quantity:'',rate:'',charges:''}]}))} style={BTN({ background:'#E2E8F0', color:'#475569', padding:'4px 10px' })}>+ Add Fabric</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 40px', gap:8, marginBottom:6, padding:'0 2px' }}>
<<<<<<< HEAD
                {['Fabric / Design Name *','Qty (Mtrs)','Rate (â‚¹/Mtr)','Charges (â‚¹) *',''].map((h,i)=>(
=======
                {['Fabric / Design Name *','Qty (Mtrs)','Rate (\u20B9/Mtr)','Charges (\u20B9) *',''].map((h,i)=>(
>>>>>>> 261966f0bae1b36f05912d180f7e44890042182a
                  <div key={i} style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase' }}>{h}</div>
                ))}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {form.line_items.map((li, idx) => (
                  <div key={idx} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 40px', gap:8, alignItems:'center' }}>
                    <input placeholder="e.g. Cotton Poplin / D-204" value={li.item_name} onChange={e=>{const nl=[...form.line_items]; nl[idx].item_name=e.target.value; setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13 }} />
                    <input type="number" placeholder="0" value={li.quantity} onChange={e=>{const nl=[...form.line_items]; nl[idx].quantity=e.target.value; nl[idx].charges=(parseFloat(nl[idx].quantity||0)*parseFloat(nl[idx].rate||0)).toFixed(2); setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13 }} />
                    <input type="number" placeholder="0.00" value={li.rate} onChange={e=>{const nl=[...form.line_items]; nl[idx].rate=e.target.value; nl[idx].charges=(parseFloat(nl[idx].quantity||0)*parseFloat(nl[idx].rate||0)).toFixed(2); setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13 }} />
                    <input type="number" placeholder="0.00" value={li.charges} onChange={e=>{const nl=[...form.line_items]; nl[idx].charges=e.target.value; setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13, background:'#F1F5F9', fontWeight:600 }} />
<<<<<<< HEAD
                    <button onClick={()=>{const nl=form.line_items.filter((_,i)=>i!==idx); setForm(p=>({...p,line_items:nl}))}} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:18 }}>Ã—</button>
=======
                    <button onClick={()=>{const nl=form.line_items.filter((_,i)=>i!==idx); setForm(p=>({...p,line_items:nl}))}} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:18 }}>\u00D7</button>
>>>>>>> 261966f0bae1b36f05912d180f7e44890042182a
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ background:'#F0FDF4', padding:16, borderRadius:8, border:'1px solid #BBF7D0' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#166534', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>3. Taxes & Billing Total</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
<<<<<<< HEAD
                  {[['igst_amount','IGST'],['cgst_amount','CGST'],['sgst_amount','SGST'],['round_off','Round Off'],['amount','Grand Total (â‚¹) *']].map(([k,l])=>(
=======
                  {[['igst_amount','IGST'],['cgst_amount','CGST'],['sgst_amount','SGST'],['round_off','Round Off'],['amount','Grand Total (\u20B9) *']].map(([k,l])=>(
>>>>>>> 261966f0bae1b36f05912d180f7e44890042182a
                    <div key={k}>
                      <label style={{ fontSize:11, fontWeight:600, color:'#166534', display:'block', marginBottom:4 }}>{l}</label>
                      <input type="number" value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid #86EFAC', fontSize:13, boxSizing:'border-box', background:k==='amount'?'#DCFCE7':'#fff', fontWeight:k==='amount'?700:400 }} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:'#F8FAFC', padding:16, borderRadius:8, border:'1px solid #E2E8F0', display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em' }}>4. Notes</div>
                <textarea placeholder="Any remarks, challan reference, etc." value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={{ flex:1, padding:'8px 10px', borderRadius:7, border:'1px solid #CBD5E1', fontSize:13, boxSizing:'border-box', resize:'none' }} />
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={saveBill} disabled={saving} style={BTN({ background:'linear-gradient(135deg,#3DBFAE,#2BA898)', color:'#fff', flex:1, padding:'12px', fontSize:14 })}>
<<<<<<< HEAD
                {saving?'Posting Billâ€¦':'Save Job Work Bill (Prepared for Tally Sync)'}
=======
                {saving?'Posting Bill\u2026':'Save Job Work Bill (Prepared for Tally Sync)'}
>>>>>>> 261966f0bae1b36f05912d180f7e44890042182a
              </button>
              <button onClick={()=>setShowForm(false)} style={BTN({ background:'#f1f5f9', color:'#4A7A74', padding:'12px 24px' })}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


