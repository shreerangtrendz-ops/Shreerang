import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import WhatsAppSetupModal from '@/components/admin/settings/WhatsAppSetupModal';
import WhatsAppMessagePanel from '@/components/admin/whatsapp/WhatsAppMessagePanel';
import { MessageSquare, Users, TrendingUp, Settings } from 'lucide-react';
import WhatsAppAnalytics from '@/pages/admin/analytics/WhatsAppAnalytics'; // Reuse existing analytics

const WhatsAppDashboard = () => {
    const [setupOpen, setSetupOpen] = useState(false);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <Helmet><title>WhatsApp Dashboard</title></Helmet>
            <AdminPageHeader 
                title="WhatsApp Integration" 
                breadcrumbs={[{label: 'Marketing', href: '/admin/marketing'}, {label: 'WhatsApp'}]}
                actions={
                    <Button variant="outline" onClick={() => setSetupOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" /> Configuration
                    </Button>
                }
            />

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12,345</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Contacts</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+2350</div>
                        <p className="text-xs text-muted-foreground">+180 new this week</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">98.2%</div>
                        <p className="text-xs text-muted-foreground">+1.2% improvement</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="messages" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="messages">Message Center</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                </TabsList>
                
                <TabsContent value="messages" className="space-y-4">
                    <WhatsAppMessagePanel />
                </TabsContent>
                
                <TabsContent value="analytics" className="space-y-4">
                    <WhatsAppAnalytics />
                </TabsContent>

                <TabsContent value="templates" className="space-y-4">
                    <Card>
                        <CardContent className="p-10 text-center text-muted-foreground">
                            <p>Template management coming soon.</p>
                            <Button variant="outline" className="mt-4">Sync Templates from Meta</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <WhatsAppSetupModal isOpen={setupOpen} onClose={() => setSetupOpen(false)} />
        </div>
    );
};

export default WhatsAppDashboard;