import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import SyncHealthBar from '../../../components/accounting/SyncHealthBar';

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
const fmtMtr = n => Math.abs(Number(n||0)).toLocaleString('en-IN',{maximumFractionDigits:2}) + ' m';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '—';
const PAGE = 50;
const FY_YEARS = [2022,2023,2024,2025,2026];

function getCurrentFY() {
  const now = new Date();
  const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear()-1;
  return { from:`${yr}-04-01`, to:`${yr+1}-03-31`, yr };
}

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

export default function PurchaseBillsPage() {
  const fy = getCurrentFY();
  const [bills, setBills]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]             = useState(0);
  const [expanded, setExpanded]     = useState(null);
  const [activeFY, setActiveFY]     = useState(fy.yr);

  const [search, setSearch]         = useState('');
  const [dateFrom, setDateFrom]     = useState(fy.from);
  const [dateTo, setDateTo]         = useState(fy.to);
  const [supplier, setSupplier]     = useState('');

  const [summary, setSummary] = useState({total:0, count:0, totalMtrs:0, tallyCount:0});

  const setFY = yr => {
    setActiveFY(yr);
    setDateFrom(`${yr}-04-01`);
    setDateTo(`${yr+1}-03-31`);
    setPage(0);
  };

  const buildQuery = useCallback(() => {
    let q = supabase.from('purchase_bills').order('bill_date',{ascending:false});
    if (dateFrom)  q = q.gte('bill_date', dateFrom);
    if (dateTo)    q = q.lte('bill_date', dateTo);
    if (supplier)  q = q.ilike('supplier_name', `%${supplier}%`);
    if (search)    q = q.or(`supplier_name.ilike.%${search}%,bill_number.ilike.%${search}%,item_name.ilike.%${search}%`);
    return q;
  }, [dateFrom, dateTo, supplier, search]);

  const fetchBills = useCallback(async (pg=0) => {
    setLoading(true);
    const from = pg*PAGE, to = from+PAGE-1;
    const {data, error, count} = await buildQuery()
      .select('*', {count:'exact'})
      .range(from, to);
    if (!error) { setBills(data||[]); setTotalCount(count||0); }
    setPage(pg);
    setLoading(false);
  }, [buildQuery]);

  const fetchSummary = useCallback(async () => {
    const {data} = await buildQuery()
      .select('total_amount,quantity_mtrs,tally_sync_status');
    if (data) {
      setSummary({
        total:      data.reduce((s,b) => s + Math.abs(Number(b.total_amount||0)), 0),
        count:      data.length,
        totalMtrs:  data.reduce((s,b) => s + Math.abs(Number(b.quantity_mtrs||0)), 0),
        tallyCount: data.filter(b => b.tally_sync_status === 'synced').length,
      });
    }
  }, [buildQuery]);

  useEffect(() => { fetchBills(0); fetchSummary(); }, []);

  function applyFilters() { fetchBills(0); fetchSummary(); }
  function resetFilters() {
    setSearch(''); setSupplier('');
    const f = getCurrentFY();
    setActiveFY(f.yr); setDateFrom(f.from); setDateTo(f.to);
    setTimeout(() => { fetchBills(0); fetchSummary(); }, 0);
  }

  const totalPages = Math.ceil(totalCount/PAGE);

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh',padding:'20px 24px'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,color:T.text,margin:0}}>Purchase Bills</h1>
          <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>Tally purchase vouchers · Supabase synced</div>
        </div>
        <Badge label={`${totalCount.toLocaleString()} bills`} color={T.teal} bg={T.tealLight}/>
      </div>

      {/* Sync Health Bar */}
      <SyncHealthBar tableName="grey_purchase" recordCount={totalCount} />

      {/* FY Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:4,width:'fit-content'}}>
        {FY_YEARS.map(yr => (
          <button key={yr} onClick={() => setFY(yr)}
            style={{padding:'5px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,transition:'all .15s',
              background:activeFY===yr?T.teal:'transparent',color:activeFY===yr?'#fff':T.textMuted}}>
            FY {yr.toString().slice(2)}-{(yr+1).toString().slice(2)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        <SummaryCard label="Total Purchase"  value={fmtL(summary.total)}       sub={`${summary.count} bills`}        color={T.teal}/>
        <SummaryCard label="Total Metres"    value={fmtMtr(summary.totalMtrs)} sub="billed quantity"                  color={T.blue}/>
        <SummaryCard label="From Tally"      value={summary.tallyCount}        sub="auto-synced vouchers"             color={T.green}/>
        <SummaryCard label="Not Yet Synced"  value={summary.count - summary.tallyCount} sub="pre-sync or manual"     color={T.orange}/>
        <SummaryCard label="Avg Per Bill"    value={summary.count ? fmtL(summary.total/summary.count) : '—'} sub="per bill avg" color={T.navy}/>
      </div>

      {/* Filters */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 18px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div style={{flex:'1 1 180px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>Search</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Bill no, supplier, item…"
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,color:T.text,background:'#fff',outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{flex:'1 1 150px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>Supplier</div>
          <input value={supplier} onChange={e=>setSupplier(e.target.value)} placeholder="Supplier name"
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,color:T.text,background:'#fff',outline:'none',boxSizing:'border-box'}}/>
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
        <button onClick={applyFilters} style={{padding:'8px 18px',background:T.teal,color:'#fff',border:'none',borderRadius:7,fontSize:12,fontWeight:700,cursor:'pointer',height:34}}>Apply</button>
        <button onClick={resetFilters} style={{padding:'8px 14px',background:'transparent',color:T.textMuted,border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,cursor:'pointer',height:34}}>Reset</button>
      </div>

      {/* Mobile Cards */}
      <div className="acct-mobile-cards">
        {loading ? (
          <div style={{padding:40,textAlign:'center',color:T.textMuted,fontSize:13}}>Loading…</div>
        ) : bills.length===0 ? (
          <div style={{padding:40,textAlign:'center',color:T.textMuted,fontSize:13}}>No bills found</div>
        ) : bills.map(b => (
          <div key={b.id} className="acct-mobile-card"
            onClick={()=>setExpanded(expanded===b.id?null:b.id)}>
            <div className="amc-header">
              <div>
                <div className="amc-design-badge">{b.bill_number||'—'}</div>
                <div className="amc-design-sub">{b.supplier_name||'—'}</div>
              </div>
              <div>
                <div className="amc-cost">{fmt(b.total_amount)}</div>
                <div className="amc-cost-label">total amt</div>
              </div>
            </div>
            <div className="amc-row">
              <span className="amc-row-label">Date</span>
              <span className="amc-row-val">{fmtDate(b.bill_date)}</span>
            </div>
            <div className="amc-row">
              <span className="amc-row-label">Metres</span>
              <span className="amc-row-val">{b.quantity_mtrs?fmtMtr(b.quantity_mtrs):'—'}</span>
            </div>
            <div className="amc-row">
              <span className="amc-row-label">Rate / m</span>
              <span className="amc-row-val cell-financial">{b.rate_per_mtr?`₹${Number(b.rate_per_mtr).toFixed(2)}`:'—'}</span>
            </div>
            <div className="amc-row">
              <span className="amc-row-label">Fabric</span>
              <span className="amc-row-val" style={{fontSize:12}}>{b.fabric_name||b.item_name||'—'}</span>
            </div>
            <div className="amc-badges">
              {b.design_no && <span className="badge bteal">D{b.design_no}</span>}
              {b.tally_sync_status==='synced' && <span className="badge bgreen">Tally ✔</span>}
              {b.process_lot_no && <span className="badge" style={{background:'rgba(43,168,152,0.08)',color:T.textMuted}}>Lot: {b.process_lot_no}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Table (desktop) */}
      <div className="acct-table-wrap" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
        {/* Header row */}
        <div style={{display:'grid',gridTemplateColumns:'140px 90px 1fr 140px 110px 90px 110px 90px 44px',background:T.bg,borderBottom:`1px solid ${T.border}`,padding:'10px 16px'}}>
          {['Bill No','Date','Supplier','Fabric / Item','Metres','Rate/m','Amount','Source',''].map((h,i)=>(
            <div key={i} style={{fontSize:10,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,
              textAlign:i>=4&&i<=6?'right':'left'}}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{padding:60,textAlign:'center',color:T.textMuted}}>Loading…</div>
        ) : bills.length===0 ? (
          <div style={{padding:60,textAlign:'center',color:T.textMuted}}>No bills found for selected period</div>
        ) : bills.map((b,i) => {
          const isExp = expanded === b.id;
          const lineItems = b.line_items?.inventory || (Array.isArray(b.line_items) ? b.line_items : []);
          const isTally = b.tally_sync_status === 'synced';
          return (
            <div key={b.id} style={{borderBottom:`1px solid ${T.border}`}}>
              <div
                onClick={()=>setExpanded(isExp?null:b.id)}
                style={{display:'grid',gridTemplateColumns:'140px 90px 1fr 140px 110px 90px 110px 90px 44px',
                  padding:'11px 16px',background:isExp?T.tealLight:'#fff',cursor:'pointer',alignItems:'center',transition:'background .12s'}}
                onMouseEnter={e=>{if(!isExp)e.currentTarget.style.background=T.bg}}
                onMouseLeave={e=>{if(!isExp)e.currentTarget.style.background='#fff'}}
              >
                <div style={{fontWeight:700,color:T.teal,fontSize:12,fontFamily:"'DM Mono',monospace"}}>{b.bill_number||'—'}</div>
                <div style={{fontSize:12,color:T.textMuted}}>{fmtDate(b.bill_date)}</div>
                <div>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:260}}>{b.supplier_name||'—'}</div>
                  <div style={{fontSize:11,color:T.textMuted,marginTop:1}}>
                    {b.fabric_name||b.item_name||''}
                    {b.design_no ? ` · Design: ${b.design_no}` : ''}
                    {b.process_lot_no ? ` · Lot: ${b.process_lot_no}` : ''}
                  </div>
                </div>
                <div style={{fontSize:11,color:T.textMuted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {b.fabric_name||b.item_name||'—'}
                </div>
                <div style={{fontSize:12.5,textAlign:'right',fontFamily:"'DM Mono',monospace"}}>
                  {b.quantity_mtrs ? fmtMtr(b.quantity_mtrs) : '—'}
                </div>
                <div style={{fontSize:12,textAlign:'right',color:T.textMuted,fontFamily:"'DM Mono',monospace"}}>
                  {b.rate_per_mtr ? `₹${Math.abs(Number(b.rate_per_mtr)).toFixed(2)}` : '—'}
                </div>
                <div style={{fontSize:13,textAlign:'right',fontWeight:700,color:T.green,fontFamily:"'DM Mono',monospace"}}>
                  {fmt(b.total_amount)}
                </div>
                <div>
                  <Badge
                    label={isTally ? 'Tally' : 'Manual'}
                    color={isTally ? T.green : T.orange}
                  />
                </div>
                <div style={{textAlign:'right',fontSize:16,color:isExp?T.teal:T.textFaint}}>{isExp?'▲':'▼'}</div>
              </div>

              {isExp && (
                <div style={{background:'#F8FFFE',borderTop:`1px solid ${T.border}`,padding:'16px 18px 20px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>

                    {/* Bill Info */}
                    <div style={{background:'#fff',borderRadius:8,border:`1px solid ${T.border}`,padding:'12px 14px'}}>
                      <div style={{fontSize:10,color:T.teal,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Bill Information</div>
                      {[
                        ['Bill Number',       b.bill_number,                                  true],
                        ['Bill Date',         fmtDate(b.bill_date),                           false],
                        ['Supplier',          b.supplier_name,                                false],
                        ['Supplier GSTIN',    b.supplier_gstin||b.gst_number,                 true],
                        ['Supplier State',    b.supplier_state,                               false],
                        ['Supplier Inv No',   b.supplier_invoice_no,                          true],
                        ['Supplier Inv Date', b.supplier_invoice_date ? fmtDate(b.supplier_invoice_date) : null, false],
                        ['Process Mill',      b.process_mill_name,                            false],
                        ['Process Lot No',    b.process_lot_no,                               true],
                        ['Purchase Ledger',   b.purchase_ledger,                              false],
                        ['Design No',         b.design_no,                                    true],
                        ['Batch',             b.batch_name,                                   true],
                        ['Godown',            b.godown,                                       false],
                        ['Entered By',        b.entered_by,                                   false],
                        ['Narration',         b.narration,                                    false],
                        ['Total Amount',      fmt(b.total_amount),                            false],
                      ].filter(([,v]) => v).map(([k,v,mono]) => (
                        <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12,gap:8}}>
                          <span style={{color:T.textMuted,flexShrink:0}}>{k}</span>
                          <span style={{color:T.text,fontWeight:500,fontFamily:mono?"'DM Mono',monospace":'inherit',textAlign:'right',wordBreak:'break-all'}}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Tax & Logistics */}
                    <div style={{background:'#fff',borderRadius:8,border:`1px solid ${T.border}`,padding:'12px 14px'}}>
                      <div style={{fontSize:10,color:T.orange,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Tax &amp; Logistics</div>
                      {[
                        ['Taxable Value', b.taxable_value ? fmt(b.taxable_value) : null],
                        ['IGST',          b.igst_amount  ? fmt(b.igst_amount)    : null],
                        ['CGST',          b.cgst_amount  ? fmt(b.cgst_amount)    : null],
                        ['SGST',          b.sgst_amount  ? fmt(b.sgst_amount)    : null],
                        ['Round Off',     b.round_off!=null ? `₹${b.round_off}`  : null],
                        ['Qty (Mtrs)',     b.quantity_mtrs ? fmtMtr(b.quantity_mtrs) : null],
                        ['Rate/Mtr',      b.rate_per_mtr  ? `₹${Math.abs(Number(b.rate_per_mtr)).toFixed(2)}` : null],
                        ['Total Taka',    b.total_taka_pcs ? String(b.total_taka_pcs) : null],
                        ['HSN Code',      b.hsn_code],
                        ['Transporter',   b.transporter_name],
                        ['LR Number',     b.lr_number||b.lr_no],
                        ['Destination',   b.destination_city||b.destination],
                        ['Broker',        b.broker_name],
                        ['Comm Rate',     b.comm_rate ? `${b.comm_rate}%` : null],
                      ].filter(([,v]) => v).map(([k,v]) => (
                        <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12,gap:8}}>
                          <span style={{color:T.textMuted,flexShrink:0}}>{k}</span>
                          <span style={{color:T.text,fontWeight:500,textAlign:'right',wordBreak:'break-word'}}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Line Items */}
                    <div style={{background:'#fff',borderRadius:8,border:`1px solid ${T.border}`,padding:'12px 14px'}}>
                      <div style={{fontSize:10,color:T.purple,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>
                        Stock Line Items ({lineItems.length||1})
                      </div>
                      {lineItems.length > 0 ? lineItems.map((item,idx) => (
                        <div key={idx} style={{padding:'6px 0',borderBottom:`1px solid ${T.border}`,fontSize:11}}>
                          <div style={{fontWeight:600,color:T.text}}>{item.stock_item||item.item_name||`Item ${idx+1}`}</div>
                          <div style={{display:'flex',gap:10,marginTop:2,color:T.textMuted,flexWrap:'wrap'}}>
                            {item.qty>0  && <span>{fmtMtr(item.qty)}</span>}
                            {item.rate>0 && <span>@ ₹{Math.abs(Number(item.rate)).toFixed(2)}/m</span>}
                            {item.amount && <span style={{color:T.green,fontWeight:600}}>{fmt(item.amount)}</span>}
                            {item.lot_no && <span style={{color:T.orange,fontWeight:600,fontFamily:'monospace'}}>Lot: {item.lot_no}</span>}
                          </div>
                          {(item.track_party||item.track_ref_no) && (
                            <div style={{fontSize:10,color:T.blue,marginTop:4,padding:'3px 7px',background:T.blueLight,borderRadius:4,display:'inline-block'}}>
                              Linked: {item.track_party||'—'}{item.track_ref_no?` (${item.track_ref_no})`:''}
                            </div>
                          )}
                          {item.batches?.slice(0,3).map((bt,bi) => (
                            <div key={bi} style={{fontSize:10,color:T.teal,marginTop:2}}>
                              {bt.batch_name} · {fmtMtr(bt.qty)}
                            </div>
                          ))}
                        </div>
                      )) : (
                        <div style={{fontSize:12,color:T.textMuted}}>
                          <div>{b.fabric_name||'—'}</div>
                          {b.quantity_mtrs>0 && (
                            <div style={{marginTop:4}}>{fmtMtr(b.quantity_mtrs)} @ {b.rate_per_mtr?`₹${Math.abs(Number(b.rate_per_mtr)).toFixed(2)}/m`:'—'}</div>
                          )}
                        </div>
                      )}
                      {b.total_taka_pcs>0 && (
                        <div style={{marginTop:8,padding:'4px 8px',background:T.bg,borderRadius:6,fontSize:11,fontWeight:600,color:T.teal}}>
                          Total Taka/Pcs: {b.total_taka_pcs}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {totalPages > 1 && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderTop:`1px solid ${T.border}`,background:T.bg}}>
            <span style={{fontSize:12,color:T.textMuted}}>{totalCount.toLocaleString()} total · Page {page+1} of {totalPages}</span>
            <div style={{display:'flex',gap:6}}>
              {page>0 && <button onClick={()=>fetchBills(page-1)} style={{padding:'6px 14px',border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,cursor:'pointer',background:'#fff',color:T.text}}>← Prev</button>}
              {page<totalPages-1 && <button onClick={()=>fetchBills(page+1)} style={{padding:'6px 14px',background:T.teal,border:'none',borderRadius:6,fontSize:12,cursor:'pointer',color:'#fff',fontWeight:700}}>Next →</button>}
            </div>
          </div>
        )}
      </div>{/* end acct-table-wrap */}

    </div>
  );
}
