import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';

const T = {
  teal:'#2BA898', navy:'#0B2E2B', green:'#1E9E5A', blue:'#2468C8',
  gold:'#E8A800', red:'#E74C3C', purple:'#9B59B6', orange:'#E67E22',
  border:'rgba(43,168,152,.15)', bg:'#F4FBFA', surface:'#fff',
  textMuted:'#6A9B95', textDim:'#94a3b8',
};

// ─── FULL BAR CHART (no external deps) ────────────────────────────────────────
function BarChart({ data, color='#2BA898', height=140, compareData=null, compareColor='#E8A800' }) {
  const max = Math.max(...data.map(d=>d.value), ...(compareData||[]).map(d=>d.value), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:compareData?3:4, height:height+24 }}>
      {data.map((d,i) => {
        const h = max>0 ? Math.max((d.value/max)*(height-10),2) : 2;
        const h2 = compareData ? (max>0 ? Math.max(((compareData[i]?.value||0)/max)*(height-10),2) : 2) : 0;
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
            <div style={{ fontSize:8, color:T.textDim, fontWeight:600 }}>
              {d.value>0 ? (d.value>=10000000?(d.value/10000000).toFixed(1)+'Cr':d.value>=100000?(d.value/100000).toFixed(1)+'L':d.value>=1000?(d.value/1000).toFixed(0)+'K':'') : ''}
            </div>
            <div style={{ width:'100%', display:'flex', gap:1, alignItems:'flex-end', height:height-10 }}>
              <div title={`${d.label}: ₹${(d.value||0).toLocaleString('en-IN')}`} style={{ flex:1, background:color, borderRadius:'3px 3px 0 0', height:h, opacity:0.9, transition:'height .4s', cursor:'pointer' }} />
              {compareData && <div title={`${compareData[i]?.label||''}: ₹${((compareData[i]?.value)||0).toLocaleString('en-IN')}`} style={{ flex:1, background:compareColor, borderRadius:'3px 3px 0 0', height:h2, opacity:0.7, transition:'height .4s', cursor:'pointer' }} />}
            </div>
            <div style={{ fontSize:9, color:T.textDim, whiteSpace:'nowrap' }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── PIE DONUT (SVG) ─────────────────────────────────────────────────────────
function DonutChart({ segments, size=120 }) {
  const total = segments.reduce((s,g)=>s+g.value,0);
  if (total===0) return <div style={{ width:size, height:size, borderRadius:'50%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:T.textDim }}>No data</div>;
  const r=42, cx=60, cy=60, stroke=22;
  let offset=0;
  const circ = 2*Math.PI*r;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      {segments.map((seg,i) => {
        const pct=seg.value/total, dashArr=circ*pct, dashOff=-offset*circ;
        offset+=pct;
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={stroke} strokeDasharray={`${dashArr} ${circ-dashArr}`} strokeDashoffset={dashOff} style={{ transform:'rotate(-90deg)', transformOrigin:'60px 60px', transition:'stroke-dasharray .5s' }} />;
      })}
      <text x={cx} y={cy-6} textAnchor="middle" fontSize={11} fill={T.navy} fontWeight={800}>{(segments.find(s=>s.value===Math.max(...segments.map(s=>s.value)))?.pct||'')}</text>
      <text x={cx} y={cy+8} textAnchor="middle" fontSize={9} fill={T.textMuted}>top</text>
    </svg>
  );
}

function StatCard({ icon, label, value, sub, color='#2468C8', onClick }) {
  return (
    <div onClick={onClick} style={{ background:T.surface, borderRadius:14, padding:'16px 20px', boxShadow:'0 2px 12px rgba(0,0,0,.07)', border:`1px solid ${T.border}`, cursor:onClick?'pointer':'default', transition:'transform .1s, box-shadow .15s' }}
      onMouseEnter={e=>onClick&&(e.currentTarget.style.transform='translateY(-2px)',e.currentTarget.style.boxShadow='0 6px 22px rgba(0,0,0,.1)')}
      onMouseLeave={e=>onClick&&(e.currentTarget.style.transform='translateY(0)',e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.07)')}
    >
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
        <div style={{ width:36, height:36, background:color+'18', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{icon}</div>
        <div style={{ fontSize:11, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.8px' }}>{label}</div>
      </div>
      <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.textDim, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ orders:0, customers:0, designs:0, revenue:0, purchase:0, stockItems:0, agents:0, jobWorkers:0, salesBills:0, purchaseBills:0, outstanding:0 });
  const [monthlyRevenue,    setMonthlyRevenue]    = useState([]);
  const [monthlyPurchase,   setMonthlyPurchase]   = useState([]);
  const [agentLeaderboard,  setAgentLeaderboard]  = useState([]);
  const [customerSegments,  setCustomerSegments]  = useState({ active:0, atRisk:0, dormant:0, total:0 });
  const [topCustomers,      setTopCustomers]      = useState([]);
  const [categoryData,      setCategoryData]      = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [activeTab,         setActiveTab]         = useState('overview');
  const [period,            setPeriod]            = useState('12m');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const now  = new Date();
    const nMo  = period === '6m' ? 6 : 12;
    const months = [];
    for (let i=nMo-1; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      months.push({ label:d.toLocaleString('en-IN',{month:'short'}), year:d.getFullYear(), month:d.getMonth()+1, value:0, pvalue:0 });
    }
    const mStart = months[0].year + '-' + String(months[0].month).padStart(2,'0') + '-01';
    const mEnd   = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);
    const thisM  = now.toISOString().slice(0,7);

    const d90  = new Date(now); d90.setDate(d90.getDate()-90);
    const d180 = new Date(now); d180.setDate(d180.getDate()-180);

    const [
      { count: orders },
      { count: customers },
      { count: designs },
      { count: agents },
      { count: jobWorkers },
      { count: stockItems },
      { count: salesBills },
      { count: purchaseBills },
      { data: salesThisM },
      { data: purchThisM },
      { data: salesHist },
      { data: purchHist },
      { data: agentOrders },
      { data: custAll },
      { data: outData },
    ] = await Promise.all([
      supabase.from('sales_orders').select('*',{count:'exact',head:true}),
      supabase.from('customers').select('*',{count:'exact',head:true}),
      supabase.from('designs').select('*',{count:'exact',head:true}),
      supabase.from('sales_team').select('*',{count:'exact',head:true}),
      supabase.from('job_workers').select('*',{count:'exact',head:true}).eq('status','active'),
      supabase.from('fabric_stock_live').select('*',{count:'exact',head:true}),
      supabase.from('sales_bills').select('*',{count:'exact',head:true}),
      supabase.from('purchase_bills').select('*',{count:'exact',head:true}),
      supabase.from('sales_bills').select('total_amount').gte('bill_date', thisM+'-01').lte('bill_date', mEnd),
      supabase.from('purchase_bills').select('total_amount').gte('bill_date', thisM+'-01').lte('bill_date', mEnd),
      supabase.from('sales_bills').select('bill_date,total_amount').gte('bill_date', mStart).lte('bill_date', mEnd),
      supabase.from('purchase_bills').select('bill_date,total_amount').gte('bill_date', mStart).lte('bill_date', mEnd),
      supabase.from('sales_orders').select('agent_name,total_amount').not('agent_name','is',null).limit(2000),
      supabase.from('customers').select('id,name,city,business_type,created_at').order('created_at',{ascending:false}).limit(500),
      supabase.from('outstanding_receivable').select('closing_balance,party_name').order('closing_balance',{ascending:false}).limit(20),
    ]);

    const revM  = (salesThisM  ||[]).reduce((s,r)=>s+Number(r.total_amount||0),0);
    const purM  = (purchThisM  ||[]).reduce((s,r)=>s+Number(r.total_amount||0),0);
    const outT  = (outData     ||[]).reduce((s,r)=>s+Number(r.closing_balance||0),0);

    setStats({ orders:orders||0, customers:customers||0, designs:designs||0, revenue:revM, purchase:purM, stockItems:stockItems||0, agents:agents||0, jobWorkers:jobWorkers||0, salesBills:salesBills||0, purchaseBills:purchaseBills||0, outstanding:outT });

    // Build monthly chart
    const rev = months.map(m => {
      const key = `${m.year}-${String(m.month).padStart(2,'0')}`;
      const sv  = (salesHist ||[]).filter(b=>(b.bill_date||'').slice(0,7)===key).reduce((s,b)=>s+Number(b.total_amount||0),0);
      const pv  = (purchHist ||[]).filter(b=>(b.bill_date||'').slice(0,7)===key).reduce((s,b)=>s+Number(b.total_amount||0),0);
      return { label:m.label, value:sv, pvalue:pv };
    });
    setMonthlyRevenue(rev);
    setMonthlyPurchase(rev.map(m=>({ label:m.label, value:m.pvalue })));

    // Agent leaderboard
    const agMap = {};
    (agentOrders||[]).forEach(o => {
      const nm=o.agent_name||'Unknown';
      if (!agMap[nm]) agMap[nm]={ name:nm, orders:0, revenue:0 };
      agMap[nm].orders++;
      agMap[nm].revenue+=Number(o.total_amount||0);
    });
    setAgentLeaderboard(Object.values(agMap).sort((a,b)=>b.revenue-a.revenue).slice(0,15));

    // Customer segments
    const cAll = custAll||[];
    setCustomerSegments({
      active:   cAll.filter(c=>c.created_at && new Date(c.created_at)>=d90).length,
      atRisk:   cAll.filter(c=>c.created_at && new Date(c.created_at)<d90  && new Date(c.created_at)>=d180).length,
      dormant:  cAll.filter(c=>c.created_at && new Date(c.created_at)<d180).length,
      total:    customers||0,
    });
    setTopCustomers((outData||[]).filter(o=>Number(o.closing_balance||0)>0).slice(0,8));

    // Category / business type breakdown
    const typeMap = {};
    cAll.forEach(c => {
      const t=c.business_type||'Other';
      if (!typeMap[t]) typeMap[t]=0;
      typeMap[t]++;
    });
    setCategoryData(Object.entries(typeMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([label,value])=>({ label, value })));

    setLoading(false);
  }

  const fmt   = n => '₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
  const fmtL  = n => n>=10000000?(n/10000000).toFixed(2)+'Cr':n>=100000?(n/100000).toFixed(2)+'L':fmt(n);
  const fmtN  = n => Number(n||0).toLocaleString('en-IN');
  const medals = ['🥇','🥈','🥉'];

  const tabStyle = (key) => ({
    padding:'10px 18px', border:'none', cursor:'pointer',
    fontFamily:"'DM Sans', sans-serif", fontSize:13,
    fontWeight: activeTab===key ? 700 : 500,
    color: activeTab===key ? T.navy : T.textMuted,
    background: activeTab===key ? 'linear-gradient(135deg,#E8FFF4,#D4F7EF)' : T.surface,
    borderBottom: activeTab===key ? '2px solid #2BA898' : '2px solid transparent',
    transition: 'all .15s',
  });

  const total12Rev   = monthlyRevenue.reduce((s,m)=>s+m.value,0);
  const total12Pur   = monthlyPurchase.reduce((s,m)=>s+m.value,0);
  const peakMonth    = monthlyRevenue.reduce((best,m)=>m.value>best.value?m:best,{ label:'—', value:0 });
  const avgMonthly   = total12Rev / monthlyRevenue.length || 0;
  const profitEst    = total12Rev - total12Pur;

  return (
    <div style={{ fontFamily:"'DM Sans', sans-serif", background:T.bg, minHeight:'100vh' }}>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', padding:'18px 26px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, background:'linear-gradient(135deg,#3DBFAE,#E8A800)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>📊</div>
              Analytics Overview
            </div>
            <p style={{ fontSize:12, color:'#6A9B95', margin:'4px 0 0' }}>Business intelligence · Shreerang Trendz Pvt Ltd</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <select value={period} onChange={e=>{ setPeriod(e.target.value); }} style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', borderRadius:8, padding:'6px 10px', fontSize:12, cursor:'pointer' }}>
              <option value="6m">Last 6 Months</option>
              <option value="12m">Last 12 Months</option>
            </select>
            <button onClick={loadAll} style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:600 }}>↻ Refresh</button>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ background:T.surface, borderBottom:'1px solid rgba(43,168,152,.15)', display:'flex', paddingLeft:16, overflowX:'auto' }}>
        {[['overview','📊 Overview'],['trends','📈 Trends'],['agents','🏆 Agents'],['customers','👥 Customers'],['outstanding','💰 Outstanding']].map(([key,label])=>(
          <button key={key} onClick={()=>setActiveTab(key)} style={tabStyle(key)}>{label}</button>
        ))}
      </div>

      <div style={{ padding:'22px 26px', display:'flex', flexDirection:'column', gap:18 }}>

        {/* ── OVERVIEW TAB ── */}
        {activeTab==='overview' && (
          <>
            {/* KPI Grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
              <StatCard icon="💹" label="Sales This Month"     value={fmtL(stats.revenue)}    sub={`${fmtN(stats.salesBills)} total bills`}    color={T.green}  onClick={()=>navigate('/admin/accounting/sales-bills')} />
              <StatCard icon="🛒" label="Purchase This Month"  value={fmtL(stats.purchase)}   sub={`${fmtN(stats.purchaseBills)} total bills`} color={T.blue}   onClick={()=>navigate('/admin/accounting/purchase-bills')} />
              <StatCard icon="⚠️" label="Outstanding Recv"     value={fmtL(stats.outstanding)} sub="Total receivable"                            color={T.red}    onClick={()=>navigate('/admin/outstanding-receivable')} />
              <StatCard icon="📋" label="Total Orders"         value={fmtN(stats.orders)}     sub="Sales orders"                                 color={T.purple} onClick={()=>navigate('/admin/orders')} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
              <StatCard icon="👥" label="Customers"    value={fmtN(stats.customers)}  sub="Tally + CRM"     color={T.teal}   onClick={()=>navigate('/admin/customers')} />
              <StatCard icon="📦" label="Stock Items"  value={fmtN(stats.stockItems)} sub="Live inventory"  color='#8E44AD'  onClick={()=>navigate('/admin/stock')} />
              <StatCard icon="🤝" label="Sales Agents" value={fmtN(stats.agents)}     sub="Active team"     color={T.gold}   onClick={()=>navigate('/admin/agent-commission')} />
              <StatCard icon="🏭" label="Job Workers"  value={fmtN(stats.jobWorkers)} sub="Active partners" color='#0E96A0'  onClick={()=>navigate('/admin/job-workers')} />
            </div>

            {/* Quick overview: Revenue vs Purchase + Summary */}
            <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:16 }}>
              <div style={{ background:T.surface, borderRadius:14, padding:'20px', boxShadow:'0 2px 12px rgba(0,0,0,.07)', border:`1px solid ${T.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontFamily:"'Playfair Display', serif", fontSize:16, fontWeight:700, color:T.navy }}>📈 Revenue vs Purchase (Monthly)</div>
                  <div style={{ display:'flex', gap:12, fontSize:11 }}>
                    <span><span style={{ color:T.teal, fontWeight:700 }}>■</span> Sales</span>
                    <span><span style={{ color:T.gold, fontWeight:700 }}>■</span> Purchase</span>
                  </div>
                </div>
                {loading ? <div style={{ color:T.textDim }}>Loading...</div> : <BarChart data={monthlyRevenue} compareData={monthlyPurchase} color={T.teal} compareColor={T.gold} height={140} />}
              </div>
              <div style={{ background:T.surface, borderRadius:14, padding:'20px', boxShadow:'0 2px 12px rgba(0,0,0,.07)', border:`1px solid ${T.border}` }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:16, fontWeight:700, color:T.navy, marginBottom:14 }}>📋 Period Summary</div>
                {[
                  { label:'Total Sales',    value:fmtL(total12Rev),  color:T.green  },
                  { label:'Total Purchase', value:fmtL(total12Pur),  color:T.blue   },
                  { label:'Gross Profit',   value:fmtL(profitEst),   color:profitEst>=0?T.green:T.red },
                  { label:'Peak Month',     value:peakMonth.label,   color:T.teal   },
                  { label:'Avg / Month',    value:fmtL(avgMonthly),  color:T.navy   },
                  { label:'Outstanding',    value:fmtL(stats.outstanding), color:T.red },
                ].map(s=>(
                  <div key={s.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:12, color:T.textMuted }}>{s.label}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {stats.revenue===0 && stats.salesBills===0 && (
              <div style={{ background:'linear-gradient(135deg,#FFF8E8,#FFFAEE)', border:'1px solid rgba(212,146,10,.25)', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ fontSize:24 }}>⚡</span>
                <div>
                  <div style={{ fontWeight:700, color:'#D4920A', marginBottom:3 }}>Connect Tally to populate analytics</div>
                  <div style={{ fontSize:12, color:'#92754A' }}>Go to Tally Sync → click Sync All From Tally. Revenue, purchases & KPIs will show real data.</div>
                </div>
                <button onClick={()=>navigate('/admin/tally-sync')} style={{ marginLeft:'auto', background:'#D4920A', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:12, fontWeight:700 }}>Open Tally Sync →</button>
              </div>
            )}
          </>
        )}

        {/* ── TRENDS TAB ── */}
        {activeTab==='trends' && (
          <>
            <div style={{ background:T.surface, borderRadius:14, padding:'24px', boxShadow:'0 2px 12px rgba(0,0,0,.07)', border:`1px solid ${T.border}` }}>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700, color:T.navy, marginBottom:4 }}>📈 Sales Revenue Trend</div>
              <div style={{ fontSize:12, color:T.textMuted, marginBottom:20 }}>Monthly sales bills from Tally (last {monthlyRevenue.length} months)</div>
              {loading ? <div style={{ color:T.textDim, textAlign:'center', padding:40 }}>Loading...</div> : (
                <>
                  <BarChart data={monthlyRevenue} color={T.teal} height={200} />
                  <div style={{ marginTop:20, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                    {[
                      { label:'Total Revenue', value:fmtL(total12Rev),    icon:'💰' },
                      { label:'Peak Month',    value:peakMonth.label,     icon:'🔝' },
                      { label:'Avg Monthly',   value:fmtL(avgMonthly),    icon:'📊' },
                      { label:'Total Bills',   value:fmtN(stats.salesBills), icon:'📄' },
                    ].map(s=>(
                      <div key={s.label} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:'14px 16px', textAlign:'center' }}>
                        <div style={{ fontSize:22 }}>{s.icon}</div>
                        <div style={{ fontSize:18, fontWeight:800, color:T.navy, marginTop:4 }}>{s.value}</div>
                        <div style={{ fontSize:11, color:T.textMuted }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div style={{ background:T.surface, borderRadius:14, padding:'24px', boxShadow:'0 2px 12px rgba(0,0,0,.07)', border:`1px solid ${T.border}` }}>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700, color:T.navy, marginBottom:4 }}>🛒 Purchase Trend</div>
              <div style={{ fontSize:12, color:T.textMuted, marginBottom:20 }}>Monthly purchase bills from Tally</div>
              {loading ? <div style={{ color:T.textDim, textAlign:'center', padding:40 }}>Loading...</div> : <BarChart data={monthlyPurchase} color={T.blue} height={160} />}
            </div>
          </>
        )}

        {/* ── AGENTS TAB ── */}
        {activeTab==='agents' && (
          <div style={{ background:T.surface, borderRadius:14, padding:'24px', boxShadow:'0 2px 12px rgba(0,0,0,.07)', border:`1px solid ${T.border}` }}>
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700, color:T.navy, marginBottom:4 }}>🏆 Agent Revenue Leaderboard</div>
            <div style={{ fontSize:12, color:T.textMuted, marginBottom:20 }}>Top agents by total order revenue (from sales orders)</div>
            {agentLeaderboard.length===0 ? (
              <div style={{ textAlign:'center', padding:40, color:T.textDim }}>No agent data. Create orders with agent_name to populate leaderboard.</div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                <thead><tr>
                  {['Rank','Agent Name','Orders','Revenue','Avg Order','Revenue Share'].map(h=>(
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:T.textMuted, borderBottom:'2px solid rgba(43,168,152,.15)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {agentLeaderboard.map((agent,i)=>{
                    const maxR = agentLeaderboard[0].revenue;
                    const pct  = maxR>0 ? (agent.revenue/maxR)*100 : 0;
                    const totalRev = agentLeaderboard.reduce((s,a)=>s+a.revenue,0);
                    const sharePct = totalRev>0 ? ((agent.revenue/totalRev)*100).toFixed(1) : '0';
                    return (
                      <tr key={agent.name} style={{ borderBottom:'1px solid rgba(43,168,152,.06)', background:i===0?'#FFFDF0':i===1?'#F8FFFE':'#fff' }}>
                        <td style={{ padding:'12px 14px', fontSize:18 }}>{medals[i] || <span style={{ fontSize:13, color:T.textMuted, fontWeight:700 }}>#{i+1}</span>}</td>
                        <td style={{ padding:'12px 14px', fontWeight:700, color:T.navy }}>{agent.name}</td>
                        <td style={{ padding:'12px 14px', textAlign:'center' }}><span style={{ background:'#EEF6FF', color:T.blue, padding:'3px 10px', borderRadius:20, fontWeight:700, fontSize:12 }}>{agent.orders}</span></td>
                        <td style={{ padding:'12px 14px', fontWeight:800, color:T.green, fontSize:15 }}>{fmtL(agent.revenue)}</td>
                        <td style={{ padding:'12px 14px', color:T.textMuted }}>{fmtL(agent.orders>0?agent.revenue/agent.orders:0)}</td>
                        <td style={{ padding:'12px 14px', minWidth:160 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, background:'#f0f9ff', borderRadius:4, height:8, overflow:'hidden' }}>
                              <div style={{ height:'100%', background:i===0?T.gold:i===1?'#94a3b8':i===2?'#CD7F32':T.teal, borderRadius:4, width:pct+'%', transition:'width .5s' }} />
                            </div>
                            <span style={{ fontSize:11, color:T.textDim, minWidth:32 }}>{sharePct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── CUSTOMERS TAB ── */}
        {activeTab==='customers' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
              {[
                { label:'Total Customers',  value:fmtN(customerSegments.total), color:T.navy,   icon:'👥', desc:'Tally + CRM combined' },
                { label:'Active (90d)',      value:fmtN(customerSegments.active), color:T.green,  icon:'✅', desc:'Added/active recently' },
                { label:'At-Risk (91-180d)', value:fmtN(customerSegments.atRisk), color:'#D4920A', icon:'⚠️', desc:'May need re-engagement' },
                { label:'Dormant (180d+)',   value:fmtN(customerSegments.dormant),color:T.red,    icon:'❌', desc:'Long inactive' },
              ].map(s=>(
                <div key={s.label} style={{ background:T.surface, borderRadius:14, padding:'18px 20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
                  <div style={{ fontSize:28, marginBottom:6 }}>{s.icon}</div>
                  <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.value}</div>
                  <div style={{ fontWeight:700, color:s.color, fontSize:12, marginTop:2 }}>{s.label}</div>
                  <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>{s.desc}</div>
                </div>
              ))}
            </div>
            {categoryData.length>0 && (
              <div style={{ background:T.surface, borderRadius:14, padding:'20px', boxShadow:'0 2px 12px rgba(0,0,0,.07)', border:`1px solid ${T.border}` }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:16, fontWeight:700, color:T.navy, marginBottom:14 }}>📊 Customer Business Types</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:10 }}>
                  {categoryData.map((c,i)=>{
                    const colors=[T.teal,T.blue,T.green,T.gold,T.purple,T.orange];
                    return (
                      <div key={c.label} style={{ background:T.bg, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                        <div style={{ fontSize:20, fontWeight:800, color:colors[i%colors.length] }}>{c.value}</div>
                        <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>{c.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── OUTSTANDING TAB ── */}
        {activeTab==='outstanding' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:16 }}>
              <div style={{ background:T.surface, borderRadius:14, padding:'20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.07)' }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:16, fontWeight:700, color:T.navy, marginBottom:14 }}>💰 Outstanding Summary</div>
                <div style={{ fontSize:36, fontWeight:800, color:T.red }}>{fmtL(stats.outstanding)}</div>
                <div style={{ fontSize:12, color:T.textMuted, marginTop:4 }}>Total receivable (open balances)</div>
                <div style={{ marginTop:20, display:'flex', gap:10 }}>
                  <button onClick={()=>navigate('/admin/outstanding-receivable')} style={{ flex:1, background:T.red, color:'#fff', border:'none', borderRadius:8, padding:'9px 0', cursor:'pointer', fontWeight:700, fontSize:12 }}>View Full Report →</button>
                </div>
                <div style={{ marginTop:10 }}>
                  <button onClick={()=>navigate('/admin/payment-reminders')} style={{ width:'100%', background:'#FFF3F3', border:'1px solid rgba(231,76,60,.3)', color:T.red, borderRadius:8, padding:'9px 0', cursor:'pointer', fontWeight:700, fontSize:12 }}>🔔 Send Reminders</button>
                </div>
              </div>
              <div style={{ background:T.surface, borderRadius:14, padding:'20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.07)' }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:16, fontWeight:700, color:T.navy, marginBottom:14 }}>🏆 Top Outstanding Parties</div>
                {topCustomers.length===0 ? (
                  <div style={{ color:T.textDim, textAlign:'center', padding:30, fontSize:13 }}>No outstanding data. Sync from Tally first.</div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead><tr>
                      {['Party Name','Balance'].map(h=><th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:11, fontWeight:700, color:T.textMuted, borderBottom:'2px solid rgba(43,168,152,.1)' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {topCustomers.map((c,i)=>(
                        <tr key={i} style={{ borderBottom:'1px solid rgba(43,168,152,.06)' }}>
                          <td style={{ padding:'10px 12px', fontWeight:600, color:T.navy }}>{c.party_name||'—'}</td>
                          <td style={{ padding:'10px 12px', fontWeight:800, color:T.red }}>{fmtL(c.closing_balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
