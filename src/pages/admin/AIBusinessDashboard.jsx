import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || '';

const T = {
  teal:'#2BA898', gold:'#E8A800', navy:'#0B2E2B', red:'#E74C3C',
  green:'#1E9E5A', blue:'#2468C8', purple:'#9B59B6', orange:'#E67E22',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', muted:'#6A9B95',
};

async function askClaude(prompt, data) {
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 1000,
        messages: [{ role: 'user', content: `You are an AI business analyst for Shreerang Trendz Pvt Ltd, a textile company in Surat. Analyze the following Tally ERP data and give SHORT, ACTIONABLE insights in plain Hindi/English mix (Hinglish). Be specific with numbers. Max 4 bullet points.

Data: ${JSON.stringify(data)}

Question: ${prompt}` }]
      })
    });
    const d = await resp.json();
    return d.content?.[0]?.text || 'Analysis unavailable';
  } catch(e) { return 'AI analysis unavailable. Check API connection.'; }
}

export default function AIBusinessDashboard() {
  const [data, setData] = useState({ sales: [], purchase: [], process: [], stock: [] });
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [customQ, setCustomQ] = useState('');
  const [customA, setCustomA] = useState('');
  const [customLoading, setCustomLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [kpis, setKpis] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth()-1, 1).toISOString().split('T')[0];

    const [salesRes, purchRes, processRes, stockRes] = await Promise.all([
      supabase.from('sales_bills').select('bill_date,total_amount,customer_name,broker_name,comm_amount,quantity_mtrs,narration,bill_number').order('bill_date', { ascending: false }).limit(200),
      supabase.from('purchase_bills').select('bill_date,total_amount,supplier_name,quantity_mtrs,bill_number').order('bill_date', { ascending: false }).limit(100),
      supabase.from('process_issues').select('issue_date,job_worker_name,metres_issued,challan_no,status,process_type,shortage_mtrs,shortage_pct,lot_no').order('issue_date', { ascending: false }).limit(200),
      supabase.from('fabric_stock_live').select('fabric_name,closing_qty_mtrs,total_value,sync_date').order('sync_date', { ascending: false }).limit(100),
    ]);

    const sales = salesRes.data || [];
    const purchase = purchRes.data || [];
    const process = processRes.data || [];
    const stock = stockRes.data || [];

    // Calculate KPIs
    const thisMthSales = sales.filter(s => s.bill_date >= monthStart);
    const lastMthSales = sales.filter(s => s.bill_date >= lastMonthStart && s.bill_date < monthStart);
    const thisRevenue = thisMthSales.reduce((a,s) => a + (s.total_amount||0), 0);
    const lastRevenue = lastMthSales.reduce((a,s) => a + (s.total_amount||0), 0);
    const revenueGrowth = lastRevenue > 0 ? ((thisRevenue - lastRevenue) / lastRevenue * 100).toFixed(1) : 0;

    const totalStock = stock.reduce((a,s) => a + (s.closing_qty_mtrs||0), 0);
    const totalStockVal = stock.reduce((a,s) => a + (s.total_value||0), 0);

    const highShrink = process.filter(p => (p.shortage_pct||0) > 15);
    const avgShrink = process.filter(p => p.shortage_pct).length > 0
      ? (process.filter(p=>p.shortage_pct).reduce((a,p)=>a+(p.shortage_pct||0),0) / process.filter(p=>p.shortage_pct).length).toFixed(1)
      : 0;

    // Top customers
    const custMap = {};
    sales.forEach(s => {
      if (!custMap[s.customer_name]) custMap[s.customer_name] = 0;
      custMap[s.customer_name] += s.total_amount||0;
    });
    const topCustomers = Object.entries(custMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

    // Top suppliers
    const suppMap = {};
    purchase.forEach(p => {
      if (!suppMap[p.supplier_name]) suppMap[p.supplier_name] = 0;
      suppMap[p.supplier_name] += p.total_amount||0;
    });
    const topSuppliers = Object.entries(suppMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

    // Mill performance
    const millMap = {};
    process.forEach(p => {
      if (!p.job_worker_name) return;
      if (!millMap[p.job_worker_name]) millMap[p.job_worker_name] = { total: 0, shortages: [], batches: 0 };
      millMap[p.job_worker_name].batches++;
      if (p.shortage_pct) millMap[p.job_worker_name].shortages.push(p.shortage_pct);
    });
    const millPerf = Object.entries(millMap).map(([name, d]) => ({
      name, batches: d.batches,
      avgShrink: d.shortages.length > 0 ? (d.shortages.reduce((a,b)=>a+b,0)/d.shortages.length).toFixed(1) : null
    })).sort((a,b) => (a.avgShrink||0) - (b.avgShrink||0));

    setKpis({ thisRevenue, lastRevenue, revenueGrowth, totalStock, totalStockVal, avgShrink, highShrink: highShrink.length, thisMthBills: thisMthSales.length, topCustomers, topSuppliers, millPerf });
    setData({ sales, purchase, process, stock });
    setLoading(false);

    // Auto AI insight on load
    generateInsight(sales, purchase, process, stock, { thisRevenue, revenueGrowth, avgShrink, thisMthBills: thisMthSales.length });
  };

  const generateInsight = async (s, p, proc, stk, k) => {
    setAiLoading(true);
    const summary = {
      this_month_revenue: k.thisRevenue, revenue_growth_pct: k.revenueGrowth,
      bills_this_month: k.thisMthBills,
      recent_sales_sample: s.slice(0,10).map(x=>({ customer: x.customer_name, amount: x.total_amount, date: x.bill_date })),
      top_purchase_suppliers: p.slice(0,5).map(x=>({ supplier: x.supplier_name, amount: x.total_amount })),
      avg_shrinkage_pct: k.avgShrink,
      stock_items: stk.slice(0,10).map(x=>({ fabric: x.fabric_name, qty: x.closing_qty_mtrs })),
    };
    const insight = await askClaude('Give me today's key business priorities and what I should focus on', summary);
    setAiInsight(insight);
    setAiLoading(false);
  };

  const askCustom = async () => {
    if (!customQ.trim()) return;
    setCustomLoading(true);
    const ans = await askClaude(customQ, {
      recent_sales: data.sales.slice(0,30),
      recent_purchase: data.purchase.slice(0,20),
      process_data: data.process.slice(0,30),
      stock: data.stock.slice(0,30),
      kpis
    });
    setCustomA(ans);
    setCustomLoading(false);
  };

  const fmt = (n) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${Math.round(n||0)}`;
  const fmtMtrs = (n) => n >= 1000 ? `${(n/1000).toFixed(1)}K mtrs` : `${Math.round(n||0)} mtrs`;

  const TABS = ['overview', 'sales', 'purchase', 'mills', 'stock', 'ai-chat'];

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400, color:T.muted }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:8 }}>⚡</div>
        <div>Loading Tally data + AI analysis...</div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', background:T.bg, minHeight:'100vh', padding:20 }}>
      {/* Header */}
      <div style={{ background:T.navy, borderRadius:12, padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ color:'#fff', fontSize:20, fontWeight:700 }}>🧠 AI Business Intelligence</div>
          <div style={{ color:'rgba(255,255,255,0.6)', fontSize:13, marginTop:2 }}>Shreerang Trendz · Powered by Tally + Claude AI</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={loadData} style={{ background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:13 }}>↻ Refresh</button>
        </div>
      </div>

      {/* AI Insight Bar */}
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#1a4a44)', borderRadius:12, padding:16, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <span style={{ fontSize:16 }}>🤖</span>
          <span style={{ color:T.gold, fontWeight:600, fontSize:13 }}>CLAUDE AI DAILY BRIEFING</span>
          {aiLoading && <span style={{ color:'rgba(255,255,255,0.5)', fontSize:12 }}>Analyzing your Tally data...</span>}
        </div>
        <div style={{ color:'rgba(255,255,255,0.9)', fontSize:14, lineHeight:1.6, whiteSpace:'pre-line' }}>
          {aiLoading ? '⏳ AI is reading your Tally data...' : aiInsight || 'Click Refresh to generate AI insight'}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
        {[
          { label:'Revenue This Month', val: fmt(kpis.thisRevenue), delta: `${kpis.revenueGrowth > 0 ? '▲' : '▼'} ${Math.abs(kpis.revenueGrowth)}% vs last month`, color: kpis.revenueGrowth > 0 ? T.green : T.red },
          { label:'Bills This Month', val: kpis.thisMthBills, delta:`Total: ${data.sales.length} bills in DB`, color:T.blue },
          { label:'Stock in Godown', val: fmtMtrs(kpis.totalStock), delta:`Value: ${fmt(kpis.totalStockVal)}`, color:T.teal },
          { label:'Avg Mill Shrinkage', val: `${kpis.avgShrink}%`, delta: kpis.highShrink > 0 ? `⚠ ${kpis.highShrink} mills >15%` : '✓ All mills normal', color: kpis.avgShrink > 12 ? T.red : T.green },
        ].map((k,i) => (
          <div key={i} style={{ background:T.surface, borderRadius:10, padding:14, border:`1px solid ${T.border}` }}>
            <div style={{ color:T.muted, fontSize:11, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{k.label}</div>
            <div style={{ color:T.text, fontSize:22, fontWeight:700 }}>{k.val}</div>
            <div style={{ color:k.color, fontSize:12, marginTop:4 }}>{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:14, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding:'7px 16px', borderRadius:20, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', background: activeTab===t ? T.teal : T.surface, color: activeTab===t ? '#fff' : T.muted, textTransform:'capitalize' }}>
            {t==='ai-chat' ? '🤖 Ask AI' : t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={{ background:T.surface, borderRadius:10, padding:16, border:`1px solid ${T.border}` }}>
            <div style={{ fontWeight:600, marginBottom:12, color:T.text }}>🏆 Top Customers (All Time)</div>
            {(kpis.topCustomers||[]).map(([name,amt],i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${T.border}` }}>
                <span style={{ color:T.text, fontSize:13 }}>{i+1}. {name?.substring(0,25)}</span>
                <span style={{ fontWeight:600, color:T.green, fontSize:13 }}>{fmt(amt)}</span>
              </div>
            ))}
          </div>
          <div style={{ background:T.surface, borderRadius:10, padding:16, border:`1px solid ${T.border}` }}>
            <div style={{ fontWeight:600, marginBottom:12, color:T.text }}>🏭 Mill Performance (Shrinkage)</div>
            {(kpis.millPerf||[]).slice(0,6).map((m,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${T.border}` }}>
                <span style={{ color:T.text, fontSize:12 }}>{m.name?.substring(0,22)}</span>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:11, color:T.muted }}>{m.batches} batches</span>
                  <span style={{ fontWeight:600, fontSize:12, color: !m.avgShrink ? T.muted : m.avgShrink > 15 ? T.red : m.avgShrink > 10 ? T.orange : T.green }}>
                    {m.avgShrink ? `${m.avgShrink}%` : 'No data'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sales' && (
        <div style={{ background:T.surface, borderRadius:10, border:`1px solid ${T.border}`, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, fontWeight:600, color:T.text }}>📊 All Sales Bills ({data.sales.length} records from Tally)</div>
          <div style={{ overflowX:'auto', maxHeight:500 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:T.bg }}>
                  {['Bill No','Date','Customer','Amount','Qty (mtrs)','Broker','Commission'].map(h => (
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:T.muted, fontWeight:600, fontSize:11, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sales.slice(0,50).map((s,i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${T.border}`, background: i%2===0 ? T.surface : T.bg }}>
                    <td style={{ padding:'7px 12px', color:T.blue, fontWeight:500 }}>{s.bill_number}</td>
                    <td style={{ padding:'7px 12px', color:T.muted, whiteSpace:'nowrap' }}>{s.bill_date}</td>
                    <td style={{ padding:'7px 12px', color:T.text }}>{s.customer_name?.substring(0,20)}</td>
                    <td style={{ padding:'7px 12px', fontWeight:600, color:T.green }}>{fmt(s.total_amount)}</td>
                    <td style={{ padding:'7px 12px', color:T.text }}>{s.quantity_mtrs ? Math.round(s.quantity_mtrs)+' m' : '-'}</td>
                    <td style={{ padding:'7px 12px', color:T.muted, fontSize:11 }}>{s.broker_name?.substring(0,15) || '-'}</td>
                    <td style={{ padding:'7px 12px', color:T.purple }}>{s.comm_amount ? fmt(s.comm_amount) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'purchase' && (
        <div style={{ background:T.surface, borderRadius:10, border:`1px solid ${T.border}`, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, fontWeight:600, color:T.text }}>🛒 Purchase Bills ({data.purchase.length} records from Tally)</div>
          <div style={{ overflowX:'auto', maxHeight:500 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:T.bg }}>
                  {['Bill No','Date','Supplier','Amount','Qty (mtrs)'].map(h => (
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:T.muted, fontWeight:600, fontSize:11, textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.purchase.slice(0,50).map((p,i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${T.border}`, background: i%2===0 ? T.surface : T.bg }}>
                    <td style={{ padding:'7px 12px', color:T.blue, fontWeight:500 }}>{p.bill_number}</td>
                    <td style={{ padding:'7px 12px', color:T.muted, whiteSpace:'nowrap' }}>{p.bill_date}</td>
                    <td style={{ padding:'7px 12px', color:T.text }}>{p.supplier_name?.substring(0,25)}</td>
                    <td style={{ padding:'7px 12px', fontWeight:600, color:T.orange }}>{fmt(p.total_amount)}</td>
                    <td style={{ padding:'7px 12px', color:T.text }}>{p.quantity_mtrs ? Math.round(p.quantity_mtrs)+' m' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'mills' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={{ background:T.surface, borderRadius:10, padding:16, border:`1px solid ${T.border}` }}>
            <div style={{ fontWeight:600, marginBottom:12, color:T.text }}>🏭 Process Issues — Issue to Mill</div>
            {data.process.filter(p=>p.shortage_pct).slice(0,10).map((p,i) => (
              <div key={i} style={{ padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:T.text, fontSize:12, fontWeight:500 }}>{p.job_worker_name?.substring(0,22)}</span>
                  <span style={{ color: p.shortage_pct > 15 ? T.red : T.green, fontWeight:600, fontSize:12 }}>{p.shortage_pct?.toFixed(1)}% short</span>
                </div>
                <div style={{ color:T.muted, fontSize:11, marginTop:2 }}>Challan: {p.challan_no} · {p.issue_date} · {p.lot_no || '-'}</div>
              </div>
            ))}
          </div>
          <div style={{ background:T.surface, borderRadius:10, padding:16, border:`1px solid ${T.border}` }}>
            <div style={{ fontWeight:600, marginBottom:12, color:T.text }}>📊 Mill Summary Table</div>
            {(kpis.millPerf||[]).map((m,i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
                <div>
                  <div style={{ color:T.text, fontSize:12, fontWeight:500 }}>{m.name?.substring(0,22)}</div>
                  <div style={{ color:T.muted, fontSize:11 }}>{m.batches} batches processed</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700, fontSize:14, color: !m.avgShrink ? T.muted : m.avgShrink > 15 ? T.red : m.avgShrink > 10 ? T.orange : T.green }}>
                    {m.avgShrink ? `${m.avgShrink}%` : 'N/A'}
                  </div>
                  <div style={{ fontSize:10, color:T.muted }}>avg shrink</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div style={{ background:T.surface, borderRadius:10, border:`1px solid ${T.border}` }}>
          <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, fontWeight:600, color:T.text }}>📦 Live Stock ({data.stock.length} fabrics)</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, padding:12 }}>
            {data.stock.sort((a,b)=>(b.closing_qty_mtrs||0)-(a.closing_qty_mtrs||0)).slice(0,30).map((s,i) => (
              <div key={i} style={{ background:T.bg, borderRadius:8, padding:10, border:`1px solid ${s.closing_qty_mtrs < 100 ? T.red : T.border}` }}>
                <div style={{ color:T.text, fontSize:12, fontWeight:500, marginBottom:4 }}>{s.fabric_name?.substring(0,28)}</div>
                <div style={{ fontWeight:700, color: s.closing_qty_mtrs < 100 ? T.red : s.closing_qty_mtrs < 300 ? T.orange : T.green, fontSize:14 }}>
                  {Math.round(s.closing_qty_mtrs||0)} mtrs
                </div>
                {s.closing_qty_mtrs < 100 && <div style={{ color:T.red, fontSize:10, marginTop:2 }}>⚠ LOW STOCK</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'ai-chat' && (
        <div>
          <div style={{ background:T.surface, borderRadius:10, padding:16, border:`1px solid ${T.border}`, marginBottom:12 }}>
            <div style={{ fontWeight:600, marginBottom:12, color:T.text }}>🤖 Ask AI About Your Business</div>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <input value={customQ} onChange={e=>setCustomQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&askCustom()}
                placeholder="e.g. Which customer owes me the most? Which mill has worst shrinkage? What should I reorder?"
                style={{ flex:1, padding:'10px 14px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, outline:'none' }} />
              <button onClick={askCustom} disabled={customLoading} style={{ background:T.teal, color:'#fff', border:'none', borderRadius:8, padding:'10px 18px', cursor:'pointer', fontWeight:600 }}>
                {customLoading ? '...' : 'Ask'}
              </button>
            </div>
            {/* Quick question chips */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['Which customer bought most this month?','Which mill has highest shrinkage?','What fabric is running low?','Show me broker commission summary','What are my top purchase suppliers?','Compare this month vs last month sales'].map(q => (
                <button key={q} onClick={()=>{setCustomQ(q); setTimeout(()=>askCustom(),100);}}
                  style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:20, padding:'5px 12px', fontSize:11, cursor:'pointer', color:T.text }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
          {customA && (
            <div style={{ background:'#0B2E2B', borderRadius:10, padding:16 }}>
              <div style={{ color:T.gold, fontWeight:600, marginBottom:8, fontSize:13 }}>🤖 Claude AI Analysis</div>
              <div style={{ color:'rgba(255,255,255,0.9)', lineHeight:1.7, whiteSpace:'pre-line', fontSize:14 }}>{customA}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
