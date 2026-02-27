import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import PageErrorBoundary from '@/components/common/PageErrorBoundary';
import AdminSidebar from './AdminSidebar';
import WhatsAppWidget from '@/components/common/WhatsAppWidget';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex bg-[var(--bg)] text-[var(--text)] font-sans antialiased min-h-screen relative w-full overflow-hidden">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <main className="main flex-1 w-full lg:ml-[252px] h-screen overflow-y-auto">
        <PageErrorBoundary>
          <Outlet context={{ setSidebarOpen, sidebarOpen }} />
        </PageErrorBoundary>
      </main>

      {/* WhatsApp Widget - Global for Admin */}
      <div className="hidden lg:block">
        <WhatsAppWidget />
      </div>
    </div>
  );
};

export default AdminLayout;