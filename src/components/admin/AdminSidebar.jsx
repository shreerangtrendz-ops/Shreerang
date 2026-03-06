import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';


const navGroups = [
  {
    label: 'Overview',
    items: [
      { icon: '⬡', label: 'Dashboard', to: '/admin/dashboard' }
    ]
  },
  {
    label: 'Fabric Master',
    items: [
      { icon: '🧵', label: 'Base Fabric', to: '/admin/fabric/base-fabric-form' },
      { icon: '🔄', label: 'Finish Fabric', to: '/admin/fabric/finish-fabric-form' },
      { icon: '✨', label: 'Fancy Finish', to: '/admin/fabric/fancy-finish-fabric-form' },
    ]
  },
  {
    label: 'Design Catalogue',
    items: [
      { icon: '🎨', label: 'Design Upload', to: '/admin/design/upload', nb: '14', nbClass: 'warn' },
      { icon: '📈', label: 'Design Velocity', to: '/admin/design-velocity', nb: 'NEW', nbClass: 'gold' },
      { icon: '📦', label: 'Bulk Upload', to: '/admin/fabric-master/bulk-import', nb: 'NEW', nbClass: 'gold' },
      { icon: '🗂', label: 'Product Master', to: '/admin/products' },
    ]
  },
  {
    label: 'Cost Engine',
    items: [
      { icon: '🧮', label: 'Cost Sheet Builder', to: '/admin/cost/cost-sheet' },
      { icon: '📥', label: 'Purchase Fabric', to: '/admin/cost/purchase-entry' },
      { icon: '⚙️', label: 'Process Charges', to: '/admin/cost/process-entry' },
      { icon: '💎', label: 'Value Addition', to: '/admin/cost/value-addition-entry' },
      { icon: '💰', label: 'Price Database', to: '/admin/price-database' },
    ]
  },
  {
    label: 'Store',
    items: [
      { icon: '🛒', label: 'Store Sync', to: '/admin/store-sync', nb: 'LIVE', nbClass: 'gold' },
      { icon: '🛒', label: 'Ecom Control', to: '/admin/ecom' },
    ]
  },
  {
    label: 'Operations',
    items: [
      { icon: '📋', label: 'Orders', to: '/admin/order-database/sales', nb: '3' },
      { icon: '📄', label: 'Challans', to: '/admin/challans' },
      { icon: '🏭', label: 'Vendor Master', to: '/admin/settings/suppliers' },
      { icon: '👥', label: 'Customers', to: '/admin/customers' },
      { icon: '📡', label: 'Market Intelligence', to: '/admin/market-intel', nb: 'NEW', nbClass: '' },
      { icon: '🎯', label: 'Make-to-Order', to: '/admin/mto-orders', nb: 'NEW', nbClass: 'gold' },
    ]
  },
  {
    label: 'Reports',
    items: [
      { icon: '💰', label: 'Outstanding Receivable', to: '/admin/outstanding-receivable' },
      { icon: '📤', label: 'Outstanding Payable', to: '/admin/outstanding-payable' },
      { icon: '🏦', label: 'Cash & Bank Balance', to: '/admin/cash-bank' },
    ]
  },
  {
    label: 'Smart Features',
    items: [
      { icon: '📅', label: 'Calendar & Visits', to: '/admin/calendar', nb: 'NEW', nbClass: 'gold' },
      { icon: '🔔', label: 'WA Price Alerts', to: '/admin/supplier-price-ai', nb: '4', nbClass: 'warn' },
      { icon: '🌐', label: 'Multilingual Comms', to: '/admin/multilingual', nb: 'NEW', nbClass: 'gold' },
      { icon: '🏦', label: 'Customer 360°', to: '/admin/customer-360' },
      { icon: '⏰', label: 'Payment Reminders', to: '/admin/payment-reminders', nb: '7' },
    ]
  },
  {
    label: 'CRM & Access',
    items: [
      { icon: '📍', label: 'Field Visit Tracker', to: '/admin/field-visits', nb: 'NEW', nbClass: 'gold' },
      { icon: '🗺', label: 'Sales Team Map', to: '/admin/team-tracker', nb: 'NEW', nbClass: 'gold' },
      { icon: '🔐', label: 'Customer Portal Access', to: '/admin/customer-portal', nb: 'NEW', nbClass: 'gold' },
      { icon: '🛡', label: 'Access Control', to: '/admin/access-control', nb: 'NEW', nbClass: 'gold' },
    ]
  },
  {
    label: 'Integrations',
    items: [
      { icon: '💬', label: 'WhatsApp Bot', to: '/admin/whatsapp', nb: 'ON', nbClass: 'ok' },
      { icon: '🔄', label: 'Tally Sync', to: '/admin/tally-sync', nb: 'SYNC', nbClass: 'ok' },
      { icon: '☁️', label: 'Cloud Storage', to: '/admin/cloud-sync' },
      { icon: '🤖', label: 'AI Price Sync', to: '/admin/ai-pricing' },
    ]
  },
  {
    label: 'Settings',
    items: [
      { icon: '🔧', label: 'Field Configurator', to: '/admin/settings/dropdown-manager', nb: 'NEW', nbClass: 'gold' },
      { icon: '🏷', label: 'SKU Formula Builder', to: '/admin/settings/rate-card', nb: 'NEW', nbClass: 'gold' },
      { icon: '🔢', label: 'HSN Code Master', to: '/admin/settings/hsn-codes' },
      { icon: '🏭', label: 'Job Work Units', to: '/admin/settings/job-units' },
    ]
  }
];

const integrations = [
  { label: 'n8n Workflows', status: 'on', text: 'Active' },
  { label: 'Tally Prime', status: 'on', text: 'Synced' },
  { label: 'Google Drive', status: 'on', text: 'Online' },
  { label: 'Bunny.net CDN', status: 'on', text: 'Serving' },
  { label: 'WhatsApp Meta', status: 'warn', text: 'Quota 82%' },
  { label: 'KVM-1 Server', status: 'on', text: 'Online' },
  { label: 'Appsmith', status: 'warn', text: 'Deploying' },
  { label: 'AI Translate', status: 'on', text: 'Active' },
  { label: 'WA Price AI', status: 'warn', text: '4 Pending' },
];

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [syncTime, setSyncTime] = useState('just now');

  useEffect(() => {
    const now = new Date();
    setSyncTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  }, []);

  const isActive = (to) => {
    if (!to) return false;
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  return (
    <aside className={`sidebar${isOpen ? '' : ' sidebar-mobile-hidden'}`}>
      {/* 1. Logo */}
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

      {/* 2. Sync status */}
      <div className="s-sync-bar">
        <div className="sync-dot"></div>
        <span>All systems syncing · Last: <span>{syncTime}</span></span>
      </div>

      {/* 3. Navigation */}
      <nav>
        {navGroups.map((group, gi) => (
          <div className="nav-group" key={gi}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((item, ii) => {
              // External link (e.g. Tally)
              if (item.href) {
                return (
                  <a
                    key={ii}
                    className="nav-item"
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => window.innerWidth < 1024 && onClose()}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                    {item.nb && <span className={`nb${item.nbClass ? ` ${item.nbClass}` : ''}`}>{item.nb}</span>}
                  </a>
                );
              }
              return (
                <NavLink
                  key={ii}
                  to={item.to}
                  className={() => `nav-item${isActive(item.to) ? ' active' : ''}`}
                  onClick={() => window.innerWidth < 1024 && onClose()}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                  {item.nb && <span className={`nb${item.nbClass ? ` ${item.nbClass}` : ''}`}>{item.nb}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 4. Integration status */}
      <div className="int-bar">
        <div className="int-bar-title">Integration Status</div>
        {integrations.map((int, i) => (
          <div className="int-item" key={i}>
            <div className={`int-dot ${int.status}`}></div>
            <span className="int-label">{int.label}</span>
            <span className={`int-status ${int.status}`}>{int.text}</span>
          </div>
        ))}
      </div>

      {/* 5. Brand leaf signature */}
      <div className="sidebar-brand-strip">
        <div className="leaf-dot leaf-teal"></div>
        <div className="leaf-dot leaf-gold"></div>
        <div className="leaf-dot leaf-magenta"></div>
        <div className="leaf-dot leaf-amber"></div>
        <span>Where Tradition Weaves its Magic</span>
      </div>
    </aside>
  );
};

export default AdminSidebar;