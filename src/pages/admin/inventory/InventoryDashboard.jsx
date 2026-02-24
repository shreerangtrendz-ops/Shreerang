import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Warehouse, ScrollText, Database, AlertTriangle } from 'lucide-react';
import StockListPage from './StockListPage';
import StockTransactionsPage from './StockTransactionsPage';
import FabricDataImporter from './FabricDataImporter';

const InventoryDashboard = () => {
    const [activeTab, setActiveTab] = useState("stock-list");

    return (
        <>
            <Helmet><title>Inventory Management</title></Helmet>
            <div className="space-y-6">
                <AdminPageHeader 
                    title="Inventory Management" 
                    breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Inventory'}]}
                />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="stock-list" className="flex items-center gap-2"><Database className="h-4 w-4"/> Stock Overview</TabsTrigger>
                        <TabsTrigger value="transactions" className="flex items-center gap-2"><ScrollText className="h-4 w-4"/> Transactions</TabsTrigger>
                        <TabsTrigger value="alerts" className="flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Alerts</TabsTrigger>
                        <TabsTrigger value="import" className="flex items-center gap-2"><Warehouse className="h-4 w-4"/> Data Import</TabsTrigger>
                    </TabsList>

                    <TabsContent value="stock-list" className="space-y-4">
                        <StockListPage />
                    </TabsContent>

                    <TabsContent value="transactions">
                        <StockTransactionsPage />
                    </TabsContent>

                    <TabsContent value="alerts">
                        <div className="p-8 text-center border rounded-lg bg-slate-50 text-muted-foreground">
                            Alerts Configuration coming soon.
                        </div>
                    </TabsContent>

                    <TabsContent value="import">
                        <FabricDataImporter />
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
};

export default InventoryDashboard;