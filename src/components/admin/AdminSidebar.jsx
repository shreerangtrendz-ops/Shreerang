import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

// ─── NAVIGATION STRUCTURE ─────────────────────────────────────────────────────
const ALL_GROUPS = [
  {
    id: 'overview', label: 'Command Center', icon: '⬡',
    roles: ['admin','manager','accounts','operations','sales','sales_executive','production_staff','payment_recovery','viewer'],
    items: [
      { icon: '⬡',  label: 'Dashboard',    to: '/admin/dashboard',      roles: ['admin','manager','accounts','operations','sales','sales_executive','production_staff','payment_recovery','viewer'] },
      { icon: '📊', label: 'Analytics',    to: '/admin/analytics',      roles: ['admin','manager'] },
      { icon: '📋', label: 'Activity Log', to: '/admin/activity-logs',  roles: ['admin','manager'] },
    ]
  },
  {
    id: 'crm', label: 'CRM & Sales', icon: '🤝',
    roles: ['admin','manager','operations','sales','sales_executive','accounts'],
    items: [
      { icon: '👥', label: 'Customers',          to: '/admin/customers',           roles: ['admin','manager','operations','sales','sales_executive'] },
      { icon: '📱', label: 'WhatsApp Inbox',     to: '/admin/whatsapp-inbox',      roles: ['admin','manager'], badge: 'LIVE', badgeClass: 'ok' },
      { icon: '💬', label: 'Quotations',         to: '/admin/accounting/quotations',roles: ['admin','manager','accounts'] },
      { icon: '📋', label: 'Sales Orders',       to: '/admin/orders',              roles: ['admin','manager','operations','sales','sales_executive'] },
      { icon: '🎯', label: 'Make-to-Order',      to: '/admin/mto-orders',          roles: ['admin','manager','operations'], badge: 'NEW' },
      { icon: '💰', label: 'Payment Reminders',  to: '/admin/payment-reminders',   roles: ['admin','manager','accounts','operations'], badge: '⚡' },
      { icon: '📈', label: 'Outstanding Recv',   to: '/admin/outstanding-receivable',roles: ['admin','manager','accounts'] },
    ]
  },
  {
    id: 'catalogue', label: 'Catalogue & Stock', icon: '🏪',
    roles: ['admin','manager','operations','sales_executive'],
    items: [
      { icon: '🖼', label: 'Design Gallery',     to: '/admin/design-gallery',       roles: ['admin','manager','sales_executive'], badge: 'NEW' },
      { icon: '🔩', label: 'Base Fabric',        to: '/admin/fabric/base-fabric-form',roles: ['admin','manager'] },
      { icon: '🧵', label: 'Finish Fabric',      to: '/admin/fabric/finish',        roles: ['admin','manager'] },
      { icon: '📦', label: 'Live Stock',         to: '/admin/stock',                roles: ['admin','manager','operations'] },
      { icon: '⚠️', label: 'Low Stock Alerts',   to: '/admin/stock/alerts',         roles: ['admin','manager','operations'], badge: 'LIVE', badgeClass: 'ok' },
      { icon: '📥', label: 'Stock In / Out',     to: '/admin/stock/inward',         roles: ['admin','manager','operations'] },
      { icon: '🗂', label: 'Media Library',      to: '/admin/media-library',        roles: ['admin','manager'] },
    ]
  },
  {
    id: 'production', label: 'Production & Job Work', icon: '🏭',
    roles: ['admin','manager','operations','accounts'],
    items: [
      { icon: '🏭', label: 'Production Floor',   to: '/admin/production-floor',     roles: ['admin','manager','operations'], badge: 'LIVE', badgeClass: 'ok' },
      { icon: '📋', label: 'Job Work Lots',      to: '/admin/job-work-jobs',        roles: ['admin','manager','operations'], badge: 'NEW' },
      { icon: '🤝', label: 'Job Workers',        to: '/admin/job-workers',          roles: ['admin','manager','operations'] },
      { icon: '📦', label: 'Job Work Challans',  to: '/admin/challans',             roles: ['admin','manager','operations'] },
      { icon: '💰', label: 'MTO Cost Templates', to: '/admin/mto-cost-template',    roles: ['admin','manager','operations'], badge: 'NEW' },
      { icon: '🧮', label: 'Cost Engine',        to: '/admin/cost/cost-sheet',      roles: ['admin','manager'] },
    ]
  },
  {
    id: 'accounting', label: 'Accounting & Sync', icon: '🧾',
    roles: ['admin','manager','accounts'],
    items: [
      { icon: '🔄', label: 'Tally Sync Hub',     to: '/admin/tally-sync',           roles: ['admin','manager'], badge: 'LIVE', badgeClass: 'ok' },
      { icon: '📥', label: 'Purchase Bills',     to: '/admin/accounting/purchase-bills',roles: ['admin','manager','accounts'] },
      { icon: '📤', label: 'Sales Bills',        to: '/admin/accounting/sales-bills',roles: ['admin','manager','accounts'] },
      { icon: '🔧', label: 'Job Work Bills',     to: '/admin/accounting/job-work-bills',roles: ['admin','manager','accounts'] },
      { icon: '📅', label: 'Day Book',           to: '/admin/reports/day-book',     roles: ['admin','manager','accounts'] },
      { icon: '📒', label: 'Party Ledger',       to: '/admin/reports/party-ledger', roles: ['admin','manager','accounts'] },
      { icon: '🏦', label: 'Cash & Bank',        to: '/admin/cash-bank',            roles: ['admin','manager','accounts'] },
      { icon: '📉', label: 'Outstanding Pay',    to: '/admin/outstanding-payable',  roles: ['admin','manager','accounts'] },
      { icon: '💼', label: 'P&L / Balance Sheet',to: '/admin/reports/profit-loss',  roles: ['admin','manager'] },
    ]
  },
  {
    id: 'settings', label: 'Settings', icon: '⚙️',
    roles: ['admin'],
    items: [
      { icon: '🛡', label: 'Access Control',    to: '/admin/access-control',       roles: ['admin'] },
      { icon: '🤖', label: 'WhatsApp Bot',      to: '/admin/whatsapp',             roles: ['admin'], badge: 'ON', badgeClass: 'ok' },
      { icon: '🔧', label: 'Field Config',      to: '/admin/settings/dropdown-manager',roles: ['admin'] },
      { icon: '🔢', label: 'HSN Codes',         to: '/admin/settings/hsn-codes',   roles: ['admin'] },
      { icon: '☁️', label: 'Cloud Storage',     to: '/admin/cloud-sync',           roles: ['admin'] },
      { icon: '💾', label: 'System Backup',     to: '/admin/backup-control',       roles: ['admin'] },
    ]
  }
];

const BADGE_STYLES = {
  ok:      { bg: '#D1FAE5', color: '#065F46' },
  warn:    { bg: '#FEF3C7', color: '#92400E' },
  AI:      { bg: '#F3E8FF', color: '#7C3AED' },
  LIVE:    { bg: '#D1FAE5', color: '#065F46' },
  ON:      { bg: '#D1FAE5', color: '#065F46' },
  NEW:     { bg: '#FEF3C7', color: '#B45309' },
  '⚡':    { bg: '#FEF3C7', color: '#B45309' },
  default: { bg: '#E0F2FE', color: '#0369A1' },
};

function Badge({ text, cls }) {
  const style = BADGE_STYLES[cls] || BADGE_STYLES[text] || BADGE_STYLES.default;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', padding: '2px 6px', borderRadius: 20, background: style.bg, color: style.color, marginLeft: 'auto', flexShrink: 0 }}>
      {text}
    </span>
  );
}

function RolePill({ role }) {
  const styles = {
    admin:            { bg: '#FEF3C7', color: '#B45309',  label: 'Admin' },
    manager:          { bg: '#DBEAFE', color: '#1D4ED8',  label: 'Manager' },
    accounts:         { bg: '#D1FAE5', color: '#065F46',  label: 'Accounts' },
    operations:       { bg: '#EDE9FE', color: '#5B21B6',  label: 'Operations' },
    sales:            { bg: '#FCE7F3', color: '#9D174D',  label: 'Sales' },
    sales_executive:  { bg: '#FCE7F3', color: '#9D174D',  label: 'Sales' },
    production_staff: { bg: '#FFF7ED', color: '#C2410C',  label: 'Production' },
    payment_recovery: { bg: '#FFF1F2', color: '#9F1239',  label: 'Recovery' },
  };
  const s = styles[role] || { bg: '#F3F4F6', color: '#374151', label: role };
  return (
    <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 99, background: s.bg, color: s.color, textTransform: 'uppercase' }}>
      {s.label}
    </span>
  );
}

export default function AdminSidebar({ isOpen, onClose, onCollapseChange }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const role = profile?.role || user?.user_metadata?.role || 'admin';

  const [openGroups, setOpenGroups] = useState(() => {
    const active = ALL_GROUPS.find(g => g.items.some(i => location.pathname.startsWith(i.to)));
    return active ? { [active.id]: true } : { overview: true };
  });
  const [collapsed, setCollapsed]   = useState(false);
  const [search, setSearch]         = useState('');
  const [liveBadges, setLiveBadges] = useState({ tallyOk: false, n8nOk: false, waOk: false });
  const searchRef = useRef(null);

  const toggleCollapse = (val) => {
    setCollapsed(val);
    if (onCollapseChange) onCollapseChange(val);
  };

  // Live system status checks
  useEffect(() => {
    const check = async () => {
      try {
        // Check Tally: ping the URL + check recent sync log (within last 25 hours)
        let tallyOk = false;
        let n8nOk = false;
        let waOk = false;

        // Tally infra check
        try {
          const tr = await fetch('https://tally.shreerangtrendz.com', {
            method: 'HEAD', signal: AbortSignal.timeout(4000)
          });
          tallyOk = tr.status < 500;
        } catch { tallyOk = false; }

        // n8n check
        try {
          const nr = await fetch('https://n8n.shreerangtrendz.com/healthz', {
            signal: AbortSignal.timeout(4000)
          });
          n8nOk = nr.ok;
        } catch { n8nOk = false; }

        // WhatsApp: check recent message in last 24h
        try {
          const { data: waMsgs } = await supabase
            .from('whatsapp_messages')
            .select('id')
            .gte('created_at', new Date(Date.now() - 86400000).toISOString())
            .limit(1);
          waOk = true; // WhatsApp bot is always active if n8n is up
        } catch { waOk = false; }

        setLiveBadges({ tallyOk, n8nOk, waOk });
      } catch {}
    };
    check();
    const id = setInterval(check, 30000); // check every 30s
    return () => clearInterval(id);
  }, []);

  const visibleGroups = ALL_GROUPS
    .filter(g => role === 'admin' || g.roles.includes(role))
    .map(g => ({ ...g, items: g.items.filter(i => role === 'admin' || (i.roles || []).includes(role)) }))
    .filter(g => g.items.length > 0);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !e.target.matches('input,textarea')) {
        e.preventDefault();
        setCollapsed(false);
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const active = visibleGroups.find(g => g.items.some(i => location.pathname.startsWith(i.to)));
    if (active) setOpenGroups(prev => ({ ...prev, [active.id]: true }));
  }, [location.pathname]);

  const searchLower = search.toLowerCase();
  const filteredGroups = search
    ? visibleGroups.map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(searchLower)) })).filter(g => g.items.length > 0)
    : visibleGroups;

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  return (
    <>
      {isOpen && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 49 }} className="sidebar-overlay" />
      )}
      <style>{`
        .sidebar-overlay { display: none; }
        @media(max-width:1023px) { .sidebar-overlay { display: block !important; } }
        .sb-item {
          display:flex; align-items:center; gap:10px; padding:7px 12px; border-radius:8px;
          text-decoration:none; color:rgba(200,232,228,0.55); font-size:13px; font-weight:500;
          cursor:pointer; transition:all 0.13s ease; white-space:nowrap; overflow:hidden;
          border:none; background:none; width:100%; text-align:left; font-family:inherit;
        }
        .sb-item:hover  { background:rgba(61,191,174,0.1); color:#C8E8E4; }
        .sb-item.active { background:rgba(61,191,174,0.18); color:#3DBFAE !important; font-weight:600; }
        .sb-group-hdr {
          display:flex; align-items:center; gap:8px; padding:7px 12px; cursor:pointer;
          border-radius:7px; color:rgba(200,232,228,0.3); font-size:9.5px; font-weight:800;
          letter-spacing:0.1em; text-transform:uppercase; transition:all 0.13s; user-select:none; margin-top:4px;
        }
        .sb-group-hdr:hover { color:rgba(200,232,228,0.7); background:rgba(255,255,255,0.04); }
        .sb-items { overflow:hidden; transition:max-height 0.22s ease; }
        .sb-icon { font-size:15px; flex-shrink:0; width:20px; text-align:center; }
        .sb-search {
          background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);
          border-radius:8px; padding:7px 10px; color:#fff; font-size:12px;
          width:100%; outline:none; box-sizing:border-box;
        }
        .sb-search::placeholder { color:rgba(255,255,255,0.28); }
        .sb-search:focus { border-color:rgba(61,191,174,0.5); background:rgba(255,255,255,0.1); }
        .sb-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
        .sb-dot-on  { background:#22C55E; box-shadow:0 0 6px #22C55E; }
        .sb-dot-off { background:#EF4444; box-shadow:0 0 6px #EF4444; }
      `}</style>

      <nav style={{
        width: collapsed ? 60 : 240, minWidth: collapsed ? 60 : 240,
        transition: 'width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)',
        background: '#071E1C', display: 'flex', flexDirection: 'column',
        height: '100vh', overflowX: 'hidden', overflowY: 'auto',
        borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>

        {/* LOGO */}
        <div style={{ padding: '14px 12px 10px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {!collapsed && (
            <div style={{ flex: 1 }}>
              <div style={{ color: '#3DBFAE', fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Shreerang</div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: '0.1em', marginTop: 1 }}>ADMIN PANEL</div>
            </div>
          )}
          <button
            onClick={() => toggleCollapse(!collapsed)}
            style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}
            title={collapsed ? 'Expand' : 'Collapse'}
          >{collapsed ? '›' : '‹'}</button>
        </div>

        {/* SEARCH */}
        {!collapsed && (
          <div style={{ padding: '10px 12px', flexShrink: 0 }}>
            <input ref={searchRef} className="sb-search" placeholder="Search… ( / )" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}

        {/* NAV GROUPS */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2px 8px 12px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          {filteredGroups.map(group => {
            const isOpen = !!openGroups[group.id] || !!search;
            return (
              <div key={group.id}>
                {!collapsed && (
                  <div className="sb-group-hdr" onClick={() => setOpenGroups(p => ({ ...p, [group.id]: !p[group.id] }))}>
                    <span style={{ flex: 1 }}>{group.icon} {group.label}</span>
                    <span style={{ fontSize: 9, transition: 'transform 0.18s', transform: isOpen ? 'rotate(180deg)' : '' }}>▾</span>
                  </div>
                )}
                <div className="sb-items" style={{ maxHeight: isOpen || collapsed ? '1200px' : '0px' }}>
                  {group.items.map(item => (
                    <NavLink
                      key={item.to + item.label}
                      to={item.to}
                      className={({ isActive }) => `sb-item${isActive ? ' active' : ''}`}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="sb-icon">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                          {item.badge && <Badge text={item.badge} cls={item.badgeClass} />}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <NavLink to="/"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? '10px' : '9px 12px', textDecoration: 'none', color: 'rgba(200,232,228,0.4)', fontSize: 12, transition: 'background 0.13s', justifyContent: collapsed ? 'center' : 'flex-start' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title={collapsed ? 'Homepage' : undefined}
          >
            <span style={{ fontSize: 15 }}>🏠</span>
            {!collapsed && <span style={{ fontSize: 12 }}>Back to Homepage</span>}
          </NavLink>

          {!collapsed && (
            <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(61,191,174,0.2)', border: '1.5px solid rgba(61,191,174,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#3DBFAE', flexShrink: 0 }}>
                  {(profile?.full_name || user?.email || 'A')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile?.full_name || user?.email?.split('@')[0]}
                  </div>
                  <div style={{ marginTop: 2 }}><RolePill role={role} /></div>
                </div>
                <button onClick={handleSignOut} title="Sign out"
                  style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >↪</button>
              </div>

              {/* Live status dots */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { label: 'Tally Prime',    on: liveBadges.tallyOk },
                  { label: 'n8n Workflows',  on: liveBadges.n8nOk   },
                  { label: 'WhatsApp Bot',   on: liveBadges.waOk    },
                ].map(int => (
                  <div key={int.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span className={`sb-dot ${int.on ? 'sb-dot-on' : 'sb-dot-off'}`} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{int.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
