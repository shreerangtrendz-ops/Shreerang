import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

const T = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6', teal100:'#9FE1CB',
  gold:'#E8A800', goldLight:'#FFF8E8',
  navy:'#0B2E2B', green:'#1E9E5A', greenLight:'#E8FFF4',
  blue:'#2468C8', blueLight:'#EBF8FF',
  red:'#D93025', redLight:'#FFF5F5',
  orange:'#E67E22', orangeLight:'#FFF3E8',
  purple:'#7C3AED', purpleLight:'#F3EEFF',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95', textFaint:'#A8C9C3',
};

const fmt    = n => '₹' + Math.abs(Number(n||0)).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtL   = n => { const v=Math.abs(Number(n||0)); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:fmt(v); };
const fmtMtr = n => Math.abs(Number(n||0)).toLocaleString('en-IN',{maximumFractionDigits:2}) + ' m';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '—';
const PAGE = 50;
const FY_YEARS = [2022,2023,2024,2025,2026];

function getCurrentFY() {
  const now = new Date();
  const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear()-1;
  return { from:`${yr}-04-01`, to:`${yr+1}-03-31`, yr };
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function Badge({label, color=T.teal, bg}) {
  return <span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700,background:bg||color+'22',color,letterSpacing:.3}}>{label}</span>;
}

function SummaryCard({label, value, sub, color=T.teal}) {
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 18px',borderTop:`3px solid ${color}`}}>
      <div style={{fontSize:10,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.6,marginBottom:6}}>{label}</div>
      <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:22,color:T.text,lineHeight:1}}>{value}</div>
      {sub && <div style={{fontSize:11,color:T.textMuted,marginTop:4}}>{sub}</div>}
    </div>
  );
}

function AlertBadge({days, isSampling}) {
  const threshold = isSampling ? 3 : 15;
  const warn      = isSampling ? 2 : 10;
  if (days === null) return null;
  const color = days >= threshold ? T.red : days >= warn ? T.orange : T.green;
  const bg    = days >= threshold ? T.redLight : days >= warn ? T.orangeLight : T.greenLight;
  const label = days >= threshold ? `${days}d ⚠ OVERDUE` : `${days}d`;
  return <span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700,background:bg,color,letterSpacing:.3}}>{label}</span>;
}

function PendingDot({count, color}) {
  if (!count) return null;
  return (
    <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',background:color,
      color:'#fff',borderRadius:'50%',width:18,height:18,fontSize:10,fontWeight:700,marginLeft:4}}>
      {count}
    </span>
  );
}

function Pagination({page, totalCount, onPage}) {
  const totalPages = Math.ceil(totalCount / PAGE);
  if (totalPages <= 1) return null;
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'12px 20px',borderTop:`1px solid ${T.border}`,background:T.bg,borderRadius:'0 0 12px 12px',marginTop:8}}>
      <span style={{fontSize:12,color:T.textMuted}}>
        {totalCount.toLocaleString()} total · Page {page+1} of {totalPages}
      </span>
      <div style={{display:'flex',gap:6}}>
        {page > 0 && (
          <button onClick={()=>onPage(page-1)}
            style={{padding:'6px 14px',border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,cursor:'pointer',background:'#fff',color:T.text}}>
            ← Prev
          </button>
        )}
        {page < totalPages-1 && (
          <button onClick={()=>onPage(page+1)}
            style={{padding:'6px 14px',background:T.teal,border:'none',borderRadius:6,fontSize:12,cursor:'pointer',color:'#fff',fontWeight:700}}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}

const PROCESS_TYPES = ['Dyeing','Printing','Schiffli','Embroidery','Foil','Digital','Crush','Pleating','Other'];

export default function ProcessIssuesPage() {
  const fy = getCurrentFY();

  const [activeTab, setActiveTab]   = useState('issues');
  const [activeFY, setActiveFY]     = useState(fy.yr);
  const [dateFrom, setDateFrom]     = useState(fy.from);
  const [dateTo, setDateTo]         = useState(fy.to);
  const [search, setSearch]         = useState('');
  const [millFilter, setMillFilter] = useState('');
  const [samplingFilter, setSamplingFilter] = useState('all');

  // Issues tab
  const [issues, setIssues]               = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issuesTotalCount, setIssuesTotalCount] = useState(0);
  const [issuesPage, setIssuesPage]       = useState(0);
  const [expandedIssue, setExpandedIssue] = useState(null);

  // REC tab
  const [recs, setRecs]               = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsTotalCount, setRecsTotalCount] = useState(0);
  const [recsPage, setRecsPage]       = useState(0);
  const [expandedRec, setExpandedRec] = useState(null);

  // Pending tab
  const [pendingIssues, setPendingIssues]   = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Recon tab
  const [reconData, setReconData]     = useState([]);
  const [reconLoading, setReconLoading] = useState(false);

  // Summary
  const [summary, setSummary] = useState({
    totalIssued:0, totalRecdMtrs:0, totalShortage:0,
    totalRecCount:0, samplingCount:0, productionCount:0,
  });

  const setFY = yr => {
    setActiveFY(yr);
    setDateFrom(`${yr}-04-01`);
    setDateTo(`${yr+1}-03-31`);
    setIssuesPage(0);
    setRecsPage(0);
  };

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchIssues = useCallback(async (pg=0) => {
    setIssuesLoading(true);
    const from = pg*PAGE, to = from+PAGE-1;
    let q = supabase.from('issue_to_mill')
      .select('*',{count:'exact'})
      .order('voucher_date',{ascending:false})
      .range(from,to);
    if (dateFrom)                       q = q.gte('voucher_date',dateFrom);
    if (dateTo)                         q = q.lte('voucher_date',dateTo);
    if (millFilter)                     q = q.ilike('mill_name',`%${millFilter}%`);
    if (samplingFilter==='sampling')    q = q.eq('is_sampling',true);
    if (samplingFilter==='production')  q = q.eq('is_sampling',false);
    if (search) q = q.or(`lot_no.ilike.%${search}%,mill_name.ilike.%${search}%,item_name.ilike.%${search}%`);
    const {data,error,count} = await q;
    if (!error) { setIssues(data||[]); setIssuesTotalCount(count||0); }
    setIssuesPage(pg);
    setIssuesLoading(false);
  }, [dateFrom,dateTo,millFilter,samplingFilter,search]);

  const fetchRecs = useCallback(async (pg=0) => {
    setRecsLoading(true);
    const from = pg*PAGE, to = from+PAGE-1;
    let q = supabase.from('rec_from_mill')
      .select('*',{count:'exact'})
      .order('voucher_date',{ascending:false})
      .range(from,to);
    if (dateFrom)   q = q.gte('voucher_date',dateFrom);
    if (dateTo)     q = q.lte('voucher_date',dateTo);
    if (millFilter) q = q.ilike('mill_name',`%${millFilter}%`);
    if (search) q = q.or(`grey_lot_no.ilike.%${search}%,design_no.ilike.%${search}%,mill_name.ilike.%${search}%,party_challan_no.ilike.%${search}%`);
    const {data,error,count} = await q;
    if (!error) { setRecs(data||[]); setRecsTotalCount(count||0); }
    setRecsPage(pg);
    setRecsLoading(false);
  }, [dateFrom,dateTo,millFilter,search]);

  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    const {data:allIssues} = await supabase.from('issue_to_mill')
      .select('id,lot_no,voucher_date,mill_name,item_name,qty_mtrs,is_sampling,process_type,purpose_note')
      .order('voucher_date',{ascending:false});
    if (!allIssues) { setPendingLoading(false); return; }
    const lotNos = [...new Set(allIssues.map(i=>i.lot_no).filter(Boolean))];
    if (!lotNos.length) { setPendingIssues([]); setPendingLoading(false); return; }
    const {data:recLots} = await supabase.from('rec_from_mill')
      .select('grey_lot_no').in('grey_lot_no',lotNos.slice(0,1000));
    const recLotSet = new Set((recLots||[]).map(r=>r.grey_lot_no));
    setPendingIssues(allIssues.filter(i=>i.lot_no&&!recLotSet.has(i.lot_no)));
    setPendingLoading(false);
  }, []);

  const fetchRecon = useCallback(async () => {
    setReconLoading(true);
    const {data} = await supabase.from('jobwork_expenses')
      .select('*').order('voucher_date',{ascending:false}).limit(200);
    setReconData(data||[]);
    setReconLoading(false);
  }, []);

  const fetchSummary = useCallback(async () => {
    const [issRes,recRes] = await Promise.all([
      supabase.from('issue_to_mill').select('qty_mtrs,is_sampling').gte('voucher_date',dateFrom).lte('voucher_date',dateTo),
      supabase.from('rec_from_mill').select('finish_qty_mtrs,shortage_mtrs').gte('voucher_date',dateFrom).lte('voucher_date',dateTo),
    ]);
    const iss = issRes.data||[];
    const rec = recRes.data||[];
    setSummary({
      totalIssued:     iss.reduce((s,r)=>s+Math.abs(Number(r.qty_mtrs||0)),0),
      totalRecCount:   rec.length,
      totalRecdMtrs:   rec.reduce((s,r)=>s+Math.abs(Number(r.finish_qty_mtrs||0)),0),
      totalShortage:   rec.reduce((s,r)=>s+Math.abs(Number(r.shortage_mtrs||0)),0),
      samplingCount:   iss.filter(i=>i.is_sampling).length,
      productionCount: iss.filter(i=>!i.is_sampling).length,
    });
  }, [dateFrom,dateTo]);

  useEffect(()=>{ fetchSummary(); }, [fetchSummary]);
  useEffect(()=>{ if(activeTab==='issues')  fetchIssues(0);  }, [activeTab,fetchIssues]);
  useEffect(()=>{ if(activeTab==='rec')     fetchRecs(0);    }, [activeTab,fetchRecs]);
  useEffect(()=>{ if(activeTab==='pending') fetchPending();  }, [activeTab,fetchPending]);
  useEffect(()=>{ if(activeTab==='recon')   fetchRecon();    }, [activeTab,fetchRecon]);

  function applyFilters() {
    fetchIssues(0); fetchRecs(0); fetchSummary();
  }
  function resetFilters() {
    setSearch(''); setMillFilter(''); setSamplingFilter('all');
    const f = getCurrentFY();
    setActiveFY(f.yr); setDateFrom(f.from); setDateTo(f.to);
  }

  // ── Inline edits ──────────────────────────────────────────────────────────

  const toggleSampling = async (id,cur) => {
    const {error} = await supabase.from('issue_to_mill').update({is_sampling:!cur}).eq('id',id);
    if (!error) {
      setIssues(p=>p.map(i=>i.id===id?{...i,is_sampling:!cur}:i));
      setPendingIssues(p=>p.map(i=>i.id===id?{...i,is_sampling:!cur}:i));
    }
  };
  const updateProcessType = async (id,val) => {
    await supabase.from('issue_to_mill').update({process_type:val}).eq('id',id);
    setIssues(p=>p.map(i=>i.id===id?{...i,process_type:val}:i));
  };

  // ── Tab renderers ─────────────────────────────────────────────────────────

  const renderIssues = () => (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
      {issuesLoading ? (
        <div style={{padding:50,textAlign:'center',color:T.textMuted}}>Loading…</div>
      ) : issues.length===0 ? (
        <div style={{padding:50,textAlign:'center',color:T.textMuted}}>No issue entries found for selected period</div>
      ) : issues.map(iss => {
        const days  = daysSince(iss.voucher_date);
        const isOpen = expandedIssue === iss.id;
        return (
          <div key={iss.id} style={{borderBottom:`1px solid ${T.border}`}}>
            <div
              onClick={()=>setExpandedIssue(isOpen?null:iss.id)}
              style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',
                background:isOpen?T.tealLight:'#fff',borderLeft:`4px solid ${iss.is_sampling?T.gold:T.teal}`,
                transition:'background .12s'}}
              onMouseEnter={e=>{if(!isOpen)e.currentTarget.style.background=T.bg}}
              onMouseLeave={e=>{if(!isOpen)e.currentTarget.style.background='#fff'}}
            >
              {/* Sampling toggle */}
              <div
                onClick={e=>{e.stopPropagation();toggleSampling(iss.id,iss.is_sampling);}}
                style={{width:36,height:20,borderRadius:10,background:iss.is_sampling?T.gold:T.border,
                  position:'relative',cursor:'pointer',flexShrink:0,transition:'background .2s'}}>
                <div style={{position:'absolute',top:2,left:iss.is_sampling?18:2,width:16,height:16,
                  borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px #0003'}}/>
              </div>
              <div style={{flexShrink:0}}>
                {iss.is_sampling
                  ? <Badge label="SAMPLING"   color={T.gold}/>
                  : <Badge label="PRODUCTION" color={T.teal}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:T.text,fontFamily:"'DM Mono',monospace"}}>{iss.lot_no||'—'}</div>
                <div style={{fontSize:11,color:T.textMuted,marginTop:1}}>{iss.mill_name} · {fmtDate(iss.voucher_date)}</div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontWeight:700,fontSize:13,fontFamily:"'DM Mono',monospace"}}>{fmtMtr(iss.qty_mtrs)}</div>
                <div style={{fontSize:11,color:T.textMuted,marginTop:1}}>{iss.item_name}</div>
              </div>
              <AlertBadge days={days} isSampling={iss.is_sampling}/>
              {iss.process_type && <Badge label={iss.process_type} color={T.purple}/>}
              <div style={{color:T.textFaint,fontSize:16}}>{isOpen?'▲':'▼'}</div>
            </div>

            {isOpen && (
              <div style={{padding:'14px 16px',background:'#F8FFFE',borderTop:`1px solid ${T.border}`}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:12}}>
                  {[
                    ['Lot / Challan No',    iss.lot_no],
                    ['Tally Voucher',       iss.tally_voucher_no],
                    ['Destination Godown',  iss.destination_godown],
                    ['Takas / Pcs',         iss.taka_pcs],
                    ['Rate',                iss.rate ? fmt(iss.rate)+'/m' : '—'],
                    ['Amount',              fmt(iss.amount)],
                  ].map(([l,v]) => (
                    <div key={l}>
                      <div style={{fontSize:10,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,marginBottom:2}}>{l}</div>
                      <div style={{fontSize:13,color:T.text}}>{v||'—'}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <span style={{fontSize:10,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.4}}>Process Type:</span>
                  <select
                    value={iss.process_type||''}
                    onChange={e=>{e.stopPropagation();updateProcessType(iss.id,e.target.value);}}
                    onClick={e=>e.stopPropagation()}
                    style={{padding:'4px 8px',borderRadius:6,border:`1px solid ${T.border}`,fontSize:11,color:T.text,background:T.surface,outline:'none'}}>
                    <option value="">— Select —</option>
                    {PROCESS_TYPES.map(p=><option key={p}>{p}</option>)}
                  </select>
                  <Badge
                    label={iss.is_sampling ? 'Sampling — remind in 3 days' : 'Production — remind in 15 days'}
                    color={iss.is_sampling ? T.gold : T.teal}
                  />
                </div>
                {iss.narration && <div style={{fontSize:11,color:T.textMuted,fontStyle:'italic'}}>{iss.narration}</div>}
              </div>
            )}
          </div>
        );
      })}
      <Pagination page={issuesPage} totalCount={issuesTotalCount} onPage={fetchIssues}/>
    </div>
  );

  const renderRecs = () => (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
      {recsLoading ? (
        <div style={{padding:50,textAlign:'center',color:T.textMuted}}>Loading…</div>
      ) : recs.length===0 ? (
        <div style={{padding:50,textAlign:'center',color:T.textMuted}}>No REC FROM MILL entries found</div>
      ) : recs.map(rec => {
        const isOpen    = expandedRec === rec.id;
        const shortPct  = Math.abs(Number(rec.shortage_pct||0));
        const shortColor = shortPct>15?T.red:shortPct>8?T.orange:T.green;
        return (
          <div key={rec.id} style={{borderBottom:`1px solid ${T.border}`}}>
            <div
              onClick={()=>setExpandedRec(isOpen?null:rec.id)}
              style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',
                background:isOpen?T.blueLight:'#fff',borderLeft:`4px solid ${T.blue}`,transition:'background .12s'}}
              onMouseEnter={e=>{if(!isOpen)e.currentTarget.style.background=T.bg}}
              onMouseLeave={e=>{if(!isOpen)e.currentTarget.style.background='#fff'}}
            >
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:13,color:T.text}}>
                  Design <span style={{fontFamily:"'DM Mono',monospace"}}>{rec.design_no||'—'}</span>
                  {rec.stage_no>1 && <Badge label={`Stage ${rec.stage_no}`} color={T.purple}/>}
                </div>
                <div style={{fontSize:11,color:T.textMuted,marginTop:1}}>
                  Lot <span style={{fontFamily:"'DM Mono',monospace"}}>{rec.grey_lot_no}</span> · GP {rec.party_challan_no} · {fmtDate(rec.voucher_date)}
                </div>
              </div>
              <div style={{textAlign:'center',flexShrink:0}}>
                <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:.3}}>Issued → Received</div>
                <div style={{fontWeight:700,fontSize:13,fontFamily:"'DM Mono',monospace"}}>
                  {fmtMtr(rec.grey_issued_qty_mtrs)} → {fmtMtr(rec.finish_qty_mtrs)}
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:.3}}>Shortage</div>
                <div style={{fontWeight:700,fontSize:13,color:shortColor}}>
                  {fmtMtr(rec.shortage_mtrs)} ({shortPct.toFixed(1)}%)
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:.3}}>Job Cost</div>
                <div style={{fontWeight:700,fontSize:13,fontFamily:"'DM Mono',monospace"}}>{fmt(rec.job_amount)}</div>
              </div>
              <div style={{color:T.textFaint,fontSize:16}}>{isOpen?'▲':'▼'}</div>
            </div>

            {isOpen && (
              <div style={{padding:'14px 16px',background:'#F0F6FF',borderTop:`1px solid ${T.border}`}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
                  {[
                    ['Mill/Jobworker',       rec.mill_name],
                    ['Party Challan No (GP)', rec.party_challan_no],
                    ['Issue Challan No',      rec.issue_challan_no],
                    ['Grey Lot No',           rec.grey_lot_no],
                    ['Weaver Name',           rec.weaver_name],
                    ['Quality Name',          rec.quality_name],
                    ['Grey Item',             rec.grey_item_name],
                    ['Finish Item',           rec.finish_item_name],
                    ['Grey Rate',             rec.grey_rate   ? fmt(rec.grey_rate)+'/m'   : '—'],
                    ['Grey Amount',           fmt(rec.grey_amount)],
                    ['Job Rate',              rec.job_rate    ? fmt(rec.job_rate)+'/m'    : '—'],
                    ['Job Amount',            fmt(rec.job_amount)],
                    ['Purchase Rate',         rec.grey_purchase_rate ? fmt(rec.grey_purchase_rate)+'/m' : '—'],
                    ['Actual Grey Cost',      fmt(rec.grey_cost_actual)],
                    ['Cumulative Cost/m',     rec.cumulative_cost_per_mtr ? fmt(rec.cumulative_cost_per_mtr)+'/m' : '—'],
                    ['Stage No',              rec.stage_no||1],
                    ['Process Type',          rec.process_type||'—'],
                  ].map(([l,v]) => (
                    <div key={l}>
                      <div style={{fontSize:10,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,marginBottom:2}}>{l}</div>
                      <div style={{fontSize:13,color:T.text}}>{v||'—'}</div>
                    </div>
                  ))}
                </div>
                {rec.narration && <div style={{fontSize:11,color:T.textMuted,fontStyle:'italic',marginTop:8}}>{rec.narration}</div>}
              </div>
            )}
          </div>
        );
      })}
      <Pagination page={recsPage} totalCount={recsTotalCount} onPage={fetchRecs}/>
    </div>
  );

  const renderPending = () => {
    const sampling   = pendingIssues.filter(i=>i.is_sampling);
    const production = pendingIssues.filter(i=>!i.is_sampling);
    return (
      <div>
        {pendingLoading ? (
          <div style={{padding:50,textAlign:'center',color:T.textMuted}}>Checking pending lots…</div>
        ) : pendingIssues.length === 0 ? (
          <div style={{padding:50,textAlign:'center',color:T.green,fontWeight:700,
            background:T.surface,border:`1px solid ${T.border}`,borderRadius:12}}>
            ✓ All issued fabric has been received back. Nothing pending!
          </div>
        ) : (
          <>
            {sampling.length > 0 && (
              <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden',marginBottom:16}}>
                <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,background:T.goldLight,
                  display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontWeight:700,fontSize:13,color:T.gold}}>Sampling — Urgent Followup ({sampling.length})</span>
                  <Badge label="Risk of misplacement — get sampled fast!" color={T.red}/>
                </div>
                {sampling.map(iss => {
                  const days = daysSince(iss.voucher_date);
                  return (
                    <div key={iss.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',
                      borderBottom:`1px solid ${T.border}`,borderLeft:`4px solid ${T.gold}`,background:'#fff'}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:13,fontFamily:"'DM Mono',monospace"}}>{iss.lot_no}</div>
                        <div style={{fontSize:11,color:T.textMuted}}>{iss.mill_name} · {fmtDate(iss.voucher_date)}</div>
                        {iss.purpose_note && <div style={{fontSize:11,color:T.orange,marginTop:2}}>{iss.purpose_note}</div>}
                      </div>
                      <div style={{fontSize:13,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmtMtr(iss.qty_mtrs)}</div>
                      <AlertBadge days={days} isSampling={true}/>
                      <div style={{fontSize:11,color:T.red,fontWeight:700}}>⚠ Make Issue + REC in Tally</div>
                    </div>
                  );
                })}
              </div>
            )}
            {production.length > 0 && (
              <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,background:T.tealLight}}>
                  <span style={{fontWeight:700,fontSize:13,color:T.teal}}>Production — Pending at Mill ({production.length})</span>
                </div>
                {production.map(iss => {
                  const days = daysSince(iss.voucher_date);
                  return (
                    <div key={iss.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',
                      borderBottom:`1px solid ${T.border}`,borderLeft:`4px solid ${T.teal}`,background:'#fff'}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:13,fontFamily:"'DM Mono',monospace"}}>{iss.lot_no}</div>
                        <div style={{fontSize:11,color:T.textMuted}}>
                          {iss.mill_name} · {fmtDate(iss.voucher_date)}{iss.process_type?` · ${iss.process_type}`:''}
                        </div>
                      </div>
                      <div style={{fontSize:13,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmtMtr(iss.qty_mtrs)}</div>
                      <AlertBadge days={days} isSampling={false}/>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderRecon = () => (
    <div>
      {reconLoading ? (
        <div style={{padding:50,textAlign:'center',color:T.textMuted}}>Loading reconciliation…</div>
      ) : (
        <div>
          <div style={{background:T.blueLight,border:`1px solid ${T.blue}44`,borderRadius:8,
            padding:'10px 14px',marginBottom:16,fontSize:12,color:T.blue}}>
            For each Jobwork Bill, we sum all REC FROM MILL job costs linked via GP Number. If sum does not match
            bill gross amount, it is flagged as Mismatch. If no REC entries found, flagged as Missing REC.
          </div>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
            {reconData.length===0 ? (
              <div style={{padding:50,textAlign:'center',color:T.textMuted}}>No jobwork expense entries found</div>
            ) : reconData.map(jw => {
              const status = jw.recon_status||'pending';
              const statusColor = status==='matched'?T.green:status==='mismatch'?T.red:status==='missing_rec'?T.orange:T.textMuted;
              const statusLabel = status==='matched'?'Matched':status==='mismatch'?'Mismatch':status==='missing_rec'?'Missing REC':'Pending';
              return (
                <div key={jw.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',
                  borderBottom:`1px solid ${T.border}`,borderLeft:`4px solid ${statusColor}`,background:'#fff'}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,color:T.text}}>{jw.party_name}</div>
                    <div style={{fontSize:11,color:T.textMuted}}>
                      {jw.supplier_invoice_no} · {fmtDate(jw.voucher_date)} · GP: {jw.gp_number||'—'}
                    </div>
                    {jw.recon_note && <div style={{fontSize:11,color:T.orange,marginTop:2}}>{jw.recon_note}</div>}
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmt(jw.expense_amount)}</div>
                    <div style={{fontSize:10,color:T.textMuted}}>JW Bill Gross</div>
                  </div>
                  {jw.sum_rec_job_cost>0 && (
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontSize:13,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmt(jw.sum_rec_job_cost)}</div>
                      <div style={{fontSize:10,color:T.textMuted}}>REC Sum</div>
                    </div>
                  )}
                  <Badge label={statusLabel} color={statusColor}/>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const TABS = [
    {key:'issues',  label:'Issue to Mill',  count:issuesTotalCount,                             color:T.teal},
    {key:'rec',     label:'REC FROM MILL',  count:recsTotalCount,                               color:T.blue},
    {key:'pending', label:'Pending at Mill',count:pendingIssues.length,                         color:T.orange},
    {key:'recon',   label:'Reconciliation', count:reconData.filter(r=>r.recon_status!=='matched').length, color:T.red},
  ];

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh',padding:'20px 24px'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,color:T.text,margin:0}}>
            Process Issues &amp; Mill Tracking
          </h1>
          <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>
            Issue to Mill · REC FROM MILL · Pending Followup · Reconciliation
          </div>
        </div>
        <Badge label={`${issuesTotalCount.toLocaleString()} issues`} color={T.teal} bg={T.tealLight}/>
      </div>

      {/* FY Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:4,width:'fit-content'}}>
        {FY_YEARS.map(yr => (
          <button key={yr} onClick={()=>setFY(yr)}
            style={{padding:'5px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,transition:'all .15s',
              background:activeFY===yr?T.teal:'transparent',color:activeFY===yr?'#fff':T.textMuted}}>
            FY {yr.toString().slice(2)}-{(yr+1).toString().slice(2)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:12,marginBottom:20}}>
        <SummaryCard label="Total Issued"     value={fmtMtr(summary.totalIssued)}   color={T.teal}/>
        <SummaryCard label="Total Received"   value={fmtMtr(summary.totalRecdMtrs)} sub={`${summary.totalRecCount} entries`} color={T.blue}/>
        <SummaryCard label="Total Shortage"   value={fmtMtr(summary.totalShortage)} color={T.orange}/>
        <SummaryCard label="Sampling Issues"  value={summary.samplingCount||0}      sub="faster followup" color={T.gold}/>
        <SummaryCard label="Production Issues"value={summary.productionCount||0}    color={T.teal}/>
        <SummaryCard label="Pending at Mill"  value={pendingIssues.length||'—'}     sub="no REC found"    color={T.red}/>
      </div>

      {/* Filters */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 18px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div style={{flex:'1 1 180px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>Search</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Lot no, mill, item…"
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,color:T.text,background:'#fff',outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{flex:'1 1 150px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>Mill</div>
          <input value={millFilter} onChange={e=>setMillFilter(e.target.value)} placeholder="Filter mill…"
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,color:T.text,background:'#fff',outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{flex:'0 1 140px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>Type</div>
          <select value={samplingFilter} onChange={e=>setSamplingFilter(e.target.value)}
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,color:T.text,background:'#fff',outline:'none'}}>
            <option value="all">All Types</option>
            <option value="sampling">Sampling Only</option>
            <option value="production">Production Only</option>
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
        <button onClick={applyFilters}
          style={{padding:'8px 18px',background:T.teal,color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',height:34}}>
          Apply
        </button>
        <button onClick={resetFilters}
          style={{padding:'8px 14px',background:'transparent',color:T.textMuted,border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,cursor:'pointer',height:34}}>
          Reset
        </button>
      </div>

      {/* Content Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16,background:T.surface,border:`1px solid ${T.border}`,
        borderRadius:8,padding:4,width:'fit-content'}}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={()=>setActiveTab(tab.key)}
            style={{padding:'6px 14px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,
              transition:'all .15s',display:'flex',alignItems:'center',gap:4,
              background:activeTab===tab.key?tab.color:'transparent',
              color:activeTab===tab.key?'#fff':T.textMuted}}>
            {tab.label}
            <PendingDot count={tab.count} color={activeTab===tab.key?'rgba(255,255,255,.4)':tab.color}/>
          </button>
        ))}
      </div>

      {activeTab==='issues'  && renderIssues()}
      {activeTab==='rec'     && renderRecs()}
      {activeTab==='pending' && renderPending()}
      {activeTab==='recon'   && renderRecon()}

    </div>
  );
}
