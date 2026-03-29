import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

const T = {
  teal:'#2BA898', tealLight:'#EEF8F6', navy:'#0B2E2B',
  gold:'#E8A800', goldLight:'#FFF8E8',
  green:'#1E9E5A', greenLight:'#E8FFF4',
  blue:'#2468C8', blueLight:'#EBF8FF',
  red:'#E74C3C', orange:'#E67E22',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95',
};

const fmt  = n => '\u20B9'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
const fmtL = n => { const v=Number(n||0); return v>=10000000?`\u20B9${(v/10000000).toFixed(2)}Cr`:v>=100000?`\u20B9${(v/100000).toFixed(1)}L`:fmt(v); };

function getCurrentFY() {
  const now=new Date(); const yr=now.getMonth()>=3?now.getFullYear():now.getFullYear()-1;
  return {from:`${yr}-04-01`,to:`${yr+1}-03-31`};
}

const PAGE_SIZE = 50;

export default function BrokerAnalyticsPage() {
  const navigate = useNavigate();
  const fy = getCurrentFY();

  const [loading, setLoading] = useState(true);
  const [brokers, setBrokers] = useState([]);
  const [summary, setSummary] = useState({totalComm:0,totalSales:0,brokeredBills:0,avgRate:0,uniqueBrokers:0});
  const [bills, setBills] = useState([]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [allBills, pageBills] = await Promise.all([
      supabase.from('sales_bills').select('broker_name,comm_rate,comm_amount,total_amount,customer_name,bill_date').gte('bill_date',fy.from).lte('bill_date',fy.to).not('broker_name','is',null).limit(5000),
      supabase.from('sales_bills').select('*',{count:'exact'}).gte('bill_date',fy.from).lte('bill_date',fy.to).not('broker_name','is',null).order('bill_date',{ascending:false}).range(page*PAGE_SIZE,(page+1)*PAGE_SIZE-1),
    ]);

    const data = allBills.data||[];
    // Aggregate by broker
    const bmap = {};
    data.forEach(b=>{
      const k=b.broker_name;
      if (!bmap[k]) bmap[k]={name:k,bills:0,sales:0,commission:0,rates:[],customers:new Set()};
      bmap[k].bills++;
      bmap[k].sales+=Number(b.total_amount||0);
      bmap[k].commission+=Number(b.comm_amount||0);
      if (Number(b.comm_rate||0)>0) bmap[k].rates.push(Number(b.comm_rate));
      bmap[k].customers.add(b.customer_name);
    });

    const bArr = Object.values(bmap).map(b=>({
      ...b,
      avg_rate:b.rates.length?b.rates.reduce((a,c)=>a+c,0)/b.rates.length:0,
      customer_count:[...b.customers].length,
    })).sort((a,b)=>b.commission-a.commission);

    const totalComm=data.reduce((s,b)=>s+Number(b.comm_amount||0),0);
    const totalSales=data.reduce((s,b)=>s+Number(b.total_amount||0),0);
    const withRate=data.filter(b=>Number(b.comm_rate||0)>0);

    setSummary({
      totalComm, totalSales, brokeredBills:data.length,
      avgRate:withRate.length?withRate.reduce((s,b)=>s+Number(b.comm_rate),0)/withRate.length:0,
      uniqueBrokers:bArr.length,
    });
    setBrokers(bArr);
    setBills(pageBills.data||[]);
    setTotalCount(pageBills.count||0);
    setLoading(false);
  },[fy.from,fy.to,page]);

  useEffect(()=>{ load(); },[load]);

  const maxComm = brokers[0]?.commission||1;
  const filtered = brokers.filter(b=>!search||b.name?.toLowerCase().includes(search.toLowerCase()));

  const BTN=(e={})=>({padding:'8px 14px',borderRadius:8,border:'none',fontSize:12,fontWeight:700,cursor:'pointer',...e});
  const INP={padding:'8px 12px',borderRadius:8,border:`1px solid ${T.border}`,fontSize:13,background:'#fff'};

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh',padding:'20px 24px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.text,margin:0}}>🤝 Broker & Commission Analytics</h1>
          <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>Commission analysis · FY {fy.from.slice(0,4)}-{fy.to.slice(2,4)}</div>
        </div>
      </div>

      {loading ? <div style={{textAlign:'center',padding:60,color:T.textMuted}}>Loading broker data…</div> : <>

        {/* KPIs */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
          {[
            {l:'Unique Brokers',v:summary.uniqueBrokers,c:T.teal,icon:'👥'},
            {l:'Brokered Bills',v:summary.brokeredBills.toLocaleString(),c:T.blue,icon:'📋'},
            {l:'Total Brokered Sales',v:fmtL(summary.totalSales),c:T.green,icon:'💹'},
            {l:'Total Commission Paid',v:fmtL(summary.totalComm),c:T.gold,icon:'💰'},
            {l:'Avg Commission Rate',v:summary.avgRate.toFixed(2)+'%',c:T.orange,icon:'📊'},
          ].map((k,i)=>(
            <div key={i} style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:20,marginBottom:6}}>{k.icon}</div>
              <div style={{fontSize:10,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:.4,marginBottom:4}}>{k.l}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:k.c}}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:12,padding:'12px 16px',marginBottom:16,display:'flex',gap:10}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search broker name…" style={{...INP,flex:1}}/>
          <button onClick={()=>setSearch('')} style={BTN({background:T.bg,color:T.textMuted,border:`1px solid ${T.border}`})}>Clear</button>
        </div>

        {/* Broker scorecard */}
        <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20,marginBottom:20}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.text,marginBottom:14}}>Broker Commission Scorecard (FY)</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
            <thead>
              <tr style={{background:T.bg}}>
                {['Rank','Broker Name','Bills','Customers','Total Sales','Commission','Avg Rate','Commission Bar'].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:['Bills','Customers','Total Sales','Commission','Avg Rate'].includes(h)?'right':'left',fontWeight:700,fontSize:10,color:T.textMuted,borderBottom:`1px solid ${T.border}`,textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                  <td style={{padding:'10px 12px'}}>
                    <span style={{width:24,height:24,borderRadius:'50%',background:i===0?T.gold:i===1?'#C0C0C0':i===2?'#CD7F32':T.tealLight,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:i<3?'#fff':T.teal}}>{i+1}</span>
                  </td>
                  <td style={{padding:'10px 12px',fontWeight:700,color:T.text}}>{b.name}</td>
                  <td style={{padding:'10px 12px',textAlign:'right',color:T.textMuted}}>{b.bills}</td>
                  <td style={{padding:'10px 12px',textAlign:'right',color:T.textMuted}}>{b.customer_count}</td>
                  <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontWeight:600,color:T.teal}}>{fmtL(b.sales)}</td>
                  <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontWeight:700,color:T.gold}}>{fmtL(b.commission)}</td>
                  <td style={{padding:'10px 12px',textAlign:'right'}}>
                    <span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:700,background:T.goldLight,color:T.gold}}>{b.avg_rate.toFixed(2)}%</span>
                  </td>
                  <td style={{padding:'10px 12px'}}>
                    <div style={{height:6,background:T.border,borderRadius:3,width:100}}>
                      <div style={{width:((b.commission/maxComm)*100)+'%',height:6,background:T.gold,borderRadius:3}}/>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bills with commission */}
        <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:T.text}}>
              Brokered Bills Register <span style={{fontSize:12,color:T.textMuted,fontFamily:"'DM Sans',sans-serif"}}>({totalCount} bills)</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>page>0&&setPage(p=>p-1)} disabled={page===0} style={BTN({background:page===0?T.bg:T.tealLight,color:page===0?T.textMuted:T.teal})}>‹ Prev</button>
              <span style={{padding:'8px 14px',background:T.teal,color:'#fff',borderRadius:8,fontSize:12,fontWeight:700}}>{page+1}/{Math.ceil(totalCount/PAGE_SIZE)||1}</span>
              <button onClick={()=>setPage(p=>p+1)} disabled={(page+1)*PAGE_SIZE>=totalCount} style={BTN({background:(page+1)*PAGE_SIZE>=totalCount?T.bg:T.tealLight,color:(page+1)*PAGE_SIZE>=totalCount?T.textMuted:T.teal})}>Next ›</button>
            </div>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
            <thead>
              <tr style={{background:T.bg}}>
                {['Bill No','Date','Customer','Total','Comm Rate','Commission','Broker'].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:['Total','Comm Rate','Commission'].includes(h)?'right':'left',fontWeight:700,fontSize:10,color:T.textMuted,borderBottom:`1px solid ${T.border}`,textTransform:'uppercase'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bills.map((b,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                  <td style={{padding:'9px 12px',fontWeight:700,color:T.teal}}>{b.bill_number}</td>
                  <td style={{padding:'9px 12px',color:T.textMuted}}>{b.bill_date}</td>
                  <td style={{padding:'9px 12px',fontWeight:500,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.customer_name}</td>
                  <td style={{padding:'9px 12px',textAlign:'right',fontWeight:700,color:T.green,fontFamily:"'DM Mono',monospace"}}>{fmt(b.total_amount)}</td>
                  <td style={{padding:'9px 12px',textAlign:'right'}}>
                    {Number(b.comm_rate||0)>0&&<span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:700,background:T.goldLight,color:T.gold}}>{Number(b.comm_rate).toFixed(2)}%</span>}
                  </td>
                  <td style={{padding:'9px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontWeight:600,color:T.gold}}>{fmt(b.comm_amount)}</td>
                  <td style={{padding:'9px 12px',fontWeight:500,color:T.text,fontSize:12}}>{b.broker_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>}
    </div>
  );
}
