import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const T = { navy:'#0B2E2B', teal:'#2BA898', gold:'#E8A800', bg:'#F4FBFA' };
const fmt = n => '₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtM = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:1})+' m';

export default function DesignLifecyclePage() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { loadDesigns(); }, []);

  async function loadDesigns() {
    setLoading(true);
    const { data, error } = await supabase
      .from('design_lifecycle')
      .select('*')
      .order('purchase_date', { ascending: false })
      .limit(500);
    if (error) console.error('design_lifecycle error:', error);
    setDesigns(data || []);
    setLoading(false);
  }

  const filtered = designs.filter(d => {
    if (stageFilter && d.stage !== stageFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (d.lot_no||'').toLowerCase().includes(s) ||
      (d.supplier_name||'').toLowerCase().includes(s) ||
      (d.gp_bill_no||'').toLowerCase().includes(s) ||
      JSON.stringify(d.design_nos||[]).toLowerCase().includes(s) ||
      JSON.stringify(d.issue_records||[]).toLowerCase().includes(s);
  });

  const stages = [
    { key:'', label:'All Designs', count: designs.length },
    { key:'purchased_only', label:'Purchased Only', count: designs.filter(d=>d.stage==='purchased_only').length },
    { key:'at_mill', label:'At Mill', count: designs.filter(d=>d.stage==='at_mill').length },
    { key:'received', label:'Received', count: designs.filter(d=>d.stage==='received').length },
    { key:'sold', label:'Sold', count: designs.filter(d=>d.stage==='sold').length },
  ];

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh'}}>
      <div style={{background:'linear-gradient(135deg,#0B2E2B,#143F3C)',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div>
          <button onClick={()=>window.history.back()} style={{background:'rgba(255,255,255,.1)',border:'none',color:'#fff',padding:'6px 14px',borderRadius:8,cursor:'pointer',fontSize:12,marginBottom:8}}>← Back</button>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:19,fontWeight:700,color:'#fff'}}>🔗 Design Lifecycle Tracker</div>
          <p style={{fontSize:11,color:'#6A9B95',margin:0}}>Purchase → Issue to Mill → REC FROM MILL → Sales · {designs.length} designs tracked</p>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search design, lot, mill..." style={{padding:'8px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:13,width:250}} />
      </div>

      <div style={{padding:'16px 24px'}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
          {stages.map(s=>(
            <button key={s.key} onClick={()=>setStageFilter(s.key)} style={{
              padding:'6px 16px',borderRadius:20,border:'1px solid '+(stageFilter===s.key?T.teal:'#d0d0d0'),
              background:stageFilter===s.key?T.teal:'#fff',color:stageFilter===s.key?'#fff':T.navy,
              fontSize:12,fontWeight:600,cursor:'pointer'
            }}>{s.label} {s.count}</button>
          ))}
        </div>

        {loading ? <div style={{textAlign:'center',padding:40,color:'#6A9B95'}}>Loading design lifecycle data...</div> :
        filtered.length === 0 ? <div style={{textAlign:'center',padding:40,color:'#6A9B95'}}>No designs found.</div> :
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {filtered.map((d,i) => {
            const isOpen = expanded === i;
            const shrink = d.avg_shrink_pct ? parseFloat(d.avg_shrink_pct) : null;
            return (
              <div key={i} onClick={()=>setExpanded(isOpen?null:i)} style={{background:'#fff',borderRadius:10,padding:'12px 16px',boxShadow:'0 1px 4px rgba(0,0,0,.06)',cursor:'pointer',border:'1px solid '+(isOpen?T.teal:'rgba(43,168,152,.12)'),transition:'all .2s'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <span style={{padding:'3px 10px',borderRadius:12,fontSize:10,fontWeight:700,
                      background:d.stage==='sold'?'#E8FFF4':d.stage==='received'?'#F0F4FF':d.stage==='at_mill'?'#FFF8E8':'#F4F4F4',
                      color:d.stage==='sold'?'#1E9E5A':d.stage==='received'?'#2468C8':d.stage==='at_mill'?'#D4920A':'#666'
                    }}>{d.stage?.replace('_',' ').toUpperCase()}</span>
                    <span style={{fontWeight:700,color:T.navy}}>GP {d.gp_bill_no}</span>
                    <span style={{color:'#6A9B95',fontSize:12}}>Lot: {d.lot_no || '—'}</span>
                  </div>
                  <div style={{display:'flex',gap:16,fontSize:12}}>
                    <span>{d.supplier_name}</span>
                    <span style={{color:T.gold,fontWeight:700}}>{fmt(d.purchase_amount)}</span>
                    <span>{fmtM(d.purchased_mtrs)}</span>
                    {shrink !== null && <span style={{color:shrink>10?'#ef4444':shrink>5?'#D4920A':'#1E9E5A',fontWeight:700}}>Shrink: {shrink.toFixed(1)}%</span>}
                  </div>
                </div>

                {isOpen && (
                  <div style={{marginTop:12,borderTop:'1px solid #eee',paddingTop:12}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,fontSize:12}}>
                      <div><strong>Purchase:</strong> {d.purchase_date} · {d.supplier_name} · {fmt(d.purchase_amount)} · {fmtM(d.purchased_mtrs)}</div>
                      <div><strong>Issued:</strong> {fmtM(d.total_issued)} to {(d.issue_records||[]).length} mill(s)</div>
                      <div><strong>Received:</strong> {d.total_received ? fmtM(d.total_received) : '—'} {d.total_short ? `(Short: ${fmtM(d.total_short)})` : ''}</div>
                    </div>
                    {(d.design_nos||[]).length > 0 && <div style={{marginTop:8,fontSize:12}}><strong>Design Numbers:</strong> {d.design_nos.join(', ')}</div>}
                    {(d.issue_records||[]).length > 0 && (
                      <div style={{marginTop:8}}>
                        <strong style={{fontSize:11,color:'#6A9B95'}}>Issue Records:</strong>
                        <table style={{width:'100%',fontSize:11,marginTop:4,borderCollapse:'collapse'}}>
                          <thead><tr style={{background:'#F4FBFA'}}>
                            <th style={{padding:'4px 8px',textAlign:'left'}}>Challan</th>
                            <th style={{padding:'4px 8px',textAlign:'left'}}>Mill</th>
                            <th style={{padding:'4px 8px',textAlign:'right'}}>Metres</th>
                            <th style={{padding:'4px 8px',textAlign:'left'}}>Date</th>
                          </tr></thead>
                          <tbody>{(d.issue_records||[]).map((r,j)=>(
                            <tr key={j} style={{borderBottom:'1px solid #f0f0f0'}}>
                              <td style={{padding:'4px 8px'}}>{r.challan_no}</td>
                              <td style={{padding:'4px 8px'}}>{r.worker_name||'—'}</td>
                              <td style={{padding:'4px 8px',textAlign:'right'}}>{fmtM(r.metres_issued)}</td>
                              <td style={{padding:'4px 8px'}}>{r.issue_date}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                    {(d.rec_records||[]).length > 0 && (
                      <div style={{marginTop:8}}>
                        <strong style={{fontSize:11,color:'#6A9B95'}}>Receive Records:</strong>
                        <table style={{width:'100%',fontSize:11,marginTop:4,borderCollapse:'collapse'}}>
                          <thead><tr style={{background:'#F4FBFA'}}>
                            <th style={{padding:'4px 8px',textAlign:'left'}}>Challan</th>
                            <th style={{padding:'4px 8px',textAlign:'left'}}>Design</th>
                            <th style={{padding:'4px 8px',textAlign:'right'}}>Received</th>
                            <th style={{padding:'4px 8px',textAlign:'right'}}>Short</th>
                            <th style={{padding:'4px 8px',textAlign:'right'}}>Shrink %</th>
                          </tr></thead>
                          <tbody>{(d.rec_records||[]).map((r,j)=>(
                            <tr key={j} style={{borderBottom:'1px solid #f0f0f0'}}>
                              <td style={{padding:'4px 8px'}}>{r.challan_no}</td>
                              <td style={{padding:'4px 8px',color:'#2468C8',fontWeight:600}}>{r.finished_design_no||'—'}</td>
                              <td style={{padding:'4px 8px',textAlign:'right'}}>{fmtM(r.metres_received)}</td>
                              <td style={{padding:'4px 8px',textAlign:'right',color:'#ef4444'}}>{r.shortage_mtrs ? fmtM(r.shortage_mtrs) : '—'}</td>
                              <td style={{padding:'4px 8px',textAlign:'right',color:r.shortage_pct>10?'#ef4444':'#D4920A',fontWeight:700}}>{r.shortage_pct ? r.shortage_pct+'%' : '—'}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>}
      </div>
    </div>
  );
}
