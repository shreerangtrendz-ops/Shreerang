import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

// ═══════════════════════════════════════════════════════════════════
// REC FROM MILL PAGE (DEDICATED)
// Data Source: rec_from_mill table
// Goal: Provide full visibility into the crucial REC voucher where
//       "design_no" is born and final cost per meter is calculated.
// ═══════════════════════════════════════════════════════════════════

const T = {
  teal:'#2BA898', tealLight:'#EEF8F6',
  red:'#D93025', redLight:'#FFF5F5',
  orange:'#E67E22', orangeLight:'#FFF8F0',
  gold:'#E8A800', goldLight:'#FFF8E8',
  green:'#1E9E5A', greenLight:'#E8FFF4',
  blue:'#2468C8', blueLight:'#EBF8FF',
  muted:'#6A9B95', border:'#D0EDE8',
  bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B',
};

const fmt  = n => n ? '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:0}) : '—';
const fmtQ = n => n ? Number(n).toLocaleString('en-IN', {maximumFractionDigits:1})+'m' : '—';
const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'2-digit'}) : '—';

function KPICard({ label, value, sub, color }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
      padding:'14px 18px', borderTop:`3px solid ${color}` }}>
      <div style={{ fontSize:10, color:T.muted, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color:T.text }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

export default function RecFromMillPage() {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null);
  
  // Filters
  const [millFilter, setMillFilter]   = useState('all');
  const [search, setSearch]       = useState('');
  
  // Summary
  const [summary, setSummary] = useState({ total_designs:0, total_mtrs:0, total_shortage:0, high_shortages:0 });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rec_from_mill')
      .select('*')
      .order('voucher_date', { ascending: false })
      .limit(2000); // Prevent massive payloads

    const d = data || [];
    setRows(d);
    
    // Calculate summary
    setSummary({
      total_designs: new Set(d.map(r=>r.design_no).filter(Boolean)).size,
      total_mtrs: d.reduce((s,r)=>s+Number(r.finish_qty_mtrs||0),0),
      total_shortage: d.reduce((s,r)=>s+Number(r.shortage_mtrs||0),0),
      high_shortages: d.filter(r=>Number(r.shortage_pct||0) > 15).length
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const allMills = [...new Set(rows.map(r=>r.job_godown).filter(Boolean))].sort();

  const filtered = rows.filter(r => {
    if (millFilter !== 'all' && r.job_godown !== millFilter) return false;
    if (search) {
      const sq = search.toLowerCase();
      return (r.design_no||'').toLowerCase().includes(sq)
          || (r.grey_lot_no||'').toLowerCase().includes(sq)
          || (r.tally_voucher_no||'').toLowerCase().includes(sq)
          || (r.party_challan_no||'').toLowerCase().includes(sq);
    }
    return true;
  });

  const TH = ({ l, r }) => (
    <th style={{ padding:'10px 12px', textAlign:r?'right':'left', fontSize:10, fontWeight:700,
      color:T.muted, textTransform:'uppercase', letterSpacing:.4,
      borderBottom:`1px solid ${T.border}`, background:T.bg, whiteSpace:'nowrap' }}>{l}</th>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:T.bg, minHeight:'100vh', padding:'20px 24px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:T.text, margin:0 }}>🏭 Receive From Mill (Finished Goods)</h1>
          <p style={{ color:T.muted, fontSize:12, margin:'4px 0 0' }}>
            Track finished design batches, actual shortage %, and allocated processing costs directly from Tally.
          </p>
        </div>
        <button onClick={load} style={{ padding:'8px 14px', background:T.teal, color:'#fff',
          border:'none', borderRadius:8, fontWeight:600, fontSize:12, cursor:'pointer' }}>
          🔄 Refresh Data
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        <KPICard label="Finished Batches" value={filtered.length} sub={`${summary.total_designs} unique designs`} color={T.blue}/>
        <KPICard label="Total Finish Qty" value={fmtQ(summary.total_mtrs)} sub="Total metres received" color={T.green}/>
        <KPICard label="Overall Shortage" value={fmtQ(summary.total_shortage)} sub="Total mtrs lost in process" color={T.orange}/>
        <KPICard label="⚠️ High Shortage (>15%)" value={summary.high_shortages} sub="Batches needing attention" color={T.red}/>
      </div>

      {/* Filters */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10,
        padding:'10px 14px', marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
        
        <div style={{ flex:'1 1 200px' }}>
          <div style={{ fontSize:10, color:T.muted, fontWeight:700, marginBottom:3, textTransform:'uppercase' }}>Search Design or Lot</div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Design no, Lot no, voucher…"
            style={{ width:'100%', padding:'7px 10px', border:`1px solid ${T.border}`,
              borderRadius:7, fontSize:12, outline:'none', boxSizing:'border-box' }}/>
        </div>

        <div style={{ flex:'1 1 200px' }}>
          <div style={{ fontSize:10, color:T.muted, fontWeight:700, marginBottom:3, textTransform:'uppercase' }}>Filter by Job Godown (Mill)</div>
          <select value={millFilter} onChange={e=>setMillFilter(e.target.value)}
            style={{ width:'100%', padding:'7px 10px', border:`1px solid ${T.border}`,
              borderRadius:7, fontSize:12, background:'#fff', outline:'none' }}>
            <option value="all">All Godowns</option>
            {allMills.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:60, textAlign:'center', color:T.muted }}>Loading recent receipts...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:60, textAlign:'center', color:T.muted }}>No matching REC entries found.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
              <thead>
                <tr>
                  <TH l="Voucher / Date"/>
                  <TH l="Job Godown"/>
                  <TH l="Grey Lot (Source)"/>
                  <TH l="Design (Dest)"/>
                  <TH l="Finish Qty" r/>
                  <TH l="Shortage %" r/>
                  <TH l="Grey Rate" r/>
                  <TH l="Job Rate" r/>
                  <TH l="Cum. Cost" r/>
                  <TH l=""/>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const exp = expanded === r.id;
                  const shortage = Number(r.shortage_pct||0);
                  const isHighShortage = shortage > 15;
                  return (
                    <React.Fragment key={r.id}>
                      <tr onClick={() => setExpanded(exp ? null : r.id)}
                        style={{ borderBottom:`1px solid ${T.border}`,
                          background: exp ? T.tealLight : i%2===0 ? T.surface : T.bg,
                          cursor:'pointer' }}>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ fontWeight:700, color:T.teal }}>{r.tally_voucher_no}</div>
                          <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>{fmtD(r.voucher_date)}</div>
                        </td>
                        <td style={{ padding:'10px 12px', fontWeight:600, maxWidth:180, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {r.job_godown || '—'}
                        </td>
                        <td style={{ padding:'10px 12px', fontFamily:'monospace', color:T.muted }}>
                          {r.grey_lot_no || '—'}
                        </td>
                        <td style={{ padding:'10px 12px', fontFamily:'monospace', fontWeight:800, color:T.blue }}>
                          {r.design_no || '—'}
                          {r.design_no === 'Primary Batch' && <span style={{fontSize:9,color:T.red,marginLeft:4}}>(Needs Allocation)</span>}
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700, fontFamily:'monospace' }}>
                          {fmtQ(r.finish_qty_mtrs)}
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:isHighShortage?800:500, color:isHighShortage?T.red:T.muted, fontFamily:'monospace' }}>
                          {shortage > 0 ? `${shortage.toFixed(1)}%` : '—'}
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'right', color:T.muted, fontFamily:'monospace' }}>
                          {r.grey_purchase_rate ? `₹${Number(r.grey_purchase_rate).toFixed(1)}` : '—'}
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'right', color:T.muted, fontFamily:'monospace' }}>
                          {r.job_rate ? `₹${Number(r.job_rate).toFixed(1)}` : '—'}
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:800, color:T.gold, fontFamily:'monospace' }}>
                          {r.cumulative_cost_per_mtr ? `₹${Number(r.cumulative_cost_per_mtr).toFixed(1)}` : '—'}
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'center', color:T.teal }}>{exp?'▲':'▼'}</td>
                      </tr>

                      {exp && (
                        <tr key={'exp-'+r.id}>
                          <td colSpan={10} style={{ padding:'16px 18px', background:'#F8FFFE', borderBottom:`2px solid ${T.teal}` }}>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:24 }}>
                              
                              {/* Source Specs */}
                              <div>
                                <div style={{ fontSize:11, fontWeight:800, color:T.muted, textTransform:'uppercase', marginBottom:8 }}>
                                  Source Details (Grey OUT)
                                </div>
                                <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, padding:'10px' }}>
                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:12}}>
                                    <span style={{color:T.muted}}>Grey Item:</span><strong style={{textAlign:'right'}}>{r.grey_item_name}</strong>
                                  </div>
                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:12}}>
                                    <span style={{color:T.muted}}>Source Lot No:</span><strong>{r.grey_lot_no}</strong>
                                  </div>
                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:12}}>
                                    <span style={{color:T.muted}}>Issued Qty:</span><strong>{fmtQ(r.grey_issued_qty_mtrs)}</strong>
                                  </div>
                                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                                    <span style={{color:T.muted}}>Grey Purchase Rate:</span><strong style={{color:T.gold}}>{r.grey_purchase_rate?`₹${Number(r.grey_purchase_rate).toFixed(2)}`:'—'}</strong>
                                  </div>
                                </div>
                              </div>

                              {/* Destination Specs */}
                              <div>
                                <div style={{ fontSize:11, fontWeight:800, color:T.muted, textTransform:'uppercase', marginBottom:8 }}>
                                  Destination Details (Finish IN)
                                </div>
                                <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, padding:'10px' }}>
                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:12}}>
                                    <span style={{color:T.muted}}>Finish Item:</span><strong style={{textAlign:'right'}}>{r.finish_item_name}</strong>
                                  </div>
                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:12}}>
                                    <span style={{color:T.muted}}>Design No:</span><strong style={{color:T.blue}}>{r.design_no}</strong>
                                  </div>
                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:12}}>
                                    <span style={{color:T.muted}}>Received Qty:</span><strong>{fmtQ(r.finish_qty_mtrs)}</strong>
                                  </div>
                                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                                    <span style={{color:T.muted}}>Shortage:</span>
                                    <strong style={{color:isHighShortage?T.red:T.text}}>
                                      {fmtQ(r.shortage_mtrs)} ({Number(r.shortage_pct||0).toFixed(1)}%)
                                    </strong>
                                  </div>
                                </div>
                              </div>

                              {/* Jobwork & Allocations */}
                              <div>
                                <div style={{ fontSize:11, fontWeight:800, color:T.muted, textTransform:'uppercase', marginBottom:8 }}>
                                  JW Cost Allocation
                                </div>
                                <div style={{ background:'#fff', border:`1px solid ${T.border}`, borderRadius:8, padding:'10px' }}>
                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:12}}>
                                    <span style={{color:T.muted}}>Party Challan No:</span><strong>{r.party_challan_no||'—'}</strong>
                                  </div>
                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:12}}>
                                    <span style={{color:T.muted}}>Recon Status:</span>
                                    <span style={{
                                      padding:'2px 6px', borderRadius:4, fontSize:10, fontWeight:800,
                                      background: r.recon_status==='matched'?T.greenLight:r.recon_status==='mismatch'?T.redLight:T.orangeLight,
                                      color: r.recon_status==='matched'?T.green:r.recon_status==='mismatch'?T.red:T.orange
                                    }}>
                                      {r.recon_status ? r.recon_status.toUpperCase() : 'PENDING'}
                                    </span>
                                  </div>
                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:12}}>
                                    <span style={{color:T.muted}}>Job Amount (UDF):</span><strong>{fmt(r.job_amount)}</strong>
                                  </div>
                                  <div style={{display:'flex',justifyContent:'space-between',borderTop:`1px solid ${T.border}`,paddingTop:6,marginTop:6,fontSize:12}}>
                                    <span style={{color:T.muted}}>Final Cost / mtr:</span><strong style={{color:T.teal,fontSize:14}}>
                                      {r.cumulative_cost_per_mtr?`₹${Number(r.cumulative_cost_per_mtr).toFixed(1)}`:'—'}
                                    </strong>
                                  </div>
                                </div>
                              </div>
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
        )}
      </div>
    </div>
  );
}
