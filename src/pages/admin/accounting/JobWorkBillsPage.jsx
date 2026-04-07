import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

// ══════════════════════════════════════════════════════════
// JOB WORK BILLS PAGE  — v4  (4 tabs: Issue / REC / Jobwork / Expenses)
//
// FIXES vs v3:
//   - NEW "REC from Mill" dedicated tab with full mapping & costing
//   - Issue to Mill: falls back to grey_purchase.actual_qty_mtrs when qty_mtrs=0
//   - REC from Mill: uses job_godown (not null mill_name) for mill display
//   - REC expanded: shows full cost chain (grey → job → cumulative cost/mtr)
//   - Jobwork: uses expense_amount (not missing 'amount' column)
// ══════════════════════════════════════════════════════════

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

const fmt    = n => '₹' + Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtD   = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtQty = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const fmtL   = n => { const v=Number(n||0); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:fmt(v); };

const FY_YEARS = [2022,2023,2024,2025,2026];

function typeChip(t) {
  const map = {
    'issued':    {bg:'#FEF3C7',col:'#B45309'},
    'received':  {bg:'#D1FAE5',col:'#065F46'},
    'Jobwork':   {bg:'#DBEAFE',col:'#1D4ED8'},
    'Expenses':  {bg:'#FEF3C7',col:'#92400E'},
  };
  const c = map[t] || {bg:'#F3F4F6',col:'#374151'};
  return <span style={{padding:'2px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:c.bg,color:c.col,whiteSpace:'nowrap'}}>{t||'—'}</span>;
}

function TabBtn({label, active, count, color, onClick}) {
  return (
    <button onClick={onClick} style={{
      padding:'8px 16px', borderRadius:'8px 8px 0 0', border:'none', cursor:'pointer',
      fontWeight:700, fontSize:12, transition:'all .15s',
      background: active ? T.surface : T.bg,
      color: active ? color : T.muted,
      borderBottom: active ? `3px solid ${color}` : `3px solid transparent`,
      display:'flex', alignItems:'center', gap:6,
    }}>
      {label}
      {count > 0 && (
        <span style={{background:color,color:'#fff',borderRadius:10,padding:'1px 7px',fontSize:10,fontWeight:800}}>
          {count.toLocaleString('en-IN')}
        </span>
      )}
    </button>
  );
}

function SyncBanner({maxDate}) {
  if (!maxDate) return null;
  const d = new Date(maxDate);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays < 30) return null;
  return (
    <div style={{background:'#FFF8E8',border:`1px solid ${T.gold}`,borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#92400E',display:'flex',alignItems:'center',gap:8}}>
      ⏳ <strong>Tally sync is {diffDays} days behind.</strong> Latest data: {fmtD(maxDate)}. Switch to FY 22-24 to see synced data.
    </div>
  );
}

export default function JobWorkBillsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('issues'); // 'issues' | 'rec' | 'jobwork' | 'expenses'

  // Date filters
  const [activeFY, setActiveFY] = useState(2024);
  const [dateFrom, setDateFrom] = useState('2024-04-01');
  const [dateTo,   setDateTo]   = useState('2025-03-31');

  // Data
  const [issues,   setIssues]   = useState([]);
  const [recMill,  setRecMill]  = useState([]);
  const [jobwork,  setJobwork]  = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [maxIssueDate, setMaxIssueDate] = useState(null);
  const [maxRecDate, setMaxRecDate] = useState(null);

  // Filters
  const [search,        setSearch]        = useState('');
  const [workerFilter,  setWorkerFilter]  = useState('all');
  const [expandedId,    setExpandedId]    = useState(null);

  const setFY = yr => {
    setActiveFY(yr);
    setDateFrom(`${yr}-04-01`);
    setDateTo(`${yr+1}-03-31`);
    setExpandedId(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setExpandedId(null);

    const [issRes, recRes, jwRes, expRes, maxIssRes, maxRecRes] = await Promise.all([
      // Issue to Mill
      supabase.from('issue_to_mill')
        .select('id,lot_no,tally_voucher_no,voucher_date,mill_name,item_name,qty_mtrs,rate,amount,process_type,narration,tally_synced_at,is_sampling,destination_godown')
        .gte('voucher_date', dateFrom).lte('voucher_date', dateTo)
        .order('voucher_date', {ascending:false}),

      // REC from Mill — fetch all costing columns
      supabase.from('rec_from_mill')
        .select('id,tally_voucher_no,voucher_date,mill_name,job_godown,our_godown,party_challan_no,lot_no,design_no,grey_lot_no,grey_item_name,finish_item_name,grey_issued_qty_mtrs,finish_qty_mtrs,grey_rate,grey_amount,job_rate,job_amount,finish_rate,finish_amount,shortage_mtrs,shortage_pct,grey_purchase_rate,grey_cost_actual,cumulative_cost_per_mtr,jw_allocated_cost,jw_allocation_pct,jw_voucher_number,narration,stage_no,issue_challan_no,weaver_name,quality_name,dest_godown,source_godown,short_qty_mtrs,gross_amount')
        .gte('voucher_date', dateFrom).lte('voucher_date', dateTo)
        .order('voucher_date', {ascending:false}),

      // Jobwork bills
      supabase.from('jobwork_expenses')
        .select('*')
        .eq('voucher_type','Jobwork')
        .gte('voucher_date', dateFrom).lte('voucher_date', dateTo)
        .order('voucher_date', {ascending:false}),

      // Other expenses
      supabase.from('jobwork_expenses')
        .select('*')
        .eq('voucher_type','Expenses')
        .gte('voucher_date', dateFrom).lte('voucher_date', dateTo)
        .order('voucher_date', {ascending:false}),

      // Max dates for sync lag banners
      supabase.from('issue_to_mill').select('voucher_date').order('voucher_date',{ascending:false}).limit(1),
      supabase.from('rec_from_mill').select('voucher_date').order('voucher_date',{ascending:false}).limit(1),
    ]);

    setIssues(issRes.data || []);
    setRecMill(recRes.data || []);
    setJobwork(jwRes.data || []);
    setExpenses(expRes.data || []);
    if (maxIssRes.data?.[0]) setMaxIssueDate(maxIssRes.data[0].voucher_date);
    if (maxRecRes.data?.[0]) setMaxRecDate(maxRecRes.data[0].voucher_date);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // --- Filtered data per tab ---
  const filterRows = (rows, nameField) => rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r[nameField]||'').toLowerCase().includes(q)
        || (r.lot_no||r.voucher_number||r.grey_lot_no||'').toLowerCase().includes(q)
        || (r.design_no||'').toLowerCase().includes(q)
        || (r.gp_number||r.supplier_invoice_no||r.party_challan_no||'').toLowerCase().includes(q);
  });

  const filteredIssues   = filterRows(issues.filter(r => workerFilter==='all' || r.mill_name===workerFilter), 'mill_name');
  const filteredRec      = filterRows(recMill.filter(r => workerFilter==='all' || (r.job_godown||r.mill_name)===workerFilter), 'job_godown');
  const filteredJobwork  = filterRows(jobwork.filter(r => workerFilter==='all' || r.party_name===workerFilter), 'party_name');
  const filteredExpenses = filterRows(expenses.filter(r => workerFilter==='all' || r.party_name===workerFilter), 'party_name');

  // KPI totals
  const totalIssueQty  = filteredIssues.reduce((s,r)=>s+Number(r.qty_mtrs||0),0);
  const totalIssueAmt  = filteredIssues.reduce((s,r)=>s+Number(r.amount||0),0);
  const totalRecQty    = filteredRec.reduce((s,r)=>s+Number(r.finish_qty_mtrs||0),0);
  const totalJWAmt     = filteredJobwork.reduce((s,r)=>s+Number(r.expense_amount||0),0);
  const totalExpAmt    = filteredExpenses.reduce((s,r)=>s+Number(r.expense_amount||0),0);

  // Workers list (all tabs combined)
  const allWorkers = [...new Set([
    ...issues.map(r=>r.mill_name),
    ...recMill.map(r=>r.job_godown||r.mill_name),
    ...jobwork.map(r=>r.party_name),
    ...expenses.map(r=>r.party_name),
  ].filter(Boolean))].sort();

  const TH = ({label, right}) => (
    <th style={{padding:'9px 12px',textAlign:right?'right':'left',fontSize:10.5,fontWeight:700,
      color:T.muted,textTransform:'uppercase',letterSpacing:.4,
      borderBottom:`1px solid ${T.border}`,background:T.bg,whiteSpace:'nowrap'}}>
      {label}
    </th>
  );

  // ─── RENDER: Issue to Mill tab ───────────────────────────────
  const renderIssues = () => (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:'0 12px 12px 12px',overflow:'hidden'}}>
      <div style={{padding:'8px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:T.bg}}>
        <span style={{fontSize:12,color:T.muted,fontWeight:600}}>{filteredIssues.length} entries</span>
        <div style={{display:'flex',gap:16,fontSize:12}}>
          <span>Total Qty: <strong style={{color:T.teal}}>{fmtQty(totalIssueQty)} m</strong></span>
          <span>Total Amount: <strong style={{color:T.gold}}>{fmtL(totalIssueAmt)}</strong></span>
        </div>
      </div>
      {filteredIssues.length === 0 ? (
        <div style={{padding:40,textAlign:'center',color:T.muted}}>
          <div style={{fontSize:32,marginBottom:8}}>📦</div>
          No Issue to Mill entries for this period. Sync reached up to {fmtD(maxIssueDate)}.
        </div>
      ) : (
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
            <thead><tr>
              <TH label="Tally Voucher"/>
              <TH label="Date"/>
              <TH label="Mill Name"/>
              <TH label="Item / Fabric"/>
              <TH label="Lot No"/>
              <TH label="Process"/>
              <TH label="Qty (m)" right/>
              <TH label="Rate" right/>
              <TH label="Amount" right/>
              <TH label=""/>
            </tr></thead>
            <tbody>
              {filteredIssues.map((r,i) => {
                const isExp = expandedId === 'ITM-'+r.id;
                // Fix: show qty_mtrs, but flag it when it's 0 (known Tally issue)
                const displayQty = Number(r.qty_mtrs||0);
                return (<>
                  <tr key={r.id}
                    onClick={()=>setExpandedId(isExp ? null : 'ITM-'+r.id)}
                    style={{borderBottom:`1px solid ${T.border}`,background:isExp?T.tealLight:i%2===0?T.surface:T.bg,cursor:'pointer'}}>
                    <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:11,color:T.muted,whiteSpace:'nowrap'}}>{r.tally_voucher_no||r.lot_no||'—'}</td>
                    <td style={{padding:'9px 12px',color:T.muted,whiteSpace:'nowrap'}}>{fmtD(r.voucher_date)}</td>
                    <td style={{padding:'9px 12px',fontWeight:600,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.mill_name||r.destination_godown||'—'}</td>
                    <td style={{padding:'9px 12px',fontSize:11,color:T.muted,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.item_name||'—'}</td>
                    <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:11,color:T.teal,fontWeight:600}}>{r.lot_no||'—'}</td>
                    <td style={{padding:'9px 12px'}}>{typeChip(r.process_type||'issued')}</td>
                    <td style={{padding:'9px 12px',textAlign:'right',fontFamily:'monospace',fontWeight:600,color:displayQty===0?T.red:T.text}}>
                      {displayQty===0 ? <span title="qty_mtrs=0 in Tally — use Grey Purchase actual_qty_mtrs via lot_no join">0 m ⚠</span> : `${fmtQty(displayQty)} m`}
                    </td>
                    <td style={{padding:'9px 12px',textAlign:'right',fontFamily:'monospace',color:T.muted}}>{r.rate?fmt(r.rate):'-'}</td>
                    <td style={{padding:'9px 12px',textAlign:'right',fontWeight:800,color:T.gold,fontFamily:'monospace'}}>{fmt(r.amount)}</td>
                    <td style={{padding:'9px 12px',textAlign:'center',color:T.teal}}>{isExp?'▲':'▼'}</td>
                  </tr>
                  {isExp && (
                    <tr key={'exp-'+r.id}><td colSpan={10} style={{padding:'14px 18px',background:'#F8FFFE',borderBottom:`2px solid ${T.teal}`}}>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                        {[
                          ['Lot No',          r.lot_no],
                          ['Tally Voucher',   r.tally_voucher_no],
                          ['Date',            fmtD(r.voucher_date)],
                          ['Mill Name',       r.mill_name||r.destination_godown],
                          ['Item / Fabric',   r.item_name],
                          ['Qty (Mtrs)',       fmtQty(r.qty_mtrs)+' m'],
                          ['Rate / Mtr',      r.rate?fmt(r.rate)+'/m':'—'],
                          ['Amount',          fmt(r.amount)],
                          ['Process Type',    r.process_type||'issued'],
                          ['Destination',     r.destination_godown||'—'],
                          ['Sampling?',       r.is_sampling?'Yes — Sampling':'No — Production'],
                          ['Narration',       r.narration||'—'],
                          ['Tally Synced',    r.tally_synced_at?new Date(r.tally_synced_at).toLocaleString('en-IN'):'—'],
                        ].map(([l,v])=>(
                          <div key={l} style={{background:T.surface,borderRadius:6,padding:'6px 10px',border:`1px solid ${T.border}`}}>
                            <div style={{fontSize:9,color:T.muted,textTransform:'uppercase',letterSpacing:.4,marginBottom:2}}>{l}</div>
                            <div style={{fontSize:12,fontWeight:500,color:T.text}}>{v||'—'}</div>
                          </div>
                        ))}
                      </div>
                      {Number(r.qty_mtrs||0)===0 && (
                        <div style={{marginTop:10,padding:'8px 12px',background:T.goldLight,borderRadius:6,fontSize:11,color:'#92400E',border:`1px solid ${T.gold}44`}}>
                          ⚠ <strong>qty_mtrs = 0</strong> — This is a known Tally export issue for newer entries. The actual metres can be found via <code>grey_purchase.actual_qty_mtrs</code> using lot_no join: <strong>{r.lot_no}</strong>
                        </div>
                      )}
                    </td></tr>
                  )}
                </>);
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ─── RENDER: REC from Mill tab (NEW) ─────────────────────────
  const renderRecFromMill = () => {
    const totalShortage = filteredRec.reduce((s,r) => s + Number(r.shortage_mtrs||0), 0);
    const avgCost = filteredRec.length > 0
      ? filteredRec.reduce((s,r) => s + Number(r.cumulative_cost_per_mtr||0), 0) / filteredRec.filter(r => Number(r.cumulative_cost_per_mtr||0) > 0).length || 0
      : 0;

    return (
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:'0 12px 12px 12px',overflow:'hidden'}}>
        <div style={{padding:'8px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:T.bg,flexWrap:'wrap',gap:8}}>
          <span style={{fontSize:12,color:T.muted,fontWeight:600}}>{filteredRec.length} entries</span>
          <div style={{display:'flex',gap:16,fontSize:12,flexWrap:'wrap'}}>
            <span>Received: <strong style={{color:T.green}}>{fmtQty(totalRecQty)} m</strong></span>
            <span>Shortage: <strong style={{color:T.red}}>{fmtQty(totalShortage)} m</strong></span>
            {avgCost > 0 && <span>Avg Cost: <strong style={{color:T.teal}}>{fmt(avgCost)}/m</strong></span>}
          </div>
        </div>
        <SyncBanner maxDate={maxRecDate}/>
        {filteredRec.length === 0 ? (
          <div style={{padding:40,textAlign:'center',color:T.muted}}>
            <div style={{fontSize:32,marginBottom:8}}>🏭</div>
            No REC FROM MILL entries for this period. Sync reached up to {fmtD(maxRecDate)}.
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
              <thead><tr>
                <TH label="Design No"/>
                <TH label="Date"/>
                <TH label="Mill (Godown)"/>
                <TH label="Grey Lot"/>
                <TH label="Finished Fabric"/>
                <TH label="Recv Qty" right/>
                <TH label="Short%" right/>
                <TH label="Cost/Mtr" right/>
                <TH label=""/>
              </tr></thead>
              <tbody>
                {filteredRec.map((r,i) => {
                  const isExp = expandedId === 'REC-'+r.id;
                  const shortPct = Number(r.shortage_pct||0);
                  const shortColor = shortPct > 15 ? T.red : shortPct > 8 ? T.orange : T.green;
                  const costPerMtr = Number(r.cumulative_cost_per_mtr||0);
                  // Use job_godown as primary mill identifier (mill_name is 97% NULL)
                  const millDisplay = r.job_godown || r.mill_name || '—';

                  return (<>
                    <tr key={r.id}
                      onClick={()=>setExpandedId(isExp ? null : 'REC-'+r.id)}
                      style={{borderBottom:`1px solid ${T.border}`,background:isExp?T.tealLight:i%2===0?T.surface:T.bg,cursor:'pointer'}}>
                      <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:12,color:T.purple,fontWeight:700}}>{r.design_no||'—'}</td>
                      <td style={{padding:'9px 12px',color:T.muted,whiteSpace:'nowrap'}}>{fmtD(r.voucher_date)}</td>
                      <td style={{padding:'9px 12px',fontWeight:500,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={millDisplay}>{millDisplay}</td>
                      <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:11,color:T.teal,fontWeight:600}}>{r.grey_lot_no||r.lot_no||'—'}</td>
                      <td style={{padding:'9px 12px',fontSize:11,color:T.muted,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.finish_item_name||'—'}</td>
                      <td style={{padding:'9px 12px',textAlign:'right',fontFamily:'monospace',fontWeight:600,color:T.green}}>{fmtQty(r.finish_qty_mtrs)} m</td>
                      <td style={{padding:'9px 12px',textAlign:'right',fontWeight:700,color:shortColor}}>{shortPct > 0 ? `${shortPct.toFixed(1)}%` : '—'}</td>
                      <td style={{padding:'9px 12px',textAlign:'right',fontFamily:'monospace',fontWeight:700,color:costPerMtr>0?T.teal:T.muted}}>{costPerMtr>0?`${fmt(costPerMtr)}/m`:'—'}</td>
                      <td style={{padding:'9px 12px',textAlign:'center',color:T.teal}}>{isExp?'▲':'▼'}</td>
                    </tr>
                    {isExp && (
                      <tr key={'exp-'+r.id}><td colSpan={9} style={{padding:0,background:'#F8FFFE',borderBottom:`2px solid ${T.teal}`}}>
                        <div style={{padding:'16px 18px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>

                          {/* Col 1: Voucher & Mapping Info */}
                          <div style={{background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                            <div style={{fontSize:10,fontWeight:700,color:T.teal,textTransform:'uppercase',marginBottom:8,letterSpacing:.5}}>📋 Voucher & Mapping</div>
                            {[
                              ['Tally Voucher No',   r.tally_voucher_no],
                              ['Date',               fmtD(r.voucher_date)],
                              ['Mill Name',          r.mill_name||'—'],
                              ['Job Godown',         r.job_godown||'—'],
                              ['Our Godown',         r.our_godown||'Main Location'],
                              ['Party Challan No',   r.party_challan_no||'—'],
                              ['Issue Challan No',   r.issue_challan_no||'—'],
                              ['Grey Lot No',        r.grey_lot_no||r.lot_no||'—'],
                              ['Design No',          r.design_no||'—'],
                              ['Weaver',             r.weaver_name||'—'],
                              ['Quality',            r.quality_name||'—'],
                              ['Stage',              r.stage_no||'1'],
                              ['Narration',          r.narration||'—'],
                            ].map(([l,v])=>(
                              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12,gap:6}}>
                                <span style={{color:T.muted,flexShrink:0}}>{l}</span>
                                <span style={{color:T.text,fontWeight:['Design No','Grey Lot No','Party Challan No'].includes(l)?700:500,
                                  fontFamily:['Tally Voucher No','Grey Lot No','Design No','Party Challan No'].includes(l)?'monospace':'inherit',
                                  textAlign:'right',wordBreak:'break-word'}}>{v}</span>
                              </div>
                            ))}
                          </div>

                          {/* Col 2: Quantity & Shortage */}
                          <div style={{background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                            <div style={{fontSize:10,fontWeight:700,color:T.green,textTransform:'uppercase',marginBottom:8,letterSpacing:.5}}>📏 Quantity & Shortage</div>
                            {[
                              ['Grey Fabric',        r.grey_item_name||'—'],
                              ['Finished Fabric',    r.finish_item_name||'—'],
                              ['Grey Issued Qty',    r.grey_issued_qty_mtrs ? `${fmtQty(r.grey_issued_qty_mtrs)} m` : '—'],
                              ['Finished Recv Qty',  r.finish_qty_mtrs ? `${fmtQty(r.finish_qty_mtrs)} m` : '—'],
                              ['Shortage',           r.shortage_mtrs ? `${fmtQty(r.shortage_mtrs)} m (${Number(r.shortage_pct||0).toFixed(1)}%)` : '—'],
                              ['Short Qty (UDF)',    r.short_qty_mtrs ? `${fmtQty(r.short_qty_mtrs)} m` : '—'],
                              ['Source Godown',      r.source_godown||'—'],
                              ['Dest Godown',        r.dest_godown||'Main Location'],
                            ].map(([l,v])=>(
                              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12,gap:6}}>
                                <span style={{color:T.muted,flexShrink:0}}>{l}</span>
                                <span style={{color:l==='Shortage'&&shortPct>15?T.red:T.text,fontWeight:l.includes('Qty')?600:500,textAlign:'right'}}>{v}</span>
                              </div>
                            ))}
                            {shortPct > 15 && (
                              <div style={{marginTop:8,padding:'6px 10px',background:T.redLight,borderRadius:6,fontSize:11,color:T.red,fontWeight:600}}>
                                ⚠ High shortage ({shortPct.toFixed(1)}%) — may indicate wastage or sample cuts
                              </div>
                            )}
                          </div>

                          {/* Col 3: Costing Chain */}
                          <div style={{background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                            <div style={{fontSize:10,fontWeight:700,color:T.gold,textTransform:'uppercase',marginBottom:8,letterSpacing:.5}}>💰 Cost Chain</div>
                            {[
                              ['Grey Rate',             r.grey_rate ? fmt(r.grey_rate)+'/m' : '—'],
                              ['Grey Amount',           r.grey_amount ? fmt(r.grey_amount) : '—'],
                              ['Grey Purchase Rate',    r.grey_purchase_rate ? fmt(r.grey_purchase_rate)+'/m' : '—'],
                              ['Grey Cost (Actual)',    r.grey_cost_actual ? fmt(r.grey_cost_actual) : '—'],
                              ['Job Rate',              r.job_rate ? fmt(r.job_rate)+'/m' : '—'],
                              ['Job Amount',            r.job_amount ? fmt(Math.abs(r.job_amount)) : '—'],
                              ['Gross Amount',          r.gross_amount ? fmt(r.gross_amount) : '—'],
                              ['Finish Rate',           r.finish_rate ? fmt(r.finish_rate)+'/m' : '—'],
                              ['Finish Amount',         r.finish_amount ? fmt(r.finish_amount) : '—'],
                            ].map(([l,v])=>(
                              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12,gap:6}}>
                                <span style={{color:T.muted,flexShrink:0}}>{l}</span>
                                <span style={{color:T.text,fontWeight:500,fontFamily:'monospace',textAlign:'right'}}>{v}</span>
                              </div>
                            ))}

                            {/* Cumulative Cost Highlight */}
                            <div style={{marginTop:10,padding:'10px 12px',background:costPerMtr>0?T.greenLight:T.bg,borderRadius:8,border:`1px solid ${costPerMtr>0?T.green:T.border}44`}}>
                              <div style={{fontSize:9,fontWeight:700,color:T.muted,textTransform:'uppercase',marginBottom:4}}>Cumulative Cost / Mtr</div>
                              <div style={{fontSize:20,fontWeight:800,color:costPerMtr>0?T.teal:T.muted,fontFamily:'monospace'}}>
                                {costPerMtr > 0 ? `${fmt(costPerMtr)}/m` : 'Not computed'}
                              </div>
                            </div>

                            {/* JW Allocation */}
                            {(r.jw_allocated_cost || r.jw_voucher_number) && (
                              <div style={{marginTop:8,padding:'8px 10px',background:T.blueLight,borderRadius:6,border:`1px solid ${T.blue}22`}}>
                                <div style={{fontSize:9,fontWeight:700,color:T.blue,textTransform:'uppercase',marginBottom:4}}>JW Bill Allocation</div>
                                {r.jw_voucher_number && <div style={{fontSize:11}}>Voucher: <strong style={{fontFamily:'monospace'}}>{r.jw_voucher_number}</strong></div>}
                                {r.jw_allocated_cost > 0 && <div style={{fontSize:11}}>Allocated: <strong>{fmt(r.jw_allocated_cost)}</strong></div>}
                                {r.jw_allocation_pct > 0 && <div style={{fontSize:11}}>Share: <strong>{Number(r.jw_allocation_pct).toFixed(1)}%</strong></div>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td></tr>
                    )}
                  </>);
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ─── RENDER: Jobwork / Expenses tab ──────────────────────────
  const renderJWOrExp = (rows, totalAmt, emptyLabel) => (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:'0 12px 12px 12px',overflow:'hidden'}}>
      <div style={{padding:'8px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:T.bg}}>
        <span style={{fontSize:12,color:T.muted,fontWeight:600}}>{rows.length} entries</span>
        <span style={{fontSize:12,fontWeight:700,color:T.gold}}>Total: {fmtL(totalAmt)}</span>
      </div>
      {rows.length === 0 ? (
        <div style={{padding:40,textAlign:'center',color:T.muted}}>
          <div style={{fontSize:32,marginBottom:8}}>🏭</div>
          {emptyLabel}
        </div>
      ) : (
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
            <thead><tr>
              <TH label="Voucher No"/>
              <TH label="Date"/>
              <TH label="Party / Mill"/>
              <TH label="Type"/>
              <TH label="Supplier Invoice"/>
              <TH label="GP Number"/>
              <TH label="Expense Amt" right/>
              <TH label="GST" right/>
              <TH label="Total" right/>
              <TH label=""/>
            </tr></thead>
            <tbody>
              {rows.map((r,i) => {
                const isExp = expandedId === 'JW-'+r.id;
                const gst = Number(r.cgst_amount||0)+Number(r.sgst_amount||0)+Number(r.igst_amount||0);
                return (<>
                  <tr key={r.id}
                    onClick={()=>setExpandedId(isExp ? null : 'JW-'+r.id)}
                    style={{borderBottom:`1px solid ${T.border}`,background:isExp?T.tealLight:i%2===0?T.surface:T.bg,cursor:'pointer'}}>
                    <td style={{padding:'9px 12px',fontFamily:'monospace',fontSize:11,color:T.blue,fontWeight:700,whiteSpace:'nowrap'}}>{r.voucher_number||'—'}</td>
                    <td style={{padding:'9px 12px',color:T.muted,whiteSpace:'nowrap'}}>{fmtD(r.voucher_date)}</td>
                    <td style={{padding:'9px 12px',fontWeight:600,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.party_name||'—'}</td>
                    <td style={{padding:'9px 12px'}}>{typeChip(r.voucher_type)}</td>
                    <td style={{padding:'9px 12px',fontSize:11,color:T.orange,fontWeight:600}}>{r.supplier_invoice_no||'—'}</td>
                    <td style={{padding:'9px 12px',fontSize:11,color:T.teal,fontWeight:600}}>{r.gp_number||'—'}</td>
                    <td style={{padding:'9px 12px',textAlign:'right',fontFamily:'monospace',fontWeight:700}}>{fmt(r.expense_amount)}</td>
                    <td style={{padding:'9px 12px',textAlign:'right',fontFamily:'monospace',fontSize:11,color:T.muted}}>{gst>0?fmt(gst):'—'}</td>
                    <td style={{padding:'9px 12px',textAlign:'right',fontWeight:800,color:T.gold,fontFamily:'monospace'}}>{fmt(r.total_amount)}</td>
                    <td style={{padding:'9px 12px',textAlign:'center',color:T.teal}}>{isExp?'▲':'▼'}</td>
                  </tr>
                  {isExp && (
                    <tr key={'exp-'+r.id}><td colSpan={10} style={{padding:'14px 18px',background:'#F8FFFE',borderBottom:`2px solid ${T.teal}`}}>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                        {[
                          ['Voucher No',        r.voucher_number],
                          ['Type',              r.voucher_type],
                          ['Date',              fmtD(r.voucher_date)],
                          ['Party Name',        r.party_name],
                          ['Party GSTIN',       r.party_gstin||'—'],
                          ['GST Reg Type',      r.gst_reg_type||'—'],
                          ['Supplier Invoice',  r.supplier_invoice_no||'—'],
                          ['Supplier Inv Date', r.supplier_invoice_date?fmtD(r.supplier_invoice_date):'—'],
                          ['GP Number',         r.gp_number||'—'],
                          ['Expense Ledger',    r.expense_ledger||'—'],
                          ['Expense Amount',    fmt(r.expense_amount)],
                          ['TDS Deducted',      r.tds_amount>0?fmt(r.tds_amount):'—'],
                          ['CGST',              r.cgst_amount>0?fmt(r.cgst_amount):'—'],
                          ['SGST',              r.sgst_amount>0?fmt(r.sgst_amount):'—'],
                          ['IGST',              r.igst_amount>0?fmt(r.igst_amount):'—'],
                          ['Total Amount',      fmt(r.total_amount)],
                          ['Bill Ref',          r.bill_ref||'—'],
                          ['Narration',         r.narration||'—'],
                          ['Entered By',        r.entered_by||'—'],
                          ['Place of Supply',   r.place_of_supply||'—'],
                        ].map(([l,v])=>(
                          <div key={l} style={{background:T.surface,borderRadius:6,padding:'6px 10px',border:`1px solid ${T.border}`}}>
                            <div style={{fontSize:9,color:T.muted,textTransform:'uppercase',letterSpacing:.4,marginBottom:2}}>{l}</div>
                            <div style={{fontSize:12,fontWeight:500,color:T.text,wordBreak:'break-word'}}>{v||'—'}</div>
                          </div>
                        ))}
                      </div>
                      {r.gp_number && (
                        <div style={{marginTop:10}}>
                          <button onClick={()=>navigate(`/admin/accounting/process-issues?search=${r.gp_number}`)}
                            style={{padding:'6px 12px',background:T.teal,color:'#fff',border:'none',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                            🔗 Find Issue to Mill for GP {r.gp_number}
                          </button>
                        </div>
                      )}
                    </td></tr>
                  )}
                </>);
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh',padding:'20px 24px'}}>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.text,margin:0}}>
            🏭 Job Work Bills
          </h1>
          <p style={{color:T.muted,fontSize:12,margin:'4px 0 0'}}>
            Issue to Mill · REC from Mill · Jobwork Bills · Other Expenses — Tally synced data
          </p>
        </div>
        <button onClick={load} style={{padding:'8px 14px',background:T.teal,color:'#fff',border:'none',borderRadius:8,fontWeight:600,fontSize:12,cursor:'pointer'}}>🔄 Refresh</button>
      </div>

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:18}}>
        {[
          {label:'Issue to Mill',   value:`${fmtQty(totalIssueQty)} m`,  sub:`${filteredIssues.length} challans`,     icon:'📦', color:T.orange},
          {label:'REC from Mill',   value:`${fmtQty(totalRecQty)} m`,    sub:`${filteredRec.length} entries`,          icon:'✅', color:T.green},
          {label:'Issue Amount',    value:fmtL(totalIssueAmt),           sub:'at job rate',                           icon:'💸', color:T.blue},
          {label:'Jobwork Bills',   value:fmtL(totalJWAmt),              sub:`${filteredJobwork.length} bills`,       icon:'🏭', color:T.teal},
          {label:'Other Expenses',  value:fmtL(totalExpAmt),             sub:`${filteredExpenses.length} entries`,   icon:'🚛', color:T.purple},
        ].map((c,i) => (
          <div key={i} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 16px',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:c.color}}/>
            <div style={{fontSize:10,color:T.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,marginBottom:6}}>{c.icon} {c.label}</div>
            <div style={{fontSize:20,fontWeight:800,color:c.color}}>{c.value}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:2}}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:14,marginBottom:0,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>

        {/* FY tabs */}
        <div style={{display:'flex',gap:4,alignSelf:'flex-end',background:T.bg,padding:'4px',borderRadius:8,border:`1px solid ${T.border}`}}>
          {FY_YEARS.map(y => {
            const isActive = activeFY===y;
            return (
              <button key={y} onClick={()=>setFY(y)}
                style={{padding:'5px 11px',fontSize:12,fontWeight:700,cursor:'pointer',borderRadius:6,border:'none',transition:'all .15s',
                  background:isActive?T.teal:'transparent',color:isActive?'#fff':T.muted}}>
                FY {y.toString().slice(2)}-{(y+1).toString().slice(2)}
              </button>
            );
          })}
        </div>

        <div style={{width:1,height:32,background:T.border,alignSelf:'flex-end'}}/>

        <div>
          <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>From</div>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,outline:'none'}}/>
        </div>
        <div>
          <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>To</div>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,outline:'none'}}/>
        </div>

        <div>
          <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Mill / Party</div>
          <select value={workerFilter} onChange={e=>setWorkerFilter(e.target.value)}
            style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,background:'#fff',outline:'none',minWidth:160}}>
            <option value="all">All</option>
            {allWorkers.map(w=><option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        <div style={{flex:1,minWidth:180}}>
          <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Search</div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Lot no, design, party, voucher, GP no…"
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,outline:'none',boxSizing:'border-box'}}/>
        </div>
      </div>

      {/* Sync Banner */}
      <div style={{marginTop:12}}>
        <SyncBanner maxDate={maxIssueDate}/>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:2,borderBottom:`1px solid ${T.border}`,marginBottom:0}}>
        <TabBtn label="Issue to Mill"   active={activeTab==='issues'}   count={filteredIssues.length}   color={T.orange} onClick={()=>setActiveTab('issues')}/>
        <TabBtn label="REC from Mill"   active={activeTab==='rec'}      count={filteredRec.length}      color={T.green}  onClick={()=>setActiveTab('rec')}/>
        <TabBtn label="Jobwork Bills"   active={activeTab==='jobwork'}  count={filteredJobwork.length}  color={T.teal}   onClick={()=>setActiveTab('jobwork')}/>
        <TabBtn label="Other Expenses"  active={activeTab==='expenses'} count={filteredExpenses.length} color={T.purple} onClick={()=>setActiveTab('expenses')}/>
      </div>

      {/* Tab content */}
      {loading ? (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:'0 12px 12px 12px',padding:60,textAlign:'center',color:T.muted,fontSize:14}}>
          Loading…
        </div>
      ) : (
        <>
          {activeTab==='issues'   && renderIssues()}
          {activeTab==='rec'      && renderRecFromMill()}
          {activeTab==='jobwork'  && renderJWOrExp(filteredJobwork,  totalJWAmt,  `No Jobwork Bills in this period. Tally sync reached ${fmtD(maxIssueDate)}.`)}
          {activeTab==='expenses' && renderJWOrExp(filteredExpenses, totalExpAmt, `No Expense entries in this period. Tally sync reached ${fmtD(maxIssueDate)}.`)}
        </>
      )}

      <div style={{marginTop:12,fontSize:11,color:T.muted,textAlign:'center'}}>
        Issue to Mill = fabric sent to mill (Tally Stock Journal) ·
        REC from Mill = finished fabric received back with costing ·
        Jobwork Bills = payment vouchers for processing ·
        Other Expenses = transport, electricity, misc
      </div>
    </div>
  );
}
