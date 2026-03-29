import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

const PAGE_SIZE = 50;

function getCurrentFY() {
  const now = new Date();
  const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: `${yr}-04-01`, to: `${yr + 1}-03-31` };
}

export default function SalesBillsPage() {
  const fy = getCurrentFY();

  const [bills, setBills]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]             = useState(0);

  // Filters
  const [search, setSearch]         = useState('');
  const [dateFrom, setDateFrom]     = useState(fy.from);
  const [dateTo, setDateTo]         = useState(fy.to);
  const [customer, setCustomer]     = useState('');
  const [hasCommission, setHasCommission] = useState(''); // '' | 'yes' | 'no'
  const [source, setSource]         = useState('');

  // Form
  const emptyForm = {
    bill_number:'', bill_date:'', customer_name:'', gst_number:'',
    agent_name:'', commission_percent:'', notes:'',
    transporter_name:'', lr_no:'', lr_date:'', destination:'',
    igst_amount:'', cgst_amount:'', sgst_amount:'', round_off:'', total_amount:'',
    line_items: [{ item_name:'', quantity:'', rate:'', amount:'' }]
  };
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);

  const fetchBills = useCallback(async (pg = 0) => {
    setLoading(true);
    const from = pg * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    let q = supabase.from('sales_bills')
      .select('*', { count: 'exact' })
      .order('bill_date', { ascending: false })
      .range(from, to);

    if (dateFrom)  q = q.gte('bill_date', dateFrom);
    if (dateTo)    q = q.lte('bill_date', dateTo);
    if (customer)  q = q.ilike('customer_name', `%${customer}%`);
    if (hasCommission === 'yes') q = q.gt('comm_rate', 0);
    if (hasCommission === 'no')  q = q.or('comm_rate.is.null,comm_rate.eq.0');
    if (source === 'Tally')  q = q.eq('tally_sync_status', 'synced');
    if (source === 'Manual') q = q.neq('tally_sync_status', 'synced');
    if (search) q = q.or(`customer_name.ilike.%${search}%,bill_number.ilike.%${search}%`);

    const { data, error, count } = await q;
    if (!error) { setBills(data || []); setTotalCount(count || 0); }
    setPage(pg);
    setLoading(false);
  }, [dateFrom, dateTo, customer, hasCommission, source, search]);

  useEffect(() => { fetchBills(0); }, []);

  function applyFilters() { fetchBills(0); }
  function resetFilters() {
    setSearch(''); setCustomer(''); setHasCommission(''); setSource('');
    setDateFrom(fy.from); setDateTo(fy.to);
    setTimeout(() => fetchBills(0), 0);
  }

  async function syncFromTally() {
    setSyncing(true);
    try {
      const r = await fetch('/api/tally-sync', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
      const j = await r.json();
      if (j.success || j.synced?.sales > 0) {
        alert(`✅ Synced ${j.synced?.sales || 0} sales bills from Tally`);
        fetchBills(0);
      } else alert('Tally offline: ' + (j.errors?.join(', ') || 'Check FRP tunnel'));
    } catch(e) { alert('Error: ' + e.message); }
    finally { setSyncing(false); }
  }

  async function saveBill() {
    if (!form.bill_number || !form.bill_date || !form.customer_name) { alert('Bill No, Date, Customer required'); return; }
    if (form.line_items.some(l => !l.item_name || !l.amount)) { alert('All line items must have a Name and Amount'); return; }
    setSaving(true);
    const cleanItems = form.line_items.map(l => ({
      item_name: l.item_name, quantity: parseFloat(l.quantity)||0,
      rate: parseFloat(l.rate)||0, amount: parseFloat(l.amount)||0
    }));
    const itemsTotal  = cleanItems.reduce((s,a) => s+a.amount, 0);
    const taxTotal    = (parseFloat(form.igst_amount)||0)+(parseFloat(form.cgst_amount)||0)+(parseFloat(form.sgst_amount)||0);
    const roundOff    = parseFloat(form.round_off)||0;
    const finalTotal  = parseFloat(form.total_amount)||(itemsTotal+taxTotal+roundOff);
    const commPct     = parseFloat(form.commission_percent)||0;
    const row = {
      bill_number: form.bill_number, bill_date: form.bill_date,
      customer_name: form.customer_name, gst_number: form.gst_number||null,
      transporter_name: form.transporter_name||null, lr_no: form.lr_no||null,
      lr_date: form.lr_date||null, destination: form.destination||null,
      agent_name: form.agent_name||null, commission_percent: commPct,
      commission_amount: finalTotal * commPct / 100,
      notes: form.notes||null, line_items: cleanItems,
      igst_amount: parseFloat(form.igst_amount)||0,
      cgst_amount: parseFloat(form.cgst_amount)||0,
      sgst_amount: parseFloat(form.sgst_amount)||0,
      round_off: roundOff, total_amount: finalTotal,
      status: 'pending_push', tally_sync_status: 'pending'
    };
    const { error } = await supabase.from('sales_bills').upsert(row, { onConflict:'bill_number' });
    if (error) alert('Error: ' + error.message);
    else { setShowForm(false); fetchBills(0); setForm(emptyForm); }
    setSaving(false);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const pageAmt    = bills.reduce((s,b) => s+Number(b.total_amount||0), 0);
  const fmt = n => '\u20B9'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

  const BTN  = (e={}) => ({ padding:'8px 16px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", ...e });
  const CARD = { background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 2px 10px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.12)' };
  const INP  = (extra={}) => ({ padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13, background:'#fff', ...extra });

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
        {/* Summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { label:'Total Bills', value: totalCount.toLocaleString('en-IN'), color:'#2468C8' },
            { label:`Page ${page+1} Revenue`, value: fmt(pageAmt), color:'#1E9E5A' },
            { label:'Showing', value: `${bills.length} of ${totalCount}`, color:'#D4920A' },
          ].map((c,i)=>(
            <div key={i} style={CARD}>
              <div style={{ fontSize:11, color:'#6A9B95', marginBottom:4 }}>{c.label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ ...CARD, padding:'14px 16px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#4A7A74', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em' }}>
            🔍 Filters
            <span style={{ marginLeft:8, fontSize:10, fontWeight:400, color:'#6A9B95' }}>
              Default: Current FY (Apr {fy.from.slice(0,4)} – Mar {fy.to.slice(0,4)})
            </span>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'2 1 200px' }}>
              <label style={{ fontSize:11, color:'#6A9B95' }}>Search (Bill No / Customer)</label>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&applyFilters()}
                placeholder="e.g. SRTPL/3182, Emtex…" style={INP({ width:'100%', boxSizing:'border-box' })} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 140px' }}>
              <label style={{ fontSize:11, color:'#6A9B95' }}>Customer Name</label>
              <input value={customer} onChange={e=>setCustomer(e.target.value)}
                placeholder="e.g. Reeja Fashion" style={INP({ width:'100%', boxSizing:'border-box' })} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 120px' }}>
              <label style={{ fontSize:11, color:'#6A9B95' }}>From Date</label>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={INP()} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 120px' }}>
              <label style={{ fontSize:11, color:'#6A9B95' }}>To Date</label>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={INP()} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 120px' }}>
              <label style={{ fontSize:11, color:'#6A9B95' }}>Commission</label>
              <select value={hasCommission} onChange={e=>setHasCommission(e.target.value)} style={INP()}>
                <option value="">All Bills</option>
                <option value="yes">With Commission</option>
                <option value="no">No Commission</option>
              </select>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 110px' }}>
              <label style={{ fontSize:11, color:'#6A9B95' }}>Source</label>
              <select value={source} onChange={e=>setSource(e.target.value)} style={INP()}>
                <option value="">All Sources</option>
                <option value="Tally">Tally Only</option>
                <option value="Manual">Manual Only</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <button onClick={applyFilters} style={BTN({ background:'#2BA898', color:'#fff', padding:'9px 18px' })}>Apply</button>
              <button onClick={resetFilters} style={BTN({ background:'#f1f5f9', color:'#4A7A74', padding:'9px 14px' })}>Reset</button>
            </div>
          </div>
        </div>

        {/* Table */}
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
              : bills.length===0 ? <tr><td colSpan={9} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>
                  No bills found. Try adjusting filters or click Reset.
                </td></tr>
              : bills.map(b=>(
                <tr key={b.id} style={{ borderBottom:'1px solid rgba(43,168,152,.08)' }}>
                  <td style={{ padding:'9px 14px', fontWeight:600 }}>{b.bill_number}</td>
                  <td style={{ padding:'9px 14px', color:'#4A7A74' }}>{b.bill_date}</td>
                  <td style={{ padding:'9px 14px', fontWeight:500 }}>{b.customer_name}</td>
                  <td style={{ padding:'9px 14px', color:'#4A7A74', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.item_name||'—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.quantity_mtrs||'—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.rate_per_mtr?fmt(b.rate_per_mtr):'—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', fontWeight:700, color:'#1E9E5A' }}>{fmt(b.total_amount)}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', color:'#D4920A' }}>{b.comm_rate?b.comm_rate+'%':'—'}</td>
                  <td style={{ padding:'9px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700,
                      background:b.tally_sync_status==='synced'?'#E8FFF4':'#FFF8E8',
                      color:b.tally_sync_status==='synced'?'#1E9E5A':'#D4920A' }}>
                      {b.tally_sync_status==='synced'?'synced':'pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 4px' }}>
            <span style={{ fontSize:12, color:'#6A9B95' }}>
              Showing {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE, totalCount)} of {totalCount.toLocaleString('en-IN')} bills
            </span>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={()=>fetchBills(0)} disabled={page===0} style={BTN({ background:page===0?'#f1f5f9':'#E8FFF4', color:page===0?'#aaa':'#1E9E5A', padding:'6px 12px' })}>«</button>
              <button onClick={()=>fetchBills(page-1)} disabled={page===0} style={BTN({ background:page===0?'#f1f5f9':'#E8FFF4', color:page===0?'#aaa':'#1E9E5A', padding:'6px 14px' })}>‹ Prev</button>
              <span style={{ padding:'6px 14px', background:'#2BA898', color:'#fff', borderRadius:8, fontSize:12, fontWeight:700 }}>
                {page+1} / {totalPages}
              </span>
              <button onClick={()=>fetchBills(page+1)} disabled={page>=totalPages-1} style={BTN({ background:page>=totalPages-1?'#f1f5f9':'#E8FFF4', color:page>=totalPages-1?'#aaa':'#1E9E5A', padding:'6px 14px' })}>Next ›</button>
              <button onClick={()=>fetchBills(totalPages-1)} disabled={page>=totalPages-1} style={BTN({ background:page>=totalPages-1?'#f1f5f9':'#E8FFF4', color:page>=totalPages-1?'#aaa':'#1E9E5A', padding:'6px 12px' })}>»</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:800, maxHeight:'90vh', overflowY:'auto' }}>
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
                <div style={{ fontSize:12, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'0.05em' }}>2. Line Items</div>
                <button onClick={() => setForm(p => ({...p, line_items: [...p.line_items, {item_name:'', quantity:'', rate:'', amount:''}]}))} style={BTN({ background:'#E2E8F0', color:'#475569', padding:'4px 10px' })}>+ Add Row</button>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {form.line_items.map((li, idx) => (
                  <div key={idx} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 40px', gap:8, alignItems:'center' }}>
                    <input placeholder="Fabric / Item Name *" value={li.item_name} onChange={e=>{const nl=[...form.line_items]; nl[idx].item_name=e.target.value; setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13 }} />
                    <input type="number" placeholder="Qty" value={li.quantity} onChange={e=>{const nl=[...form.line_items]; nl[idx].quantity=e.target.value; nl[idx].amount=(parseFloat(nl[idx].quantity||0)*parseFloat(nl[idx].rate||0)).toFixed(2); setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13 }} />
                    <input type="number" placeholder="Rate" value={li.rate} onChange={e=>{const nl=[...form.line_items]; nl[idx].rate=e.target.value; nl[idx].amount=(parseFloat(nl[idx].quantity||0)*parseFloat(nl[idx].rate||0)).toFixed(2); setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13 }} />
                    <input type="number" placeholder="Amount *" value={li.amount} onChange={e=>{const nl=[...form.line_items]; nl[idx].amount=e.target.value; setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13, background:'#F1F5F9', fontWeight:600 }} />
                    <button onClick={()=>{const nl=form.line_items.filter((_,i)=>i!==idx); setForm(p=>({...p,line_items:nl}))}} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:18 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ background:'#F8FAFC', padding:16, borderRadius:8, border:'1px solid #E2E8F0' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>3. Dispatch</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[['transporter_name','Transporter'],['lr_no','LR / E-Way No'],['lr_date','LR Date','date'],['destination','Destination']].map(([k,l,t])=>(
                    <div key={k}>
                      <label style={{ fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 }}>{l}</label>
                      <input type={t||'text'} value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, boxSizing:'border-box' }} />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background:'#F0FDF4', padding:16, borderRadius:8, border:'1px solid #BBF7D0' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#166534', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>4. Taxes & Total</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[['igst_amount','IGST','number'],['cgst_amount','CGST','number'],['sgst_amount','SGST','number'],['round_off','Round Off','number'],['total_amount','Grand Total *','number']].map(([k,l,t])=>(
                    <div key={k}>
                      <label style={{ fontSize:11, fontWeight:600, color:'#166534', display:'block', marginBottom:4 }}>{l}</label>
                      <input type={t} value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid #86EFAC', fontSize:13, boxSizing:'border-box', background:k==='total_amount'?'#DCFCE7':'#fff', fontWeight:k==='total_amount'?700:400 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={saveBill} disabled={saving} style={BTN({ background:'linear-gradient(135deg,#3DBFAE,#2BA898)', color:'#fff', flex:1, padding:'12px', fontSize:14 })}>
                {saving?'Saving…':'Save Bill'}
              </button>
              <button onClick={()=>setShowForm(false)} style={BTN({ background:'#f1f5f9', color:'#4A7A74', padding:'12px 24px' })}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
