import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import SupplierList from '@/pages/admin/people/SupplierList';
import JobWorkerList from '@/pages/admin/job-workers/JobWorkerList';

const PeopleManagement = () => {
    return (
        <div className="space-y-6">
            <Helmet><title>People Management</title></Helmet>
            <AdminPageHeader 
                title="People Management" 
                breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'People'}]}
            />

            <Tabs defaultValue="suppliers" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                    <TabsTrigger value="workers">Job Workers</TabsTrigger>
                </TabsList>

                <TabsContent value="suppliers" className="mt-6">
                    <SupplierList />
                </TabsContent>

                <TabsContent value="workers" className="mt-6">
                    <JobWorkerList />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default PeopleManagement;