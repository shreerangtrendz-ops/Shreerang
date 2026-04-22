import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

/* ══════════════════════════════════════════════════════════════
   GREY PURCHASE REGISTER — v3
   Bill-grouped view: one parent card per Tally voucher,
   child rows per lot/batch, each lot expands → REC FROM MILL
   ══════════════════════════════════════════════════════════════ */

const T = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6',
  gold:'#E8A800', goldLight:'#FFF8E8',
  green:'#1E9E5A', greenLight:'#E8FFF4',
  blue:'#2468C8', blueLight:'#EBF8FF',
  red:'#D93025', redLight:'#FFF5F5',
  orange:'#E67E22', orangeLight:'#FFF3E8',
  purple:'#7C3AED', purpleLight:'#F3EEFF',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95', textFaint:'#A8C9C3',
};

const fmt     = n => '₹' + Math.abs(Number(n||0)).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtL    = n => { const v=Math.abs(Number(n||0)); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:fmt(v); };
const fmtMtr  = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + ' m';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '—';
const PAGE    = 50;

const FY_YEARS = [2022,2023,2024,2025,2026];
function getCurrentFY() {
  const now = new Date();
  const yr  = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { from:`${yr}-04-01`, to:`${yr+1}-03-31`, yr };
}

function Badge({ label, color=T.teal, bg }) {
  return (
    <span style={{
      padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:700,
      background:bg||color+'22', color, letterSpacing:.3, whiteSpace:'nowrap',
    }}>
      {label}
    </span>
  );
}

function SummaryCard({ label, value, sub, color=T.teal }) {
  return (
    <div style={{background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
      padding:'14px 18px', borderTop:`3px solid ${color}`}}>
      <div style={{fontSize:10,color:T.textMuted,fontWeight:700,textTransform:'uppercase',
        letterSpacing:.6,marginBottom:6}}>{label}</div>
      <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:22,
        color:T.text,lineHeight:1}}>{value}</div>
      {sub && <div style={{fontSize:11,color:T.textMuted,marginTop:4}}>{sub}</div>}
    </div>
  );
}

// ─── Tiny detail row ─────────────────────────────────────────
function KV({ label, value, color }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0',
      borderBottom:`1px solid ${T.border}`,fontSize:12}}>
      <span style={{color:T.textMuted}}>{label}</span>
      <span style={{color:color||T.text,fontWeight:500}}>{value}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function GreyPurchasePage() {
  const fy = getCurrentFY();

  // ─── Data state ────────────────────────────────────────────
  const [bills, setBills]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]           = useState(0);
  const [summary, setSummary]     = useState({mtrs:0,amt:0,comm:0,gst:0,lots:0,suppliers:0});

  // ─── Expand state (two-level) ──────────────────────────────
  // expandedBill = tally_voucher_no of open bill card
  // expandedLot  = id of open lot row (shows REC FROM MILL inline)
  const [expandedBill, setExpandedBill] = useState(null);
  const [expandedLot,  setExpandedLot]  = useState(null);

  // ─── REC FROM MILL linked data ─────────────────────────────
  const [linkedRecs,  setLinkedRecs]  = useState({});  // { [lotId]: [...] }
  const [loadingRecs, setLoadingRecs] = useState({});  // { [lotId]: true/false }

  // ─── Filter state ──────────────────────────────────────────
  const [search,         setSearch]         = useState('');
  const [dateFrom,       setDateFrom]       = useState(fy.from);
  const [dateTo,         setDateTo]         = useState(fy.to);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [brokerFilter,   setBrokerFilter]   = useState('');
  const [activeFY,       setActiveFY]       = useState(fy.yr);

  const setFY = yr => {
    setActiveFY(yr);
    setDateFrom(`${yr}-04-01`);
    setDateTo(`${yr+1}-03-31`);
    setPage(0);
  };

  // ─── Group flat rows → bill groups (by tally_voucher_no) ──
  const billGroups = useMemo(() => {
    const map = {};
    bills.forEach(b => {
      const key = b.tally_voucher_no || `_lone_${b.id}`;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    // Sort each group's lots by taka_no / lot_no then sort groups by date desc
    return Object.values(map).sort(
      (a, b) => new Date(b[0].voucher_date) - new Date(a[0].voucher_date)
    );
  }, [bills]);

  // ─── Fetch paginated rows ──────────────────────────────────
  const fetchBills = useCallback(async (pg=0) => {
    setLoading(true);
    const from = pg*PAGE, to = from+PAGE-1;
    let q = supabase.from('grey_purchase')
      .select('*', {count:'exact'})
      .order('voucher_date', {ascending:false})
      .order('tally_voucher_no', {ascending:false})
      .range(from, to);
    if (dateFrom)        q = q.gte('voucher_date',  dateFrom);
    if (dateTo)          q = q.lte('voucher_date',  dateTo);
    if (supplierFilter)  q = q.ilike('supplier_name', `%${supplierFilter}%`);
    if (brokerFilter)    q = q.ilike('broker_name',   `%${brokerFilter}%`);
    if (search)          q = q.or(
      `lot_no.ilike.%${search}%,supplier_name.ilike.%${search}%,` +
      `supplier_invoice_no.ilike.%${search}%,item_name.ilike.%${search}%,` +
      `tally_voucher_no.ilike.%${search}%`
    );
    const { data, error, count } = await q;
    if (!error) { setBills(data||[]); setTotalCount(count||0); }
    setPage(pg);
    setLoading(false);
  }, [dateFrom,dateTo,supplierFilter,brokerFilter,search]);

  // ─── Summary across full date range ───────────────────────
  const fetchSummary = useCallback(async () => {
    const { data } = await supabase.from('grey_purchase')
      .select('actual_qty_mtrs,total_amount,item_amount,comm_amount,cgst_amount,sgst_amount,igst_amount,lot_no,supplier_name')
      .gte('voucher_date', dateFrom)
      .lte('voucher_date', dateTo);
    if (!data) return;
    setSummary({
      mtrs:      data.reduce((s,r)=>s+Number(r.actual_qty_mtrs||0),0),
      amt:       data.reduce((s,r)=>s+Number(r.item_amount||r.total_amount||0),0),
      comm:      data.reduce((s,r)=>s+Math.abs(Number(r.comm_amount||0)),0),
      gst:       data.reduce((s,r)=>s+Number(r.cgst_amount||0)+Number(r.sgst_amount||0)+Number(r.igst_amount||0),0),
      lots:      new Set(data.map(r=>r.lot_no).filter(Boolean)).size,
      suppliers: new Set(data.map(r=>r.supplier_name).filter(Boolean)).size,
    });
  }, [dateFrom,dateTo]);

  // ─── mill_godown_map cache: short godown name → full registered name ──────
  const [millNameMap, setMillNameMap] = useState({});
  useEffect(() => {
    supabase.from('mill_godown_map').select('godown_name,party_name').then(({data}) => {
      if (data) {
        const m = {};
        data.forEach(r => { if (r.godown_name) m[r.godown_name] = r.party_name; });
        setMillNameMap(m);
      }
    });
  }, []);

  const resolveMillName = (rec) => {
    // Prefer mill_name (full), fall back to map lookup via job_godown, then job_godown itself
    if (rec.mill_name) return rec.mill_name;
    if (rec.job_godown && millNameMap[rec.job_godown]) return millNameMap[rec.job_godown];
    return rec.job_godown || '—';
  };

  // ─── Fetch REC FROM MILL for a specific lot ────────────────
  const fetchLinkedRecs = async (lotNo, lotId) => {
    if (linkedRecs[lotId] !== undefined) return; // already fetched
    setLoadingRecs(p=>({...p,[lotId]:true}));
    const { data } = await supabase.from('rec_from_mill')
      .select(
        'design_no,party_challan_no,voucher_date,finish_qty_mtrs,' +
        'shortage_mtrs,shortage_pct,job_rate,job_amount,' +
        'grey_purchase_rate,grey_cost_actual,cumulative_cost_per_mtr,' +
        'mill_name,job_godown,finish_item_name,stage_no'
      )
      .eq('grey_lot_no', lotNo)
      .order('voucher_date', {ascending:true});
    setLinkedRecs(p=>({...p,[lotId]:data||[]}));
    setLoadingRecs(p=>({...p,[lotId]:false}));
  };

  useEffect(()=>{ fetchBills(0); }, [fetchBills]);
  useEffect(()=>{ fetchSummary(); }, [fetchSummary]);

  const inp = {
    padding:'7px 10px', borderRadius:6, border:`1px solid ${T.border}`,
    fontSize:12, color:T.text, background:T.surface, outline:'none',
  };

  // ══════════════════════════════════════════════════════════
  return (
    <div style={{background:T.bg,minHeight:'100vh',padding:'20px 16px',
      fontFamily:"'DM Sans',sans-serif"}}>

      {/* ── Header ── */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:26,
          color:T.tealDark,margin:0}}>
          Grey Purchase Register
        </h1>
        <p style={{fontSize:12,color:T.textMuted,margin:'4px 0 0'}}>
          Tally grey fabric purchases · Bill-grouped lot view · Broker commission · Linked REC &amp; costing
        </p>
      </div>

      {/* ── FY Tabs ── */}
      <div style={{display:'flex',gap:4,marginBottom:16,background:T.surface,
        border:`1px solid ${T.border}`,borderRadius:8,padding:4,width:'fit-content'}}>
        {FY_YEARS.map(yr=>(
          <button key={yr} onClick={()=>setFY(yr)}
            style={{padding:'5px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,
              fontWeight:700,background:activeFY===yr?T.teal:'transparent',
              color:activeFY===yr?'#fff':T.textMuted,transition:'all .15s'}}>
            FY {yr.toString().slice(2)}-{(yr+1).toString().slice(2)}
          </button>
        ))}
      </div>

      {/* ── Summary Cards ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',
        gap:12,marginBottom:20}}>
        <SummaryCard label="Total Metres"       value={fmtMtr(summary.mtrs)}  color={T.teal}/>
        <SummaryCard label="Total Amount"       value={fmtL(summary.amt)}     color={T.green}/>
        <SummaryCard label="Broker Commission"  value={fmtL(summary.comm)}    color={T.gold}/>
        <SummaryCard label="Total GST"          value={fmtL(summary.gst)}     color={T.blue}/>
        <SummaryCard label="Unique Lots"        value={summary.lots}           sub="grey batches" color={T.purple}/>
        <SummaryCard label="Suppliers"          value={summary.suppliers}      color={T.orange}/>
      </div>

      {/* ── Filters ── */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,
        padding:'12px 16px',marginBottom:16,display:'flex',flexWrap:'wrap',gap:10,alignItems:'center'}}>
        <input placeholder="Search lot, voucher no, supplier, invoice…"
          value={search} onChange={e=>setSearch(e.target.value)}
          style={{...inp,minWidth:240}}/>
        <input placeholder="Supplier name…"
          value={supplierFilter} onChange={e=>setSupplierFilter(e.target.value)}
          style={{...inp,minWidth:140}}/>
        <input placeholder="Broker name…"
          value={brokerFilter} onChange={e=>setBrokerFilter(e.target.value)}
          style={{...inp,minWidth:120}}/>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={inp}/>
        <span style={{color:T.textFaint}}>to</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={inp}/>
        <button onClick={()=>{fetchBills(0);fetchSummary();}}
          style={{padding:'7px 16px',borderRadius:6,border:'none',background:T.teal,
            color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>
          Apply
        </button>
      </div>

      {/* ── Row / bill count ── */}
      <div style={{fontSize:12,color:T.textMuted,marginBottom:10}}>
        {loading ? 'Loading…' :
          `Showing ${bills.length} rows in ${billGroups.length} bill${billGroups.length!==1?'s':''} (page ${page+1}) · ${totalCount.toLocaleString()} total rows`}
      </div>

      {/* ── Loading placeholder ── */}
      {loading && (
        <div style={{textAlign:'center',padding:60,color:T.textMuted}}>Loading…</div>
      )}

      {/* ══════════════════════════════════════════════════════
          BILL GROUPS
          ══════════════════════════════════════════════════════ */}
      {!loading && billGroups.map(group => {
        const first      = group[0];
        const billKey    = first.tally_voucher_no || `_${first.id}`;
        const isMultiLot = group.length > 1;
        const isBillOpen = expandedBill === billKey;
        const hasBroker  = first.broker_name && first.broker_name !== 'Self';

        // Aggregate quantity across all lots in this bill
        const totalQty = group.reduce((s,b)=>s+Number(b.actual_qty_mtrs||0), 0);
        // For multi-lot bills use sum of item_amount per lot; for single use total_amount
        const totalAmt = isMultiLot
          ? group.reduce((s,b)=>s+Number(b.item_amount||0), 0)
          : Number(first.total_amount||0);

        return (
          <div key={billKey}
            style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,
              marginBottom:10,overflow:'hidden',
              boxShadow:isBillOpen?`0 2px 16px ${T.teal}22`:'none',
              transition:'box-shadow .2s'}}>

            {/* ─── Bill Header ─── */}
            <div
              role="button" tabIndex={0}
              onClick={()=>{
                setExpandedBill(isBillOpen ? null : billKey);
                // Collapse any open lot when switching bills
                if (!isBillOpen) setExpandedLot(null);
              }}
              onKeyDown={e=>e.key==='Enter'&&setExpandedBill(isBillOpen?null:billKey)}
              style={{
                display:'flex',alignItems:'center',gap:12,padding:'13px 16px',
                cursor:'pointer',transition:'background .12s',
                background:isBillOpen ? T.tealLight : '#fff',
                borderLeft:`4px solid ${hasBroker ? T.gold : T.teal}`,
              }}
              onMouseEnter={e=>{if(!isBillOpen)e.currentTarget.style.background=T.bg}}
              onMouseLeave={e=>{if(!isBillOpen)e.currentTarget.style.background='#fff'}}
            >
              {/* Voucher number + date */}
              <div style={{flexShrink:0,minWidth:96}}>
                <div style={{fontFamily:'monospace',fontWeight:800,fontSize:14,color:T.teal}}>
                  #{first.tally_voucher_no||'—'}
                </div>
                <div style={{fontSize:10,color:T.textMuted}}>{fmtDate(first.voucher_date)}</div>
              </div>

              {/* Supplier + invoice */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:T.text,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {first.supplier_name||'—'}
                </div>
                <div style={{fontSize:11,color:T.textMuted}}>
                  {first.supplier_invoice_no ? `Inv: ${first.supplier_invoice_no}` : '—'}
                  {isMultiLot && <span style={{marginLeft:6,color:T.purple,fontWeight:700}}>· {group.length} lots</span>}
                </div>
              </div>

              {/* Badges */}
              <div style={{display:'flex',gap:6,flexShrink:0,alignItems:'center',flexWrap:'wrap'}}>
                {isMultiLot
                  ? <Badge label={`${group.length} Lots`} color={T.purple}/>
                  : <Badge label={group[0].lot_no||'—'} color={T.teal}/>
                }
                {hasBroker && <Badge label={first.broker_name} color={T.gold}/>}
              </div>

              {/* Qty */}
              <div style={{textAlign:'right',flexShrink:0,minWidth:80}}>
                <div style={{fontWeight:700,fontSize:13}}>{fmtMtr(totalQty)}</div>
                {isMultiLot && <div style={{fontSize:9,color:T.textMuted}}>combined</div>}
              </div>

              {/* Amount */}
              <div style={{textAlign:'right',flexShrink:0,minWidth:84}}>
                <div style={{fontWeight:700,fontSize:13,color:T.green}}>{fmt(totalAmt)}</div>
                {first.comm_amount>0 && (
                  <div style={{fontSize:10,color:T.gold}}>
                    Comm: {fmt(Math.abs(first.comm_amount))}
                  </div>
                )}
              </div>

              <div style={{color:T.textFaint,fontSize:16,flexShrink:0}}>
                {isBillOpen ? '▲' : '▼'}
              </div>
            </div>

            {/* ─── Expanded Bill Body ─── */}
            {isBillOpen && (
              <div style={{borderTop:`1px solid ${T.border}`}}>

                {/* Bill-level info strip */}
                <div style={{padding:'10px 16px',display:'flex',gap:24,flexWrap:'wrap',
                  background:'#fff',borderBottom:`1px solid ${T.border}`}}>
                  {[
                    ['Tally Voucher',       first.tally_voucher_no],
                    ['Supplier Invoice',    first.supplier_invoice_no],
                    ['Invoice Date',        first.supplier_invoice_date ? fmtDate(first.supplier_invoice_date) : null],
                    ['Voucher Date',        fmtDate(first.voucher_date)],
                    ['Supplier',            first.supplier_name],
                    ['Supplier GSTIN',      first.supplier_gstin||null],
                    ['Purchase Ledger',     first.purchase_ledger],
                    ['Place of Supply',     first.place_of_supply||null],
                    ['Process Lot No',      first.process_lot_no||null],
                    ['Process Mill Name',   first.process_mill_name||null],
                    ['Broker',              first.broker_name||null],
                    ['Comm Rate',           first.comm_rate ? `${first.comm_rate}%` : null],
                    ['Comm Amount',         first.comm_amount ? fmt(Math.abs(first.comm_amount)) : null],
                    ['Net Rate',            first.net_rate ? `₹${Number(first.net_rate).toFixed(4)}/m` : null],
                    ['Assessable Value',    first.assessable_value ? fmt(first.assessable_value) : null],
                  ].map(([l,v])=>v ? (
                    <div key={l} style={{minWidth:110}}>
                      <div style={{fontSize:9,color:T.textMuted,fontWeight:700,
                        textTransform:'uppercase',letterSpacing:.4,marginBottom:2}}>{l}</div>
                      <div style={{fontSize:12,color:T.text,fontWeight:600}}>{v}</div>
                    </div>
                  ) : null)}
                </div>

                {/* ── Lots table ── */}
                <div style={{padding:'14px 16px',background:T.tealLight}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.tealDark,
                    textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>
                    {isMultiLot
                      ? `${group.length} Lots in this Bill — click a row to see linked REC FROM MILL`
                      : 'Lot Details — click to see linked REC FROM MILL'}
                  </div>

                  <div style={{overflowX:'auto',borderRadius:8,border:`1px solid ${T.border}`}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,
                      background:T.surface}}>
                      <thead>
                        <tr style={{background:T.teal}}>
                          {['Lot No','Item / Fabric','Godown / Mill Dest.','Actual Qty',
                            'Rate / m','Takas','Taka No','Amount','REC Status'].map(h=>(
                            <th key={h} style={{padding:'8px 10px',textAlign:'left',
                              color:'#fff',fontWeight:700,fontSize:11,whiteSpace:'nowrap',
                              borderRight:`1px solid rgba(255,255,255,.15)`}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.map((lot, li) => {
                          const isLotOpen  = expandedLot === lot.id;
                          const recs        = linkedRecs[lot.id] || [];
                          const recLoading  = loadingRecs[lot.id];
                          const recFetched  = linkedRecs[lot.id] !== undefined;
                          const hasRecs     = recs.length > 0;
                          const totalFinQty = recs.reduce((s,r)=>s+Number(r.finish_qty_mtrs||0),0);
                          const avgCost     = recs.length>0
                            ? recs.reduce((s,r)=>s+Number(r.cumulative_cost_per_mtr||0),0)/recs.length
                            : 0;

                          return (
                            <React.Fragment key={lot.id}>
                              {/* ─ Lot row ─ */}
                              <tr
                                onClick={()=>{
                                  const opening = expandedLot !== lot.id;
                                  setExpandedLot(opening ? lot.id : null);
                                  if (opening && lot.lot_no && !recFetched) {
                                    fetchLinkedRecs(lot.lot_no, lot.id);
                                  }
                                }}
                                style={{
                                  borderBottom:`1px solid ${T.border}`,
                                  background:isLotOpen ? T.purpleLight
                                    : li%2===0 ? T.surface : T.tealLight,
                                  cursor:'pointer',transition:'background .1s',
                                }}
                              >
                                <td style={{padding:'9px 10px'}}>
                                  <span style={{fontFamily:'monospace',fontWeight:700,
                                    color:isLotOpen?T.purple:T.teal,fontSize:12}}>
                                    {lot.lot_no||'—'}
                                  </span>
                                </td>
                                <td style={{padding:'9px 10px',color:T.textMuted,
                                  maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',
                                  whiteSpace:'nowrap'}}>
                                  {lot.item_name||'—'}
                                </td>
                                <td style={{padding:'9px 10px',color:T.textMuted,
                                  whiteSpace:'nowrap'}}>
                                  {lot.godown_name||'—'}
                                </td>
                                <td style={{padding:'9px 10px',textAlign:'right',fontWeight:600}}>
                                  {fmtMtr(lot.actual_qty_mtrs)}
                                </td>
                                <td style={{padding:'9px 10px',textAlign:'right',color:T.textMuted}}>
                                  {lot.rate ? fmt(lot.rate)+'/m' : '—'}
                                </td>
                                <td style={{padding:'9px 10px',textAlign:'right'}}>
                                  {lot.taka_pcs||'—'}
                                </td>
                                <td style={{padding:'9px 10px',textAlign:'right',
                                  fontFamily:'monospace',color:T.textMuted,fontSize:11}}>
                                  {lot.taka_no||'—'}
                                </td>
                                <td style={{padding:'9px 10px',textAlign:'right',
                                  fontWeight:700,color:T.green}}>
                                  {lot.item_amount
                                    ? fmt(lot.item_amount)
                                    : isMultiLot ? '—' : fmt(lot.total_amount)}
                                </td>
                                <td style={{padding:'9px 10px'}}>
                                  {recLoading ? (
                                    <Badge label="Loading…" color={T.textMuted}/>
                                  ) : recFetched ? (
                                    hasRecs
                                      ? <Badge label={`${recs.length} REC${hasRecs?` · ${fmtMtr(totalFinQty)}`:''}`} color={T.green}/>
                                      : <Badge label="No REC" color={T.orange}/>
                                  ) : (
                                    <span style={{fontSize:10,color:T.textFaint}}>
                                      {isLotOpen ? '…' : '▼ expand'}
                                    </span>
                                  )}
                                </td>
                              </tr>

                              {/* ─ Inline REC FROM MILL expansion ─ */}
                              {isLotOpen && (
                                <tr>
                                  <td colSpan={9} style={{padding:0,
                                    background:'#F6FFFC',
                                    borderBottom:`2px solid ${T.teal}`}}>
                                    <div style={{padding:'14px 16px'}}>

                                      {/* Lot extra detail cards */}
                                      {(lot.track_ref_no||lot.track_party||lot.track_date) && (
                                        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:12}}>
                                          {[
                                            ['Track Ref No', lot.track_ref_no, 'monospace'],
                                            ['Track Party',  lot.track_party,  null],
                                            ['Track Date',   fmtDate(lot.track_date), null],
                                          ].filter(([,v])=>v).map(([l,v,ff])=>(
                                            <div key={l} style={{background:T.surface,borderRadius:6,
                                              padding:'7px 12px',border:`1px solid ${T.border}`,minWidth:120}}>
                                              <div style={{fontSize:9,color:T.textMuted,fontWeight:700,
                                                textTransform:'uppercase',letterSpacing:.4,marginBottom:2}}>{l}</div>
                                              <div style={{fontSize:12,color:T.text,fontWeight:600,
                                                fontFamily:ff||'inherit'}}>{v}</div>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* REC table header */}
                                      <div style={{fontSize:11,fontWeight:700,color:T.tealDark,
                                        textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>
                                        Linked REC FROM MILL — {recLoading
                                          ? 'Loading…'
                                          : `${recs.length} entr${recs.length===1?'y':'ies'}`}
                                      </div>

                                      {recLoading && (
                                        <div style={{color:T.textMuted,fontSize:12,padding:'8px 0'}}>
                                          Fetching linked entries…
                                        </div>
                                      )}

                                      {!recLoading && recs.length===0 && (
                                        <div style={{background:T.orangeLight,
                                          border:`1px solid ${T.orange}44`,
                                          borderRadius:6,padding:'10px 14px',
                                          fontSize:12,color:T.orange}}>
                                          ⚠ No REC FROM MILL entries found for Lot <strong>{lot.lot_no}</strong>.
                                          Fabric may still be at mill, or REC entry is missing.
                                        </div>
                                      )}

                                      {!recLoading && recs.length>0 && (
                                        <>
                                          <div style={{overflowX:'auto',borderRadius:8,
                                            border:`1px solid ${T.border}`,marginBottom:10}}>
                                            <table style={{width:'100%',borderCollapse:'collapse',
                                              fontSize:11,background:T.surface}}>
                                              <thead>
                                                <tr style={{background:T.tealLight}}>
                                                  {['Design No','Mill Name / Mill Challan No','Date',
                                                    'Received','Shortage%','Job Rate',
                                                    'Grey Cost','Job Cost','Cost/Mtr','Stage'].map(h=>(
                                                    <th key={h} style={{padding:'7px 10px',
                                                      textAlign:'left',fontWeight:700,
                                                      color:T.tealDark,whiteSpace:'nowrap',
                                                      borderBottom:`1px solid ${T.border}`}}>{h}</th>
                                                  ))}
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {recs.map((rec,ri)=>{
                                                  const shortPct   = Number(rec.shortage_pct||0);
                                                  const shortColor = shortPct>15?T.red:shortPct>8?T.orange:T.green;
                                                  const costPerMtr = Number(rec.cumulative_cost_per_mtr||0);
                                                  return (
                                                    <tr key={ri} style={{
                                                      borderBottom:`1px solid ${T.border}`,
                                                      background:ri%2===0?T.surface:T.tealLight}}>
                                                      <td style={{padding:'6px 10px',fontWeight:700,
                                                        color:T.purple,fontFamily:'monospace'}}>
                                                        {rec.design_no||'—'}
                                                      </td>
                                                      <td style={{padding:'6px 10px',whiteSpace:'nowrap'}}>
                                                        {/* Mill full name */}
                                                        <div style={{fontWeight:600,color:T.text,fontSize:11}}>
                                                          {resolveMillName(rec)}
                                                        </div>
                                                        {/* Mill's own challan no (KEY 2) — what the mill gives when returning fabric
                                                            This is NOT the lot_no / issue challan. It matches jobwork_expenses.supplier_invoice_no */}
                                                        <div style={{fontSize:10,marginTop:2,display:'flex',alignItems:'center',gap:4}}>
                                                          <span style={{color:T.textFaint,fontSize:9}}>Mill challan:</span>
                                                          <span style={{
                                                            fontFamily:'monospace',fontWeight:700,
                                                            color: rec.party_challan_no && !/^\d{3,4}\//.test(rec.party_challan_no)
                                                              ? T.purple   // real mill challan (e.g. "698", "1021/22-23")
                                                              : T.orange,  // still showing lot_no fallback — data not yet backfilled
                                                          }}>
                                                            {rec.party_challan_no || '—'}
                                                          </span>
                                                          {rec.party_challan_no && /^\d{3,4}\//.test(rec.party_challan_no) && (
                                                            <span style={{fontSize:9,color:T.orange,fontStyle:'italic'}}>(= lot no fallback)</span>

                                                          )}
                                                        </div>
                                                        {/* Short godown name — only if it differs from resolved full name */}
                                                        {rec.job_godown && rec.job_godown !== resolveMillName(rec) && (
                                                          <div style={{fontSize:9,color:T.textFaint,marginTop:1}}>
                                                            {rec.job_godown}
                                                          </div>
                                                        )}
                                                      </td>
                                                      <td style={{padding:'6px 10px',whiteSpace:'nowrap'}}>
                                                        {fmtDate(rec.voucher_date)}
                                                      </td>
                                                      <td style={{padding:'6px 10px',textAlign:'right',
                                                        fontWeight:600,color:T.green}}>
                                                        {fmtMtr(rec.finish_qty_mtrs)}
                                                      </td>
                                                      <td style={{padding:'6px 10px',textAlign:'right',
                                                        color:shortColor,fontWeight:700}}>
                                                        {shortPct.toFixed(1)}%
                                                      </td>
                                                      <td style={{padding:'6px 10px',textAlign:'right'}}>
                                                        {rec.job_rate ? fmt(Math.abs(rec.job_rate))+'/m' : '—'}
                                                      </td>
                                                      <td style={{padding:'6px 10px',textAlign:'right'}}>
                                                        {fmt(Math.abs(rec.grey_cost_actual||0))}
                                                      </td>
                                                      <td style={{padding:'6px 10px',textAlign:'right'}}>
                                                        {fmt(Math.abs(rec.job_amount||0))}
                                                      </td>
                                                      <td style={{padding:'6px 10px',textAlign:'right',
                                                        fontWeight:700,
                                                        color:costPerMtr>0?T.teal:T.textMuted}}>
                                                        {costPerMtr>0 ? fmt(costPerMtr)+'/m' : '—'}
                                                      </td>
                                                      <td style={{padding:'6px 10px',textAlign:'center'}}>
                                                        {rec.stage_no>1
                                                          ? <Badge label={`S${rec.stage_no}`} color={T.purple}/>
                                                          : '1'}
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                              <tfoot>
                                                <tr style={{background:T.tealLight,
                                                  borderTop:`2px solid ${T.teal}`}}>
                                                  <td colSpan={3} style={{padding:'7px 10px',
                                                    fontWeight:700,fontSize:11,color:T.tealDark}}>
                                                    TOTALS
                                                  </td>
                                                  <td style={{padding:'7px 10px',textAlign:'right',
                                                    fontWeight:700,color:T.green}}>
                                                    {fmtMtr(totalFinQty)}
                                                  </td>
                                                  <td colSpan={3}/>
                                                  <td style={{padding:'7px 10px',textAlign:'right',
                                                    fontWeight:700,color:T.green}}>
                                                    {fmt(recs.reduce((s,r)=>s+Math.abs(Number(r.job_amount||0)),0))}
                                                  </td>
                                                  <td style={{padding:'7px 10px',textAlign:'right',
                                                    fontWeight:700,color:T.teal}}>
                                                    {avgCost>0 ? fmt(avgCost)+'/m avg' : '—'}
                                                  </td>
                                                  <td/>
                                                </tr>
                                              </tfoot>
                                            </table>
                                          </div>

                                          {/* Costing summary pill */}
                                          <div style={{display:'flex',gap:16,flexWrap:'wrap',
                                            background:T.greenLight,borderRadius:8,
                                            padding:'10px 14px',border:`1px solid ${T.green}33`}}>
                                            {[
                                              ['Issued Qty',    fmtMtr(lot.actual_qty_mtrs), T.teal],
                                              ['Finished Qty',  fmtMtr(totalFinQty), T.green],
                                              ['Designs Made',  recs.length, T.purple],
                                              ['Avg Cost/Mtr',  avgCost>0?fmt(avgCost)+'/m':'—', T.teal],
                                            ].map(([l,v,c])=>(
                                              <div key={l}>
                                                <div style={{fontSize:9,color:T.textMuted,fontWeight:700,
                                                  textTransform:'uppercase',letterSpacing:.4,marginBottom:2}}>{l}</div>
                                                <div style={{fontSize:13,fontWeight:700,color:c}}>{v}</div>
                                              </div>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ── Pagination ── */}
      {totalCount > PAGE && (
        <div style={{display:'flex',gap:8,justifyContent:'center',padding:'16px 0'}}>
          <button onClick={()=>fetchBills(page-1)} disabled={page===0}
            style={{padding:'7px 16px',borderRadius:6,border:`1px solid ${T.border}`,
              background:T.surface,cursor:'pointer',fontSize:12,
              opacity:page===0?.4:1}}>
            ← Prev
          </button>
          <span style={{padding:'7px 14px',fontSize:12,color:T.textMuted}}>
            Page {page+1} of {Math.ceil(totalCount/PAGE)} · {totalCount.toLocaleString()} rows
          </span>
          <button onClick={()=>fetchBills(page+1)}
            disabled={(page+1)*PAGE>=totalCount}
            style={{padding:'7px 16px',borderRadius:6,border:`1px solid ${T.border}`,
              background:T.surface,cursor:'pointer',fontSize:12,
              opacity:(page+1)*PAGE>=totalCount?.4:1}}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
