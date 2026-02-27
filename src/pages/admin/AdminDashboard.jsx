import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import { DashboardService } from '@/services/DashboardService';
import { ensureArray } from '@/lib/arrayValidation';

const TALLY_URL = 'https://yvone-unincreased-wilford.ngrok-free.dev/';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const ctx = useOutletContext() || {};
  const setSidebarOpen = ctx.setSidebarOpen || (() => { });

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalFabrics: 0, totalDesigns: 0, totalOrders: 0 });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        DashboardService.getTotalFabrics(),
        DashboardService.getTotalDesigns(),
        DashboardService.getTotalOrders(),
        DashboardService.getRecentOrders(5),
      ]);
      const v = (r, d) => r.status === 'fulfilled' && r.value ? r.value : d;
      setStats({
        totalFabrics: v(results[0], 1084),
        totalDesigns: v(results[1], 247),
        totalOrders: v(results[2], 34),
      });
      setRecentOrders(ensureArray(v(results[3], [])));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid' || s === 'completed' || s === 'delivered') return <span className="badge bgreen">✓ Paid</span>;
    if (s === 'overdue') return <span className="badge bred">⚠ Overdue</span>;
    if (s === 'pending' || s === 'processing') return <span className="badge borg">Pending Pay</span>;
    if (s === 'dispatched') return <span className="badge borg">Dispatched</span>;
    return <span className="badge bblue">{status || 'Unknown'}</span>;
  };

  const today = format(new Date(), 'dd MMM yyyy');

  return (
    <div className="screen active">
      <Helmet><title>Dashboard — Shreerang Admin</title></Helmet>

      {/* ── TOPBAR ── */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Mobile hamburger */}
          <button
            className="btn-icon"
            style={{ display: 'none' }}
            id="sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
          >☰</button>
          <style>{`@media(max-width:1023px){#sidebar-toggle{display:inline-flex!important}}`}</style>
          <div>
            <div className="page-title">Dashboard</div>
            <div className="breadcrumb">Good morning, Admin · {today}</div>
          </div>
        </div>
        <div className="topbar-right">
          <div className="wa-live">
            <div className="wa-dot"></div>WA Bot Live
          </div>
          <span className="sync-pill sp-tally">🟡 Tally Synced</span>
          <span className="sync-pill sp-drive">🔵 Drive OK</span>
          <button className="btn btn-teal" onClick={() => navigate('/admin/cost/cost-sheet')}>
            + New Cost Sheet
          </button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="content">

        {/* Alerts */}
        <div className="alert a-warn">
          ⚠️ <b>Pricing Alert:</b> D10374 (58" PC Dyed Schiffli) @ ₹125/mtr — margin ~5% after rate hike.{' '}
          <a onClick={() => navigate('/admin/price-database')} style={{ color: 'var(--gold)', cursor: 'pointer', textDecoration: 'underline' }}>Review Price →</a>
        </div>
        <div className="alert a-info">
          ℹ️ <b>14 designs</b> pending AI description &amp; SKU mapping. Tally auto-sync ran 2 min ago (34 vouchers imported).{' '}
          <a onClick={() => window.open(TALLY_URL, '_blank')} style={{ color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}>View Tally Log →</a>
        </div>
        <div className="alert a-gold">
          🔔 <b>4 supplier price updates</b> detected from WhatsApp — Shivam Syndicate &amp; Vandanam rates changed.{' '}
          <a onClick={() => navigate('/admin/supplier-price-ai')} style={{ color: 'var(--gold)', cursor: 'pointer', textDecoration: 'underline' }}>Review &amp; Approve →</a>
        </div>
        <div className="alert a-red">
          ⏰ <b>7 payment reminders</b> pending — Ananya Textiles overdue ₹31,000 (17 days).{' '}
          <a onClick={() => navigate('/admin/payment-reminders')} style={{ color: 'var(--red)', cursor: 'pointer', textDecoration: 'underline' }}>Send Reminders →</a>
        </div>

        {/* KPI Grid */}
        <div className="kpi-grid">
          <div className="kpi-card" style={{ '--accent': 'var(--teal)', '--accent-glow': 'rgba(61,191,174,0.10)' }}>
            <div className="kpi-label">Active Designs</div>
            <div className="kpi-value" style={{ color: 'var(--teal)' }}>{loading ? '—' : stats.totalDesigns}</div>
            <div className="kpi-sub">Schiffli · Digital · Mill Print</div>
            <div className="kpi-change up">↑ 18 this month</div>
          </div>
          <div className="kpi-card" style={{ '--accent': 'var(--green)', '--accent-glow': 'rgba(60,181,115,0.08)' }}>
            <div className="kpi-label">Fabric SKUs Live</div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>{loading ? '—' : stats.totalFabrics.toLocaleString()}</div>
            <div className="kpi-sub">Base + Finish + Fancy</div>
            <div className="kpi-change up">↑ 56 new</div>
          </div>
          <div className="kpi-card" style={{ '--accent': 'var(--blue)', '--accent-glow': 'rgba(74,124,240,0.08)' }}>
            <div className="kpi-label">Open Orders</div>
            <div className="kpi-value" style={{ color: 'var(--blue)' }}>{loading ? '—' : stats.totalOrders}</div>
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

        {/* Main two-column grid */}
        <div className="g70-30">
          {/* Recent Orders table */}
          <div className="card">
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
                  {recentOrders.length > 0 ? (
                    recentOrders.map((o, i) => (
                      <tr key={i}>
                        <td><span className="mono" style={{ color: 'var(--teal)' }}>{o.order_number || `SRTPL/2026/${i + 1}`}</span></td>
                        <td>{o.customer_name || 'Walk-in'}</td>
                        <td><span className="badge bblue">Fabric</span></td>
                        <td className="mono">{o.total_quantity || '—'} m</td>
                        <td className="mono">₹{Number(o.final_amount || 0).toLocaleString()}</td>
                        <td>{statusBadge(o.status)}</td>
                        <td className="mono">—</td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr>
                        <td><span className="mono" style={{ color: 'var(--teal)' }}>SRTPL/2879/25-26</span></td>
                        <td>Sharmi Creations, Mumbai</td>
                        <td><span className="badge borg">Mill Print</span></td>
                        <td className="mono">280 m</td>
                        <td className="mono">₹44,800</td>
                        <td><span className="badge bgreen">✓ Paid</span></td>
                        <td className="mono">23-02-26</td>
                      </tr>
                      <tr>
                        <td><span className="mono" style={{ color: 'var(--teal)' }}>SRTPL/2828/25-26</span></td>
                        <td>DAILYSTYLISH, Delhi</td>
                        <td><span className="badge bpurp">Schiffli Dyed</span></td>
                        <td className="mono">120 m</td>
                        <td className="mono">₹19,200</td>
                        <td><span className="badge borg">Pending Pay</span></td>
                        <td className="mono">15-03-26</td>
                      </tr>
                      <tr>
                        <td><span className="mono" style={{ color: 'var(--teal)' }}>SRTPL/2901/25-26</span></td>
                        <td>Ananya Textiles, Kolkata</td>
                        <td><span className="badge bg">Schiffli Digital</span></td>
                        <td className="mono">200 m</td>
                        <td className="mono">₹31,000</td>
                        <td><span className="badge bred">⚠ Overdue</span></td>
                        <td className="mono" style={{ color: 'var(--red)' }}>10-02-26</td>
                      </tr>
                      <tr>
                        <td><span className="mono" style={{ color: 'var(--teal)' }}>SRTPL/2960/25-26</span></td>
                        <td>Mirakel Fashions, Surat</td>
                        <td><span className="badge bblue">Solid Dyed</span></td>
                        <td className="mono">150 m</td>
                        <td className="mono">₹12,300</td>
                        <td><span className="badge borg">Dispatched</span></td>
                        <td className="mono">05-03-26</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tally Prime Sync card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Tally Prime Sync</div>
              <span className="badge bgreen">Live AutoSync</span>
            </div>
            <div className="card-body">
              <div className="sr"><span style={{ fontSize: 11 }}>Last Sync</span><span className="mono" style={{ fontSize: 10, color: 'var(--green)' }}>{format(new Date(), 'dd-MMM-yy HH:mm')}</span></div>
              <div className="sr"><span style={{ fontSize: 11 }}>Vouchers Imported</span><span className="mono">34 entries</span></div>
              <div className="sr"><span style={{ fontSize: 11 }}>Sales Invoices</span><span className="mono">12 invoices</span></div>
              <div className="sr"><span style={{ fontSize: 11 }}>Purchase Entries</span><span className="mono">8 entries</span></div>
              <div className="sr"><span style={{ fontSize: 11 }}>Pending in Tally</span><span className="mono" style={{ color: 'var(--orange)' }}>2 (manual review)</span></div>
              <div className="div"></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="sync-pill sp-tally">📊 Tally Prime</span>
                <span className="sync-pill sp-drive">☁️ Google Drive</span>
                <span className="sync-pill sp-bunny">🐰 Bunny CDN</span>
                <span className="sync-pill sp-n8n">⚡ n8n</span>
              </div>
              <button
                className="btn btn-outline btn-sm"
                style={{ width: '100%', marginTop: 10 }}
                onClick={() => window.open(TALLY_URL, '_blank')}
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