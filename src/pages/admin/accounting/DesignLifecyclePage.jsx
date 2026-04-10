import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN LIFECYCLE PAGE — Complete journey: Grey → Mill → REC → Sale
   Route: /admin/accounting/design-lifecycle/:designNo
   Also:  /admin/accounting/design-lifecycle?lot=<lotNo>
   ═══════════════════════════════════════════════════════════════════════════ */

const T = {
  teal:'#2BA898',   tealDark:'#0B2E2B', tealLight:'#EEF8F6', teal20:'#2BA89830',
  blue:'#2468C8',   blueLight:'#EBF8FF', blue20:'#2468C830',
  amber:'#E67E22',  amberLight:'#FFF3E8', amber20:'#E67E2230',
  green:'#1E9E5A',  greenLight:'#E8FFF4', green20:'#1E9E5A30',
  purple:'#9B59B6', purpleLight:'#F5EEFF', purple20:'#9B59B630',
  red:'#D93025',    redLight:'#FFF5F5',
  gold:'#E8A800',   goldLight:'#FFF8E8',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B',   textMuted:'#6A9B95', textFaint:'#A8C9C3',
};

const fmt     = n => '₹' + Math.abs(Number(n||0)).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtRate = n => n != null && n !== '' ? `₹${Math.abs(Number(n)).toFixed(2)}/m` : '—';
const fmtMtr  = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + ' m';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '—';
const fmtPct  = n => n != null ? `${Math.abs(Number(n)).toFixed(1)}%` : '—';
const fmtL    = n => { const v=Math.abs(Number(n||0)); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:fmt(n); };

const decodeHtml = str => str
  ? str
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      .replace(/&#10;/g, ' ').replace(/&#13;/g, '').trim()
  : str;

function groupByKey(arr, key) {
  const m = {};
  for (const item of (arr||[])) {
    const k = item[key];
    if (!m[k]) m[k] = [];
    m[k].push(item);
  }
  return m;
}

// ── Small UI atoms ────────────────────────────────────────────────────────────

function Pill({ label, value, color=T.teal, bg }) {
  return (
    <div style={{background:bg||color+'18',border:`1px solid ${color}40`,borderRadius:10,
      padding:'10px 18px',display:'flex',flexDirection:'column',alignItems:'center',gap:3,minWidth:130}}>
      <div style={{fontSize:9,color:color,fontWeight:800,textTransform:'uppercase',letterSpacing:.6}}>{label}</div>
      <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:20,color:T.text,lineHeight:1}}>{value}</div>
    </div>
  );
}

function KV({ label, value, mono, color, wide }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{marginBottom:5,gridColumn:wide?'span 2':undefined}}>
      <div style={{fontSize:9,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:2}}>{label}</div>
      <div style={{fontSize:12,color:color||T.text,fontWeight:500,
        fontFamily:mono?"'DM Mono',monospace":"'DM Sans',sans-serif",wordBreak:'break-word'}}>
        {value}
      </div>
    </div>
  );
}

function GhostNote({ msg }) {
  return (
    <div style={{padding:'8px 12px',background:'#F8FAFB',border:`1px dashed ${T.border}`,
      borderRadius:6,fontSize:11,color:T.textFaint,fontStyle:'italic'}}>
      {msg}
    </div>
  );
}

function StageBadge({ stage }) {
  if (!stage) return null;
  const colors = {1:T.teal, 2:T.blue, 3:T.purple, 4:T.amber};
  const c = colors[stage]||T.textMuted;
  return (
    <span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700,
      background:c+'20',color:c,marginLeft:6}}>
      Stage {stage}
    </span>
  );
}

function DesignBornBadge() {
  return (
    <div style={{display:'inline-flex',alignItems:'center',gap:5,
      background:T.tealLight,border:`1.5px solid ${T.teal}`,borderRadius:6,
      padding:'4px 10px',fontSize:10,fontWeight:800,color:T.tealDark,marginTop:8}}>
      ✦ DESIGN BORN HERE
    </div>
  );
}

// ── V-block wrappers ──────────────────────────────────────────────────────────

function VBlock({ title, subtitle, borderColor, children }) {
  return (
    <div style={{borderLeft:`4px solid ${borderColor}`,paddingLeft:14,marginBottom:10}}>
      <div style={{fontSize:10,fontWeight:800,color:borderColor,textTransform:'uppercase',
        letterSpacing:.7,marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
        {title}
        {subtitle && <span style={{fontWeight:500,color:T.textMuted,textTransform:'none',letterSpacing:0,fontSize:10}}>— {subtitle}</span>}
      </div>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:'12px 14px'}}>
        {children}
      </div>
    </div>
  );
}

// ── V-01 Grey Purchase ────────────────────────────────────────────────────────

function GreyPurchaseBlock({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <VBlock title="V-01 · Grey Purchase" borderColor={T.blue}>
        <GhostNote msg="Grey purchase data not yet synced for this lot" />
      </VBlock>
    );
  }
  const gp = rows[0]; // primary row
  return (
    <VBlock title="V-01 · Grey Purchase" subtitle={decodeHtml(gp.tally_voucher_no)} borderColor={T.blue}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px 16px'}}>
        <KV label="Purchase Bill No" value={gp.tally_voucher_no} mono />
        <KV label="Supplier Bill No" value={decodeHtml(gp.supplier_invoice_no)} mono />
        <KV label="Date" value={fmtDate(gp.voucher_date)} />
        <KV label="Supplier" value={decodeHtml(gp.supplier_name)} color={T.blue} />
        <KV label="Item" value={decodeHtml(gp.item_name)} />
        <KV label="Purchased Qty" value={gp.actual_qty_mtrs ? fmtMtr(gp.actual_qty_mtrs) : null} mono />
        <KV label="Rate / m" value={fmtRate(gp.rate)} mono color={T.blue} />
        <KV label="Amount" value={gp.item_amount ? fmt(gp.item_amount) : null} mono />
        {gp.broker_name && <KV label="Broker" value={decodeHtml(gp.broker_name)} />}
        {gp.comm_rate    && <KV label="Brokerage %" value={`${Math.abs(Number(gp.comm_rate)).toFixed(2)}%`} mono />}
      </div>
    </VBlock>
  );
}

// ── V-02 Issue to Mill ────────────────────────────────────────────────────────

function IssueToMillBlock({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <VBlock title="V-02 · Issue to Mill" borderColor={T.teal}>
        <GhostNote msg="Issue challan not synced — check n8n issue_to_mill table" />
      </VBlock>
    );
  }
  const itm = rows[0];
  return (
    <VBlock title="V-02 · Issue to Mill" subtitle={decodeHtml(itm.tally_voucher_no)} borderColor={T.teal}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px 16px'}}>
        <KV label="Issue Challan No" value={decodeHtml(itm.tally_voucher_no)} mono />
        <KV label="Date" value={fmtDate(itm.voucher_date)} />
        <KV label="Mill Name" value={decodeHtml(itm.mill_name)} color={T.teal} />
        <KV label="Destination Godown" value={decodeHtml(itm.destination_godown)} />
        <KV label="Item Issued" value={decodeHtml(itm.item_name)} />
        <KV label="Issued Qty" value={itm.qty_mtrs ? fmtMtr(itm.qty_mtrs) : null} mono />
        {itm.source_godown && <KV label="Source Godown" value={decodeHtml(itm.source_godown)} />}
      </div>
    </VBlock>
  );
}

// ── V-03 Jobwork Bill ─────────────────────────────────────────────────────────
// V-03 ↔ V-04 link: rec_from_mill.jw_voucher_number = jobwork_expenses.voucher_number
// This is resolved by compute_jw_allocation() — NOT a direct field match.
// (supplier_invoice_no is the mill’s own invoice number; party_challan_no is our issue challan — different numbers)

function JobworkBlock({ row }) {
  if (!row) {
    return (
      <VBlock title="V-03 · Jobwork Bill" borderColor={T.amber}>
        <GhostNote msg="Jobwork bill not yet matched — jw_voucher_number not set. Run SELECT * FROM compute_jw_allocation() to resolve." />
      </VBlock>
    );
  }

  return (
    <VBlock title="V-03 · Jobwork Bill" subtitle={decodeHtml(row.voucher_number)} borderColor={T.amber}>

      {/* Header row: voucher no + date */}
      <div style={{display:’flex’,gap:16,flexWrap:’wrap’,alignItems:’center’,marginBottom:10}}>
        <div>
          <div style={{fontSize:9,color:T.textMuted,fontWeight:700,textTransform:’uppercase’,
            letterSpacing:.5,marginBottom:2}}>JW Voucher No</div>
          <div style={{fontFamily:"’DM Mono’,monospace",fontSize:13,fontWeight:800,color:T.amber}}>
            {decodeHtml(row.voucher_number)||’—‘}
          </div>
        </div>
        <div>
          <div style={{fontSize:9,color:T.textMuted,fontWeight:700,textTransform:’uppercase’,
            letterSpacing:.5,marginBottom:2}}>Date</div>
          <div style={{fontSize:12,color:T.text}}>{fmtDate(row.voucher_date)}</div>
        </div>
        {row.supplier_invoice_no && (
          <div>
            <div style={{fontSize:9,color:T.textMuted,fontWeight:700,textTransform:’uppercase’,
              letterSpacing:.5,marginBottom:2}}>Mill’s Invoice No</div>
            <div style={{fontFamily:"’DM Mono’,monospace",fontSize:12,color:T.text}}>
              {decodeHtml(row.supplier_invoice_no)}
            </div>
          </div>
        )}
      </div>

      {/* Bill amounts — keeping only correct fields */}
      <div style={{display:’grid’,gridTemplateColumns:’repeat(3,1fr)’,gap:’8px 16px’}}>
        <KV label="Mill / Jobworker" value={decodeHtml(row.party_name)} />
        <KV label="Bill Amount" value={fmt(row.expense_amount)} mono />
        <KV label="Net Payable" value={fmt(row.party_amount)} mono />
        {row.expense_ledger && <KV label="Expense Ledger" value={decodeHtml(row.expense_ledger)} color={T.amber} />}
        {row.job_rate && <KV label="Job Rate / m" value={fmtRate(row.job_rate)} mono />}
      </div>
    </VBlock>
  );
}

// ── V-04 REC from Mill ────────────────────────────────────────────────────────

function RecFromMillBlock({ rec, isFirstStage, jobworkRow }) {
  const mill      = decodeHtml(rec.mill_name || rec.job_godown) || '—';
  const shortage  = Number(rec.shortage_pct||0);
  const highShort = shortage > 15;
  const greyItem  = decodeHtml(rec.grey_item_name);
  const finishItem = decodeHtml(rec.finish_item_name);

  return (
    <VBlock title="V-04 · REC from Mill" subtitle={rec.tally_voucher_no} borderColor={T.green}>
      {/* Row 1: Voucher / challan / date / stage */}
      <div style={{display:'flex',gap:16,flexWrap:'wrap',alignItems:'center',marginBottom:10}}>
        <div>
          <div style={{fontSize:9,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:2}}>REC Voucher No</div>
          <div style={{fontSize:13,fontWeight:800,color:T.green,fontFamily:"'DM Mono',monospace"}}>{rec.tally_voucher_no||'—'}</div>
        </div>
        {rec.party_challan_no && rec.party_challan_no !== rec.tally_voucher_no && (
          <div>
            <div style={{fontSize:9,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:2}}>Mill Challan No</div>
            <div style={{fontSize:12,color:T.text,fontFamily:"'DM Mono',monospace"}}>{decodeHtml(rec.party_challan_no)}</div>
          </div>
        )}
        <div>
          <div style={{fontSize:9,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:2}}>Date</div>
          <div style={{fontSize:12,color:T.text}}>{fmtDate(rec.voucher_date)}</div>
        </div>
        <StageBadge stage={rec.stage_no} />
      </div>

      {/* Row 2: Mill name */}
      <div style={{marginBottom:10,padding:'6px 10px',background:T.green20,borderRadius:6}}>
        <span style={{fontSize:9,color:T.green,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginRight:6}}>Mill</span>
        <span style={{fontSize:12,fontWeight:600,color:T.text}}>{mill}</span>
      </div>

      {/* Row 3: Grey → Finish item */}
      {(greyItem || finishItem) && (
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,
          padding:'8px 12px',background:T.bg,borderRadius:6,flexWrap:'wrap'}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:9,color:T.textMuted,fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Grey Item</div>
            <div style={{fontSize:12,fontWeight:600,color:T.text}}>{greyItem||'—'}</div>
          </div>
          <div style={{fontSize:20,color:T.textFaint,padding:'0 4px'}}>→</div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:9,color:T.green,fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Finish Item</div>
            <div style={{fontSize:12,fontWeight:700,color:T.tealDark}}>{finishItem||'—'}</div>
          </div>
        </div>
      )}

      {/* Row 4: Qty metrics */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:10}}>
        <div style={{padding:'8px 10px',background:T.blueLight,borderRadius:6,textAlign:'center'}}>
          <div style={{fontSize:9,color:T.blue,fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Issued</div>
          <div style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:"'DM Mono',monospace"}}>
            {rec.grey_issued_qty_mtrs ? fmtMtr(rec.grey_issued_qty_mtrs) : '—'}
          </div>
        </div>
        <div style={{padding:'8px 10px',background:T.greenLight,borderRadius:6,textAlign:'center'}}>
          <div style={{fontSize:9,color:T.green,fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Received</div>
          <div style={{fontSize:13,fontWeight:700,color:T.green,fontFamily:"'DM Mono',monospace"}}>
            {rec.finish_qty_mtrs ? fmtMtr(rec.finish_qty_mtrs) : '—'}
          </div>
        </div>
        <div style={{padding:'8px 10px',background:highShort?T.redLight:'#F8FAFB',borderRadius:6,textAlign:'center'}}>
          <div style={{fontSize:9,color:highShort?T.red:T.textMuted,fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Shortage</div>
          <div style={{fontSize:13,fontWeight:700,color:highShort?T.red:T.text,fontFamily:"'DM Mono',monospace"}}>
            {rec.shortage_mtrs ? fmtMtr(rec.shortage_mtrs) : '—'}
          </div>
        </div>
        <div style={{padding:'8px 10px',background:highShort?T.redLight:'#F8FAFB',borderRadius:6,textAlign:'center'}}>
          <div style={{fontSize:9,color:highShort?T.red:T.textMuted,fontWeight:700,textTransform:'uppercase',marginBottom:2}}>Short %</div>
          <div style={{fontSize:13,fontWeight:700,color:highShort?T.red:T.text}}>
            {rec.shortage_pct != null ? fmtPct(rec.shortage_pct) : '—'}
          </div>
        </div>
      </div>

      {/* Row 5: Design born badge */}
      {isFirstStage && <DesignBornBadge />}
    </VBlock>
  );
}

// ── Costing Summary box ───────────────────────────────────────────────────────

function CostingSummaryBox({ recStages, gp, sales }) {
  const lastRec = recStages[recStages.length - 1];
  if (!lastRec) return null;

  const finishQty = Math.abs(Number(lastRec.finish_qty_mtrs||0));
  const gpRate    = Math.abs(Number(lastRec.grey_purchase_rate||gp?.[0]?.rate||0));
  const greyCostTotal = Math.abs(Number(lastRec.grey_cost_actual||0));
  const greyCostPerM  = finishQty > 0 ? greyCostTotal / finishQty : 0;
  const processLossAdj = greyCostPerM > 0 && gpRate > 0 ? greyCostPerM - gpRate : 0;
  const factoryCostPerM = Math.abs(Number(lastRec.cumulative_cost_per_mtr||0));
  const jwPerM  = finishQty > 0 ? Math.abs(Number(lastRec.jw_allocated_cost||0)) / finishQty : 0;
  const fullCost = factoryCostPerM + jwPerM;

  const totalSaleQty = sales.reduce((s,b)=>s+Math.abs(Number(b.quantity_mtrs||0)),0);
  const totalRevenue  = sales.reduce((s,b)=>s+Math.abs(Number(b.total_amount||0)),0);
  const totalComm     = sales.reduce((s,b)=>s+Math.abs(Number(b.comm_amount||0)),0);
  const avgRate       = totalSaleQty > 0 ? totalRevenue / totalSaleQty : 0;
  const avgCommPerM   = totalSaleQty > 0 ? totalComm / totalSaleQty : 0;
  const netRealisation = avgRate - avgCommPerM;
  const profitPerM    = netRealisation - fullCost;
  const marginPct     = netRealisation > 0 ? (profitPerM / netRealisation) * 100 : 0;
  const isLoss        = profitPerM < 0;

  const lineStyle = {display:'flex',justifyContent:'space-between',alignItems:'center',
    padding:'5px 0',fontSize:12};
  const labelStyle = {color:T.textMuted};
  const valStyle   = {fontFamily:"'DM Mono',monospace",fontWeight:600,color:T.text};
  const divider    = <div style={{borderTop:`1px solid ${T.border}`,margin:'6px 0'}}/>;

  return (
    <div style={{background:T.tealLight,border:`1.5px solid ${T.teal}40`,borderRadius:10,
      padding:'16px 20px',marginTop:12,marginBottom:20}}>
      <div style={{fontSize:10,fontWeight:800,color:T.teal,textTransform:'uppercase',
        letterSpacing:.7,marginBottom:12}}>Costing Summary</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>

        {/* LEFT: Cost build-up */}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:T.textMuted,textTransform:'uppercase',
            letterSpacing:.5,marginBottom:8}}>Cost Build-Up</div>

          {gpRate > 0 && (
            <div style={lineStyle}>
              <span style={labelStyle}>Grey purchase rate</span>
              <span style={valStyle}>{fmtRate(gpRate)}</span>
            </div>
          )}
          {processLossAdj > 0.005 && (
            <div style={lineStyle}>
              <span style={labelStyle}>Process loss adjustment</span>
              <span style={{...valStyle,color:T.amber}}>+{fmtRate(processLossAdj)}</span>
            </div>
          )}
          {greyCostPerM > 0 && (
            <div style={lineStyle}>
              <span style={labelStyle}>Grey cost absorbed / m</span>
              <span style={valStyle}>{fmtRate(greyCostPerM)}</span>
            </div>
          )}

          {recStages.map((r, i) => {
            const jobRate = Math.abs(Number(r.job_rate||0));
            const jobAmtPerM = r.finish_qty_mtrs && Number(r.finish_qty_mtrs)>0
              ? Math.abs(Number(r.job_amount||0)) / Math.abs(Number(r.finish_qty_mtrs))
              : 0;
            const displayRate = jobRate > 0 ? jobRate : jobAmtPerM;
            if (displayRate === 0) return null;
            return (
              <div key={r.id} style={lineStyle}>
                <span style={labelStyle}>JW cost {recStages.length>1?`stage ${r.stage_no||i+1}`:''}</span>
                <span style={valStyle}>{fmtRate(displayRate)}</span>
              </div>
            );
          })}

          {jwPerM > 0.005 && (
            <div style={lineStyle}>
              <span style={labelStyle}>JW overhead allocated / m</span>
              <span style={valStyle}>{fmtRate(jwPerM)}</span>
            </div>
          )}

          {divider}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0'}}>
            <span style={{fontWeight:800,color:T.tealDark,fontSize:13}}>Factory Cost / m</span>
            <span style={{fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:16,color:T.teal}}>
              {fmtRate(fullCost||factoryCostPerM)}
            </span>
          </div>
        </div>

        {/* RIGHT: Selling analysis */}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:T.textMuted,textTransform:'uppercase',
            letterSpacing:.5,marginBottom:8}}>Selling ({sales.length} bill{sales.length!==1?'s':''})</div>

          {sales.length === 0 ? (
            <GhostNote msg="No sales recorded yet for this design" />
          ) : (
            <>
              <div style={lineStyle}>
                <span style={labelStyle}>Avg selling rate</span>
                <span style={valStyle}>{fmtRate(avgRate)}</span>
              </div>
              <div style={lineStyle}>
                <span style={labelStyle}>Brokerage / m</span>
                <span style={{...valStyle,color:T.amber}}>−{fmtRate(avgCommPerM)}</span>
              </div>
              <div style={lineStyle}>
                <span style={labelStyle}>Net realisation / m</span>
                <span style={valStyle}>{fmtRate(netRealisation)}</span>
              </div>
              <div style={lineStyle}>
                <span style={labelStyle}>Factory cost / m</span>
                <span style={{...valStyle,color:T.red}}>−{fmtRate(fullCost||factoryCostPerM)}</span>
              </div>
              {divider}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0'}}>
                <span style={{fontWeight:800,color:T.tealDark,fontSize:13}}>Profit / m</span>
                <span style={{fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:16,
                  color:isLoss?T.red:T.green}}>
                  {profitPerM >= 0 ? '+' : ''}{fmtRate(profitPerM)}
                </span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'2px 0'}}>
                <span style={{fontWeight:700,color:T.textMuted,fontSize:12}}>Margin</span>
                <span style={{fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:14,
                  color:isLoss?T.red:T.green}}>
                  {marginPct >= 0 ? '+' : ''}{marginPct.toFixed(1)}%
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sales Section ─────────────────────────────────────────────────────────────

function SalesSection({ sales }) {
  const totalQty  = sales.reduce((s,b)=>s+Math.abs(Number(b.quantity_mtrs||0)),0);
  const totalAmt  = sales.reduce((s,b)=>s+Math.abs(Number(b.total_amount||0)),0);
  const totalComm = sales.reduce((s,b)=>s+Math.abs(Number(b.comm_amount||0)),0);
  const avgRate   = totalQty > 0 ? totalAmt / totalQty : 0;

  const thStyle = {fontSize:10,color:T.textMuted,fontWeight:700,textTransform:'uppercase',
    letterSpacing:.5,padding:'8px 10px',background:T.bg,borderBottom:`1px solid ${T.border}`};
  const tdStyle = {fontSize:12,padding:'9px 10px',borderBottom:`1px solid ${T.border}`,color:T.text};

  return (
    <div style={{borderLeft:`4px solid ${T.purple}`,paddingLeft:14}}>
      <div style={{fontSize:10,fontWeight:800,color:T.purple,textTransform:'uppercase',
        letterSpacing:.7,marginBottom:6}}>
        V-05 · Sales Bills
        <span style={{fontWeight:500,color:T.textMuted,textTransform:'none',letterSpacing:0,marginLeft:6}}>
          — {sales.length} bill{sales.length!==1?'s':''}, {fmtMtr(totalQty)} total
        </span>
      </div>

      {sales.length === 0 ? (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:24,
          textAlign:'center',color:T.textFaint,fontStyle:'italic',fontSize:12}}>
          No sales recorded yet for this design
        </div>
      ) : (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:800}}>
              <thead>
                <tr>
                  {['Bill No','Date','Customer','State','Qty','Rate/m','Broker','Comm%','Amount'].map(h=>(
                    <th key={h} style={{...thStyle,textAlign:['Qty','Rate/m','Comm%','Amount'].includes(h)?'right':'left'}}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map(b => (
                  <tr key={b.id} style={{transition:'background .1s'}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bg}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{...tdStyle,fontFamily:"'DM Mono',monospace",fontWeight:700,color:T.purple}}>
                      {b.bill_number||'—'}
                    </td>
                    <td style={{...tdStyle,color:T.textMuted}}>{fmtDate(b.bill_date)}</td>
                    <td style={{...tdStyle,fontWeight:600}}>{decodeHtml(b.customer_name)||'—'}</td>
                    <td style={{...tdStyle,color:T.textMuted,fontSize:11}}>{b.customer_state||'—'}</td>
                    <td style={{...tdStyle,textAlign:'right',fontFamily:"'DM Mono',monospace"}}>
                      {b.quantity_mtrs ? fmtMtr(b.quantity_mtrs) : '—'}
                    </td>
                    <td style={{...tdStyle,textAlign:'right',fontFamily:"'DM Mono',monospace"}}>
                      {b.rate_per_mtr ? `₹${Math.abs(Number(b.rate_per_mtr)).toFixed(2)}` : '—'}
                    </td>
                    <td style={{...tdStyle,fontSize:11}}>
                      {decodeHtml(b.broker_name)||<span style={{color:T.textFaint}}>—</span>}
                    </td>
                    <td style={{...tdStyle,textAlign:'right'}}>
                      {b.comm_rate
                        ? <span style={{padding:'2px 6px',borderRadius:4,background:T.goldLight,
                            color:T.gold,fontWeight:700,fontSize:10}}>
                            {Math.abs(Number(b.comm_rate)).toFixed(1)}%
                          </span>
                        : <span style={{color:T.textFaint}}>—</span>}
                    </td>
                    <td style={{...tdStyle,textAlign:'right',fontWeight:700,color:T.green,
                      fontFamily:"'DM Mono',monospace"}}>
                      {fmt(b.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:T.tealLight}}>
                  <td colSpan={4} style={{padding:'9px 10px',fontWeight:700,fontSize:12,color:T.tealDark}}>
                    Totals
                  </td>
                  <td style={{padding:'9px 10px',textAlign:'right',fontWeight:700,fontFamily:"'DM Mono',monospace",fontSize:12}}>
                    {fmtMtr(totalQty)}
                  </td>
                  <td style={{padding:'9px 10px',textAlign:'right',fontWeight:700,fontFamily:"'DM Mono',monospace",fontSize:12}}>
                    {fmtRate(avgRate)}
                  </td>
                  <td style={{padding:'9px 10px'}} />
                  <td style={{padding:'9px 10px',textAlign:'right',fontWeight:700,fontFamily:"'DM Mono',monospace",fontSize:12,color:T.gold}}>
                    {fmt(totalComm)}
                  </td>
                  <td style={{padding:'9px 10px',textAlign:'right',fontWeight:800,fontFamily:"'DM Mono',monospace",fontSize:13,color:T.green}}>
                    {fmtL(totalAmt)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Search / landing form ─────────────────────────────────────────────────────

function SearchForm({ onSearch }) {
  const [input, setInput] = useState('');
  const [mode,  setMode]  = useState('design'); // 'design' | 'lot'
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    if (mode === 'design') navigate(`/admin/accounting/design-lifecycle/${input.trim()}`);
    else                   navigate(`/admin/accounting/design-lifecycle?lot=${input.trim()}`);
  }

  return (
    <div style={{maxWidth:560,margin:'80px auto 0',padding:'0 24px',fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{textAlign:'center',marginBottom:32}}>
        <div style={{fontSize:36,marginBottom:12}}>🔗</div>
        <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:28,color:T.tealDark,margin:'0 0 8px'}}>
          Design Lifecycle
        </h1>
        <p style={{fontSize:13,color:T.textMuted,margin:0}}>
          Trace any design from grey purchase → mill → REC → sale with full costing
        </p>
      </div>

      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,
        padding:'24px 28px',boxShadow:'0 2px 12px rgba(11,46,43,.06)'}}>
        <div style={{display:'flex',gap:0,background:T.bg,borderRadius:8,
          padding:4,marginBottom:16,width:'fit-content'}}>
          {[{key:'design',label:'By Design No'},{key:'lot',label:'By Lot No'}].map(m=>(
            <button key={m.key} onClick={()=>setMode(m.key)}
              style={{padding:'6px 16px',border:'none',borderRadius:6,cursor:'pointer',
                fontSize:12,fontWeight:700,transition:'all .15s',
                background:mode===m.key?T.teal:'transparent',
                color:mode===m.key?'#fff':T.textMuted}}>
              {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{display:'flex',gap:10}}>
          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            placeholder={mode==='design' ? 'e.g. 3270' : 'e.g. 1030/24-25'}
            style={{flex:1,padding:'10px 14px',border:`1.5px solid ${T.border}`,borderRadius:8,
              fontSize:14,color:T.text,background:'#fff',outline:'none',
              fontFamily:"'DM Mono',monospace"}}
            autoFocus
          />
          <button type="submit"
            style={{padding:'10px 20px',background:T.teal,color:'#fff',border:'none',
              borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}}>
            View →
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DesignLifecyclePage() {
  const { designNo: designNoParam } = useParams();
  const [searchParams] = useSearchParams();
  const lotNoParam = searchParams.get('lot');
  const navigate   = useNavigate();

  const [resolvedDesignNo, setResolvedDesignNo] = useState(designNoParam || null);
  const [recRows,          setRecRows]           = useState([]);
  const [gpMap,            setGpMap]             = useState({});   // lot_no → [grey_purchase rows]
  const [itmMap,           setItmMap]            = useState({});   // lot_no → [issue_to_mill rows]
  const [jweMap,           setJweMap]            = useState({});   // voucher_number → [jobwork_expenses rows]
  const [sales,            setSales]             = useState([]);
  const [loading,          setLoading]           = useState(false);
  const [error,            setError]             = useState(null);

  useEffect(() => {
    if (!designNoParam && !lotNoParam) return;
    loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designNoParam, lotNoParam]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    setRecRows([]); setSales([]); setGpMap({}); setItmMap({}); setJweMap({});

    try {
      // Step 1: resolve design number
      let dn = designNoParam || null;
      if (!dn && lotNoParam) {
        const { data: rdRes } = await supabase
          .from('rec_from_mill').select('design_no')
          .eq('grey_lot_no', lotNoParam).limit(1);
        dn = rdRes?.[0]?.design_no;
        if (!dn) {
          // fallback: use lot_no itself as design context even without design_no
          dn = lotNoParam;
        }
      }
      setResolvedDesignNo(dn);

      // Step 2: fetch all REC rows for this design
      let recQ = supabase.from('rec_from_mill').select('*')
        .order('voucher_date', {ascending:true})
        .order('stage_no',     {ascending:true});
      if (designNoParam) recQ = recQ.eq('design_no', designNoParam);
      else if (lotNoParam) recQ = recQ.eq('grey_lot_no', lotNoParam);
      else return;

      const { data: recData, error: recErr } = await recQ;
      if (recErr) throw recErr;
      const recs = recData || [];
      setRecRows(recs);

      if (recs.length === 0) { setLoading(false); return; }

      // Step 3: collect keys
      const lots   = [...new Set(recs.map(r=>r.grey_lot_no).filter(Boolean))];
      const jwNums = [...new Set(recs.map(r=>r.jw_voucher_number).filter(Boolean))];

      // Step 4: parallel fetches
      const [gpRes, itmRes, jweRes, sbRes] = await Promise.all([
        lots.length
          ? supabase.from('grey_purchase').select('*').in('lot_no', lots)
          : { data: [] },
        lots.length
          ? supabase.from('issue_to_mill').select('*').in('lot_no', lots)
          : { data: [] },
        jwNums.length
          ? supabase.from('jobwork_expenses').select('*').in('voucher_number', jwNums)
          : { data: [] },
        designNoParam
          ? supabase.from('sales_bills').select('*')
              .eq('design_no', designNoParam)
              .order('bill_date', {ascending:true})
          : { data: [] },
      ]);

      setGpMap(groupByKey(gpRes.data,  'lot_no'));
      setItmMap(groupByKey(itmRes.data, 'lot_no'));
      setJweMap(groupByKey(jweRes.data, 'voucher_number'));
      setSales(sbRes.data || []);

    } catch (e) {
      setError(e.message || 'Failed to load lifecycle data');
    } finally {
      setLoading(false);
    }
  }

  // ── If no design/lot param, show search form ──
  if (!designNoParam && !lotNoParam) {
    return (
      <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh'}}>
        <SearchForm />
      </div>
    );
  }

  // ── Group REC rows by lot, then by stage ──
  const recByLot = groupByKey(recRows, 'grey_lot_no');
  // Collect ordered lot list (preserve first-seen order)
  const lotOrder = [...new Set(recRows.map(r=>r.grey_lot_no).filter(Boolean))];

  // ── Derive header stats ──
  const firstRec = recRows[0];
  const finishItemName = decodeHtml(firstRec?.finish_item_name) || '—';
  const totalFinishQty = recRows.reduce((s,r)=>s+Math.abs(Number(r.finish_qty_mtrs||0)),0);
  // Factory cost: average of cumulative_cost_per_mtr across all final-stage recs
  const finalStages = lotOrder.map(lot => {
    const stages = (recByLot[lot]||[]).sort((a,b)=>(a.stage_no||1)-(b.stage_no||1));
    return stages[stages.length-1];
  }).filter(Boolean);
  const avgFactoryCost = finalStages.length
    ? finalStages.reduce((s,r)=>s+Math.abs(Number(r.cumulative_cost_per_mtr||0)),0) / finalStages.length
    : 0;
  const totalSaleQty = sales.reduce((s,b)=>s+Math.abs(Number(b.quantity_mtrs||0)),0);
  const totalSaleAmt = sales.reduce((s,b)=>s+Math.abs(Number(b.total_amount||0)),0);
  const avgSellingRate = totalSaleQty > 0 ? totalSaleAmt / totalSaleQty : 0;
  const avgMarginPct   = avgSellingRate > 0 && avgFactoryCost > 0
    ? ((avgSellingRate - avgFactoryCost) / avgSellingRate) * 100 : null;

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh',
      padding:'20px 24px',maxWidth:1100,margin:'0 auto'}}>

      {/* ── Header ── */}
      <div style={{marginBottom:24}}>
        <button onClick={()=>navigate('/admin/accounting/design-lifecycle')}
          style={{background:'none',border:'none',color:T.textMuted,cursor:'pointer',
            fontSize:12,marginBottom:12,padding:0,display:'flex',alignItems:'center',gap:4}}>
          ← Back to search
        </button>

        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',
          gap:16,flexWrap:'wrap'}}>
          <div>
            {loading ? (
              <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:32,
                color:T.textFaint}}>Loading…</div>
            ) : (
              <>
                <div style={{display:'flex',alignItems:'baseline',gap:10,flexWrap:'wrap'}}>
                  <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:32,
                    color:T.tealDark,margin:0,lineHeight:1}}>
                    Design&nbsp;
                    <span style={{color:T.teal,fontFamily:"'DM Mono',monospace"}}>
                      #{resolvedDesignNo || designNoParam || lotNoParam}
                    </span>
                  </h1>
                  {lotNoParam && !designNoParam && (
                    <span style={{padding:'3px 10px',borderRadius:20,background:T.amberLight,
                      color:T.amber,fontSize:11,fontWeight:700}}>
                      Searched by Lot: {lotNoParam}
                    </span>
                  )}
                </div>
                <div style={{fontSize:14,color:T.textMuted,marginTop:6}}>{finishItemName}</div>
              </>
            )}
          </div>

          {/* Summary pills */}
          {!loading && recRows.length > 0 && (
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <Pill label="Total Finish Qty" value={fmtMtr(totalFinishQty)} color={T.blue} />
              <Pill label="Avg Factory Cost / m"
                value={avgFactoryCost ? fmtRate(avgFactoryCost) : '—'} color={T.teal} />
              <Pill label="Avg Selling Rate"
                value={avgSellingRate ? fmtRate(avgSellingRate) : '—'} color={T.green} />
              <Pill label="Avg Margin"
                value={avgMarginPct != null ? `${avgMarginPct >= 0 ? '+' : ''}${avgMarginPct.toFixed(1)}%` : '—'}
                color={avgMarginPct != null && avgMarginPct < 0 ? T.red : T.green} />
            </div>
          )}
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div style={{padding:'16px 20px',background:T.redLight,border:`1px solid ${T.red}40`,
          borderRadius:10,color:T.red,fontSize:13,marginBottom:20}}>
          Error: {error}
        </div>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <div style={{padding:80,textAlign:'center',color:T.textMuted,fontSize:14}}>
          Loading lifecycle data…
        </div>
      )}

      {/* ── Not found ── */}
      {!loading && !error && recRows.length === 0 && (
        <div style={{padding:60,textAlign:'center',background:T.surface,border:`1px solid ${T.border}`,
          borderRadius:14}}>
          <div style={{fontSize:40,marginBottom:12}}>🔍</div>
          <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:6}}>No REC data found</div>
          <div style={{fontSize:13,color:T.textMuted}}>
            No REC from Mill records for {designNoParam ? `design #${designNoParam}` : `lot ${lotNoParam}`}.
            This design may not have been processed yet, or the sync is behind.
          </div>
        </div>
      )}

      {/* ── Timeline: one section per lot ── */}
      {!loading && lotOrder.map((lot, lotIndex) => {
        const stagesForLot = (recByLot[lot]||[]).sort((a,b)=>(a.stage_no||1)-(b.stage_no||1));
        const gpRows  = gpMap[lot]  || [];
        const itmRows = itmMap[lot] || [];

        return (
          <div key={lot} style={{marginBottom:32}}>
            {/* Lot section header */}
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,
              padding:'10px 16px',background:T.tealDark,borderRadius:10}}>
              <div style={{width:24,height:24,borderRadius:'50%',background:T.teal,
                color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:11,fontWeight:800,flexShrink:0}}>
                {lotIndex+1}
              </div>
              <div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:700,
                  color:'#fff',letterSpacing:.3}}>
                  Lot: {lot}
                </div>
                {gpRows[0]?.supplier_name && (
                  <div style={{fontSize:12,color:'#9FE1CB',marginTop:2}}>
                    {decodeHtml(gpRows[0].supplier_name)}
                    {gpRows[0].voucher_date && ` · ${fmtDate(gpRows[0].voucher_date)}`}
                  </div>
                )}
              </div>
            </div>

            {/* V-01 Grey Purchase */}
            <GreyPurchaseBlock rows={gpRows} />

            {/* V-02 Issue to Mill (once, before stages) */}
            <IssueToMillBlock rows={itmRows} />

            {/* Stages (V-03 + V-04 per stage) */}
            {stagesForLot.map((rec, stageIdx) => {
              const isFirstStage = (rec.stage_no||1) === 1;
              const jwRow = rec.jw_voucher_number
                ? (jweMap[rec.jw_voucher_number]||[])[0]
                : null;

              return (
                <div key={rec.id}>
                  {stageIdx > 0 && (
                    <div style={{display:'flex',alignItems:'center',gap:10,
                      padding:'8px 0',margin:'8px 0 12px 18px'}}>
                      <div style={{width:1,height:24,background:T.border}}/>
                      <span style={{fontSize:11,color:T.textMuted,fontStyle:'italic'}}>
                        → Sent for further processing (Stage {rec.stage_no||stageIdx+1})
                      </span>
                    </div>
                  )}
                  <JobworkBlock row={jwRow} />
                  <RecFromMillBlock rec={rec} isFirstStage={isFirstStage} jobworkRow={jwRow} />
                </div>
              );
            })}

            {/* Costing summary per lot */}
            <CostingSummaryBox recStages={stagesForLot} gp={gpRows} sales={sales} />
          </div>
        );
      })}

      {/* ── Sales section (global, across all lots for this design) ── */}
      {!loading && recRows.length > 0 && (
        <SalesSection sales={sales} />
      )}

      <div style={{height:60}}/>
    </div>
  );
}
