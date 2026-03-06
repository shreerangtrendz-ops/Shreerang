import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import PageErrorBoundary from '@/components/common/PageErrorBoundary';
import '@/styles/admin.css';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync sidebar collapsed state via CSS custom property on :root
  // The sidebar itself controls collapse internally — we just listen via
  // a data attribute set on the layout for margin-left transitions
  return (
    <div
      className="admin-root"
      data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
      style={{
        // Override the static --sidebar-w with the dynamic value
        '--sidebar-w': sidebarCollapsed ? '60px' : '240px',
      }}
    >
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCollapseChange={setSidebarCollapsed}
      />

      <main className="admin-main" style={{
        transition: 'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <PageErrorBoundary>
          <Outlet context={{ setSidebarOpen }} />
        </PageErrorBoundary>
      </main>
    </div>
  );
};

export default AdminLayout;
