import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// ─── DESIGN TOKENS ──────────────────────────────────────────────────
const T = {
  teal: '#2BA898', tealDark: '#071E1C', tealLight: '#EEF8F6',
  gold: '#E8A800', navy: '#0B2E2B', green: '#1E9E5A', blue: '#2468C8',
  border: '#D0EDE8', bg: '#F0F9F7', surface: '#FFFFFF',
  text: '#0B2E2B', textMuted: '#6A9B95', textDim: '#94a3b8',
};

// ─── QUICK ACTIONS (All roles visible, filtered by role) ─────────────
const ALL_QUICK_ACTIONS = [
  { icon: '📋', label: 'Sales Orders', sub: 'Create & manage orders', to: '/admin/orders', color: T.green, roles: ['admin','manager','sales_executive','sales'] },
  { icon: '📄', label: 'Quotations', sub: 'Create quotes for customers', to: '/admin/accounting/quotations', color: T.blue, roles: ['admin','manager','sales_executive','sales'] },
  { icon: '👥', label: 'Customers', sub: 'Full customer database', to: '/admin/customers', color: T.teal, roles: ['admin','manager','sales_executive','sales'] },
  { icon: '🏭', label: 'Production Floor', sub: 'Challans & dispatch status', to: '/admin/production-floor', color: '#2468C8', roles: ['admin','manager','operations','production_staff'] },
  { icon: '🏆', label: 'Agent Commission', sub: 'Monthly payout tracker', to: '/admin/agent-commission', color: '#9B59B6', roles: ['admin','manager'] },
  { icon: '🧾', label: 'Job Work Challans', sub: 'Track fabric job work', to: '/admin/challans', color: T.gold, roles: ['admin','manager','operations','production_staff'] },
  { icon: '⚙️', label: 'MTO Pipeline', sub: 'Make-to-order Kanban', to: '/admin/mto-orders', color: '#E67E22', roles: ['admin','manager','operations'] },
  { icon: '📊', label: 'Analytics', sub: 'Revenue & performance', to: '/admin/analytics', color: T.navy, roles: ['admin','manager'] },
  { icon: '💬', label: 'WhatsApp Inbox', sub: 'Business messaging', to: '/admin/whatsapp-inbox', color: '#25D366', roles: ['admin','manager','sales_executive','sales'] },
  { icon: '📣', label: 'Broadcast', sub: 'Mass WhatsApp messages', to: '/admin/whatsapp-broadcast', color: '#128C7E', roles: ['admin','manager'] },
  { icon: '💰', label: 'Outstanding', sub: 'Receivables & aging', to: '/admin/outstanding-receivable', color: '#E74C3C', roles: ['admin','manager','payment_recovery'] },
  { icon: '🔔', label: 'Payment Reminders', sub: 'Send reminder alerts', to: '/admin/payment-reminders', color: '#E74C3C', roles: ['admin','manager','payment_recovery'] },
  { icon: '🗂️', label: 'Catalogue', sub: 'Design & fabric catalog', to: '/admin/design-velocity', color: '#9B59B6', roles: ['admin','manager','operations'] },
  { icon: '📦', label: 'Stock', sub: 'Live fabric inventory', to: '/admin/stock', color: '#8E44AD', roles: ['admin','manager','operations'] },
  { icon: '🔄', label: 'Tally Sync', sub: 'Sync with Tally Prime', to: '/admin/tally-sync', color: '#1ABC9C', roles: ['admin','manager'] },
  { icon: '🔐', label: 'Access Control', sub: 'Roles & permissions', to: '/admin/access-control', color: '#E74C3C', roles: ['admin'] },
];

// ─── STAT CARD ──────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = T.teal, onClick }) {
  return (
    <div onClick={onClick} style={{ background: T.surface, borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: `1px solid ${T.border}`, cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow .2s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 4px 20px rgba(43,168,152,.2)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.06)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, background: color + '20', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── ROLE BANNER ────────────────────────────────────────────────────
const ROLE_META = {
  admin: { icon: '🔐', label: 'Admin', color: '#E74C3C', desc: 'Full system access' },
  manager: { icon: '📊', label: 'Manager', color: '#2468C8', desc: 'All operations & analytics' },
  sales_executive: { icon: '💼', label: 'Sales Executive', color: '#1E9E5A', desc: 'My orders, quotations & customers' },
  sales: { icon: '💼', label: 'Sales', color: '#1E9E5A', desc: 'Orders & customer management' },
  production_staff: { icon: '🏭', label: 'Production Staff', color: '#E8A800', desc: 'Production floor & challans' },
  operations: { icon: '⚙️', label: 'Operations', color: '#9B59B6', desc: 'Production, MTO & stock' },
  payment_recovery: { icon: '💰', label: 'Payment Recovery', color: '#E74C3C', desc: 'Outstanding & reminders' },
  viewer: { icon: '👁️', label: 'Viewer', color: '#94a3b8', desc: 'Read-only dashboard access' },
};

// ─── MAIN DASHBOARD ─────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState({ orders: 0, customers: 0, agents: 0, stock: 0, pendingOrders: 0, pendingChallans: 0, pendingQuotes: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [myQuotations, setMyQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('viewer');
  const [userName, setUserName] = useState('');

  // Derive role from user metadata or profile
  useEffect(() => {
    if (user) {
      const meta = user.user_metadata || {};
      const role = meta.role || meta.user_role || 'viewer';
      setUserRole(role.toLowerCase().replace(' ', '_'));
      setUserName(meta.full_name || meta.name || user.email?.split('@')[0] || 'User');
    }
  }, [user]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const isSales = ['sales_executive', 'sales'].includes(userRole);
      const isProduction = ['production_staff', 'operations'].includes(userRole);

      // Always load core stats
      const [
        { count: orders },
        { count: customers },
        { count: agents },
        { count: stock },
        { count: pendingOrders },
        { count: pendingChallans },
        { count: pendingQuotes },
        { data: activity },
      ] = await Promise.all([
        supabase.from('sales_orders').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('sales_team').select('*', { count: 'exact', head: true }),
        supabase.from('fabric_stock_live').select('*', { count: 'exact', head: true }),
        supabase.from('sales_orders').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
        supabase.from('job_work_challans').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('activity_logs').select('id,action,entity_type,created_at,user_name').order('created_at', { ascending: false }).limit(8),
      ]);

      setStats({ orders: orders || 0, customers: customers || 0, agents: agents || 0, stock: stock || 0, pendingOrders: pendingOrders || 0, pendingChallans: pendingChallans || 0, pendingQuotes: pendingQuotes || 0 });
      setRecentActivity(activity || []);

      // Role-specific: load my orders/quotations for sales roles
      if (isSales && userName) {
        const [{ data: myOrd }, { data: myQuote }] = await Promise.all([
          supabase.from('sales_orders').select('id,order_no,party_name,party_details,total_amount,status,created_at').order('created_at', { ascending: false }).limit(5),
          supabase.from('quotations').select('id,quotation_no,party_name,total_amount,status,created_at').order('created_at', { ascending: false }).limit(5),
        ]);
        setMyOrders(myOrd || []);
        setMyQuotations(myQuote || []);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
    setLoading(false);
  }, [userRole, userName]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const roleMeta = ROLE_META[userRole] || ROLE_META.viewer;
  const isAdmin = userRole === 'admin';
  const isManager = ['admin', 'manager'].includes(userRole);
  const isSalesRole = ['admin', 'manager', 'sales_executive', 'sales'].includes(userRole);
  const isProductionRole = ['admin', 'manager', 'production_staff', 'operations'].includes(userRole);
  const isPaymentRole = ['admin', 'manager', 'payment_recovery'].includes(userRole);

  // Filter quick actions by role
  const visibleActions = ALL_QUICK_ACTIONS.filter(a => a.roles.includes(userRole) || isAdmin);

  const fmt = n => (n || 0).toLocaleString('en-IN');
  const fmtCurr = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const statusBadge = (status) => {
    const colors = { draft: ['#f1f5f9', '#64748b'], pending: ['#FFF8E8', '#D4920A'], confirmed: ['#E8FFF4', '#1E9E5A'], approved: ['#E8FFF4', '#1E9E5A'], dispatched: ['#EEF6FF', '#2468C8'], delivered: ['#E8FFF4', '#1E9E5A'], cancelled: ['#FFF3F3', '#ef4444'], rejected: ['#FFF3F3', '#ef4444'] };
    const [bg, tc] = colors[status] || ['#f1f5f9', '#64748b'];
    return <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: bg, color: tc }}>{status}</span>;
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: T.bg, minHeight: '100vh' }}>
      {/* ── HEADER ── */}
      <div style={{ background: `linear-gradient(135deg,${T.tealDark},#143F3C)`, padding: '18px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#3DBFAE,#E8A800)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              {roleMeta.icon}
            </div>
            {isAdmin ? 'Admin Dashboard' : isManager ? 'Manager Dashboard' : isSalesRole ? 'Sales Dashboard' : isProductionRole ? 'Production Dashboard' : 'Dashboard'}
          </div>
          <div style={{ fontSize: 12, color: '#6A9B95', marginTop: 3 }}>Shreerang Trendz Pvt Ltd · {userName}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ background: roleMeta.color + '25', border: `1px solid ${roleMeta.color}50`, color: roleMeta.color, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
            {roleMeta.icon} {roleMeta.label}
          </span>
          <button onClick={loadDashboard} style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── ROLE-BASED TOP SECTION ── */}
        {isManager && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <StatCard icon="📋" label="Total Orders" value={fmt(stats.orders)} sub="All sales orders" color={T.green} onClick={() => navigate('/admin/orders')} />
            <StatCard icon="👥" label="Customers" value={fmt(stats.customers)} sub="In database" color={T.teal} onClick={() => navigate('/admin/customers')} />
            <StatCard icon="🤝" label="Sales Agents" value={fmt(stats.agents)} sub="Active team" color={T.gold} onClick={() => navigate('/admin/agent-commission')} />
            <StatCard icon="📦" label="Stock Items" value={fmt(stats.stock)} sub="Fabric inventory" color={T.blue} onClick={() => navigate('/admin/stock')} />
          </div>
        )}

        {isManager && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <StatCard icon="⏳" label="Pending Orders" value={stats.pendingOrders} sub="Awaiting dispatch" color="#E67E22" onClick={() => navigate('/admin/orders')} />
            <StatCard icon="🧾" label="Pending Challans" value={stats.pendingChallans} sub="Job work in progress" color="#9B59B6" onClick={() => navigate('/admin/challans')} />
            <StatCard icon="📄" label="Pending Quotes" value={stats.pendingQuotes} sub="Awaiting approval" color="#2468C8" onClick={() => navigate('/admin/accounting/quotations')} />
          </div>
        )}

        {/* Sales role: My Orders + My Quotations */}
        {isSalesRole && !isManager && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {/* My Recent Orders */}
            <div style={{ background: T.surface, borderRadius: 14, padding: '18px 20px', border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: T.navy }}>📋 Recent Orders</div>
                <button onClick={() => navigate('/admin/orders')} style={{ background: T.tealLight, border: `1px solid ${T.border}`, color: T.teal, borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>View All →</button>
              </div>
              {myOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: T.textDim, fontSize: 13 }}>No orders yet. Create your first order!</div>
              ) : myOrders.map(o => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}80` }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: T.blue }}>{o.order_no || '—'}</div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>{o.party_name || o.party_details?.name || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: T.green }}>{fmtCurr(o.total_amount)}</div>
                    {statusBadge(o.status)}
                  </div>
                </div>
              ))}
              <button onClick={() => navigate('/admin/orders/new')} style={{ width: '100%', marginTop: 12, background: T.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>+ New Order</button>
            </div>

            {/* My Recent Quotations */}
            <div style={{ background: T.surface, borderRadius: 14, padding: '18px 20px', border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: T.navy }}>📄 Recent Quotations</div>
                <button onClick={() => navigate('/admin/accounting/quotations')} style={{ background: T.tealLight, border: `1px solid ${T.border}`, color: T.teal, borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>View All →</button>
              </div>
              {myQuotations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: T.textDim, fontSize: 13 }}>No quotations yet.</div>
              ) : myQuotations.map(q => (
                <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}80` }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12, color: T.blue }}>{q.quotation_no || '—'}</div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>{q.party_name || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: T.green }}>{fmtCurr(q.total_amount)}</div>
                    {statusBadge(q.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Production role: redirect to Production Floor */}
        {isProductionRole && !isManager && (
          <div style={{ background: 'linear-gradient(135deg,#EEF6FF,#E8FFF4)', border: '1px solid rgba(36,104,200,.2)', borderRadius: 14, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: T.navy }}>🏭 Production Floor</div>
              <div style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>View challans, dispatch queue, and QC status</div>
            </div>
            <button onClick={() => navigate('/admin/production-floor')} style={{ background: '#2468C8', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Open Production Floor →</button>
          </div>
        )}

        {/* Payment Recovery role */}
        {isPaymentRole && !isManager && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'linear-gradient(135deg,#FFF3F3,#FFF8E8)', border: '1px solid rgba(231,76,60,.2)', borderRadius: 14, padding: '20px 24px', cursor: 'pointer' }} onClick={() => navigate('/admin/outstanding-receivable')}>
              <div style={{ fontSize: 24 }}>💰</div>
              <div style={{ fontWeight: 700, color: '#E74C3C', fontSize: 16, marginTop: 8 }}>Outstanding Receivables</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>View aging buckets and party balances</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg,#FFF8E8,#FFFAEE)', border: '1px solid rgba(212,146,10,.2)', borderRadius: 14, padding: '20px 24px', cursor: 'pointer' }} onClick={() => navigate('/admin/payment-reminders')}>
              <div style={{ fontSize: 24 }}>🔔</div>
              <div style={{ fontWeight: 700, color: '#D4920A', fontSize: 16, marginTop: 8 }}>Payment Reminders</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>Send WhatsApp reminders to parties</div>
            </div>
          </div>
        )}

        {/* ── QUICK ACTIONS GRID ── */}
        <div style={{ background: T.surface, borderRadius: 14, padding: '20px', border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: T.navy, marginBottom: 16 }}>⚡ Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {visibleActions.map(action => (
              <button key={action.to} onClick={() => navigate(action.to)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all .15s', fontFamily: "'DM Sans', sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.background = action.color + '12'; e.currentTarget.style.borderColor = action.color + '60'; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.bg; e.currentTarget.style.borderColor = T.border; }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>{action.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 12, color: T.text }}>{action.label}</div>
                <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{action.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── MANAGER/ADMIN: Activity Feed ── */}
        {isManager && (
          <div style={{ background: T.surface, borderRadius: 14, padding: '18px 20px', border: `1px solid ${T.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: T.navy, marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
              🕐 Recent Activity
              <button onClick={() => navigate('/admin/activity-logs')} style={{ background: T.tealLight, border: `1px solid ${T.border}`, color: T.teal, borderRadius: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>View All →</button>
            </div>
            {loading ? (
              <div style={{ color: T.textDim, fontSize: 13 }}>Loading...</div>
            ) : recentActivity.length === 0 ? (
              <div style={{ color: T.textDim, fontSize: 13, textAlign: 'center', padding: 20 }}>No recent activity</div>
            ) : (
              recentActivity.map(act => (
                <div key={act.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: `1px solid ${T.border}60` }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.teal, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{act.action || 'Activity'}</div>
                    <div style={{ fontSize: 10, color: T.textDim }}>
                      {act.entity_type} · {act.user_name || 'System'} · {act.created_at ? new Date(act.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── ROLE INFO FOOTER ── */}
        <div style={{ background: roleMeta.color + '10', border: `1px solid ${roleMeta.color}30`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>{roleMeta.icon}</span>
          <div>
            <div style={{ fontWeight: 700, color: roleMeta.color, fontSize: 13 }}>{roleMeta.label} Role · {userName}</div>
            <div style={{ fontSize: 11, color: T.textMuted }}>{roleMeta.desc} · {visibleActions.length} features available</div>
          </div>
        </div>

      </div>
    </div>
  );
}
