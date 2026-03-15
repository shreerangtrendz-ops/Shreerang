import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// ─── NAVIGATION STRUCTURE ─────────────────────────────────────────────────────
// Role-aware: 'admin' sees all, 'manager' sees all except Settings, others get filtered
const ALL_GROUPS = [
  {
    id: 'overview',
    label: 'Command',
    icon: '⬡',
    roles: ['admin','manager','accounts','operations'],
    items: [
      { icon: '⬡', label: 'Dashboard',       to: '/admin/dashboard',      roles: ['admin','manager','accounts','operations'] },
      { icon: '📊', label: 'Analytics',       to: '/admin/analytics',      roles: ['admin','manager'] },
      { icon: '📋', label: 'Activity Log',    to: '/admin/activity-logs',  roles: ['admin','manager'] },
    ]
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    icon: '🧵',
    roles: ['admin','manager'],
    items: [
      { icon: '🔩', label: 'Base Fabric',         to: '/admin/fabric/base-fabric-form',     roles: ['admin','manager'] },
      { icon: '🧵', label: 'Finish Fabric',        to: '/admin/fabric/finish-fabric-form',   roles: ['admin','manager'] },
      { icon: '🗂',  label: 'Fabric Catalogue',    to: '/admin/fabric/finish',               roles: ['admin','manager'] },
      { icon: '🎨', label: 'Design Upload',        to: '/admin/design/upload',               roles: ['admin','manager'], badge: 'NEW' },
      { icon: '💰', label: 'Designs & Pricing',    to: '/admin/fabric/finish',               roles: ['admin','manager'] },
      { icon: '📈', label: 'Design Velocity',      to: '/admin/design-velocity',             roles: ['admin','manager'], badge: 'AI' },
      { icon: '📦', label: 'Bulk Import',          to: '/admin/fabric-master/bulk-import',   roles: ['admin'] },
      { icon: '🖼',  label: 'Media Library',        to: '/admin/media-library',               roles: ['admin','manager'] },
      { icon: '🗂',  label: 'Product Master',       to: '/admin/products',                    roles: ['admin','manager'] },
    ]
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: '💰',
    roles: ['admin','manager','accounts'],
    items: [
      { icon: '🔄', label: 'Tally Sync',          to: '/admin/tally-sync',                       roles: ['admin','manager'], badge: 'LIVE', badgeClass: 'ok' },
      { icon: '📥', label: 'Purchase Bills',       to: '/admin/accounting/purchase-bills',        roles: ['admin','manager','accounts'] },
      { icon: '📤', label: 'Sales Bills',          to: '/admin/accounting/sales-bills',           roles: ['admin','manager','accounts'] },
      { icon: '🔧', label: 'Job Work Bills',       to: '/admin/accounting/job-work-bills',        roles: ['admin','manager','accounts'] },
      { icon: '💬', label: 'Quotations',           to: '/admin/accounting/quotations',            roles: ['admin','manager','accounts'] },
      { icon: '📈', label: 'Outstanding Recv',     to: '/admin/outstanding-receivable',           roles: ['admin','manager','accounts'] },
      { icon: '📉', label: 'Outstanding Pay',      to: '/admin/outstanding-payable',              roles: ['admin','manager','accounts'] },
      { icon: '🏦', label: 'Cash & Bank',          to: '/admin/cash-bank',                        roles: ['admin','manager','accounts'] },
      { icon: '📒', label: 'Party Ledger',         to: '/admin/reports/party-ledger',             roles: ['admin','manager','accounts'] },
      { icon: '📅', label: 'Day Book',             to: '/admin/reports/day-book',                 roles: ['admin','manager','accounts'] },
      { icon: '🧮', label: 'Cost Engine',          to: '/admin/cost/cost-sheet',                  roles: ['admin','manager'] },
      { icon: '💲', label: 'Price Database',       to: '/admin/price-database',                   roles: ['admin','manager'] },
    ]
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: '📦',
    roles: ['admin','manager','operations','sales'],
    items: [
      { icon: '📋', label: 'Sales Orders',         to: '/admin/orders',              roles: ['admin','manager','operations','sales'] },
      { icon: '👥', label: 'Customers',            to: '/admin/customers',           roles: ['admin','manager','operations','sales'] },
      { icon: '💬', label: 'Payment Reminders',    to: '/admin/payment-reminders',   roles: ['admin','manager','accounts','operations'] },
      { icon: '📦', label: 'Job Work Challans',    to: '/admin/challans',            roles: ['admin','manager','operations'] },
      { icon: '🏭', label: 'Production Tracker',  to: '/admin/manufacturing',       roles: ['admin','manager','operations'] },
      { icon: '🤝', label: 'Job Workers',          to: '/admin/job-workers',         roles: ['admin','manager','operations'] },
      { icon: '🎯', label: 'Make-to-Order',        to: '/admin/mto-orders',          roles: ['admin','manager','operations'], badge: 'NEW' },
      { icon: '📱', label: 'WhatsApp Bot',         to: '/admin/whatsapp',            roles: ['admin','manager'], badge: 'ON', badgeClass: 'ok' },
      { icon: '🛒', label: 'Store / Ecom',         to: '/admin/ecom',                roles: ['admin'] },
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '⚙️',
    roles: ['admin'],
    items: [
      { icon: '🛡',  label: 'Access Control',      to: '/admin/access-control',                   roles: ['admin'] },
      { icon: '👥', label: 'Staff Management',     to: '/admin/access-control',                   roles: ['admin'] },
      { icon: '🔧', label: 'Field Config',         to: '/admin/settings/dropdown-manager',        roles: ['admin'] },
      { icon: '🔢', label: 'HSN Codes',            to: '/admin/settings/hsn-codes',               roles: ['admin'] },
      { icon: '🏭', label: 'Job Work Units',       to: '/admin/settings/job-units',               roles: ['admin'] },
      { icon: '🔖', label: 'SKU Formula',          to: '/admin/settings/sku-formula',             roles: ['admin'] },
      { icon: '☁️',  label: 'Cloud Storage',        to: '/admin/cloud-sync',                       roles: ['admin'] },
      { icon: '💾', label: 'Backup',               to: '/admin/backup-control',                   roles: ['admin'] },
    ]
  }
];

const BADGE_STYLES = {
  ok:   { bg: '#D1FAE5', color: '#065F46' },
  warn: { bg: '#FEF3C7', color: '#92400E' },
  AI:   { bg: '#F3E8FF', color: '#7C3AED' },
  LIVE: { bg: '#D1FAE5', color: '#065F46' },
  ON:   { bg: '#D1FAE5', color: '#065F46' },
  NEW:  { bg: '#FEF3C7', color: '#B45309' },
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
    admin:      { bg: '#FEF3C7', color: '#B45309', label: 'Admin' },
    manager:    { bg: '#DBEAFE', color: '#1D4ED8', label: 'Manager' },
    accounts:   { bg: '#D1FAE5', color: '#065F46', label: 'Accounts' },
    operations: { bg: '#EDE9FE', color: '#5B21B6', label: 'Operations' },
    sales:      { bg: '#FCE7F3', color: '#9D174D', label: 'Sales' },
  };
  const s = styles[role] || { bg: '#F3F4F6', color: '#374151', label: role };
  return (
    <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.06em', padding: '2px 7px', borderRadius: 99, background: s.bg, color: s.color, textTransform: 'uppercase' }}>
      {s.label}
    </span>
  );
}

export default function AdminSidebar({ isOpen, onClose, onCollapseChange }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const role = profile?.role || 'admin'; // default to admin if profile not loaded yet

  const [openGroups, setOpenGroups] = useState(() => {
    const active = ALL_GROUPS.find(g => g.items.some(i => location.pathname.startsWith(i.to)));
    return active ? { [active.id]: true } : { overview: true };
  });
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

  const toggleCollapse = (val) => {
    setCollapsed(val);
    if (onCollapseChange) onCollapseChange(val);
  };

  // Filter groups by role
  const visibleGroups = ALL_GROUPS
    .filter(g => g.roles.includes(role) || role === 'admin')
    .map(g => ({
      ...g,
      items: g.items.filter(i => (i.roles || []).includes(role) || role === 'admin')
    }))
    .filter(g => g.items.length > 0);

  // Keyboard shortcut: / to focus search
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

  // Auto-open group on route change
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
          display: flex; align-items: center; gap: 10px;
          padding: 7px 12px; border-radius: 8px; text-decoration: none;
          color: rgba(200,232,228,0.55); font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.13s ease; white-space: nowrap;
          overflow: hidden; border: none; background: none; width: 100%;
          text-align: left; font-family: inherit;
        }
        .sb-item:hover { background: rgba(61,191,174,0.1); color: #C8E8E4; }
        .sb-item.active { background: rgba(61,191,174,0.18); color: #3DBFAE !important; font-weight: 600; }

        .sb-group-hdr {
          display: flex; align-items: center; gap: 8px; padding: 7px 12px;
          cursor: pointer; border-radius: 7px; color: rgba(200,232,228,0.3);
          font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; transition: all 0.13s; user-select: none;
          margin-top: 4px;
        }
        .sb-group-hdr:hover { color: rgba(200,232,228,0.7); background: rgba(255,255,255,0.04); }

        .sb-items { overflow: hidden; transition: max-height 0.22s ease; }
        .sb-icon { font-size: 15px; flex-shrink: 0; width: 20px; text-align: center; }

        .sb-search {
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; padding: 7px 10px; color: #fff; font-size: 12px;
          width: 100%; outline: none; box-sizing: border-box;
        }
        .sb-search::placeholder { color: rgba(255,255,255,0.28); }
        .sb-search:focus { border-color: rgba(61,191,174,0.5); background: rgba(255,255,255,0.1); }

        .sb-user-btn {
          display: flex; align-items: center; gap: 8px; padding: 9px 10px;
          border-radius: 8px; cursor: pointer; transition: background 0.13s;
          text-decoration: none; border: none; background: none; width: 100%;
          text-align: left; font-family: inherit;
        }
        .sb-user-btn:hover { background: rgba(255,255,255,0.07); }

        .sb-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
        }
        .sb-dot-on { background: #22C55E; box-shadow: 0 0 6px #22C55E; }
        .sb-dot-off { background: #EF4444; box-shadow: 0 0 6px #EF4444; }
      `}</style>

      <nav style={{
        width: collapsed ? 60 : 240, minWidth: collapsed ? 60 : 240,
        transition: 'width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)',
        background: '#071E1C',
        display: 'flex', flexDirection: 'column', height: '100vh',
        overflowX: 'hidden', overflowY: 'auto',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>

        {/* ── LOGO ── */}
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

        {/* ── SEARCH ── */}
        {!collapsed && (
          <div style={{ padding: '10px 12px', flexShrink: 0 }}>
            <input ref={searchRef} className="sb-search" placeholder="Search… ( / )" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}

        {/* ── NAV GROUPS ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2px 8px 12px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          {filteredGroups.map(group => {
            const isOpen = !!openGroups[group.id] || !!search;
            return (
              <div key={group.id}>
                {!collapsed && (
                  <div className="sb-group-hdr" onClick={() => setOpenGroups(p => ({ ...p, [group.id]: !p[group.id] }))}>
                    <span style={{ flex: 1 }}>{group.label}</span>
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

        {/* ── USER PROFILE FOOTER ── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {/* Homepage link */}
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: collapsed ? '10px' : '9px 12px', textDecoration: 'none', color: 'rgba(200,232,228,0.4)', fontSize: 12, transition: 'background 0.13s', justifyContent: collapsed ? 'center' : 'flex-start' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title={collapsed ? 'Homepage' : undefined}
          >
            <span style={{ fontSize: 15 }}>🏠</span>
            {!collapsed && <span style={{ fontSize: 12 }}>Back to Homepage</span>}
          </NavLink>

          {/* User card */}
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
                <button onClick={handleSignOut} title="Sign out" style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↪</button>
              </div>

              {/* Integration dots */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { label: 'Tally Prime', on: true },
                  { label: 'n8n Workflows', on: true },
                  { label: 'WhatsApp Bot', on: true },
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
