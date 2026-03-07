import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function StatCard({ icon, label, value, sub, color='#2468C8' }) {
  return (
    <div style={{ background:'#fff', borderRadius:14, padding:'18px 22px', boxShadow:'0 2px 12px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.1)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
        <div style={{ width:36, height:36, background:`${color}18`, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{icon}</div>
        <div style={{ fontSize:11, fontWeight:700, color:'#6A9B95', textTransform:'uppercase', letterSpacing:'0.8px' }}>{label}</div>
      </div>
      <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ orders:0, customers:0, designs:0, revenue:0, purchase:0, stockItems:0, agents:0, jobWorkers:0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [
      { count: orders }, { count: customers }, { count: designs },
      { count: agents }, { count: jobWorkers }, { count: stockItems },
      { data: salesData }, { data: purchaseData },
      { data: recentOrd }, { data: custData }
    ] = await Promise.all([
      supabase.from('sales_orders').select('*',{count:'exact',head:true}),
      supabase.from('customers').select('*',{count:'exact',head:true}),
      supabase.from('designs').select('*',{count:'exact',head:true}),
      supabase.from('sales_team').select('*',{count:'exact',head:true}),
      supabase.from('job_workers').select('*',{count:'exact',head:true}).eq('status','active'),
      supabase.from('fabric_stock_live').select('*',{count:'exact',head:true}),
      supabase.from('sales_bills').select('total_amount').gte('bill_date', new Date(new Date().setDate(1)).toISOString().slice(0,10)),
      supabase.from('purchase_bills').select('total_amount').gte('bill_date', new Date(new Date().setDate(1)).toISOString().slice(0,10)),
      supabase.from('sales_orders').select('id,order_number,customer_name,total_amount,status,created_at').order('created_at',{ascending:false}).limit(8),
      supabase.from('customers').select('id,name,city,business_type').limit(6),
    ]);
    const revenue = (salesData||[]).reduce((s,r)=>s+Number(r.total_amount||0),0);
    const purchase = (purchaseData||[]).reduce((s,r)=>s+Number(r.total_amount||0),0);
    setStats({ orders:orders||0, customers:customers||0, designs:designs||0, revenue, purchase, stockItems:stockItems||0, agents:agents||0, jobWorkers:jobWorkers||0 });
    setRecentOrders(recentOrd||[]);
    setTopCustomers(custData||[]);
    setLoading(false);
  }

  const fmt = n => '₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
  const fmtL = n => n >= 100000 ? (n/100000).toFixed(1)+'L' : fmt(n);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'var(--bg,#F4FBFA)', minHeight:'100vh' }}>
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', padding:'18px 26px' }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, background:'linear-gradient(135deg,#3DBFAE,#E8A800)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>📊</div>
          Analytics Overview
        </div>
        <p style={{ fontSize:12, color:'#6A9B95', margin:'4px 0 0' }}>Business performance · Shreerang Trendz Pvt Ltd</p>
      </div>

      <div style={{ padding:'22px 26px', display:'flex', flexDirection:'column', gap:20 }}>
        {/* KPI Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          <StatCard icon="💹" label="Sales This Month" value={fmtL(stats.revenue)} sub="From Tally bills" color="#1E9E5A" />
          <StatCard icon="🛒" label="Purchase This Month" value={fmtL(stats.purchase)} sub="From Tally bills" color="#2468C8" />
          <StatCard icon="📋" label="Total Orders" value={stats.orders} sub="Sales orders" color="#6E44C8" />
          <StatCard icon="👥" label="Customers" value={stats.customers} sub="In database" color="#D4920A" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          <StatCard icon="🎨" label="Designs" value={stats.designs} sub="In catalogue" color="#C9106E" />
          <StatCard icon="📦" label="Stock Items" value={stats.stockItems} sub="Fabric stock live" color="#3DBFAE" />
          <StatCard icon="🤝" label="Sales Agents" value={stats.agents} sub="Active team" color="#E8A800" />
          <StatCard icon="🏭" label="Job Workers" value={stats.jobWorkers} sub="Active partners" color="#0E96A0" />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:18 }}>
          {/* Recent Orders */}
          <div style={{ background:'#fff', borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 12px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.1)' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:'#0B2E2B', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
              📋 Recent Orders {loading && <span style={{ fontSize:11, color:'#6A9B95' }}>loading…</span>}
            </div>
            {recentOrders.length === 0 ? (
              <div style={{ textAlign:'center', padding:'30px 0', color:'#94a3b8', fontSize:13 }}>
                No orders yet. Create one from the Orders section.
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr>
                  {['Order #','Customer','Amount','Status'].map(h=>(
                    <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6A9B95', borderBottom:'1px solid rgba(43,168,152,.1)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {recentOrders.map(o=>{
                    const sc={pending:['#FFF8E8','#D4920A'],confirmed:['#E8FFF4','#1E9E5A'],dispatched:['#EEF6FF','#2468C8'],cancelled:['#FFF3F3','#ef4444']};
                    const [bg,tc]=sc[o.status]||['#f1f5f9','#64748b'];
                    return(
                      <tr key={o.id} style={{ borderBottom:'1px solid rgba(43,168,152,.06)' }}>
                        <td style={{ padding:'8px 10px', fontWeight:600, color:'#2468C8' }}>{o.order_number||o.id.slice(0,8)}</td>
                        <td style={{ padding:'8px 10px' }}>{o.customer_name||'—'}</td>
                        <td style={{ padding:'8px 10px', fontWeight:600, color:'#1E9E5A' }}>{fmt(o.total_amount)}</td>
                        <td style={{ padding:'8px 10px' }}><span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700, background:bg, color:tc }}>{o.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Customers */}
          <div style={{ background:'#fff', borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 12px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.1)' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:'#0B2E2B', marginBottom:14 }}>
              👥 Recent Customers
            </div>
            {topCustomers.length === 0 ? (
              <div style={{ textAlign:'center', padding:'30px 0', color:'#94a3b8', fontSize:13 }}>No customers yet.</div>
            ) : topCustomers.map(c=>(
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(43,168,152,.06)' }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#3DBFAE,#2BA898)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:13 }}>
                  {c.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{c.name}</div>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>{c.city||'India'} · {c.business_type||'Customer'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data empty notice */}
        {stats.revenue === 0 && stats.orders === 0 && (
          <div style={{ background:'linear-gradient(135deg,#FFF8E8,#FFFAEE)', border:'1px solid rgba(212,146,10,.25)', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
            <span style={{ fontSize:24 }}>⚡</span>
            <div>
              <div style={{ fontWeight:700, color:'#D4920A', marginBottom:3 }}>Connect Tally to populate analytics</div>
              <div style={{ fontSize:12, color:'#92754A' }}>Start the FRP tunnel on your Tally PC → go to Tally Sync → click Sync Bills Now. Revenue, purchases and all KPIs will show real data.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
