import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Simple bar chart component (no external dep)
function BarChart({ data, color = '#2BA898', height = 120 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: height + 20 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 32 }}>
            {d.value > 0 ? (d.value >= 100000 ? (d.value / 100000).toFixed(1) + 'L' : (d.value / 1000).toFixed(0) + 'K') : ''}
          </div>
          <div title={d.label + ': ₹' + (d.value || 0).toLocaleString('en-IN')} style={{ width: '100%', background: color, borderRadius: '3px 3px 0 0', height: max > 0 ? Math.max((d.value / max) * height, 2) : 2, opacity: 0.85, transition: 'height .3s', cursor: 'pointer' }} />
          <div style={{ fontSize: 9, color: '#94a3b8', whiteSpace: 'nowrap' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color = '#2468C8' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 22px', boxShadow: '0 2px 12px rgba(0,0,0,.07)', border: '1px solid rgba(43,168,152,.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, background: color + '18', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6A9B95', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ orders: 0, customers: 0, designs: 0, revenue: 0, purchase: 0, stockItems: 0, agents: 0, jobWorkers: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [agentLeaderboard, setAgentLeaderboard] = useState([]);
  const [customerSegments, setCustomerSegments] = useState({ active: 0, atRisk: 0, dormant: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    // Build last 12 months labels
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleString('en-IN', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() + 1, value: 0, start: d.toISOString().slice(0, 10), end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10) });
    }

    // Cutoff dates for segmentation
    const d90 = new Date(now); d90.setDate(d90.getDate() - 90);
    const d180 = new Date(now); d180.setDate(d180.getDate() - 180);

    const [
      { count: orders },
      { count: customers },
      { count: designs },
      { count: agents },
      { count: jobWorkers },
      { count: stockItems },
      { data: salesData },
      { data: purchaseData },
      { data: recentOrd },
      { data: custData },
      { data: allOrders },
      { data: agentData },
    ] = await Promise.all([
      supabase.from('sales_orders').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('designs').select('*', { count: 'exact', head: true }),
      supabase.from('sales_team').select('*', { count: 'exact', head: true }),
      supabase.from('job_workers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('fabric_stock_live').select('*', { count: 'exact', head: true }),
      supabase.from('sales_bills').select('total_amount').gte('bill_date', thisMonthStart),
      supabase.from('purchase_bills').select('total_amount').gte('bill_date', thisMonthStart),
      supabase.from('sales_orders').select('id,order_no,party_name,party_details,total_amount,status,created_at').order('created_at', { ascending: false }).limit(8),
      supabase.from('customers').select('id,name,city,business_type,created_at').order('created_at', { ascending: false }).limit(6),
      supabase.from('sales_orders').select('total_amount,created_at,agent_name').gte('created_at', months[0].start + 'T00:00:00'),
      supabase.from('sales_orders').select('agent_name,total_amount').not('agent_name', 'is', null).limit(500),
    ]);

    const revenue = (salesData || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
    const purchase = (purchaseData || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);

    setStats({ orders: orders || 0, customers: customers || 0, designs: designs || 0, revenue, purchase, stockItems: stockItems || 0, agents: agents || 0, jobWorkers: jobWorkers || 0 });
    setRecentOrders(recentOrd || []);
    setTopCustomers(custData || []);

    // Build 12-month revenue chart
    const mRevenue = months.map(m => {
      const val = (allOrders || [])
        .filter(o => o.created_at && o.created_at.slice(0, 7) === `${m.year}-${String(m.month).padStart(2, '0')}`)
        .reduce((s, o) => s + Number(o.total_amount || 0), 0);
      return { label: m.label, value: val };
    });
    setMonthlyRevenue(mRevenue);

    // Agent leaderboard: top 10 by revenue from sales_orders
    const agentMap = {};
    (agentData || []).forEach(o => {
      const name = o.agent_name || 'Unknown';
      if (!agentMap[name]) agentMap[name] = { name, orders: 0, revenue: 0 };
      agentMap[name].orders += 1;
      agentMap[name].revenue += Number(o.total_amount || 0);
    });
    const sorted = Object.values(agentMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    setAgentLeaderboard(sorted);

    // Customer segmentation by created_at (proxy for activity — ideally last_order_date)
    const active = (custData || []).filter(c => c.created_at && new Date(c.created_at) >= d90).length;
    const atRisk = (custData || []).filter(c => c.created_at && new Date(c.created_at) < d90 && new Date(c.created_at) >= d180).length;
    const dormant = (custData || []).filter(c => c.created_at && new Date(c.created_at) < d180).length;
    setCustomerSegments({ active, atRisk, dormant });

    setLoading(false);
  }

  const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const fmtL = n => n >= 100000 ? (n / 100000).toFixed(1) + 'L' : fmt(n);
  const medals = ['🥇', '🥈', '🥉'];

  const tabStyle = (key) => ({
    padding: '10px 20px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
    fontWeight: activeTab === key ? 700 : 500,
    color: activeTab === key ? '#0B2E2B' : '#6A9B95',
    background: activeTab === key ? 'linear-gradient(135deg,#E8FFF4,#D4F7EF)' : '#fff',
    borderBottom: activeTab === key ? '2px solid #2BA898' : '2px solid transparent',
    transition: 'all .15s'
  });

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: 'var(--bg,#F4FBFA)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0B2E2B,#143F3C)', padding: '18px 26px' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#3DBFAE,#E8A800)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📊</div>
          Analytics Overview
        </div>
        <p style={{ fontSize: 12, color: '#6A9B95', margin: '4px 0 0' }}>Business performance · Shreerang Trendz Pvt Ltd</p>
      </div>

      {/* Tab Bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(43,168,152,.15)', display: 'flex', paddingLeft: 20 }}>
        {[['overview', '📊 Overview'], ['trends', '📈 Sales Trends'], ['agents', '🏆 Agent Leaderboard'], ['customers', '👥 Customer Segments']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={tabStyle(key)}>{label}</button>
        ))}
        <button onClick={loadAll} style={{ marginLeft: 'auto', marginRight: 16, padding: '8px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#2BA898', fontWeight: 600 }}>↻ Refresh</button>
      </div>

      <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
              <StatCard icon="💹" label="Sales This Month" value={fmtL(stats.revenue)} sub="From Tally bills" color="#1E9E5A" />
              <StatCard icon="🛒" label="Purchase This Month" value={fmtL(stats.purchase)} sub="From Tally bills" color="#2468C8" />
              <StatCard icon="📋" label="Total Orders" value={stats.orders} sub="Sales orders" color="#6E44C8" />
              <StatCard icon="👥" label="Customers" value={stats.customers.toLocaleString('en-IN')} sub="In database" color="#D4920A" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
              <StatCard icon="🎨" label="Designs" value={stats.designs} sub="In catalogue" color="#C9106E" />
              <StatCard icon="📦" label="Stock Items" value={stats.stockItems} sub="Fabric stock live" color="#3DBFAE" />
              <StatCard icon="🤝" label="Sales Agents" value={stats.agents} sub="Active team" color="#E8A800" />
              <StatCard icon="🏭" label="Job Workers" value={stats.jobWorkers} sub="Active partners" color="#0E96A0" />
            </div>

            {/* Quick Monthly Bar + Recent Orders */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.6fr', gap: 18 }}>
              {/* Mini trend preview */}
              <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,.07)', border: '1px solid rgba(43,168,152,.1)' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#0B2E2B', marginBottom: 14 }}>📈 12-Month Revenue</div>
                {loading ? <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading...</div> : <BarChart data={monthlyRevenue} color="#2BA898" height={100} />}
                <button onClick={() => setActiveTab('trends')} style={{ marginTop: 8, fontSize: 11, color: '#2BA898', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View full trends →</button>
              </div>

              {/* Recent Orders */}
              <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 12px rgba(0,0,0,.07)', border: '1px solid rgba(43,168,152,.1)' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#0B2E2B', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  📋 Recent Orders {loading && <span style={{ fontSize: 11, color: '#6A9B95' }}>loading…</span>}
                </div>
                {recentOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: 13 }}>No orders yet. Create one from the Orders section.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr>
                      {['Order #', 'Customer', 'Amount', 'Status'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6A9B95', borderBottom: '1px solid rgba(43,168,152,.1)' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {recentOrders.map(o => {
                        const sc = { pending: ['#FFF8E8', '#D4920A'], confirmed: ['#E8FFF4', '#1E9E5A'], dispatched: ['#EEF6FF', '#2468C8'], cancelled: ['#FFF3F3', '#ef4444'] };
                        const [bg, tc] = sc[o.status] || ['#f1f5f9', '#64748b'];
                        return (
                          <tr key={o.id} style={{ borderBottom: '1px solid rgba(43,168,152,.06)' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: '#2468C8' }}>{o.order_no || o.id.slice(0, 8)}</td>
                            <td style={{ padding: '8px 10px' }}>{o.party_name || o.party_details?.name || '—'}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1E9E5A' }}>{fmt(o.total_amount)}</td>
                            <td style={{ padding: '8px 10px' }}><span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: bg, color: tc }}>{o.status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {stats.revenue === 0 && stats.orders === 0 && (
              <div style={{ background: 'linear-gradient(135deg,#FFF8E8,#FFFAEE)', border: '1px solid rgba(212,146,10,.25)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 24 }}>⚡</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#D4920A', marginBottom: 3 }}>Connect Tally to populate analytics</div>
                  <div style={{ fontSize: 12, color: '#92754A' }}>Start the FRP tunnel on your Tally PC → go to Tally Sync → click Sync Bills Now. Revenue, purchases and all KPIs will show real data.</div>
                </div>
              </div>
            )}
          </>
        )}

        {/* SALES TRENDS TAB */}
        {activeTab === 'trends' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.07)', border: '1px solid rgba(43,168,152,.1)' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#0B2E2B', marginBottom: 6 }}>📈 12-Month Sales Revenue Trend</div>
            <div style={{ fontSize: 12, color: '#6A9B95', marginBottom: 24 }}>Revenue from sales orders over the past 12 months</div>
            {loading ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: 40 }}>Loading trend data...</div>
            ) : (
              <>
                <BarChart data={monthlyRevenue} color="#2BA898" height={200} />
                <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Total 12M Revenue', value: fmt(monthlyRevenue.reduce((s, m) => s + m.value, 0)), icon: '💰' },
                    { label: 'Peak Month', value: monthlyRevenue.reduce((best, m) => m.value > best.value ? m : best, { label: '—', value: 0 }).label, icon: '🔝' },
                    { label: 'Avg Monthly', value: fmt(monthlyRevenue.reduce((s, m) => s + m.value, 0) / 12), icon: '📊' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#f8fffe', border: '1px solid rgba(43,168,152,.12)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22 }}>{s.icon}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0B2E2B', marginTop: 4 }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: '#6A9B95' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* AGENT LEADERBOARD TAB */}
        {activeTab === 'agents' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.07)', border: '1px solid rgba(43,168,152,.1)' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#0B2E2B', marginBottom: 6 }}>🏆 Agent Revenue Leaderboard</div>
            <div style={{ fontSize: 12, color: '#6A9B95', marginBottom: 24 }}>Top 10 agents by total order revenue</div>
            {agentLeaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No agent data yet. Orders with agent_name will appear here.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead><tr>
                  {['Rank', 'Agent Name', 'Orders', 'Total Revenue', 'Avg Order Value', 'Revenue Bar'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6A9B95', borderBottom: '2px solid rgba(43,168,152,.15)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {agentLeaderboard.map((agent, i) => {
                    const maxRev = agentLeaderboard[0].revenue;
                    const pct = maxRev > 0 ? (agent.revenue / maxRev) * 100 : 0;
                    return (
                      <tr key={agent.name} style={{ borderBottom: '1px solid rgba(43,168,152,.06)', background: i === 0 ? '#FFFDF0' : i === 1 ? '#F8FFFE' : '#fff' }}>
                        <td style={{ padding: '12px 14px', fontSize: 18 }}>{medals[i] || <span style={{ fontSize: 13, color: '#6A9B95', fontWeight: 700 }}>#{i + 1}</span>}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0B2E2B' }}>{agent.name}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ background: '#EEF6FF', color: '#2468C8', padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontSize: 12 }}>{agent.orders}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 800, color: '#1E9E5A', fontSize: 15 }}>{fmt(agent.revenue)}</td>
                        <td style={{ padding: '12px 14px', color: '#6A9B95' }}>{fmt(agent.orders > 0 ? agent.revenue / agent.orders : 0)}</td>
                        <td style={{ padding: '12px 14px', width: 200 }}>
                          <div style={{ background: '#f0f9ff', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: i === 0 ? '#E8A800' : i === 1 ? '#94a3b8' : i === 2 ? '#CD7F32' : '#2BA898', borderRadius: 4, width: pct + '%', transition: 'width .5s' }} />
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{pct.toFixed(0)}% of top</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* CUSTOMER SEGMENTS TAB */}
        {activeTab === 'customers' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { label: 'Active Customers', desc: 'Added in last 90 days', value: customerSegments.active, color: '#1E9E5A', bg: '#E8FFF4', icon: '✅' },
                { label: 'At-Risk Customers', desc: '91–180 days old', value: customerSegments.atRisk, color: '#D4920A', bg: '#FFF8E8', icon: '⚠️' },
                { label: 'Dormant Customers', desc: 'Over 180 days', value: customerSegments.dormant, color: '#ef4444', bg: '#FFF3F3', icon: '❌' },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 14, padding: '20px 24px' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value.toLocaleString('en-IN')}</div>
                  <div style={{ fontWeight: 700, color: s.color, marginTop: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 12, color: s.color + 'AA', marginTop: 2 }}>{s.desc}</div>
                </div>
              ))}
            </div>

            {/* Customer growth bar */}
            <div style={{ background: '#fff', borderRadius: 14, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.07)', border: '1px solid rgba(43,168,152,.1)' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#0B2E2B', marginBottom: 16 }}>📊 Customer Database Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#6A9B95', marginBottom: 8 }}>Total Customers in Database</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: '#0B2E2B' }}>{stats.customers.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 12, color: '#2BA898', marginTop: 4 }}>↑ Tally + CRM combined</div>
                </div>
                <div>
                  {topCustomers.length > 0 && (
                    <>
                      <div style={{ fontSize: 13, color: '#6A9B95', marginBottom: 8 }}>Recently Added</div>
                      {topCustomers.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(43,168,152,.06)' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#3DBFAE,#2BA898)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>
                            {c.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{c.city || 'India'} · {c.business_type || 'Customer'}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
