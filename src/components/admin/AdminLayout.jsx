import React, { useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import PageErrorBoundary from '@/components/common/PageErrorBoundary';
import '@/styles/admin.css';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className="admin-root"
      data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
      style={{ '--sidebar-w': sidebarCollapsed ? '60px' : '240px' }}
    >
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCollapseChange={setSidebarCollapsed}
      />

      {/* Mobile hamburger topbar (hidden on desktop) */}
      <div style={{
        display: 'none',
        position: 'sticky', top: 0, zIndex: 48,
        background: '#0B2E2B',
        borderBottom: '1px solid rgba(61,191,174,0.2)',
        padding: '10px 16px',
        alignItems: 'center', justifyContent: 'space-between',
      }} className="mobile-topbar">
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            background: 'rgba(61,191,174,0.15)', border: '1px solid rgba(61,191,174,0.3)',
            borderRadius: 8, padding: '7px 10px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
          }}
          aria-label="Open menu"
        >
          <span style={{ width: 18, height: 2, background: '#3DBFAE', borderRadius: 1, display: 'block' }} />
          <span style={{ width: 18, height: 2, background: '#3DBFAE', borderRadius: 1, display: 'block' }} />
          <span style={{ width: 13, height: 2, background: '#3DBFAE', borderRadius: 1, display: 'block' }} />
        </button>
        <div style={{ color: '#3DBFAE', fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>
          Shreerang
        </div>
        <div style={{ width: 36 }} />
      </div>

      <main className="admin-main" style={{ transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
        <PageErrorBoundary>
          <Outlet context={{ setSidebarOpen }} />
        </PageErrorBoundary>
      </main>

      <style>{`
        @media(max-width:1023px) {
          .mobile-topbar { display: flex !important; }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
