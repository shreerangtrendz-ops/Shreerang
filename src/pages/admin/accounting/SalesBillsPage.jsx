import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

const T = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6', teal100:'#9FE1CB',
  gold:'#E8A800', goldLight:'#FFF8E8',
  navy:'#0B2E2B', green:'#1E9E5A', greenLight:'#E8FFF4',
  blue:'#2468C8', blueLight:'#EBF8FF',
  red:'#D93025', redLight:'#FFF5F5',
  orange:'#E67E22', orangeLight:'#FFF3E8',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95', textFaint:'#A8C9C3',
};

const fmt  = n => '₹' + Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0});
const fmtL = n => { const v=Number(n||0); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:fmt(v); };
const fmtMtr = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + ' m';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '—';
const PAGE = 50;

function getCurrentFY() {
  const now = new Date();
  const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear()-1;
  return { from:`${yr}-04-01`, to:`${yr+1}-03-31` };
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

export default function SalesBillsPage() {
  const fy = getCurrentFY();
  const [bills, setBills]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]           = useState(0);
  const [expanded, setExpanded]   = useState(null);
  const [expandedTab, setExpandedTab] = useState('items'); // 'items' | 'folding' | 'link'

  // Filters
  const [search, setSearch]       = useState('');
  const [dateFrom, setDateFrom]   = useState(fy.from);
  const [dateTo, setDateTo]       = useState(fy.to);
  const [brokerFilter, setBrokerFilter] = useState('');
  const [partyFilter, setPartyFilter]   = useState('');

  // Summary
  const [summary, setSummary] = useState({total:0, count:0, totalMtrs:0, totalTaka:0, totalComm:0, billsWithBroker:0});

  const fetchBills = useCallback(async (pg=0) => {
    setLoading(true);
    const from = pg*PAGE, to = from+PAGE-1;
    let q = supabase.from('sales_bills')
      .select('*', {count:'exact'})
      .order('bill_date',{ascending:false})
      .range(from,to);
    if (dateFrom) q = q.gte('bill_date',dateFrom);
    if (dateTo)   q = q.lte('bill_date',dateTo);
    if (partyFilter) q = q.ilike('customer_name',`%${partyFilter}%`);
    if (brokerFilter) q = q.ilike('broker_name',`%${brokerFilter}%`);
    if (search) q = q.or(`customer_name.ilike.%${search}%,bill_number.ilike.%${search}%,broker_name.ilike.%${search}%`);

    const {data,error,count} = await q;
    if (!error) { setBills(data||[]); setTotalCount(count||0); }
    setPage(pg);
    setLoading(false);
  }, [dateFrom, dateTo, partyFilter, brokerFilter, search]);

  const fetchSummary = useCallback(async () => {
    let q = supabase.from('sales_bills').select('total_amount,actual_qty,billed_qty,taka_pcs,comm_amount,broker_name');
    if (dateFrom) q = q.gte('bill_date',dateFrom);
    if (dateTo)   q = q.lte('bill_date',dateTo);
    const {data} = await q;
    if (data) {
      const total = data.reduce((s,b)=>s+Number(b.total_amount||0),0);
      const totalMtrs = data.reduce((s,b)=>s+Number(b.billed_qty||b.actual_qty||0),0);
      const totalTaka = data.reduce((s,b)=>s+Number(b.taka_pcs||0),0);
      const totalComm = data.reduce((s,b)=>s+Number(b.comm_amount||0),0);
      const billsWithBroker = data.filter(b=>b.broker_name).length;
      setSummary({total, count:data.length, totalMtrs, totalTaka, totalComm, billsWithBroker});
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchBills(0); fetchSummary(); }, []);

  function applyFilters() { fetchBills(0); fetchSummary(); }
  function resetFilters() {
    setSearch(''); setPartyFilter(''); setBrokerFilter('');
    setDateFrom(fy.from); setDateTo(fy.to);
    setTimeout(()=>{ fetchBills(0); fetchSummary(); },0);
  }

  const totalPages = Math.ceil(totalCount/PAGE);

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh',padding:'20px 24px'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,color:T.text,margin:0}}>Sales Bills</h1>
          <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>Tally sync · All fields from voucher &amp; sub-screens</div>
        </div>
        <Badge label={`${totalCount.toLocaleString()} bills`} color={T.teal} bg={T.tealLight}/>
      </div>

      {/* Summary Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        <SummaryCard label="Total Sales" value={fmtL(summary.total)} sub={`${summary.count} bills`} color={T.teal}/>
        <SummaryCard label="Total Metres" value={fmtMtr(summary.totalMtrs)} sub="billed quantity" color={T.blue}/>
        <SummaryCard label="Total Taka" value={Number(summary.totalTaka).toLocaleString('en-IN',{maximumFractionDigits:0})} sub="pcs dispatched" color={T.navy}/>
        <SummaryCard label="Broker Commission" value={fmtL(summary.totalComm)} sub={`${summary.billsWithBroker} brokered bills`} color={T.gold}/>
        <SummaryCard label="Avg Per Bill" value={summary.count?fmtL(summary.total/summary.count):'—'} sub="per bill avg" color={T.green}/>
      </div>

      {/* Filters */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 18px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div style={{flex:'1 1 180px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>Search</div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Bill no, customer, broker…"
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,color:T.text,background:'#fff',outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{flex:'1 1 140px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>Party</div>
          <input value={partyFilter} onChange={e=>setPartyFilter(e.target.value)} placeholder="Customer name"
            style={{width:'100%',padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,color:T.text,background:'#fff',outline:'none',boxSizing:'border-box'}}/>
        </div>
        <div style={{flex:'1 1 140px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>Broker</div>
          <input value={brokerFilter} onChange={e=>setBrokerFilter(e.target.value)} placeholder="Broker name"
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

      {/* Table */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
        {/* Table header */}
        <div style={{display:'grid',gridTemplateColumns:'130px 90px 1fr 90px 110px 90px 90px 100px 60px',gap:0,background:T.bg,borderBottom:`1px solid ${T.border}`,padding:'10px 16px'}}>
          {['Bill No','Date','Customer','Taka','Metres','Rate','Broker%','Amount',''].map((h,i)=>(
            <div key={i} style={{fontSize:10,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,textAlign:i>=5&&i<=7?'right':'left'}}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{padding:60,textAlign:'center',color:T.textMuted}}>Loading…</div>
        ) : bills.length===0 ? (
          <div style={{padding:60,textAlign:'center',color:T.textMuted}}>No bills found</div>
        ) : bills.map((b,i)=>{
          const isExp = expanded === b.id;
          const lineItems = Array.isArray(b.line_items) ? b.line_items : (typeof b.line_items==='string'?JSON.parse(b.line_items||'[]'):[]);
          const hasShortage = Number(b.shortage_pct||0) > 0;
          return (
            <div key={b.id} style={{borderBottom:`1px solid ${T.border}`}}>
              {/* Main row */}
              <div
                onClick={()=>{ setExpanded(isExp?null:b.id); setExpandedTab('items'); }}
                style={{display:'grid',gridTemplateColumns:'130px 90px 1fr 90px 110px 90px 90px 100px 60px',gap:0,padding:'11px 16px',
                  background:isExp?T.tealLight:'#fff',cursor:'pointer',alignItems:'center',
                  transition:'background .12s'}}
                onMouseEnter={e=>{if(!isExp)e.currentTarget.style.background=T.bg}}
                onMouseLeave={e=>{if(!isExp)e.currentTarget.style.background='#fff'}}
              >
                <div style={{fontWeight:700,color:T.teal,fontSize:12.5,fontFamily:"'DM Mono',monospace"}}>{b.bill_number||'—'}</div>
                <div style={{fontSize:12,color:T.textMuted}}>{fmtDate(b.bill_date)}</div>
                <div>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:280}}>{b.customer_name||'—'}</div>
                  <div style={{fontSize:11,color:T.textMuted,marginTop:1}}>{b.broker_name?`via ${b.broker_name}`:'No broker'} {b.sales_ledger?`· ${b.sales_ledger}`:''}</div>
                </div>
                <div style={{fontSize:12.5,textAlign:'right',color:T.text,fontWeight:500}}>{b.taka_pcs||'—'}</div>
                <div style={{fontSize:12.5,textAlign:'right',color:T.text,fontWeight:500,fontFamily:"'DM Mono',monospace"}}>{b.billed_qty?fmtMtr(b.billed_qty):b.actual_qty?fmtMtr(b.actual_qty):'—'}</div>
                <div style={{fontSize:12,textAlign:'right',color:T.textMuted,fontFamily:"'DM Mono',monospace"}}>{b.rate_per_mtr?`₹${Number(b.rate_per_mtr).toFixed(2)}`:b.line_items&&lineItems[0]?.rate?`₹${Number(lineItems[0].rate).toFixed(2)}`:b.net_rate?`₹${Number(b.net_rate).toFixed(3)}`:'—'}</div>
                <div style={{textAlign:'right'}}>
                  {b.comm_rate ? <Badge label={`${Number(b.comm_rate).toFixed(1)}%`} color={T.gold}/> : <span style={{fontSize:11,color:T.textFaint}}>—</span>}
                </div>
                <div style={{fontSize:13,textAlign:'right',fontWeight:700,color:T.green,fontFamily:"'DM Mono',monospace"}}>{fmt(b.total_amount)}</div>
                <div style={{textAlign:'right',fontSize:16,color:isExp?T.teal:T.textFaint,transition:'.15s'}}>{isExp?'▲':'▼'}</div>
              </div>

              {/* Expanded row */}
              {isExp && (
                <div style={{background:'#F8FFFE',borderTop:`1px solid ${T.border}`,padding:'0 16px 20px'}}>
                  {/* Tab bar */}
                  <div style={{display:'flex',gap:2,padding:'12px 0 14px',borderBottom:`1px solid ${T.border}`,marginBottom:16}}>
                    {[['items','Line Items & Allocations'],['folding','Taka-wise Folding'],['link','Chain Linkage']].map(([k,l])=>(
                      <button key={k} onClick={e=>{e.stopPropagation();setExpandedTab(k)}}
                        style={{padding:'5px 14px',borderRadius:6,border:'none',fontSize:11,fontWeight:600,cursor:'pointer',
                          background:expandedTab===k?T.teal:'transparent',color:expandedTab===k?'#fff':T.textMuted}}>
                        {l}
                      </button>
                    ))}
                  </div>

                  {/* Bill header info */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:16,padding:'12px 14px',background:'#fff',borderRadius:8,border:`1px solid ${T.border}`}}>
                    {[
                      ['Bill Number', b.bill_number],
                      ['Bill Date', fmtDate(b.bill_date)],
                      ['Voucher Class', b.voucher_class||'—'],
                      ['Sales Ledger', b.sales_ledger||'—'],
                      ['GST No.', b.gst_number||'—'],
                      ['Broker', b.broker_name||'—'],
                      ['Commission Rate', b.comm_rate?`${b.comm_rate}%`:'None'],
                      ['Comm. Amount', b.comm_amount?fmt(b.comm_amount):'—'],
                      ['Commission on Qty', b.commission_on_qty||'—'],
                      ['Net Rate', b.net_rate?`₹${Number(b.net_rate).toFixed(3)}/m`:'—'],
                      ['Transporter', b.transporter_name||'—'],
                      ['Mill Godown', b.mill_godown||'—'],
                      ['IGST', b.igst_amount?fmt(b.igst_amount):'—'],
                      ['CGST', b.cgst_amount?fmt(b.cgst_amount):'—'],
                      ['SGST', b.sgst_amount?fmt(b.sgst_amount):'—'],
                      ['Round Off', b.round_off!=null?`₹${b.round_off}`:'—'],
                      ['Assessable Value', b.assessable_value?fmt(b.assessable_value):'—'],
                      ['Total Amount', fmt(b.total_amount)],
                      ['e-Way / GST Bill', b.provide_gst_eway||'No'],
                      ['Commission on Inv.', b.commission_on_invoice_value||'No'],
                    ].map(([k,v])=>(
                      <div key={k}>
                        <div style={{fontSize:10,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,marginBottom:3}}>{k}</div>
                        <div style={{fontSize:12.5,color:T.text,fontWeight:500}}>{v||'—'}</div>
                      </div>
                    ))}
                  </div>

                  {/* Tab: Line Items */}
                  {expandedTab==='items' && (
                    <div>
                      <div style={{fontSize:11,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>Line Items — Stock Item Allocations</div>
                      {lineItems.length > 0 ? (
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                          <thead>
                            <tr style={{background:T.bg}}>
                              {['Item Name','Style/Color/Brand','HSN/SAC','Taka/Pcs','Folding','Actual Qty','Billed Qty','Rate/mtr','Disc%','Amount','Design No.','Godown','Lot No.'].map(h=>(
                                <th key={h} style={{padding:'7px 10px',textAlign:'left',fontSize:10,fontWeight:700,color:T.textMuted,textTransform:'uppercase',borderBottom:`1px solid ${T.border}`,whiteSpace:'nowrap'}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {lineItems.map((item,idx)=>(
                              <tr key={idx} style={{borderBottom:`1px solid ${T.border}`,background:idx%2===0?'#fff':T.bg}}>
                                <td style={{padding:'8px 10px',fontWeight:600,color:T.text,maxWidth:180}}>{item.item_name||item.name||'—'}</td>
                                <td style={{padding:'8px 10px',color:T.textMuted,fontSize:11}}>{item.style_color_brand||item.style||'—'}</td>
                                <td style={{padding:'8px 10px',color:T.textMuted,fontFamily:"'DM Mono',monospace",fontSize:11}}>{item.hsn_sac||item.hsn||'—'}</td>
                                <td style={{padding:'8px 10px',color:T.text}}>{item.taka_pcs||item.pcs||'—'}</td>
                                <td style={{padding:'8px 10px',color:T.text}}>{item.folding||item.folding_pct?`${item.folding||item.folding_pct}%`:'—'}</td>
                                <td style={{padding:'8px 10px',fontFamily:"'DM Mono',monospace",color:T.text}}>{item.actual_qty?fmtMtr(item.actual_qty):item.quantity?fmtMtr(item.quantity):'—'}</td>
                                <td style={{padding:'8px 10px',fontFamily:"'DM Mono',monospace",fontWeight:600,color:T.teal}}>{item.billed_qty?fmtMtr(item.billed_qty):item.actual_qty?fmtMtr(item.actual_qty):'—'}</td>
                                <td style={{padding:'8px 10px',fontFamily:"'DM Mono',monospace",color:T.text}}>{item.rate?`₹${Number(item.rate).toFixed(2)}`:item.rate_per_mtr?`₹${Number(item.rate_per_mtr).toFixed(2)}`:'—'}</td>
                                <td style={{padding:'8px 10px',color:T.textMuted}}>{item.disc_pct!=null?`${item.disc_pct}%`:item.discount!=null?`${item.discount}%`:'—'}</td>
                                <td style={{padding:'8px 10px',fontWeight:700,color:T.green,fontFamily:"'DM Mono',monospace"}}>{item.amount?fmt(item.amount):item.rate&&item.billed_qty?fmt(Number(item.rate)*Number(item.billed_qty)):'—'}</td>
                                <td style={{padding:'8px 10px'}}>
                                  {item.design_no ? <Badge label={item.design_no} color={T.teal}/> : item.design_number ? <Badge label={item.design_number} color={T.teal}/> : <span style={{color:T.textFaint,fontSize:11}}>—</span>}
                                </td>
                                <td style={{padding:'8px 10px',color:T.textMuted,fontSize:11}}>{item.godown||item.godown_name||'—'}</td>
                                <td style={{padding:'8px 10px'}}>
                                  {item.lot_no ? <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:T.orange,fontWeight:600}}>{item.lot_no}</span> : <span style={{color:T.textFaint,fontSize:11}}>—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div style={{padding:'20px',textAlign:'center',color:T.textMuted,fontSize:12,background:'#fff',borderRadius:8,border:`1px solid ${T.border}`}}>
                          Line items not available — data may be in JSONB field or pending sync
                        </div>
                      )}

                      {/* Totals row */}
                      <div style={{marginTop:10,display:'flex',gap:20,padding:'10px 14px',background:T.tealLight,borderRadius:8,fontSize:12.5}}>
                        <span><b style={{color:T.text}}>Total Taka:</b> <span style={{color:T.teal,fontWeight:700}}>{b.taka_pcs||'—'}</span></span>
                        <span><b style={{color:T.text}}>Actual:</b> <span style={{color:T.text,fontFamily:"'DM Mono',monospace"}}>{fmtMtr(b.actual_qty)}</span></span>
                        <span><b style={{color:T.text}}>Billed:</b> <span style={{color:T.teal,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{fmtMtr(b.billed_qty||b.actual_qty)}</span></span>
                        <span><b style={{color:T.text}}>Assessable:</b> <span style={{fontFamily:"'DM Mono',monospace"}}>{b.assessable_value?fmt(b.assessable_value):'—'}</span></span>
                        <span><b style={{color:T.text}}>Net Total:</b> <span style={{color:T.green,fontFamily:"'DM Mono',monospace",fontWeight:700}}>{fmt(b.total_amount)}</span></span>
                      </div>
                    </div>
                  )}

                  {/* Tab: Folding Details */}
                  {expandedTab==='folding' && (
                    <div>
                      <div style={{fontSize:11,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>Taka-wise Folding / L Details</div>
                      {(() => {
                        const foldingData = Array.isArray(b.folding_details) ? b.folding_details :
                          (typeof b.folding_details==='string' ? (() => { try { return JSON.parse(b.folding_details); } catch { return []; } })() : []);
                        return foldingData.length > 0 ? (
                          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                            <thead>
                              <tr style={{background:T.bg}}>
                                {['T-No.','Gross Mtr','Fldg %','Pcs/Taka','Net Mtr','Shade/Color'].map(h=>(
                                  <th key={h} style={{padding:'7px 10px',textAlign:'left',fontSize:10,fontWeight:700,color:T.textMuted,textTransform:'uppercase',borderBottom:`1px solid ${T.border}`}}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {foldingData.map((row,idx)=>(
                                <tr key={idx} style={{borderBottom:`1px solid ${T.border}`,background:idx%2===0?'#fff':T.bg}}>
                                  <td style={{padding:'8px 10px',fontWeight:700,color:T.teal}}>{row.t_no||idx+1}</td>
                                  <td style={{padding:'8px 10px',fontFamily:"'DM Mono',monospace"}}>{row.gross_mtr?fmtMtr(row.gross_mtr):'—'}</td>
                                  <td style={{padding:'8px 10px'}}>{row.folding_pct?`${row.folding_pct}%`:'—'}</td>
                                  <td style={{padding:'8px 10px'}}>{row.pcs_per_taka||'—'}</td>
                                  <td style={{padding:'8px 10px',fontFamily:"'DM Mono',monospace",fontWeight:600,color:T.teal}}>{row.net_mtr?fmtMtr(row.net_mtr):'—'}</td>
                                  <td style={{padding:'8px 10px',color:T.textMuted}}>{row.shade_color||'—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div style={{padding:'24px',textAlign:'center',color:T.textMuted,fontSize:12,background:'#fff',borderRadius:8,border:`1px solid ${T.border}`}}>
                            Folding details not yet available in this record. Will appear once Tally sub-screen data is synced.
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Tab: Chain Linkage */}
                  {expandedTab==='link' && (
                    <div style={{background:'#fff',borderRadius:8,border:`1px solid ${T.border}`,padding:'16px 18px'}}>
                      <div style={{fontSize:11,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,marginBottom:14}}>Design Lifecycle Chain</div>
                      {lineItems.length > 0 ? (
                        <div>
                          {lineItems.map((item,idx)=>{
                            const dn = item.design_no || item.design_number;
                            const lot = item.lot_no;
                            return (
                              <div key={idx} style={{marginBottom:12,padding:'12px 14px',background:T.bg,borderRadius:8,borderLeft:`3px solid ${T.teal}`}}>
                                <div style={{fontSize:12.5,fontWeight:600,color:T.text,marginBottom:8}}>{item.item_name||item.name||`Item ${idx+1}`}</div>
                                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                                  {dn && <div style={{display:'flex',alignItems:'center',gap:6,padding:'4px 10px',background:T.tealLight,borderRadius:6,fontSize:11}}>
                                    <span style={{color:T.textMuted}}>Design:</span>
                                    <span style={{fontWeight:700,color:T.teal,fontFamily:"'DM Mono',monospace"}}>{dn}</span>
                                    <span style={{fontSize:10,color:T.textMuted}}>→ Check REC from Mill production</span>
                                  </div>}
                                  {lot && <div style={{display:'flex',alignItems:'center',gap:6,padding:'4px 10px',background:T.goldLight,borderRadius:6,fontSize:11}}>
                                    <span style={{color:T.textMuted}}>Lot:</span>
                                    <span style={{fontWeight:700,color:T.gold,fontFamily:"'DM Mono',monospace"}}>{lot}</span>
                                    <span style={{fontSize:10,color:T.textMuted}}>→ Trace to Purchase &amp; Issue</span>
                                  </div>}
                                  {item.godown && <div style={{padding:'4px 10px',background:T.blueLight,borderRadius:6,fontSize:11}}>
                                    <span style={{color:T.textMuted}}>Godown: </span><span style={{fontWeight:600,color:T.blue}}>{item.godown}</span>
                                  </div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{color:T.textMuted,fontSize:12}}>Load line items to see design linkage</div>
                      )}
                      {b.broker_name && (
                        <div style={{marginTop:12,padding:'10px 12px',background:T.goldLight,borderRadius:8,border:`1px solid ${T.gold}22`,fontSize:12}}>
                          <span style={{fontWeight:700,color:T.gold}}>Broker: </span>
                          <span style={{color:T.text}}>{b.broker_name} · {b.comm_rate}% · {b.comm_amount?fmt(b.comm_amount):'comm. not calculated'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderTop:`1px solid ${T.border}`,background:T.bg}}>
            <span style={{fontSize:12,color:T.textMuted}}>{totalCount.toLocaleString()} total · Page {page+1} of {totalPages}</span>
            <div style={{display:'flex',gap:6}}>
              {page>0 && <button onClick={()=>fetchBills(page-1)} style={{padding:'6px 14px',border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,cursor:'pointer',background:'#fff',color:T.text}}>← Prev</button>}
              {page<totalPages-1 && <button onClick={()=>fetchBills(page+1)} style={{padding:'6px 14px',background:T.teal,border:'none',borderRadius:6,fontSize:12,cursor:'pointer',color:'#fff',fontWeight:700}}>Next →</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
