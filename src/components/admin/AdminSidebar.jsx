import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [lastSync, setLastSync] = useState(format(new Date(), 'hh:mm a'));

  // Define nav groups based on the HTML template
  const navGroups = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', href: '/admin/dashboard', icon: '⬡' }
      ]
    },
    {
      label: 'Fabric Master',
      items: [
        { label: 'Base Fabric', href: '/admin/fabric/base-fabric-form', icon: '🧵' },
        { label: 'Finish Fabric', href: '/admin/fabric/finish-fabric-form', icon: '🔄' },
        { label: 'Fancy Finish', href: '/admin/fabric/fancy-finish-fabric-form', icon: '✨' },
        { label: 'Bulk Import', href: '/admin/fabric-master/bulk-import', icon: '📦', badge: 'NEW', badgeColor: 'gold' }
      ]
    },
    {
      label: 'Design Catalogue',
      items: [
        { label: 'Design Upload', href: '/admin/images/upload', icon: '🎨' },
        { label: 'Product Master', href: '/admin/products', icon: '🗂' }
      ]
    },
    {
      label: 'Cost Engine',
      items: [
        { label: 'Cost Sheet Builder', href: '/admin/cost/cost-sheet', icon: '🧮' },
        { label: 'Purchase Fabric', href: '/admin/cost/purchase-entry', icon: '📥' },
        { label: 'Process Charges', href: '/admin/cost/process-entry', icon: '⚙️' },
        { label: 'Value Addition', href: '/admin/cost/value-addition-entry', icon: '💎' },
        { label: 'Price Database', href: '/admin/price-database', icon: '💰' }
      ]
    },
    {
      label: 'Operations',
      items: [
        { label: 'Orders', href: '/admin/order-database/sales', icon: '📋' },
        { label: 'Challans', href: '/admin/challans', icon: '📄' },
        { label: 'Vendor Master', href: '/admin/settings/suppliers', icon: '🏭' },
        { label: 'Job Worker Units', href: '/admin/settings/job-units', icon: '🏭' }
      ]
    },
    {
      label: 'Store & Sales',
      items: [
        { label: 'Store Sync', href: '/admin/store-sync', icon: '🛒', badge: 'LIVE', badgeColor: 'gold' },
        { label: 'Quick Price Check', href: '/admin/sales/quick-price', icon: '🏷' },
        { label: 'Store Dispatch', href: '/admin/orders/store-dispatch', icon: '🚚' }
      ]
    },
    {
      label: 'Settings/Integrations',
      items: [
        { label: 'Rate Card', href: '/admin/settings/rate-card', icon: '💵' },
        { label: 'Dropdown Manager', href: '/admin/settings/dropdown-manager', icon: '🔧' },
        { label: 'HSN Code Master', href: '/admin/settings/hsn-codes', icon: '🔢' }
      ]
    }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar sidebar */}
      <aside
        className={cn(
          "sidebar fixed lg:static top-0 left-0 bottom-0 z-50 h-screen transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="s-logo">
          <div className="brand-wrap">
            <div className="sr-icon">SR</div>
            <div>
              <div className="brand">Shreerang</div>
              <div className="trendz-pill">Trendz Pvt Ltd</div>
            </div>
          </div>
          <div className="tagline">Where Tradition Weaves its Magic</div>
          <div className="gstin">GSTIN: 24AAUCS2915F1Z8</div>
        </div>

        <div className="s-sync-bar">
          <div className="sync-dot"></div>
          <span>All systems syncing · Last: <span id="last-sync">{lastSync}</span></span>
        </div>

        <nav>
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="nav-group">
              <div className="nav-label">{group.label}</div>
              {group.items.map((item, iIdx) => (
                <NavLink
                  key={iIdx}
                  to={item.href}
                  className={({ isActive }) => cn(
                    "nav-item",
                    (isActive || location.pathname.includes(item.href)) && "active"
                  )}
                  onClick={() => window.innerWidth < 1024 && onClose()}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                  {item.badge && (
                    <span className={cn("nb", item.badgeColor === 'gold' && "gold")}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}

          {/* INTEGRATION STATUS */}
          <div className="int-bar mt-4 mb-4">
            <div className="int-bar-title">Integration Status</div>
            <div className="int-item"><div className="int-dot on"></div><span className="int-label">n8n Workflows</span><span className="int-status on">Active</span></div>
            <div className="int-item"><div className="int-dot on"></div><span className="int-label">Tally Prime</span><span className="int-status on">Synced</span></div>
            <div className="int-item"><div className="int-dot on"></div><span className="int-label">Google Drive</span><span className="int-status on">Online</span></div>
            <div className="int-item"><div className="int-dot on"></div><span className="int-label">Bunny.net CDN</span><span className="int-status on">Serving</span></div>
            <div className="int-item"><div className="int-dot warn"></div><span className="int-label">WhatsApp Meta</span><span className="int-status warn">Quota 82%</span></div>
          </div>
        </nav>

        {/* Brand leaf signature */}
        <div className="sidebar-brand-strip mt-auto mb-4">
          <div className="leaf-dot leaf-teal"></div>
          <div className="leaf-dot leaf-gold"></div>
          <div className="leaf-dot leaf-magenta"></div>
          <div className="leaf-dot leaf-amber"></div>
          <span>Where Tradition Weaves its Magic</span>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;