import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

// ─── NAVIGATION CONFIG ───────────────────────────────────────────────────────
// 5 core groups instead of 11 — cleaner, faster to navigate
const NAV_GROUPS = [
  {
    id: 'overview',
    icon: '⬡',
    label: 'Overview',
    color: '#2BA898',
    items: [
      { icon: '⬡', label: 'Dashboard', to: '/admin/dashboard' },
      { icon: '📊', label: 'Analytics', to: '/admin/analytics' },
      { icon: '📋', label: 'Activity Log', to: '/admin/activity-logs' },
    ]
  },
  {
    id: 'catalogue',
    icon: '🧵',
    label: 'Catalogue',
    color: '#3DBFAE',
    items: [
      { icon: '🧵', label: 'Base Fabric', to: '/admin/fabric/base-fabric-form' },
      { icon: '🔄', label: 'Finish Fabric', to: '/admin/fabric/finish-fabric-form' },
      { icon: '✨', label: 'Fancy Finish', to: '/admin/fabric/fancy-finish-fabric-form' },
      { icon: '🎨', label: 'Design Upload', to: '/admin/design/upload', badge: 'NEW' },
      { icon: '📈', label: 'Design Velocity', to: '/admin/design-velocity', badge: 'AI' },
      { icon: '📦', label: 'Bulk Import', to: '/admin/fabric-master/bulk-import' },
      { icon: '🗂', label: 'Product Master', to: '/admin/products' },
      { icon: '🖼', label: 'Media Library', to: '/admin/media-library' },
    ]
  },
  {
    id: 'accounts',
    icon: '🧮',
    label: 'Accounts',
    color: '#D4920A',
    items: [
      { icon: '🔄', label: 'Tally Sync', to: '/admin/tally-sync', badge: 'LIVE', badgeClass: 'ok' },
      { icon: '📥', label: 'Purchase Bills', to: '/admin/accounting/purchase-bills' },
      { icon: '📤', label: 'Sales Bills', to: '/admin/accounting/sales-bills' },
      { icon: '🔧', label: 'Job Work Bills', to: '/admin/accounting/job-work-bills' },
      { icon: '💬', label: 'Quotations', to: '/admin/accounting/quotations' },
      { icon: '💰', label: 'Outstanding Recv', to: '/admin/outstanding-receivable' },
      { icon: '📤', label: 'Outstanding Pay', to: '/admin/outstanding-payable' },
      { icon: '🏦', label: 'Cash & Bank', to: '/admin/cash-bank' },
      { icon: '📒', label: 'Party Ledger', to: '/admin/reports/party-ledger' },
      { icon: '📅', label: 'Day Book', to: '/admin/reports/day-book' },
      { icon: '🧮', label: 'Cost Engine', to: '/admin/cost/cost-sheet' },
      { icon: '💰', label: 'Price Database', to: '/admin/price-database' },
    ]
  },
  {
    id: 'operations',
    icon: '📋',
    label: 'Operations',
    color: '#2BA898',
    items: [
      { icon: '📋', label: 'Sales Orders', to: '/admin/orders' },
      { icon: '📦', label: 'Job Work Challans', to: '/admin/challans' },
      { icon: '🏭', label: 'Manufacturing Entry', to: '/admin/manufacturing' },
      { icon: '🏭', label: 'Vendors', to: '/admin/settings/suppliers' },
      { icon: '👥', label: 'Customers', to: '/admin/customers' },
      { icon: '🤝', label: 'Job Workers', to: '/admin/job-workers' },
      { icon: '🎯', label: 'Make-to-Order', to: '/admin/mto-orders', badge: 'NEW' },
      { icon: '🛒', label: 'Store / Ecom', to: '/admin/ecom' },
      { icon: '💬', label: 'WhatsApp Bot', to: '/admin/whatsapp', badge: 'ON', badgeClass: 'ok' },
    ]
  },
  {
    id: 'settings',
    icon: '⚙️',
    label: 'Settings',
    color: '#6b7280',
    items: [
      { icon: '🔧', label: 'Field Config', to: '/admin/settings/dropdown-manager' },
      { icon: '🔢', label: 'HSN Codes', to: '/admin/settings/hsn-codes' },
      { icon: '🏭', label: 'Job Work Units', to: '/admin/settings/job-units' },
      { icon: '☁️', label: 'Cloud Storage', to: '/admin/cloud-sync' },
      { icon: '🛡', label: 'Access Control', to: '/admin/access-control' },
      { icon: '💾', label: 'Backup', to: '/admin/backup-control' },
    ]
  }
];

// ─── BADGE STYLES ─────────────────────────────────────────────────────────────
const BADGE_STYLES = {
  ok:   { bg: '#d1fae5', color: '#065f46' },
  warn: { bg: '#fef3c7', color: '#92400e' },
  gold: { bg: '#fef3c7', color: '#b45309' },
  teal: { bg: '#ccfbf1', color: '#0f766e' },
  default: { bg: '#e0f2fe', color: '#0369a1' },
  AI:   { bg: '#f3e8ff', color: '#7c3aed' },
  LIVE: { bg: '#d1fae5', color: '#065f46' },
  ON:   { bg: '#d1fae5', color: '#065f46' },
  NEW:  { bg: '#fef3c7', color: '#b45309' },
};

function Badge({ text, cls }) {
  const style = BADGE_STYLES[cls] || BADGE_STYLES[text] || BADGE_STYLES.default;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
      padding: '2px 6px', borderRadius: 20,
      background: style.bg, color: style.color,
      marginLeft: 'auto', flexShrink: 0,
    }}>{text}</span>
  );
}

export default function AdminSidebar({ isOpen, onClose, onCollapseChange }) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState(() => {
    // Auto-open the group that contains the current route
    const active = NAV_GROUPS.find(g => g.items.some(i => location.pathname.startsWith(i.to)));
    return active ? { [active.id]: true } : { overview: true, accounts: true };
  });
  const [collapsed, setCollapsed] = useState(false);
  const toggleCollapse = (val) => {
    setCollapsed(val);
    if (onCollapseChange) onCollapseChange(val);
  };
  const [search, setSearch] = useState('');
  const searchRef = useRef(null);

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
    const active = NAV_GROUPS.find(g => g.items.some(i => location.pathname.startsWith(i.to)));
    if (active) setOpenGroups(prev => ({ ...prev, [active.id]: true }));
  }, [location.pathname]);

  const toggleGroup = (id) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Search filter
  const searchLower = search.toLowerCase();
  const filteredGroups = search
    ? NAV_GROUPS.map(g => ({
        ...g,
        items: g.items.filter(i => i.label.toLowerCase().includes(searchLower))
      })).filter(g => g.items.length > 0)
    : NAV_GROUPS;

  const sidebarStyle = {
    width: collapsed ? 60 : 240,
    minWidth: collapsed ? 60 : 240,
    transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)',
    background: 'var(--sidebar-bg, #0B2E2B)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflowX: 'hidden',
    overflowY: 'auto',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
    position: 'relative',
    zIndex: 50,
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 49, display: 'none'
          }}
          className="sidebar-overlay"
        />
      )}

      <style>{`
        .sidebar-overlay { display: block !important; }
        @media(min-width:1024px) { .sidebar-overlay { display: none !important; } }

        .sb-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 7px 12px; border-radius: 8px; text-decoration: none;
          color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.15s ease; white-space: nowrap;
          overflow: hidden;
        }
        .sb-nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .sb-nav-item.active { background: rgba(43,168,152,0.2); color: #3DBFAE !important; }

        .sb-group-header {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px; cursor: pointer; border-radius: 6px;
          color: rgba(255,255,255,0.35); font-size: 10px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          transition: color 0.15s; user-select: none;
        }
        .sb-group-header:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.04); }

        .sb-group-items {
          overflow: hidden; transition: max-height 0.25s ease;
        }

        .sb-icon { font-size: 16px; flex-shrink: 0; width: 20px; text-align: center; }

        .sb-search {
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; padding: 6px 10px; color: #fff; font-size: 12px;
          width: 100%; outline: none; transition: border-color 0.15s;
        }
        .sb-search::placeholder { color: rgba(255,255,255,0.3); }
        .sb-search:focus { border-color: rgba(43,168,152,0.6); }

        .sb-collapse-btn {
          display: flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 6px; cursor: pointer;
          color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.05);
          border: none; transition: all 0.15s; flex-shrink: 0;
        }
        .sb-collapse-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

        .sb-integration-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #22c55e; flex-shrink: 0;
          box-shadow: 0 0 6px #22c55e;
        }
      `}</style>

      <nav style={sidebarStyle}>
        {/* ── LOGO / HEADER ── */}
        <div style={{
          padding: '16px 12px 10px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0
        }}>
          {!collapsed && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ color: '#3DBFAE', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>
                Shreerang
              </div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: '0.06em' }}>
                ADMIN PANEL
              </div>
            </div>
          )}
          <button
            className="sb-collapse-btn"
            onClick={() => toggleCollapse(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* ── SEARCH ── */}
        {!collapsed && (
          <div style={{ padding: '10px 12px', flexShrink: 0 }}>
            <input
              ref={searchRef}
              className="sb-search"
              placeholder="Search… ( / )"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        {/* ── NAV GROUPS ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 16px' }}>
          {filteredGroups.map(group => {
            const isOpen = !!openGroups[group.id] || !!search;
            return (
              <div key={group.id} style={{ marginBottom: 4 }}>
                {!collapsed && (
                  <div
                    className="sb-group-header"
                    onClick={() => toggleGroup(group.id)}
                    style={{ color: isOpen ? 'rgba(255,255,255,0.55)' : undefined }}
                  >
                    <span style={{ flex: 1 }}>{group.label}</span>
                    <span style={{ fontSize: 10, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </div>
                )}
                <div
                  className="sb-group-items"
                  style={{ maxHeight: (isOpen || collapsed) ? '800px' : '0px' }}
                >
                  {group.items.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `sb-nav-item${isActive ? ' active' : ''}`}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="sb-icon">{item.icon}</span>
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.label}
                          </span>
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

        {/* ── INTEGRATION STATUS BAR ── */}
        {!collapsed && (
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0
          }}>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase' }}>
              Integrations
            </div>
            {[
              { label: 'Tally Prime', status: true },
              { label: 'n8n Workflows', status: true },
              { label: 'WhatsApp Bot', status: true },
            ].map(int => (
              <div key={int.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div className="sb-integration-dot" style={{ background: int.status ? '#22c55e' : '#ef4444', boxShadow: `0 0 6px ${int.status ? '#22c55e' : '#ef4444'}` }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{int.label}</span>
              </div>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}
