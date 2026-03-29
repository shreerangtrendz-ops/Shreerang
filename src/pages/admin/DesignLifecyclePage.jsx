import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

const T = {
  teal:'#2BA898', tealLight:'#EEF8F6', navy:'#0B2E2B',
  green:'#1E9E5A', greenLight:'#E8FFF4',
  red:'#E74C3C', redLight:'#FFF5F5',
  orange:'#E67E22', amberLight:'#FFFBEB',
  blue:'#2468C8', blueLight:'#EBF8FF',
  gold:'#E8A800', goldLight:'#FFF8E8',
  purple:'#9B59B6', purpleLight:'#F5EFF9',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95',
};

const fmtN = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:1});
const fmtAmt = n => { const v=Number(n||0); return v>=10000000?`\u20B9${(v/10000000).toFixed(2)}Cr`:v>=100000?`\u20B9${(v/100000).toFixed(1)}L`:`\u20B9${Math.round(v).toLocaleString('en-IN')}`; };

function StageChip({label, count, color, onClick, active}) {
  return (
    <button onClick={onClick} style={{
      padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600,
      border:`2px solid ${active?color:T.border}`,
      background: active ? color+'15' : T.surface,
      color: active ? color : T.textMuted, cursor:'pointer'
    }}>{label} {count != null && <span style={{background:color+'22',padding:'1px 7px',borderRadius:20,marginLeft:4}}>{count}</span>}</button>
  );
}

function Stage({icon, label, value, unit, color, done, active}) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,minWidth:90}}>
      <div style={{
        width:44,height:44,borderRadius:'50%',
        background: done ? color : active ? color+'22' : T.bg,
        border:`2px solid ${done||active?color:T.border}`,
        display:'flex',alignItems:'center',justifyContent:'center',
        fontSize:20, transition:'all .3s'
      }}>{icon}</div>
      <div style={{fontSize:11,fontWeight:600,color:done?color:T.textMuted,textAlign:'center'}}>{label}</div>
      {value != null && <div style={{fontSize:13,fontWeight:700,color:done?T.text:T.textMuted}}>{value} {unit}</div>}
    </div>
  );
}

function Arrow({done}) {
  return <div style={{flex:1,height:2,background:done?T.teal:T.border,marginTop:-22,alignSelf:'center',minWidth:12,maxWidth:32}}/>;
}

export default function DesignLifecyclePage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [designs, setDesigns] = useState([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => { loadDesigns(); }, []);

  const loadDesigns = useCallback(async () => {
    setLoading(true);
    // Get all process_issues to build design list
    const { data: issues } = await supabase
      .from('process_issues')
      .select('challan_no,issue_date,job_worker_name,metres_issued,shortage_pct,shortage_mtrs,lot_no,narration,status,process_type,finished_design_no,mill_godown,party_ch_no,worker_name,our_godown')
      .order('issue_date', { ascending: false })
      .limit(1000);

    // Get purchase bills
    const { data: purchases } = await supabase
      .from('purchase_bills')
      .select('bill_number,bill_date,supplier_name,total_amount,quantity_mtrs,narration,line_items')
      .order('bill_date', { ascending: false })
      .limit(2000);

    // Get sales bills  
    const { data: sales } = await supabase
      .from('sales_bills')
      .select('bill_number,bill_date,customer_name,total_amount,quantity_mtrs,narration,broker_name,comm_amount,sales_ledger')
      .order('bill_date', { ascending: false })
      .limit(2000);

    // Build design map from narration/lot_no/finished_design_no
    const designMap = {};

    (issues||[]).forEach(iss => {
      // Extract design number from narration or finished_design_no
      const designRefs = [];
      if (iss.finished_design_no) designRefs.push(iss.finished_design_no);
      if (iss.lot_no) designRefs.push(iss.lot_no);
      // From narration — look for "D No." or design number patterns
      const narr = iss.narration || '';
      const dnoMatch = narr.match(/D\s*No\.?\s*([A-Z0-9]+)/i) || narr.match(/<([^>]+)>/);
      if (dnoMatch) designRefs.push(dnoMatch[1]);

      const key = designRefs[0] || iss.challan_no;
      if (!designMap[key]) {
        designMap[key] = {
          design_no: designRefs[0] || '',
          lot_no: iss.lot_no || '',
          narration: narr,
          issues: [],
          receives: [],
          purchase_bills: [],
          sales_bills: [],
          total_issued: 0,
          total_received: 0,
          total_short: 0,
        };
      }
      const d = designMap[key];

      if (iss.status === 'received' || iss.status === 'rec_from_mill') {
        d.receives.push(iss);
        d.total_received += iss.metres_issued || 0;
        if (iss.shortage_mtrs) d.total_short += iss.shortage_mtrs;
      } else {
        d.issues.push(iss);
        d.total_issued += iss.metres_issued || 0;
      }
    });

    // Link purchase bills by narration/lot_no match
    (purchases||[]).forEach(pur => {
      const narr = (pur.narration||'').toLowerCase();
      const billRef = (pur.bill_number||'').toLowerCase();
      Object.keys(designMap).forEach(key => {
        const d = designMap[key];
        const lot = (d.lot_no||'').toLowerCase();
        const dno = (d.design_no||'').toLowerCase();
        if ((lot && narr.includes(lot)) || (dno && narr.includes(dno)) || (dno && billRef.includes(dno))) {
          if (!d.purchase_bills.find(p => p.bill_number === pur.bill_number)) {
            d.purchase_bills.push(pur);
          }
        }
      });
    });

    // Link sales by narration/design pattern
    (sales||[]).forEach(sal => {
      const narr = (sal.narration||'').toLowerCase();
      Object.keys(designMap).forEach(key => {
        const d = designMap[key];
        const lot = (d.lot_no||'').toLowerCase();
        const dno = (d.design_no||'').toLowerCase();
        if ((lot && narr.includes(lot)) || (dno && narr.includes(dno))) {
          if (!d.sales_bills.find(s => s.bill_number === sal.bill_number)) {
            d.sales_bills.push(sal);
          }
        }
      });
    });

    // Convert to array with stage info
    const list = Object.entries(designMap).map(([key, d]) => {
      const hasPurchase = d.purchase_bills.length > 0;
      const hasIssue = d.issues.length > 0;
      const hasReceived = d.receives.length > 0;
      const hasSales = d.sales_bills.length > 0;

      const stage = hasSales ? 'sold' : hasReceived ? 'received' : hasIssue ? 'at_mill' : hasPurchase ? 'purchased' : 'issue_only';
      const avgShrink = d.total_issued > 0 && d.total_short > 0
        ? ((d.total_short / d.total_issued) * 100).toFixed(1) : null;

      const totalSalesAmt = d.sales_bills.reduce((a,s) => a+(s.total_amount||0), 0);
      const totalPurchaseAmt = d.purchase_bills.reduce((a,p) => a+(p.total_amount||0), 0);

      return {
        key, ...d, stage, hasPurchase, hasIssue, hasReceived, hasSales,
        avgShrink, totalSalesAmt, totalPurchaseAmt,
        lastDate: d.issues[0]?.issue_date || d.purchase_bills[0]?.bill_date || '',
        millName: d.issues[0]?.job_worker_name || d.issues[0]?.worker_name || '',
      };
    }).sort((a,b) => b.lastDate.localeCompare(a.lastDate));

    setDesigns(list);
    setLoading(false);
  }, []);

  const stageInfo = {
    all: { label:'All Designs', color:T.teal },
    purchased: { label:'Purchased Only', color:T.blue },
    at_mill: { label:'At Mill', color:T.orange },
    received: { label:'Received', color:T.gold },
    sold: { label:'Sold', color:T.green },
  };

  const stageCounts = designs.reduce((acc,d) => {
    acc[d.stage] = (acc[d.stage]||0)+1;
    return acc;
  }, {});

  const filtered = designs.filter(d => {
    if (stageFilter !== 'all' && d.stage !== stageFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (d.design_no||'').toLowerCase().includes(s)
        || (d.lot_no||'').toLowerCase().includes(s)
        || (d.narration||'').toLowerCase().includes(s)
        || (d.millName||'').toLowerCase().includes(s);
    }
    return true;
  });

  const selectDesign = (d) => { setSelected(d); };

  return (
    <div style={{fontFamily:'system-ui,sans-serif',background:T.bg,minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{background:T.navy,padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>nav(-1)} style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',borderRadius:8,padding:'6px 12px',cursor:'pointer',fontSize:13}}>← Back</button>
          <div>
            <div style={{color:'#fff',fontSize:18,fontWeight:700}}>🔄 Design Lifecycle Tracker</div>
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:12,marginTop:2}}>
              Purchase → Issue to Mill → REC FROM MILL → Sales · {designs.length} designs tracked
            </div>
          </div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search design, lot, mill..."
          style={{padding:'7px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.1)',color:'#fff',fontSize:13,width:220,outline:'none'}} />
      </div>

      {/* Stage filters */}
      <div style={{padding:'12px 20px',background:T.surface,borderBottom:`1px solid ${T.border}`,display:'flex',gap:8,flexWrap:'wrap',flexShrink:0}}>
        {Object.entries(stageInfo).map(([key,info]) => (
          <StageChip key={key} label={info.label} count={key==='all'?designs.length:stageCounts[key]||0}
            color={info.color} active={stageFilter===key} onClick={()=>setStageFilter(key)} />
        ))}
      </div>

      {/* Main content */}
      <div style={{display:'grid',gridTemplateColumns:selected?'1fr 480px':'1fr',flex:1,gap:0,minHeight:0,overflow:'hidden'}}>

        {/* Design list */}
        <div style={{overflowY:'auto',padding:16}}>
          {loading ? (
            <div style={{textAlign:'center',padding:60,color:T.textMuted}}>Loading design lifecycle data...</div>
          ) : filtered.length === 0 ? (
            <div style={{textAlign:'center',padding:60,color:T.textMuted}}>No designs found for this filter</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {filtered.map(d => {
                const stageColor = d.stage==='sold'?T.green:d.stage==='received'?T.gold:d.stage==='at_mill'?T.orange:d.stage==='purchased'?T.blue:T.teal;
                const isSelected = selected?.key === d.key;
                return (
                  <div key={d.key} onClick={()=>selectDesign(d)} style={{
                    background:T.surface, borderRadius:10,
                    border:`2px solid ${isSelected?stageColor:T.border}`,
                    padding:'12px 16px', cursor:'pointer',
                    transition:'border-color .15s',
                  }}>
                    {/* Top row */}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          {d.design_no && <span style={{fontSize:14,fontWeight:700,color:T.navy,fontFamily:'monospace'}}>{d.design_no}</span>}
                          {d.lot_no && d.lot_no !== d.design_no && <span style={{fontSize:12,color:T.textMuted}}>Lot: {d.lot_no}</span>}
                          <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:stageColor+'18',color:stageColor,textTransform:'uppercase',letterSpacing:'0.05em'}}>{d.stage.replace('_',' ')}</span>
                        </div>
                        <div style={{fontSize:12,color:T.textMuted,marginTop:3,maxWidth:500}}>
                          {d.narration?.substring(0,80)} {d.millName && <span>· Mill: {d.millName}</span>}
                        </div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0,marginLeft:12}}>
                        {d.totalSalesAmt > 0 && <div style={{fontWeight:700,color:T.green,fontSize:14}}>{fmtAmt(d.totalSalesAmt)}</div>}
                        {d.lastDate && <div style={{fontSize:11,color:T.textMuted}}>{d.lastDate}</div>}
                      </div>
                    </div>

                    {/* Pipeline stages */}
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <Stage icon="🛒" label="Purchase" value={d.purchase_bills.length>0?fmtAmt(d.totalPurchaseAmt):null} color={T.blue} done={d.hasPurchase} active={!d.hasPurchase} />
                      <Arrow done={d.hasPurchase&&d.hasIssue} />
                      <Stage icon="🏭" label="Issue to Mill" value={d.total_issued>0?fmtN(d.total_issued):null} unit={d.total_issued>0?"m":null} color={T.orange} done={d.hasIssue} active={d.hasPurchase&&!d.hasIssue} />
                      <Arrow done={d.hasIssue&&d.hasReceived} />
                      <Stage icon="📦" label="REC FROM MILL" value={d.total_received>0?fmtN(d.total_received):null} unit={d.total_received>0?"m":null} color={T.gold} done={d.hasReceived} active={d.hasIssue&&!d.hasReceived} />
                      <Arrow done={d.hasReceived&&d.hasSales} />
                      <Stage icon="✅" label="Sales" value={d.sales_bills.length>0?d.sales_bills.length:null} unit={d.sales_bills.length>0?"bills":null} color={T.green} done={d.hasSales} active={d.hasReceived&&!d.hasSales} />
                    </div>

                    {/* Shrinkage alert */}
                    {d.avgShrink && parseFloat(d.avgShrink) > 12 && (
                      <div style={{marginTop:8,padding:'4px 10px',background:T.redLight,borderRadius:6,fontSize:11,color:T.red,fontWeight:600}}>
                        ⚠ High shrinkage: {d.avgShrink}% ({fmtN(d.total_short)} m lost)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div style={{background:T.surface,borderLeft:`1px solid ${T.border}`,overflowY:'auto',padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontSize:16,fontWeight:700,color:T.navy}}>{selected.design_no || selected.lot_no || 'Design Detail'}</div>
              <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:T.textMuted}}>✕</button>
            </div>

            {/* Purchase Bills */}
            {selected.purchase_bills.length > 0 && (
              <section style={{marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:600,color:T.blue,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>🛒 Purchase Bills ({selected.purchase_bills.length})</div>
                {selected.purchase_bills.map((p,i) => (
                  <div key={i} style={{background:T.blueLight,borderRadius:8,padding:'10px 12px',marginBottom:6}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{fontWeight:600,fontSize:13,color:T.navy,fontFamily:'monospace'}}>{p.bill_number}</span>
                      <span style={{fontWeight:700,color:T.blue,fontSize:13}}>{fmtAmt(p.total_amount)}</span>
                    </div>
                    <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>
                      {p.supplier_name} · {p.bill_date} {p.quantity_mtrs && `· ${fmtN(p.quantity_mtrs)} m`}
                    </div>
                    {p.narration && <div style={{fontSize:11,color:T.textMuted,marginTop:2,fontStyle:'italic'}}>{p.narration.substring(0,80)}</div>}
                  </div>
                ))}
              </section>
            )}

            {/* Issues to Mill */}
            {selected.issues.length > 0 && (
              <section style={{marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:600,color:T.orange,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>🏭 Issue to Mill ({selected.issues.length})</div>
                {selected.issues.map((iss,i) => (
                  <div key={i} style={{background:T.amberLight,borderRadius:8,padding:'10px 12px',marginBottom:6}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{fontWeight:600,fontSize:13,color:T.navy,fontFamily:'monospace'}}>{iss.challan_no}</span>
                      <span style={{fontWeight:700,color:T.orange,fontSize:13}}>{fmtN(iss.metres_issued)} m</span>
                    </div>
                    <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>
                      {iss.job_worker_name||iss.worker_name} · {iss.issue_date}
                      {iss.lot_no && ` · Lot: ${iss.lot_no}`}
                      {iss.our_godown && ` · From: ${iss.our_godown}`}
                      {iss.mill_godown && ` · To: ${iss.mill_godown}`}
                    </div>
                    {iss.narration && <div style={{fontSize:11,color:T.textMuted,marginTop:2,fontStyle:'italic'}}>{iss.narration.substring(0,80)}</div>}
                  </div>
                ))}
              </section>
            )}

            {/* REC FROM MILL */}
            {selected.receives.length > 0 && (
              <section style={{marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:600,color:T.gold,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>📦 REC FROM MILL ({selected.receives.length})</div>
                {selected.receives.map((r,i) => (
                  <div key={i} style={{background:T.goldLight,borderRadius:8,padding:'10px 12px',marginBottom:6}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{fontWeight:600,fontSize:13,color:T.navy,fontFamily:'monospace'}}>{r.challan_no}</span>
                      <div style={{textAlign:'right'}}>
                        <span style={{fontWeight:700,color:T.gold,fontSize:13}}>{fmtN(r.metres_issued)} m received</span>
                        {r.shortage_pct && <span style={{fontSize:11,color:r.shortage_pct>12?T.red:T.orange,marginLeft:8,fontWeight:600}}>↓{parseFloat(r.shortage_pct).toFixed(1)}% short</span>}
                      </div>
                    </div>
                    <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>
                      {r.job_worker_name||r.worker_name} · {r.issue_date}
                      {r.shortage_mtrs && ` · Lost: ${fmtN(r.shortage_mtrs)} m`}
                      {r.finished_design_no && ` · Design: ${r.finished_design_no}`}
                      {r.party_ch_no && ` · GP: ${r.party_ch_no}`}
                    </div>
                    {r.narration && <div style={{fontSize:11,color:T.textMuted,marginTop:2,fontStyle:'italic'}}>{r.narration.substring(0,80)}</div>}
                  </div>
                ))}
              </section>
            )}

            {/* Sales */}
            {selected.sales_bills.length > 0 && (
              <section style={{marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:600,color:T.green,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>✅ Sales Bills ({selected.sales_bills.length})</div>
                {selected.sales_bills.map((s,i) => (
                  <div key={i} style={{background:T.greenLight,borderRadius:8,padding:'10px 12px',marginBottom:6}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{fontWeight:600,fontSize:13,color:T.navy,fontFamily:'monospace'}}>{s.bill_number}</span>
                      <span style={{fontWeight:700,color:T.green,fontSize:13}}>{fmtAmt(s.total_amount)}</span>
                    </div>
                    <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>
                      {s.customer_name} · {s.bill_date}
                      {s.quantity_mtrs && ` · ${fmtN(s.quantity_mtrs)} m`}
                      {s.broker_name && ` · Broker: ${s.broker_name}`}
                    </div>
                    {s.narration && <div style={{fontSize:11,color:T.textMuted,marginTop:2,fontStyle:'italic'}}>{s.narration.substring(0,80)}</div>}
                  </div>
                ))}
              </section>
            )}

            {/* Summary box */}
            <div style={{background:T.tealLight,borderRadius:10,padding:14,border:`1px solid ${T.teal}40`}}>
              <div style={{fontSize:12,fontWeight:600,color:T.teal,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>Design Summary</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {[
                  {label:'Issued to Mill', val:`${fmtN(selected.total_issued)} m`, color:T.orange},
                  {label:'Received Back', val:`${fmtN(selected.total_received)} m`, color:T.gold},
                  {label:'Total Short', val:selected.total_short>0?`${fmtN(selected.total_short)} m`:'—', color:T.red},
                  {label:'Avg Shrinkage', val:selected.avgShrink?`${selected.avgShrink}%`:'—', color:selected.avgShrink&&parseFloat(selected.avgShrink)>12?T.red:T.green},
                  {label:'Purchase Cost', val:selected.totalPurchaseAmt>0?fmtAmt(selected.totalPurchaseAmt):'—', color:T.blue},
                  {label:'Sales Revenue', val:selected.totalSalesAmt>0?fmtAmt(selected.totalSalesAmt):'—', color:T.green},
                ].map((k,i) => (
                  <div key={i} style={{background:T.surface,borderRadius:7,padding:'8px 10px'}}>
                    <div style={{fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:2}}>{k.label}</div>
                    <div style={{fontSize:14,fontWeight:700,color:k.color}}>{k.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
