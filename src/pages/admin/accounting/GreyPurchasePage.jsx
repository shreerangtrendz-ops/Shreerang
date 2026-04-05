import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

const T = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6',
  gold:'#E8A800', goldLight:'#FFF8E8',
  green:'#1E9E5A', greenLight:'#E8FFF4',
  blue:'#2468C8', blueLight:'#EBF8FF',
  red:'#D93025', redLight:'#FFF5F5',
  orange:'#E67E22', orangeLight:'#FFF3E8',
  purple:'#7C3AED', purpleLight:'#F3EEFF',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95', textFaint:'#A8C9C3',
};

const fmt    = n => '\u20b9' + Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtL   = n => { const v=Number(n||0); return v>=10000000?`\u20b9${(v/10000000).toFixed(2)}Cr`:v>=100000?`\u20b9${(v/100000).toFixed(1)}L`:fmt(v); };
const fmtMtr = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + ' m';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '\u2014';
const PAGE = 50;

const FY_YEARS = [2022,2023,2024,2025,2026];
function getCurrentFY() {
  const now = new Date();
  const yr = now.getMonth()>=3?now.getFullYear():now.getFullYear()-1;
  return {from:`${yr}-04-01`,to:`${yr+1}-03-31`,yr};
}

function Badge({label,color=T.teal,bg}) {
  return <span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700,background:bg||color+'22',color,letterSpacing:.3}}>{label}</span>;
}
function SummaryCard({label,value,sub,color=T.teal}) {
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 18px',borderTop:`3px solid ${color}`}}>
      <div style={{fontSize:10,color:T.textMuted,fontWeight:700,textTransform:'uppercase',letterSpacing:.6,marginBottom:6}}>{label}</div>
      <div style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:22,color:T.text,lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:T.textMuted,marginTop:4}}>{sub}</div>}
    </div>
  );
}

export default function GreyPurchasePage() {
  const fy = getCurrentFY();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [linkedRecs, setLinkedRecs] = useState({});
  const [loadingRecs, setLoadingRecs] = useState({});
  const [summary, setSummary] = useState({mtrs:0,amt:0,comm:0,gst:0,lots:0,suppliers:0});

  const [search,setSearch] = useState('');
  const [dateFrom,setDateFrom] = useState(fy.from);
  const [dateTo,setDateTo] = useState(fy.to);
  const [supplierFilter,setSupplierFilter] = useState('');
  const [brokerFilter,setBrokerFilter] = useState('');
  const [activeFY,setActiveFY] = useState(fy.yr);

  const setFY = yr => {
    setActiveFY(yr);
    setDateFrom(`${yr}-04-01`);
    setDateTo(`${yr+1}-03-31`);
    setPage(0);
  };

  const fetchBills = useCallback(async (pg=0) => {
    setLoading(true);
    const from=pg*PAGE, to=from+PAGE-1;
    let q = supabase.from('grey_purchase')
      .select('*',{count:'exact'})
      .order('voucher_date',{ascending:false})
      .range(from,to);
    if (dateFrom) q=q.gte('voucher_date',dateFrom);
    if (dateTo)   q=q.lte('voucher_date',dateTo);
    if (supplierFilter) q=q.ilike('supplier_name',`%${supplierFilter}%`);
    if (brokerFilter)   q=q.ilike('broker_name',`%${brokerFilter}%`);
    if (search) q=q.or(`lot_no.ilike.%${search}%,supplier_name.ilike.%${search}%,supplier_invoice_no.ilike.%${search}%,item_name.ilike.%${search}%`);
    const {data,error,count} = await q;
    if (!error) { setBills(data||[]); setTotalCount(count||0); }
    setPage(pg);
    setLoading(false);
  }, [dateFrom,dateTo,supplierFilter,brokerFilter,search]);

  const fetchSummary = useCallback(async () => {
    const {data} = await supabase.from('grey_purchase')
      .select('actual_qty_mtrs,total_amount,comm_amount,cgst_amount,sgst_amount,igst_amount,lot_no,supplier_name')
      .gte('voucher_date',dateFrom).lte('voucher_date',dateTo);
    if (!data) return;
    setSummary({
      mtrs:    data.reduce((s,r)=>s+Number(r.actual_qty_mtrs||0),0),
      amt:     data.reduce((s,r)=>s+Number(r.total_amount||0),0),
      comm:    data.reduce((s,r)=>s+Number(r.comm_amount||0),0),
      gst:     data.reduce((s,r)=>s+Number(r.cgst_amount||0)+Number(r.sgst_amount||0)+Number(r.igst_amount||0),0),
      lots:    new Set(data.map(r=>r.lot_no).filter(Boolean)).size,
      suppliers: new Set(data.map(r=>r.supplier_name).filter(Boolean)).size,
    });
  }, [dateFrom,dateTo]);

  const fetchLinkedRecs = async (lotNo, billId) => {
    if (linkedRecs[billId]) return;
    setLoadingRecs(p=>({...p,[billId]:true}));
    const {data} = await supabase.from('rec_from_mill')
      .select('design_no,party_challan_no,voucher_date,finish_qty_mtrs,shortage_mtrs,shortage_pct,job_rate,job_amount,grey_purchase_rate,grey_cost_actual,cumulative_cost_per_mtr,mill_name,finish_item_name,stage_no')
      .eq('grey_lot_no', lotNo)
      .order('voucher_date',{ascending:true});
    setLinkedRecs(p=>({...p,[billId]:data||[]}));
    setLoadingRecs(p=>({...p,[billId]:false}));
  };

  useEffect(()=>{fetchBills(0);},[fetchBills]);
  useEffect(()=>{fetchSummary();},[fetchSummary]);

  const inp = {padding:'7px 10px',borderRadius:6,border:`1px solid ${T.border}`,fontSize:12,color:T.text,background:T.surface,outline:'none'};

  return (
    <div style={{background:T.bg,minHeight:'100vh',padding:'20px 16px',fontFamily:"'DM Sans',sans-serif"}}>

      {/* Header */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:26,color:T.tealDark,margin:0}}>
          Grey Purchase Register
        </h1>
        <p style={{fontSize:12,color:T.textMuted,margin:'4px 0 0'}}>
          Tally grey fabric purchases \u00b7 Lot tracking \u00b7 Broker commission \u00b7 Linked REC & costing
        </p>
      </div>

      {/* FY Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:4,width:'fit-content'}}>
        {FY_YEARS.map(yr=>(
          <button key={yr} onClick={()=>setFY(yr)}
            style={{padding:'5px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:700,
              background:activeFY===yr?T.teal:'transparent',color:activeFY===yr?'#fff':T.textMuted,transition:'all .15s'}}>
            FY {yr.toString().slice(2)}-{(yr+1).toString().slice(2)}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:20}}>
        <SummaryCard label="Total Metres" value={fmtMtr(summary.mtrs)} color={T.teal}/>
        <SummaryCard label="Total Amount" value={fmtL(summary.amt)} color={T.green}/>
        <SummaryCard label="Broker Commission" value={fmtL(summary.comm)} color={T.gold}/>
        <SummaryCard label="Total GST" value={fmtL(summary.gst)} color={T.blue}/>
        <SummaryCard label="Unique Lots" value={summary.lots} sub="grey batches" color={T.purple}/>
        <SummaryCard label="Suppliers" value={summary.suppliers} color={T.orange}/>
      </div>

      {/* Filters */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 16px',marginBottom:16,display:'flex',flexWrap:'wrap',gap:10,alignItems:'center'}}>
        <input placeholder="Search lot, supplier, invoice..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,minWidth:180}}/>
        <input placeholder="Supplier name..." value={supplierFilter} onChange={e=>setSupplierFilter(e.target.value)} style={{...inp,minWidth:140}}/>
        <input placeholder="Broker name..." value={brokerFilter} onChange={e=>setBrokerFilter(e.target.value)} style={{...inp,minWidth:120}}/>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={inp}/>
        <span style={{color:T.textFaint}}>to</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={inp}/>
        <button onClick={()=>{fetchBills(0);fetchSummary();}}
          style={{padding:'7px 16px',borderRadius:6,border:'none',background:T.teal,color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>
          Apply
        </button>
      </div>

      {/* Bill count */}
      <div style={{fontSize:12,color:T.textMuted,marginBottom:10}}>
        Showing {bills.length} of {totalCount} entries
      </div>

      {/* Bills List */}
      {loading&&<div style={{textAlign:'center',padding:40,color:T.textMuted}}>Loading...</div>}
      {!loading&&bills.map(b=>{
        const isOpen = expanded===b.id;
        const recs = linkedRecs[b.id]||[];
        const recLoading = loadingRecs[b.id];
        const hasRecs = recs.length>0;
        const totalCostPerMtr = recs.length>0
          ? recs.reduce((s,r)=>s+Number(r.cumulative_cost_per_mtr||0),0)/recs.length
          : 0;
        const totalFinishQty = recs.reduce((s,r)=>s+Number(r.finish_qty_mtrs||0),0);

        return (
          <div key={b.id} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,marginBottom:8,overflow:'hidden'}}>
            {/* Row */}
            <div
              onClick={()=>{
                const opening = expanded!==b.id;
                setExpanded(opening?b.id:null);
                if (opening && b.lot_no) fetchLinkedRecs(b.lot_no, b.id);
              }}
              style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',cursor:'pointer',
                borderLeft:`4px solid ${b.broker_name&&b.broker_name!=='Self'?T.gold:T.teal}`}}
            >
              {/* Lot No */}
              <div style={{flexShrink:0,minWidth:100}}>
                <div style={{fontFamily:'monospace',fontWeight:700,fontSize:13,color:T.teal}}>{b.lot_no||'\u2014'}</div>
                <div style={{fontSize:10,color:T.textMuted}}>{fmtDate(b.voucher_date)}</div>
              </div>

              {/* Supplier + Invoice */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.supplier_name}</div>
                <div style={{fontSize:11,color:T.textMuted}}>Inv: {b.supplier_invoice_no} \u00b7 Tally: {b.tally_voucher_no}</div>
              </div>

              {/* Item */}
              <div style={{flexShrink:0,minWidth:120,display:'none'}}>
                <div style={{fontSize:12,color:T.textMuted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.item_name}</div>
              </div>

              {/* Qty + Rate */}
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontWeight:700,fontSize:13}}>{fmtMtr(b.actual_qty_mtrs)}</div>
                <div style={{fontSize:11,color:T.textMuted}}>{fmt(b.rate)}/m</div>
              </div>

              {/* Amount */}
              <div style={{textAlign:'right',flexShrink:0,minWidth:80}}>
                <div style={{fontWeight:700,fontSize:13,color:T.green}}>{fmt(b.total_amount)}</div>
                {b.comm_amount>0&&<div style={{fontSize:10,color:T.gold}}>Comm: {fmt(b.comm_amount)}</div>}
              </div>

              {/* Broker */}
              {b.broker_name&&b.broker_name!=='Self'&&(
                <Badge label={b.broker_name} color={T.gold}/>
              )}

              {/* REC status */}
              {hasRecs
                ? <Badge label={`${recs.length} REC`} color={T.green}/>
                : isOpen&&!recLoading&&<Badge label="No REC" color={T.orange}/>
              }

              <div style={{color:T.textFaint,fontSize:16}}>{isOpen?'\u25b2':'\u25bc'}</div>
            </div>

            {/* Expanded Detail */}
            {isOpen&&(
              <div style={{borderTop:`1px solid ${T.border}`,background:T.tealLight}}>

                {/* Purchase Detail Grid */}
                <div style={{padding:'14px 16px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>

                  {/* Col 1: Bill Info */}
                  <div style={{background:T.surface,borderRadius:8,padding:'10px 14px'}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.teal,textTransform:'uppercase',marginBottom:8,letterSpacing:.5}}>Purchase Details</div>
                    {[
                      ['Lot No', b.lot_no, T.teal],
                      ['Supplier Invoice', b.supplier_invoice_no, null],
                      ['Invoice Date', fmtDate(b.supplier_invoice_date), null],
                      ['Tally Voucher', b.tally_voucher_no, null],
                      ['Date', fmtDate(b.voucher_date), null],
                      ['Supplier', b.supplier_name, null],
                      ['Purchase Ledger', b.purchase_ledger, null],
                      ['Godown', b.godown_name, null],
                      ['Taka No', b.taka_no, null],
                      ['Takas', b.taka_pcs, null],
                    ].map(([l,v,c])=>v?(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12}}>
                        <span style={{color:T.textMuted}}>{l}</span>
                        <span style={{color:c||T.text,fontWeight:500,fontFamily:l==='Lot No'||l.includes('Tally')||l.includes('Invoice')?'monospace':'inherit'}}>{v}</span>
                      </div>
                    ):null)}
                  </div>

                  {/* Col 2: Quantity & Financials */}
                  <div style={{background:T.surface,borderRadius:8,padding:'10px 14px'}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.green,textTransform:'uppercase',marginBottom:8,letterSpacing:.5}}>Quantity & Financials</div>
                    {[
                      ['Item / Fabric', b.item_name, null],
                      ['Actual Qty', fmtMtr(b.actual_qty_mtrs), T.teal],
                      ['Billed Qty', fmtMtr(b.billed_qty_mtrs), null],
                      ['Rate/Mtr', fmt(b.rate)+'/m', T.green],
                      ['Item Amount', fmt(b.item_amount), null],
                      ['Assessable Value', fmt(b.assessable_value), null],
                      ['Net Rate', b.net_rate?fmt(b.net_rate)+'/m':null, null],
                      ['CGST', b.cgst_amount>0?fmt(b.cgst_amount):null, T.blue],
                      ['SGST', b.sgst_amount>0?fmt(b.sgst_amount):null, T.blue],
                      ['IGST', b.igst_amount>0?fmt(b.igst_amount):null, T.blue],
                      ['Round Off', b.round_off?`\u20b9${b.round_off}`:null, null],
                      ['Total Amount', fmt(b.total_amount), T.green],
                    ].map(([l,v,c])=>v?(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12}}>
                        <span style={{color:T.textMuted}}>{l}</span>
                        <span style={{color:c||T.text,fontWeight:l==='Total Amount'?700:500}}>{v}</span>
                      </div>
                    ):null)}
                  </div>

                  {/* Col 3: Broker & Tracking */}
                  <div style={{background:T.surface,borderRadius:8,padding:'10px 14px'}}>
                    <div style={{fontSize:10,fontWeight:700,color:T.gold,textTransform:'uppercase',marginBottom:8,letterSpacing:.5}}>Broker & Tracking</div>
                    {[
                      ['Broker Name', b.broker_name, T.gold],
                      ['Comm Rate', b.comm_rate?`${b.comm_rate}%`:null, null],
                      ['Comm Amount', b.comm_amount>0?fmt(b.comm_amount):null, T.gold],
                      ['Track Party', b.track_party, null],
                      ['Track Date', fmtDate(b.track_date), null],
                      ['Track Ref No', b.track_ref_no, null],
                    ].map(([l,v,c])=>v?(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12}}>
                        <span style={{color:T.textMuted}}>{l}</span>
                        <span style={{color:c||T.text,fontWeight:500}}>{v}</span>
                      </div>
                    ):null)}

                    {/* Costing Summary from linked RECs */}
                    {hasRecs&&(
                      <div style={{marginTop:12,padding:'8px',background:T.greenLight,borderRadius:6}}>
                        <div style={{fontSize:10,fontWeight:700,color:T.green,marginBottom:6}}>COSTING SUMMARY</div>
                        <div style={{fontSize:12,display:'flex',justifyContent:'space-between',marginBottom:2}}>
                          <span style={{color:T.textMuted}}>Finished Qty</span>
                          <span style={{fontWeight:700,color:T.green}}>{fmtMtr(totalFinishQty)}</span>
                        </div>
                        <div style={{fontSize:12,display:'flex',justifyContent:'space-between',marginBottom:2}}>
                          <span style={{color:T.textMuted}}>Avg Cost/Mtr</span>
                          <span style={{fontWeight:700,color:T.green}}>{fmt(totalCostPerMtr)}/m</span>
                        </div>
                        <div style={{fontSize:12,display:'flex',justifyContent:'space-between'}}>
                          <span style={{color:T.textMuted}}>Designs Produced</span>
                          <span style={{fontWeight:700}}>{recs.length}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Linked REC FROM MILL */}
                <div style={{padding:'0 16px 14px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.tealDark,textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>
                    Linked REC FROM MILL ({recLoading?'loading...':recs.length+' entries'})
                  </div>
                  {recLoading&&<div style={{color:T.textMuted,fontSize:12,padding:'8px 0'}}>Fetching linked entries...</div>}
                  {!recLoading&&recs.length===0&&(
                    <div style={{background:T.orangeLight,border:`1px solid ${T.orange}44`,borderRadius:6,padding:'8px 12px',fontSize:12,color:T.orange}}>
                      \u26a0 No REC FROM MILL entries found for Lot {b.lot_no}. Check if fabric was issued to mill or REC entry is missing.
                    </div>
                  )}
                  {!recLoading&&recs.length>0&&(
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                        <thead>
                          <tr style={{background:T.tealLight}}>
                            {['Design No','Mill / GP','Date','Issued','Received','Shortage%','Job Rate','Grey Cost','Job Cost','Cost/Mtr','Stage'].map(h=>(
                              <th key={h} style={{padding:'6px 8px',textAlign:'left',fontWeight:700,color:T.tealDark,whiteSpace:'nowrap',borderBottom:`1px solid ${T.border}`}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {recs.map((rec,i)=>{
                            const shortPct=Number(rec.shortage_pct||0);
                            const shortColor=shortPct>15?T.red:shortPct>8?T.orange:T.green;
                            const costPerMtr=Number(rec.cumulative_cost_per_mtr||0);
                            return(
                              <tr key={i} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?T.surface:T.tealLight}}>
                                <td style={{padding:'5px 8px',fontWeight:700,color:T.purple,fontFamily:'monospace'}}>{rec.design_no||'\u2014'}</td>
                                <td style={{padding:'5px 8px',color:T.textMuted}}>{rec.mill_name} / {rec.party_challan_no}</td>
                                <td style={{padding:'5px 8px',whiteSpace:'nowrap'}}>{fmtDate(rec.voucher_date)}</td>
                                <td style={{padding:'5px 8px',textAlign:'right'}}>{fmtMtr(rec.finish_qty_mtrs>0?rec.grey_issued_qty_mtrs||rec.finish_qty_mtrs:0)}</td>
                                <td style={{padding:'5px 8px',textAlign:'right',fontWeight:600,color:T.green}}>{fmtMtr(rec.finish_qty_mtrs)}</td>
                                <td style={{padding:'5px 8px',textAlign:'right',color:shortColor,fontWeight:700}}>{shortPct.toFixed(1)}%</td>
                                <td style={{padding:'5px 8px',textAlign:'right'}}>{rec.job_rate?fmt(rec.job_rate)+'/m':'\u2014'}</td>
                                <td style={{padding:'5px 8px',textAlign:'right'}}>{fmt(rec.grey_cost_actual)}</td>
                                <td style={{padding:'5px 8px',textAlign:'right'}}>{fmt(Math.abs(rec.job_amount||0))}</td>
                                <td style={{padding:'5px 8px',textAlign:'right',fontWeight:700,color:costPerMtr>0?T.teal:T.textMuted}}>
                                  {costPerMtr>0?fmt(costPerMtr)+'/m':'\u2014'}
                                </td>
                                <td style={{padding:'5px 8px',textAlign:'center'}}>
                                  {rec.stage_no>1?<Badge label={`S${rec.stage_no}`} color={T.purple}/>:'1'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr style={{background:T.tealLight,borderTop:`2px solid ${T.teal}`}}>
                            <td colSpan={3} style={{padding:'6px 8px',fontWeight:700,fontSize:11,color:T.tealDark}}>TOTALS</td>
                            <td style={{padding:'6px 8px',textAlign:'right',fontWeight:700}}></td>
                            <td style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:T.green}}>{fmtMtr(totalFinishQty)}</td>
                            <td colSpan={3}></td>
                            <td style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:T.green}}>
                              {fmt(recs.reduce((s,r)=>s+Math.abs(Number(r.job_amount||0)),0))}
                            </td>
                            <td style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:T.teal}}>
                              {totalCostPerMtr>0?fmt(totalCostPerMtr)+'/m avg':'\u2014'}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination */}
      {totalCount>PAGE&&(
        <div style={{display:'flex',gap:8,justifyContent:'center',padding:'16px 0'}}>
          <button onClick={()=>fetchBills(page-1)} disabled={page===0}
            style={{padding:'7px 16px',borderRadius:6,border:`1px solid ${T.border}`,background:T.surface,cursor:'pointer',fontSize:12}}>
            \u2190 Prev
          </button>
          <span style={{padding:'7px 14px',fontSize:12,color:T.textMuted}}>
            Page {page+1} of {Math.ceil(totalCount/PAGE)} \u00b7 {totalCount} entries
          </span>
          <button onClick={()=>fetchBills(page+1)} disabled={(page+1)*PAGE>=totalCount}
            style={{padding:'7px 16px',borderRadius:6,border:`1px solid ${T.border}`,background:T.surface,cursor:'pointer',fontSize:12}}>
            Next \u2192
          </button>
        </div>
      )}
    </div>
  );
}
