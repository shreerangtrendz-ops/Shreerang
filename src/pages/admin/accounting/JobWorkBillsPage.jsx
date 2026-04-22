import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import SyncHealthBar from '../../../components/accounting/SyncHealthBar';

// ══════════════════════════════════════════════════════════════════════════════
// JOB WORK BILLS PAGE — gold standard (4 tabs: Issue / REC / Jobwork / Expenses)
//
// Architecture: loads all rows for selected FY at once (needed for worker
// dropdown across all 4 tabs). Client-side 50-row pagination per tab.
//
// Critical column notes:
//   - jobwork_expenses: use expense_amount (no 'amount' column)
//   - rec_from_mill: mill_name is 97% NULL — use job_godown for display
//   - issue_to_mill: qty_mtrs = 0 for many rows — flagged with warning
// ══════════════════════════════════════════════════════════════════════════════

const T = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6', teal100:'#9FE1CB',
  gold:'#E8A800', goldLight:'#FFF8E8',
  navy:'#0B2E2B', green:'#1E9E5A', greenLight:'#E8FFF4',
  blue:'#2468C8', blueLight:'#EBF8FF',
  red:'#D93025', redLight:'#FFF5F5',
  orange:'#E67E22', orangeLight:'#FFF3E8',
  purple:'#7C3AED', purpleLight:'#F5F3FF',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95', textFaint:'#A8C9C3',
};

const fmt    = n => '₹' + Math.abs(Number(n||0)).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtL   = n => { const v=Math.abs(Number(n||0)); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:fmt(v); };
const fmtQty = n => Math.abs(Number(n||0)).toLocaleString('en-IN',{maximumFractionDigits:2});
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '—';

const PAGE = 50;
const FY_YEARS = [2022,2023,2024,2025,2026];

function getCurrentFY() {
  const now = new Date();
  const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear()-1;
  return { from:`${yr}-04-01`, to:`${yr+1}-03-31`, yr };
}

// ── Shared UI components ───────────────────────────────────────────────────

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

function Pagination({page, total, onPage}) {
  const totalPages = Math.ceil(total / PAGE);
  if (totalPages <= 1) return null;
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'12px 20px',borderTop:`1px solid ${T.border}`,background:T.bg}}>
      <span style={{fontSize:12,color:T.textMuted}}>
        {total.toLocaleString()} total · Page {page+1} of {totalPages}
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

function SyncBanner({maxDate}) {
  if (!maxDate) return null;
  const diffDays = Math.floor((Date.now() - new Date(maxDate).getTime()) / 86400000);
  if (diffDays < 30) return null;
  return (
    <div style={{background:T.goldLight,border:`1px solid ${T.gold}`,borderRadius:8,
      padding:'10px 14px',marginBottom:12,fontSize:12,color:'#92400E',display:'flex',alignItems:'center',gap:8}}>
      ⏳ <strong>Tally sync is {diffDays} days behind.</strong> Latest data: {fmtDate(maxDate)}. Switch to FY 22–24 to see synced data.
    </div>
  );
}

function typeChip(t) {
  const map = {
    'issued':   {bg:'#FEF3C7',col:'#B45309'},
    'received': {bg:'#D1FAE5',col:'#065F46'},
    'Jobwork':  {bg:'#DBEAFE',col:'#1D4ED8'},
    'Expenses': {bg:'#FEF3C7',col:'#92400E'},
  };
  const c = map[t] || {bg:'#F3F4F6',col:'#374151'};
  return <span style={{padding:'2px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:c.bg,color:c.col,whiteSpace:'nowrap'}}>{t||'—'}</span>;
}

// ── Table header cell ──────────────────────────────────────────────────────

function TH({label, right}) {
  return (
    <th style={{padding:'9px 12px',textAlign:right?'right':'left',fontSize:10,fontWeight:700,
      color:T.textMuted,textTransform:'uppercase',letterSpacing:.5,
      borderBottom:`1px solid ${T.border}`,background:T.bg,whiteSpace:'nowrap'}}>
      {label}
    </th>
  );
}

// ══════════════════════════════════════════════════════════════════════════════

export default function JobWorkBillsPage() {
  const navigate = useNavigate();
  const fy = getCurrentFY();

  const [activeTab, setActiveTab] = useState('issues');
  const [activeFY,  setActiveFY]  = useState(fy.yr);
  const [dateFrom,  setDateFrom]  = useState(fy.from);
  const [dateTo,    setDateTo]    = useState(fy.to);
  const [search,    setSearch]    = useState('');
  const [workerFilter, setWorkerFilter] = useState('all');
  const [expandedId,   setExpandedId]  = useState(null);

  // Raw data (full FY, all tabs)
  const [issues,   setIssues]   = useState([]);
  const [recMill,  setRecMill]  = useState([]);
  const [jobwork,  setJobwork]  = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [maxIssueDate, setMaxIssueDate] = useState(null);
  const [maxRecDate,   setMaxRecDate]   = useState(null);

  // Per-tab pagination pages
  const [issPage, setIssPage] = useState(0);
  const [recPage, setRecPage] = useState(0);
  const [jwPage,  setJwPage]  = useState(0);
  const [expPage, setExpPage] = useState(0);

  const setFY = yr => {
    setActiveFY(yr);
    setDateFrom(`${yr}-04-01`);
    setDateTo(`${yr+1}-03-31`);
    setExpandedId(null);
    setIssPage(0); setRecPage(0); setJwPage(0); setExpPage(0);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setExpandedId(null);
    setIssPage(0); setRecPage(0); setJwPage(0); setExpPage(0);

    // Fetch all data with pagination to bypass 1000-row Supabase default cap
    const fetchAll = async (table, select, filters = []) => {
      let all = [], page = 0, PG = 1000;
      while (true) {
        let q = supabase.from(table).select(select).order('voucher_date', {ascending:false}).range(page*PG, (page+1)*PG-1);
        filters.forEach(([method, ...args]) => { q = q[method](...args); });
        const { data } = await q;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PG) break;
        page++;
      }
      return all;
    };

    const issFields = 'id,lot_no,tally_voucher_no,voucher_date,mill_name,item_name,qty_mtrs,rate,amount,process_type,narration,tally_synced_at,is_sampling,destination_godown';
    const recFields = 'id,tally_voucher_no,voucher_date,mill_name,job_godown,our_godown,party_challan_no,lot_no,design_no,grey_lot_no,grey_item_name,finish_item_name,grey_issued_qty_mtrs,finish_qty_mtrs,grey_rate,grey_amount,job_rate,job_amount,finish_rate,finish_amount,shortage_mtrs,shortage_pct,grey_purchase_rate,grey_cost_actual,cumulative_cost_per_mtr,jw_allocated_cost,jw_allocation_pct,jw_voucher_number,narration,stage_no,issue_challan_no,weaver_name,quality_name,dest_godown,source_godown,short_qty_mtrs,gross_amount';

    const [issData, recData, jwData, expData, maxIssRes, maxRecRes] = await Promise.all([
      fetchAll('issue_to_mill', issFields, [['gte','voucher_date',dateFrom],['lte','voucher_date',dateTo]]),
      fetchAll('rec_from_mill', recFields, [['gte','voucher_date',dateFrom],['lte','voucher_date',dateTo]]),
      fetchAll('jobwork_expenses', '*', [['eq','voucher_type','Jobwork'],['gte','voucher_date',dateFrom],['lte','voucher_date',dateTo]]),
      fetchAll('jobwork_expenses', '*', [['eq','voucher_type','Expenses'],['gte','voucher_date',dateFrom],['lte','voucher_date',dateTo]]),
      supabase.from('issue_to_mill').select('voucher_date').order('voucher_date',{ascending:false}).limit(1),
      supabase.from('rec_from_mill').select('voucher_date').order('voucher_date',{ascending:false}).limit(1),
    ]);

    setIssues(issData   || []);
    setRecMill(recData  || []);
    setJobwork(jwData   || []);
    setExpenses(expData || []);
    if (maxIssRes.data?.[0]) setMaxIssueDate(maxIssRes.data[0].voucher_date);
    if (maxRecRes.data?.[0]) setMaxRecDate(maxRecRes.data[0].voucher_date);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // ── Client-side filtering ──────────────────────────────────────────────────

  const filterRows = (rows, nameField) => rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r[nameField]||'').toLowerCase().includes(q)
        || (r.lot_no||r.voucher_number||r.grey_lot_no||'').toLowerCase().includes(q)
        || (r.design_no||'').toLowerCase().includes(q)
        || (r.gp_number||r.supplier_invoice_no||r.party_challan_no||'').toLowerCase().includes(q);
  });

  const filteredIssues   = filterRows(issues.filter(r=>workerFilter==='all'||r.mill_name===workerFilter), 'mill_name');
  const filteredRec      = filterRows(recMill.filter(r=>workerFilter==='all'||(r.job_godown||r.mill_name)===workerFilter), 'job_godown');
  const filteredJobwork  = filterRows(jobwork.filter(r=>workerFilter==='all'||r.party_name===workerFilter), 'party_name');
  const filteredExpenses = filterRows(expenses.filter(r=>workerFilter==='all'||r.party_name===workerFilter), 'party_name');

  // Paginated slices
  const pagedIssues   = filteredIssues.slice(issPage*PAGE, (issPage+1)*PAGE);
  const pagedRec      = filteredRec.slice(recPage*PAGE, (recPage+1)*PAGE);
  const pagedJobwork  = filteredJobwork.slice(jwPage*PAGE, (jwPage+1)*PAGE);
  const pagedExpenses = filteredExpenses.slice(expPage*PAGE, (expPage+1)*PAGE);

  // ── Summary totals (from full filtered sets, not paged slices) ─────────────

  const totalIssueQty = filteredIssues.reduce((s,r)=>s+Math.abs(Number(r.qty_mtrs||0)),0);
  const totalIssueAmt = filteredIssues.reduce((s,r)=>s+Math.abs(Number(r.amount||0)),0);
  const totalRecQty   = filteredRec.reduce((s,r)=>s+Math.abs(Number(r.finish_qty_mtrs||0)),0);
  const totalJWAmt    = filteredJobwork.reduce((s,r)=>s+Math.abs(Number(r.expense_amount||0)),0);
  const totalExpAmt   = filteredExpenses.reduce((s,r)=>s+Math.abs(Number(r.expense_amount||0)),0);

  // Workers dropdown (all tabs combined)
  const allWorkers = [...new Set([
    ...issues.map(r=>r.mill_name),
    ...recMill.map(r=>r.job_godown||r.mill_name),
    ...jobwork.map(r=>r.party_name),
    ...expenses.map(r=>r.party_name),
  ].filter(Boolean))].sort();

  // ── Tab renderers ──────────────────────────────────────────────────────────

  const renderIssues = () => (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
      <SyncBanner maxDate={maxIssueDate}/>
      {pagedIssues.length === 0 ? (
        <div style={{padding:50,textAlign:'center',color:T.textMuted}}>
          No Issue to Mill entries for this period. Sync reached {fmtDate(maxIssueDate)}.
        </div>
      ) : (<>
        {/* Mobile Cards */}
        <div className="acct-mobile-cards">
          {pagedIssues.map(r => {
            const displayQty = Math.abs(Number(r.qty_mtrs||0));
            return (
              <div key={r.id} className="acct-mobile-card"
                onClick={()=>setExpandedId(expandedId==='ITM-'+r.id?null:'ITM-'+r.id)}>
                <div className="amc-header">
                  <div>
                    <div className="amc-design-badge">{r.lot_no||r.tally_voucher_no||'—'}</div>
                    <div className="amc-design-sub">{r.mill_name||r.destination_godown||'—'}</div>
                  </div>
                  <div>
                    <div className="amc-cost">{displayQty===0?'0 m ⚠':`${fmtQty(displayQty)} m`}</div>
                    <div className="amc-cost-label">issued qty</div>
                  </div>
                </div>
                <div className="amc-row">
                  <span className="amc-row-label">Date</span>
                  <span className="amc-row-val">{fmtDate(r.voucher_date)}</span>
                </div>
                <div className="amc-row">
                  <span className="amc-row-label">Item</span>
                  <span className="amc-row-val" style={{fontSize:12}}>{r.item_name||'—'}</span>
                </div>
                <div className="amc-row">
                  <span className="amc-row-label">Amount</span>
                  <span className="amc-row-val cell-financial">{fmt(r.amount)}</span>
                </div>
                <div className="amc-badges">
                  {r.process_type && <span className="badge bteal">{r.process_type}</span>}
                  {displayQty===0 && <span className="badge bred">⚠ qty=0</span>}
                </div>
              </div>
            );
          })}
        </div>
        {/* Table (desktop) */}
        <div className="acct-table-wrap" style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
            <thead><tr>
              <TH label="Tally Voucher"/>
              <TH label="Date"/>
              <TH label="Mill / Godown"/>
              <TH label="Item / Fabric"/>
              <TH label="Lot No"/>
              <TH label="Type"/>
              <TH label="Qty (m)" right/>
              <TH label="Rate" right/>
              <TH label="Amount" right/>
              <TH label=""/>
            </tr></thead>
            <tbody>
              {pagedIssues.map((r,i) => {
                const isExp = expandedId === 'ITM-'+r.id;
                const displayQty = Math.abs(Number(r.qty_mtrs||0));
                return (
                  <tr key={r.id} onClick={()=>setExpandedId(isExp?null:'ITM-'+r.id)}
                    style={{borderBottom:`1px solid ${T.border}`,background:isExp?T.tealLight:i%2===0?T.surface:T.bg,cursor:'pointer'}}>
                    <td style={{padding:'9px 12px',fontFamily:"'DM Mono',monospace",fontSize:11,color:T.textMuted,whiteSpace:'nowrap'}}>{r.tally_voucher_no||r.lot_no||'—'}</td>
                    <td style={{padding:'9px 12px',color:T.textMuted,whiteSpace:'nowrap'}}>{fmtDate(r.voucher_date)}</td>
                    <td style={{padding:'9px 12px',fontWeight:600,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.mill_name||r.destination_godown||'—'}</td>
                    <td style={{padding:'9px 12px',fontSize:11,color:T.textMuted,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.item_name||'—'}</td>
                    <td style={{padding:'9px 12px',fontFamily:"'DM Mono',monospace",fontSize:11,color:T.teal,fontWeight:600}}>{r.lot_no||'—'}</td>
                    <td style={{padding:'9px 12px'}}>{typeChip(r.process_type||'issued')}</td>
                    <td style={{padding:'9px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontWeight:600,color:displayQty===0?T.red:T.text}}>
                      {displayQty===0
                        ? <span title="qty_mtrs=0 in Tally — use grey_purchase.actual_qty_mtrs via lot_no join">0 m ⚠</span>
                        : `${fmtQty(displayQty)} m`}
                    </td>
                    <td style={{padding:'9px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",color:T.textMuted}}>{r.rate?fmt(r.rate):'—'}</td>
                    <td style={{padding:'9px 12px',textAlign:'right',fontWeight:700,color:T.gold,fontFamily:"'DM Mono',monospace"}}>{fmt(r.amount)}</td>
                    <td style={{padding:'9px 12px',textAlign:'center',fontSize:16,color:isExp?T.teal:T.textFaint}}>{isExp?'▲':'▼'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Expanded rows rendered separately to avoid <tr> nesting issues */}
          {pagedIssues.map(r => {
            if (expandedId !== 'ITM-'+r.id) return null;
            return (
              <div key={'exp-ITM-'+r.id} style={{padding:'16px 18px',background:'#F8FFFE',borderTop:`1px solid ${T.border}`,borderBottom:`2px solid ${T.teal}`}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:10}}>
                  {[
                    ['Lot No',        r.lot_no],
                    ['Tally Voucher', r.tally_voucher_no],
                    ['Date',          fmtDate(r.voucher_date)],
                    ['Mill Name',     r.mill_name||r.destination_godown],
                    ['Item / Fabric', r.item_name],
                    ['Qty (Mtrs)',    fmtQty(r.qty_mtrs)+' m'],
                    ['Rate / Mtr',   r.rate ? fmt(r.rate)+'/m' : '—'],
                    ['Amount',       fmt(r.amount)],
                    ['Process Type', r.process_type||'issued'],
                    ['Destination',  r.destination_godown||'—'],
                    ['Sampling?',    r.is_sampling ? 'Yes — Sampling' : 'No — Production'],
                    ['Narration',    r.narration||'—'],
                  ].map(([l,v]) => (
                    <div key={l} style={{background:T.surface,borderRadius:6,padding:'6px 10px',border:`1px solid ${T.border}`}}>
                      <div style={{fontSize:9,color:T.textMuted,textTransform:'uppercase',letterSpacing:.4,marginBottom:2}}>{l}</div>
                      <div style={{fontSize:12,fontWeight:500,color:T.text}}>{v||'—'}</div>
                    </div>
                  ))}
                </div>
                {Math.abs(Number(r.qty_mtrs||0)) === 0 && (
                  <div style={{padding:'8px 12px',background:T.goldLight,borderRadius:6,fontSize:11,color:'#92400E',border:`1px solid ${T.gold}44`}}>
                    ⚠ <strong>qty_mtrs = 0</strong> — Known Tally export issue for newer entries. Actual metres available via{' '}
                    <code>grey_purchase.actual_qty_mtrs</code> using lot_no join: <strong>{r.lot_no}</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>{/* end acct-table-wrap */}
      </>)}
      <Pagination page={issPage} total={filteredIssues.length} onPage={p=>{setIssPage(p);setExpandedId(null);}}/>
    </div>
  );

  const renderRecFromMill = () => {
    const totalShortage = filteredRec.reduce((s,r)=>s+Math.abs(Number(r.shortage_mtrs||0)),0);
    const withCost = filteredRec.filter(r=>Number(r.cumulative_cost_per_mtr||0)>0);
    const avgCost = withCost.length > 0
      ? withCost.reduce((s,r)=>s+Math.abs(Number(r.cumulative_cost_per_mtr||0)),0) / withCost.length
      : 0;
    return (
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
        <SyncBanner maxDate={maxRecDate}/>
        <div style={{padding:'8px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',
          justifyContent:'space-between',alignItems:'center',background:T.bg,flexWrap:'wrap',gap:8}}>
          <span style={{fontSize:12,color:T.textMuted,fontWeight:600}}>{filteredRec.length} entries</span>
          <div style={{display:'flex',gap:16,fontSize:12}}>
            <span>Received: <strong style={{color:T.green}}>{fmtQty(totalRecQty)} m</strong></span>
            <span>Shortage: <strong style={{color:T.red}}>{fmtQty(totalShortage)} m</strong></span>
            {avgCost > 0 && <span>Avg Cost: <strong style={{color:T.teal}}>{fmt(avgCost)}/m</strong></span>}
          </div>
        </div>
        {pagedRec.length === 0 ? (
          <div style={{padding:50,textAlign:'center',color:T.textMuted}}>
            No REC FROM MILL entries for this period. Sync reached {fmtDate(maxRecDate)}.
          </div>
        ) : (<>
          {/* Mobile Cards */}
          <div className="acct-mobile-cards">
            {pagedRec.map(r => {
              const shortPct   = Math.abs(Number(r.shortage_pct||0));
              const costPerMtr = Math.abs(Number(r.cumulative_cost_per_mtr||0));
              const mill       = r.job_godown||r.mill_name||'—';
              return (
                <div key={r.id} className="acct-mobile-card"
                  onClick={()=>setExpandedId(expandedId==='REC-'+r.id?null:'REC-'+r.id)}>
                  <div className="amc-header">
                    <div>
                      <div className="amc-design-badge">{r.design_no?`D${r.design_no}`:'Primary'}</div>
                      <div className="amc-design-sub">{mill}</div>
                    </div>
                    <div>
                      <div className="amc-cost">{costPerMtr>0?`₹${costPerMtr.toFixed(2)}`:'—'}</div>
                      <div className="amc-cost-label">cost / mtr</div>
                    </div>
                  </div>
                  <div className="amc-row">
                    <span className="amc-row-label">Date</span>
                    <span className="amc-row-val">{fmtDate(r.voucher_date)}</span>
                  </div>
                  <div className="amc-row">
                    <span className="amc-row-label">Lot</span>
                    <span className="amc-row-val" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>{r.grey_lot_no||'—'}</span>
                  </div>
                  <div className="amc-row">
                    <span className="amc-row-label">Finish Qty</span>
                    <span className="amc-row-val" style={{fontWeight:700}}>{fmtQty(r.finish_qty_mtrs)} m</span>
                  </div>
                  <div className="amc-row">
                    <span className="amc-row-label">Job Amt</span>
                    <span className="amc-row-val">{r.job_amount?fmt(r.job_amount):'—'}</span>
                  </div>
                  <div className="amc-badges">
                    {shortPct>15 && <span className="badge bred">⚠ {shortPct.toFixed(1)}% short</span>}
                    {shortPct>0&&shortPct<=15 && <span className="badge borg">{shortPct.toFixed(1)}% short</span>}
                    {r.recon_status==='matched' && <span className="badge bgreen">✔ matched</span>}
                    {r.recon_status==='pending' && <span className="badge bgold">pending</span>}
                    {r.recon_status==='mismatch' && <span className="badge bred">mismatch</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Table (desktop) */}
          <div className="acct-table-wrap" style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
              <thead><tr>
                <TH label="Design No"/>
                <TH label="Date"/>
                <TH label="Mill (Godown)"/>
                <TH label="Grey Lot"/>
                <TH label="Finished Fabric"/>
                <TH label="Recv Qty" right/>
                <TH label="Short %" right/>
                <TH label="Cost/Mtr" right/>
                <TH label=""/>
              </tr></thead>
              <tbody>
                {pagedRec.map((r,i) => {
                  const isExp = expandedId === 'REC-'+r.id;
                  const shortPct   = Math.abs(Number(r.shortage_pct||0));
                  const shortColor = shortPct>15?T.red:shortPct>8?T.orange:T.green;
                  const costPerMtr = Math.abs(Number(r.cumulative_cost_per_mtr||0));
                  const millDisplay = r.job_godown || r.mill_name || '—';
                  return (
                    <tr key={r.id} onClick={()=>setExpandedId(isExp?null:'REC-'+r.id)}
                      style={{borderBottom:`1px solid ${T.border}`,background:isExp?T.tealLight:i%2===0?T.surface:T.bg,cursor:'pointer'}}>
                      <td style={{padding:'9px 12px',fontFamily:"'DM Mono',monospace",fontSize:12,color:T.purple,fontWeight:700}}>{r.design_no||'—'}</td>
                      <td style={{padding:'9px 12px',color:T.textMuted,whiteSpace:'nowrap'}}>{fmtDate(r.voucher_date)}</td>
                      <td style={{padding:'9px 12px',fontWeight:500,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={millDisplay}>{millDisplay}</td>
                      <td style={{padding:'9px 12px',fontFamily:"'DM Mono',monospace",fontSize:11,color:T.teal,fontWeight:600}}>{r.grey_lot_no||r.lot_no||'—'}</td>
                      <td style={{padding:'9px 12px',fontSize:11,color:T.textMuted,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.finish_item_name||'—'}</td>
                      <td style={{padding:'9px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontWeight:600,color:T.green}}>{fmtQty(r.finish_qty_mtrs)} m</td>
                      <td style={{padding:'9px 12px',textAlign:'right',fontWeight:700,color:shortColor}}>{shortPct>0?`${shortPct.toFixed(1)}%`:'—'}</td>
                      <td style={{padding:'9px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontWeight:700,color:costPerMtr>0?T.teal:T.textMuted}}>{costPerMtr>0?`${fmt(costPerMtr)}/m`:'—'}</td>
                      <td style={{padding:'9px 12px',textAlign:'center',fontSize:16,color:isExp?T.teal:T.textFaint}}>{isExp?'▲':'▼'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pagedRec.map(r => {
              if (expandedId !== 'REC-'+r.id) return null;
              const shortPct   = Math.abs(Number(r.shortage_pct||0));
              const costPerMtr = Math.abs(Number(r.cumulative_cost_per_mtr||0));
              return (
                <div key={'exp-REC-'+r.id} style={{padding:'16px 18px',background:'#F8FFFE',borderTop:`1px solid ${T.border}`,borderBottom:`2px solid ${T.teal}`}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>

                    {/* Col 1: Voucher & Mapping */}
                    <div style={{background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                      <div style={{fontSize:10,fontWeight:700,color:T.teal,textTransform:'uppercase',marginBottom:8,letterSpacing:.5}}>Voucher &amp; Mapping</div>
                      {[
                        ['Tally Voucher No',    r.tally_voucher_no],
                        ['Date',                fmtDate(r.voucher_date)],
                        ['Mill Name',           r.mill_name||'—'],
                        ['Job Godown',          r.job_godown||'—'],
                        ['Our Godown',          r.our_godown||'Main Location'],
                        ['Party Challan No',    r.party_challan_no||'—'],
                        ['Issue Challan No',    r.issue_challan_no||'—'],
                        ['Grey Lot No',         r.grey_lot_no||r.lot_no||'—'],
                        ['Design No',           r.design_no||'—'],
                        ['Weaver',              r.weaver_name||'—'],
                        ['Quality',             r.quality_name||'—'],
                        ['Stage',               r.stage_no||'1'],
                        ['Narration',           r.narration||'—'],
                      ].map(([l,v]) => (
                        <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12,gap:6}}>
                          <span style={{color:T.textMuted,flexShrink:0}}>{l}</span>
                          <span style={{color:T.text,fontWeight:['Design No','Grey Lot No','Party Challan No'].includes(l)?700:500,
                            fontFamily:['Tally Voucher No','Grey Lot No','Design No','Party Challan No'].includes(l)?"'DM Mono',monospace":'inherit',
                            textAlign:'right',wordBreak:'break-word'}}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Col 2: Quantity & Shortage */}
                    <div style={{background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                      <div style={{fontSize:10,fontWeight:700,color:T.green,textTransform:'uppercase',marginBottom:8,letterSpacing:.5}}>Quantity &amp; Shortage</div>
                      {[
                        ['Grey Fabric',       r.grey_item_name||'—'],
                        ['Finished Fabric',   r.finish_item_name||'—'],
                        ['Grey Issued Qty',   r.grey_issued_qty_mtrs?`${fmtQty(r.grey_issued_qty_mtrs)} m`:'—'],
                        ['Finished Recv Qty', r.finish_qty_mtrs?`${fmtQty(r.finish_qty_mtrs)} m`:'—'],
                        ['Shortage',          r.shortage_mtrs?`${fmtQty(Math.abs(r.shortage_mtrs))} m (${shortPct.toFixed(1)}%)`:'—'],
                        ['Short Qty (UDF)',   r.short_qty_mtrs?`${fmtQty(r.short_qty_mtrs)} m`:'—'],
                        ['Source Godown',     r.source_godown||'—'],
                        ['Dest Godown',       r.dest_godown||'Main Location'],
                      ].map(([l,v]) => (
                        <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12,gap:6}}>
                          <span style={{color:T.textMuted,flexShrink:0}}>{l}</span>
                          <span style={{color:l==='Shortage'&&shortPct>15?T.red:T.text,fontWeight:l.includes('Qty')?600:500,textAlign:'right'}}>{v}</span>
                        </div>
                      ))}
                      {shortPct > 15 && (
                        <div style={{marginTop:8,padding:'6px 10px',background:T.redLight,borderRadius:6,fontSize:11,color:T.red,fontWeight:600}}>
                          ⚠ High shortage ({shortPct.toFixed(1)}%) — may indicate wastage or sample cuts
                        </div>
                      )}
                    </div>

                    {/* Col 3: Cost Chain */}
                    <div style={{background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                      <div style={{fontSize:10,fontWeight:700,color:T.gold,textTransform:'uppercase',marginBottom:8,letterSpacing:.5}}>Cost Chain</div>
                      {[
                        ['Grey Rate',          r.grey_rate          ? fmt(r.grey_rate)+'/m'          : '—'],
                        ['Grey Amount',        r.grey_amount        ? fmt(r.grey_amount)              : '—'],
                        ['Grey Purchase Rate', r.grey_purchase_rate ? fmt(r.grey_purchase_rate)+'/m'  : '—'],
                        ['Grey Cost (Actual)', r.grey_cost_actual   ? fmt(r.grey_cost_actual)         : '—'],
                        ['Job Rate',           r.job_rate           ? fmt(r.job_rate)+'/m'            : '—'],
                        ['Job Amount',         r.job_amount         ? fmt(r.job_amount)               : '—'],
                        ['Gross Amount',       r.gross_amount       ? fmt(r.gross_amount)             : '—'],
                        ['Finish Rate',        r.finish_rate        ? fmt(r.finish_rate)+'/m'         : '—'],
                        ['Finish Amount',      r.finish_amount      ? fmt(r.finish_amount)            : '—'],
                      ].map(([l,v]) => (
                        <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12,gap:6}}>
                          <span style={{color:T.textMuted,flexShrink:0}}>{l}</span>
                          <span style={{color:T.text,fontWeight:500,fontFamily:"'DM Mono',monospace",textAlign:'right'}}>{v}</span>
                        </div>
                      ))}
                      <div style={{marginTop:10,padding:'10px 12px',background:costPerMtr>0?T.greenLight:T.bg,
                        borderRadius:8,border:`1px solid ${costPerMtr>0?T.green:T.border}44`}}>
                        <div style={{fontSize:9,fontWeight:700,color:T.textMuted,textTransform:'uppercase',marginBottom:4,letterSpacing:.5}}>Cumulative Cost / Mtr</div>
                        <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:20,color:costPerMtr>0?T.teal:T.textMuted}}>
                          {costPerMtr > 0 ? `${fmt(costPerMtr)}/m` : 'Not computed'}
                        </div>
                      </div>
                      {(r.jw_allocated_cost||r.jw_voucher_number) && (
                        <div style={{marginTop:8,padding:'8px 10px',background:T.blueLight,borderRadius:6,border:`1px solid ${T.blue}22`}}>
                          <div style={{fontSize:9,fontWeight:700,color:T.blue,textTransform:'uppercase',marginBottom:4,letterSpacing:.5}}>JW Bill Allocation</div>
                          {r.jw_voucher_number && <div style={{fontSize:11}}>Voucher: <strong style={{fontFamily:"'DM Mono',monospace"}}>{r.jw_voucher_number}</strong></div>}
                          {r.jw_allocated_cost>0 && <div style={{fontSize:11}}>Allocated: <strong>{fmt(r.jw_allocated_cost)}</strong></div>}
                          {r.jw_allocation_pct>0 && <div style={{fontSize:11}}>Share: <strong>{Math.abs(Number(r.jw_allocation_pct)).toFixed(1)}%</strong></div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>{/* end acct-table-wrap */}
        </>)}
        <Pagination page={recPage} total={filteredRec.length} onPage={p=>{setRecPage(p);setExpandedId(null);}}/>
      </div>
    );
  };

  const renderJWOrExp = (rows, pagedRows, total, totalAmt, pageSetter, currentPage, emptyLabel) => (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
      <div style={{padding:'8px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',
        justifyContent:'space-between',alignItems:'center',background:T.bg}}>
        <span style={{fontSize:12,color:T.textMuted,fontWeight:600}}>{rows.length} entries</span>
        <span style={{fontSize:12,fontWeight:700,color:T.gold}}>Total: {fmtL(totalAmt)}</span>
      </div>
      {pagedRows.length === 0 ? (
        <div style={{padding:50,textAlign:'center',color:T.textMuted}}>{emptyLabel}</div>
      ) : (<>
        {/* Mobile Cards */}
        <div className="acct-mobile-cards">
          {pagedRows.map(r => {
            const gst = Math.abs(Number(r.cgst_amount||0))+Math.abs(Number(r.sgst_amount||0))+Math.abs(Number(r.igst_amount||0));
            return (
              <div key={r.id} className="acct-mobile-card"
                onClick={()=>setExpandedId(expandedId==='JW-'+r.id?null:'JW-'+r.id)}>
                <div className="amc-header">
                  <div>
                    <div className="amc-design-badge">{r.voucher_number||'—'}</div>
                    <div className="amc-design-sub">{r.party_name||'—'}</div>
                  </div>
                  <div>
                    <div className="amc-cost" style={{color:'#D4920A'}}>{fmt(r.total_amount)}</div>
                    <div className="amc-cost-label">total</div>
                  </div>
                </div>
                <div className="amc-row">
                  <span className="amc-row-label">Date</span>
                  <span className="amc-row-val">{fmtDate(r.voucher_date)}</span>
                </div>
                <div className="amc-row">
                  <span className="amc-row-label">Expense Amt</span>
                  <span className="amc-row-val cell-financial">{fmt(r.expense_amount)}</span>
                </div>
                {gst>0 && (
                  <div className="amc-row">
                    <span className="amc-row-label">GST</span>
                    <span className="amc-row-val">{fmt(gst)}</span>
                  </div>
                )}
                <div className="amc-badges">
                  {r.voucher_type && <span className="badge bteal">{r.voucher_type}</span>}
                  {r.gp_number && <span className="badge bblue">GP: {r.gp_number}</span>}
                  {r.supplier_invoice_no && <span className="badge borg">Inv: {r.supplier_invoice_no}</span>}
                </div>
              </div>
            );
          })}
        </div>
        {/* Table (desktop) */}
        <div className="acct-table-wrap" style={{overflowX:'auto'}}>
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
              {pagedRows.map((r,i) => {
                const isExp = expandedId === 'JW-'+r.id;
                const gst = Math.abs(Number(r.cgst_amount||0))+Math.abs(Number(r.sgst_amount||0))+Math.abs(Number(r.igst_amount||0));
                return (
                  <tr key={r.id} onClick={()=>setExpandedId(isExp?null:'JW-'+r.id)}
                    style={{borderBottom:`1px solid ${T.border}`,background:isExp?T.tealLight:i%2===0?T.surface:T.bg,cursor:'pointer'}}>
                    <td style={{padding:'9px 12px',fontFamily:"'DM Mono',monospace",fontSize:11,color:T.blue,fontWeight:700,whiteSpace:'nowrap'}}>{r.voucher_number||'—'}</td>
                    <td style={{padding:'9px 12px',color:T.textMuted,whiteSpace:'nowrap'}}>{fmtDate(r.voucher_date)}</td>
                    <td style={{padding:'9px 12px',fontWeight:600,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.party_name||'—'}</td>
                    <td style={{padding:'9px 12px'}}>{typeChip(r.voucher_type)}</td>
                    <td style={{padding:'9px 12px',fontSize:11,color:T.orange,fontWeight:600}}>{r.supplier_invoice_no||'—'}</td>
                    <td style={{padding:'9px 12px',fontSize:11,color:T.teal,fontWeight:600,fontFamily:"'DM Mono',monospace"}}>{r.gp_number||'—'}</td>
                    <td style={{padding:'9px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontWeight:700}}>{fmt(r.expense_amount)}</td>
                    <td style={{padding:'9px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:11,color:T.textMuted}}>{gst>0?fmt(gst):'—'}</td>
                    <td style={{padding:'9px 12px',textAlign:'right',fontWeight:700,color:T.gold,fontFamily:"'DM Mono',monospace"}}>{fmt(r.total_amount)}</td>
                    <td style={{padding:'9px 12px',textAlign:'center',fontSize:16,color:isExp?T.teal:T.textFaint}}>{isExp?'▲':'▼'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pagedRows.map(r => {
            if (expandedId !== 'JW-'+r.id) return null;
            return (
              <div key={'exp-JW-'+r.id} style={{padding:'16px 18px',background:'#F8FFFE',borderTop:`1px solid ${T.border}`,borderBottom:`2px solid ${T.teal}`}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>

                  {/* Voucher Info */}
                  <div style={{background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:10,fontWeight:800,color:T.blue,textTransform:'uppercase',marginBottom:8,letterSpacing:.5}}>📋 Voucher</div>
                    {[
                      ['Voucher No',        r.voucher_number],
                      ['Type',              r.voucher_type],
                      ['Date',              fmtDate(r.voucher_date)],
                      ['Supplier Invoice',  r.supplier_invoice_no||'—'],
                      ['Supplier Inv Date', r.supplier_invoice_date?fmtDate(r.supplier_invoice_date):'—'],
                      ['GP Number',         r.gp_number||'—'],
                      ['Bill Ref',          r.bill_ref||'—'],
                      ['Entered By',        r.entered_by||'—'],
                      ['Narration',         r.narration||'—'],
                    ].filter(([,v])=>v&&v!=='—').map(([k,v])=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12,gap:4}}>
                        <span style={{color:T.textMuted,fontSize:11,flexShrink:0}}>{k}</span>
                        <span style={{color:T.text,fontWeight:600,textAlign:'right',wordBreak:'break-word',maxWidth:'55%'}}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Party + GST Reg Type — color coded */}
                  <div style={{background:T.surface,borderRadius:8,padding:'12px 14px',border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:10,fontWeight:800,color:T.teal,textTransform:'uppercase',marginBottom:8,letterSpacing:.5}}>🏭 Party</div>
                    <div style={{fontWeight:700,fontSize:14,color:T.text,marginBottom:4}}>{r.party_name}</div>
                    {r.party_gstin&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:T.textMuted,marginBottom:8}}>{r.party_gstin}</div>}
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:9,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,marginBottom:3}}>GST Registration</div>
                      <span style={{
                        padding:'3px 10px',borderRadius:6,fontSize:11,fontWeight:700,
                        background:(r.gst_reg_type||'').toLowerCase().includes('unreg')||(r.gst_reg_type||'').toLowerCase().includes('consumer')?T.orangeLight:T.greenLight,
                        color:(r.gst_reg_type||'').toLowerCase().includes('unreg')||(r.gst_reg_type||'').toLowerCase().includes('consumer')?T.orange:T.green,
                      }}>{r.gst_reg_type||'Unknown'}</span>
                      {(r.gst_reg_type||'').toLowerCase().includes('unreg')&&(
                        <div style={{fontSize:10,color:T.orange,marginTop:4}}>⚠ Unregistered — Reverse Charge. ITC not claimable.</div>
                      )}
                    </div>
                    {[['Place of Supply', r.place_of_supply]].filter(([,v])=>v).map(([k,v])=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12}}>
                        <span style={{color:T.textMuted,fontSize:11}}>{k}</span>
                        <span style={{color:T.text,fontWeight:500}}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Amount Breakdown — Expense Ledger + TDS waterfall */}
                  <div style={{background:'#FFFBEB',borderRadius:8,padding:'12px 14px',border:`2px solid ${T.gold}`}}>
                    <div style={{fontSize:10,fontWeight:800,color:T.gold,textTransform:'uppercase',marginBottom:8,letterSpacing:.5}}>₹ Amount & P&L</div>
                    <div style={{marginBottom:10,padding:'6px 8px',background:'#fff',borderRadius:6,border:`1px solid ${T.gold}44`}}>
                      <div style={{fontSize:9,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,marginBottom:2}}>Expense Ledger (P&L Account)</div>
                      <div style={{fontSize:13,fontWeight:700,color:T.navy}}>{r.expense_ledger||'—'}</div>
                    </div>
                    {[
                      ['Expense Amount',        fmt(r.expense_amount),  T.text,   false],
                      ...(r.cgst_amount>0?[['+ CGST',                   fmt(r.cgst_amount),  T.orange, false]]:[]),
                      ...(r.sgst_amount>0?[['+ SGST',                   fmt(r.sgst_amount),  T.orange, false]]:[]),
                      ...(r.igst_amount>0?[['+ IGST',                   fmt(r.igst_amount),  T.orange, false]]:[]),
                      ...(r.round_off?[['Round Off',                     `₹${r.round_off}`,  T.textMuted,false]]:[]),
                      ...(r.tds_amount>0?[['− TDS Deducted (Sec 194C)', fmt(r.tds_amount),  T.red,    true]]:[]),
                    ].map(([k,v,c,isTds])=>(
                      <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:`1px solid ${T.gold}22`,fontSize:12}}>
                        <span style={{color:isTds?T.red:T.textMuted,fontWeight:isTds?700:400}}>{k}</span>
                        <span style={{color:c,fontWeight:isTds?700:600,fontFamily:"'DM Mono',monospace"}}>{v}</span>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderTop:`2px solid ${T.gold}`,marginTop:4}}>
                      <span style={{fontWeight:800,fontSize:12,color:T.text}}>Net Payable</span>
                      <span style={{fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:14,color:T.green}}>
                        {fmt(Number(r.total_amount||0)-Number(r.tds_amount||0))}
                      </span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:11}}>
                      <span style={{color:T.textMuted}}>Gross Total</span>
                      <span style={{fontFamily:"'DM Mono',monospace",fontWeight:600,color:T.textMuted}}>{fmt(r.total_amount)}</span>
                    </div>
                  </div>
                </div>
                {r.gp_number && (
                  <button onClick={()=>navigate(`/admin/accounting/process-issues?search=${r.gp_number}`)}
                    style={{padding:'6px 12px',background:T.teal,color:'#fff',border:'none',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                    🔗 Find Issue to Mill for GP {r.gp_number}
                  </button>
                )}
              </div>
            );
          })}
        </div>{/* end acct-table-wrap */}
      </>)}
      <Pagination page={currentPage} total={rows.length} onPage={p=>{pageSetter(p);setExpandedId(null);}}/>
    </div>
  );

  // ── Tabs config ────────────────────────────────────────────────────────────

  const TABS = [
    {key:'issues',   label:'Issue to Mill',  count:filteredIssues.length,   color:T.orange},
    {key:'rec',      label:'REC from Mill',  count:filteredRec.length,      color:T.green},
    {key:'jobwork',  label:'Jobwork Bills',  count:filteredJobwork.length,  color:T.teal},
    {key:'expenses', label:'Other Expenses', count:filteredExpenses.length, color:T.purple},
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh',padding:'20px 24px'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,color:T.text,margin:0}}>Job Work Bills</h1>
          <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>
            Issue to Mill · REC from Mill · Jobwork Bills · Other Expenses — Tally synced
          </div>
        </div>
        <button onClick={load} disabled={loading}
          style={{padding:'7px 16px',background:T.teal,color:'#fff',border:'none',borderRadius:7,fontWeight:700,fontSize:12,cursor:'pointer',opacity:loading?0.6:1}}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Sync Health Bar */}
      <SyncHealthBar
        tableName="issue_to_mill"
        recordCount={issues.length + recMill.length + jobwork.length + expenses.length}
      />

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
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        <SummaryCard label="Issue to Mill"  value={`${fmtQty(totalIssueQty)} m`} sub={`${filteredIssues.length} challans`}    color={T.orange}/>
        <SummaryCard label="REC from Mill"  value={`${fmtQty(totalRecQty)} m`}   sub={`${filteredRec.length} entries`}         color={T.green}/>
        <SummaryCard label="Issue Amount"   value={fmtL(totalIssueAmt)}           sub="at job rate"                            color={T.blue}/>
        <SummaryCard label="Jobwork Bills"  value={fmtL(totalJWAmt)}              sub={`${filteredJobwork.length} bills`}      color={T.teal}/>
        <SummaryCard label="Other Expenses" value={fmtL(totalExpAmt)}             sub={`${filteredExpenses.length} entries`}   color={T.purple}/>
      </div>

      {/* Filters */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 18px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div style={{flex:'1 1 200px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>Search</div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Lot no, design, party, voucher, GP no…"
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,color:T.text,background:'#fff',outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{flex:'1 1 180px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>Mill / Party</div>
          <select value={workerFilter} onChange={e=>setWorkerFilter(e.target.value)}
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,color:T.text,background:'#fff',outline:'none'}}>
            <option value="all">All</option>
            {allWorkers.map(w=><option key={w} value={w}>{w}</option>)}
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
        <button onClick={load} disabled={loading}
          style={{padding:'8px 18px',background:T.teal,color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',height:34,opacity:loading?0.6:1}}>
          Apply
        </button>
      </div>

      {/* Content Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:12,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:4,width:'fit-content'}}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={()=>setActiveTab(tab.key)}
            style={{padding:'6px 14px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,
              transition:'all .15s',display:'flex',alignItems:'center',gap:6,
              background:activeTab===tab.key?tab.color:'transparent',
              color:activeTab===tab.key?'#fff':T.textMuted}}>
            {tab.label}
            {tab.count > 0 && (
              <span style={{background:activeTab===tab.key?'rgba(255,255,255,.3)':tab.color,color:activeTab===tab.key?'#fff':'#fff',
                borderRadius:10,padding:'1px 7px',fontSize:10,fontWeight:800}}>
                {tab.count.toLocaleString('en-IN')}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:60,textAlign:'center',color:T.textMuted}}>
          Loading…
        </div>
      ) : (
        <>
          {activeTab==='issues'   && renderIssues()}
          {activeTab==='rec'      && renderRecFromMill()}
          {activeTab==='jobwork'  && renderJWOrExp(filteredJobwork,  pagedJobwork,  filteredJobwork.length,  totalJWAmt,  setJwPage,  jwPage,  `No Jobwork Bills in this period. Tally sync reached ${fmtDate(maxIssueDate)}.`)}
          {activeTab==='expenses' && renderJWOrExp(filteredExpenses, pagedExpenses, filteredExpenses.length, totalExpAmt, setExpPage, expPage, `No Expense entries in this period. Tally sync reached ${fmtDate(maxIssueDate)}.`)}
        </>
      )}

      {/* Footer legend */}
      <div style={{marginTop:14,fontSize:11,color:T.textFaint,textAlign:'center'}}>
        Issue to Mill = fabric sent to mill (Tally Stock Journal) ·
        REC from Mill = finished fabric received back with costing ·
        Jobwork Bills = payment vouchers for processing ·
        Other Expenses = transport, electricity, misc
      </div>
    </div>
  );
}
