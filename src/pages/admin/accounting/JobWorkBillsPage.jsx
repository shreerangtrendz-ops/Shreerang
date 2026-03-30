import { useState, useEffect, useCallback } from 'react';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';

const T = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6',
  gold:'#E8A800', goldLight:'#FFF8E8',
  green:'#1E9E5A', greenLight:'#E8FFF4',
  blue:'#2468C8', blueLight:'#EBF8FF',
  red:'#E74C3C', redLight:'#FFF5F5',
  orange:'#E67E22', purple:'#9B59B6',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', muted:'#6A9B95',
};

const fmt = n => '₹' + Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0});
const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtQty = n => Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:2});

const PROCESS_COLORS = {
  issued:   {bg:'#FEF3C7', col:'#B45309'},
  received: {bg:'#D1FAE5', col:'#065F46'},
  'Issue to Mill':    {bg:'#FEF3C7', col:'#B45309'},
  'REC FROM MILL':    {bg:'#D1FAE5', col:'#065F46'},
  'Material Out':     {bg:'#FEE2E2', col:'#991B1B'},
  'Material In':      {bg:'#DBEAFE', col:'#1D4ED8'},
};
function processChip(pt) {
  const pc = PROCESS_COLORS[pt] || {bg:'#F3F4F6', col:'#374151'};
  return (
    <span style={{padding:'2px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:pc.bg,color:pc.col,whiteSpace:'nowrap'}}>
      {pt||'—'}
    </span>
  );
}

function statusChip(status) {
  const s = (status||'').toLowerCase();
  const map = {
    synced:  {bg:'#DBEAFE',col:'#1D4ED8'},
    paid:    {bg:'#D1FAE5',col:'#065F46'},
    pending: {bg:'#FEF3C7',col:'#B45309'},
    manual:  {bg:'#F3F4F6',col:'#374151'},
  };
  const c = map[s] || {bg:'#F3F4F6',col:'#374151'};
  return (
    <span style={{padding:'2px 9px',borderRadius:20,fontSize:10,fontWeight:700,background:c.bg,color:c.col}}>
      {status||'pending'}
    </span>
  );
}

export default function JobWorkBillsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const today = new Date().toISOString().slice(0,10);
  const fyStart = new Date().getMonth()>=3 ? `${new Date().getFullYear()}-04-01` : `${new Date().getFullYear()-1}-04-01`;
  const [dateFrom, setDateFrom] = useState(fyStart);
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearch]   = useState('');
  const [processFilter, setProcessFilter] = useState('all');
  const [workerFilter, setWorkerFilter]   = useState('all');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [workers, setWorkers] = useState([]);
  const [sortCol, setSortCol] = useState('issue_date');
  const [sortDir, setSortDir] = useState('desc');

  const load = useCallback(async () => {
    setLoading(true);
    const [manual, synced] = await Promise.all([
      supabase.from('job_work_bills').select('*')
        .gte('bill_date', dateFrom).lte('bill_date', dateTo)
        .order('bill_date', {ascending: false}),
      supabase.from('process_issues').select('*')
        .gte('issue_date', dateFrom).lte('issue_date', dateTo)
        .order('issue_date', {ascending: false})
    ]);

    const combined = [
      ...(manual.data||[]).map(m => ({
        _id: 'M-'+m.id, id: m.id, _src: 'Manual',
        bill_number: m.bill_number,
        issue_date: m.bill_date,
        worker_name: m.job_worker_name,
        design_no: m.design_number,
        process_type: m.process_type || 'Manual',
        quantity: null, rate: null,
        job_amount: m.amount,
        status: m.status || 'pending',
        // Manual extra fields
        gst_number: m.gst_number,
        igst_amount: m.igst_amount,
        cgst_amount: m.cgst_amount,
        sgst_amount: m.sgst_amount,
        notes: m.notes,
        line_items: m.line_items,
        tally_sync_status: m.tally_sync_status,
      })),
      ...(synced.data||[]).map(s => ({
        _id: 'T-'+s.id, id: s.id, _src: 'Tally',
        bill_number: s.voucher_number || s.challan_no || `JW-${s.id?.slice(0,6)}`,
        issue_date: s.issue_date,
        worker_name: s.worker_name || s.mill_name,
        design_no: s.design_no,
        process_type: s.process_type,
        quantity: s.process_type === 'received' ? s.metres_received : s.metres_issued,
        rate: s.job_rate,
        job_amount: s.job_amount,
        status: 'synced',
        // Full Tally chain fields
        gp_bill_no: s.gp_bill_no,
        lot_no: s.lot_no,
        party_ch_no: s.party_ch_no,
        issue_challan_no: s.issue_challan_no,
        grey_fabric_name: s.grey_fabric_name,
        finished_fabric_name: s.finished_fabric_name,
        metres_issued: s.metres_issued,
        metres_received: s.metres_received,
        shortage_mtrs: s.shortage_mtrs,
        shortage_pct: s.shortage_pct,
        weaver_name: s.weaver_name,
        quality_name: s.quality_name,
        mill_godown: s.mill_godown,
        source_godown: s.source_godown,
        narration: s.narration,
        tally_synced_at: s.tally_synced_at,
      }))
    ];

    // Unique workers list
    const w = [...new Set(combined.map(r => r.worker_name).filter(Boolean))].sort();
    setWorkers(w);
    setRows(combined);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // Client-side filtering
  const filtered = rows.filter(r => {
    if (processFilter !== 'all' && r.process_type !== processFilter) return false;
    if (workerFilter  !== 'all' && r.worker_name  !== workerFilter)  return false;
    if (statusFilter  !== 'all' && r.status       !== statusFilter)  return false;
    if (search) {
      const q = search.toLowerCase();
      return (r.worker_name||'').toLowerCase().includes(q)
          || (r.bill_number||'').toLowerCase().includes(q)
          || (r.design_no||'').toLowerCase().includes(q)
          || (r.gp_bill_no||'').toLowerCase().includes(q)
          || (r.party_ch_no||'').toLowerCase().includes(q)
          || (r.lot_no||'').toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (sortCol === 'job_amount' || sortCol === 'quantity') { va = Number(va||0); vb = Number(vb||0); }
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalAmount  = filtered.reduce((s,r) => s+Number(r.job_amount||0), 0);
  const totalIssued  = filtered.filter(r => (r.process_type||'').toLowerCase().includes('issu') || r.process_type==='issued').reduce((s,r) => s+Number(r.metres_issued||r.quantity||0), 0);
  const totalRecvd   = filtered.filter(r => (r.process_type||'').toLowerCase().includes('rec')  || r.process_type==='received').reduce((s,r) => s+Number(r.metres_received||r.quantity||0), 0);
  const shortage     = totalIssued > 0 ? ((totalIssued - totalRecvd) / totalIssued * 100).toFixed(1) : '—';

  const processTypes = [...new Set(rows.map(r => r.process_type).filter(Boolean))];

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  function exportCSV() {
    const headers = ['Bill No','Date','Worker/Mill','Design No','Process','Qty','Rate','Amount','Status','GP Bill','Lot No','Party Ch No','Issued Mtrs','Rcvd Mtrs','Shortage%','Source'];
    const csvRows = filtered.map(r => [
      r.bill_number, r.issue_date, r.worker_name, r.design_no||'',
      r.process_type||'', r.quantity||'', r.rate||'', r.job_amount||'',
      r.status, r.gp_bill_no||'', r.lot_no||'', r.party_ch_no||'',
      r.metres_issued||'', r.metres_received||'', r.shortage_pct||'', r._src
    ].map(v => `"${v}"`).join(','));
    const blob = new Blob([[headers.join(','),...csvRows].join('\n')], {type:'text/csv'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `JobWorkBills_${dateFrom}_to_${dateTo}.csv`; a.click();
  }

  const TH = ({label, col, right}) => (
    <th onClick={() => col && toggleSort(col)} style={{
      padding:'10px 12px', textAlign: right?'right':'left', fontSize:10.5, fontWeight:700,
      color: T.muted, textTransform:'uppercase', letterSpacing:.4,
      borderBottom:`1px solid ${T.border}`, background:T.bg, whiteSpace:'nowrap',
      cursor: col ? 'pointer' : 'default',
      userSelect:'none',
    }}>
      {label} {col && sortCol===col ? (sortDir==='asc'?'↑':'↓') : ''}
    </th>
  );

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif", background:T.bg, minHeight:'100vh', padding:'20px 24px'}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.text,margin:0,display:'flex',alignItems:'center',gap:8}}>
            🧾 Job Work Bills
          </h1>
          <p style={{color:T.muted,fontSize:12,margin:'4px 0 0'}}>
            Issue to Mill · REC from Mill · Processing Charges — All Tally data
          </p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={exportCSV} style={{padding:'8px 14px',background:T.green,color:'#fff',border:'none',borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer'}}>📥 Export CSV</button>
          <button onClick={load} style={{padding:'8px 14px',background:T.teal,color:'#fff',border:'none',borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer'}}>🔄 Refresh</button>
          <button onClick={() => navigate('/admin/design-lifecycle')} style={{padding:'8px 14px',background:T.tealDark,color:'#fff',border:'none',borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer'}}>🔗 Design Chain</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:18}}>
        {[
          {label:'Total Entries', value:filtered.length,              icon:'📋', color:T.blue},
          {label:'Total Charges', value:fmt(totalAmount),             icon:'💰', color:T.gold},
          {label:'Total Issued',  value:fmtQty(totalIssued)+' m',    icon:'📦', color:T.orange},
          {label:'Total Received',value:fmtQty(totalRecvd)+' m',     icon:'✅', color:T.green},
          {label:'Avg Shrinkage', value:(shortage==='—'?'—':shortage+'%'), icon:'📉', color: typeof shortage==='string'||parseFloat(shortage)<=5?T.green:T.red},
        ].map((c,i) => (
          <div key={i} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 16px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:c.color}}/>
            <div style={{fontSize:10,color:T.muted,fontWeight:600,textTransform:'uppercase',letterSpacing:.4,marginBottom:6}}>{c.label}</div>
            <div style={{fontSize:20,fontWeight:800,color:c.color,fontFamily:"'Playfair Display',serif"}}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:14,marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>

        {/* Date Range */}
        <div>
          <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>From</div>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,outline:'none'}}/>
        </div>
        <div>
          <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>To</div>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,outline:'none'}}/>
        </div>

        {/* Quick Ranges */}
        <div style={{display:'flex',gap:6,alignSelf:'flex-end'}}>
          {[
            {label:'Today',    fn:()=>{setDateFrom(today);setDateTo(today);}},
            {label:'This Month',fn:()=>{setDateFrom(today.slice(0,7)+'-01');setDateTo(today);}},
            {label:'This FY',  fn:()=>{setDateFrom(fyStart);setDateTo(today);}},
          ].map(q => (
            <button key={q.label} onClick={q.fn} style={{padding:'6px 10px',borderRadius:7,border:`1px solid ${T.border}`,background:T.bg,color:T.text,fontSize:11,fontWeight:600,cursor:'pointer'}}>
              {q.label}
            </button>
          ))}
        </div>

        <div style={{width:1,height:32,background:T.border,alignSelf:'flex-end'}}/>

        {/* Process Type Filter */}
        <div>
          <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Process Type</div>
          <select value={processFilter} onChange={e=>setProcessFilter(e.target.value)}
            style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,background:'#fff',outline:'none',minWidth:140}}>
            <option value="all">All Types</option>
            {processTypes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Worker Filter */}
        <div>
          <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Mill / Worker</div>
          <select value={workerFilter} onChange={e=>setWorkerFilter(e.target.value)}
            style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,background:'#fff',outline:'none',minWidth:160}}>
            <option value="all">All Mills</option>
            {workers.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Status</div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,background:'#fff',outline:'none'}}>
            <option value="all">All Status</option>
            <option value="synced">Synced</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Search */}
        <div style={{flex:1,minWidth:180}}>
          <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Search</div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Bill no, worker, design, GP no, lot no…"
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
        </div>
      </div>

      {/* Table */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:12,color:T.muted,fontWeight:600}}>{filtered.length} entries</span>
          <span style={{fontSize:12,color:T.teal,fontWeight:700}}>{fmt(totalAmount)} total charges</span>
        </div>

        {loading ? (
          <div style={{padding:40,textAlign:'center',color:T.muted}}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{padding:40,textAlign:'center',color:T.muted}}>
            <div style={{fontSize:32,marginBottom:8}}>🧾</div>
            <div>No records for the selected filters.</div>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
              <thead>
                <tr>
                  <TH label="Bill No"    col="bill_number"/>
                  <TH label="Date"       col="issue_date"/>
                  <TH label="Mill / Worker"/>
                  <TH label="Process"    col="process_type"/>
                  <TH label="Design No"  col="design_no"/>
                  <TH label="GP Bill"    col="gp_bill_no"/>
                  <TH label="Lot No"     col="lot_no"/>
                  <TH label="Qty (m)"    col="quantity"    right/>
                  <TH label="Rate"       col="rate"        right/>
                  <TH label="Amount"     col="job_amount"  right/>
                  <TH label="Status"/>
                  <TH label="Source"/>
                  <TH label=""/>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const isExpanded = expandedId === r._id;
                  const shortage_pct = parseFloat(r.shortage_pct||0);
                  return (<>
                    <tr key={r._id} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?T.surface:T.bg, cursor:'pointer'}}
                      onClick={()=>setExpandedId(isExpanded?null:r._id)}>
                      <td style={{padding:'9px 12px',fontWeight:700,color:T.teal,whiteSpace:'nowrap'}}>{r.bill_number}</td>
                      <td style={{padding:'9px 12px',color:T.muted,whiteSpace:'nowrap'}}>{fmtD(r.issue_date)}</td>
                      <td style={{padding:'9px 12px',fontWeight:500,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.worker_name||'—'}</td>
                      <td style={{padding:'9px 12px'}}>{processChip(r.process_type)}</td>
                      <td style={{padding:'9px 12px',color:T.blue,fontWeight:600}}>{r.design_no||'—'}</td>
                      <td style={{padding:'9px 12px',color:T.orange,fontWeight:600}}>{r.gp_bill_no||'—'}</td>
                      <td style={{padding:'9px 12px',color:T.text,fontSize:11}}>{r.lot_no||'—'}</td>
                      <td style={{padding:'9px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace"}}>{r.quantity!=null?fmtQty(r.quantity):'—'}</td>
                      <td style={{padding:'9px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace"}}>{r.rate?fmt(r.rate):'—'}</td>
                      <td style={{padding:'9px 12px',textAlign:'right',fontWeight:800,color:T.gold,fontFamily:"'DM Mono',monospace"}}>{fmt(r.job_amount)}</td>
                      <td style={{padding:'9px 12px'}}>{statusChip(r.status)}</td>
                      <td style={{padding:'9px 12px',fontSize:10,color:T.muted}}>
                        <span style={{padding:'2px 7px',borderRadius:4,background:r._src==='Tally'?'#DBEAFE':'#F3F4F6',color:r._src==='Tally'?'#1D4ED8':'#374151',fontWeight:700}}>
                          {r._src}
                        </span>
                      </td>
                      <td style={{padding:'9px 12px',textAlign:'center',color:T.teal}}>
                        {isExpanded ? '▲' : '▼'}
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr key={r._id+'-exp'} style={{borderBottom:`2px solid ${T.teal}`}}>
                        <td colSpan={13} style={{padding:'16px 20px',background:'#F8FFFE',borderTop:`1px solid ${T.border}`}}>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>

                            {/* Column 1: Chain Info */}
                            <div>
                              <div style={{fontSize:11,fontWeight:800,color:T.teal,marginBottom:10,textTransform:'uppercase',letterSpacing:.5}}>
                                🔗 Chain Linkage
                              </div>
                              {[
                                {l:'GP Purchase Bill No', v:r.gp_bill_no, link:r.gp_bill_no?`/admin/accounting/purchase-bills`:null, icon:'📥'},
                                {l:'Lot No (Batch)',       v:r.lot_no},
                                {l:'Issue Challan No',    v:r.issue_challan_no},
                                {l:'Party Ch. No (JW Bill)', v:r.party_ch_no, icon:'🧾'},
                                {l:'Grey Fabric',         v:r.grey_fabric_name},
                                {l:'Finished Fabric',     v:r.finished_fabric_name},
                                {l:'Mill Godown',         v:r.mill_godown},
                                {l:'Source Godown',       v:r.source_godown},
                              ].map(({l,v,link,icon}) => (
                                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${T.border}`,fontSize:12}}>
                                  <span style={{color:T.muted}}>{icon||''} {l}</span>
                                  <span style={{fontWeight:600,color:link?T.blue:T.text,cursor:link?'pointer':'default',textDecoration:link?'underline':'none'}}
                                    onClick={link?()=>navigate(link):undefined}>
                                    {v||'—'}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Column 2: Qty & Shortage */}
                            <div>
                              <div style={{fontSize:11,fontWeight:800,color:T.orange,marginBottom:10,textTransform:'uppercase',letterSpacing:.5}}>
                                📊 Quantities & Shortage
                              </div>
                              {[
                                {l:'Metres Issued',     v: fmtQty(r.metres_issued)+' m'},
                                {l:'Metres Received',   v: fmtQty(r.metres_received)+' m'},
                                {l:'Shortage Metres',   v: r.shortage_mtrs ? fmtQty(r.shortage_mtrs)+' m' : '—'},
                                {l:'Shortage %', v: shortage_pct ? shortage_pct.toFixed(2)+'%' : '—',
                                 color: shortage_pct > 10 ? T.red : shortage_pct > 5 ? T.orange : T.green},
                                {l:'Weaver Name',       v: r.weaver_name},
                                {l:'Quality Name',      v: r.quality_name},
                                {l:'Job Rate',          v: r.rate ? fmt(r.rate)+'/m' : '—'},
                                {l:'Job Amount',        v: fmt(r.job_amount)},
                              ].map(({l,v,color}) => (
                                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${T.border}`,fontSize:12}}>
                                  <span style={{color:T.muted}}>{l}</span>
                                  <span style={{fontWeight:600, color:color||T.text}}>{v||'—'}</span>
                                </div>
                              ))}

                              {/* Shortage alert */}
                              {shortage_pct > 10 && (
                                <div style={{marginTop:10,padding:'8px 12px',background:'#FFF5F5',border:`1px solid ${T.red}`,borderRadius:7,fontSize:11,color:T.red,fontWeight:600}}>
                                  ⚠ High Shortage: {shortage_pct.toFixed(2)}% — Investigate with {r.worker_name}
                                </div>
                              )}
                            </div>

                            {/* Column 3: Notes & Design */}
                            <div>
                              <div style={{fontSize:11,fontWeight:800,color:T.blue,marginBottom:10,textTransform:'uppercase',letterSpacing:.5}}>
                                🎨 Design & Notes
                              </div>
                              {[
                                {l:'Design No',         v:r.design_no},
                                {l:'Narration',         v:r.narration},
                                {l:'Source',            v:r._src},
                                {l:'Tally Synced At',   v:r.tally_synced_at?new Date(r.tally_synced_at).toLocaleString('en-IN'):null},
                              ].map(({l,v}) => (
                                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${T.border}`,fontSize:12}}>
                                  <span style={{color:T.muted}}>{l}</span>
                                  <span style={{fontWeight:600,color:T.text,maxWidth:200,textAlign:'right',wordBreak:'break-word'}}>{v||'—'}</span>
                                </div>
                              ))}

                              {/* Manual bill line items */}
                              {r._src === 'Manual' && r.line_items?.length > 0 && (
                                <div style={{marginTop:10}}>
                                  <div style={{fontSize:10,fontWeight:700,color:T.muted,marginBottom:6,textTransform:'uppercase'}}>Line Items</div>
                                  {r.line_items.map((li,idx) => (
                                    <div key={idx} style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'3px 0',borderBottom:`1px dashed ${T.border}`}}>
                                      <span>{li.item_name}</span>
                                      <span style={{color:T.gold,fontWeight:700}}>{fmt(li.charges)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div style={{marginTop:12,display:'flex',gap:8,flexWrap:'wrap'}}>
                                {r.design_no && (
                                  <button onClick={()=>navigate(`/admin/design-lifecycle?design=${r.design_no}`)}
                                    style={{padding:'6px 12px',background:T.teal,color:'#fff',border:'none',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                                    🔗 View Design Chain
                                  </button>
                                )}
                                {r.gp_bill_no && (
                                  <button onClick={()=>navigate(`/admin/accounting/purchase-bills?search=${r.gp_bill_no}`)}
                                    style={{padding:'6px 12px',background:T.orange,color:'#fff',border:'none',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                                    📥 View GP Bill
                                  </button>
                                )}
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </>);
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div style={{marginTop:12,fontSize:11,color:T.muted,textAlign:'center'}}>
        Click any row to expand full Tally detail · Chain: <strong>Purchase (GP Bill) → Issue to Mill → REC from Mill (Party Ch. No.) → Design No. → Sales</strong>
      </div>
    </div>
  );
}
