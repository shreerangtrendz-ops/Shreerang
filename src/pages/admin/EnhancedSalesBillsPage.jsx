import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

const T = {
  teal:'#2BA898', tealLight:'#EEF8F6', navy:'#0B2E2B',
  green:'#1E9E5A', greenLight:'#E8FFF4',
  red:'#E74C3C', redLight:'#FFF5F5',
  orange:'#E67E22', amberLight:'#FFFBEB',
  blue:'#2468C8', blueLight:'#EBF8FF',
  gold:'#E8A800', goldLight:'#FFF8E8',
  purple:'#9B59B6', purpleLight:'#F5EFF9',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95',
};

const fmtAmt = n => { const v=Number(n||0); return v>=10000000?`\u20B9${(v/10000000).toFixed(2)}Cr`:v>=100000?`\u20B9${(v/100000).toFixed(1)}L`:`\u20B9${Math.round(v).toLocaleString('en-IN')}`; };
const fmtN = (n,d=1) => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:d});

const PAGE = 50;

export default function EnhancedSalesBillsPage() {
  const nav = useNavigate();
  const [bills, setBills] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [brokers, setBrokers] = useState([]);
  const [kpis, setKpis] = useState({});

  useEffect(() => { loadKpis(); loadBrokers(); }, []);
  useEffect(() => { loadBills(); }, [page, search, dateFrom, dateTo, brokerFilter]);

  const loadKpis = async () => {
    const fy = new Date().getMonth()>=3?new Date().getFullYear():new Date().getFullYear()-1;
    const fyStart = `${fy}-04-01`;
    const { data } = await supabase.from('sales_bills')
      .select('total_amount,bill_date,quantity_mtrs,comm_amount')
      .gte('bill_date', fyStart);
    if (!data) return;
    const total = data.reduce((a,b)=>a+(b.total_amount||0),0);
    const qty = data.reduce((a,b)=>a+(b.quantity_mtrs||0),0);
    const comm = data.reduce((a,b)=>a+(b.comm_amount||0),0);
    setKpis({ total, qty, comm, count: data.length, fyStart });
  };

  const loadBrokers = async () => {
    const { data } = await supabase.from('sales_bills').select('broker_name').not('broker_name','is',null).limit(2000);
    const set = [...new Set((data||[]).map(d=>d.broker_name).filter(Boolean))].sort();
    setBrokers(set);
  };

  const loadBills = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('sales_bills')
      .select('*', { count:'exact' })
      .order('bill_date',{ascending:false})
      .range(page*PAGE, (page+1)*PAGE-1);

    if (search) q = q.or(`customer_name.ilike.%${search}%,bill_number.ilike.%${search}%,broker_name.ilike.%${search}%,narration.ilike.%${search}%,sales_ledger.ilike.%${search}%`);
    if (dateFrom) q = q.gte('bill_date', dateFrom);
    if (dateTo) q = q.lte('bill_date', dateTo);
    if (brokerFilter) q = q.eq('broker_name', brokerFilter);

    const { data, count } = await q;
    setBills(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page, search, dateFrom, dateTo, brokerFilter]);

  const toggle = (id) => setExpanded(expanded===id ? null : id);

  // Extract design numbers from narration
  const extractDesigns = (narr) => {
    if (!narr) return [];
    const matches = [];
    const patterns = [
      /D\s*No\.?\s*([A-Z0-9]+)/gi,
      /<([^>]+)>/g,
      /Design\s*:?\s*([A-Z0-9]+)/gi,
    ];
    patterns.forEach(p => {
      let m;
      while ((m = p.exec(narr)) !== null) matches.push(m[1]);
    });
    return [...new Set(matches)];
  };

  return (
    <div style={{fontFamily:'system-ui,sans-serif',background:T.bg,minHeight:'100vh'}}>
      {/* Header */}
      <div style={{background:T.navy,padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>nav(-1)} style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',borderRadius:8,padding:'6px 12px',cursor:'pointer',fontSize:13}}>← Back</button>
          <div>
            <div style={{color:'#fff',fontSize:18,fontWeight:700}}>📊 Sales Bills — Full Tally Detail</div>
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:12,marginTop:2}}>Click any bill to expand all fields · {total.toLocaleString()} total bills</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,padding:16,paddingBottom:0}}>
        {[
          {label:'FY Revenue',val:fmtAmt(kpis.total),color:T.green},
          {label:'Bills',val:(kpis.count||0).toLocaleString(),color:T.blue},
          {label:'Total Metres',val:`${fmtN(kpis.qty)} m`,color:T.teal},
          {label:'Commission Paid',val:fmtAmt(kpis.comm),color:T.purple},
        ].map((k,i)=>(
          <div key={i} style={{background:T.surface,borderRadius:10,padding:12,border:`1px solid ${T.border}`,textAlign:'center'}}>
            <div style={{color:T.textMuted,fontSize:10,textTransform:'uppercase',marginBottom:4}}>{k.label}</div>
            <div style={{color:k.color,fontSize:18,fontWeight:700}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{padding:16,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',gap:4,background:T.surface,padding:'4px',borderRadius:8,border:`1px solid ${T.border}`}}>
          {[2022,2023,2024,2025,2026].map(y => (
            <button key={y} onClick={() => { setDateFrom(`${y}-04-01`); setDateTo(`${y+1}-03-31`); setPage(0); }}
              style={{padding:'4px 10px',fontSize:12,fontWeight:600,cursor:'pointer',borderRadius:6,border:'none',
                background:dateFrom===`${y}-04-01`?T.teal:'transparent',color:dateFrom===`${y}-04-01`?'#fff':T.textMuted}}>
              FY {y.toString().slice(2)}-{(y+1).toString().slice(2)}
            </button>
          ))}
        </div>
        <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Search party, bill no, design..."
          style={{flex:1,minWidth:200,padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:'none'}} />
        <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPage(0);}}
          style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:'none'}} />
        <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPage(0);}}
          style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:'none'}} />
        <select value={brokerFilter} onChange={e=>{setBrokerFilter(e.target.value);setPage(0);}}
          style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:'none',background:T.surface}}>
          <option value="">All Brokers</option>
          {brokers.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        {(search||dateFrom||dateTo||brokerFilter) && (
          <button onClick={()=>{setSearch('');setDateFrom('');setDateTo('');setBrokerFilter('');setPage(0);}}
            style={{padding:'7px 14px',background:T.red,color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:12}}>Clear</button>
        )}
      </div>

      {/* Bills list */}
      <div style={{padding:'0 16px 16px'}}>
        <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          {/* Table header */}
          <div style={{display:'grid',gridTemplateColumns:'140px 1fr 1fr 100px 90px 90px 70px',gap:8,padding:'10px 16px',borderBottom:`1px solid ${T.border}`,fontSize:11,fontWeight:600,color:T.textMuted,textTransform:'uppercase'}}>
            <div>Bill No</div><div>Customer</div><div>Broker · Narration</div>
            <div style={{textAlign:'right'}}>Amount</div>
            <div style={{textAlign:'right'}}>Qty (m)</div>
            <div>Date</div><div style={{textAlign:'center'}}>Detail</div>
          </div>

          {loading ? (
            <div style={{padding:40,textAlign:'center',color:T.textMuted}}>Loading bills...</div>
          ) : bills.map((b,i) => {
            const designs = extractDesigns(b.narration);
            const isExp = expanded === b.id;
            return (
              <React.Fragment key={b.id||i}>
                <div style={{
                  display:'grid',gridTemplateColumns:'140px 1fr 1fr 100px 90px 90px 70px',gap:8,
                  padding:'9px 16px',borderBottom:`1px solid ${T.border}`,
                  background: isExp ? T.tealLight : i%2===0 ? T.surface : T.bg,
                  transition:'background .15s',
                }}>
                  <div style={{fontFamily:'monospace',fontSize:12,color:T.blue,fontWeight:600,display:'flex',alignItems:'center'}}>{b.bill_number}</div>
                  <div style={{fontSize:12,color:T.text,overflow:'hidden'}}>
                    <div style={{fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.customer_name}</div>
                    {b.sales_ledger && <div style={{fontSize:10,color:T.textMuted}}>{b.sales_ledger}</div>}
                  </div>
                  <div style={{overflow:'hidden'}}>
                    {b.broker_name && <div style={{fontSize:11,color:T.purple,fontWeight:500}}>{b.broker_name}</div>}
                    <div style={{fontSize:11,color:T.textMuted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.narration?.substring(0,40)}</div>
                    {designs.length > 0 && <div style={{display:'flex',gap:3,marginTop:2,flexWrap:'wrap'}}>{designs.map(d=><span key={d} style={{fontSize:9,fontWeight:700,background:T.teal+'22',color:T.teal,padding:'1px 5px',borderRadius:4,fontFamily:'monospace'}}>D:{d}</span>)}</div>}
                  </div>
                  <div style={{textAlign:'right',fontWeight:700,color:T.green,fontSize:13,display:'flex',alignItems:'center',justifyContent:'flex-end'}}>{fmtAmt(b.total_amount)}</div>
                  <div style={{textAlign:'right',fontSize:12,color:T.text,display:'flex',alignItems:'center',justifyContent:'flex-end'}}>{b.quantity_mtrs?`${fmtN(b.quantity_mtrs)}`:'-'}</div>
                  <div style={{fontSize:11,color:T.textMuted,display:'flex',alignItems:'center'}}>{b.bill_date}</div>
                  <div style={{textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <button onClick={()=>toggle(b.id)} style={{
                      background:isExp?T.teal:T.bg,color:isExp?'#fff':T.teal,
                      border:`1px solid ${T.teal}`,borderRadius:6,padding:'3px 8px',cursor:'pointer',fontSize:11,fontWeight:600
                    }}>{isExp?'▲ Less':'▼ More'}</button>
                  </div>
                </div>

                {/* EXPANDED DETAIL — Tally-like full view */}
                {isExp && (
                  <div style={{padding:'14px 20px',background:T.tealLight,borderBottom:`2px solid ${T.teal}`,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                    {/* Bill info */}
                    <div style={{background:T.surface,borderRadius:8,padding:'10px 14px'}}>
                      <div style={{fontSize:11,fontWeight:600,color:T.teal,textTransform:'uppercase',marginBottom:8}}>Bill Information</div>
                      {[
                        {l:'Bill Number', v:b.bill_number, mono:true},
                        {l:'Bill Date', v:b.bill_date},
                        {l:'Customer', v:b.customer_name},
                        {l:'Sales Ledger', v:b.sales_ledger},
                        {l:'Voucher Class', v:b.voucher_class},
                        {l:'Effective Date', v:b.effective_date},
                        {l:'Round Off', v:b.round_off!=null?`\u20B9${b.round_off}`:null},
                        {l:'Total Amount', v:fmtAmt(b.total_amount), bold:true, color:T.green},
                      ].filter(f=>f.v).map((f,i)=>(
                        <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12}}>
                          <span style={{color:T.textMuted}}>{f.l}</span>
                          <span style={{color:f.color||T.text,fontWeight:f.bold?700:500,fontFamily:f.mono?'monospace':'inherit'}}>{f.v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Broker & Commission */}
                    <div style={{background:T.surface,borderRadius:8,padding:'10px 14px'}}>
                      <div style={{fontSize:11,fontWeight:600,color:T.purple,textTransform:'uppercase',marginBottom:8}}>Broker & Commission</div>
                      {[
                        {l:'Broker Name', v:b.broker_name},
                        {l:'Commission Rate', v:b.comm_rate!=null?`${b.comm_rate}%`:null},
                        {l:'Comm. Amount', v:b.comm_amount>0?fmtAmt(b.comm_amount):null, color:T.purple, bold:true},
                        {l:'Assessed Value', v:b.comm_assessed_value>0?fmtAmt(b.comm_assessed_value):null},
                        {l:'Quantity', v:b.quantity_mtrs?`${fmtN(b.quantity_mtrs)} mtrs`:null},
                        {l:'Narration', v:b.narration},
                      ].filter(f=>f.v).map((f,i)=>(
                        <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'3px 0',borderBottom:`1px solid ${T.border}`,fontSize:12,gap:8}}>
                          <span style={{color:T.textMuted,flexShrink:0}}>{f.l}</span>
                          <span style={{color:f.color||T.text,fontWeight:f.bold?700:400,textAlign:'right',wordBreak:'break-word'}}>{f.v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Line items */}
                    <div style={{background:T.surface,borderRadius:8,padding:'10px 14px'}}>
                      <div style={{fontSize:11,fontWeight:600,color:T.orange,textTransform:'uppercase',marginBottom:8}}>Stock Items / Design Numbers</div>
                      {b.line_items ? (
                        <div>
                          {(Array.isArray(b.line_items)?b.line_items:[b.line_items]).map((item,i)=>{
                            const parsed = typeof item==='string'?JSON.parse(item):item;
                            return (
                              <div key={i} style={{padding:'6px 0',borderBottom:`1px solid ${T.border}`,fontSize:11}}>
                                <div style={{fontWeight:600,color:T.text}}>{parsed.stock_item}</div>
                                <div style={{display:'flex',gap:12,marginTop:2,color:T.textMuted}}>
                                  {parsed.qty && <span>{fmtN(parsed.qty)} m</span>}
                                  {parsed.rate && <span>@{fmtAmt(parsed.rate)}/m</span>}
                                  {parsed.amount && <span style={{color:T.green,fontWeight:600}}>{fmtAmt(Math.abs(parsed.amount))}</span>}
                                </div>
                                {parsed.godown && <div style={{fontSize:10,color:T.textMuted}}>Godown: {parsed.godown}</div>}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div>
                          {designs.length > 0 ? (
                            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                              {designs.map(d=>(
                                <button key={d} onClick={()=>nav('/admin/design-lifecycle')}
                                  style={{fontSize:12,fontWeight:600,background:T.teal+'18',color:T.teal,padding:'3px 10px',borderRadius:6,border:`1px solid ${T.teal}30`,cursor:'pointer',fontFamily:'monospace'}}>
                                  {d} →
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div style={{color:T.textMuted,fontSize:11}}>No item detail available. Enable line_items sync in n8n v21.</div>
                          )}
                          {b.quantity_mtrs > 0 && (
                            <div style={{marginTop:8,padding:'6px 10px',background:T.bg,borderRadius:6,fontSize:12}}>
                              Total: {fmtN(b.quantity_mtrs)} mtrs = {fmtAmt(b.total_amount)}
                              {b.quantity_mtrs > 0 && b.total_amount > 0 && <span style={{color:T.textMuted}}> ({fmtAmt(b.total_amount/b.quantity_mtrs)}/mtr)</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Pagination */}
        {total > PAGE && (
          <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:16}}>
            <button disabled={page===0} onClick={()=>setPage(p=>p-1)}
              style={{padding:'7px 16px',borderRadius:8,border:`1px solid ${T.border}`,background:T.surface,cursor:page>0?'pointer':'not-allowed',opacity:page>0?1:0.5}}>← Prev</button>
            <span style={{padding:'7px 14px',fontSize:13,color:T.textMuted}}>Page {page+1} of {Math.ceil(total/PAGE)} · {total.toLocaleString()} bills</span>
            <button disabled={(page+1)*PAGE>=total} onClick={()=>setPage(p=>p+1)}
              style={{padding:'7px 16px',borderRadius:8,border:`1px solid ${T.border}`,background:T.surface,cursor:(page+1)*PAGE<total?'pointer':'not-allowed',opacity:(page+1)*PAGE<total?1:0.5}}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
