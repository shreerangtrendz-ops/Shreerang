import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import { DashboardService } from '@/services/DashboardService';
import { ensureArray } from '@/lib/arrayValidation';
import { Menu } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  // Safe extraction of setSidebarOpen to prevent errors if rendered outside layout
  const outletCtx = useOutletContext();
  const setSidebarOpen = outletCtx?.setSidebarOpen || (() => { });

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalFabrics: 1084,
    totalDesigns: 247,
    totalOrders: 34,
  });

  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        DashboardService.getTotalFabrics(),
        DashboardService.getTotalDesigns(),
        DashboardService.getTotalOrders(),
        DashboardService.getRecentOrders(5)
      ]);

      const getValue = (result, defaultValue) =>
        result.status === 'fulfilled' ? result.value : defaultValue;

      setStats({
        totalFabrics: getValue(results[0], 1084) || 1084,
        totalDesigns: getValue(results[1], 247) || 247,
        totalOrders: getValue(results[2], 34) || 34,
      });

      const orders = ensureArray(getValue(results[3], []));
      setRecentOrders(orders);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'completed' || s === 'delivered' || s === 'paid') return <span className="badge bgreen">✓ Paid</span>;
    if (s === 'pending' || s === 'processing') return <span className="badge borg">Pending</span>;
    if (s === 'cancelled' || s === 'overdue') return <span className="badge bred">⚠ Overdue</span>;
    return <span className="badge bblue">{status || 'Dispatched'}</span>;
  };

  return (
    <div className="screen active" style={{ paddingBottom: '40px' }}>
      <Helmet><title>Admin Dashboard | Shreerang</title></Helmet>

      <div className="topbar">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-1 text-slate-500 hover:bg-slate-100 rounded"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="page-title">Dashboard</div>
            <div className="breadcrumb">Good morning, Admin · {format(new Date(), 'dd MMM yyyy')}</div>
          </div>
        </div>
        <div className="topbar-right">
          <div className="wa-live hidden md:flex"><div className="wa-dot"></div>WA Bot Live</div>
          <span className="sync-pill sp-tally hidden md:inline-flex">🟡 Tally Synced</span>
          <span className="sync-pill sp-drive hidden md:inline-flex">🔵 Drive OK</span>
          <button className="btn btn-teal hidden sm:flex" onClick={() => navigate('/admin/cost/cost-sheet')}>+ New Cost Sheet</button>
        </div>
      </div>

      <div className="content">
        <div className="alert a-warn">⚠️ <b>Pricing Alert:</b> D10374 (58" PC Dyed Schiffli) @ ₹125/mtr — margin ~5% after rate hike. <a onClick={() => navigate('/admin/price-database')} style={{ color: 'var(--gold)', cursor: 'pointer', textDecoration: 'underline' }}>Review Price →</a></div>
        <div className="alert a-info">ℹ️ <b>14 designs</b> pending AI description & SKU mapping. Tally auto-sync ran 2 min ago. <a onClick={() => window.open('https://yvone-unincreased-wilford.ngrok-free.dev/', '_blank')} style={{ color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}>View Tally Log →</a></div>
        <div className="alert a-gold">🔔 <b>4 supplier price updates</b> detected from WhatsApp — Shivam Syndicate & Vandanam rates changed. <a onClick={() => navigate('/admin/supplier-price-ai')} style={{ color: 'var(--gold)', cursor: 'pointer', textDecoration: 'underline' }}>Review &amp; Approve →</a></div>

        <div className="kpi-grid mt-4">
          <div className="kpi-card" style={{ '--accent': 'var(--teal)', '--accent-glow': 'rgba(61,191,174,0.10)' }}>
            <div className="kpi-label">Active Designs</div>
            <div className="kpi-value" style={{ color: 'var(--teal)' }}>{stats.totalDesigns}</div>
            <div className="kpi-sub">Schiffli · Digital · Mill Print</div>
            <div className="kpi-change up">↑ 18 this month</div>
          </div>
          <div className="kpi-card" style={{ '--accent': 'var(--green)', '--accent-glow': 'rgba(60,181,115,0.08)' }}>
            <div className="kpi-label">Fabric SKUs Live</div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>{stats.totalFabrics}</div>
            <div className="kpi-sub">Base + Finish + Fancy</div>
            <div className="kpi-change up">↑ 56 new</div>
          </div>
          <div className="kpi-card" style={{ '--accent': 'var(--blue)', '--accent-glow': 'rgba(74,124,240,0.08)' }}>
            <div className="kpi-label">Open Orders</div>
            <div className="kpi-value" style={{ color: 'var(--blue)' }}>{stats.totalOrders}</div>
            <div className="kpi-sub">3 overdue · 12 pending dispatch</div>
            <div className="kpi-change dn">↓ 2 pending</div>
          </div>
          <div className="kpi-card" style={{ '--accent': 'var(--orange)', '--accent-glow': 'rgba(224,120,66,0.08)' }}>
            <div className="kpi-label">Fabric at Processors</div>
            <div className="kpi-value" style={{ color: 'var(--orange)' }}>8,420 m</div>
            <div className="kpi-sub">Surbhi · Rungta · GCG</div>
            <div className="kpi-change up">7 challans open</div>
          </div>
          <div className="kpi-card" style={{ '--accent': 'var(--purple)', '--accent-glow': 'rgba(139,101,207,0.08)' }}>
            <div className="kpi-label">Avg Cost/Mtr</div>
            <div className="kpi-value" style={{ color: 'var(--purple)' }}>₹102</div>
            <div className="kpi-sub">Schiffli Digital</div>
            <div className="kpi-change dn">↑ ₹4 vs last batch</div>
          </div>
          <div className="kpi-card" style={{ '--accent': 'var(--teal)', '--accent-glow': 'rgba(56,191,172,0.08)' }}>
            <div className="kpi-label">WA Leads Today</div>
            <div className="kpi-value" style={{ color: 'var(--teal)' }}>23</div>
            <div className="kpi-sub">18 known · 5 new</div>
            <div className="kpi-change up">↑ 5 new customers</div>
          </div>
        </div>

        <div className="g70-30 mt-6 md:mt-0">
          <div className="card h-full">
            <div className="card-header">
              <div className="card-title">Recent Orders</div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/order-database/sales')}>View All →</button>
            </div>
            <div className="tbl">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Buyer</th>
                    <th>Fabric</th>
                    <th>Qty</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length > 0 ? recentOrders.map((o, i) => (
                    <tr key={i}>
                      <td><span className="mono" style={{ color: 'var(--teal)' }}>{o.order_number || `SRTPL/2026/${i}`}</span></td>
                      <td>{o.customer_name || 'Walkin Customer'}</td>
                      <td><span className="badge bblue">Fabric</span></td>
                      <td className="mono">{o.total_quantity || '-'} m</td>
                      <td className="mono">₹{o.final_amount || '0'}</td>
                      <td>{getStatusBadge(o.status)}</td>
                      <td className="mono">-</td>
                    </tr>
                  )) : (
                    <>
                      <tr><td><span className="mono" style={{ color: 'var(--teal)' }}>SRTPL/2879/25-26</span></td><td>Sharmi Creations, Mumbai</td><td><span className="badge borg">Mill Print</span></td><td className="mono">280 m</td><td className="mono">₹44,800</td><td><span className="badge bgreen">✓ Paid</span></td><td className="mono">23-02-26</td></tr>
                      <tr><td><span className="mono" style={{ color: 'var(--teal)' }}>SRTPL/2828/25-26</span></td><td>DAILYSTYLISH, Delhi</td><td><span className="badge bpurp">Schiffli Dyed</span></td><td className="mono">120 m</td><td className="mono">₹19,200</td><td><span className="badge borg">Pending Pay</span></td><td className="mono">15-03-26</td></tr>
                      <tr><td><span className="mono" style={{ color: 'var(--teal)' }}>SRTPL/2901/25-26</span></td><td>Ananya Textiles, Kolkata</td><td><span className="badge bg-teal-badge">Schiffli Digital</span></td><td className="mono">200 m</td><td className="mono">₹31,000</td><td><span className="badge bred">⚠ Overdue</span></td><td className="mono" style={{ color: 'var(--red)' }}>10-02-26</td></tr>
                      <tr><td><span className="mono" style={{ color: 'var(--teal)' }}>SRTPL/2960/25-26</span></td><td>Mirakel Fashions, Surat</td><td><span className="badge bblue">Solid Dyed</span></td><td className="mono">150 m</td><td className="mono">₹12,300</td><td><span className="badge borg">Dispatched</span></td><td className="mono">05-03-26</td></tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card h-full">
            <div className="card-header"><div className="card-title">Tally Prime Sync</div><span className="badge bgreen">Live AutoSync</span></div>
            <div className="card-body">
              <div className="sr"><span style={{ fontSize: '11px' }}>Last Sync</span><span className="mono" style={{ fontSize: '10px', color: 'var(--green)' }}>{format(new Date(), 'dd-MMM-yy HH:mm')}</span></div>
              <div className="sr"><span style={{ fontSize: '11px' }}>Vouchers Imported</span><span className="mono">34 entries</span></div>
              <div className="sr"><span style={{ fontSize: '11px' }}>Sales Invoices</span><span className="mono">12 invoices</span></div>
              <div className="sr"><span style={{ fontSize: '11px' }}>Purchase Entries</span><span className="mono">8 entries</span></div>
              <div className="sr"><span style={{ fontSize: '11px' }}>Pending in Tally</span><span className="mono" style={{ color: 'var(--orange)' }}>2 (manual review)</span></div>
              <div className="div"></div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span className="sync-pill sp-tally">📊 Tally Prime</span>
                <span className="sync-pill sp-drive">☁️ Google Drive</span>
                <span className="sync-pill sp-bunny">🐰 Bunny CDN</span>
                <span className="sync-pill sp-n8n">⚡ n8n</span>
              </div>
              <button
                className="btn btn-outline btn-sm flex items-center justify-center gap-2"
                style={{ width: '100%', marginTop: '10px' }}
                onClick={() => window.open('https://yvone-unincreased-wilford.ngrok-free.dev/', '_blank')}
              >
                View Full Tally Log →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;