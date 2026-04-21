import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import OriginPanel from '../../../components/accounting/OriginPanel';
import SyncHealthBar from '../../../components/accounting/SyncHealthBar';

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

const fmt    = n => '₹' + Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtL   = n => { const v=Number(n||0); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:fmt(v); };
const fmtMtr = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + ' m';
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

export default function SalesBillsPage() {
  const fy = getCurrentFY();
  const [bills, setBills]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]             = useState(0);
  const [expanded, setExpanded]     = useState(null);
  const [activeFY, setActiveFY]     = useState(fy.yr);

  const [search, setSearch]             = useState('');
  const [dateFrom, setDateFrom]         = useState(fy.from);
  const [dateTo, setDateTo]             = useState(fy.to);
  const [brokerFilter, setBrokerFilter] = useState('');
  const [partyFilter, setPartyFilter]   = useState('');

  const [summary, setSummary] = useState({total:0,count:0,totalMtrs:0,totalTaka:0,totalComm:0,billsWithBroker:0});

  const setFY = yr => {
    setActiveFY(yr);
    setDateFrom(`${yr}-04-01`);
    setDateTo(`${yr+1}-03-31`);
    setPage(0);
  };

  const fetchBills = useCallback(async (pg=0) => {
    setLoading(true);
    const from = pg*PAGE, to = from+PAGE-1;
    let q = supabase.from('sales_bills')
      .select('*', {count:'exact'})
      .order('bill_date',{ascending:false})
      .range(from,to);
    if (dateFrom) q = q.gte('bill_date',dateFrom);
    if (dateTo)   q = q.lte('bill_date',dateTo);
    if (partyFilter)  q = q.ilike('customer_name',`%${partyFilter}%`);
    if (brokerFilter) q = q.ilike('broker_name',`%${brokerFilter}%`);
    if (search) q = q.or(`customer_name.ilike.%${search}%,bill_number.ilike.%${search}%,broker_name.ilike.%${search}%,design_no.ilike.%${search}%`);
    const {data,error,count} = await q;
    if (!error) { setBills(data||[]); setTotalCount(count||0); }
    setPage(pg);
    setLoading(false);
  }, [dateFrom, dateTo, partyFilter, brokerFilter, search]);

  const fetchSummary = useCallback(async () => {
    // Paginate to bypass Supabase 1000-row default cap (FY 24-25 has 5000+ bills)
    let allData = [];
    let pg = 0;
    const PG = 1000;
    while (true) {
      let q = supabase.from('sales_bills')
        .select('total_amount,quantity_mtrs,total_taka_pcs,comm_amount,broker_name')
        .range(pg * PG, (pg + 1) * PG - 1);
      if (dateFrom) q = q.gte('bill_date', dateFrom);
      if (dateTo)   q = q.lte('bill_date', dateTo);
      const { data } = await q;
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < PG) break;
      pg++;
    }
    if (allData.length) {
      setSummary({
        total:           allData.reduce((s,b)=>s+Number(b.total_amount||0),0),
        count:           allData.length,
        totalMtrs:       allData.reduce((s,b)=>s+Number(b.quantity_mtrs||0),0),
        totalTaka:       allData.reduce((s,b)=>s+Number(b.total_taka_pcs||0),0),
        totalComm:       allData.reduce((s,b)=>s+Number(b.comm_amount||0),0),
        billsWithBroker: allData.filter(b=>b.broker_name).length,
      });
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchBills(0); fetchSummary(); }, []);

  function applyFilters() { fetchBills(0); fetchSummary(); }
  function resetFilters() {
    setSearch(''); setPartyFilter(''); setBrokerFilter('');
    const f = getCurrentFY();
    setActiveFY(f.yr); setDateFrom(f.from); setDateTo(f.to);
    setTimeout(()=>{ fetchBills(0); fetchSummary(); },0);
  }

  const totalPages = Math.ceil(totalCount/PAGE);

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh',padding:'20px 24px'}}>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,color:T.text,margin:0}}>Sales Bills</h1>
          <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>Tally sync · All fields from voucher &amp; sub-screens</div>
        </div>
        <Badge label={`${totalCount.toLocaleString()} bills`} color={T.teal} bg={T.tealLight}/>
      </div>

      <SyncHealthBar tableName="sales_bills" recordCount={totalCount} />

      <div style={{display:'flex',gap:4,marginBottom:16,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:4,width:'fit-content'}}>
        {FY_YEARS.map(yr => (
          <button key={yr} onClick={()=>setFY(yr)}
            style={{padding:'5px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,transition:'all .15s',
              background:activeFY===yr?T.teal:'transparent',color:activeFY===yr?'#fff':T.textMuted}}>
            FY {yr.toString().slice(2)}-{(yr+1).toString().slice(2)}
          </button>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        <SummaryCard label="Total Sales"       value={fmtL(summary.total)}       sub={`${summary.count} bills`}               color={T.teal}/>
        <SummaryCard label="Total Metres"      value={fmtMtr(summary.totalMtrs)} sub="billed quantity"                        color={T.blue}/>
        <SummaryCard label="Total Taka"        value={Number(summary.totalTaka).toLocaleString('en-IN',{maximumFractionDigits:0})} sub="pcs dispatched" color={T.navy}/>
        <SummaryCard label="Broker Commission" value={fmtL(summary.totalComm)}   sub={`${summary.billsWithBroker} brokered bills`} color={T.gold}/>
        <SummaryCard label="Avg Per Bill"      value={summary.count?fmtL(summary.total/summary.count):'—'} sub="per bill avg" color={T.green}/>
      </div>

      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 18px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div style={{flex:'1 1 180px'}}>
          <div style={{fontSize:10,color:T.textMuted,fontWeight:700,marginBottom:4,textTransform:'uppercase',letterSpacing:.4}}>Search</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Bill no, customer, broker, design…"
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
                <div className="amc-design-sub">{b.customer_name||'—'}</div>
              </div>
              <div>
                <div className="amc-cost">{fmt(b.total_amount)}</div>
                <div className="amc-cost-label">total amt</div>
              </div>
            </div>
            <div className="amc-row"><span className="amc-row-label">Date</span><span className="amc-row-val">{fmtDate(b.bill_date)}</span></div>
            <div className="amc-row"><span className="amc-row-label">Metres</span><span className="amc-row-val">{b.quantity_mtrs?fmtMtr(b.quantity_mtrs):'—'}</span></div>
            <div className="amc-row"><span className="amc-row-label">Rate / m</span><span className="amc-row-val cell-financial">{b.rate_per_mtr?`₹${Number(b.rate_per_mtr).toFixed(2)}`:'—'}</span></div>
            <div className="amc-row"><span className="amc-row-label">Taka</span><span className="amc-row-val">{b.total_taka_pcs||'—'}</span></div>
            <div className="amc-badges">
              {b.design_no && <span className="badge bteal">D{b.design_no}</span>}
              {b.broker_name && <span className="badge bgold">{b.broker_name} {b.comm_rate}%</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="acct-table-wrap" style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'140px 90px 1fr 80px 110px 90px 90px 110px 50px',gap:0,background:T.bg,borderBottom:`1px solid ${T.border}`,padding:'10px 16px'}}>
          {['Bill No','Date','Customer','Taka','Metres','Rate/m','Broker%','Amount',''].map((h,i)=>(
            <div key={i} style={{fontSize:10,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,textAlign:i>=5&&i<=7?'right':'left'}}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{padding:60,textAlign:'center',color:T.textMuted}}>Loading…</div>
        ) : bills.length===0 ? (
          <div style={{padding:60,textAlign:'center',color:T.textMuted}}>No bills found for selected period</div>
        ) : bills.map((b,i)=>{
          const isExp = expanded === b.id;
          return (
            <div key={b.id} style={{borderBottom:`1px solid ${T.border}`}}>
              <div
                onClick={()=>setExpanded(isExp?null:b.id)}
                style={{display:'grid',gridTemplateColumns:'140px 90px 1fr 80px 110px 90px 90px 110px 50px',gap:0,padding:'11px 16px',
                  background:isExp?T.tealLight:'#fff',cursor:'pointer',alignItems:'center',transition:'background .12s'}}
                onMouseEnter={e=>{if(!isExp)e.currentTarget.style.background=T.bg}}
                onMouseLeave={e=>{if(!isExp)e.currentTarget.style.background='#fff'}}
              >
                <div style={{fontWeight:700,color:T.teal,fontSize:12,fontFamily:"'DM Mono',monospace"}}>{b.bill_number||'—'}</div>
                <div style={{fontSize:12,color:T.textMuted}}>{fmtDate(b.bill_date)}</div>
                <div>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:280}}>{b.customer_name||'—'}</div>
                  <div style={{fontSize:11,color:T.textMuted,marginTop:1}}>
                    {b.broker_name?`via ${b.broker_name}`:'No broker'}
                    {b.design_no ? ` · Design: ${b.design_no}` : ''}
                    {b.sales_ledger ? ` · ${b.sales_ledger}` : ''}
                  </div>
                </div>
                <div style={{fontSize:12.5,textAlign:'right',color:T.text,fontWeight:500}}>{b.total_taka_pcs||'—'}</div>
                <div style={{fontSize:12.5,textAlign:'right',fontFamily:"'DM Mono',monospace"}}>{b.quantity_mtrs?fmtMtr(b.quantity_mtrs):'—'}</div>
                <div style={{fontSize:12,textAlign:'right',color:T.textMuted,fontFamily:"'DM Mono',monospace"}}>{b.rate_per_mtr?`₹${Number(b.rate_per_mtr).toFixed(2)}`:'—'}</div>
                <div style={{textAlign:'right'}}>
                  {b.comm_rate ? <Badge label={`${Number(b.comm_rate).toFixed(1)}%`} color={T.gold}/> : <span style={{fontSize:11,color:T.textFaint}}>—</span>}
                </div>
                <div style={{fontSize:13,textAlign:'right',fontWeight:700,color:T.green,fontFamily:"'DM Mono',monospace"}}>{fmt(b.total_amount)}</div>
                <div style={{textAlign:'right',fontSize:16,color:isExp?T.teal:T.textFaint}}>{isExp?'▲':'▼'}</div>
              </div>

              {isExp && (
                <div style={{background:'#F8FFFE',borderTop:`1px solid ${T.border}`,padding:'16px 18px 20px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16,padding:'12px 14px',background:'#fff',borderRadius:8,border:`1px solid ${T.border}`}}>
                    {[
                      ['Bill Number',b.bill_number],['Bill Date',fmtDate(b.bill_date)],['Customer',b.customer_name],
                      ['Customer GSTIN',b.customer_gstin||'—'],['Customer State',b.customer_state||'—'],
                      ['Fabric',b.fabric_name||'—'],['Design No',b.design_no||'—'],['Batch Name',b.batch_name||'—'],
                      ['Godown',b.godown||'—'],['Sales Ledger',b.sales_ledger||'—'],
                      ['Voucher Class',b.voucher_class||'—'],['Place of Supply',b.place_of_supply||'—'],
                      ['Broker',b.broker_name||'None'],['Comm Rate',b.comm_rate?`${b.comm_rate}%`:'None'],
                      ['Comm Amount',b.comm_amount?fmt(b.comm_amount):'—'],['Comm Assessed',b.comm_assessed_value?fmt(b.comm_assessed_value):'—'],
                      ['Qty (Mtrs)',b.quantity_mtrs?fmtMtr(b.quantity_mtrs):'—'],['Taka / Pcs',b.total_taka_pcs||'—'],
                      ['Rate/Mtr',b.rate_per_mtr?`₹${Number(b.rate_per_mtr).toFixed(2)}`:'—'],['Taxable Value',b.taxable_value?fmt(b.taxable_value):'—'],
                      ['IGST',b.igst_amount?fmt(b.igst_amount):'—'],['CGST',b.cgst_amount?fmt(b.cgst_amount):'—'],
                      ['SGST',b.sgst_amount?fmt(b.sgst_amount):'—'],['Round Off',b.round_off!=null?`₹${b.round_off}`:'—'],
                      ['Total Amount',fmt(b.total_amount)],['Credit Days',b.credit_days||'—'],
                      ['Bill Ref No',b.bill_ref_number||'—'],['Transporter',b.transporter_name||'—'],
                      ['LR Number',b.lr_number||'—'],['Destination City',b.destination_city||'—'],
                      ['e-Way Bill No',b.eway_bill_no||'—'],['IRN',b.irn||'—'],
                      ['Entered By',b.entered_by||'—'],['Narration',b.narration||'—'],
                    ].map(([k,v])=>(
                      <div key={k}>
                        <div style={{fontSize:9,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.4,marginBottom:2}}>{k}</div>
                        <div style={{fontSize:12,color:T.text,fontWeight:500,wordBreak:'break-word'}}>{v||'—'}</div>
                      </div>
                    ))}
                  </div>

                  {b.design_no && <div style={{marginBottom:12}}><OriginPanel designNo={b.design_no} /></div>}

                  {Array.isArray(b.line_items) && b.line_items.length > 0 && (
                    <div style={{marginBottom:12}}>
                      <div style={{fontSize:11,fontWeight:700,color:T.text,textTransform:'uppercase',letterSpacing:.5,marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                        Line Items
                        <span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700,background:T.teal+'22',color:T.teal}}>
                          {b.line_items.length} design{b.line_items.length!==1?'s':''}
                        </span>
                      </div>
                      <div style={{overflowX:'auto',borderRadius:8,border:`1px solid ${T.border}`}}>
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,background:T.surface}}>
                          <thead>
                            <tr style={{background:T.bg,borderBottom:`1px solid ${T.border}`}}>
                              {['Design No','Batch / Fabric','Item Name','HSN','Godown','Qty (m)','Rate/m','Discount','Amount'].map(h=>(
                                <th key={h} style={{padding:'7px 10px',textAlign:'left',fontWeight:700,fontSize:10,color:T.textMuted,textTransform:'uppercase',letterSpacing:.4,whiteSpace:'nowrap'}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {b.line_items.map((li, idx) => (
                              <tr key={idx} style={{borderBottom:`1px solid ${T.border}`,background:idx%2===0?T.surface:T.bg}}>
                                <td style={{padding:'7px 10px',fontWeight:700,color:T.purple,fontFamily:"'DM Mono',monospace",fontSize:12}}>{li.design_no||'—'}</td>
                                <td style={{padding:'7px 10px'}}>
                                  <div style={{fontWeight:600,fontSize:12,color:T.text}}>{li.batch_name||li.design_no||'—'}</div>
                                  {li.fabric_name && <div style={{fontSize:10,color:T.textMuted,marginTop:1}}>{li.fabric_name}</div>}
                                </td>
                                <td style={{padding:'7px 10px',color:T.textMuted,fontSize:11,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{li.item_name||li.name||'—'}</td>
                                <td style={{padding:'7px 10px',fontFamily:"'DM Mono',monospace",color:T.textMuted,fontSize:11}}>{li.hsn_code||'—'}</td>
                                <td style={{padding:'7px 10px',color:T.textMuted,fontSize:11,whiteSpace:'nowrap'}}>{li.godown||li.godown_name||'—'}</td>
                                <td style={{padding:'7px 10px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontWeight:600}}>{li.qty_mtrs||li.quantity_mtrs?Number(li.qty_mtrs||li.quantity_mtrs||0).toLocaleString('en-IN',{maximumFractionDigits:2})+'m':'—'}</td>
                                <td style={{padding:'7px 10px',textAlign:'right',color:T.textMuted,fontFamily:"'DM Mono',monospace"}}>{li.rate||li.rate_per_mtr?`₹${Number(li.rate||li.rate_per_mtr||0).toFixed(2)}`:'—'}</td>
                                <td style={{padding:'7px 10px',textAlign:'right',color:T.textMuted}}>{li.discount_pct>0?`${li.discount_pct}%`:'—'}</td>
                                <td style={{padding:'7px 10px',textAlign:'right',fontWeight:700,color:T.green,fontFamily:"'DM Mono',monospace"}}>{li.item_amount||li.amount?'₹'+Number(li.item_amount||li.amount||0).toLocaleString('en-IN',{maximumFractionDigits:0}):'—'}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{background:T.bg,borderTop:`2px solid ${T.border}`}}>
                              <td colSpan={5} style={{padding:'7px 10px',fontWeight:700,fontSize:11,color:T.textMuted}}>TOTAL ({b.line_items.length} lines)</td>
                              <td style={{padding:'7px 10px',textAlign:'right',fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{b.quantity_mtrs?Number(b.quantity_mtrs).toLocaleString('en-IN',{maximumFractionDigits:2})+'m':'—'}</td>
                              <td colSpan={2}/>
                              <td style={{padding:'7px 10px',textAlign:'right',fontWeight:700,color:T.green,fontFamily:"'DM Mono',monospace"}}>₹{Number(b.total_amount||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {b.broker_name && (
                    <div style={{padding:'10px 12px',background:T.goldLight,borderRadius:8,border:`1px solid ${T.gold}22`,fontSize:12}}>
                      <span style={{fontWeight:700,color:T.gold}}>Broker: </span>
                      <span style={{color:T.text}}>{b.broker_name} · {b.comm_rate}% · {b.comm_amount?fmt(b.comm_amount):'comm. not calculated'}</span>
                    </div>
                  )}
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
      </div>
    </div>
  );
}
