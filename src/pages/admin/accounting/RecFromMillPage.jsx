import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import OriginPanel from '../../../components/accounting/OriginPanel';
import SyncHealthBar from '../../../components/accounting/SyncHealthBar';

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
    // Paginate to bypass 1000-row Supabase default cap (FY 24-25 has 2241 REC entries)
    let allData = [], pg = 0, PG = 1000;
    while (true) {
      let q = supabase.from('rec_from_mill')
        .select('finish_qty_mtrs,shortage_pct,jw_allocated_cost,grey_purchase_rate')
        .range(pg * PG, (pg + 1) * PG - 1);
      q = applyFilters(q);
      const { data } = await q;
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < PG) break;
      pg++;
    }
    const data = allData;
    if (data.length) {
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

      <SyncHealthBar tableName="rec_from_mill" recordCount={totalCount} />

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

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        <SummaryCard label="Total Records" value={summary.count.toLocaleString('en-IN')} sub="REC vouchers in period" color={T.teal}/>
        <SummaryCard label="Total Finish Qty" value={fmtMtr(summary.totalMtrs)} sub="metres received from mills" color={T.blue}/>
        <SummaryCard label="Avg Shortage" value={summary.avgShortage ? `${summary.avgShortage.toFixed(1)}%` : '—'} sub="avg across batches with data" color={T.orange}/>
        <SummaryCard label="Total JW Alloc Cost" value={fmtL(summary.totalJwCost)} sub="allocated jobwork cost" color={T.gold}/>
        <SummaryCard label="Avg Grey Rate" value={summary.avgGreyRate ? `₹${summary.avgGreyRate.toFixed(2)}/m` : '—'} sub="(₹0 = lot not yet linked)" color={T.navy}/>
      </div>

      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,
        padding:'14px 18px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div style={{flex:'1 1 200px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>Search</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Design, lot, voucher, challan, mill…"
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,color:T.text,background:'#fff',outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{flex:'1 1 160px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>Job Godown</div>
          <select value={godownFilter} onChange={e=>setGodownFilter(e.target.value)}
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,background:'#fff',color:T.text,outline:'none'}}>
            <option value="">All Godowns</option>
            {godownOptions.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div style={{flex:'1 1 140px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>Recon Status</div>
          <select value={reconFilter} onChange={e=>setReconFilter(e.target.value)}
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,background:'#fff',color:T.text,outline:'none'}}>
            <option value="">All Statuses</option>
            <option value="matched">Matched</option>
            <option value="pending">Pending</option>
            <option value="mismatch">Mismatch</option>
          </select>
        </div>
        <div>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>From</div>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,color:T.text,background:'#fff',outline:'none'}}/>
        </div>
        <div>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>To</div>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,color:T.text,background:'#fff',outline:'none'}}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,paddingBottom:2}}>
          <input type="checkbox" id="highShort" checked={highShortOnly} onChange={e=>setHighShortOnly(e.target.checked)}
            style={{accentColor:T.red,width:14,height:14,cursor:'pointer'}}/>
          <label htmlFor="highShort" style={{fontSize:12,color:T.red,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>Shortage &gt;15%</label>
        </div>
        <button onClick={runFilters} style={{padding:'8px 18px',background:T.teal,color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',height:34}}>Apply</button>
        <button onClick={resetFilters} style={{padding:'8px 14px',background:'transparent',color:T.textMuted,border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,cursor:'pointer',height:34}}>Reset</button>
      </div>

      <div className="acct-mobile-cards">
        {loading ? (<div style={{padding:40,textAlign:'center',color:T.textMuted,fontSize:13}}>Loading…</div>)
        : rows.length === 0 ? (<div style={{padding:40,textAlign:'center',color:T.textMuted,fontSize:13}}>No records found</div>)
        : rows.map(r => {
          const shortage=Number(r.shortage_pct||0),highShort=shortage>15,mill=r.mill_name||r.job_godown||'—';
          const isPrimary=!r.design_no||r.design_no==='Primary Batch';
          const costPerMtr=r.cumulative_cost_per_mtr?`₹${Math.abs(Number(r.cumulative_cost_per_mtr)).toFixed(2)}`:'—';
          return (
            <div key={r.id} className="acct-mobile-card" onClick={()=>setExpanded(expanded===r.id?null:r.id)}>
              <div className="amc-header">
                <div><div className="amc-design-badge">{isPrimary?'Primary':r.design_no?`D${r.design_no}`:'—'}</div><div className="amc-design-sub">{mill}</div></div>
                <div><div className="amc-cost">{costPerMtr}</div><div className="amc-cost-label">cost / mtr</div></div>
              </div>
              <div className="amc-row"><span className="amc-row-label">Voucher</span><span className="amc-row-val" style={{fontFamily:"'JetBrains Mono',monospace",color:T.teal,fontSize:12}}>{r.tally_voucher_no||'—'}</span></div>
              <div className="amc-row"><span className="amc-row-label">Date</span><span className="amc-row-val">{fmtDate(r.voucher_date)}</span></div>
              <div className="amc-row"><span className="amc-row-label">Lot</span><span className="amc-row-val" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>{r.grey_lot_no||'—'}</span></div>
              <div className="amc-row"><span className="amc-row-label">Issued</span><span className="amc-row-val">{r.grey_issued_qty_mtrs?fmtMtr(r.grey_issued_qty_mtrs):'—'}</span></div>
              <div className="amc-row"><span className="amc-row-label">Finish</span><span className="amc-row-val" style={{fontWeight:700}}>{fmtMtr(r.finish_qty_mtrs)}</span></div>
              <div className="amc-row"><span className="amc-row-label">Job Amt</span><span className="amc-row-val">{r.job_amount!=null?fmt(r.job_amount):'—'}</span></div>
              <div className="amc-badges">
                {highShort&&<span className="badge bred">⚠ {shortage.toFixed(1)}% short</span>}
                {!highShort&&shortage>0&&<span className="badge" style={{background:'rgba(106,155,149,0.12)',color:T.textMuted}}>{shortage.toFixed(1)}% short</span>}
                <ReconBadge status={r.recon_status}/>
                {r.party_challan_no&&<span className="badge bteal">Ch: {r.party_challan_no}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="acct-table-wrap" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <div style={{display:'grid',gridTemplateColumns:COLS,background:T.bg,borderBottom:`1px solid ${T.border}`,padding:'10px 16px',minWidth:1100}}>
            {HDRS.map((h,i)=>(<div key={i} style={{fontSize:10,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,textAlign:i>=4&&i<=12?'right':'left'}}>{h}</div>))}
          </div>
          {loading?(<div style={{padding:60,textAlign:'center',color:T.textMuted}}>Loading…</div>)
          :rows.length===0?(<div style={{padding:60,textAlign:'center',color:T.textMuted}}>No REC records found for selected period</div>)
          :rows.map(r=>{
            const isExp=expanded===r.id,shortage=Number(r.shortage_pct||0),highShort=shortage>15;
            const mill=r.mill_name||r.job_godown||'—',isPrimary=!r.design_no||r.design_no==='Primary Batch';
            const lotFmtDesign=!isPrimary&&isLotFormat(r.design_no);
            const showChallan=r.party_challan_no&&r.party_challan_no!==r.tally_voucher_no;
            return (
              <div key={r.id} style={{borderBottom:`1px solid ${T.border}`}}>
                <div onClick={()=>setExpanded(isExp?null:r.id)}
                  style={{display:'grid',gridTemplateColumns:COLS,padding:'11px 16px',background:isExp?T.tealLight:'#fff',cursor:'pointer',alignItems:'center',transition:'background .12s',minWidth:1100}}
                  onMouseEnter={e=>{if(!isExp)e.currentTarget.style.background=T.bg;}}
                  onMouseLeave={e=>{if(!isExp)e.currentTarget.style.background='#fff';}}>
                  <div style={{fontWeight:700,color:T.teal,fontSize:12,fontFamily:"'DM Mono',monospace",overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.tally_voucher_no||'—'}</div>
                  <div style={{fontSize:11,color:T.textMuted}}>{fmtDate(r.voucher_date)}</div>
                  <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    <div style={{fontSize:12,fontWeight:600,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={mill}>{mill}</div>
                    {isPrimary?(<div style={{fontSize:9,color:T.red,marginTop:1}}>No design yet</div>)
                    :lotFmtDesign?(<div style={{fontSize:10,color:T.orange,fontFamily:"'DM Mono',monospace",marginTop:1,fontWeight:700}}>⚠ {r.design_no}</div>)
                    :r.design_no?(<div style={{fontSize:10,color:T.blue,fontFamily:"'DM Mono',monospace",marginTop:1,fontWeight:700}}>D{r.design_no}</div>):null}
                  </div>
                  <div style={{overflow:'hidden'}}>
                    <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={r.grey_lot_no}>{r.grey_lot_no||'—'}</div>
                    {showChallan?(<div style={{fontSize:10,marginTop:2,display:'flex',alignItems:'center',gap:4}}><span style={{color:T.orange,fontWeight:800,fontSize:9}}>JW Ch:</span><span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,color:T.text,fontSize:11}}>{r.party_challan_no}</span></div>)
                    :(<div style={{fontSize:10,color:T.textFaint,marginTop:1}}>JW Ch —</div>)}
                  </div>
                  <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:11,color:T.textMuted}}>{r.grey_issued_qty_mtrs?fmtMtr(r.grey_issued_qty_mtrs):'—'}</div>
                  <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:600,color:T.text}}>{fmtMtr(r.finish_qty_mtrs)}</div>
                  <div style={{textAlign:'right'}}>{shortage>0?highShort?<Badge label={`${shortage.toFixed(1)}%`} color={T.red} bg={T.redLight}/>:<span style={{fontSize:11,color:T.textMuted,fontFamily:"'DM Mono',monospace"}}>{shortage.toFixed(1)}%</span>:<span style={{color:T.textFaint,fontSize:11}}>—</span>}</div>
                  <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:11,color:T.textMuted}}>{r.job_rate!=null?fmtRate(r.job_rate):'—'}</div>
                  <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:12,color:T.textMuted}}>{r.job_amount!=null?fmt(r.job_amount):'—'}</div>
                  <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:11,color:T.textMuted}}>{r.jw_allocated_cost!=null?fmt(r.jw_allocated_cost):'—'}</div>
                  <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:11,color:T.textMuted}}>{r.jw_allocation_pct!=null?`${Number(r.jw_allocation_pct).toFixed(1)}%`:'—'}</div>
                  <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:800,color:r.cumulative_cost_per_mtr?T.teal:T.textFaint}}>{r.cumulative_cost_per_mtr?`₹${Math.abs(Number(r.cumulative_cost_per_mtr)).toFixed(2)}`:'—'}</div>
                  <div style={{textAlign:'right'}}><ReconBadge status={r.recon_status}/></div>
                  <div style={{textAlign:'right',fontSize:14,color:isExp?T.teal:T.textFaint}}>{isExp?'▲':'▼'}</div>
                </div>
                {isExp&&(
                  <div style={{background:'#F8FFFE',borderTop:`1px solid ${T.border}`,padding:'16px 18px 20px'}}>
                    <>
                    {/* ── Tally-style split: SOURCE (Consumption) LEFT | DESTINATION (Production) RIGHT ── */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>

                      {/* SOURCE — Grey Fabric Consumption Side */}
                      <div style={{background:'#FFFBEB',border:`2px solid ${T.gold}`,borderRadius:8,padding:'12px 14px'}}>
                        <div style={{fontSize:10,fontWeight:800,color:T.gold,letterSpacing:.6,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
                          <span style={{background:T.gold,color:'#fff',borderRadius:4,padding:'1px 6px',fontSize:9,fontWeight:800}}>SOURCE</span>
                          Consumption — Grey Fabric
                        </div>
                        {[
                          ['Grey Item Name',      r.grey_item_name],
                          ['Grey Lot No (KEY 1)', r.grey_lot_no],
                          ['Source Godown',       r.source_godown||r.job_godown],
                          ['Issued Qty (m)',      r.grey_issued_qty_mtrs ? fmtMtr(r.grey_issued_qty_mtrs) : '—'],
                          ['Recd Qty (m)',        r.grey_recd_qty_mtrs && Number(r.grey_recd_qty_mtrs)>0 ? fmtMtr(r.grey_recd_qty_mtrs) : '—'],
                          ['Short Qty (m)',       r.short_qty_mtrs && Number(r.short_qty_mtrs)>0 ? fmtMtr(r.short_qty_mtrs) : '—'],
                          ['Grey Rate (Tally)',   r.grey_rate!=null ? `₹${Math.abs(Number(r.grey_rate)).toFixed(2)}/m` : '—'],
                          ['Grey Amount',         r.grey_amount!=null ? fmt(r.grey_amount) : '—'],
                          ['Job Rate (UDF)',      r.job_rate!=null ? `₹${Math.abs(Number(r.job_rate)).toFixed(2)}/m` : '—'],
                          ['Job Amount (UDF)',    r.job_amount!=null ? fmt(r.job_amount) : '—'],
                          ['Gross Amount (UDF)',  r.gross_amount!=null ? fmt(r.gross_amount) : '—'],
                        ].map(([k,v])=>(
                          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.gold}22`,fontSize:12,gap:6}}>
                            <span style={{color:T.textMuted,fontSize:11,flexShrink:0}}>{k}</span>
                            <span style={{color:k==='Grey Lot No (KEY 1)'?T.teal:T.text,fontWeight:600,textAlign:'right',fontFamily:k==='Grey Lot No (KEY 1)'?"'DM Mono',monospace":'inherit'}}>{v||'—'}</span>
                          </div>
                        ))}
                      </div>

                      {/* DESTINATION — Finish Fabric Production Side */}
                      <div style={{background:'#F0FFF8',border:`2px solid ${T.green}`,borderRadius:8,padding:'12px 14px'}}>
                        <div style={{fontSize:10,fontWeight:800,color:T.green,letterSpacing:.6,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
                          <span style={{background:T.green,color:'#fff',borderRadius:4,padding:'1px 6px',fontSize:9,fontWeight:800}}>DEST</span>
                          Production — Finish Fabric
                        </div>
                        {[
                          ['Finish Item Name',  r.finish_item_name],
                          ['Design No (KEY 3)', r.design_no||'Primary Batch'],
                          ['Dest Godown',       r.dest_godown||r.our_godown||'Main Location'],
                          ['Finish Qty (m)',    fmtMtr(r.finish_qty_mtrs)],
                          ['Issue Qty ref (m)', r.issue_qty_mtrs && Number(r.issue_qty_mtrs)>0 ? fmtMtr(r.issue_qty_mtrs) : '—'],
                          ['Shortage',         shortage>0 ? `${fmtMtr(r.shortage_mtrs)} (${shortage.toFixed(1)}%)` : '—'],
                          ['Finish Rate',      r.finish_rate!=null ? `₹${Math.abs(Number(r.finish_rate)).toFixed(2)}/m` : '—'],
                          ['Finish Amount',    r.finish_amount!=null ? fmt(r.finish_amount) : '—'],
                          ['Grey Purchase Rate (computed)', r.grey_purchase_rate ? `₹${Math.abs(Number(r.grey_purchase_rate)).toFixed(2)}/m` : '—'],
                          ['Grey Cost Actual', r.grey_cost_actual ? fmt(r.grey_cost_actual) : '—'],
                        ].map(([k,v])=>(
                          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.green}22`,fontSize:12,gap:6}}>
                            <span style={{color:T.textMuted,fontSize:11,flexShrink:0}}>{k}</span>
                            <span style={{color:k==='Design No (KEY 3)'?T.blue:T.text,fontWeight:600,textAlign:'right',fontFamily:k==='Design No (KEY 3)'?"'DM Mono',monospace":'inherit'}}>{v||'—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Voucher Header + Cost Chain ── */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:'12px 14px'}}>
                        <div style={{fontSize:10,fontWeight:800,color:T.navy,textTransform:'uppercase',letterSpacing:.6,marginBottom:8}}>📋 Voucher Info</div>
                        {[
                          ['Tally Voucher No',       r.tally_voucher_no],
                          ['Voucher Date',           fmtDate(r.voucher_date)],
                          ['Reference No (lot ref)', r.party_challan_no],
                          ['Party Name (Mill)',      r.mill_name||r.job_godown],
                          ['Job Godown',             r.job_godown],
                          ['Our Godown',             r.our_godown||'Main Location'],
                          ['Issue Challan No',       r.issue_challan_no],
                          ['Issue Challan Ref',      r.issue_challan_ref],
                          ['Weaver Name (UDF)',      r.weaver_name],
                          ['Quality Name (UDF)',     r.quality_name],
                          ['Process Type',           r.process_type],
                          ['Stage No',               String(r.stage_no||1)],
                          ['Narration',              r.narration],
                        ].filter(([,v])=>v&&v!=='—'&&v!=='null'&&v!=='undefined').map(([k,v])=>(
                          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12,gap:6}}>
                            <span style={{color:T.textMuted,fontSize:11,flexShrink:0}}>{k}</span>
                            <span style={{color:T.text,fontWeight:500,textAlign:'right',wordBreak:'break-word',maxWidth:'55%'}}>{v}</span>
                          </div>
                        ))}
                      </div>

                      {/* Cost Chain */}
                      <div style={{background:'#EFF8FF',border:`2px solid ${T.teal}`,borderRadius:8,padding:'12px 14px'}}>
                        <div style={{fontSize:10,fontWeight:800,color:T.teal,textTransform:'uppercase',letterSpacing:.6,marginBottom:8}}>₹ Cost Chain</div>
                        {[
                          ['Grey Purchase Rate',  r.grey_purchase_rate ? `₹${Math.abs(Number(r.grey_purchase_rate)).toFixed(2)}/m` : '—'],
                          ['Grey Cost (Actual)',  r.grey_cost_actual ? fmt(r.grey_cost_actual) : '—'],
                          ['JW Allocated Cost',  r.jw_allocated_cost ? fmt(r.jw_allocated_cost) : '—'],
                          ['JW Allocation %',    r.jw_allocation_pct ? `${Number(r.jw_allocation_pct).toFixed(2)}%` : '—'],
                          ['JW Voucher No',      r.jw_voucher_number],
                          ['JW Expense Amt',     r.jw_expense_amount ? fmt(r.jw_expense_amount) : '—'],
                          ['Recon Status',       r.recon_status||'pending'],
                        ].map(([k,v])=>(
                          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.teal}22`,fontSize:12,gap:6}}>
                            <span style={{color:T.textMuted,fontSize:11,flexShrink:0}}>{k}</span>
                            <span style={{color:k==='Recon Status'?(r.recon_status==='matched'?T.green:r.recon_status==='mismatch'?T.red:T.orange):T.text,fontWeight:600,textAlign:'right'}}>{v||'—'}</span>
                          </div>
                        ))}
                        <div style={{marginTop:10,padding:'10px 12px',background:r.cumulative_cost_per_mtr?T.tealLight:T.bg,borderRadius:6,border:`1px solid ${T.teal}44`}}>
                          <div style={{fontSize:9,color:T.textMuted,textTransform:'uppercase',fontWeight:700,letterSpacing:.5,marginBottom:4}}>Cumulative Cost / Metre</div>
                          <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:26,color:r.cumulative_cost_per_mtr?T.teal:T.textFaint,fontWeight:700}}>
                            {r.cumulative_cost_per_mtr ? `₹${Math.abs(Number(r.cumulative_cost_per_mtr)).toFixed(2)}` : 'Not Computed'}
                          </div>
                          <div style={{fontSize:10,color:T.textMuted,marginTop:2}}>
                            grey ({r.grey_purchase_rate?`₹${Math.abs(Number(r.grey_purchase_rate)).toFixed(2)}`:'?'}/m) + job ({r.job_rate?`₹${Math.abs(Number(r.job_rate)).toFixed(2)}`:'?'}/m)
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                    {!isPrimary&&r.design_no?(<div style={{marginBottom:12}}><OriginPanel designNo={r.design_no}/></div>)
                    :r.grey_lot_no?(<div style={{marginBottom:12}}><OriginPanel lotNo={r.grey_lot_no}/></div>):null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {totalPages>1&&(
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderTop:`1px solid ${T.border}`,background:T.bg}}>
            <span style={{fontSize:12,color:T.textMuted}}>{totalCount.toLocaleString()} total · Page {page+1} of {totalPages}</span>
            <div style={{display:'flex',gap:6}}>
              {page>0&&<button onClick={()=>fetchRows(page-1)} style={{padding:'6px 14px',border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,cursor:'pointer',background:'#fff',color:T.text}}>← Prev</button>}
              {page<totalPages-1&&<button onClick={()=>fetchRows(page+1)} style={{padding:'6px 14px',background:T.teal,border:'none',borderRadius:6,fontSize:12,cursor:'pointer',color:'#fff',fontWeight:700}}>Next →</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
