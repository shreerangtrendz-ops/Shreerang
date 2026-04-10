import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import OriginPanel from '../../../components/accounting/OriginPanel';

/* ════════════════════════════════════════════════════════════════
   REC FROM MILL PAGE — gold standard (V-04 REC vouchers)
   Design is BORN here · cumulative_cost_per_mtr is the key metric
   ════════════════════════════════════════════════════════════════ */

const T = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6', teal100:'#9FE1CB',
  gold:'#E8A800', goldLight:'#FFF8E8',
  navy:'#0B2E2B', green:'#1E9E5A', greenLight:'#E8FFF4',
  blue:'#2468C8', blueLight:'#EBF8FF',
  red:'#D93025', redLight:'#FFF5F5',
  orange:'#E67E22', orangeLight:'#FFF3E8',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95', textFaint:'#A8C9C3',
};

const fmt     = n  => '₹' + Math.abs(Number(n||0)).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtL    = n  => { const v=Math.abs(Number(n||0)); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:'₹'+v.toLocaleString('en-IN',{maximumFractionDigits:0}); };
const fmtMtr  = n  => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + ' m';
const fmtRate = n  => n != null ? `₹${Math.abs(Number(n)).toFixed(2)}` : '—';
const fmtDate = d  => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '—';

// Detect lot_no format e.g. "1355/22-23" — design_no wasn't extracted if it looks like this
const isLotFormat = v => v && /\/\d{2}-\d{2}$/.test(v);
const PAGE    = 50;
const FY_YEARS = [2022,2023,2024,2025,2026];

function getCurrentFY() {
  const now = new Date();
  const yr  = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear()-1;
  return { from:`${yr}-04-01`, to:`${yr+1}-03-31`, yr };
}

function Badge({label, color=T.teal, bg}) {
  return (
    <span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700,
      background:bg||color+'22',color,letterSpacing:.3,whiteSpace:'nowrap'}}>
      {label}
    </span>
  );
}

function SummaryCard({label, value, sub, color=T.teal}) {
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,
      padding:'14px 18px',borderTop:`3px solid ${color}`}}>
      <div style={{fontSize:10,color:T.textMuted,fontWeight:700,textTransform:'uppercase',
        letterSpacing:.6,marginBottom:6}}>{label}</div>
      <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:22,color:T.text,lineHeight:1}}>{value}</div>
      {sub && <div style={{fontSize:11,color:T.textMuted,marginTop:4}}>{sub}</div>}
    </div>
  );
}

function ReconBadge({status}) {
  if (!status || status === 'pending')
    return <Badge label="PENDING"  color={T.orange} bg={T.orangeLight}/>;
  if (status === 'matched')
    return <Badge label="MATCHED"  color={T.green}  bg={T.greenLight}/>;
  if (status === 'mismatch')
    return <Badge label="MISMATCH" color={T.red}    bg={T.redLight}/>;
  return <Badge label={status.toUpperCase()} color={T.textMuted}/>;
}

// Table column layout — 15 data columns + expand chevron
// Wrapped in overflow-x:auto to handle width gracefully
const COLS = '120px 70px 140px 130px 90px 85px 80px 72px 90px 85px 80px 120px 80px 36px';
const HDRS = [
  'Voucher No','Date','Mill (Godown)','Lot / Challan',
  'Issued m','Finish m','Short %','Job Rate',
  'Job Amt','JW Alloc','JW %','Cost / m','Status','',
];

export default function RecFromMillPage() {
  const fy = getCurrentFY();

  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page,       setPage]       = useState(0);
  const [expanded,   setExpanded]   = useState(null);
  const [activeFY,   setActiveFY]   = useState(fy.yr);

  const [dateFrom,       setDateFrom]       = useState(fy.from);
  const [dateTo,         setDateTo]         = useState(fy.to);
  const [godownFilter,   setGodownFilter]   = useState('');
  const [reconFilter,    setReconFilter]    = useState('');
  const [highShortOnly,  setHighShortOnly]  = useState(false);
  const [search,         setSearch]         = useState('');

  const [summary,        setSummary]        = useState({count:0,totalMtrs:0,avgShortage:0,totalJwCost:0,avgGreyRate:0});
  const [godownOptions,  setGodownOptions]  = useState([]);

  // Load godown options once
  useEffect(() => {
    supabase.from('rec_from_mill').select('job_godown').then(({data}) => {
      if (data) setGodownOptions([...new Set(data.map(r=>r.job_godown).filter(Boolean))].sort());
    });
  }, []);

  const setFY = yr => {
    setActiveFY(yr);
    setDateFrom(`${yr}-04-01`);
    setDateTo(`${yr+1}-03-31`);
    setPage(0);
  };

  // Shared filter builder
  const applyFilters = useCallback(q => {
    if (dateFrom)     q = q.gte('voucher_date', dateFrom);
    if (dateTo)       q = q.lte('voucher_date', dateTo);
    if (godownFilter) q = q.eq('job_godown', godownFilter);
    if (reconFilter)  q = q.eq('recon_status', reconFilter);
    if (highShortOnly)q = q.gt('shortage_pct', 15);
    if (search)       q = q.or([
      `design_no.ilike.%${search}%`,
      `grey_lot_no.ilike.%${search}%`,
      `tally_voucher_no.ilike.%${search}%`,
      `party_challan_no.ilike.%${search}%`,
      `mill_name.ilike.%${search}%`,
      `job_godown.ilike.%${search}%`,
    ].join(','));
    return q;
  }, [dateFrom, dateTo, godownFilter, reconFilter, highShortOnly, search]);

  const fetchRows = useCallback(async (pg=0) => {
    setLoading(true);
    const from = pg*PAGE, to = from+PAGE-1;
    let q = supabase.from('rec_from_mill')
      .select('*', {count:'exact'})
      .order('voucher_date', {ascending:false})
      .range(from, to);
    q = applyFilters(q);
    const {data, error, count} = await q;
    if (!error) { setRows(data||[]); setTotalCount(count||0); }
    setPage(pg);
    setLoading(false);
  }, [applyFilters]);

  const fetchSummary = useCallback(async () => {
    let q = supabase.from('rec_from_mill')
      .select('finish_qty_mtrs,shortage_pct,jw_allocated_cost,grey_purchase_rate');
    q = applyFilters(q);
    const {data} = await q;
    if (data) {
      const withShort   = data.filter(r => r.shortage_pct != null);
      const withGreyRate = data.filter(r => r.grey_purchase_rate != null && Number(r.grey_purchase_rate) > 0);
      setSummary({
        count:       data.length,
        totalMtrs:   data.reduce((s,r) => s + Math.abs(Number(r.finish_qty_mtrs||0)), 0),
        avgShortage: withShort.length
          ? withShort.reduce((s,r) => s + Number(r.shortage_pct||0), 0) / withShort.length
          : 0,
        totalJwCost: data.reduce((s,r) => s + Math.abs(Number(r.jw_allocated_cost||0)), 0),
        avgGreyRate: withGreyRate.length
          ? withGreyRate.reduce((s,r) => s + Math.abs(Number(r.grey_purchase_rate||0)), 0) / withGreyRate.length
          : 0,
      });
    }
  }, [applyFilters]);

  useEffect(() => { fetchRows(0); fetchSummary(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function runFilters()   { fetchRows(0); fetchSummary(); }
  function resetFilters() {
    setSearch(''); setGodownFilter(''); setReconFilter(''); setHighShortOnly(false);
    const f = getCurrentFY();
    setActiveFY(f.yr); setDateFrom(f.from); setDateTo(f.to);
    setTimeout(() => { fetchRows(0); fetchSummary(); }, 0);
  }

  const totalPages = Math.ceil(totalCount / PAGE);

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh',padding:'20px 24px'}}>

      {/* ── Header ── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,color:T.text,margin:0}}>
            REC from Mill
          </h1>
          <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>
            V-04 · Design born here · cumulative cost per metre · Tally sync
          </div>
        </div>
        <Badge label={`${totalCount.toLocaleString()} records`} color={T.teal} bg={T.tealLight}/>
      </div>

      {/* ── FY Tabs ── */}
      <div style={{display:'flex',gap:4,marginBottom:16,background:T.surface,
        border:`1px solid ${T.border}`,borderRadius:8,padding:4,width:'fit-content'}}>
        {FY_YEARS.map(yr => (
          <button key={yr} onClick={() => setFY(yr)}
            style={{padding:'5px 12px',borderRadius:6,border:'none',cursor:'pointer',
              fontSize:12,fontWeight:700,transition:'all .15s',
              background:activeFY===yr?T.teal:'transparent',
              color:activeFY===yr?'#fff':T.textMuted}}>
            FY {yr.toString().slice(2)}-{(yr+1).toString().slice(2)}
          </button>
        ))}
      </div>

      {/* ── Summary Cards ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        <SummaryCard
          label="Total Records"
          value={summary.count.toLocaleString('en-IN')}
          sub="REC vouchers in period"
          color={T.teal}
        />
        <SummaryCard
          label="Total Finish Qty"
          value={fmtMtr(summary.totalMtrs)}
          sub="metres received from mills"
          color={T.blue}
        />
        <SummaryCard
          label="Avg Shortage"
          value={summary.avgShortage ? `${summary.avgShortage.toFixed(1)}%` : '—'}
          sub="avg across batches with data"
          color={T.orange}
        />
        <SummaryCard
          label="Total JW Alloc Cost"
          value={fmtL(summary.totalJwCost)}
          sub="allocated jobwork cost"
          color={T.gold}
        />
        <SummaryCard
          label="Avg Grey Rate"
          value={summary.avgGreyRate ? `₹${summary.avgGreyRate.toFixed(2)}/m` : '—'}
          sub="(₹0 = lot not yet linked)"
          color={T.navy}
        />
      </div>

      {/* ── Filters ── */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,
        padding:'14px 18px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>

        <div style={{flex:'1 1 200px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,
            textTransform:'uppercase',letterSpacing:.4}}>Search</div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Design, lot, voucher, challan, mill…"
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,
              borderRadius:7,fontSize:12,color:T.text,background:'#fff',
              outline:'none',boxSizing:'border-box'}}/>
        </div>

        <div style={{flex:'1 1 160px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,
            textTransform:'uppercase',letterSpacing:.4}}>Job Godown</div>
          <select value={godownFilter} onChange={e=>setGodownFilter(e.target.value)}
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,
              borderRadius:7,fontSize:12,background:'#fff',color:T.text,outline:'none'}}>
            <option value="">All Godowns</option>
            {godownOptions.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div style={{flex:'1 1 140px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,
            textTransform:'uppercase',letterSpacing:.4}}>Recon Status</div>
          <select value={reconFilter} onChange={e=>setReconFilter(e.target.value)}
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,
              borderRadius:7,fontSize:12,background:'#fff',color:T.text,outline:'none'}}>
            <option value="">All Statuses</option>
            <option value="matched">Matched</option>
            <option value="pending">Pending</option>
            <option value="mismatch">Mismatch</option>
          </select>
        </div>

        <div>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,
            textTransform:'uppercase',letterSpacing:.4}}>From</div>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,
              fontSize:12,color:T.text,background:'#fff',outline:'none'}}/>
        </div>

        <div>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,
            textTransform:'uppercase',letterSpacing:.4}}>To</div>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,
              fontSize:12,color:T.text,background:'#fff',outline:'none'}}/>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:6,paddingBottom:2}}>
          <input type="checkbox" id="highShort" checked={highShortOnly}
            onChange={e=>setHighShortOnly(e.target.checked)}
            style={{accentColor:T.red,width:14,height:14,cursor:'pointer'}}/>
          <label htmlFor="highShort"
            style={{fontSize:12,color:T.red,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
            Shortage &gt;15%
          </label>
        </div>

        <button onClick={runFilters}
          style={{padding:'8px 18px',background:T.teal,color:'#fff',border:'none',
            borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',height:34}}>
          Apply
        </button>
        <button onClick={resetFilters}
          style={{padding:'8px 14px',background:'transparent',color:T.textMuted,
            border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,cursor:'pointer',height:34}}>
          Reset
        </button>
      </div>

      {/* ── Table ── */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>

        {/* Scrollable wrapper */}
        <div style={{overflowX:'auto'}}>

          {/* Header row */}
          <div style={{display:'grid',gridTemplateColumns:COLS,background:T.bg,
            borderBottom:`1px solid ${T.border}`,padding:'10px 16px',minWidth:1100}}>
            {HDRS.map((h,i) => (
              <div key={i} style={{fontSize:10,color:T.textMuted,fontWeight:700,
                textTransform:'uppercase',letterSpacing:.5,
                textAlign:i>=4&&i<=12?'right':'left'}}>
                {h}
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{padding:60,textAlign:'center',color:T.textMuted}}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{padding:60,textAlign:'center',color:T.textMuted}}>
              No REC records found for selected period
            </div>
          ) : rows.map(r => {
            const isExp      = expanded === r.id;
            const shortage   = Number(r.shortage_pct || 0);
            const highShort  = shortage > 15;
            // COALESCE(mill_name, job_godown) — spec order
            const mill       = r.mill_name || r.job_godown || '—';
            const isPrimary  = !r.design_no || r.design_no === 'Primary Batch';
            const lotFmtDesign = !isPrimary && isLotFormat(r.design_no);
            // Only show party_challan_no if it differs from tally_voucher_no
            const showChallan = r.party_challan_no && r.party_challan_no !== r.tally_voucher_no;

            return (
              <div key={r.id} style={{borderBottom:`1px solid ${T.border}`}}>

                {/* Main row */}
                <div
                  onClick={() => setExpanded(isExp ? null : r.id)}
                  style={{display:'grid',gridTemplateColumns:COLS,padding:'11px 16px',
                    background:isExp?T.tealLight:'#fff',cursor:'pointer',
                    alignItems:'center',transition:'background .12s',minWidth:1100}}
                  onMouseEnter={e => { if (!isExp) e.currentTarget.style.background = T.bg; }}
                  onMouseLeave={e => { if (!isExp) e.currentTarget.style.background = '#fff'; }}
                >
                  {/* Voucher No */}
                  <div style={{fontWeight:700,color:T.teal,fontSize:12,
                    fontFamily:"'DM Mono',monospace",overflow:'hidden',
                    textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {r.tally_voucher_no||'—'}
                  </div>

                  {/* Date */}
                  <div style={{fontSize:11,color:T.textMuted}}>{fmtDate(r.voucher_date)}</div>

                  {/* Mill (COALESCE mill_name, job_godown) */}
                  <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    <div style={{fontSize:12,fontWeight:600,color:T.text,overflow:'hidden',
                      textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={mill}>{mill}</div>
                    {isPrimary ? (
                      <div style={{fontSize:9,color:T.red,marginTop:1}}>No design yet</div>
                    ) : lotFmtDesign ? (
                      <div style={{fontSize:10,color:T.orange,fontFamily:"'DM Mono',monospace",
                        marginTop:1,fontWeight:700}} title="Lot format — design not extracted">
                        ⚠ {r.design_no}
                      </div>
                    ) : r.design_no ? (
                      <div style={{fontSize:10,color:T.blue,fontFamily:"'DM Mono',monospace",
                        marginTop:1,fontWeight:700}}>D{r.design_no}</div>
                    ) : null}
                  </div>

                  {/* Lot / Challan */}
                  <div style={{overflow:'hidden'}}>
                    <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",
                      color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}
                      title={r.grey_lot_no}>{r.grey_lot_no||'—'}</div>
                    {/* party_challan_no = KEY 2 — maps to jobwork_expenses.supplier_invoice_no */}
                    {showChallan ? (
                      <div style={{fontSize:10,marginTop:2,display:'flex',alignItems:'center',gap:4}}>
                        <span style={{color:T.amber,fontWeight:800,fontSize:9}}>JW Ch:</span>
                        <span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,
                          color:T.text,fontSize:11}}>{r.party_challan_no}</span>
                      </div>
                    ) : (
                      <div style={{fontSize:10,color:T.textFaint,marginTop:1}}>JW Ch —</div>
                    )}
                  </div>

                  {/* grey_issued_qty_mtrs */}
                  <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",
                    fontSize:11,color:T.textMuted}}>
                    {r.grey_issued_qty_mtrs ? fmtMtr(r.grey_issued_qty_mtrs) : '—'}
                  </div>

                  {/* finish_qty_mtrs */}
                  <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",
                    fontSize:12,fontWeight:600,color:T.text}}>
                    {fmtMtr(r.finish_qty_mtrs)}
                  </div>

                  {/* shortage_pct — red badge if >15% */}
                  <div style={{textAlign:'right'}}>
                    {shortage > 0
                      ? highShort
                        ? <Badge label={`${shortage.toFixed(1)}%`} color={T.red} bg={T.redLight}/>
                        : <span style={{fontSize:11,color:T.textMuted,
                            fontFamily:"'DM Mono',monospace"}}>{shortage.toFixed(1)}%</span>
                      : <span style={{color:T.textFaint,fontSize:11}}>—</span>
                    }
                  </div>

                  {/* job_rate — Math.abs() */}
                  <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",
                    fontSize:11,color:T.textMuted}}>
                    {r.job_rate != null ? fmtRate(r.job_rate) : '—'}
                  </div>

                  {/* job_amount — Math.abs() */}
                  <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",
                    fontSize:12,color:T.textMuted}}>
                    {r.job_amount != null ? fmt(r.job_amount) : '—'}
                  </div>

                  {/* jw_allocated_cost — Math.abs() */}
                  <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",
                    fontSize:11,color:T.textMuted}}>
                    {r.jw_allocated_cost != null ? fmt(r.jw_allocated_cost) : '—'}
                  </div>

                  {/* jw_allocation_pct */}
                  <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",
                    fontSize:11,color:T.textMuted}}>
                    {r.jw_allocation_pct != null
                      ? `${Number(r.jw_allocation_pct).toFixed(1)}%`
                      : '—'}
                  </div>

                  {/* cumulative_cost_per_mtr — teal highlight, most important */}
                  <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:13,
                    fontWeight:800,color:r.cumulative_cost_per_mtr ? T.teal : T.textFaint}}>
                    {r.cumulative_cost_per_mtr
                      ? `₹${Math.abs(Number(r.cumulative_cost_per_mtr)).toFixed(2)}`
                      : '—'}
                  </div>

                  {/* recon_status badge */}
                  <div style={{textAlign:'right'}}>
                    <ReconBadge status={r.recon_status}/>
                  </div>

                  {/* Expand chevron */}
                  <div style={{textAlign:'right',fontSize:14,
                    color:isExp?T.teal:T.textFaint}}>{isExp?'▲':'▼'}</div>
                </div>

                {/* ── Expanded detail ── */}
                {isExp && (
                  <div style={{background:'#F8FFFE',borderTop:`1px solid ${T.border}`,
                    padding:'16px 18px 20px'}}>

                    {/* Field grid */}
                    <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,
                      marginBottom:16,padding:'12px 14px',background:'#fff',
                      borderRadius:8,border:`1px solid ${T.border}`}}>
                      {[
                        ['Tally Voucher No',   r.tally_voucher_no],
                        ['Voucher Date',        fmtDate(r.voucher_date)],
                        ['Design No',           r.design_no||'—'],
                        ['Grey Lot No',         r.grey_lot_no||'—'],
                        // KEY 2: party_challan_no = jobwork_expenses.supplier_invoice_no (jobworker's own bill number)
                        ['Party Challan No (KEY 2)', r.party_challan_no||
                          <span style={{color:'#E67E22',fontSize:10}}>missing — JW cost won’t allocate</span>],
                        ['Mill Name',           r.mill_name || r.job_godown || '—'],
                        ['Job Godown',          r.job_godown||'—'],
                        ['Process Type',        r.process_type||'—'],
                        ['Stage No',            r.stage_no||'—'],
                        ['Grey Item',           r.grey_item_name||'—'],
                        ['Finish Item',         r.finish_item_name||'—'],
                        ['Grey Issued (m)',     r.grey_issued_qty_mtrs ? fmtMtr(r.grey_issued_qty_mtrs) : '—'],
                        ['Finish Qty (m)',      fmtMtr(r.finish_qty_mtrs)],
                        ['Shortage (m)',        r.shortage_mtrs ? fmtMtr(r.shortage_mtrs) : '—'],
                        ['Shortage %',         shortage > 0 ? `${shortage.toFixed(2)}%` : '—'],
                        ['Grey Purchase Rate', r.grey_purchase_rate != null ? `₹${Math.abs(Number(r.grey_purchase_rate)).toFixed(2)}/m` : '—'],
                        ['Job Rate',           r.job_rate != null ? `₹${Math.abs(Number(r.job_rate)).toFixed(2)}/m` : '—'],
                        ['Job Amount',         r.job_amount != null ? fmt(r.job_amount) : '—'],
                        ['Gross Amount',       r.gross_amount != null ? fmt(r.gross_amount) : '—'],
                        ['JW Alloc Cost',      r.jw_allocated_cost != null ? fmt(r.jw_allocated_cost) : '—'],
                        ['JW Alloc %',         r.jw_allocation_pct != null ? `${Number(r.jw_allocation_pct).toFixed(2)}%` : '—'],
                        ['Cum. Cost / m',      r.cumulative_cost_per_mtr != null ? `₹${Math.abs(Number(r.cumulative_cost_per_mtr)).toFixed(2)}` : '—'],
                        ['Recon Status',       r.recon_status||'pending'],
                        ['JW Voucher No',      r.jw_voucher_number||'—'],
                        ['Issue Challan No',   r.issue_challan_no||'—'],
                        ['Weaver Name',        r.weaver_name||'—'],
                        ['Quality Name',       r.quality_name||'—'],
                        ['Our Godown',         r.our_godown||'—'],
                        ['Narration',          r.narration||'—'],
                      ].map(([k, v]) => {
                        const isCost   = k === 'Cum. Cost / m';
                        const isDesign = k === 'Design No';
                        const designIsLot = isDesign && isLotFormat(r.design_no);
                        return (
                          <div key={k}>
                            <div style={{fontSize:9,color:T.textMuted,fontWeight:700,
                              textTransform:'uppercase',letterSpacing:.4,marginBottom:2}}>{k}</div>
                            <div style={{fontSize:12,wordBreak:'break-word',
                              color: isCost ? T.teal : designIsLot ? T.orange : T.text,
                              fontWeight: isCost ? 800 : 500}}>
                              {v||'—'}
                              {designIsLot && (
                                <span style={{marginLeft:6,fontSize:10,color:T.orange}}>
                                  ⚠ lot format — design not extracted
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* OriginPanel — prefer designNo, fall back to grey_lot_no */}
                    {!isPrimary && r.design_no ? (
                      <div style={{marginBottom:12}}>
                        <OriginPanel designNo={r.design_no}/>
                      </div>
                    ) : r.grey_lot_no ? (
                      <div style={{marginBottom:12}}>
                        <OriginPanel lotNo={r.grey_lot_no}/>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>{/* end scrollable wrapper */}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'12px 20px',borderTop:`1px solid ${T.border}`,background:T.bg}}>
            <span style={{fontSize:12,color:T.textMuted}}>
              {totalCount.toLocaleString()} total · Page {page+1} of {totalPages}
            </span>
            <div style={{display:'flex',gap:6}}>
              {page > 0 && (
                <button onClick={() => fetchRows(page-1)}
                  style={{padding:'6px 14px',border:`1px solid ${T.border}`,borderRadius:6,
                    fontSize:12,cursor:'pointer',background:'#fff',color:T.text}}>
                  ← Prev
                </button>
              )}
              {page < totalPages-1 && (
                <button onClick={() => fetchRows(page+1)}
                  style={{padding:'6px 14px',background:T.teal,border:'none',borderRadius:6,
                    fontSize:12,cursor:'pointer',color:'#fff',fontWeight:700}}>
                  Next →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
