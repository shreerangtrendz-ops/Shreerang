import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import OriginPanel from '../../../components/accounting/OriginPanel';

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

const fmt    = n => '₹' + Math.abs(Number(n||0)).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtL   = n => { const v=Math.abs(Number(n||0)); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:'₹'+v.toLocaleString('en-IN',{maximumFractionDigits:0}); };
const fmtMtr = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + ' m';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '—';
const PAGE = 50;
const FY_YEARS = [2022,2023,2024,2025,2026];

function getCurrentFY() {
  const now = new Date();
  const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear()-1;
  return { from:`${yr}-04-01`, to:`${yr+1}-03-31`, yr };
}

function cleanDesignNo(val) {
  if (!val) return '—';
  return val.replace(/^D\s*No\.?\s*/i,'').trim() || val;
}

function Badge({label, color=T.teal, bg}) {
  return (
    <span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700,
      background:bg||color+'22',color,letterSpacing:.3}}>
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

const COLS = '130px 85px 1fr 90px 80px 105px 95px 95px 85px 30px';
const HDRS = ['Voucher / Date','Design','Lot → Mill','Finish m','Short %','Job Amt','JW Alloc','Cost/m','Status',''];

export default function RecFromMillPage() {
  const fy = getCurrentFY();
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]             = useState(0);
  const [expanded, setExpanded]     = useState(null);
  const [activeFY, setActiveFY]     = useState(fy.yr);

  const [dateFrom, setDateFrom]           = useState(fy.from);
  const [dateTo, setDateTo]               = useState(fy.to);
  const [godownFilter, setGodownFilter]   = useState('');
  const [processFilter, setProcessFilter] = useState('');
  const [reconFilter, setReconFilter]     = useState('');
  const [highShortOnly, setHighShortOnly] = useState(false);
  const [search, setSearch]               = useState('');

  const [summary, setSummary]           = useState({count:0,totalMtrs:0,avgShortage:0,totalJwCost:0});
  const [godownOptions, setGodownOptions] = useState([]);
  const [processOptions, setProcessOptions] = useState([]);

  // Load dropdown options once on mount
  useEffect(() => {
    supabase.from('rec_from_mill').select('job_godown').then(({data}) => {
      if (data) setGodownOptions([...new Set(data.map(r=>r.job_godown).filter(Boolean))].sort());
    });
    supabase.from('rec_from_mill').select('process_type').then(({data}) => {
      if (data) setProcessOptions([...new Set(data.map(r=>r.process_type).filter(Boolean))].sort());
    });
  }, []);

  const setFY = yr => {
    setActiveFY(yr);
    setDateFrom(`${yr}-04-01`);
    setDateTo(`${yr+1}-03-31`);
    setPage(0);
  };

  // Shared filter builder applied to any Supabase query
  const applyFilters = useCallback((q) => {
    if (dateFrom)      q = q.gte('voucher_date', dateFrom);
    if (dateTo)        q = q.lte('voucher_date', dateTo);
    if (godownFilter)  q = q.eq('job_godown', godownFilter);
    if (processFilter) q = q.eq('process_type', processFilter);
    if (reconFilter)   q = q.eq('recon_status', reconFilter);
    if (highShortOnly) q = q.gt('shortage_pct', 15);
    if (search)        q = q.or([
      `design_no.ilike.%${search}%`,
      `grey_lot_no.ilike.%${search}%`,
      `tally_voucher_no.ilike.%${search}%`,
      `party_challan_no.ilike.%${search}%`,
    ].join(','));
    return q;
  }, [dateFrom, dateTo, godownFilter, processFilter, reconFilter, highShortOnly, search]);

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
      .select('finish_qty_mtrs,shortage_pct,jw_allocated_cost');
    q = applyFilters(q);
    const {data} = await q;
    if (data) {
      const withShort = data.filter(r => r.shortage_pct != null);
      setSummary({
        count:       data.length,
        totalMtrs:   data.reduce((s,r) => s + Math.abs(Number(r.finish_qty_mtrs||0)), 0),
        avgShortage: withShort.length
          ? withShort.reduce((s,r) => s + Number(r.shortage_pct||0), 0) / withShort.length
          : 0,
        totalJwCost: data.reduce((s,r) => s + Math.abs(Number(r.jw_allocated_cost||0)), 0),
      });
    }
  }, [applyFilters]);

  useEffect(() => { fetchRows(0); fetchSummary(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function runFilters()  { fetchRows(0); fetchSummary(); }
  function resetFilters() {
    setSearch(''); setGodownFilter(''); setProcessFilter('');
    setReconFilter(''); setHighShortOnly(false);
    const f = getCurrentFY();
    setActiveFY(f.yr); setDateFrom(f.from); setDateTo(f.to);
    setTimeout(() => { fetchRows(0); fetchSummary(); }, 0);
  }

  const totalPages = Math.ceil(totalCount / PAGE);

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh',padding:'20px 24px'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,color:T.text,margin:0}}>
            Receive From Mill
          </h1>
          <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>
            Design born here · cumulative cost per metre · V-04 REC voucher data from Tally
          </div>
        </div>
        <Badge label={`${totalCount.toLocaleString()} records`} color={T.teal} bg={T.tealLight}/>
      </div>

      {/* FY Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16,background:T.surface,border:`1px solid ${T.border}`,
        borderRadius:8,padding:4,width:'fit-content'}}>
        {FY_YEARS.map(yr => (
          <button key={yr} onClick={() => setFY(yr)}
            style={{padding:'5px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,
              fontWeight:700,transition:'all .15s',
              background:activeFY===yr?T.teal:'transparent',
              color:activeFY===yr?'#fff':T.textMuted}}>
            FY {yr.toString().slice(2)}-{(yr+1).toString().slice(2)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
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
          sub="average across batches"
          color={T.orange}
        />
        <SummaryCard
          label="Total JW Alloc Cost"
          value={fmtL(summary.totalJwCost)}
          sub="allocated job work cost"
          color={T.gold}
        />
      </div>

      {/* Filters */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,
        padding:'14px 18px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>

        <div style={{flex:'1 1 180px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,
            textTransform:'uppercase',letterSpacing:.4}}>Search</div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Design, lot, voucher, challan…"
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,
              fontSize:12,color:T.text,background:'#fff',outline:'none',boxSizing:'border-box'}}/>
        </div>

        <div style={{flex:'1 1 150px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,
            textTransform:'uppercase',letterSpacing:.4}}>Job Godown</div>
          <select value={godownFilter} onChange={e=>setGodownFilter(e.target.value)}
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,
              fontSize:12,background:'#fff',color:T.text,outline:'none'}}>
            <option value="">All Godowns</option>
            {godownOptions.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {processOptions.length > 0 && (
          <div style={{flex:'1 1 140px'}}>
            <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,
              textTransform:'uppercase',letterSpacing:.4}}>Process Type</div>
            <select value={processFilter} onChange={e=>setProcessFilter(e.target.value)}
              style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,
                fontSize:12,background:'#fff',color:T.text,outline:'none'}}>
              <option value="">All Types</option>
              {processOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}

        <div style={{flex:'1 1 130px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,
            textTransform:'uppercase',letterSpacing:.4}}>Recon Status</div>
          <select value={reconFilter} onChange={e=>setReconFilter(e.target.value)}
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,
              fontSize:12,background:'#fff',color:T.text,outline:'none'}}>
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
          <label htmlFor="highShort" style={{fontSize:12,color:T.red,fontWeight:700,
            cursor:'pointer',whiteSpace:'nowrap'}}>Shortage &gt;15%</label>
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

      {/* Table */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>

        {/* Header row */}
        <div style={{display:'grid',gridTemplateColumns:COLS,background:T.bg,
          borderBottom:`1px solid ${T.border}`,padding:'10px 16px'}}>
          {HDRS.map((h,i) => (
            <div key={i} style={{fontSize:10,color:T.textMuted,fontWeight:700,
              textTransform:'uppercase',letterSpacing:.5,
              textAlign:i>=3&&i<=7?'right':'left'}}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{padding:60,textAlign:'center',color:T.textMuted}}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{padding:60,textAlign:'center',color:T.textMuted}}>
            No REC records found for selected period
          </div>
        ) : rows.map(r => {
          const isExp    = expanded === r.id;
          const shortage = Number(r.shortage_pct || 0);
          const highShort = shortage > 15;
          const mill     = r.job_godown || r.mill_name || '—';
          const design   = cleanDesignNo(r.design_no);
          const isPrimary = r.design_no === 'Primary Batch';

          return (
            <div key={r.id} style={{borderBottom:`1px solid ${T.border}`}}>

              {/* Main row */}
              <div
                onClick={() => setExpanded(isExp ? null : r.id)}
                style={{display:'grid',gridTemplateColumns:COLS,padding:'11px 16px',
                  background:isExp?T.tealLight:'#fff',cursor:'pointer',
                  alignItems:'center',transition:'background .12s'}}
                onMouseEnter={e => { if (!isExp) e.currentTarget.style.background = T.bg; }}
                onMouseLeave={e => { if (!isExp) e.currentTarget.style.background = '#fff'; }}
              >
                {/* Voucher / Date */}
                <div>
                  <div style={{fontWeight:700,color:T.teal,fontSize:12,
                    fontFamily:"'DM Mono',monospace"}}>{r.tally_voucher_no||'—'}</div>
                  <div style={{fontSize:10,color:T.textMuted,marginTop:2}}>{fmtDate(r.voucher_date)}</div>
                </div>

                {/* Design No */}
                <div>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:12.5,fontWeight:700,
                    color:isPrimary?T.textMuted:T.blue}}>{design}</div>
                  {isPrimary && <div style={{fontSize:9,color:T.red}}>No design yet</div>}
                </div>

                {/* Lot → Mill */}
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:T.text,overflow:'hidden',
                    textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{mill}</div>
                  <div style={{fontSize:11,color:T.textMuted,marginTop:1,
                    fontFamily:"'DM Mono',monospace"}}>
                    {r.grey_lot_no||'—'}
                    {r.party_challan_no ? ` · Ch ${r.party_challan_no}` : ''}
                  </div>
                </div>

                {/* Finish m */}
                <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:12.5}}>
                  {fmtMtr(r.finish_qty_mtrs)}
                </div>

                {/* Shortage % */}
                <div style={{textAlign:'right'}}>
                  {highShort
                    ? <Badge label={`${shortage.toFixed(1)}%`} color={T.red} bg={T.redLight}/>
                    : <span style={{fontSize:12,color:T.textMuted,fontFamily:"'DM Mono',monospace"}}>
                        {shortage > 0 ? `${shortage.toFixed(1)}%` : '—'}
                      </span>
                  }
                </div>

                {/* Job Amt — Math.abs() */}
                <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",
                  fontSize:12,color:T.textMuted}}>
                  {r.job_amount != null ? fmt(r.job_amount) : '—'}
                </div>

                {/* JW Alloc — Math.abs() */}
                <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",
                  fontSize:12,color:T.textMuted}}>
                  {r.jw_allocated_cost != null ? fmt(r.jw_allocated_cost) : '—'}
                </div>

                {/* Cost/m — teal, most important field */}
                <div style={{textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:13,
                  fontWeight:800,color:r.cumulative_cost_per_mtr ? T.teal : T.textFaint}}>
                  {r.cumulative_cost_per_mtr
                    ? `₹${Math.abs(Number(r.cumulative_cost_per_mtr)).toFixed(2)}`
                    : '—'}
                </div>

                {/* Recon status */}
                <div><ReconBadge status={r.recon_status}/></div>

                {/* Expand chevron */}
                <div style={{textAlign:'right',fontSize:14,
                  color:isExp?T.teal:T.textFaint}}>{isExp?'▲':'▼'}</div>
              </div>

              {/* Expanded detail */}
              {isExp && (
                <div style={{background:'#F8FFFE',borderTop:`1px solid ${T.border}`,
                  padding:'16px 18px 20px'}}>

                  {/* Detail grid */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,
                    marginBottom:16,padding:'12px 14px',background:'#fff',
                    borderRadius:8,border:`1px solid ${T.border}`}}>
                    {[
                      ['Tally Voucher',       r.tally_voucher_no],
                      ['Voucher Date',        fmtDate(r.voucher_date)],
                      ['Design No (raw)',     r.design_no||'—'],
                      ['Grey Lot No',         r.grey_lot_no||'—'],
                      ['Party Challan No',    r.party_challan_no||'—'],
                      ['Job Godown',          r.job_godown||'—'],
                      ['Mill Name',           r.mill_name||'—'],
                      ['Process Type',        r.process_type||'—'],
                      ['Stage No',            r.stage_no||'—'],
                      ['Grey Item',           r.grey_item_name||'—'],
                      ['Finish Item',         r.finish_item_name||'—'],
                      ['Grey Issued (m)',      r.grey_issued_qty_mtrs ? fmtMtr(r.grey_issued_qty_mtrs) : '—'],
                      ['Finish Qty (m)',       fmtMtr(r.finish_qty_mtrs)],
                      ['Shortage (m)',         r.shortage_mtrs ? fmtMtr(r.shortage_mtrs) : '—'],
                      ['Shortage %',          shortage > 0 ? `${shortage.toFixed(2)}%` : '—'],
                      ['Grey Purchase Rate',  r.grey_purchase_rate != null ? `₹${Math.abs(Number(r.grey_purchase_rate)).toFixed(2)}` : '—'],
                      ['Job Rate',            r.job_rate != null ? `₹${Math.abs(Number(r.job_rate)).toFixed(2)}` : '—'],
                      ['Job Amount',          r.job_amount != null ? fmt(r.job_amount) : '—'],
                      ['JW Alloc Cost',       r.jw_allocated_cost != null ? fmt(r.jw_allocated_cost) : '—'],
                      ['JW Alloc %',          r.jw_allocation_pct != null ? `${Number(r.jw_allocation_pct).toFixed(2)}%` : '—'],
                      ['Cum. Cost/m',         r.cumulative_cost_per_mtr != null ? `₹${Math.abs(Number(r.cumulative_cost_per_mtr)).toFixed(2)}` : '—'],
                      ['Recon Status',        r.recon_status||'pending'],
                      ['JW Voucher No',       r.jw_voucher_number||'—'],
                      ['Narration',           r.narration||'—'],
                    ].map(([k,v]) => (
                      <div key={k}>
                        <div style={{fontSize:9,color:T.textMuted,fontWeight:700,
                          textTransform:'uppercase',letterSpacing:.4,marginBottom:2}}>{k}</div>
                        <div style={{fontSize:12,wordBreak:'break-word',
                          color:k==='Cum. Cost/m'?T.teal:T.text,
                          fontWeight:k==='Cum. Cost/m'?800:500}}>{v||'—'}</div>
                      </div>
                    ))}
                  </div>

                  {/* Origin Panel */}
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

        {/* Pagination */}
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
