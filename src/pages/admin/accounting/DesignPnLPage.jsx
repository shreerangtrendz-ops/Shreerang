import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

// ═══════════════════════════════════════════════════════════════════
// DESIGN P&L PAGE (PROFITABILITY)
// Data Sources: rec_from_mill (cost), sales_bills (revenue), credit_note_items (returns)
// Calculates piece-level and aggregate profitability per design.
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

const fmt  = n => n ? '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:0}) : '₹0';
const fmtQ = n => n ? Number(n).toLocaleString('en-IN', {maximumFractionDigits:1})+'m' : '0m';

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

export default function DesignPnLPage() {
  const [loading, setLoading] = useState(true);
  const [pnlData, setPnlData] = useState([]);
  
  // Filters
  const [search, setSearch]   = useState('');
  const [sortBy, setSortBy]   = useState('profit_desc');

  const loadData = useCallback(async () => {
    setLoading(true);

    // 1. Fetch Production Data (Costs)
    const { data: recData } = await supabase
      .from('rec_from_mill')
      .select('design_no, finish_qty_mtrs, cumulative_cost_per_mtr')
      .not('design_no', 'is', null);

    // 2. Fetch Sales Data (Revenue)
    const { data: salesData } = await supabase
      .from('sales_bills')
      .select('design_no, quantity_mtrs, rate_per_mtr')
      .not('design_no', 'is', null);

    // 3. Fetch Returns (Credit Notes)
    const { data: returnData } = await supabase
      .from('credit_note_items')
      .select('design_no, qty_mtrs')
      .not('design_no', 'is', null);

    // Aggregate by Design
    const map = new Map();
    const getMap = (dn) => {
      let d = dn?.trim().toUpperCase();
      if (!d) return null;
      if (!map.has(d)) map.set(d, {
        design_no: d,
        produced_qty: 0, cost_value: 0,
        sold_qty: 0, sales_value: 0,
        returned_qty: 0
      });
      return map.get(d);
    };

    // Process REC
    (recData || []).forEach(r => {
      const g = getMap(r.design_no);
      if (!g) return;
      const qty = Number(r.finish_qty_mtrs) || 0;
      const cost = Number(r.cumulative_cost_per_mtr) || 0;
      g.produced_qty += qty;
      g.cost_value += (qty * cost);
    });

    // Process Sales
    (salesData || []).forEach(r => {
      // primary batch designs shouldn't affect pure design pnl without sub allocation logic
      if (r.design_no === 'Primary Batch') return; 
      const g = getMap(r.design_no);
      if (!g) return;
      const qty = Number(r.quantity_mtrs) || 0;
      const rate = Number(r.rate_per_mtr) || 0;
      g.sold_qty += qty;
      g.sales_value += (qty * rate);
    });

    // Process Returns
    (returnData || []).forEach(r => {
      const g = getMap(r.design_no);
      if (!g) return;
      const qty = Number(r.qty_mtrs) || 0;
      g.returned_qty += qty;
    });

    // Finalize metrics
    const results = Array.from(map.values()).map(g => {
      g.avg_cost      = g.produced_qty > 0 ? (g.cost_value / g.produced_qty) : 0;
      g.avg_sell_rate = g.sold_qty > 0 ? (g.sales_value / g.sold_qty) : 0;
      g.net_sold_qty  = g.sold_qty - g.returned_qty;
      g.inventory_qty = g.produced_qty - g.net_sold_qty;
      
      // Profit is calculated on NET SOLD quantity
      g.total_revenue = g.net_sold_qty * g.avg_sell_rate;
      g.cogs          = g.net_sold_qty * g.avg_cost; // Cost of Goods Sold
      g.net_profit    = g.total_revenue - g.cogs;
      g.margin_pct    = g.total_revenue > 0 ? (g.net_profit / g.total_revenue) * 100 : 0;

      return g;
    });

    setPnlData(results);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Sorting & Filtering
  const filteredRows = useMemo(() => {
    let arr = pnlData.filter(d => {
      if (search && !d.design_no.includes(search.toUpperCase())) return false;
      return true;
    });

    arr.sort((a, b) => {
      if (sortBy === 'profit_desc') return b.net_profit - a.net_profit;
      if (sortBy === 'profit_asc')  return a.net_profit - b.net_profit;
      if (sortBy === 'qty_desc')    return b.net_sold_qty - a.net_sold_qty;
      if (sortBy === 'margin_desc') return b.margin_pct - a.margin_pct;
      if (sortBy === 'inventory_desc') return b.inventory_qty - a.inventory_qty;
      return 0;
    });

    return arr;
  }, [pnlData, search, sortBy]);

  // Top KPIs
  const global = useMemo(() => {
    return pnlData.reduce((acc, curr) => {
      acc.revenue += curr.total_revenue;
      acc.profit  += curr.net_profit;
      acc.sold    += curr.net_sold_qty;
      acc.inv     += curr.inventory_qty;
      return acc;
    }, { revenue: 0, profit: 0, sold: 0, inv: 0 });
  }, [pnlData]);

  const globalMargin = global.revenue > 0 ? (global.profit / global.revenue) * 100 : 0;

  const TH = ({ l, r, w }) => (
    <th style={{ padding:'12px 16px', textAlign:r?'right':'left', fontSize:11, fontWeight:800,
      color:T.muted, textTransform:'uppercase', letterSpacing:.5, width: w||'auto',
      borderBottom:`2px solid ${T.border}`, background:T.bg, whiteSpace:'nowrap' }}>{l}</th>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:T.bg, minHeight:'100vh', padding:'30px' }}>
      
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:800, color:T.dark, margin:0, letterSpacing:-0.5 }}>📈 Design P&L Analytics</h1>
          <p style={{ color:T.muted, fontSize:14, margin:'4px 0 0' }}>
            Piece-level profitability derived from end-to-end Tally traceability (Purchase → Mill → Sale → Return).
          </p>
        </div>
        <button onClick={loadData} style={{ padding:'10px 18px', background:T.teal, color:'#fff',
          border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:'0 4px 12px rgba(43,168,152,0.2)' }}>
          Sync Latest Costs
        </button>
      </div>

      {/* Global KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <KPICard label="Total Net Revenue" value={fmt(global.revenue)} sub={`From ${fmtQ(global.sold)} net sold fabric`} color={T.blue}/>
        <KPICard label="Total Gross Profit" value={fmt(global.profit)} sub="Before indirect expenses & brokerage" color={T.green}/>
        <KPICard label="Blended Margin" value={`${globalMargin.toFixed(1)}%`} sub="Overall design-level margin" color={T.teal}/>
        <KPICard label="Unsold Inventory" value={fmtQ(global.inv)} sub="Ready finished goods" color={T.orange}/>
      </div>

      {/* Controls */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
        padding:'16px', marginBottom:20, display:'flex', gap:16, alignItems:'flex-end' }}>
        
        <div style={{ flex: 1, maxWidth: 300 }}>
          <div style={{ fontSize:11, color:T.muted, fontWeight:800, marginBottom:6, textTransform:'uppercase' }}>Search Design</div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="e.g. 3270..."
            style={{ width:'100%', padding:'10px 14px', border:`1px solid ${T.border}`,
              borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', background:T.bg, fontWeight:600 }}/>
        </div>

        <div>
          <div style={{ fontSize:11, color:T.muted, fontWeight:800, marginBottom:6, textTransform:'uppercase' }}>Sort By</div>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            style={{ padding:'10px 14px', border:`1px solid ${T.border}`,
              borderRadius:8, fontSize:14, background:T.bg, outline:'none', fontWeight:600, cursor:'pointer' }}>
            <option value="profit_desc">Highest Profit</option>
            <option value="profit_asc">Lowest Profit</option>
            <option value="margin_desc">Highest Margin %</option>
            <option value="qty_desc">Highest Sales Qty</option>
            <option value="inventory_desc">Highest Inventory Qty</option>
          </select>
        </div>
      </div>

      {/* Dashboard Table */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden', boxShadow:'0 2px 10px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding:80, textAlign:'center', color:T.muted, fontSize:16, fontWeight:600 }}>Calculating distributed margins...</div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding:80, textAlign:'center', color:T.muted, fontSize:16, fontWeight:600 }}>No design data available.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr>
                  <TH l="Design No"/>
                  <TH l="Produced" r/>
                  <TH l="Net Sold" r/>
                  <TH l="Returns" r/>
                  <TH l="Cur. Stock" r/>
                  <TH l="Avg Cost" r/>
                  <TH l="Avg Sell" r/>
                  <TH l="Gross Profit" r/>
                  <TH l="Margin" r/>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => {
                  const isLoss = r.net_profit < 0;
                  return (
                    <tr key={r.design_no}
                      style={{ borderBottom:`1px solid ${T.border}`, background: i%2===0 ? T.surface : T.bg }}>
                      <td style={{ padding:'12px 16px', fontWeight:800, color:T.blue, fontSize:14 }}>{r.design_no}</td>
                      <td style={{ padding:'12px 16px', textAlign:'right', fontFamily:'monospace', fontWeight:500 }}>{fmtQ(r.produced_qty)}</td>
                      <td style={{ padding:'12px 16px', textAlign:'right', fontFamily:'monospace', fontWeight:700, color:T.dark }}>{fmtQ(r.net_sold_qty)}</td>
                      <td style={{ padding:'12px 16px', textAlign:'right', fontFamily:'monospace', color: r.returned_qty>0 ? T.red : T.muted }}>{fmtQ(r.returned_qty)}</td>
                      <td style={{ padding:'12px 16px', textAlign:'right', fontFamily:'monospace', fontWeight:r.inventory_qty>0?700:500, color:r.inventory_qty>0?T.orange:T.muted }}>{fmtQ(r.inventory_qty)}</td>
                      
                      <td style={{ padding:'12px 16px', textAlign:'right', fontFamily:'monospace', color:T.muted }}>{r.avg_cost>0 ? `₹${r.avg_cost.toFixed(1)}/m` : '—'}</td>
                      <td style={{ padding:'12px 16px', textAlign:'right', fontFamily:'monospace', fontWeight:600 }}>{r.avg_sell_rate>0 ? `₹${r.avg_sell_rate.toFixed(1)}/m` : '—'}</td>
                      
                      <td style={{ padding:'12px 16px', textAlign:'right', fontFamily:'monospace', fontWeight:800, color: isLoss ? T.red : T.green }}>
                        {fmt(r.net_profit)}
                      </td>
                      <td style={{ padding:'12px 16px', textAlign:'right' }}>
                        <span style={{ 
                          padding:'4px 8px', borderRadius:6, fontSize:11, fontWeight:800,
                          background: isLoss ? T.redLight : T.greenLight, color: isLoss ? T.red : T.green
                         }}>
                          {r.margin_pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
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
