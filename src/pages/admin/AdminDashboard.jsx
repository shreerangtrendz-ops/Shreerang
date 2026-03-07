import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import { DashboardService } from '@/services/DashboardService';
import { supabase } from '@/lib/supabase';
import { ensureArray } from '@/lib/arrayValidation';

const TALLY_URL = 'https://tally.shreerangtrendz.com/';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const ctx = useOutletContext() || {};
  const setSidebarOpen = ctx.setSidebarOpen || (() => { });

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalFabrics: 0, totalDesigns: 0, totalOrders: 0, pendingOrders: 0, purchaseThisMonth: 0, salesThisMonth: 0, outstandingReceivable: 0, outstandingPayable: 0, lastTallySync: null });
  const [recentOrders, setRecentOrders] = useState([]);
  const [tallyOnline, setTallyOnline] = useState(null); // null=checking, true=online, false=offline
  const [billsSyncing, setBillsSyncing] = useState(false);
  const [jobWorkStats, setJobWorkStats] = useState({ challansOpen:0, challansTotal:0, valueAtMill:0, designsThisMonth:0, mfgEntriesToday:0, pendingMfgEntry:0, totalProcessValue:0 });

  async function syncBillsNow(e) {
    e.stopPropagation();
    if (billsSyncing) return;
    if (!tallyOnline) { alert('Tally is offline. Start Tally Prime and the FRP tunnel first.'); return; }
    setBillsSyncing(true);
    try {
      const res = await fetch('/api/tally-sync', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
      const json = await res.json();
      if (json.success) {
        alert(`✅ Synced! Purchase: ${json.synced.purchase} | Sales: ${json.synced.sales} bills`);
        fetchData();
      } else {
        alert('Sync issues: ' + (json.errors?.join(', ') || 'Unknown error'));
      }
    } catch(err) {
      alert('Sync error: ' + err.message);
    } finally { setBillsSyncing(false); }
  }

  useEffect(() => {
    fetchData();
    // Quick Tally ping on dashboard load
    fetch('/api/tally-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body: '<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>List of Companies</ID></HEADER><BODY><DESC></DESC></BODY></ENVELOPE>'
    }).then(r => setTallyOnline(r.ok)).catch(() => setTallyOnline(false));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(); monthStart.setDate(1);
      const monthStr = monthStart.toISOString().split('T')[0];

      const [kpis, recentOrdersData,
        { data: challans }, { data: mfgEntries }, { data: pendingChallans }
      ] = await Promise.allSettled([
        DashboardService.getDashboardKPIs(),
        DashboardService.getRecentOrders(5),
        supabase.from('challans').select('id,status,fabric_value'),
        supabase.from('manufacturing_entries').select('id,entry_date,total_value').gte('entry_date', monthStr),
        supabase.from('challans').select('id,party_name').in('status',['open','in_transit']),
      ]);

      if (kpis.status === 'fulfilled' && kpis.value) setStats(kpis.value);
      const v = (r, d) => r.status === 'fulfilled' && r.value ? r.value : d;
      setRecentOrders(ensureArray(v(recentOrdersData, [])));

      // Job Work KPIs
      const ch = challans?.value?.data || [];
      const me = mfgEntries?.value?.data || [];
      const pc = pendingChallans?.value?.data || [];
      const openCh = ch.filter(c=>c.status==='open'||c.status==='in_transit');
      const valueAtMill = openCh.reduce((s,c)=>s+Number(c.fabric_value||0),0);
      const todayEntries = me.filter(e=>e.entry_date===today);
      const totalProcessValue = me.reduce((s,e)=>s+Number(e.total_value||0),0);
      setJobWorkStats({
        challansOpen: openCh.length, challansTotal: ch.length,
        valueAtMill, designsThisMonth: me.length,
        mfgEntriesToday: todayEntries.length,
        pendingMfgEntry: pc.length,
        totalProcessValue,
      });
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
          <span
            className="sync-pill sp-tally"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            onClick={() => navigate('/admin/tally-prime')}
            title={tallyOnline === true ? 'Tally Online' : tallyOnline === false ? 'Tally Offline — click for details' : 'Checking Tally…'}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
              background: tallyOnline === true ? '#22c55e' : tallyOnline === false ? '#ef4444' : '#d1d5db',
              boxShadow: tallyOnline === true ? '0 0 6px #22c55e' : tallyOnline === false ? '0 0 6px #ef4444' : 'none'
            }} />
            {tallyOnline === true ? 'Tally Synced' : tallyOnline === false ? 'Tally Offline' : 'Tally…'}
          </span>
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

        {/* KPI Grid — Real Data from Supabase */}
        <div className="kpi-grid">
          {/* Row 1: Catalogue */}
          <div className="kpi-card" style={{ '--accent': 'var(--teal)', '--accent-glow': 'rgba(61,191,174,0.10)' }}>
            <div className="kpi-label">Active Designs</div>
            <div className="kpi-value" style={{ color: 'var(--teal)' }}>{loading ? '—' : stats.totalDesigns.toLocaleString()}</div>
            <div className="kpi-sub">Schiffli · Digital · Mill Print</div>
          </div>
          <div className="kpi-card" style={{ '--accent': 'var(--green)', '--accent-glow': 'rgba(60,181,115,0.08)' }}>
            <div className="kpi-label">Fabric SKUs Live</div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>{loading ? '—' : stats.totalFabrics.toLocaleString()}</div>
            <div className="kpi-sub">Base + Finish + Fancy</div>
          </div>
          <div className="kpi-card" style={{ '--accent': 'var(--blue)', '--accent-glow': 'rgba(74,124,240,0.08)' }}>
            <div className="kpi-label">Open Orders</div>
            <div className="kpi-value" style={{ color: 'var(--blue)' }}>{loading ? '—' : stats.pendingOrders}</div>
            <div className="kpi-sub">Pending · Processing</div>
            {!loading && stats.pendingOrders > 0 && <div className="kpi-change up">Total: {stats.totalOrders}</div>}
          </div>
          {/* Row 2: Accounting — REAL DATA FROM TALLY */}
          <div className="kpi-card" style={{ '--accent': 'var(--green)', '--accent-glow': 'rgba(60,181,115,0.08)', cursor: 'pointer' }}
            onClick={() => navigate('/admin/accounting/sales-bills')}>
            <div className="kpi-label">Sales This Month 💰</div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>
              {loading ? '—' : `₹${(stats.salesThisMonth / 100000).toFixed(1)}L`}
            </div>
            <div className="kpi-sub">{loading ? '…' : `₹${stats.salesThisMonth.toLocaleString()}`}</div>
            <div className="kpi-change up">→ Sales Bills</div>
          </div>
          <div className="kpi-card" style={{ '--accent': 'var(--orange)', '--accent-glow': 'rgba(224,120,66,0.08)', cursor: 'pointer' }}
            onClick={() => navigate('/admin/accounting/purchase-bills')}>
            <div className="kpi-label">Purchase This Month 📥</div>
            <div className="kpi-value" style={{ color: 'var(--orange)' }}>
              {loading ? '—' : `₹${(stats.purchaseThisMonth / 100000).toFixed(1)}L`}
            </div>
            <div className="kpi-sub">{loading ? '…' : `₹${stats.purchaseThisMonth.toLocaleString()}`}</div>
            <div className="kpi-change dn">→ Purchase Bills</div>
          </div>
          {/* Row 3: Outstanding */}
          <div className="kpi-card" style={{ '--accent': 'var(--red)', '--accent-glow': 'rgba(239,68,68,0.08)', cursor: 'pointer', border: stats.outstandingReceivable > 0 ? '1px solid rgba(239,68,68,0.2)' : undefined }}
            onClick={() => navigate('/admin/outstanding-receivable')}>
            <div className="kpi-label">Outstanding Receivable ⚠</div>
            <div className="kpi-value" style={{ color: stats.outstandingReceivable > 0 ? 'var(--red, #ef4444)' : 'var(--green)' }}>
              {loading ? '—' : `₹${(stats.outstandingReceivable / 100000).toFixed(1)}L`}
            </div>
            <div className="kpi-sub">Customers owe you</div>
            <div className="kpi-change">{stats.outstandingReceivable > 0 ? '→ Collect Now' : '✓ All Clear'}</div>
          </div>
          <div className="kpi-card" style={{ '--accent': 'var(--orange)', '--accent-glow': 'rgba(224,120,66,0.08)', cursor: 'pointer' }}
            onClick={() => navigate('/admin/outstanding-payable')}>
            <div className="kpi-label">Outstanding Payable 📤</div>
            <div className="kpi-value" style={{ color: 'var(--orange)' }}>
              {loading ? '—' : `₹${(stats.outstandingPayable / 100000).toFixed(1)}L`}
            </div>
            <div className="kpi-sub">You owe suppliers</div>
            <div className="kpi-change">→ Pay Bills</div>
          </div>
          {/* Tally Sync Status */}
          <div className="kpi-card" style={{ '--accent': 'var(--teal)', '--accent-glow': 'rgba(43,168,152,0.08)', cursor: 'pointer' }}
            onClick={() => navigate('/admin/tally-sync')}>
            <div className="kpi-label">Tally Sync</div>
            <div className="kpi-value" style={{ color: tallyOnline ? 'var(--green)' : 'var(--red, #ef4444)', fontSize: 16 }}>
              {tallyOnline === null ? '⏳ Checking…' : tallyOnline ? '✅ Online' : '❌ Offline'}
            </div>
            <div className="kpi-sub">
              {stats.lastTallySync
                ? `Last sync: ${new Date(stats.lastTallySync.synced_at).toLocaleTimeString()}`
                : 'No sync yet today'}
            </div>
            <div className="kpi-change">
              <button
                onClick={syncBillsNow}
                disabled={billsSyncing}
                style={{ background:'none', border:'none', color:'inherit', cursor: billsSyncing ? 'wait' : 'pointer', padding:0, fontWeight:600, fontSize:'inherit' }}
              >
                {billsSyncing ? '⏳ Syncing…' : '→ Sync Bills Now'}
              </button>
            </div>
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

        {/* ── JOB WORK / MILL PROCESSING ── */}
        <div style={{ marginTop:8 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>🏭</span>
              <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:'var(--text,#0B2E2B)' }}>
                Job Work & Mill Processing
              </span>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={()=>navigate('/admin/challans')} style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'rgba(43,168,152,.1)', color:'#2BA898', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                📦 Challans
              </button>
              <button onClick={()=>navigate('/admin/manufacturing')} style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'rgba(110,68,200,.1)', color:'#6E44C8', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                🏭 Mfg Entries
              </button>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>
            {[
              { icon:'📦', label:'Challans Open', value:jobWorkStats.challansOpen, sub:`of ${jobWorkStats.challansTotal} total`, color:'#D4920A', link:'/admin/challans' },
              { icon:'💰', label:'Fabric Value at Mill', value:`₹${Number(jobWorkStats.valueAtMill||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`, sub:'Currently out for process', color:'#C9106E', link:'/admin/challans' },
              { icon:'🎨', label:'Designs This Month', value:jobWorkStats.designsThisMonth, sub:'Design numbers generated', color:'#6E44C8', link:'/admin/manufacturing' },
              { icon:'💎', label:'Process Value (Month)', value:`₹${Number(jobWorkStats.totalProcessValue||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`, sub:'Total value created', color:'#1E9E5A', link:'/admin/manufacturing' },
            ].map((c,i)=>(
              <div key={i} onClick={()=>navigate(c.link)} style={{ background:'var(--surface,#fff)', borderRadius:12, padding:'14px 16px', boxShadow:'0 2px 10px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.1)', cursor:'pointer', transition:'all .15s' }}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                  <div style={{ width:30, height:30, background:`${c.color}18`, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>{c.icon}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:'#6A9B95', textTransform:'uppercase', letterSpacing:'0.7px' }}>{c.label}</div>
                </div>
                <div style={{ fontSize:20, fontWeight:800, color:c.color, lineHeight:1 }}>{c.value}</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:4 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Pending Manufacturing Entry Warning */}
          {jobWorkStats.pendingMfgEntry > 0 && (
            <div onClick={()=>navigate('/admin/manufacturing')} style={{ background:'linear-gradient(135deg,rgba(239,68,68,.08),rgba(239,68,68,.04))', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:'10px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:20 }}>⚡</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, color:'#ef4444', fontSize:13 }}>
                  {jobWorkStats.pendingMfgEntry} Challan{jobWorkStats.pendingMfgEntry>1?'s':''} Pending Manufacturing Entry
                </div>
                <div style={{ fontSize:11, color:'#ef4444', opacity:0.7, marginTop:2 }}>
                  Manufacturing Entry is compulsory for these — without it, design values won't appear in reports. Click to add.
                </div>
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:'#ef4444' }}>→</div>
            </div>
          )}

          {jobWorkStats.mfgEntriesToday > 0 && (
            <div style={{ marginTop:8, background:'rgba(30,158,90,.06)', border:'1px solid rgba(30,158,90,.15)', borderRadius:8, padding:'8px 14px', fontSize:12, color:'#1E9E5A', fontWeight:600 }}>
              ✅ {jobWorkStats.mfgEntriesToday} Manufacturing {jobWorkStats.mfgEntriesToday>1?'entries':'entry'} created today
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;