import React from 'react';
import AnalyticsDashboardComponent from '@/components/admin/AnalyticsDashboard';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const AnalyticsDashboardPage = () => {
    const navigate = useNavigate();
    return (
        <div className="space-y-6">
            <Helmet><title>Analytics - Admin</title></Helmet>
            <AdminPageHeader 
                title="Analytics & Performance" 
                breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Analytics' }]}
                onBack={() => navigate('/admin')}
            />
            <AnalyticsDashboardComponent />
        </div>
    );
};

export default AnalyticsDashboardPage;