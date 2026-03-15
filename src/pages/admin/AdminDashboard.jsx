import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const T = {
  teal:'#2BA898', tealDark:'#071E1C', tealLight:'#EEF8F6', tealBright:'#3DBFAE',
  gold:'#D4920A', goldLight:'#FEF9EC', goldBright:'#F59E0B',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF', surface2:'#F4FBFA',
  text:'#071E1C', muted:'#4A7A74', error:'#DC2626', green:'#059669',
  blue:'#2563EB', purple:'#7C3AED', orange:'#C86020', pink:'#DB2777',
};

// ─── MINI COMPONENTS ──────────────────────────────────────────────────────────
function Pill({ children, color = T.teal, bg }) {
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 99, fontSize: 9, fontWeight: 800,
      letterSpacing: '0.05em', textTransform: 'uppercase',
      background: bg || `${color}18`, color,
    }}>{children}</span>
  );
}

function StatCard({ icon, label, value, sub, color, to, badge, urgent, loading }) {
  const nav = useNavigate();
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => to && nav(to)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.surface, borderRadius: 14, padding: '18px 20px',
        border: `1.5px solid ${urgent ? '#FCA5A5' : hov && to ? color || T.teal : T.border}`,
        borderTop: `3px solid ${urgent ? T.error : color || T.teal}`,
        cursor: to ? 'pointer' : 'default',
        transform: hov && to ? 'translateY(-3px)' : 'none',
        boxShadow: hov && to ? `0 8px 24px ${color || T.teal}22` : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
        position: 'relative', overflow: 'hidden',
        background: urgent ? '#FEF2F2' : T.surface,
      }}
    >
      {badge && (
        <div style={{ position: 'absolute', top: 10, right: 12 }}>
          <Pill color={color}>{badge}</Pill>
        </div>
      )}
      <div style={{ fontSize: 22, marginBottom: 8, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 9, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: urgent ? T.error : T.tealDark, fontFamily: "'DM Serif Display', serif", lineHeight: 1 }}>
        {loading ? <span style={{ fontSize: 16, color: T.muted, fontWeight: 400 }}>—</span> : (value ?? '—')}
      </div>
      {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ActionBtn({ icon, label, to, color, sub }) {
  const nav = useNavigate();
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={() => nav(to)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        borderRadius: 10, border: `1.5px solid ${hov ? color || T.teal : T.border}`,
        background: hov ? `${color || T.teal}0D` : T.surface,
        cursor: 'pointer', width: '100%', textAlign: 'left',
        fontFamily: 'inherit', transition: 'all 0.15s',
        boxShadow: hov ? `0 2px 8px ${color || T.teal}18` : 'none',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 9, background: `${color || T.teal}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: T.muted }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 14, color: T.muted, opacity: hov ? 1 : 0.5 }}>→</div>
    </button>
  );
}

function SectionDivider({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 14px' }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  );
}

function TallyStatusBadge({ status }) {
  const configs = {
    online: { dot: T.green, bg: '#D1FAE5', color: '#065F46', label: '● Tally Prime Online' },
    offline: { dot: T.error, bg: '#FEE2E2', color: '#991B1B', label: '○ Tally Offline' },
    checking: { dot: T.gold, bg: '#FEF3C7', color: '#92400E', label: '◌ Checking Tally…' },
  };
  const cfg = configs[status] || configs.checking;
  return (
    <div style={{ padding: '4px 14px', borderRadius: 99, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, display: 'inline-block', boxShadow: `0 0 0 2px ${cfg.dot}40` }} />
      {cfg.label}
    </div>
  );
}

// ─── CUSTOMER APPROVAL QUEUE ───────────────────────────────────────────────────
function CustomerApprovalQueue() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(null);
  const nav = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    // Users in auth but not linked to a customer record (role = customer, no customer match)
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, created_at, role')
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!profiles?.length) { setPending([]); setLoading(false); return; }

    // Check which ones already have a customer record linked
    const emails = profiles.map(p => p.email);
    const { data: linked } = await supabase
      .from('customers')
      .select('login_email')
      .in('login_email', emails);

    const linkedEmails = new Set((linked || []).map(l => l.login_email));
    const unlinked = profiles.filter(p => !linkedEmails.has(p.email));
    setPending(unlinked);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approveCustomer(profile) {
    setApproving(profile.id);
    try {
      // Find if there's an existing customer record by email (for manual pre-created customers)
      const { data: existing } = await supabase
        .from('customers')
        .select('id, name')
        .eq('email', profile.email)
        .maybeSingle();

      if (existing) {
        // Link the login email to the existing customer
        await supabase.from('customers').update({ login_email: profile.email }).eq('id', existing.id);
      } else {
        // Create a new basic customer record
        await supabase.from('customers').insert({
          name: profile.full_name || profile.email.split('@')[0],
          email: profile.email,
          login_email: profile.email,
          business_type: 'customer',
          portal_access_enabled: true,
        });
      }

      // Send WhatsApp welcome message via n8n
      try {
        await fetch('https://shreerangtrendz.app.n8n.cloud/webhook/whatsapp-incoming', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'portal_approved',
            email: profile.email,
            name: profile.full_name,
          }),
        });
      } catch {} // WhatsApp is best-effort

      await load();
    } catch (err) {
      console.error('Approval error:', err);
    } finally {
      setApproving(null);
    }
  }

  async function rejectCustomer(profile) {
    if (!confirm(`Reject portal access for ${profile.email}?`)) return;
    await supabase.from('user_profiles').update({ role: 'restricted' }).eq('id', profile.id);
    await load();
  }

  if (loading) return (
    <div style={{ padding: 20, textAlign: 'center', color: T.muted, fontSize: 13 }}>Checking pending approvals…</div>
  );

  if (!pending.length) return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>All portal requests handled</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>No pending customer approvals</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Pill color={T.error} bg="#FEE2E2">{pending.length} Pending</Pill>
        <span style={{ fontSize: 11, color: T.muted }}>Buyers waiting for portal access</span>
        <button onClick={load} style={{ marginLeft: 'auto', padding: '3px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface2, fontSize: 11, cursor: 'pointer', color: T.muted }}>↻ Refresh</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pending.map(p => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            borderRadius: 10, background: T.surface2, border: `1.5px solid ${T.border}`,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', background: `${T.teal}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 700, color: T.teal, flexShrink: 0,
            }}>
              {(p.full_name || p.email)[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {p.full_name || '—'}
              </div>
              <div style={{ fontSize: 11, color: T.muted }}>{p.email}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 1 }}>
                Registered {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={() => rejectCustomer(p)}
                style={{ padding: '6px 12px', borderRadius: 7, border: `1.5px solid #FCA5A5`, background: '#FEF2F2', color: T.error, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >Reject</button>
              <button
                onClick={() => approveCustomer(p)}
                disabled={approving === p.id}
                style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: T.teal, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: approving === p.id ? 0.6 : 1 }}
              >{approving === p.id ? 'Approving…' : '✓ Approve'}</button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => nav('/admin/customers')}
        style={{ marginTop: 10, width: '100%', padding: '8px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: 'transparent', color: T.muted, fontSize: 11, cursor: 'pointer' }}
      >View All Customers →</button>
    </div>
  );
}

// ─── TODAY'S PULSE WIDGET ─────────────────────────────────────────────────────
function TodaysPulse({ counts, tallyStatus }) {
  const nav = useNavigate();
  const items = [
    {
      label: 'Dispatches Due Today', value: counts.dispatch_today ?? 0,
      icon: '🚚', color: T.orange, to: '/admin/orders',
      urgent: (counts.dispatch_today ?? 0) > 0,
    },
    {
      label: 'Overdue Outstanding (30d+)', value: counts.overdue ?? 0,
      icon: '⚠️', color: T.error, to: '/admin/outstanding-receivable',
      urgent: (counts.overdue ?? 0) > 0,
    },
    {
      label: 'Pending Approvals', value: counts.pending_approvals ?? 0,
      icon: '👤', color: T.purple, to: '#approvals',
      urgent: (counts.pending_approvals ?? 0) > 0,
    },
    {
      label: 'Last Tally Sync', value: counts.last_sync ?? '—',
      icon: '🔄', color: tallyStatus === 'online' ? T.green : T.error, to: '/admin/tally-sync',
      urgent: tallyStatus === 'offline',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 6 }}>
      {items.map((item, i) => (
        <div
          key={i}
          onClick={() => item.to && item.to !== '#approvals' && nav(item.to)}
          style={{
            background: item.urgent ? `${item.color}0A` : T.surface,
            border: `1.5px solid ${item.urgent ? `${item.color}40` : T.border}`,
            borderLeft: `4px solid ${item.color}`,
            borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 16px ${item.color}18`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            {item.urgent && <Pill color={item.color}>!</Pill>}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: item.urgent ? item.color : T.tealDark, fontFamily: 'serif', lineHeight: 1 }}>{item.value}</div>
          <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN DASHBOARD ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tallyStatus, setTallyStatus] = useState('checking');
  const [recentActivity, setRecentActivity] = useState([]);
  const [activeTab, setActiveTab] = useState('activity'); // 'activity' | 'approvals'
  const [counts, setCounts] = useState({
    finish_fabrics: null, base_fabrics: null, designs: null, stock_today: null,
    purchase_bills: null, sales_bills: null, customers: null, suppliers: null,
    agents: null, orders: null, outstanding: null, pending_tally: null,
    dispatch_today: null, overdue: null, pending_approvals: null, last_sync: null,
  });

  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Admin';
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    loadAll();
    const interval = setInterval(checkTally, 60000);
    return () => clearInterval(interval);
  }, []);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadCounts(), checkTally(), loadActivity()]);
    setLoading(false);
  }

  async function loadCounts() {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const results = await Promise.allSettled([
      supabase.from('finish_fabrics').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('base_fabrics').select('*', { count: 'exact', head: true }).not('status', 'eq', 'deleted'),
      supabase.from('finish_fabric_designs').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('fabric_stock_live').select('*', { count: 'exact', head: true }).eq('sync_date', today),
      supabase.from('purchase_bills').select('*', { count: 'exact', head: true }),
      supabase.from('sales_bills').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true }).neq('business_type', 'supplier'),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_type', 'supplier'),
      supabase.from('sales_team').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('payment_followups').select('*', { count: 'exact', head: true }),
      supabase.from('tally_sync_errors').select('*', { count: 'exact', head: true }).eq('resolved', false),
      // Pending portal approvals — users with no linked customer
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
      // Overdue outstanding
      supabase.from('payment_followups').select('*', { count: 'exact', head: true }).lt('due_date', thirtyDaysAgo),
      // Last tally sync
      supabase.from('tally_sync_log').select('created_at').order('created_at', { ascending: false }).limit(1),
    ]);

    const get = (i) => results[i].status === 'fulfilled' ? results[i].value : {};
    const lastSync = get(14)?.data?.[0]?.created_at;

    setCounts({
      finish_fabrics: get(0)?.count ?? 0,
      base_fabrics: get(1)?.count ?? 0,
      designs: get(2)?.count ?? 0,
      stock_today: get(3)?.count ?? 0,
      purchase_bills: get(4)?.count ?? 0,
      sales_bills: get(5)?.count ?? 0,
      customers: get(6)?.count ?? 0,
      suppliers: get(7)?.count ?? 0,
      agents: get(8)?.count ?? 0,
      orders: get(9)?.count ?? 0,
      outstanding: get(10)?.count ?? 0,
      pending_tally: get(11)?.count ?? 0,
      pending_approvals: get(12)?.count ?? 0,
      overdue: get(13)?.count ?? 0,
      dispatch_today: 0, // placeholder until orders have dispatch_date field
      last_sync: lastSync ? new Date(lastSync).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
    });
  }

  async function checkTally() {
    try {
      const r = await fetch(
        `https://zdekydcscwhuusliwqaz.supabase.co/functions/v1/tally-health`,
        { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }, signal: AbortSignal.timeout(8000) }
      );
      const j = await r.json();
      setTallyStatus(j.tally === 'online' ? 'online' : 'offline');
    } catch { setTallyStatus('offline'); }
  }

  async function loadActivity() {
    const [{ data: syncLog }, { data: fabrics }, { data: orders }, { data: bills }] = await Promise.all([
      supabase.from('tally_sync_log').select('sync_type,tally_ok,created_at').order('created_at', { ascending: false }).limit(6),
      supabase.from('finish_fabrics').select('item_name,created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('orders').select('order_no,status,created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('purchase_bills').select('bill_number,supplier_name,created_at').order('created_at', { ascending: false }).limit(4),
    ]);
    const items = [
      ...(syncLog || []).map(s => ({ icon: s.tally_ok ? '🟢' : '🔴', text: `Tally sync: ${s.sync_type}`, time: s.created_at, ok: s.tally_ok })),
      ...(fabrics || []).map(f => ({ icon: '🧵', text: `New fabric: ${f.item_name}`, time: f.created_at, ok: true })),
      ...(orders || []).map(o => ({ icon: '📋', text: `Order ${o.order_no} — ${o.status}`, time: o.created_at, ok: true })),
      ...(bills || []).map(b => ({ icon: '📥', text: `Bill ${b.bill_number} · ${b.supplier_name}`, time: b.created_at, ok: true })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 15);
    setRecentActivity(items);
  }

  // ─── QUICK ACTIONS CONFIG ─────────────────────────────────────────────────
  const QUICK_ACTIONS = [
    { icon: '🧵', label: 'New Finish Fabric', sub: 'Add to catalogue', to: '/admin/fabric/finish-fabric-form', color: T.teal },
    { icon: '🎨', label: 'Upload Design', sub: 'Add design images', to: '/admin/design/upload', color: T.purple },
    { icon: '📋', label: 'New Sales Order', sub: 'Create order entry', to: '/admin/orders/new', color: T.gold },
    { icon: '🔄', label: 'Sync Tally Now', sub: tallyStatus === 'online' ? 'Connected' : 'Tally offline', to: '/admin/tally-sync', color: tallyStatus === 'online' ? T.green : T.error },
    { icon: '💬', label: 'Payment Reminders', sub: `${counts.outstanding || 0} outstanding`, to: '/admin/payment-reminders', color: T.orange },
    { icon: '👥', label: 'Customer Master', sub: `${counts.customers || 0} customers`, to: '/admin/customers', color: T.blue },
    { icon: '🧮', label: 'Cost Engine', sub: 'Calculate fabric price', to: '/admin/cost/cost-sheet', color: T.purple },
    { icon: '📊', label: 'Analytics', sub: 'Sales reports', to: '/admin/analytics', color: T.teal },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', Inter, sans-serif", padding: '24px 28px', background: T.bg, minHeight: '100vh', color: T.text }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.tealDark, letterSpacing: '-0.02em' }}>
            {greeting}, {displayName} 👋
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{dateStr} · Shreerang Trendz Pvt. Ltd.</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <TallyStatusBadge status={tallyStatus} />
            {counts.pending_tally > 0 && (
              <div
                onClick={() => navigate('/admin/tally-sync')}
                style={{ padding: '4px 14px', borderRadius: 99, background: '#FEF3C7', color: '#92400E', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                ⚠️ {counts.pending_tally} sync error{counts.pending_tally > 1 ? 's' : ''}
              </div>
            )}
            {counts.pending_approvals > 0 && (
              <div
                onClick={() => setActiveTab('approvals')}
                style={{ padding: '4px 14px', borderRadius: 99, background: '#EDE9FE', color: '#5B21B6', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                👤 {counts.pending_approvals} portal request{counts.pending_approvals > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={loadAll}
          style={{ padding: '8px 18px', borderRadius: 9, border: `1.5px solid ${T.border}`, background: T.surface, color: T.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>↻</span> Refresh
        </button>
      </div>

      {/* ── TODAY'S PULSE ── */}
      <SectionDivider icon="⚡" label="Today's Pulse" />
      <TodaysPulse counts={counts} tallyStatus={tallyStatus} />

      {/* ── CATALOGUE STATS ── */}
      <SectionDivider icon="🧵" label="Catalogue" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 6 }}>
        <StatCard icon="🧵" label="Finish Fabrics" value={counts.finish_fabrics} sub="Active in catalogue" color={T.teal} to="/admin/fabric/finish" loading={loading} />
        <StatCard icon="🔩" label="Base Fabrics" value={counts.base_fabrics} sub="Grey fabric master" color={T.blue} to="/admin/fabric/base-fabric-form" loading={loading} />
        <StatCard icon="🎨" label="Design Numbers" value={counts.designs} sub="Across all fabrics" color={T.purple} to="/admin/design/upload" loading={loading} />
        <StatCard icon="📦" label="Live Stock" value={counts.stock_today} sub="Items synced today" color={T.green} to="/admin/tally-sync" badge={tallyStatus === 'online' ? 'LIVE' : null} loading={loading} />
      </div>

      {/* ── ACCOUNTS STATS ── */}
      <SectionDivider icon="💰" label="Accounts & Tally" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 6 }}>
        <StatCard icon="📥" label="Purchase Bills" value={counts.purchase_bills} sub="Total in DB" color={T.blue} to="/admin/accounting/purchase-bills" loading={loading} />
        <StatCard icon="📤" label="Sales Bills" value={counts.sales_bills} sub="Total in DB" color={T.green} to="/admin/accounting/sales-bills" loading={loading} />
        <StatCard icon="👥" label="Customers" value={counts.customers} sub="Sundry debtors" color={T.teal} to="/admin/customers" loading={loading} />
        <StatCard icon="🏭" label="Suppliers" value={counts.suppliers} sub="Sundry creditors" color={T.orange} to="/admin/tally-sync" loading={loading} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 6 }}>
        <StatCard icon="🤝" label="Sales Agents" value={counts.agents} sub="Field agents" color={T.pink} to="/admin/tally-sync" loading={loading} />
        <StatCard icon="📋" label="Sales Orders" value={counts.orders} sub="Total orders" color={T.gold} to="/admin/orders" loading={loading} />
        <StatCard icon="💰" label="Outstanding Bills" value={counts.outstanding} sub="Being tracked" color={T.error} to="/admin/outstanding-receivable" urgent={(counts.overdue ?? 0) > 0} loading={loading} />
      </div>

      {/* ── BOTTOM GRID: Quick Actions + Activity/Approvals ── */}
      <SectionDivider icon="🛠️" label="Quick Actions & Activity" />
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>

        {/* Quick Actions */}
        <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 14, padding: '18px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.tealDark, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>⚡ Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {QUICK_ACTIONS.map((a, i) => <ActionBtn key={i} {...a} />)}
          </div>
        </div>

        {/* Activity + Approvals tabbed panel */}
        <div style={{ background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: `1.5px solid ${T.border}`, background: T.surface2 }}>
            {[
              { id: 'activity', label: '📋 Activity Feed' },
              { id: 'approvals', label: `👤 Portal Approvals${counts.pending_approvals ? ` (${counts.pending_approvals})` : ''}` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 20px', fontSize: 12, fontWeight: activeTab === tab.id ? 700 : 500,
                  color: activeTab === tab.id ? T.teal : T.muted,
                  borderBottom: activeTab === tab.id ? `2.5px solid ${T.teal}` : '2.5px solid transparent',
                  background: 'none', border: 'none', borderBottom: activeTab === tab.id ? `2.5px solid ${T.teal}` : '2.5px solid transparent',
                  cursor: 'pointer', transition: 'all 0.15s', marginBottom: -1,
                }}
              >{tab.label}</button>
            ))}
          </div>

          <div style={{ padding: 18, maxHeight: 440, overflowY: 'auto' }}>
            {activeTab === 'activity' ? (
              recentActivity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: T.muted, fontSize: 13 }}>No recent activity</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recentActivity.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: T.surface2, border: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 15, flexShrink: 0, width: 22, textAlign: 'center' }}>{item.icon}</span>
                      <span style={{ fontSize: 12, color: T.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</span>
                      <span style={{ fontSize: 10, color: T.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {new Date(item.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <CustomerApprovalQueue />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
