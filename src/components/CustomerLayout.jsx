import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageErrorBoundary from '@/components/common/PageErrorBoundary';

const CustomerLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <Navbar />
      <main className="flex-1">
        <PageErrorBoundary>
          <Outlet />
        </PageErrorBoundary>
      </main>
      <Footer />
    </div>
  );
};

export default CustomerLayout;