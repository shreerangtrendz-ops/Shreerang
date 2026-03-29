import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

const T = {
  teal:'#2BA898', tealLight:'#EEF8F6', navy:'#0B2E2B',
  green:'#1E9E5A', greenLight:'#E8FFF4',
  red:'#E74C3C', redLight:'#FFF5F5',
  orange:'#E67E22', amber:'#B7791F', amberLight:'#FFFBEB',
  blue:'#2468C8', blueLight:'#EBF8FF',
  gold:'#E8A800', goldLight:'#FFF8E8',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95',
};

const fmt = n => '\u20B9'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtN = (n,dec=1) => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:dec});

const PAGE_SIZE = 50;

function getCurrentFY() {
  const now = new Date();
  const yr = now.getMonth()>=3?now.getFullYear():now.getFullYear()-1;
  return {from:`${yr}-04-01`,to:`${yr+1}-03-31`};
}

export default function MillPerformancePage() {
  const navigate = useNavigate();
  const fy = getCurrentFY();

  const [loading, setLoading] = useState(true);
  const [mills, setMills] = useState([]);
  const [summary, setSummary] = useState({totalIssued:0,totalShortage:0,avgShrink:0,totalChallans:0,totalMills:0});
  const [challans, setChallans] = useState([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [processFilter, setProcessFilter] = useState('');
  const [sortBy, setSortBy] = useState('shortage_pct');

  const load = useCallback(async () => {
    setLoading(true);
    const [perf, detail] = await Promise.all([
      supabase.from('process_issues').select('worker_name,metres_issued,shortage_mtrs,shortage_pct,process_type,mill_godown').gte('issue_date',fy.from).lte('issue_date',fy.to).not('worker_name','is',null).limit(5000),
      supabase.from('process_issues').select('*',{count:'exact'}).gte('issue_date',fy.from).lte('issue_date',fy.to).order('issue_date',{ascending:false}).range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1),
    ]);

    // Aggregate by mill
    const millMap = {};
    (perf.data||[]).forEach(p=>{
      const k=p.worker_name;
      if (!millMap[k]) millMap[k]={name:k,challans:0,metres_issued:0,shortage_mtrs:0,shrink_values:[],process_types:new Set(),godowns:new Set()};
      millMap[k].challans++;
      millMap[k].metres_issued+=Number(p.metres_issued||0);
      millMap[k].shortage_mtrs+=Number(p.shortage_mtrs||0);
      if (Number(p.shortage_pct||0)>0&&Number(p.shortage_pct||0)<50) millMap[k].shrink_values.push(Number(p.shortage_pct));
      if (p.process_type) millMap[k].process_types.add(p.process_type);
      if (p.mill_godown) millMap[k].godowns.add(p.mill_godown);
    });

    const millArr = Object.values(millMap).map(m=>({
      ...m,
      avg_shrinkage: m.shrink_values.length?m.shrink_values.reduce((a,b)=>a+b,0)/m.shrink_values.length:0,
      process_types: [...m.process_types].join(', '),
      godowns: [...m.godowns].join(', '),
    })).sort((a,b)=>b.avg_shrinkage-a.avg_shrinkage);

    const all = perf.data||[];
    const valid = all.filter(p=>Number(p.shortage_pct||0)>0&&Number(p.shortage_pct||0)<50);
    setSummary({
      totalIssued: all.reduce((s,p)=>s+Number(p.metres_issued||0),0),
      totalShortage: all.reduce((s,p)=>s+Number(p.shortage_mtrs||0),0),
      avgShrink: valid.length?valid.reduce((s,p)=>s+Number(p.shortage_pct),0)/valid.length:0,
      totalChallans: detail.count||0,
      totalMills: millArr.length,
    });
    setMills(millArr);
    setChallans(detail.data||[]);
    setTotalCount(detail.count||0);
    setLoading(false);
  }, [fy.from, fy.to, page]);

  useEffect(()=>{ load(); },[load]);

  const maxShrink = Math.max(...mills.map(m=>m.avg_shrinkage),0.1);

  const filteredMills = mills.filter(m=>
    (!search||m.name?.toLowerCase().includes(search.toLowerCase())) &&
    (!processFilter||m.process_types?.includes(processFilter))
  );

  const BTN = (extra={}) => ({padding:'8px 14px',borderRadius:8,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',...extra});
  const INP = {padding:'8px 12px',borderRadius:8,border:`1px solid ${T.border}`,fontSize:13,background:'#fff'};

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh',padding:'20px 24px'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.text,margin:0}}>🏭 Mill Performance</h1>
          <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>Shrinkage, processing stats · FY {fy.from.slice(0,4)}-{fy.to.slice(2,4)}</div>
        </div>
        <button onClick={()=>navigate('/admin/accounting/job-work-bills')} style={BTN({background:T.teal,color:'#fff'})}>View Job Work Bills</button>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60,color:T.textMuted}}>Loading mill data…</div>
      ) : <>

        {/* Summary KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
          {[
            {l:'Total Mills',v:summary.totalMills,c:T.teal,icon:'🏭'},
            {l:'Total Challans',v:summary.totalChallans.toLocaleString(),c:T.blue,icon:'📋'},
            {l:'Metres Issued',v:fmtN(summary.totalIssued,0)+' m',c:T.navy,icon:'🧵'},
            {l:'Total Shortage',v:fmtN(summary.totalShortage,0)+' m',c:T.red,icon:'📉'},
            {l:'Avg Shrinkage',v:summary.avgShrink.toFixed(2)+'%',c:summary.avgShrink>5?T.red:T.green,icon:'⚖️'},
          ].map((k,i)=>(
            <div key={i} style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:20,marginBottom:6}}>{k.icon}</div>
              <div style={{fontSize:10,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:.4,marginBottom:4}}>{k.l}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:k.c}}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:12,padding:'12px 16px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search mill name…" style={{...INP,flex:'1 1 180px'}}/>
          <select value={processFilter} onChange={e=>setProcessFilter(e.target.value)} style={INP}>
            <option value="">All Process Types</option>
            <option value="issued">Issued</option>
            <option value="received">Received</option>
          </select>
          <button onClick={()=>{setSearch('');setProcessFilter('');}} style={BTN({background:T.bg,color:T.textMuted,border:`1px solid ${T.border}`})}>Reset</button>
        </div>

        {/* Mill Scorecard */}
        <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20,marginBottom:20}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.text,marginBottom:4}}>Mill Shrinkage Scorecard</div>
          <div style={{fontSize:12,color:T.textMuted,marginBottom:16}}>Sorted by average shrinkage % · Lower is better</div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
            {filteredMills.map((m,i)=>{
              const shrink=m.avg_shrinkage;
              const color=shrink>7?T.red:shrink>4?T.orange:T.green;
              const bg=shrink>7?T.redLight:shrink>4?T.amberLight:T.greenLight;
              return (
                <div key={i} style={{border:`1px solid ${T.border}`,borderRadius:10,padding:'14px 16px',background:T.bg}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:2}}>{m.name}</div>
                      <div style={{fontSize:10.5,color:T.textMuted}}>{m.challans} challans · {fmtN(m.metres_issued,0)} m issued</div>
                    </div>
                    <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:bg,color}}>{shrink.toFixed(1)}%</span>
                  </div>
                  <div style={{marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:10.5,color:T.textMuted,marginBottom:3}}>
                      <span>Shrinkage</span><span>{fmtN(m.shortage_mtrs,0)} m shortage</span>
                    </div>
                    <div style={{height:6,background:T.border,borderRadius:3}}>
                      <div style={{width:((shrink/maxShrink)*100)+'%',height:6,background:color,borderRadius:3,transition:'width .5s'}}/>
                    </div>
                  </div>
                  {m.process_types && <div style={{fontSize:10,color:T.textMuted}}>📋 {m.process_types}</div>}
                  {m.godowns && <div style={{fontSize:10,color:T.textMuted,marginTop:2}}>📍 {m.godowns}</div>}
                </div>
              );
            })}
          </div>

          <div style={{marginTop:16,padding:'10px 14px',background:T.tealLight,borderRadius:8,fontSize:11.5,color:T.navy}}>
            💡 <strong>Best performer:</strong> {filteredMills[filteredMills.length-1]?.name||'N/A'} at {filteredMills[filteredMills.length-1]?.avg_shrinkage.toFixed(2)||0}% shrinkage · 
            <strong> Worst:</strong> {filteredMills[0]?.name||'N/A'} at {filteredMills[0]?.avg_shrinkage.toFixed(2)||0}%
          </div>
        </div>

        {/* Challan table */}
        <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:T.text}}>
              Challan Register <span style={{fontSize:12,color:T.textMuted,fontFamily:"'DM Sans',sans-serif"}}>({totalCount.toLocaleString()} total)</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>page>0&&setPage(p=>p-1)} disabled={page===0} style={BTN({background:page===0?T.bg:T.greenLight,color:page===0?T.textMuted:T.green})}>‹ Prev</button>
              <span style={{padding:'8px 14px',background:T.teal,color:'#fff',borderRadius:8,fontSize:12,fontWeight:700}}>{page+1}/{Math.ceil(totalCount/PAGE_SIZE)}</span>
              <button onClick={()=>setPage(p=>p+1)} disabled={(page+1)*PAGE_SIZE>=totalCount} style={BTN({background:(page+1)*PAGE_SIZE>=totalCount?T.bg:T.greenLight,color:(page+1)*PAGE_SIZE>=totalCount?T.textMuted:T.green})}>Next ›</button>
            </div>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
              <thead>
                <tr style={{background:T.bg}}>
                  {['Challan No','Date','Mill / Worker','Metres Issued','Shortage','Shrink%','Process','Lot No','Design No'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:['Metres Issued','Shortage','Shrink%'].includes(h)?'right':'left',fontWeight:700,fontSize:10,color:T.textMuted,borderBottom:`1px solid ${T.border}`,textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {challans.map((c,i)=>{
                  const shrink=Number(c.shortage_pct||0);
                  const sc=shrink>7?T.red:shrink>4?T.orange:shrink>0?T.green:T.textMuted;
                  return (
                    <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                      <td style={{padding:'9px 12px',fontWeight:700,color:T.teal,whiteSpace:'nowrap'}}>{c.challan_no}</td>
                      <td style={{padding:'9px 12px',color:T.textMuted,whiteSpace:'nowrap'}}>{c.issue_date}</td>
                      <td style={{padding:'9px 12px',fontWeight:500,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.worker_name||'—'}</td>
                      <td style={{padding:'9px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace"}}>{fmtN(c.metres_issued)}</td>
                      <td style={{padding:'9px 12px',textAlign:'right',color:T.red,fontFamily:"'DM Mono',monospace"}}>{fmtN(c.shortage_mtrs)}</td>
                      <td style={{padding:'9px 12px',textAlign:'right'}}>
                        {shrink>0?<span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:700,background:sc+'22',color:sc}}>{shrink.toFixed(1)}%</span>:'—'}
                      </td>
                      <td style={{padding:'9px 12px',color:T.textMuted,fontSize:11}}>{c.process_type||'—'}</td>
                      <td style={{padding:'9px 12px',color:T.textMuted,fontSize:11}}>{c.lot_no||'—'}</td>
                      <td style={{padding:'9px 12px',color:T.blue,fontSize:11,fontWeight:600}}>{c.design_no||c.finished_design_no||'—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>}
    </div>
  );
}
