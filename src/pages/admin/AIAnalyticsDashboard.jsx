import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || '';
const T = { teal:'#2BA898', gold:'#E8A800', navy:'#0B2E2B', red:'#E74C3C', green:'#1E9E5A', blue:'#2468C8', orange:'#E67E22', purple:'#9B59B6', border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B', muted:'#6A9B95' };

async function askClaude(prompt) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:800, messages:[{role:'user',content:prompt}] })
  });
  const d = await resp.json();
  return d.content?.[0]?.text || '';
}

export default function AIAnalyticsDashboard() {
  const [sales, setSales] = useState([]);
  const [purchase, setPurchase] = useState([]);
  const [process, setProcess] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');
  const [aiReport, setAiReport] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportType, setReportType] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [s, p, proc] = await Promise.all([
      supabase.from('sales_bills').select('bill_date,total_amount,customer_name,broker_name,comm_amount,quantity_mtrs,bill_number').order('bill_date').limit(2000),
      supabase.from('purchase_bills').select('bill_date,total_amount,supplier_name,quantity_mtrs,bill_number').order('bill_date').limit(1000),
      supabase.from('process_issues').select('issue_date,job_worker_name,metres_issued,shortage_pct,shortage_mtrs,process_type,challan_no').order('issue_date').limit(1000),
    ]);
    setSales(s.data||[]);
    setPurchase(p.data||[]);
    setProcess(proc.data||[]);
    setLoading(false);
  };

  // Monthly aggregation
  const getMonthly = (data, dateField, valField) => {
    const map = {};
    data.forEach(d => {
      const month = d[dateField]?.slice(0,7);
      if (!month) return;
      if (!map[month]) map[month] = 0;
      map[month] += d[valField]||0;
    });
    return Object.entries(map).sort((a,b)=>a[0]<b[0]?-1:1).slice(-12);
  };

  const monthlySales = getMonthly(sales, 'bill_date', 'total_amount');
  const monthlyPurchase = getMonthly(purchase, 'bill_date', 'total_amount');

  const maxSales = Math.max(...monthlySales.map(m=>m[1]), 1);
  const maxPurch = Math.max(...monthlyPurchase.map(m=>m[1]), 1);

  // Broker analysis
  const brokerMap = {};
  sales.forEach(s => {
    if (!s.broker_name) return;
    if (!brokerMap[s.broker_name]) brokerMap[s.broker_name] = { bills: 0, revenue: 0, commission: 0 };
    brokerMap[s.broker_name].bills++;
    brokerMap[s.broker_name].revenue += s.total_amount||0;
    brokerMap[s.broker_name].commission += s.comm_amount||0;
  });
  const topBrokers = Object.entries(brokerMap).sort((a,b)=>b[1].revenue-a[1].revenue).slice(0,8);

  // Customer cohort — repeat buyers
  const custBills = {};
  sales.forEach(s => {
    if (!custBills[s.customer_name]) custBills[s.customer_name] = 0;
    custBills[s.customer_name]++;
  });
  const repeatBuyers = Object.entries(custBills).filter(([,n])=>n>3).length;
  const oneTimers = Object.entries(custBills).filter(([,n])=>n===1).length;

  const generateReport = async (type) => {
    setReportLoading(true); setReportType(type); setAiReport('');
    let prompt = '';
    const totalSales = sales.reduce((a,s)=>a+(s.total_amount||0),0);
    const totalPurchase = purchase.reduce((a,p)=>a+(p.total_amount||0),0);
    const grossMargin = totalSales > 0 ? ((totalSales-totalPurchase)/totalSales*100).toFixed(1) : 0;
    const avgShrink = process.filter(p=>p.shortage_pct).length > 0
      ? (process.filter(p=>p.shortage_pct).reduce((a,p)=>a+(p.shortage_pct||0),0)/process.filter(p=>p.shortage_pct).length).toFixed(1) : 0;

    if (type==='monthly') {
      prompt = `Generate a monthly business analysis report for Shreerang Trendz textile company. Write in Hinglish, structured format.

Data:
- Total sales: ₹${(totalSales/100000).toFixed(1)}L
- Total purchase: ₹${(totalPurchase/100000).toFixed(1)}L
- Gross margin: ${grossMargin}%
- Total bills: ${sales.length} sales, ${purchase.length} purchase
- Unique customers: ${Object.keys(custBills).length}
- Repeat buyers (3+ orders): ${repeatBuyers}
- Monthly trend (last 3 months): ${monthlySales.slice(-3).map(m=>m[0]+': ₹'+(m[1]/100000).toFixed(1)+'L').join(', ')}
- Avg shrinkage: ${avgShrink}%

Write: Executive Summary, Key Wins, Concerns, Next Month Focus Areas`;
    } else if (type==='broker') {
      prompt = `Analyze broker performance for Shreerang Trendz textile company in Hinglish.

Brokers:
${topBrokers.map(([name,d])=>`${name}: Revenue ₹${(d.revenue/100000).toFixed(1)}L, Bills ${d.bills}, Commission ₹${(d.commission/1000).toFixed(0)}K`).join('
')}

Give: Top performer analysis, who to reward/push, commission optimization tips`;
    } else if (type==='operations') {
      prompt = `Analyze mill/operations performance for Shreerang Trendz in Hinglish.

Process data: ${process.filter(p=>p.shortage_pct).length} batches with shrinkage data, avg ${avgShrink}% shrinkage.
Top mills: ${[...new Set(process.map(p=>p.job_worker_name).filter(Boolean))].slice(0,5).join(', ')}
Total metres issued: ${Math.round(process.reduce((a,p)=>a+(p.metres_issued||0),0))} mtrs

Give: Operational efficiency assessment, which mills are costing money, recommendations`;
    }
    const report = await askClaude(prompt);
    setAiReport(report);
    setReportLoading(false);
  };

  const fmt = n => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${Math.round(n/1000)}K`;

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300,color:T.muted}}>Loading analytics from Tally...</div>;

  const totalSalesRev = sales.reduce((a,s)=>a+(s.total_amount||0),0);
  const totalPurchRev = purchase.reduce((a,p)=>a+(p.total_amount||0),0);

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', background:T.bg, minHeight:'100vh', padding:20 }}>
      <div style={{ background:T.navy, borderRadius:12, padding:'14px 20px', marginBottom:16 }}>
        <div style={{ color:'#fff', fontSize:18, fontWeight:700 }}>📊 AI Analytics — Better than Biz Analyst</div>
        <div style={{ color:'rgba(255,255,255,0.6)', fontSize:12, marginTop:2 }}>Full Tally history · AI-powered reports · No manual work</div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:14 }}>
        {[
          { label:'Total Revenue', val: fmt(totalSalesRev), color:T.green },
          { label:'Total Purchase', val: fmt(totalPurchRev), color:T.orange },
          { label:'Gross Margin', val: `${totalSalesRev>0?((totalSalesRev-totalPurchRev)/totalSalesRev*100).toFixed(1):0}%`, color:T.blue },
          { label:'Unique Customers', val: Object.keys(custBills).length, color:T.teal },
          { label:'Repeat Buyers', val: repeatBuyers, color:T.purple },
        ].map((k,i) => (
          <div key={i} style={{ background:T.surface, borderRadius:10, padding:12, border:`1px solid ${T.border}`, textAlign:'center' }}>
            <div style={{ color:T.muted, fontSize:10, textTransform:'uppercase', marginBottom:4 }}>{k.label}</div>
            <div style={{ color:k.color, fontSize:18, fontWeight:700 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* AI Report Generator */}
      <div style={{ background:T.surface, borderRadius:10, padding:14, marginBottom:14, border:`1px solid ${T.border}` }}>
        <div style={{ fontWeight:600, color:T.text, marginBottom:10 }}>🤖 Generate AI Business Report</div>
        <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
          {[['monthly','📅 Monthly Business Report'],['broker','🤝 Broker Performance'],['operations','🏭 Operations & Mill Analysis']].map(([type,label]) => (
            <button key={type} onClick={()=>generateReport(type)} disabled={reportLoading}
              style={{ background:reportType===type?T.navy:T.bg, color:reportType===type?'#fff':T.text, border:`1px solid ${T.border}`, borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:13, fontWeight:500 }}>
              {reportLoading && reportType===type ? '⏳ Generating...' : label}
            </button>
          ))}
        </div>
        {aiReport && (
          <div style={{ background:'#0B2E2B', borderRadius:10, padding:14 }}>
            <div style={{ color:T.gold, fontWeight:600, fontSize:12, marginBottom:8 }}>🤖 CLAUDE AI — {reportType.toUpperCase()} REPORT</div>
            <div style={{ color:'rgba(255,255,255,0.9)', fontSize:13, lineHeight:1.7, whiteSpace:'pre-line' }}>{aiReport}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:14 }}>
        {['revenue','customers','brokers','trends'].map(t => (
          <button key={t} onClick={()=>setActiveTab(t)} style={{ padding:'7px 16px', borderRadius:20, fontSize:12, fontWeight:500, border:'none', cursor:'pointer', background:activeTab===t?T.teal:T.surface, color:activeTab===t?'#fff':T.muted, textTransform:'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'revenue' && (
        <div style={{ background:T.surface, borderRadius:10, padding:16, border:`1px solid ${T.border}` }}>
          <div style={{ fontWeight:600, color:T.text, marginBottom:14 }}>Monthly Sales Revenue (Last 12 months)</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:180, padding:'0 8px' }}>
            {monthlySales.map(([month, val], i) => (
              <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ fontSize:9, color:T.muted }}>{fmt(val)}</div>
                <div style={{ width:'100%', background:T.teal, borderRadius:'3px 3px 0 0', height:`${(val/maxSales)*140}px`, minHeight:4, transition:'height 0.3s' }} title={`${month}: ${fmt(val)}`} />
                <div style={{ fontSize:9, color:T.muted, transform:'rotate(-45deg)', marginTop:4, whiteSpace:'nowrap' }}>{month}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div style={{ background:T.surface, borderRadius:10, border:`1px solid ${T.border}` }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontWeight:600, color:T.text }}>Customer Revenue Ranking</span>
            <div style={{ display:'flex', gap:10, fontSize:12, color:T.muted }}>
              <span>Repeat buyers: <b style={{color:T.green}}>{repeatBuyers}</b></span>
              <span>One-time: <b style={{color:T.orange}}>{oneTimers}</b></span>
            </div>
          </div>
          <div style={{ maxHeight:500, overflowY:'auto' }}>
            {Object.entries(custBills).map(([name,bills],i) => {
              const rev = sales.filter(s=>s.customer_name===name).reduce((a,s)=>a+(s.total_amount||0),0);
              const pct = (rev/totalSalesRev*100).toFixed(1);
              return (
                <div key={i} style={{ padding:'10px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background: bills>10?T.gold:bills>3?T.teal:T.border, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:600, flexShrink:0 }}>
                    {name.charAt(0)}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:T.text, fontSize:12, fontWeight:500 }}>{name.substring(0,28)}</div>
                    <div style={{ background:T.border, borderRadius:2, height:4, marginTop:4, overflow:'hidden' }}>
                      <div style={{ background:T.teal, height:'100%', width:`${Math.min(pct*5,100)}%` }} />
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:600, color:T.green, fontSize:13 }}>{fmt(rev)}</div>
                    <div style={{ color:T.muted, fontSize:10 }}>{bills} bills · {pct}%</div>
                  </div>
                </div>
              );
            }).sort((a,b)=>0).slice(0,30)}
          </div>
        </div>
      )}

      {activeTab === 'brokers' && (
        <div style={{ background:T.surface, borderRadius:10, border:`1px solid ${T.border}` }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, fontWeight:600, color:T.text }}>🤝 Broker Performance</div>
          {topBrokers.map(([name, d], i) => (
            <div key={i} style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:500, color:T.text, fontSize:13 }}>#{i+1} {name.substring(0,22)}</div>
                <div style={{ color:T.muted, fontSize:11 }}>{d.bills} bills</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontWeight:600, color:T.green, fontSize:13 }}>{fmt(d.revenue)}</div>
                <div style={{ color:T.muted, fontSize:10 }}>revenue</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontWeight:600, color:T.purple, fontSize:13 }}>{fmt(d.commission)}</div>
                <div style={{ color:T.muted, fontSize:10 }}>commission</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontWeight:600, color:T.orange, fontSize:13 }}>{d.revenue>0?(d.commission/d.revenue*100).toFixed(1):0}%</div>
                <div style={{ color:T.muted, fontSize:10 }}>comm rate</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'trends' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={{ background:T.surface, borderRadius:10, padding:16, border:`1px solid ${T.border}` }}>
            <div style={{ fontWeight:600, color:T.text, marginBottom:14 }}>Sales vs Purchase (Monthly)</div>
            {monthlySales.slice(-6).map(([month,sval],i) => {
              const pval = monthlyPurchase.find(m=>m[0]===month)?.[1] || 0;
              return (
                <div key={i} style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                    <span style={{ color:T.muted }}>{month}</span>
                    <span><span style={{color:T.green}}>{fmt(sval)}</span> · <span style={{color:T.orange}}>{fmt(pval)}</span></span>
                  </div>
                  <div style={{ position:'relative', height:6, background:T.border, borderRadius:3 }}>
                    <div style={{ position:'absolute', left:0, top:0, height:6, background:T.green, borderRadius:3, width:`${Math.min(sval/maxSales*100,100)}%` }} />
                  </div>
                  <div style={{ position:'relative', height:4, background:T.border, borderRadius:3, marginTop:2 }}>
                    <div style={{ position:'absolute', left:0, top:0, height:4, background:T.orange, borderRadius:3, width:`${Math.min(pval/maxSales*100,100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ background:T.surface, borderRadius:10, padding:16, border:`1px solid ${T.border}` }}>
            <div style={{ fontWeight:600, color:T.text, marginBottom:14 }}>Process Volume by Month</div>
            {getMonthly(process, 'issue_date', 'metres_issued').slice(-6).map(([month,val],i) => (
              <div key={i} style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                  <span style={{ color:T.muted }}>{month}</span>
                  <span style={{ color:T.teal }}>{Math.round(val)} mtrs</span>
                </div>
                <div style={{ background:T.border, borderRadius:3, height:6 }}>
                  <div style={{ background:T.teal, height:6, borderRadius:3, width:`${Math.min(val/Math.max(...getMonthly(process,'issue_date','metres_issued').map(m=>m[1]),1)*100,100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
