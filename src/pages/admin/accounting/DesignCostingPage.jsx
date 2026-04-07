import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

/* ══════════════════════════════════════════════════════════════════
   DESIGN COSTING PAGE
   Full P&L per design: Grey → Mill → Finish → Sale → Margin
   Formula: Factory Cost/m = (Grey Fabric Cost + Job Cost) / Finish Qty
   Margin % = (Net Revenue - Batch Cost) / Batch Cost × 100
   SIGN CONVENTION: All costs display as POSITIVE. Only Profit/m and
   Margin % are signed (− means loss). DB view stores costs negative
   (Tally accounting convention) — we abs() them on display.
   ══════════════════════════════════════════════════════════════════ */

const T = {
  navy:'#0B2E2B', teal:'#2BA898', tealLight:'#EEF8F6',
  green:'#1E9E5A', red:'#E74C3C', orange:'#E67E22',
  blue:'#2468C8', gold:'#E8A800', purple:'#9B59B6',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', muted:'#6A9B95',
};
// Cost formatters — always show positive (ABS) since DB now stores costs positive
const fmt  = n => '₹' + Math.abs(Number(n||0)).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtR = n => '₹' + Math.abs(Number(n||0)).toFixed(2);
// fmtS = signed formatter, ONLY for profit/margin (+ = profit, - = loss)
const fmtS = n => { const v=Number(n||0); return (v>=0?'+':'')+'₹'+v.toFixed(2); };
const fmtQ = n => Number(n||0).toFixed(1)+' m';
const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
const pct  = n => n != null ? (Number(n)>=0?'+':'')+Number(n).toFixed(1)+'%' : '—';

function MarginBadge({ value }) {
  const v = Number(value||0);
  if (v > 500) return <span style={{background:'#F3F4F6',color:'#9CA3AF',border:'1px solid #E5E7EB',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:800}}>? (partial)</span>;
  const color = v >= 25 ? T.green : v >= 10 ? T.gold : v >= 0 ? T.orange : T.red;
  const bg    = v >= 25 ? '#ECFDF5' : v >= 10 ? '#FFF8E8' : v >= 0 ? '#FFF7ED' : '#FEF2F2';
  return (
    <span style={{background:bg,color,border:`1px solid ${color}`,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:800}}>
      {pct(value)}
    </span>
  );
}

function FormulaPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,marginBottom:16,overflow:'hidden'}}>
      <button onClick={()=>setOpen(!open)}
        style={{width:'100%',padding:'10px 16px',background:T.tealLight,border:'none',cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'space-between',fontWeight:700,fontSize:12,color:T.navy}}>
        <span>📐 Costing Formulas & Logic</span>
        <span>{open?'▲':'▼'}</span>
      </button>
      {open && (
        <div style={{padding:'16px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          {[
            {label:'Factory Cost / Metre', formula:'(Grey Fabric Cost + Mill Job Cost) ÷ Finish Qty (mtrs)', color:T.blue},
            {label:'Gross Margin %', formula:'(Net Revenue − Total Batch Cost) ÷ Total Batch Cost × 100', color:T.green},
            {label:'Profit / Metre', formula:'Avg Selling Rate − Factory Cost per Metre', color:T.teal},
            {label:'Total Batch Cost', formula:'Grey Fabric Cost + Mill Processing Cost', color:T.orange},
            {label:'Net Revenue', formula:'Gross Revenue (Sales Bills) − Credit Note Adjustments', color:T.green},
            {label:'Shortage %', formula:'(Grey Issued − Grey Received) ÷ Grey Issued × 100', color:T.red},
            {label:'Grey Fabric Cost', formula:'Grey Issued Qty × Grey Purchase Rate', color:T.blue},
            {label:'Mill Processing Cost', formula:'Job Rate × Grey Issued Qty (charged on input)', color:T.orange},
            {label:'Unsold Stock', formula:'Finish Qty − Sold Qty + Credit Note Returns', color:T.gold},
          ].map(f=>(
            <div key={f.label} style={{background:T.bg,borderRadius:8,padding:'10px 12px',borderLeft:`3px solid ${f.color}`}}>
              <div style={{fontSize:10,fontWeight:800,color:f.color,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>{f.label}</div>
              <div style={{fontSize:11,color:T.text,fontFamily:'monospace'}}>{f.formula}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DesignLedgerViewer({ rowData }) {
  const designNo = rowData.design_no;
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // 1. Fetch Inwards (rec_from_mill)
      const { data: recs } = await supabase.from('rec_from_mill').select('*').eq('design_no', designNo);
      
      // 2. Fetch Outwards (sales_bills)
      const { data: sales1 } = await supabase.from('sales_bills').select('*').eq('design_no', designNo);
      const { data: sales2 } = await supabase.from('sales_bills').select('*').contains('line_items', `[{"design_no":"${designNo}"}]`);
      const { data: sales3 } = await supabase.from('sales_bills').select('*').contains('line_items', `[{"batch_name":"D No.${designNo}"}]`); // Tally specific
      const { data: sales4 } = await supabase.from('sales_bills').select('*').contains('line_items', `[{"batch_name":"D No-${designNo}"}]`); // Tally specific

      const salesMap = new Map();
      (sales1||[]).forEach(s => salesMap.set(s.tally_voucher_no, s));
      (sales2||[]).forEach(s => salesMap.set(s.tally_voucher_no, s));
      (sales3||[]).forEach(s => salesMap.set(s.tally_voucher_no, s));
      (sales4||[]).forEach(s => salesMap.set(s.tally_voucher_no, s));
      const allSales = Array.from(salesMap.values());

      // 3. Fetch Returns (credit_note_items)
      const { data: cnItems } = await supabase.from('credit_note_items').select('*, credit_note:tally_voucher_no(*)').eq('design_no', designNo);

      const entries = [];

      (recs||[]).forEach(r => {
        entries.push({
          date: r.voucher_date,
          type: 'REC FROM MILL',
          vch: r.tally_voucher_no,
          particulars: r.grey_item_name || 'Grey Fabric',
          mill: r.job_godown || r.mill_name || '',
          inward: r.finish_qty_mtrs || 0,
          inwardVal: Math.abs(r.total_batch_cost || 0),
          outward: null,
          outwardVal: null,
          rate: r.cumulative_cost_per_mtr || 0,
          grey_rate: r.grey_purchase_rate || 0,
          job_rate: Math.abs(r.job_rate || 0),
          shortage: r.shortage_pct || 0,
        });
      });

      allSales.forEach(s => {
        let qty = s.quantity_mtrs;
        let amt = s.total_amount;
        let rate = s.rate_per_mtr;
        if (s.line_items && Array.isArray(s.line_items)) {
           const match = s.line_items.find(l => String(l.design_no) === String(designNo) || l.batch_name === `D No.${designNo}` || l.batch_name === `D No-${designNo}`);
           if (match) {
             qty = match.quantity_mtrs || match.qty_mtrs || qty;
             amt = match.amount || amt;
             rate = match.rate || rate;
           }
        }
        
        entries.push({
          date: s.bill_date,
          type: 'Sales',
          vch: s.bill_number || s.tally_voucher_no,
          particulars: s.customer_name || 'Customer',
          mill: '',
          inward: null,
          inwardVal: null,
          outward: qty || 0,
          outwardVal: amt || 0,
          rate: rate || 0,
        });
      });

      (cnItems||[]).forEach(c => {
        const d = Array.isArray(c.credit_note) ? c.credit_note[0] : c.credit_note;
        entries.push({
          date: d?.voucher_date || '',
          type: 'Credit Note',
          vch: c.tally_voucher_no,
          particulars: d?.party_name || 'Customer Return',
          mill: '',
          inward: c.qty_mtrs || 0,
          inwardVal: null, // Return value shouldn't really add to "batch cost" in ledger
          outward: null,
          outwardVal: null,
          rate: c.rate || 0,
          isReturn: true,
          cnReturnVal: c.item_amount ? -Math.abs(c.item_amount) : 0
        });
      });

      entries.sort((a,b) => new Date(a.date||0) - new Date(b.date||0));
      setLedger(entries);
      setLoading(false);
    }
    load();
  }, [designNo]);

  let totInQty=0, totOutQty=0;

  return (
    <div style={{padding:'0 14px 14px',background:'#FAFFFE'}}>
      <div style={{paddingTop:14}}>
        {/* Cost waterfall (from parent) */}
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:12,flexWrap:'wrap',background:T.bg,borderRadius:8,padding:'10px 14px',border:`1px solid ${T.border}`}}>
          <span style={{fontSize:11,fontWeight:700,color:T.navy}}>Cost Flow:</span>
          {[
            {label:'Grey Purchase',value:fmtR(rowData.grey_purchase_rate||0)+'/m',color:T.blue},
            {label:'→ Grey Cost',  value:fmt(rowData.grey_fabric_cost||0),color:T.blue},
            {label:'+ Mill Job',   value:fmt(Math.abs(rowData.mill_processing_cost||0))+' @'+fmtR(Math.abs(rowData.mill_processing_rate||0))+'/m',color:T.orange},
            {label:'= Batch Cost', value:fmt(Math.abs(rowData.total_batch_cost||0)),color:T.red, bold:true},
            {label:'÷ Finish Qty', value:fmtQ(rowData.finish_qty_mtrs||0),color:T.muted},
            {label:'= Factory/m',  value:fmtR(Math.abs(rowData.factory_cost_per_mtr||0)),color:T.red, bold:true},
            {label:'Sold @',       value:fmtR(rowData.avg_selling_rate||0)+'/m',color:T.green, bold:true},
            {label:'= Profit/m',   value:fmtS(rowData.profit_per_mtr||0),color:Number(rowData.profit_per_mtr||0)>=0?T.green:T.red, bold:true},
          ].map((f,fi)=>(
            <div key={fi} style={{background:T.surface,borderRadius:6,padding:'5px 10px',border:`1px solid ${T.border}`}}>
              <div style={{fontSize:8,color:T.muted,textTransform:'uppercase'}}>{f.label}</div>
              <div style={{fontSize:12,fontWeight:f.bold?800:500,color:f.color}}>{f.value}</div>
            </div>
          ))}
        </div>

        {/* Ledger */}
        <div style={{marginTop:16}}>
          {loading ? (
            <div style={{padding:20,textAlign:'center',color:T.muted,fontSize:12}}>Loading Tally ledger entries...</div>
          ) : (
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,overflow:'hidden'}}>
              <div style={{background:T.tealLight,padding:'8px 12px',fontWeight:700,fontSize:12,color:T.navy,display:'flex',justifyContent:'space-between'}}>
                <span>📊 Batch Vouchers — D No.{designNo}</span>
                <span>{ledger.length} entries</span>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{borderBottom:`1px solid ${T.border}`,background:'#f8fafa'}}>
                    <th style={{padding:'6px 8px',textAlign:'left',color:T.muted}}>Date</th>
                    <th style={{padding:'6px 8px',textAlign:'left',color:T.muted}}>Particulars</th>
                    <th style={{padding:'6px 8px',textAlign:'left',color:T.muted}}>Vch Type</th>
                    <th style={{padding:'6px 8px',textAlign:'left',color:T.muted}}>Vch No.</th>
                    <th style={{padding:'6px 8px',textAlign:'right',color:T.muted}}>Inward Qty</th>
                    <th style={{padding:'6px 8px',textAlign:'right',color:T.muted}}>Inward Val</th>
                    <th style={{padding:'6px 8px',textAlign:'right',color:T.muted}}>Outward Qty</th>
                    <th style={{padding:'6px 8px',textAlign:'right',color:T.muted}}>Outward Val</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((e,idx) => {
                    const isRec = e.type === 'REC FROM MILL';
                    const isCN = e.type === 'Credit Note';
                    if(e.inward) totInQty += e.inward;
                    if(e.outward) totOutQty += e.outward;

                    return (
                      <tr key={idx} style={{borderBottom:`1px solid #f0f0f0`}}>
                        <td style={{padding:'6px 8px',color:T.text,whiteSpace:'nowrap'}}>{fmtD(e.date)}</td>
                        <td style={{padding:'6px 8px',fontWeight:500,color:isRec?T.navy:T.text}}>
                          {e.particulars}
                          {e.mill && <div style={{fontSize:9,color:T.muted}}>Mill: {e.mill}</div>}
                          {isRec && <div style={{fontSize:9,color:T.blue}}>Grey: {fmtR(e.grey_rate)} | Job: {fmtR(e.job_rate)} | Shtg: {e.shortage}%</div>}
                        </td>
                        <td style={{padding:'6px 8px'}}>
                          <span style={{fontSize:9,padding:'2px 6px',borderRadius:4,background:isRec?'#E0F2FE':isCN?'#FCE7F3':'#DCFCE7',color:isRec?'#0369A1':isCN?'#9D174D':'#166534',fontWeight:700,whiteSpace:'nowrap'}}>{e.type}</span>
                        </td>
                        <td style={{padding:'6px 8px',color:T.muted}}>{e.vch}</td>
                        <td style={{padding:'6px 8px',textAlign:'right',color:T.green,fontWeight:e.inward?600:400}}>{e.inward?fmtQ(e.inward):'—'}</td>
                        <td style={{padding:'6px 8px',textAlign:'right',color:isCN?T.red:T.text}}>{isCN?'-'+fmt(Math.abs(e.cnReturnVal)):(e.inwardVal!=null?fmt(e.inwardVal):'—')}</td>
                        <td style={{padding:'6px 8px',textAlign:'right',color:T.orange,fontWeight:e.outward?600:400}}>{e.outward?fmtQ(e.outward):'—'}</td>
                        <td style={{padding:'6px 8px',textAlign:'right'}}>{e.outwardVal!=null?fmt(e.outwardVal):'—'}</td>
                      </tr>
                    );
                  })}
                  <tr style={{background:'#F3F4F6',fontWeight:700}}>
                    <td colSpan={4} style={{padding:'8px',textAlign:'right',color:T.navy}}>TOTAL:</td>
                    <td style={{padding:'8px',textAlign:'right',color:T.green}}>{fmtQ(totInQty)}</td>
                    <td style={{padding:'8px',textAlign:'right'}}></td>
                    <td style={{padding:'8px',textAlign:'right',color:T.orange}}>{fmtQ(totOutQty)}</td>
                    <td style={{padding:'8px',textAlign:'right'}}></td>
                  </tr>
                  <tr style={{background:'#FAFFFE',fontWeight:800,fontSize:13}}>
                    <td colSpan={4} style={{padding:'10px 8px',textAlign:'right',color:T.navy}}>CLOSING STOCK (Unsold):</td>
                    <td colSpan={4} style={{padding:'10px 8px',textAlign:'left',color:T.teal}}>{fmtQ(totInQty - totOutQty)}</td>
                  </tr>
                </tbody>
              </table>
              <div style={{background:T.bg,padding:'10px',borderTop:`1px solid ${T.border}`,fontSize:10,color:T.muted}}>
                * Ledger calculates design-level inward/outward flow chronologically. Match this view with Tally Batch Vouchers (Alt+G &gt; Batch Vouchers).
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DesignCostingPage() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState('gross_margin_pct');
  const [sortAsc, setSortAsc]   = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [marginFilter, setMarginFilter] = useState('');
  const [millFilter, setMillFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('design_costing_v1')
      .select('*').limit(500);
    if (!error) setRows(data||[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows
    .filter(r => {
      if (search && !String(r.design_no).includes(search)
        && !(r.finish_item_name||'').toLowerCase().includes(search.toLowerCase())
        && !(r.mill_name||'').toLowerCase().includes(search.toLowerCase())) return false;
      if (millFilter && r.mill_name !== millFilter) return false;
      if (marginFilter === 'reliable' && !(Number(r.grey_purchase_rate||0) > 0 && Number(r.gross_margin_pct||0) < 500)) return false;
      if (marginFilter === 'positive' && Number(r.gross_margin_pct||0) <= 0) return false;
      if (marginFilter === 'negative' && Number(r.gross_margin_pct||0) >= 0) return false;
      if (marginFilter === 'high' && Number(r.gross_margin_pct||0) < 25) return false;
      if (marginFilter === 'low' && (Number(r.gross_margin_pct||0) < 0 || Number(r.gross_margin_pct||0) >= 15)) return false;
      return true;
    })
    .sort((a,b) => {
      const av = Number(a[sortBy]||0), bv = Number(b[sortBy]||0);
      return sortAsc ? av-bv : bv-av;
    });

  // abs() costs: DB view stores mill/batch costs as negative (Tally accounting convention)
  const abs = v => Math.abs(Number(v||0));
  const agg = filtered.reduce((a,r)=>({
    batchCost:  a.batchCost  + abs(r.total_batch_cost),
    revenue:    a.revenue    + Number(r.net_revenue||0),
    unsold:     a.unsold     + Number(r.unsold_qty_mtrs||0),
    commission: a.commission + Number(r.broker_commission||0),
    designs:    a.designs    + 1,
  }),{batchCost:0,revenue:0,unsold:0,commission:0,designs:0});
  const overallMargin = agg.batchCost>0 ? ((agg.revenue-agg.batchCost)/agg.batchCost*100).toFixed(1) : null;

  const mills = [...new Set(rows.map(r=>r.mill_name).filter(Boolean))].sort();

  const toggleSort = (col) => {
    if (sortBy===col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(false); }
  };
  const sortIcon = (col) => sortBy===col ? (sortAsc?'↑':'↓') : '↕';

  return (
    <div style={{minHeight:'100vh',background:T.bg,padding:'20px 24px',fontFamily:"'DM Sans',sans-serif"}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:800,color:T.navy,margin:0}}>💹 Design Costing</h1>
        <p style={{fontSize:12,color:T.muted,margin:'4px 0 0'}}>Full P&amp;L per design · Grey → Mill → Sale · Margin visibility</p>
      </div>

      <FormulaPanel />

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,marginBottom:16}}>
        {[
          {label:'Designs',        value:agg.designs,         sub:'in view', color:T.teal,   icon:'🎨'},
          {label:'Total Batch Cost',value:fmt(agg.batchCost), sub:'Grey+Job', color:T.red,   icon:'🏭'},
          {label:'Net Revenue',    value:fmt(agg.revenue),    sub:'After CN', color:T.green, icon:'💰'},
          {label:'Overall Margin', value:overallMargin!=null?pct(overallMargin):'—', sub:'(Rev−Cost)/Cost', color:Number(overallMargin)>15?T.green:T.orange, icon:'📊'},
          {label:'Unsold Stock',   value:fmtQ(agg.unsold),    sub:'At factory cost', color:T.gold, icon:'📦'},
          {label:'Broker Comm',    value:fmt(agg.commission), sub:'Total paid', color:T.purple, icon:'🤝'},
        ].map(k=>(
          <div key={k.label} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 14px',borderTop:`3px solid ${k.color}`}}>
            <div style={{fontSize:18,marginBottom:2}}>{k.icon}</div>
            <div style={{fontSize:16,fontWeight:800,color:T.navy}}>{k.value}</div>
            <div style={{fontSize:11,fontWeight:600,color:T.text}}>{k.label}</div>
            {k.sub && <div style={{fontSize:9,color:T.muted,marginTop:1}}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search design no, fabric, mill…"
          style={{flex:'1 1 200px',minWidth:0,padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}} />
        <select value={millFilter} onChange={e=>setMillFilter(e.target.value)}
          style={{padding:'8px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,background:T.surface}}>
          <option value="">All Mills</option>
          {mills.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select value={marginFilter} onChange={e=>setMarginFilter(e.target.value)}
          style={{padding:'8px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,background:T.surface}}>
          <option value="">All Designs</option>
          <option value="reliable">Reliable Cost Only</option>
          <option value="high">High (≥25%)</option>
          <option value="positive">Positive</option>
          <option value="low">Low (0-15%)</option>
          <option value="negative">Negative (Loss)</option>
        </select>
        <button onClick={load}
          style={{padding:'8px 14px',background:T.teal,border:'none',borderRadius:8,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
          {loading?'Loading…':'⟳ Refresh'}
        </button>
        <div style={{fontSize:11,color:T.muted,padding:'7px 0'}}>{filtered.length} designs</div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{textAlign:'center',padding:60,color:T.muted,fontSize:14}}>Loading design costing data…</div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:'center',padding:60,color:T.muted}}>No data found. Run a Tally sync first.</div>
      ) : (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:T.navy}}>
                {[
                  {k:'design_no',      label:'Design'},
                  {k:'finish_item_name',label:'Fabric', noSort:true},
                  {k:'mill_name',       label:'Mill', noSort:true},
                  {k:'finish_qty_mtrs', label:'Finish Qty'},
                  {k:'factory_cost_per_mtr', label:'Cost/m'},
                  {k:'avg_selling_rate',label:'Sell/m'},
                  {k:'total_batch_cost',label:'Batch Cost'},
                  {k:'net_revenue',     label:'Net Revenue'},
                  {k:'gross_margin_pct',label:'Margin %'},
                  {k:'profit_per_mtr',  label:'Profit/m'},
                  {k:'sold_qty_mtrs',   label:'Sold'},
                  {k:'unsold_qty_mtrs', label:'Unsold'},
                  {k:'shortage_pct',    label:'Shortage %'},
                  {k:'',               label:'', noSort:true},
                ].map(h=>(
                  <th key={h.k+h.label} onClick={h.noSort?undefined:()=>toggleSort(h.k)}
                    style={{padding:'9px 10px',color:'rgba(255,255,255,.8)',textAlign:h.k==='design_no'||h.k===''||h.k==='finish_item_name'||h.k==='mill_name'?'left':'right',
                      fontSize:9,textTransform:'uppercase',letterSpacing:'.5px',whiteSpace:'nowrap',
                      cursor:h.noSort?'default':'pointer',userSelect:'none'}}>
                    {h.label}{!h.noSort&&<span style={{marginLeft:3,opacity:.6}}>{sortIcon(h.k)}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r,i)=>{
                const rowBg = expanded===i ? T.tealLight : i%2===0?'#fff':'#FAFFFE';
                return (
                  <>
                    <tr key={String(r.design_no)+i} onClick={()=>setExpanded(expanded===i?null:i)}
                      style={{background:rowBg,borderBottom:`1px solid ${T.border}`,cursor:'pointer',transition:'background .1s'}}>
                      <td style={{padding:'8px 10px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          {r.primary_image_url
                            ? <img src={r.primary_image_url} style={{width:32,height:32,objectFit:'cover',borderRadius:4,flexShrink:0}} />
                            : <div style={{width:32,height:32,background:T.tealLight,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>🎨</div>}
                          <span style={{fontWeight:700,color:T.navy}}>D No-{r.design_no}</span>
                        {Number(r.grey_purchase_rate||0)===0&&<span style={{fontSize:9,padding:'1px 5px',background:'#FFF3E8',color:'#E67E22',borderRadius:3,fontWeight:700}}>partial cost</span>}
                        </div>
                      </td>
                      <td style={{padding:'8px 10px',color:T.text,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.finish_item_name||'—'}</td>
                      <td style={{padding:'8px 10px',color:T.muted,fontSize:10,maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.mill_name||'—'}</td>
                      <td style={{padding:'8px 10px',textAlign:'right'}}>{fmtQ(r.finish_qty_mtrs)}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:T.red,fontWeight:600}}>{fmtR(Math.abs(r.factory_cost_per_mtr||0))}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:T.green,fontWeight:600}}>{fmtR(r.avg_selling_rate||0)}</td>
                      <td style={{padding:'8px 10px',textAlign:'right'}}>{fmt(Math.abs(r.total_batch_cost||0))}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:T.green}}>{fmt(r.net_revenue||0)}</td>
                      <td style={{padding:'8px 10px',textAlign:'right'}}><MarginBadge value={r.gross_margin_pct} /></td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:Number(r.profit_per_mtr||0)>=0?T.green:T.red,fontWeight:600}}>{fmtS(r.profit_per_mtr||0)}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:T.text}}>{fmtQ(r.sold_qty_mtrs||0)}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:Number(r.unsold_qty_mtrs||0)>0?T.gold:T.muted}}>{fmtQ(r.unsold_qty_mtrs||0)}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:T.red}}>{Number(r.shortage_pct||0).toFixed(1)}%</td>
                      <td style={{padding:'8px 10px',textAlign:'center',color:T.muted,fontSize:12}}>{expanded===i?'▲':'▼'}</td>
                    </tr>
                    {expanded===i && (
                      <tr><td colSpan={14} style={{padding:0}}>
                        <DesignLedgerViewer rowData={r} />
                      </td></tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}