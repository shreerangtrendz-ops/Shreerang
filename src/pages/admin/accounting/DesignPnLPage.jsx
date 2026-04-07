import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

// ═══════════════════════════════════════════════════════════════════
// DESIGN P&L PAGE — with Tally-Style Batch Vouchers Drill-Down
// Replicates the exact Tally "Batch Vouchers" report per design:
//   Date | Particulars | Vch Type | Vch No | Inwards | Outwards | Closing
//
// Data Sources:
//   rec_from_mill  → Inwards (REC FROM MILL vouchers)
//   sales_bills    → Outwards (Sales vouchers)
//   credit_note + credit_note_items → Returns (Credit Notes)
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
  dark:'#1E293B',
};

const INR = n => n != null ? '₹' + Math.abs(Number(n)).toLocaleString('en-IN', {maximumFractionDigits:0}) : '—';
const QTY = n => n != null ? Number(n).toLocaleString('en-IN', {maximumFractionDigits:1}) + 'm' : '—';
const FMT_D = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'2-digit'}) : '—';

// ─── KPI Card ────────────────────────────────────────────────────
function KPICard({ label, value, sub, color }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
      padding:'16px 20px', borderTop:`3px solid ${color}` }}>
      <div style={{ fontSize:11, color:T.muted, fontWeight:700, textTransform:'uppercase', marginBottom:8, letterSpacing:0.5 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:800, color:T.dark }}>{value}</div>
      {sub && <div style={{ fontSize:12, color:T.muted, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

// ─── Batch Vouchers Modal ─────────────────────────────────────────
function BatchVouchersModal({ design, onClose }) {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!design) return;
    const fetchLedger = async () => {
      setLoading(true);
      // 1. Inwards — REC FROM MILL
      const { data: recs } = await supabase
        .from('rec_from_mill')
        .select('voucher_date, tally_voucher_no, grey_lot_no, finish_qty_mtrs, finish_amount, cumulative_cost_per_mtr, job_godown')
        .eq('design_no', design.design_no)
        .order('voucher_date');

      // 2. Outwards — Sales Bills
      const { data: sales } = await supabase
        .from('sales_bills')
        .select('bill_date, tally_voucher_no, customer_name, quantity_mtrs, taxable_value, total_amount')
        .eq('design_no', design.design_no)
        .order('bill_date');

      // 3. Returns — Credit Note Items (joined via tally_voucher_no)
      const { data: cnItems } = await supabase
        .from('credit_note_items')
        .select('*, credit_note(voucher_date, tally_voucher_no, party_name)')
        .eq('design_no', design.design_no)
        .order('credit_note(voucher_date)');

      // Build unified ledger rows
      const rows = [];

      (recs || []).forEach(r => {
        rows.push({
          date:      r.voucher_date,
          particulars: r.job_godown || 'Mill',
          vch_type:  'REC FROM MILL',
          vch_no:    r.tally_voucher_no,
          in_qty:    Number(r.finish_qty_mtrs || 0),
          in_value:  Number(r.finish_amount || 0),
          out_qty:   0, out_value: 0,
          note:      `Grey Lot: ${r.grey_lot_no || '—'} | Cost/m: ${r.cumulative_cost_per_mtr ? '₹'+Number(r.cumulative_cost_per_mtr).toFixed(1) : '—'}`,
        });
      });

      (sales || []).forEach(r => {
        rows.push({
          date:      r.bill_date,
          particulars: r.customer_name,
          vch_type:  'Sales',
          vch_no:    r.tally_voucher_no,
          in_qty:    0, in_value: 0,
          out_qty:   Number(r.quantity_mtrs || 0),
          out_value: Number(r.taxable_value || r.total_amount || 0),
          note:      null,
        });
      });

      (cnItems || []).forEach(r => {
        const cn = r.credit_note;
        rows.push({
          date:      cn?.voucher_date,
          particulars: cn?.party_name || 'Customer',
          vch_type:  'Credit Note',
          vch_no:    r.tally_voucher_no,
          in_qty:    Number(r.qty_mtrs || 0),
          in_value:  Number(r.item_amount || 0),
          out_qty:   0, out_value: 0,
          note:      `Return — ${QTY(r.qty_mtrs)} @ ₹${Number(r.rate||0).toFixed(1)}/m`,
          isReturn:  true,
        });
      });

      // Sort by date
      rows.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Add running balance
      let closingQty = 0, closingVal = 0;
      rows.forEach(r => {
        if (r.isReturn) {
          // CN return = inwards (restocking)
          closingQty += r.in_qty;
          closingVal += r.in_value;
        } else {
          closingQty += r.in_qty - r.out_qty;
          closingVal += r.in_value - r.out_value;
        }
        r.closing_qty = closingQty;
        r.closing_val = closingVal;
      });

      setLedger(rows);
      setLoading(false);
    };
    fetchLedger();
  }, [design]);

  if (!design) return null;

  const vchColor = {
    'REC FROM MILL': T.green,
    'Sales': T.blue,
    'Credit Note': T.orange,
  };
  const vchBg = {
    'REC FROM MILL': T.greenLight,
    'Sales': T.blueLight,
    'Credit Note': T.orangeLight,
  };

  const totalIn  = ledger.reduce((s, r) => s + (r.vch_type === 'Credit Note' ? 0 : r.in_qty), 0);
  const totalOut = ledger.reduce((s, r) => s + r.out_qty, 0);
  const totalInV = ledger.reduce((s, r) => s + (r.vch_type === 'Credit Note' ? 0 : r.in_value), 0);
  const totalOutV= ledger.reduce((s, r) => s + r.out_value, 0);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'24px', overflowY:'auto' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:T.surface, borderRadius:16, width:'100%', maxWidth:1100, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        
        {/* Modal Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          padding:'18px 24px', borderBottom:`1px solid ${T.border}`, background:T.dark, borderRadius:'16px 16px 0 0' }}>
          <div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:1 }}>BATCH VOUCHERS</div>
            <div style={{ fontSize:22, fontWeight:800, color:'#fff', marginTop:2 }}>
              Design No. {design.design_no}
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{ledger.length} transactions</div>
          </div>
          <button onClick={onClose}
            style={{ width:36, height:36, borderRadius:8, background:'rgba(255,255,255,0.1)',
              border:'none', color:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            ×
          </button>
        </div>

        {/* Summary strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:0, borderBottom:`1px solid ${T.border}` }}>
          {[
            { l:'Total Produced / Returned', v:QTY(totalIn), c:T.green },
            { l:'Total Sold', v:QTY(totalOut), c:T.blue },
            { l:'Net Revenue', v:INR(totalOutV), c:T.teal },
            { l:'Closing Stock', v:QTY(ledger.length ? ledger[ledger.length-1].closing_qty : 0), c:T.orange },
          ].map((k,i) => (
            <div key={i} style={{ padding:'14px 20px', borderRight: i<3?`1px solid ${T.border}`:'none', background:T.bg }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{k.l}</div>
              <div style={{ fontSize:18, fontWeight:800, color:k.c }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Ledger Table — Tally Style */}
        <div style={{ overflowX:'auto' }}>
          {loading ? (
            <div style={{ padding:60, textAlign:'center', color:T.muted }}>Loading voucher history...</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
              <thead>
                <tr style={{ background:T.dark }}>
                  {['Date', 'Particulars', 'Vch Type', 'Vch No.', 'Inwards Qty', 'Inwards Value', 'Outwards Qty', 'Outwards Value', 'Closing Qty', 'Closing Value'].map((h, i) => (
                    <th key={h} style={{ padding:'10px 14px', color:'rgba(255,255,255,0.6)', fontSize:10,
                      fontWeight:700, textTransform:'uppercase', textAlign: i >= 4 ? 'right' : 'left',
                      letterSpacing:0.4, whiteSpace:'nowrap', borderBottom:`2px solid rgba(255,255,255,0.1)` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding:40, textAlign:'center', color:T.muted }}>No vouchers found for this design.</td></tr>
                ) : ledger.map((r, i) => (
                  <React.Fragment key={i}>
                    <tr style={{ borderBottom:`1px solid ${T.border}`, background: i%2===0?T.surface:T.bg }}>
                      <td style={{ padding:'9px 14px', whiteSpace:'nowrap', fontWeight:600, color:T.muted }}>{FMT_D(r.date)}</td>
                      <td style={{ padding:'9px 14px', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:600 }}>{r.particulars}</td>
                      <td style={{ padding:'9px 14px' }}>
                        <span style={{ padding:'3px 8px', borderRadius:4, fontSize:10, fontWeight:800,
                          background: vchBg[r.vch_type] || T.bg, color: vchColor[r.vch_type] || T.muted }}>
                          {r.vch_type}
                        </span>
                      </td>
                      <td style={{ padding:'9px 14px', fontFamily:'monospace', fontSize:12, color:T.teal, fontWeight:700 }}>{r.vch_no}</td>
                      {/* Inwards */}
                      <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:'monospace', fontWeight:r.in_qty?700:400, color:r.in_qty?T.green:T.border }}>
                        {r.in_qty > 0 ? QTY(r.in_qty) : '—'}
                      </td>
                      <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:'monospace', fontWeight:r.in_value?700:400, color:r.in_value?T.green:T.border }}>
                        {r.in_value > 0 ? INR(r.in_value) : '—'}
                      </td>
                      {/* Outwards */}
                      <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:'monospace', fontWeight:r.out_qty?700:400, color:r.out_qty?T.blue:T.border }}>
                        {r.out_qty > 0 ? QTY(r.out_qty) : '—'}
                      </td>
                      <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:'monospace', fontWeight:r.out_value?700:400, color:r.out_value?T.blue:T.border }}>
                        {r.out_value > 0 ? INR(r.out_value) : '—'}
                      </td>
                      {/* Closing */}
                      <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:'monospace', fontWeight:800,
                        color: r.closing_qty > 0 ? T.orange : r.closing_qty < 0 ? T.red : T.muted }}>
                        {QTY(r.closing_qty)}
                      </td>
                      <td style={{ padding:'9px 14px', textAlign:'right', fontFamily:'monospace', fontWeight:800,
                        color: r.closing_val > 0 ? T.orange : r.closing_val < 0 ? T.red : T.muted }}>
                        {INR(r.closing_val)}
                      </td>
                    </tr>
                    {r.note && (
                      <tr style={{ background: vchBg[r.vch_type] || T.bg, borderBottom:`1px solid ${T.border}` }}>
                        <td colSpan={10} style={{ padding:'3px 14px 6px 14px', fontSize:11, color: vchColor[r.vch_type] || T.muted, fontStyle:'italic' }}>
                          ↳ {r.note}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              {/* Totals row */}
              {ledger.length > 0 && (
                <tfoot>
                  <tr style={{ background:T.dark }}>
                    <td colSpan={4} style={{ padding:'10px 14px', color:'rgba(255,255,255,0.6)', fontSize:11, fontWeight:700, textTransform:'uppercase' }}>
                      TOTALS (per default valuation)
                    </td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'monospace', fontWeight:800, color:T.green }}>{QTY(totalIn)}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'monospace', fontWeight:800, color:T.green }}>{INR(totalInV)}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'monospace', fontWeight:800, color:T.blue }}>{QTY(totalOut)}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'monospace', fontWeight:800, color:T.blue }}>{INR(totalOutV)}</td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'monospace', fontWeight:800, color:T.orange }}>
                      {QTY(ledger[ledger.length-1].closing_qty)}
                    </td>
                    <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'monospace', fontWeight:800, color:T.orange }}>
                      {INR(ledger[ledger.length-1].closing_val)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main P&L Page ───────────────────────────────────────────────
export default function DesignPnLPage() {
  const [loading, setLoading] = useState(true);
  const [pnlData, setPnlData] = useState([]);
  const [selectedDesign, setSelectedDesign] = useState(null); // For BatchVouchers modal

  const [search, setSearch]   = useState('');
  const [sortBy, setSortBy]   = useState('profit_desc');

  const loadData = useCallback(async () => {
    setLoading(true);

    const [{ data: recData }, { data: salesData }, { data: returnData }] = await Promise.all([
      supabase.from('rec_from_mill').select('design_no, finish_qty_mtrs, cumulative_cost_per_mtr').not('design_no', 'is', null),
      supabase.from('sales_bills').select('design_no, quantity_mtrs, rate_per_mtr').not('design_no', 'is', null),
      supabase.from('credit_note_items').select('design_no, qty_mtrs').not('design_no', 'is', null),
    ]);

    const map = new Map();
    const getG = dn => {
      const d = dn?.trim().toUpperCase();
      if (!d || d === 'PRIMARY BATCH') return null;
      if (!map.has(d)) map.set(d, { design_no:d, produced_qty:0, cost_value:0, sold_qty:0, sales_value:0, returned_qty:0 });
      return map.get(d);
    };

    (recData||[]).forEach(r => {
      const g = getG(r.design_no); if(!g) return;
      const qty = Number(r.finish_qty_mtrs)||0, cost = Number(r.cumulative_cost_per_mtr)||0;
      g.produced_qty += qty; g.cost_value += qty * cost;
    });
    (salesData||[]).forEach(r => {
      const g = getG(r.design_no); if(!g) return;
      const qty = Number(r.quantity_mtrs)||0, rate = Number(r.rate_per_mtr)||0;
      g.sold_qty += qty; g.sales_value += qty * rate;
    });
    (returnData||[]).forEach(r => {
      const g = getG(r.design_no); if(!g) return;
      g.returned_qty += Number(r.qty_mtrs)||0;
    });

    const results = Array.from(map.values()).map(g => {
      g.avg_cost      = g.produced_qty > 0 ? g.cost_value / g.produced_qty : 0;
      g.avg_sell_rate = g.sold_qty > 0 ? g.sales_value / g.sold_qty : 0;
      g.net_sold_qty  = g.sold_qty - g.returned_qty;
      g.inventory_qty = g.produced_qty - g.net_sold_qty;
      g.total_revenue = g.net_sold_qty * g.avg_sell_rate;
      g.cogs          = g.net_sold_qty * g.avg_cost;
      g.net_profit    = g.total_revenue - g.cogs;
      g.margin_pct    = g.total_revenue > 0 ? (g.net_profit / g.total_revenue) * 100 : 0;
      return g;
    });

    setPnlData(results);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredRows = useMemo(() => {
    let arr = pnlData.filter(d => {
      if (search && !d.design_no.includes(search.toUpperCase())) return false;
      return true;
    });
    arr.sort((a, b) => {
      if (sortBy === 'profit_desc')    return b.net_profit - a.net_profit;
      if (sortBy === 'profit_asc')     return a.net_profit - b.net_profit;
      if (sortBy === 'qty_desc')       return b.net_sold_qty - a.net_sold_qty;
      if (sortBy === 'margin_desc')    return b.margin_pct - a.margin_pct;
      if (sortBy === 'inventory_desc') return b.inventory_qty - a.inventory_qty;
      return 0;
    });
    return arr;
  }, [pnlData, search, sortBy]);

  const global = useMemo(() => pnlData.reduce((acc, c) => ({
    revenue: acc.revenue + c.total_revenue,
    profit:  acc.profit  + c.net_profit,
    sold:    acc.sold    + c.net_sold_qty,
    inv:     acc.inv     + c.inventory_qty,
  }), { revenue:0, profit:0, sold:0, inv:0 }), [pnlData]);

  const TH = ({ l, r }) => (
    <th style={{ padding:'12px 16px', textAlign:r?'right':'left', fontSize:11, fontWeight:800,
      color:T.muted, textTransform:'uppercase', letterSpacing:.5,
      borderBottom:`2px solid ${T.border}`, background:T.bg, whiteSpace:'nowrap' }}>{l}</th>
  );

  return (
    <>
      {/* Batch Vouchers Modal */}
      {selectedDesign && (
        <BatchVouchersModal design={selectedDesign} onClose={() => setSelectedDesign(null)} />
      )}

      <div style={{ fontFamily:"'DM Sans',sans-serif", background:T.bg, minHeight:'100vh', padding:'30px' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:28, fontWeight:800, color:T.dark, margin:0, letterSpacing:-0.5 }}>📈 Design P&L Analytics</h1>
            <p style={{ color:T.muted, fontSize:14, margin:'4px 0 0' }}>
              Click any design row to open the <strong>Batch Vouchers drill-down</strong> — exact Tally traceability.
            </p>
          </div>
          <button onClick={loadData} style={{ padding:'10px 18px', background:T.teal, color:'#fff',
            border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
            🔄 Refresh
          </button>
        </div>

        {/* Global KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          <KPICard label="Total Net Revenue"  value={INR(global.revenue)} sub={`From ${QTY(global.sold)} net sold`}     color={T.blue}/>
          <KPICard label="Total Gross Profit" value={INR(global.profit)}  sub="Before indirect expenses"                color={T.green}/>
          <KPICard label="Blended Margin"     value={global.revenue>0?`${((global.profit/global.revenue)*100).toFixed(1)}%`:'—'} sub="Overall design-level margin" color={T.teal}/>
          <KPICard label="Unsold Inventory"   value={QTY(global.inv)}     sub="Ready finished goods (closing)"          color={T.orange}/>
        </div>

        {/* Controls */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
          padding:'14px 18px', marginBottom:20, display:'flex', gap:16, alignItems:'flex-end' }}>
          <div style={{ flex:1, maxWidth:280 }}>
            <div style={{ fontSize:11, color:T.muted, fontWeight:800, marginBottom:6, textTransform:'uppercase' }}>Search Design No</div>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="e.g. 3270"
              style={{ width:'100%', padding:'10px 14px', border:`1px solid ${T.border}`,
                borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontWeight:600 }}/>
          </div>
          <div>
            <div style={{ fontSize:11, color:T.muted, fontWeight:800, marginBottom:6, textTransform:'uppercase' }}>Sort By</div>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
              style={{ padding:'10px 14px', border:`1px solid ${T.border}`,
                borderRadius:8, fontSize:14, background:'#fff', outline:'none', fontWeight:600, cursor:'pointer' }}>
              <option value="profit_desc">Highest Profit First</option>
              <option value="profit_asc">Lowest Profit First</option>
              <option value="margin_desc">Highest Margin %</option>
              <option value="qty_desc">Highest Sales Qty</option>
              <option value="inventory_desc">Highest Closing Stock</option>
            </select>
          </div>
          <div style={{ fontSize:12, color:T.muted }}>
            💡 <strong>Click any row</strong> to open Batch Vouchers
          </div>
        </div>

        {/* Table */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden', boxShadow:'0 2px 10px rgba(0,0,0,0.02)' }}>
          {loading ? (
            <div style={{ padding:80, textAlign:'center', color:T.muted, fontSize:16, fontWeight:600 }}>
              Calculating design margins...
            </div>
          ) : filteredRows.length === 0 ? (
            <div style={{ padding:80, textAlign:'center', color:T.muted, fontSize:16, fontWeight:600 }}>No designs found.</div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr>
                    <TH l="Design No"/>
                    <TH l="Produced" r/>
                    <TH l="Net Sold" r/>
                    <TH l="Returns" r/>
                    <TH l="Closing Stock" r/>
                    <TH l="Cost/m" r/>
                    <TH l="Sell/m" r/>
                    <TH l="Gross Profit" r/>
                    <TH l="Margin" r/>
                    <TH l=""/>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => {
                    const isLoss = r.net_profit < 0;
                    return (
                      <tr key={r.design_no}
                        onClick={() => setSelectedDesign(r)}
                        style={{ borderBottom:`1px solid ${T.border}`,
                          background: i%2===0 ? T.surface : T.bg,
                          cursor:'pointer', transition:'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = T.tealLight}
                        onMouseLeave={e => e.currentTarget.style.background = i%2===0 ? T.surface : T.bg}
                      >
                        <td style={{ padding:'12px 16px', fontWeight:800, color:T.blue, fontSize:14 }}>{r.design_no}</td>
                        <td style={{ padding:'12px 16px', textAlign:'right', fontFamily:'monospace' }}>{QTY(r.produced_qty)}</td>
                        <td style={{ padding:'12px 16px', textAlign:'right', fontFamily:'monospace', fontWeight:700 }}>{QTY(r.net_sold_qty)}</td>
                        <td style={{ padding:'12px 16px', textAlign:'right', fontFamily:'monospace', color:r.returned_qty>0?T.red:T.muted }}>{QTY(r.returned_qty)}</td>
                        <td style={{ padding:'12px 16px', textAlign:'right', fontFamily:'monospace', fontWeight:r.inventory_qty>0?700:400, color:r.inventory_qty>0?T.orange:T.muted }}>{QTY(r.inventory_qty)}</td>
                        <td style={{ padding:'12px 16px', textAlign:'right', fontFamily:'monospace', color:T.muted }}>{r.avg_cost>0?`₹${r.avg_cost.toFixed(1)}`:'—'}</td>
                        <td style={{ padding:'12px 16px', textAlign:'right', fontFamily:'monospace', fontWeight:600 }}>{r.avg_sell_rate>0?`₹${r.avg_sell_rate.toFixed(1)}`:'—'}</td>
                        <td style={{ padding:'12px 16px', textAlign:'right', fontFamily:'monospace', fontWeight:800, color:isLoss?T.red:T.green }}>
                          {INR(r.net_profit)}
                        </td>
                        <td style={{ padding:'12px 16px', textAlign:'right' }}>
                          <span style={{ padding:'4px 8px', borderRadius:6, fontSize:11, fontWeight:800,
                            background:isLoss?T.redLight:T.greenLight, color:isLoss?T.red:T.green }}>
                            {r.margin_pct.toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ padding:'12px 16px', textAlign:'center', color:T.teal, fontSize:16 }}>↗</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
