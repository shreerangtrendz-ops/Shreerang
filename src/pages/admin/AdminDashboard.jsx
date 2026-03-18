import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  teal: '#2BA898', tealDark: '#071E1C', tealLight: '#EEF8F6',
  gold: '#E8A800', navy: '#0B2E2B', green: '#1E9E5A', blue: '#2468C8',
  red: '#E74C3C', purple: '#9B59B6', orange: '#E67E22',
  border: '#D0EDE8', bg: '#F0F9F7', surface: '#FFFFFF',
  text: '#0B2E2B', textMuted: '#6A9B95', textDim: '#94a3b8',
};

// ─── ROLE META ────────────────────────────────────────────────────────────────
const ROLE_META = {
  admin:            { icon: '🔐', label: 'Admin',            color: '#E74C3C', desc: 'Full system access' },
  manager:          { icon: '📊', label: 'Manager',          color: '#2468C8', desc: 'All operations & analytics' },
  sales_executive:  { icon: '💼', label: 'Sales Executive',  color: '#1E9E5A', desc: 'Orders, quotes & customers' },
  sales:            { icon: '💼', label: 'Sales',            color: '#1E9E5A', desc: 'Orders & customers' },
  production_staff: { icon: '🏭', label: 'Production',       color: '#E8A800', desc: 'Production floor & challans' },
  operations:       { icon: '⚙️', label: 'Operations',       color: '#9B59B6', desc: 'Production, MTO & stock' },
  accounts:         { icon: '💰', label: 'Accounts',         color: '#1ABC9C', desc: 'Billing, ledgers & reports' },
  payment_recovery: { icon: '💰', label: 'Recovery',         color: '#E74C3C', desc: 'Outstanding & reminders' },
  viewer:           { icon: '👁️', label: 'Viewer',           color: '#94a3b8', desc: 'Read-only access' },
};

// ─── QUICK ACTIONS ────────────────────────────────────────────────────────────
const ALL_QUICK_ACTIONS = [
  { icon: '📋', label: 'Sales Orders',      sub: 'Create & manage',    to: '/admin/orders',                        color: T.green,  roles: ['admin','manager','sales_executive','sales'] },
  { icon: '📄', label: 'Quotations',        sub: 'Create quotes',      to: '/admin/accounting/quotations',         color: T.blue,   roles: ['admin','manager','sales_executive','sales'] },
  { icon: '👥', label: 'Customers',         sub: 'Customer database',  to: '/admin/customers',                     color: T.teal,   roles: ['admin','manager','sales_executive','sales','accounts'] },
  { icon: '🏭', label: 'Production Floor',  sub: 'Challans & dispatch',to: '/admin/production-floor',              color: '#2468C8',roles: ['admin','manager','operations','production_staff'] },
  { icon: '🏆', label: 'Agent Commission',  sub: 'Monthly payouts',    to: '/admin/agent-commission',              color: '#9B59B6',roles: ['admin','manager'] },
  { icon: '🧾', label: 'Job Work Challans', sub: 'Track fabric jobs',  to: '/admin/challans',                      color: T.gold,   roles: ['admin','manager','operations','production_staff'] },
  { icon: '⚙️', label: 'MTO Pipeline',      sub: 'Make-to-order',      to: '/admin/mto-orders',                    color: '#E67E22',roles: ['admin','manager','operations'] },
  { icon: '📊', label: 'Analytics',         sub: 'Revenue & metrics',  to: '/admin/analytics',                     color: T.navy,   roles: ['admin','manager'] },
  { icon: '💬', label: 'WhatsApp Inbox',    sub: 'Business messaging', to: '/admin/whatsapp-inbox',                color: '#25D366',roles: ['admin','manager','sales_executive','sales'] },
  { icon: '📣', label: 'Broadcast',         sub: 'Mass messaging',     to: '/admin/whatsapp-broadcast',            color: '#128C7E',roles: ['admin','manager'] },
  { icon: '💰', label: 'Outstanding',       sub: 'Receivables & aging',to: '/admin/outstanding-receivable',        color: '#E74C3C',roles: ['admin','manager','accounts','payment_recovery'] },
  { icon: '🔔', label: 'Reminders',         sub: 'Payment alerts',     to: '/admin/payment-reminders',             color: '#E74C3C',roles: ['admin','manager','accounts','payment_recovery'] },
  { icon: '🗂️', label: 'Catalogue',         sub: 'Design & fabric',    to: '/admin/design-velocity',               color: '#9B59B6',roles: ['admin','manager'] },
  { icon: '📦', label: 'Stock',             sub: 'Live inventory',     to: '/admin/stock',                         color: '#8E44AD',roles: ['admin','manager','operations'] },
  { icon: '📥', label: 'Purchase Bills',    sub: 'Tally purchases',    to: '/admin/accounting/purchase-bills',     color: T.blue,   roles: ['admin','manager','accounts'] },
  { icon: '📤', label: 'Sales Bills',       sub: 'Tally sales',        to: '/admin/accounting/sales-bills',        color: T.green,  roles: ['admin','manager','accounts'] },
  { icon: '📒', label: 'Party Ledger',      sub: 'Account statements', to: '/admin/reports/party-ledger',          color: '#1ABC9C',roles: ['admin','manager','accounts'] },
  { icon: '🔄', label: 'Tally Sync',        sub: 'Sync with Tally',    to: '/admin/tally-sync',                    color: '#1ABC9C',roles: ['admin','manager'] },
  { icon: '🔐', label: 'Access Control',    sub: 'Roles & permissions',to: '/admin/access-control',                color: '#E74C3C',roles: ['admin'] },
];

// ─── MINI SPARKLINE (SVG) ─────────────────────────────────────────────────────
function Sparkline({ values = [], color = T.teal, height = 36, width = 120 }) {
  if (!values.length || values.every(v => v === 0)) return <div style={{ height, width, opacity: 0.3 }}>—</div>;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={`0,${height} ${pts} ${width},${height}`} fill={color + '22'} stroke="none" />
    </svg>
  );
}

// ─── MINI BAR CHART ───────────────────────────────────────────────────────────
function MiniBar({ data = [], color = T.teal, height = 60 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <div style={{ width: '100%', background: i === data.length - 1 ? color : color + '60', borderRadius: '2px 2px 0 0', height: Math.max((d.value / max) * (height - 14), 2) }} title={`${d.label}: ₹${(d.value||0).toLocaleString('en-IN')}`} />
          <div style={{ fontSize: 8, color: T.textDim, whiteSpace: 'nowrap' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = T.teal, onClick, trend, trendDir, sparkValues }) {
  return (
    <div onClick={onClick} style={{ background: T.surface, borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 12px rgba(0,0,0,.06)', border: `1px solid ${T.border}`, cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow .2s, transform .1s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 6px 24px rgba(43,168,152,.18)', e.currentTarget.style.transform = 'translateY(-1px)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,.06)', e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 34, height: 34, background: color + '20', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
        <div style={{ flex: 1, fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</div>
        {trend && <div style={{ fontSize: 11, fontWeight: 700, color: trendDir === 'up' ? T.green : T.red }}>{trendDir === 'up' ? '↑' : '↓'} {trend}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value ?? '—'}</div>
          {sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{sub}</div>}
        </div>
        {sparkValues && sparkValues.length > 0 && <Sparkline values={sparkValues} color={color} />}
      </div>
    </div>
  );
}

// ─── AGING BUCKET BAR ────────────────────────────────────────────────────────
function AgingBar({ label, amount, total, color }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: T.textMuted }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>₹{Number(amount||0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
      </div>
      <div style={{ background: T.bg, borderRadius: 4, height: 6 }}>
        <div style={{ height: '100%', background: color, borderRadius: 4, width: pct + '%', transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [userRole, setUserRole] = useState('viewer');
  const [userName, setUserName] = useState('');
  const [loading,  setLoading]  = useState(true);

  // KPI data
  const [kpi, setKpi] = useState({
    salesThisMonth: 0, purchaseThisMonth: 0,
    outstandingTotal: 0, outstandingCount: 0,
    totalCustomers: 0, totalAgents: 0, totalStock: 0,
    pendingOrders: 0, pendingChallans: 0, pendingQuotes: 0,
    totalSalesBills: 0, totalPurchaseBills: 0,
  });
  const [monthlyRevenue,   setMonthlyRevenue]   = useState([]);
  const [agingBuckets,     setAgingBuckets]     = useState({ current: 0, days30: 0, days60: 0, days90plus: 0 });
  const [topAgents,        setTopAgents]        = useState([]);
  const [recentActivity,   setRecentActivity]   = useState([]);
  const [myOrders,         setMyOrders]         = useState([]);
  const [syncStatus,       setSyncStatus]       = useState({ last: null, status: 'unknown' });
  const [whatsappCount,    setWhatsappCount]    = useState(0);

  // Derive role
  useEffect(() => {
    if (user) {
      const meta = user.user_metadata || {};
      const r = (meta.role || meta.user_role || 'viewer').toLowerCase().replace(/ /g, '_');
      setUserRole(r);
      setUserName(meta.full_name || meta.name || user.email?.split('@')[0] || 'User');
    }
  }, [user]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const now   = new Date();
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const today  = now.toISOString().slice(0, 10);

      // Build last 6-month labels
      const months6 = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months6.push({
          label: d.toLocaleString('en-IN', { month: 'short' }),
          key:   `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
          value: 0
        });
      }

      const [
        { count: customers },
        { count: agents },
        { count: stock },
        { count: pendingOrders },
        { count: pendingChallans },
        { count: pendingQuotes },
        { count: totalSalesBills },
        { count: totalPurchaseBills },
        { data: salesBillsMonth },
        { data: purchaseBillsMonth },
        { data: outstanding },
        { data: salesBills6M },
        { data: agentData },
        { data: activity },
        { data: syncLog },
        { data: waInbox },
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('sales_team').select('*', { count: 'exact', head: true }),
        supabase.from('fabric_stock_live').select('*', { count: 'exact', head: true }),
        supabase.from('sales_orders').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
        supabase.from('job_work_challans').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('sales_bills').select('*', { count: 'exact', head: true }),
        supabase.from('purchase_bills').select('*', { count: 'exact', head: true }),
        supabase.from('sales_bills').select('total_amount').gte('bill_date', mStart).lte('bill_date', today),
        supabase.from('purchase_bills').select('total_amount').gte('bill_date', mStart).lte('bill_date', today),
        supabase.from('outstanding_receivable').select('closing_balance,bill_date'),
        supabase.from('sales_bills').select('total_amount,bill_date').gte('bill_date', months6[0].key + '-01').order('bill_date', { ascending: true }),
        supabase.from('sales_bills').select('party_name,total_amount').not('party_name','is',null).limit(1000),
        supabase.from('activity_logs').select('id,action,entity_type,created_at,user_name').order('created_at', { ascending: false }).limit(10),
        supabase.from('tally_sync_log').select('status,synced_at').order('synced_at', { ascending: false }).limit(1),
        supabase.from('whatsapp_messages').select('id', { count: 'exact', head: true }).eq('direction', 'inbound').eq('is_read', false),
      ]);

      // Monthly sales revenue (last 6 months)
      const rev = [...months6];
      (salesBills6M || []).forEach(b => {
        const key = (b.bill_date || '').slice(0, 7);
        const m   = rev.find(m => m.key === key);
        if (m) m.value += Number(b.total_amount || 0);
      });
      setMonthlyRevenue(rev);

      // KPIs
      const salesMth  = (salesBillsMonth    || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const purchMth  = (purchaseBillsMonth  || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const outTotal  = (outstanding         || []).reduce((s, r) => s + Number(r.closing_balance || 0), 0);
      const outCount  = (outstanding         || []).filter(r => Number(r.closing_balance || 0) > 0).length;

      setKpi({
        salesThisMonth: salesMth, purchaseThisMonth: purchMth,
        outstandingTotal: outTotal, outstandingCount: outCount,
        totalCustomers: customers || 0, totalAgents: agents || 0, totalStock: stock || 0,
        pendingOrders: pendingOrders || 0, pendingChallans: pendingChallans || 0, pendingQuotes: pendingQuotes || 0,
        totalSalesBills: totalSalesBills || 0, totalPurchaseBills: totalPurchaseBills || 0,
      });

      // Aging buckets
      const today_d  = new Date(today);
      const b30 = new Date(today); b30.setDate(b30.getDate() - 30);
      const b60 = new Date(today); b60.setDate(b60.getDate() - 60);
      const b90 = new Date(today); b90.setDate(b90.getDate() - 90);
      let aCurr = 0, a30 = 0, a60 = 0, a90p = 0;
      (outstanding || []).forEach(o => {
        const amt = Number(o.closing_balance || 0);
        if (amt <= 0) return;
        const d = o.bill_date ? new Date(o.bill_date) : null;
        if (!d || d >= b30)      aCurr += amt;
        else if (d >= b60)       a30   += amt;
        else if (d >= b90)       a60   += amt;
        else                     a90p  += amt;
      });
      setAgingBuckets({ current: aCurr, days30: a30, days60: a60, days90plus: a90p });

      // Top agents by bill revenue
      const agentMap = {};
      (agentData || []).forEach(b => {
        const nm = b.party_name || 'Unknown';
        if (!agentMap[nm]) agentMap[nm] = 0;
        agentMap[nm] += Number(b.total_amount || 0);
      });
      // Actually for agent leaderboard, let's use sales_orders agent_name
      const { data: agentOrders } = await supabase.from('sales_orders').select('agent_name,total_amount').not('agent_name','is',null).limit(1000);
      const agMap = {};
      (agentOrders || []).forEach(o => {
        const nm = o.agent_name || 'Unknown';
        if (!agMap[nm]) agMap[nm] = { name: nm, revenue: 0, orders: 0 };
        agMap[nm].revenue += Number(o.total_amount || 0);
        agMap[nm].orders  += 1;
      });
      setTopAgents(Object.values(agMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

      setRecentActivity(activity || []);
      setSyncStatus({ last: syncLog?.[0]?.synced_at, status: syncLog?.[0]?.status || 'unknown' });
      setWhatsappCount(waInbox?.length || 0);

      // Sales-role: load my recent orders
      if (['sales_executive','sales','admin','manager'].includes(userRole)) {
        const { data: myOrd } = await supabase.from('sales_orders').select('id,order_no,party_name,party_details,total_amount,status,created_at').order('created_at', { ascending: false }).limit(6);
        setMyOrders(myOrd || []);
      }

    } catch (err) { console.error('Dashboard:', err); }
    setLoading(false);
  }, [userRole, userName]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // Helpers
  const roleMeta      = ROLE_META[userRole] || ROLE_META.viewer;
  const isAdmin       = userRole === 'admin';
  const isManager     = ['admin','manager'].includes(userRole);
  const isSalesRole   = ['admin','manager','sales_executive','sales'].includes(userRole);
  const isAccounts    = ['admin','manager','accounts'].includes(userRole);
  const isOps         = ['admin','manager','operations','production_staff'].includes(userRole);
  const isPayment     = ['admin','manager','payment_recovery','accounts'].includes(userRole);
  const visibleActions = ALL_QUICK_ACTIONS.filter(a => isAdmin || a.roles.includes(userRole));

  const fmt   = n => Number(n||0).toLocaleString('en-IN');
  const fmtC  = n => '₹' + Number(n||0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const fmtL  = n => n >= 10000000 ? (n/10000000).toFixed(2)+'Cr' : n >= 100000 ? (n/100000).toFixed(2)+'L' : fmtC(n);

  const statusBadge = (status) => {
    const sc = { pending:['#FFF8E8','#D4920A'], confirmed:['#E8FFF4','#1E9E5A'], approved:['#E8FFF4','#1E9E5A'], dispatched:['#EEF6FF','#2468C8'], delivered:['#E8FFF4','#1E9E5A'], cancelled:['#FFF3F3','#ef4444'], draft:['#f1f5f9','#64748b'] };
    const [bg,tc] = sc[status] || ['#f1f5f9','#64748b'];
    return <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700, background:bg, color:tc }}>{status}</span>;
  };

  const spkValues = monthlyRevenue.map(m => m.value);

  return (
    <div style={{ fontFamily:"'DM Sans', sans-serif", background:T.bg, minHeight:'100vh' }}>

      {/* ── HEADER ── */}
      <div style={{ background:`linear-gradient(135deg,${T.tealDark},#143F3C)`, padding:'18px 26px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, background:'linear-gradient(135deg,#3DBFAE,#E8A800)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{roleMeta.icon}</div>
            {isAdmin ? 'Admin Command Center' : isManager ? 'Manager Dashboard' : isSalesRole ? 'Sales Dashboard' : isOps ? 'Operations Dashboard' : isAccounts ? 'Accounts Dashboard' : 'Dashboard'}
          </div>
          <div style={{ fontSize:12, color:'#6A9B95', marginTop:3 }}>Shreerang Trendz Pvt Ltd · {userName}</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {syncStatus.status === 'success' && (
            <span style={{ background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)', color:'#22C55E', borderRadius:20, padding:'4px 10px', fontSize:11, fontWeight:600 }}>
              ✅ Tally Synced {syncStatus.last ? new Date(syncStatus.last).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : ''}
            </span>
          )}
          {whatsappCount > 0 && (
            <button onClick={() => navigate('/admin/whatsapp-inbox')} style={{ background:'rgba(37,211,102,0.15)', border:'1px solid rgba(37,211,102,0.3)', color:'#25D366', borderRadius:20, padding:'4px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>
              💬 {whatsappCount} unread
            </button>
          )}
          <span style={{ background:roleMeta.color+'25', border:`1px solid ${roleMeta.color}50`, color:roleMeta.color, borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>
            {roleMeta.icon} {roleMeta.label}
          </span>
          <button onClick={loadDashboard} style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:600 }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ padding:'20px 26px', display:'flex', flexDirection:'column', gap:18 }}>

        {/* ── MANAGER/ADMIN: REVENUE KPI ROW ── */}
        {isManager && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
            <StatCard icon="💹" label="Sales This Month" value={fmtL(kpi.salesThisMonth)}
              sub={`${fmt(kpi.totalSalesBills)} total bills`} color={T.green}
              sparkValues={spkValues} onClick={() => navigate('/admin/accounting/sales-bills')} />
            <StatCard icon="🛒" label="Purchase This Month" value={fmtL(kpi.purchaseThisMonth)}
              sub={`${fmt(kpi.totalPurchaseBills)} total bills`} color={T.blue}
              onClick={() => navigate('/admin/accounting/purchase-bills')} />
            <StatCard icon="⚠️" label="Outstanding Recv" value={fmtL(kpi.outstandingTotal)}
              sub={`${fmt(kpi.outstandingCount)} parties pending`} color={T.red}
              onClick={() => navigate('/admin/outstanding-receivable')} />
            <StatCard icon="👥" label="Customers" value={fmt(kpi.totalCustomers)}
              sub="Tally + CRM combined" color={T.teal}
              onClick={() => navigate('/admin/customers')} />
            <StatCard icon="🤝" label="Agents" value={fmt(kpi.totalAgents)}
              sub="Active sales team" color={T.gold}
              onClick={() => navigate('/admin/agent-commission')} />
            <StatCard icon="📦" label="Stock Items" value={fmt(kpi.totalStock)}
              sub="Live fabric inventory" color={T.purple}
              onClick={() => navigate('/admin/stock')} />
          </div>
        )}

        {/* ── MANAGER/ADMIN: STATUS ROW ── */}
        {isManager && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            <div onClick={() => navigate('/admin/orders')} style={{ background:T.surface, borderRadius:12, padding:'14px 18px', border:`1px solid ${T.border}`, cursor:'pointer', display:'flex', alignItems:'center', gap:12, boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(230,126,34,.15)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.05)'}>
              <div style={{ width:40, height:40, background:'#E67E2220', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>⏳</div>
              <div><div style={{ fontSize:22, fontWeight:800, color:'#E67E22' }}>{kpi.pendingOrders}</div><div style={{ fontSize:11, color:T.textMuted }}>Pending Orders</div></div>
            </div>
            <div onClick={() => navigate('/admin/challans')} style={{ background:T.surface, borderRadius:12, padding:'14px 18px', border:`1px solid ${T.border}`, cursor:'pointer', display:'flex', alignItems:'center', gap:12, boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(155,89,182,.15)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.05)'}>
              <div style={{ width:40, height:40, background:'#9B59B620', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🧾</div>
              <div><div style={{ fontSize:22, fontWeight:800, color:T.purple }}>{kpi.pendingChallans}</div><div style={{ fontSize:11, color:T.textMuted }}>Pending Challans</div></div>
            </div>
            <div onClick={() => navigate('/admin/accounting/quotations')} style={{ background:T.surface, borderRadius:12, padding:'14px 18px', border:`1px solid ${T.border}`, cursor:'pointer', display:'flex', alignItems:'center', gap:12, boxShadow:'0 2px 8px rgba(0,0,0,.05)' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(36,104,200,.15)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.05)'}>
              <div style={{ width:40, height:40, background:'#2468C820', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📄</div>
              <div><div style={{ fontSize:22, fontWeight:800, color:T.blue }}>{kpi.pendingQuotes}</div><div style={{ fontSize:11, color:T.textMuted }}>Pending Quotes</div></div>
            </div>
          </div>
        )}

        {/* ── MANAGER/ADMIN: CHARTS ROW (Revenue + Aging + Agents) ── */}
        {isManager && (
          <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr', gap:16 }}>

            {/* 6-Month Revenue Bar */}
            <div style={{ background:T.surface, borderRadius:14, padding:'18px 20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:15, fontWeight:700, color:T.navy }}>📈 6-Month Sales</div>
                <button onClick={() => navigate('/admin/analytics')} style={{ background:T.tealLight, border:`1px solid ${T.border}`, color:T.teal, borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:600 }}>Full Analytics →</button>
              </div>
              {loading ? <div style={{ color:T.textDim, fontSize:13 }}>Loading...</div> : (
                <>
                  <MiniBar data={monthlyRevenue} color={T.teal} height={80} />
                  <div style={{ marginTop:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <div style={{ background:T.bg, borderRadius:8, padding:'8px 12px', textAlign:'center' }}>
                      <div style={{ fontSize:13, fontWeight:800, color:T.teal }}>{fmtL(spkValues.reduce((s,v)=>s+v,0))}</div>
                      <div style={{ fontSize:10, color:T.textDim }}>6M Total</div>
                    </div>
                    <div style={{ background:T.bg, borderRadius:8, padding:'8px 12px', textAlign:'center' }}>
                      <div style={{ fontSize:13, fontWeight:800, color:T.green }}>{fmtL(spkValues.reduce((s,v)=>s+v,0)/6)}</div>
                      <div style={{ fontSize:10, color:T.textDim }}>Avg/Month</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Outstanding Aging */}
            <div style={{ background:T.surface, borderRadius:14, padding:'18px 20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:15, fontWeight:700, color:T.navy }}>⏱️ Aging Buckets</div>
                <button onClick={() => navigate('/admin/outstanding-receivable')} style={{ background:'#FFF3F3', border:'1px solid rgba(231,76,60,.2)', color:T.red, borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:600 }}>View →</button>
              </div>
              {loading ? <div style={{ color:T.textDim, fontSize:13 }}>Loading...</div> : (
                <>
                  <AgingBar label="0-30 Days"  amount={agingBuckets.current}  total={kpi.outstandingTotal} color={T.green} />
                  <AgingBar label="31-60 Days" amount={agingBuckets.days30}   total={kpi.outstandingTotal} color={T.gold} />
                  <AgingBar label="61-90 Days" amount={agingBuckets.days60}   total={kpi.outstandingTotal} color={T.orange} />
                  <AgingBar label="90+ Days"   amount={agingBuckets.days90plus} total={kpi.outstandingTotal} color={T.red} />
                  <div style={{ marginTop:12, fontWeight:800, color:T.red, fontSize:14 }}>Total: {fmtL(kpi.outstandingTotal)}</div>
                </>
              )}
            </div>

            {/* Top Agents */}
            <div style={{ background:T.surface, borderRadius:14, padding:'18px 20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:15, fontWeight:700, color:T.navy }}>🏆 Top Agents</div>
                <button onClick={() => navigate('/admin/agent-commission')} style={{ background:'#F3E8FF', border:'1px solid rgba(155,89,182,.2)', color:T.purple, borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:600 }}>All →</button>
              </div>
              {loading ? <div style={{ color:T.textDim, fontSize:13 }}>Loading...</div> : topAgents.length === 0 ? (
                <div style={{ color:T.textDim, fontSize:12, textAlign:'center', paddingTop:20 }}>No agent data yet</div>
              ) : topAgents.map((a, i) => {
                const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
                const maxRev = topAgents[0].revenue;
                const pct    = maxRev > 0 ? (a.revenue/maxRev)*100 : 0;
                return (
                  <div key={a.name} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                      <span style={{ fontSize:11, color:T.text }}>{medals[i]} {a.name.length > 14 ? a.name.slice(0,14)+'…' : a.name}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:T.green }}>{fmtL(a.revenue)}</span>
                    </div>
                    <div style={{ background:T.bg, borderRadius:3, height:5 }}>
                      <div style={{ height:'100%', background: i===0?T.gold:i===1?'#94a3b8':i===2?'#CD7F32':T.teal, borderRadius:3, width:pct+'%', transition:'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SALES ROLE: My Orders + My Quotes ── */}
        {isSalesRole && !isManager && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div style={{ background:T.surface, borderRadius:14, padding:'18px 20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:15, fontWeight:700, color:T.navy }}>📋 Recent Orders</div>
                <button onClick={() => navigate('/admin/orders')} style={{ background:T.tealLight, border:`1px solid ${T.border}`, color:T.teal, borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:600 }}>View All →</button>
              </div>
              {myOrders.length === 0 ? <div style={{ color:T.textDim, textAlign:'center', padding:'20px 0', fontSize:13 }}>No orders yet</div>
                : myOrders.map(o => (
                  <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${T.border}60` }}>
                    <div><div style={{ fontWeight:600, fontSize:12, color:T.blue }}>{o.order_no||'—'}</div><div style={{ fontSize:11, color:T.textMuted }}>{o.party_name||o.party_details?.name||'—'}</div></div>
                    <div style={{ textAlign:'right' }}><div style={{ fontWeight:700, fontSize:13, color:T.green }}>{fmtC(o.total_amount)}</div>{statusBadge(o.status)}</div>
                  </div>
                ))}
              <button onClick={() => navigate('/admin/orders/new')} style={{ width:'100%', marginTop:12, background:T.green, color:'#fff', border:'none', borderRadius:8, padding:'9px 0', cursor:'pointer', fontSize:13, fontWeight:700 }}>+ New Order</button>
            </div>
            <div style={{ background:T.surface, borderRadius:14, padding:'18px 20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:15, fontWeight:700, color:T.navy }}>📄 Quotations</div>
                <button onClick={() => navigate('/admin/accounting/quotations')} style={{ background:T.tealLight, border:`1px solid ${T.border}`, color:T.teal, borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:600 }}>View All →</button>
              </div>
              <div style={{ textAlign:'center', padding:'20px 0', color:T.textDim, fontSize:13 }}>
                <div style={{ fontSize:40, marginBottom:8 }}>📄</div>
                Create your first quotation
              </div>
              <button onClick={() => navigate('/admin/accounting/quotations/new')} style={{ width:'100%', marginTop:8, background:T.blue, color:'#fff', border:'none', borderRadius:8, padding:'9px 0', cursor:'pointer', fontSize:13, fontWeight:700 }}>+ New Quotation</button>
            </div>
          </div>
        )}

        {/* ── ACCOUNTS ROLE: Bills + Outstanding ── */}
        {isAccounts && !isManager && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            <StatCard icon="📤" label="Total Sales Bills" value={fmt(kpi.totalSalesBills)} sub="From Tally sync" color={T.green} onClick={() => navigate('/admin/accounting/sales-bills')} />
            <StatCard icon="📥" label="Total Purchase Bills" value={fmt(kpi.totalPurchaseBills)} sub="From Tally sync" color={T.blue} onClick={() => navigate('/admin/accounting/purchase-bills')} />
            <StatCard icon="⚠️" label="Outstanding Recv" value={fmtL(kpi.outstandingTotal)} sub={`${fmt(kpi.outstandingCount)} parties`} color={T.red} onClick={() => navigate('/admin/outstanding-receivable')} />
          </div>
        )}

        {/* ── PRODUCTION/OPS ROLE ── */}
        {isOps && !isManager && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div onClick={() => navigate('/admin/production-floor')} style={{ background:'linear-gradient(135deg,#EEF6FF,#E8FFF4)', border:'1px solid rgba(36,104,200,.2)', borderRadius:14, padding:'20px 24px', cursor:'pointer' }}>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700, color:T.navy }}>🏭 Production Floor</div>
              <div style={{ fontSize:13, color:T.textMuted, marginTop:4 }}>View challans, dispatch queue & QC</div>
              <div style={{ marginTop:12, display:'flex', gap:8 }}>
                <span style={{ background:'#2468C820', color:T.blue, padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700 }}>Open →</span>
              </div>
            </div>
            <div onClick={() => navigate('/admin/mto-orders')} style={{ background:'linear-gradient(135deg,#FFF7ED,#FFFAEE)', border:'1px solid rgba(230,126,34,.2)', borderRadius:14, padding:'20px 24px', cursor:'pointer' }}>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700, color:T.navy }}>⚙️ MTO Pipeline</div>
              <div style={{ fontSize:13, color:T.textMuted, marginTop:4 }}>Make-to-order Kanban board</div>
              <div style={{ marginTop:12 }}>
                <span style={{ background:'#E67E2220', color:T.orange, padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700 }}>Open →</span>
              </div>
            </div>
          </div>
        )}

        {/* ── PAYMENT RECOVERY ROLE ── */}
        {isPayment && !isManager && !isAccounts && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div onClick={() => navigate('/admin/outstanding-receivable')} style={{ background:'linear-gradient(135deg,#FFF3F3,#FFF8E8)', border:'1px solid rgba(231,76,60,.2)', borderRadius:14, padding:'20px 24px', cursor:'pointer' }}>
              <div style={{ fontSize:28 }}>💰</div>
              <div style={{ fontWeight:700, color:T.red, fontSize:16, marginTop:8 }}>Outstanding: {fmtL(kpi.outstandingTotal)}</div>
              <div style={{ fontSize:12, color:T.textMuted }}>{fmt(kpi.outstandingCount)} parties pending · Click to view aging</div>
            </div>
            <div onClick={() => navigate('/admin/payment-reminders')} style={{ background:'linear-gradient(135deg,#FFF8E8,#FFFAEE)', border:'1px solid rgba(212,146,10,.2)', borderRadius:14, padding:'20px 24px', cursor:'pointer' }}>
              <div style={{ fontSize:28 }}>🔔</div>
              <div style={{ fontWeight:700, color:'#D4920A', fontSize:16, marginTop:8 }}>Send Reminders</div>
              <div style={{ fontSize:12, color:T.textMuted }}>WhatsApp payment reminders to parties</div>
            </div>
          </div>
        )}

        {/* ── QUICK ACTIONS GRID ── */}
        <div style={{ background:T.surface, borderRadius:14, padding:'18px 20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:16, fontWeight:700, color:T.navy, marginBottom:14 }}>⚡ Quick Actions</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(148px, 1fr))', gap:10 }}>
            {visibleActions.map(action => (
              <button key={action.to} onClick={() => navigate(action.to)}
                style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 14px', cursor:'pointer', textAlign:'left', transition:'all .15s', fontFamily:"'DM Sans', sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.background = action.color+'12'; e.currentTarget.style.borderColor = action.color+'60'; e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = T.bg; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform='translateY(0)'; }}
              >
                <div style={{ fontSize:22, marginBottom:6 }}>{action.icon}</div>
                <div style={{ fontWeight:700, fontSize:12, color:T.text }}>{action.label}</div>
                <div style={{ fontSize:10, color:T.textMuted, marginTop:2 }}>{action.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── MANAGER/ADMIN: Activity Feed ── */}
        {isManager && (
          <div style={{ background:T.surface, borderRadius:14, padding:'18px 20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize:15, fontWeight:700, color:T.navy, marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              🕐 Recent Activity
              <button onClick={() => navigate('/admin/activity-logs')} style={{ background:T.tealLight, border:`1px solid ${T.border}`, color:T.teal, borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:600 }}>View All →</button>
            </div>
            {loading ? <div style={{ color:T.textDim, fontSize:13 }}>Loading...</div>
              : recentActivity.length === 0 ? <div style={{ color:T.textDim, textAlign:'center', padding:'20px 0', fontSize:13 }}>No activity yet</div>
              : recentActivity.map(act => (
                <div key={act.id} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:`1px solid ${T.border}60` }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:T.teal, marginTop:5, flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:12, color:T.text, fontWeight:500 }}>{act.action || 'Activity'}</div>
                    <div style={{ fontSize:10, color:T.textDim }}>{act.entity_type} · {act.user_name || 'System'} · {act.created_at ? new Date(act.created_at).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'}) : '—'}</div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* ── ROLE FOOTER ── */}
        <div style={{ background:roleMeta.color+'10', border:`1px solid ${roleMeta.color}30`, borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:22 }}>{roleMeta.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, color:roleMeta.color, fontSize:13 }}>{roleMeta.label} · {userName}</div>
            <div style={{ fontSize:11, color:T.textMuted }}>{roleMeta.desc} · {visibleActions.length} quick actions available</div>
          </div>
          {isManager && (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => navigate('/admin/tally-sync')} style={{ background:'rgba(26,188,156,.15)', border:'1px solid rgba(26,188,156,.3)', color:'#1ABC9C', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:11, fontWeight:600 }}>🔄 Tally Sync</button>
              <button onClick={() => navigate('/admin/analytics')} style={{ background:'rgba(36,104,200,.12)', border:'1px solid rgba(36,104,200,.25)', color:T.blue, borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:11, fontWeight:600 }}>📊 Analytics</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
