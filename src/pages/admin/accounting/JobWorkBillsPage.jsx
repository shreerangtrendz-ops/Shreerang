<<<<<<< HEAD
﻿import { useState, useEffect } from 'react';
=======
import { useState, useEffect, useCallback } from 'react';
>>>>>>> c616550cd35025a4bdb9d31b50b54bf0253d240e
import { supabase } from '../../../lib/supabase';

const PAGE_SIZE = 50;

function getCurrentFY() {
  const now = new Date();
  const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: `${yr}-04-01`, to: `${yr + 1}-03-31` };
}

export default function JobWorkBillsPage() {
  const fy = getCurrentFY();

  const [bills, setBills]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]             = useState(0);

  // Filters
  const [search, setSearch]         = useState('');
  const [dateFrom, setDateFrom]     = useState(fy.from);
  const [dateTo, setDateTo]         = useState(fy.to);
  const [worker, setWorker]         = useState('');
  const [processType, setProcessType] = useState(''); // '' | 'issued' | 'received'
  const [source, setSource]         = useState('');   // '' | 'Tally' | 'Manual'

  // Form
  const emptyForm = {
    bill_number:'', bill_date:'', job_worker_name:'', gst_number:'',
    process_type:'', design_number:'', design_name:'',
    igst_amount:'', cgst_amount:'', sgst_amount:'', round_off:'', amount:'',
    notes:'',
    line_items: [{ item_name:'', quantity:'', rate:'', charges:'' }]
  };
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);

  const fetchBills = useCallback(async (pg = 0) => {
    setLoading(true);
    const from = pg * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    // Tally-synced process_issues
    let qSynced = supabase.from('process_issues')
      .select('*', { count: 'exact' })
      .order('issue_date', { ascending: false })
      .range(from, to);

    if (dateFrom)  qSynced = qSynced.gte('issue_date', dateFrom);
    if (dateTo)    qSynced = qSynced.lte('issue_date', dateTo);
    if (worker)    qSynced = qSynced.ilike('worker_name', `%${worker}%`);
    if (processType) qSynced = qSynced.eq('process_type', processType);
    if (search)    qSynced = qSynced.or(`worker_name.ilike.%${search}%,challan_no.ilike.%${search}%,design_no.ilike.%${search}%`);

    const { data: syncedData, error: syncedErr, count: syncedCount } = await qSynced;

    // Manual job_work_bills (small table, no pagination needed separately)
    let qManual = supabase.from('job_work_bills')
      .select('*')
      .order('bill_date', { ascending: false })
      .limit(500);
    if (dateFrom) qManual = qManual.gte('bill_date', dateFrom);
    if (dateTo)   qManual = qManual.lte('bill_date', dateTo);
    if (search)   qManual = qManual.or(`job_worker_name.ilike.%${search}%,bill_number.ilike.%${search}%`);

    const { data: manualData } = await qManual;

    const synced = (syncedData || []).map(s => ({
      ...s,
      bill_number: s.challan_no || `CH-${s.id?.slice(0,8)}`,
      bill_date: s.issue_date,
      job_worker_name: s.worker_name || s.mill_name || '—',
      design_number: s.design_no,
      amount: s.job_amount || 0,
      quantity: s.metres_received || s.metres_issued || 0,
      rate: s.job_rate || 0,
      status: 'synced',
      source: 'Tally'
    }));

    const manual = source === 'Tally' ? [] : (manualData || []).map(m => ({ ...m, source: 'Manual' }));
    const tally  = source === 'Manual' ? [] : synced;

    const combined = [...manual, ...tally].sort((a,b) => new Date(b.bill_date||0) - new Date(a.bill_date||0));

    setBills(combined);
    setTotalCount((source === 'Manual' ? (manualData||[]).length : (syncedCount || 0)) + (source === 'Tally' ? 0 : (manualData||[]).length));
    setPage(pg);
    setLoading(false);
  }, [dateFrom, dateTo, worker, processType, source, search]);

  useEffect(() => { fetchBills(0); }, []);

  function applyFilters() { fetchBills(0); }
  function resetFilters() {
    setSearch(''); setWorker(''); setProcessType(''); setSource('');
    setDateFrom(fy.from); setDateTo(fy.to);
    setTimeout(() => fetchBills(0), 0);
  }

  async function saveBill() {
    if (!form.bill_number || !form.bill_date || !form.job_worker_name) { alert('Bill No, Date, Job Worker required'); return; }
    if (form.line_items.some(l => !l.item_name || !l.charges)) { alert('All line items need a Fabric Name and Charges'); return; }
    setSaving(true);
    const cleanItems = form.line_items.map(l => ({
      item_name: l.item_name, quantity: parseFloat(l.quantity)||0,
      rate: parseFloat(l.rate)||0, charges: parseFloat(l.charges)||0
    }));
    const itemsTotal = cleanItems.reduce((s,a) => s+a.charges, 0);
    const taxTotal = (parseFloat(form.igst_amount)||0)+(parseFloat(form.cgst_amount)||0)+(parseFloat(form.sgst_amount)||0);
    const finalAmt = parseFloat(form.amount)||(itemsTotal+taxTotal+(parseFloat(form.round_off)||0));
    const row = {
      bill_number: form.bill_number, bill_date: form.bill_date,
      job_worker_name: form.job_worker_name, gst_number: form.gst_number||null,
      process_type: form.process_type||null, design_number: form.design_number||null,
      design_name: form.design_name||null, notes: form.notes||null,
      line_items: cleanItems,
      igst_amount: parseFloat(form.igst_amount)||0,
      cgst_amount: parseFloat(form.cgst_amount)||0,
      sgst_amount: parseFloat(form.sgst_amount)||0,
      round_off: parseFloat(form.round_off)||0,
      amount: finalAmt, status: 'pending_push', tally_sync_status: 'pending'
    };
    const { error } = await supabase.from('job_work_bills').upsert(row, { onConflict:'bill_number' });
    if (error) alert(error.message); else { setShowForm(false); setForm(emptyForm); fetchBills(0); }
    setSaving(false);
  }

<<<<<<< HEAD
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
=======
  const totalAmt = bills.reduce((s,b) => s+Number(b.amount||b.job_amount||0), 0);
  const totalQty = bills.reduce((s,b) => s+Number(b.quantity||b.metres_issued||0), 0);
  const fmt = n => '\u20B9'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
  const fmtQ = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:1})+' m';

  const BTN  = (e={}) => ({ padding:'8px 16px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", ...e });
>>>>>>> c616550cd35025a4bdb9d31b50b54bf0253d240e
  const CARD = { background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 2px 10px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.12)' };
  const INP  = (extra={}) => ({ padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13, background:'#fff', ...extra });

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'var(--bg,#F4FBFA)', minHeight:'100vh' }}>
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
<<<<<<< HEAD
<<<<<<< HEAD
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}><span>ðŸ§¾</span> Job Work Bills</div>
          <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>Job worker billing Â· Processing charges</p>
=======
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}><span>\uD83E\uDDFE</span> Job Work Bills</div>
          <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>Job worker billing \u00B7 Processing charges</p>
>>>>>>> 261966f0bae1b36f05912d180f7e44890042182a
=======
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
            🏭 Job Work Bills
          </div>
          <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>Job worker billing · Processing charges</p>
>>>>>>> c616550cd35025a4bdb9d31b50b54bf0253d240e
        </div>
        <button onClick={()=>setShowForm(true)} style={BTN({ background:'#E8A800', color:'#fff' })}>+ Add Bill</button>
      </div>

      <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
        {/* Summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { label:'Total Bills', value: bills.length.toLocaleString('en-IN'), color:'#2468C8' },
            { label:'Total Amount', value: fmt(totalAmt), color:'#1E9E5A' },
            { label:'Total Metres', value: fmtQ(totalQty), color:'#D4920A' },
          ].map((c,i)=>(
            <div key={i} style={CARD}>
              <div style={{ fontSize:11, color:'#6A9B95', marginBottom:4 }}>{c.label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

<<<<<<< HEAD
<<<<<<< HEAD
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search job worker, bill no, design noâ€¦"
=======
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search job worker, bill no, design no\u2026"
>>>>>>> 261966f0bae1b36f05912d180f7e44890042182a
          style={{ padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13, maxWidth:400 }} />
=======
        {/* Filter bar */}
        <div style={{ ...CARD, padding:'14px 16px' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#4A7A74', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em' }}>
            🔍 Filters
            <span style={{ marginLeft:8, fontSize:10, fontWeight:400, color:'#6A9B95' }}>
              Default: Current FY (Apr {fy.from.slice(0,4)} – Mar {fy.to.slice(0,4)})
            </span>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'2 1 180px' }}>
              <label style={{ fontSize:11, color:'#6A9B95' }}>Search (Bill No / Worker / Design)</label>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&applyFilters()}
                placeholder="e.g. Aastha Fashion, 1184…" style={INP({ width:'100%', boxSizing:'border-box' })} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4, flex:'1 1 130px' }}>
              <label style={{ fontSize:11, color:'#6A9B95' }}>Job Worker</label>
              <input value={worker} onChange={e=>setWorker(e.target.value)}
                placeholder="e.g. JAGDAMBA" style={INP({ width:'100%', boxSizing:'border-box' })} />
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
              <label style={{ fontSize:11, color:'#6A9B95' }}>Process</label>
              <select value={processType} onChange={e=>setProcessType(e.target.value)} style={INP()}>
                <option value="">All</option>
                <option value="issued">Issued to Mill</option>
                <option value="received">Received from Mill</option>
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
>>>>>>> c616550cd35025a4bdb9d31b50b54bf0253d240e

        {/* Table */}
        <div style={{ ...CARD, padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#F4FBFA' }}>
                {['Bill No','Date','Job Worker','Design No','Process','Qty','Rate','Amount','Status','Source'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#0B2E2B', borderBottom:'1px solid rgba(43,168,152,.15)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
<<<<<<< HEAD
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
=======
              {loading ? <tr><td colSpan={10} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>Loading…</td></tr>
              : bills.length===0 ? <tr><td colSpan={10} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>
                  No bills found. Try adjusting filters or click Reset.
                </td></tr>
              : bills.map((b,i)=>(
                <tr key={b.id||i} style={{ borderBottom:'1px solid rgba(43,168,152,.08)' }}>
                  <td style={{ padding:'9px 14px', fontWeight:600, color:'#2BA898' }}>{b.bill_number}</td>
                  <td style={{ padding:'9px 14px', color:'#4A7A74' }}>{b.bill_date}</td>
                  <td style={{ padding:'9px 14px', fontWeight:500 }}>{b.job_worker_name}</td>
                  <td style={{ padding:'9px 14px', color:'#2468C8', fontSize:11 }}>{b.design_number||'—'}</td>
>>>>>>> c616550cd35025a4bdb9d31b50b54bf0253d240e
                  <td style={{ padding:'9px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700,
                      background: b.process_type==='received'?'#E8FFF4':b.process_type==='issued'?'#EFF6FF':'#F4FBFA',
                      color: b.process_type==='received'?'#1E9E5A':b.process_type==='issued'?'#2468C8':'#6A9B95' }}>
                      {b.process_type||'—'}
                    </span>
                  </td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.quantity?Number(b.quantity).toLocaleString('en-IN',{maximumFractionDigits:1}):'—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.rate?fmt(b.rate):'—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', fontWeight:700, color:'#1E9E5A' }}>{fmt(b.amount||b.job_amount)}</td>
                  <td style={{ padding:'9px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700,
                      background: b.status==='synced'?'#E8FFF4':'#FFF8E8',
                      color: b.status==='synced'?'#1E9E5A':'#D4920A' }}>
                      {b.status||'pending'}
                    </span>
                  </td>
                  <td style={{ padding:'9px 14px', color:'#6A9B95', fontSize:11 }}>{b.source||'Manual'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {bills.length >= PAGE_SIZE && (
          <div style={{ textAlign:'center', padding:'8px', fontSize:12, color:'#6A9B95' }}>
            Showing {bills.length} results · Use date range or worker filter to narrow down
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:700, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, marginBottom:16, display:'flex', justifyContent:'space-between', color:'#0B2E2B' }}>
<<<<<<< HEAD
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
=======
              Add Job Work Bill <button onClick={()=>setShowForm(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer' }}>×</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
              {[['bill_number','Bill No *'],['bill_date','Date *','date'],['job_worker_name','Job Worker *'],['gst_number','GSTIN'],['process_type','Process Type'],['design_number','Design No'],['design_name','Design Name']].map(([k,l,t])=>(
                <div key={k}>
                  <label style={{ fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 }}>{l}</label>
                  <input type={t||'text'} value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, boxSizing:'border-box' }} />
>>>>>>> c616550cd35025a4bdb9d31b50b54bf0253d240e
                </div>
              ))}
            </div>
            <div style={{ marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'#475569', textTransform:'uppercase' }}>Line Items</span>
                <button onClick={() => setForm(p => ({...p, line_items: [...p.line_items, {item_name:'', quantity:'', rate:'', charges:''}]}))} style={BTN({ background:'#E2E8F0', color:'#475569', padding:'4px 10px' })}>+ Add Row</button>
              </div>
              {form.line_items.map((li,idx)=>(
                <div key={idx} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 40px', gap:8, marginBottom:8, alignItems:'center' }}>
                  <input placeholder="Fabric Name *" value={li.item_name} onChange={e=>{const nl=[...form.line_items]; nl[idx].item_name=e.target.value; setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13 }} />
                  <input type="number" placeholder="Qty" value={li.quantity} onChange={e=>{const nl=[...form.line_items]; nl[idx].quantity=e.target.value; nl[idx].charges=(parseFloat(nl[idx].quantity||0)*parseFloat(nl[idx].rate||0)).toFixed(2); setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13 }} />
                  <input type="number" placeholder="Rate" value={li.rate} onChange={e=>{const nl=[...form.line_items]; nl[idx].rate=e.target.value; nl[idx].charges=(parseFloat(nl[idx].quantity||0)*parseFloat(nl[idx].rate||0)).toFixed(2); setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13 }} />
                  <input type="number" placeholder="Charges *" value={li.charges} onChange={e=>{const nl=[...form.line_items]; nl[idx].charges=e.target.value; setForm(p=>({...p,line_items:nl}))}} style={{ padding:'8px', borderRadius:6, border:'1px solid #CBD5E1', fontSize:13, background:'#F1F5F9', fontWeight:600 }} />
                  <button onClick={()=>{const nl=form.line_items.filter((_,i)=>i!==idx); setForm(p=>({...p,line_items:nl}))}} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', fontSize:18 }}>×</button>
                </div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
              {[['igst_amount','IGST'],['cgst_amount','CGST'],['sgst_amount','SGST'],['round_off','Round Off'],['amount','Total Amount *']].map(([k,l])=>(
                <div key={k} style={k==='amount'?{gridColumn:'span 2'}:{}}>
                  <label style={{ fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 }}>{l}</label>
                  <input type="number" value={form[k]||''} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, boxSizing:'border-box', background:k==='amount'?'#E8FFF4':'#fff', fontWeight:k==='amount'?700:400 }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 }}>Notes</label>
              <textarea value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, boxSizing:'border-box', minHeight:50 }} />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={saveBill} disabled={saving} style={BTN({ background:'linear-gradient(135deg,#3DBFAE,#2BA898)', color:'#fff', flex:1, padding:'12px', fontSize:14 })}>
<<<<<<< HEAD
<<<<<<< HEAD
                {saving?'Posting Billâ€¦':'Save Job Work Bill (Prepared for Tally Sync)'}
=======
                {saving?'Posting Bill\u2026':'Save Job Work Bill (Prepared for Tally Sync)'}
>>>>>>> 261966f0bae1b36f05912d180f7e44890042182a
=======
                {saving?'Saving…':'Save Bill'}
>>>>>>> c616550cd35025a4bdb9d31b50b54bf0253d240e
              </button>
              <button onClick={()=>setShowForm(false)} style={BTN({ background:'#f1f5f9', color:'#4A7A74', padding:'12px 24px' })}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


