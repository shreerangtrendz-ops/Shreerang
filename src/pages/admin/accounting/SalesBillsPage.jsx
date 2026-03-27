import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function SalesBillsPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const emptyForm = { 
    bill_number:'', bill_date:'', customer_name:'', gst_number:'',
    agent_name:'', commission_percent:'', notes:'',
    transporter_name:'', lr_no:'', lr_date:'', destination:'',
    igst_amount:'', cgst_amount:'', sgst_amount:'', round_off:'', total_amount:'',
    line_items: [{ item_name:'', quantity:'', rate:'', amount:'' }]
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBills(); }, []);

  async function fetchBills() {
    setLoading(true);
    let q = supabase.from('sales_bills').select('*').order('bill_date', { ascending:false });
    if (dateFrom) q = q.gte('bill_date', dateFrom);
    if (dateTo)   q = q.lte('bill_date', dateTo);
    const { data, error } = await q;
    if (!error) setBills(data || []);
    setLoading(false);
  }

  async function syncFromTally() {
    setSyncing(true);
    try {
      const r = await fetch('/api/tally-sync', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
      const j = await r.json();
      if (j.success || j.synced?.sales > 0) {
        alert(`✅ Synced ${j.synced?.sales || 0} sales bills from Tally`);
        fetchBills();
      } else alert('Tally offline: ' + (j.errors?.join(', ') || 'Check FRP tunnel'));
    } catch(e) { alert('Error: ' + e.message); }
    finally { setSyncing(false); }
  }

  async function saveBill() {
    if (!form.bill_number || !form.bill_date || !form.customer_name) { alert('Bill No, Date, Customer required'); return; }
    if (form.line_items.some(l => !l.item_name || !l.amount)) { alert('All line items must have a Name and Amount'); return; }
    
    setSaving(true);
    // Sanitize and calculate totals
    const cleanItems = form.line_items.map(l => ({
      item_name: l.item_name,
      quantity: parseFloat(l.quantity) || 0,
      rate: parseFloat(l.rate) || 0,
      amount: parseFloat(l.amount) || 0
    }));
    
    // Auto-calculate total if left blank but items exist
    const itemsTotal = cleanItems.reduce((s, a) => s + a.amount, 0);
    const taxTotal = (parseFloat(form.igst_amount)||0) + (parseFloat(form.cgst_amount)||0) + (parseFloat(form.sgst_amount)||0);
    const roundOff = parseFloat(form.round_off)||0;
    const finalTotal = parseFloat(form.total_amount) || (itemsTotal + taxTotal + roundOff);

    // Primary Canonical Object
    const row = { 
      bill_number: form.bill_number,
      bill_date: form.bill_date,
      customer_name: form.customer_name,
      gst_number: form.gst_number || null,
      transporter_name: form.transporter_name || null,
      lr_no: form.lr_no || null,
      lr_date: form.lr_date || null,
      destination: form.destination || null,
      agent_name: form.agent_name || null,
      commission_percent: parseFloat(form.commission_percent) || 0,
      commission_amount: finalTotal * (parseFloat(form.commission_percent)||0) / 100,
      notes: form.notes || null,
      line_items: cleanItems,
      igst_amount: parseFloat(form.igst_amount) || 0,
      cgst_amount: parseFloat(form.cgst_amount) || 0,
      sgst_amount: parseFloat(form.sgst_amount) || 0,
      round_off: parseFloat(form.round_off) || 0,
      total_amount: finalTotal,
      status: 'pending_push', /* Tally web push queue */
      tally_sync_status: 'pending'
    };

    const { error } = await supabase.from('sales_bills').upsert(row, { onConflict:'bill_number' });
    if (error) alert('Error: ' + error.message);
    else { setShowForm(false); fetchBills(); setForm(emptyForm); }
    setSaving(false);
  }

  const filtered = bills.filter(b =>
    b.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.bill_number?.toLowerCase().includes(search.toLowerCase())
  );
  const totalAmt = filtered.reduce((s,b) => s+Number(b.total_amount||0), 0);
  const thisMonth = filtered.filter(b=>b.bill_date?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,b)=>s+Number(b.total_amount||0),0);
  const fmt = n => '₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

  const BTN = (e={}) => ({ padding:'8px 16px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", ...e });
  const CARD = { background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 2px 10px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.12)' };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'var(--bg,#F4FBFA)', minHeight:'100vh' }}>
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
            <span>💹</span> Sales Bills
          </div>
          <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>Tally sales vouchers · Supabase synced</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setShowForm(true)} style={BTN({ background:'#E8A800', color:'#fff' })}>+ Add Manual Bill</button>
          <button onClick={syncFromTally} disabled={syncing} style={BTN({ background: syncing?'#555':'linear-gradient(135deg,#3DBFAE,#2BA898)', color:'#fff', opacity:syncing?0.7:1 })}>
            {syncing?'⏳ Syncing…':'↻ Sync from Tally'}
          </button>
        </div>
      </div>

      <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { label:'Total Bills', value:filtered.length, color:'#2468C8' },
            { label:'Total Revenue', value:fmt(totalAmt), color:'#1E9E5A' },
            { label:'This Month', value:fmt(thisMonth), color:'#D4920A' },
          ].map((c,i)=>(
            <div key={i} style={CARD}>
              <div style={{ fontSize:11, color:'#6A9B95', marginBottom:4 }}>{c.label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer, bill no…"
            style={{ flex:1, minWidth:200, padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13 }} />
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13 }} />
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{ padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13 }} />
          <button onClick={fetchBills} style={BTN({ background:'#3DBFAE', color:'#fff' })}>Filter</button>
        </div>

        <div style={{ ...CARD, padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#F4FBFA' }}>
                {['Bill No','Date','Customer','Item','Qty','Rate','Total','Comm%','Status'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#0B2E2B', borderBottom:'1px solid rgba(43,168,152,.15)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>Loading…</td></tr>
              : filtered.length===0 ? <tr><td colSpan={9} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>
                  {bills.length===0?'No bills. Click "Sync from Tally" to import.':'No results.'}
                </td></tr>
              : filtered.map(b=>(
                <tr key={b.id} style={{ borderBottom:'1px solid rgba(43,168,152,.08)' }}>
                  <td style={{ padding:'9px 14px', fontWeight:600 }}>{b.bill_number}</td>
                  <td style={{ padding:'9px 14px', color:'#4A7A74' }}>{b.bill_date}</td>
                  <td style={{ padding:'9px 14px', fontWeight:500 }}>{b.customer_name}</td>
                  <td style={{ padding:'9px 14px', color:'#4A7A74', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.item_name||'—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.quantity_mtrs||'—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.rate_per_mtr?fmt(b.rate_per_mtr):'—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', fontWeight:700, color:'#1E9E5A' }}>{fmt(b.total_amount)}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', color:'#D4920A' }}>{b.commission_percent?b.commission_percent+'%':'—'}</td>
                  <td style={{ padding:'9px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700,
                      background:b.status==='synced'?'#E8FFF4':'#FFF8E8', color:b.status==='synced'?'#1E9E5A':'#D4920A' }}>
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
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding: 20 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, marginBottom:16, display:'flex', justifyContent:'space-between', color:'#0B2E2B' }}>
              Create Custom Sales Bill <button onClick={()=>setShowForm(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer' }}>×</button>
            </div>
            
            <div style={{ background:'#F8FAFC', padding:16, borderRadius:8, marginBottom:16, border:'1px solid #E2E8F0' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>1. Primary Details</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                {[['bill_number','Bill No *'],['bill_date','Date *','date'],['customer_name','Customer *'],['gst_number','Customer GSTIN'],['agent_name','Sales Agent'],['commission_percent','Agent Comm %','number']].map(([k,l,t])=>(
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
                <div style={{ fontSize:12, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em' }}>2. Inventory Details (Line Items)</div>
                <button onClick={() => setForm(p => ({...p, line_items: [...p.line_items, {item_name:'', quantity:'', rate:'', amount:''}]}))} style={BTN({ background:'#E2E8F0', color:'#475569', padding:'4px 10px' })}>+ Add Row</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {form.line_items.map((li, idx) => (
                  <div key={idx} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 40px', gap:8, alignItems:'center' }}>
                    <input placeholder="Fabric / Item Name *" value={li.item_name} onChange={e=>{const nl=[...form.line_items]; nl[idx].item_name=e.target.value; setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13 }} />
                    <input type="number" placeholder="Qty (Mtrs)" value={li.quantity} onChange={e=>{const nl=[...form.line_items]; nl[idx].quantity=e.target.value; nl[idx].amount=(parseFloat(nl[idx].quantity||0)*parseFloat(nl[idx].rate||0)).toFixed(2); setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13 }} />
                    <input type="number" placeholder="Rate (₹)" value={li.rate} onChange={e=>{const nl=[...form.line_items]; nl[idx].rate=e.target.value; nl[idx].amount=(parseFloat(nl[idx].quantity||0)*parseFloat(nl[idx].rate||0)).toFixed(2); setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13 }} />
                    <input type="number" placeholder="Total Amt *" value={li.amount} onChange={e=>{const nl=[...form.line_items]; nl[idx].amount=e.target.value; setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13, background:'#F1F5F9', fontWeight:600 }} />
                    <button onClick={()=>{const nl=form.line_items.filter((_,i)=>i!==idx); setForm(p=>({...p,line_items:nl}))}} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:18 }}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ background:'#F8FAFC', padding:16, borderRadius:8, border:'1px solid #E2E8F0' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>3. Dispatch Tracker</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[['transporter_name','Transporter'],['lr_no','LR / E-Way No'],['lr_date','LR Date','date'],['destination','Destination City']].map(([k,l,t])=>(
                    <div key={k}>
                      <label style={{ fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 }}>{l}</label>
                      <input type={t||'text'} value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, boxSizing:'border-box' }} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background:'#F0FDF4', padding:16, borderRadius:8, border:'1px solid #BBF7D0' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#166534', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>4. Taxes & Final Billing</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[['igst_amount','IGST Amt','number'],['cgst_amount','CGST Amt','number'],['sgst_amount','SGST Amt','number'],['round_off','Round Off','number'],['total_amount','Grand Total (₹) *','number']].map(([k,l,t])=>(
                    <div key={k}>
                      <label style={{ fontSize:11, fontWeight:600, color:'#166534', display:'block', marginBottom:4 }}>{l}</label>
                      <input type={t||'text'} value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid #86EFAC', fontSize:13, boxSizing:'border-box', background:k==='total_amount'?'#DCFCE7':'#fff', fontWeight:k==='total_amount'?700:400 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={saveBill} disabled={saving} style={BTN({ background:'linear-gradient(135deg,#3DBFAE,#2BA898)', color:'#fff', flex:1, padding:'12px', fontSize:14 })}>
                {saving?'Posting CRM Bill…':'Save CRM Bill (Prepared for Tally Sync)'}
              </button>
              <button onClick={()=>setShowForm(false)} style={BTN({ background:'#f1f5f9', color:'#4A7A74', padding:'12px 24px' })}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
