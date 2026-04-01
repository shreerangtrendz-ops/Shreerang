import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

const PAGE_SIZE = 50;
const FY_YEARS = [2022, 2023, 2024, 2025, 2026];

function getCurrentFY() {
  const now = new Date();
  const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: `${yr}-04-01`, to: `${yr + 1}-03-31` };
}

const fmtAmt = n => { const v=Number(n||0); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:`₹${Math.round(v).toLocaleString('en-IN')}`; };
const fmtN   = (n,d=1) => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:d});

const T = {
  teal:'#2BA898', tealLight:'#EEF8F6', navy:'#0B2E2B',
  green:'#1E9E5A', greenLight:'#E8FFF4',
  red:'#E74C3C', orange:'#E67E22', blue:'#2468C8',
  gold:'#E8A800', purple:'#9B59B6',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95',
};

export default function PurchaseBillsPage() {
  const navigate = useNavigate();
  const fy = getCurrentFY();

  const [bills, setBills]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]           = useState(0);
  const [expanded, setExpanded]   = useState(null);

  // Filters
  const [search, setSearch]       = useState('');
  const [dateFrom, setDateFrom]   = useState(fy.from);
  const [dateTo, setDateTo]       = useState(fy.to);
  const [supplier, setSupplier]   = useState('');
  const [source, setSource]       = useState('');   // '' | 'Tally' | 'Manual'

  const activeFY = FY_YEARS.find(y => dateFrom === `${y}-04-01` && dateTo === `${y+1}-03-31`);
  const setFY = (y) => { setDateFrom(`${y}-04-01`); setDateTo(`${y+1}-03-31`); setPage(0); setTimeout(()=>fetchBills(0),0); };

  // Form
  const emptyForm = {
    bill_number:'', bill_date:'', supplier_name:'', gst_number:'',
    hsn_code:'', fabric_type:'', notes:'',
    transporter_name:'', lr_no:'', lr_date:'', destination:'',
    igst_amount:'', cgst_amount:'', sgst_amount:'', round_off:'', total_amount:'',
    line_items: [{ item_name:'', quantity:'', rate:'', amount:'' }]
  };
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);

  const fetchBills = useCallback(async (pg = 0) => {
    setLoading(true);
    const from = pg * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    let q = supabase.from('purchase_bills')
      .select('*', { count: 'exact' })
      .order('bill_date', { ascending: false })
      .range(from, to);

    if (dateFrom)  q = q.gte('bill_date', dateFrom);
    if (dateTo)    q = q.lte('bill_date', dateTo);
    if (supplier)  q = q.ilike('supplier_name', `%${supplier}%`);
    if (source === 'Tally')  q = q.eq('tally_sync_status', 'synced');
    if (source === 'Manual') q = q.neq('tally_sync_status', 'synced');
    if (search)    q = q.or(`supplier_name.ilike.%${search}%,bill_number.ilike.%${search}%,item_name.ilike.%${search}%`);

    const { data, error, count } = await q;
    if (!error) { setBills(data || []); setTotalCount(count || 0); }
    setPage(pg);
    setLoading(false);
  }, [dateFrom, dateTo, supplier, source, search]);

  useEffect(() => { fetchBills(0); }, []);

  function applyFilters() { fetchBills(0); }
  function resetFilters() {
    setSearch(''); setSupplier(''); setSource('');
    setDateFrom(fy.from); setDateTo(fy.to);
    setTimeout(() => fetchBills(0), 0);
  }

  async function syncFromTally() {
    setSyncing(true);
    try {
      const r = await fetch('/api/tally-sync', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
      const j = await r.json();
      if (j.success || j.synced?.purchase > 0) {
        alert(`✅ Synced ${j.synced?.purchase || 0} purchase bills from Tally`);
        fetchBills(0);
      } else alert('Tally offline or no data: ' + (j.errors?.join(', ') || 'Check FRP tunnel'));
    } catch(e) { alert('Error: ' + e.message); }
    finally { setSyncing(false); }
  }

  async function saveBill() {
    if (!form.bill_number || !form.bill_date || !form.supplier_name) { alert('Bill No, Date, Supplier required'); return; }
    if (form.line_items.some(l => !l.item_name || !l.amount)) { alert('All line items must have a Name and Amount'); return; }
    setSaving(true);
    const cleanItems = form.line_items.map(l => ({
      item_name: l.item_name, quantity: parseFloat(l.quantity)||0,
      rate: parseFloat(l.rate)||0, amount: parseFloat(l.amount)||0
    }));
    const itemsTotal = cleanItems.reduce((s,a) => s+a.amount, 0);
    const taxTotal = (parseFloat(form.igst_amount)||0)+(parseFloat(form.cgst_amount)||0)+(parseFloat(form.sgst_amount)||0);
    const roundOff = parseFloat(form.round_off)||0;
    const finalTotal = parseFloat(form.total_amount)||(itemsTotal+taxTotal+roundOff);
    const row = {
      bill_number: form.bill_number, bill_date: form.bill_date,
      supplier_name: form.supplier_name, gst_number: form.gst_number||null,
      transporter_name: form.transporter_name||null, lr_no: form.lr_no||null,
      lr_date: form.lr_date||null, destination: form.destination||null,
      hsn_code: form.hsn_code||null, fabric_type: form.fabric_type||null,
      notes: form.notes||null, line_items: cleanItems,
      igst_amount: parseFloat(form.igst_amount)||0, cgst_amount: parseFloat(form.cgst_amount)||0,
      sgst_amount: parseFloat(form.sgst_amount)||0, round_off: parseFloat(form.round_off)||0,
      total_amount: finalTotal, status: 'pending_push', tally_sync_status: 'pending'
    };
    const { error } = await supabase.from('purchase_bills').upsert(row, { onConflict: 'bill_number' });
    if (error) alert('Error: ' + error.message);
    else { setShowForm(false); setForm(emptyForm); fetchBills(0); }
    setSaving(false);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const totalAmt   = bills.reduce((s,b) => s+Number(b.total_amount||0), 0);
  const fmt = n => '\u20B9'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

  const ST   = { fontFamily:"'DM Sans',sans-serif", background:'var(--bg,#F4FBFA)', minHeight:'100vh' };
  const CARD = { background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 2px 10px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.12)' };
  const BTN  = (extra={}) => ({ padding:'8px 16px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", ...extra });
  const INP  = (extra={}) => ({ padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13, background:'#fff', ...extra });
  const SEL  = (extra={}) => ({ ...INP(), ...extra });

  return (
    <div style={ST}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:20 }}>🛒</span> Purchase Bills
          </div>
          <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>Tally purchase vouchers · Supabase synced</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setShowForm(true)} style={BTN({ background:'#E8A800', color:'#fff' })}>+ Add Manual Bill</button>
          <button onClick={syncFromTally} disabled={syncing} style={BTN({ background: syncing?'#555':'linear-gradient(135deg,#3DBFAE,#2BA898)', color:'#fff', opacity: syncing?0.7:1 })}>
            {syncing ? '⏳ Syncing…' : '↻ Sync from Tally'}
          </button>
        </div>
      </div>

      <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { label:'Total Bills', value: totalCount.toLocaleString('en-IN'), color:'#2468C8' },
            { label:`Page ${page+1} Amount`, value: fmt(totalAmt), color:'#1E9E5A' },
            { label:'Showing', value: `${bills.length} of ${totalCount}`, color:'#D4920A' },
          ].map((c,i) => (
            <div key={i} style={CARD}>
              <div style={{ fontSize:11, color:'#6A9B95', marginBottom:4 }}>{c.label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ ...CARD, padding:'14px 16px' }}>
          {/* FY Quick Buttons */}
          <div style={{ display:'flex', gap:4, marginBottom:12, background:T.bg, padding:'4px', borderRadius:8, border:`1px solid ${T.border}`, width:'fit-content' }}>
            {FY_YEARS.map(y => (
              <button key={y} onClick={()=>setFY(y)}
                style={{ padding:'4px 10px', fontSize:12, fontWeight:700, cursor:'pointer', borderRadius:6, border:'none', transition:'all .15s',
                  background: activeFY===y ? T.teal : 'transparent',
                  color: activeFY===y ? '#fff' : T.textMuted }}>
                FY {y.toString().slice(2)}-{(y+1).toString().slice(2)}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'2 1 200px' }}>
              <label style={{ fontSize:11, color:'#6A9B95' }}>Search (Bill No / Supplier / Item)</label>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&applyFilters()}
                placeholder="e.g. VK INDUSTRIES, 1207…" style={INP({ width:'100%', boxSizing:'border-box' })} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 130px' }}>
              <label style={{ fontSize:11, color:'#6A9B95' }}>Supplier Name</label>
              <input value={supplier} onChange={e=>setSupplier(e.target.value)}
                placeholder="e.g. Savatthi Textile" style={INP({ width:'100%', boxSizing:'border-box' })} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 120px' }}>
              <label style={{ fontSize:11, color:'#6A9B95' }}>From Date</label>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={INP()} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 120px' }}>
              <label style={{ fontSize:11, color:'#6A9B95' }}>To Date</label>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={INP()} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 110px' }}>
              <label style={{ fontSize:11, color:'#6A9B95' }}>Source</label>
              <select value={source} onChange={e=>setSource(e.target.value)} style={SEL()}>
                <option value="">All Sources</option>
                <option value="Tally">Tally Only</option>
                <option value="Manual">Manual Only</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end', paddingBottom:0 }}>
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
                {['Bill No','Date','Supplier','Fabric/Item','Qty (m)','Rate','Total','Status','Source',''].map(h=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#0B2E2B', borderBottom:'1px solid rgba(43,168,152,.15)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>Loading…</td></tr>
              ) : bills.length === 0 ? (
                <tr><td colSpan={10} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>
                  No bills found. Try adjusting filters or click "Reset" to see current FY.
                </td></tr>
              ) : bills.map(b => {
                const isExp = expanded === b.id;
                const lineItems = b.line_items?.inventory || (Array.isArray(b.line_items) ? b.line_items : []);
                return (
                  <>
                    <tr key={b.id} style={{ borderBottom:`1px solid ${isExp?T.teal:'rgba(43,168,152,.08)'}`, background: isExp?T.tealLight:'inherit', cursor:'pointer' }}
                      onClick={()=>setExpanded(isExp?null:b.id)}>
                      <td style={{ padding:'9px 14px', fontWeight:600, color:T.blue, fontFamily:'monospace' }}>{b.bill_number}</td>
                      <td style={{ padding:'9px 14px', color:'#4A7A74' }}>{b.bill_date}</td>
                      <td style={{ padding:'9px 14px', fontWeight:500 }}>{b.supplier_name}</td>
                      <td style={{ padding:'9px 14px', color:'#4A7A74', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.fabric_name||b.item_name||'—'}</td>
                      <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.quantity_mtrs ? fmtN(b.quantity_mtrs) : '—'}</td>
                      <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.rate_per_mtr ? fmtAmt(b.rate_per_mtr) : '—'}</td>
                      <td style={{ padding:'9px 14px', textAlign:'right', fontWeight:700, color:T.green }}>{fmtAmt(b.total_amount)}</td>
                      <td style={{ padding:'9px 14px' }}>
                        <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700,
                          background: b.tally_sync_status==='synced'?T.greenLight:'#FFF8E8',
                          color: b.tally_sync_status==='synced'?T.green:'#D4920A' }}>
                          {b.tally_sync_status==='synced'?'synced':'pending'}
                        </span>
                      </td>
                      <td style={{ padding:'9px 14px', color:'#6A9B95', fontSize:11 }}>{b.tally_sync_status==='synced'?'Tally':'Manual'}</td>
                      <td style={{ padding:'9px 14px', textAlign:'center' }}>
                        <span style={{ fontSize:12, color:T.teal, fontWeight:700 }}>{isExp?'▲':'▼'}</span>
                      </td>
                    </tr>
                    {isExp && (
                      <tr key={`${b.id}-exp`}>
                        <td colSpan={10} style={{ padding:0, background:T.tealLight, borderBottom:`2px solid ${T.teal}` }}>
                          <div style={{ padding:'16px 20px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                            {/* Bill Info */}
                            <div style={{ background:T.surface, borderRadius:8, padding:'10px 14px' }}>
                              <div style={{ fontSize:11, fontWeight:700, color:T.teal, textTransform:'uppercase', marginBottom:8 }}>Bill Information</div>
                              {[{l:'Bill Number',v:b.bill_number,mono:true},{l:'Date',v:b.bill_date},{l:'Supplier',v:b.supplier_name},
                                {l:'Supplier GSTIN',v:b.supplier_gstin},{l:'Supplier State',v:b.supplier_state},
                                {l:'Supplier Invoice No',v:b.supplier_invoice_no},{l:'Supplier Invoice Date',v:b.supplier_invoice_date},
                                {l:'Process Mill Name',v:b.process_mill_name,color:T.purple},{l:'Process Lot No',v:b.process_lot_no,mono:true,color:T.gold},
                                {l:'Purchase Ledger',v:b.purchase_ledger},
                                {l:'Design No',v:b.design_no,mono:true},{l:'Batch',v:b.batch_name,mono:true},
                                {l:'Godown',v:b.godown},{l:'Entered By',v:b.entered_by},
                                {l:'Total Amount',v:fmtAmt(b.total_amount),bold:true,color:T.green},
                              ].filter(f=>f.v).map((f,i)=>(
                                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:`1px solid ${T.border}`, fontSize:12 }}>
                                  <span style={{ color:T.textMuted }}>{f.l}</span>
                                  <span style={{ color:f.color||T.text, fontWeight:f.bold?700:500, fontFamily:f.mono?'monospace':'inherit' }}>{f.v}</span>
                                </div>
                              ))}
                            </div>
                            {/* Tax & Logistics */}
                            <div style={{ background:T.surface, borderRadius:8, padding:'10px 14px' }}>
                              <div style={{ fontSize:11, fontWeight:700, color:T.orange, textTransform:'uppercase', marginBottom:8 }}>Tax & Logistics</div>
                              {[{l:'Taxable Value',v:b.taxable_value?fmtAmt(b.taxable_value):null},
                                {l:'IGST',v:b.igst_amount>0?fmtAmt(b.igst_amount):null,color:T.blue},
                                {l:'CGST',v:b.cgst_amount>0?fmtAmt(b.cgst_amount):null,color:T.blue},
                                {l:'SGST',v:b.sgst_amount>0?fmtAmt(b.sgst_amount):null,color:T.blue},
                                {l:'Round Off',v:b.round_off!=null?`₹${b.round_off}`:null},
                                {l:'Qty (Mtrs)',v:b.quantity_mtrs?`${fmtN(b.quantity_mtrs)} m`:null},
                                {l:'Rate/Mtr',v:b.rate_per_mtr?fmtAmt(b.rate_per_mtr):null},
                                {l:'HSN Code',v:b.hsn_code},{l:'Transporter',v:b.transporter_name},
                                {l:'LR Number',v:b.lr_number},{l:'Dest City',v:b.destination_city},
                                {l:'Broker',v:b.broker_name,color:T.purple},{l:'Comm Rate',v:b.comm_rate?`${b.comm_rate}%`:null},
                                {l:'Narration',v:b.narration},
                              ].filter(f=>f.v).map((f,i)=>(
                                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:`1px solid ${T.border}`, fontSize:12, gap:8 }}>
                                  <span style={{ color:T.textMuted, flexShrink:0 }}>{f.l}</span>
                                  <span style={{ color:f.color||T.text, fontWeight:500, textAlign:'right', wordBreak:'break-word' }}>{f.v}</span>
                                </div>
                              ))}
                            </div>
                            {/* Line Items */}
                            <div style={{ background:T.surface, borderRadius:8, padding:'10px 14px' }}>
                              <div style={{ fontSize:11, fontWeight:700, color:T.purple, textTransform:'uppercase', marginBottom:8 }}>Stock Line Items ({lineItems.length || 1})</div>
                              {lineItems.length > 0 ? lineItems.map((item,i)=>(
                                <div key={i} style={{ padding:'6px 0', borderBottom:`1px solid ${T.border}`, fontSize:11 }}>
                                  <div style={{ fontWeight:600, color:T.text }}>{item.stock_item||item.item_name||`Item ${i+1}`}</div>
                                  <div style={{ display:'flex', gap:12, marginTop:2, color:T.textMuted, flexWrap:'wrap' }}>
                                    {item.qty>0 && <span>{fmtN(item.qty)} m</span>}
                                    {item.rate>0 && <span>@ {fmtAmt(item.rate)}/m</span>}
                                    {item.amount && <span style={{ color:T.green, fontWeight:600 }}>{fmtAmt(Math.abs(item.amount))}</span>}
                                    {item.lot_no && <span style={{ color:T.orange, fontWeight:600, fontFamily:'monospace' }}>Lot: {item.lot_no}</span>}
                                    {item.taka_abc && <span>Taka ABC: {item.taka_abc}</span>}
                                    {item.taka_no && <span>Taka No: {item.taka_no}</span>}
                                  </div>
                                  {(item.track_party || item.track_ref_no) && (
                                    <div style={{ fontSize:10, color:T.blue, marginTop:4, padding:'4px 8px', background:T.blueLight, borderRadius:4, display:'inline-block' }}>
                                      🔗 Linked to: <span style={{fontWeight:600}}>{item.track_party||'—'}</span> {item.track_ref_no?`(${item.track_ref_no})`:''}
                                    </div>
                                  )}
                                  {item.batches?.slice(0,3).map((bt,bi)=>(
                                    <div key={bi} style={{ fontSize:10, color:T.teal, marginTop:2 }}>📦 {bt.batch_name} · {fmtN(bt.qty)}m</div>
                                  ))}
                                </div>
                              )) : (
                                <div style={{ fontSize:12, color:T.textMuted }}>
                                  <div>{b.fabric_name || '—'}</div>
                                  {b.quantity_mtrs>0 && <div style={{ marginTop:4 }}>{fmtN(b.quantity_mtrs)} m @ {b.rate_per_mtr?fmtAmt(b.rate_per_mtr):'-'}/m</div>}
                                </div>
                              )}
                              {b.total_taka_pcs > 0 && (
                                <div style={{ marginTop:8, padding:'4px 8px', background:T.bg, borderRadius:6, fontSize:11, fontWeight:600, color:T.teal }}>Total Taka/Pcs: {b.total_taka_pcs}</div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
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
              <button onClick={()=>fetchBills(0)} disabled={page===0} style={BTN({ background: page===0?'#f1f5f9':'#E8FFF4', color: page===0?'#aaa':'#1E9E5A', padding:'6px 12px' })}>«</button>
              <button onClick={()=>fetchBills(page-1)} disabled={page===0} style={BTN({ background: page===0?'#f1f5f9':'#E8FFF4', color: page===0?'#aaa':'#1E9E5A', padding:'6px 14px' })}>‹ Prev</button>
              <span style={{ padding:'6px 14px', background:'#2BA898', color:'#fff', borderRadius:8, fontSize:12, fontWeight:700 }}>
                {page+1} / {totalPages}
              </span>
              <button onClick={()=>fetchBills(page+1)} disabled={page>=totalPages-1} style={BTN({ background: page>=totalPages-1?'#f1f5f9':'#E8FFF4', color: page>=totalPages-1?'#aaa':'#1E9E5A', padding:'6px 14px' })}>Next ›</button>
              <button onClick={()=>fetchBills(totalPages-1)} disabled={page>=totalPages-1} style={BTN({ background: page>=totalPages-1?'#f1f5f9':'#E8FFF4', color: page>=totalPages-1?'#aaa':'#1E9E5A', padding:'6px 12px' })}>»</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding: 20 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth: 800, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, marginBottom:16, display:'flex', justifyContent:'space-between', color:'#0B2E2B' }}>
              Create Custom Purchase Bill <button onClick={()=>setShowForm(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer' }}>×</button>
            </div>
            <div style={{ background:'#F8FAFC', padding:16, borderRadius:8, marginBottom:16, border:'1px solid #E2E8F0' }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>1. Primary Details</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                {[['bill_number','Bill No *'],['bill_date','Date *','date'],['supplier_name','Supplier *'],['gst_number','Supplier GSTIN'],['hsn_code','Default HSN'],['fabric_type','Fabric Type']].map(([k,l,t])=>(
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
                <div style={{ fontSize:12, fontWeight:700, color:'#475569', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>3. Logistics</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[['transporter_name','Transporter'],['lr_no','LR / E-Way No'],['lr_date','LR Date','date'],['destination','Origin City']].map(([k,l,t])=>(
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
                  {[['igst_amount','IGST Amt','number'],['cgst_amount','CGST Amt','number'],['sgst_amount','SGST Amt','number'],['round_off','Round Off','number'],['total_amount','Grand Total *','number']].map(([k,l,t])=>(
                    <div key={k}>
                      <label style={{ fontSize:11, fontWeight:600, color:'#166534', display:'block', marginBottom:4 }}>{l}</label>
                      <input type={t} value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid #86EFAC', fontSize:13, boxSizing:'border-box', background:k==='total_amount'?'#DCFCE7':'#fff', fontWeight:k==='total_amount'?700:400 }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop:16 }}>
              <label style={{ fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 }}>Notes</label>
              <textarea value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, boxSizing:'border-box', minHeight:60 }} />
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
