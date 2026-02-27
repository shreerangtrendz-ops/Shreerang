import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageErrorBoundary from '@/components/common/PageErrorBoundary';
import '@/styles/admin.css';

const CustomerLayout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <PageErrorBoundary>
          <Outlet />
        </PageErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

export default CustomerLayout;