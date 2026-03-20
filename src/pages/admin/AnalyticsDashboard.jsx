import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

const T = { teal:'#2BA898', navy:'#0B2E2B', green:'#1E9E5A', red:'#E74C3C', gold:'#E8A800',
            blue:'#2468C8', bg:'#F0F9F7', surface:'#fff', border:'#D0EDE8', text:'#0B2E2B', muted:'#6A9B95' };
const fmt = n => '\u20B9' + Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0});
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '-';

function MiniBar({ label, value, max, color, sub }) {
  const pct = max > 0 ? Math.round((value/max)*100) : 0;
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
        <span style={{color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:160}}>{label}</span>
        <span style={{color,fontWeight:700,flexShrink:0,marginLeft:8}}>{sub||fmt(value)}</span>
      </div>
      <div style={{background:T.border,borderRadius:4,height:6}}>
        <div style={{background:color,borderRadius:4,height:6,width:pct+'%',transition:'width 0.5s'}}/>
      </div>
    </div>
  );
}

export default function SalesAnalytics() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [period, setPeriod] = useState(30);
  const [stats, setStats] = useState({total:0,count:0,avg:0,topCustomer:'',topAmount:0});
  const [topCustomers, setTopCustomers] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [geography, setGeography] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now()-period*86400000).toISOString().slice(0,10);
    const { data } = await supabase.from('sales_bills').select('*').gte('bill_date', since).order('bill_date', {ascending:false});
    const all = data || [];
    setBills(all);

    // Customer aggregation
    const custMap = {};
    all.forEach(b => {
      const k = b.customer_name||'Unknown';
      custMap[k] = (custMap[k]||0) + (b.total_amount||0);
    });
    const custArr = Object.entries(custMap).map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total);
    setTopCustomers(custArr.slice(0,10));

    // Monthly trend
    const monthMap = {};
    all.forEach(b => {
      const m = (b.bill_date||'').slice(0,7);
      monthMap[m] = (monthMap[m]||0) + (b.total_amount||0);
    });
    setMonthlyTrend(Object.entries(monthMap).sort().map(([m,v])=>({month:m,total:v})));

    // Geography from customer city/state
    const geoMap = {};
    // Get customer details for geography
    if (custArr.length > 0) {
      const custNames = custArr.slice(0,50).map(c=>c.name);
      const { data: custData } = await supabase.from('customers').select('name,city,state').in('name', custNames);
      (custData||[]).forEach(c => {
        const loc = c.city||c.state||'Unknown';
        if (!geoMap[loc]) geoMap[loc] = {location:loc, count:0, total:0};
        geoMap[loc].count++;
        geoMap[loc].total += custMap[c.name]||0;
      });
    }
    setGeography(Object.values(geoMap).sort((a,b)=>b.total-a.total).slice(0,10));

    const total = all.reduce((s,b)=>s+(b.total_amount||0),0);
    setStats({
      total, count: all.length,
      avg: all.length ? total/all.length : 0,
      topCustomer: custArr[0]?.name||'—',
      topAmount: custArr[0]?.total||0
    });
    setLoading(false);
  }, [period]);

  useEffect(() => { loadData(); }, [loadData]);

  const maxCust = topCustomers[0]?.total||1;
  const maxGeo = geography[0]?.total||1;
  const maxMonth = Math.max(...monthlyTrend.map(m=>m.total),1);

  return (
    <div style={{background:T.bg,minHeight:'100vh',padding:24}}>
      <Helmet><title>Sales Analytics — Shreerang</title></Helmet>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:T.navy,margin:0}}>📊 Sales Analytics</h1>
          <p style={{color:T.muted,fontSize:13,margin:'4px 0 0'}}>Top customers, trends, geography</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          {[7,30,90,365].map(d=>(
            <button key={d} onClick={()=>setPeriod(d)}
              style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${T.border}`,background:period===d?T.teal:T.surface,color:period===d?'#fff':T.text,fontWeight:600,fontSize:12,cursor:'pointer'}}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        {[
          {label:'Total Sales',value:fmt(stats.total),color:T.teal,icon:'💰'},
          {label:'Bills',value:stats.count,color:T.blue,icon:'📋'},
          {label:'Avg Bill Value',value:fmt(stats.avg),color:T.gold,icon:'📊'},
          {label:'Top Customer',value:stats.topCustomer.length>20?stats.topCustomer.slice(0,20)+'…':stats.topCustomer,color:T.green,icon:'🏆',sub:fmt(stats.topAmount)},
        ].map(s=>(
          <div key={s.label} style={{background:T.surface,borderRadius:12,padding:'14px 18px',border:`1px solid ${T.border}`,flex:1,minWidth:130}}>
            <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:11,color:T.muted,fontWeight:600}}>{s.label}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.color}}>{s.value}</div>
            {s.sub && <div style={{fontSize:11,color:T.muted}}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {loading ? <div style={{padding:40,textAlign:'center',color:T.muted}}>Loading analytics...</div> : (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
          {/* Top Customers */}
          <div style={{background:T.surface,borderRadius:12,padding:20,border:`1px solid ${T.border}`}}>
            <h3 style={{fontSize:14,fontWeight:700,color:T.navy,margin:'0 0 14px'}}>🏆 Top Customers</h3>
            {topCustomers.length===0 ? <div style={{color:T.muted,fontSize:13}}>No data. Sync from Tally.</div> :
              topCustomers.map((c,i)=>(
                <MiniBar key={c.name} label={`${i+1}. ${c.name}`} value={c.total} max={maxCust} color={T.teal}/>
              ))
            }
          </div>

          {/* Monthly Trend */}
          <div style={{background:T.surface,borderRadius:12,padding:20,border:`1px solid ${T.border}`}}>
            <h3 style={{fontSize:14,fontWeight:700,color:T.navy,margin:'0 0 14px'}}>📈 Monthly Trend</h3>
            {monthlyTrend.length===0 ? <div style={{color:T.muted,fontSize:13}}>No trend data yet.</div> :
              monthlyTrend.slice(-6).map(m=>(
                <MiniBar key={m.month} label={m.month} value={m.total} max={maxMonth} color={T.blue}/>
              ))
            }
          </div>

          {/* Geography */}
          <div style={{background:T.surface,borderRadius:12,padding:20,border:`1px solid ${T.border}`}}>
            <h3 style={{fontSize:14,fontWeight:700,color:T.navy,margin:'0 0 14px'}}>📍 Top Markets</h3>
            {geography.length===0 ? <div style={{color:T.muted,fontSize:13}}>Geography data loading...</div> :
              geography.map((g,i)=>(
                <MiniBar key={g.location} label={`${i+1}. ${g.location}`} value={g.total} max={maxGeo} color={T.green} sub={fmt(g.total)}/>
              ))
            }
          </div>
        </div>
      )}

      {/* Recent Bills Table */}
      <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden',marginTop:16}}>
        <div style={{padding:'12px 16px',borderBottom:`1px solid ${T.border}`,fontSize:14,fontWeight:700,color:T.navy}}>
          Recent Bills
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:T.bg}}>
              {['Bill #','Date','Customer','Amount'].map(h=>(
                <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',borderBottom:`1px solid ${T.border}`}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bills.slice(0,10).map((b,i)=>(
              <tr key={b.id} style={{background:i%2===0?T.surface:T.bg}}>
                <td style={{padding:'9px 14px',fontSize:13,fontWeight:600,color:T.teal}}>{b.bill_number}</td>
                <td style={{padding:'9px 14px',fontSize:13}}>{fmtDate(b.bill_date)}</td>
                <td style={{padding:'9px 14px',fontSize:13,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.customer_name}</td>
                <td style={{padding:'9px 14px',fontSize:14,fontWeight:800,color:T.green}}>{fmt(b.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
