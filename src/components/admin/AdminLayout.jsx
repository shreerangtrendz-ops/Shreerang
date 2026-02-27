import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import PageErrorBoundary from '@/components/common/PageErrorBoundary';
import '@/styles/admin.css';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-root">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(11,46,43,0.5)',
            zIndex: 190,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="admin-main">
        <PageErrorBoundary>
          <Outlet context={{ setSidebarOpen }} />
        </PageErrorBoundary>
      </main>
    </div>
  );
};

export default AdminLayout;