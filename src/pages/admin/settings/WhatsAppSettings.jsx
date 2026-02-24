import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MessageSquare, Settings, CheckCircle, XCircle } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import WhatsAppSetupModal from '@/components/admin/settings/WhatsAppSetupModal';
import { useNavigate } from 'react-router-dom';

const WhatsAppSettings = () => {
    const navigate = useNavigate();
    const [setupOpen, setSetupOpen] = useState(false);
    const [connected, setConnected] = useState(false); // Mock state

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            <Helmet><title>WhatsApp Settings</title></Helmet>
            <AdminPageHeader 
                title="WhatsApp Integration Settings" 
                breadcrumbs={[{label: 'Settings', href: '/admin/settings'}, {label: 'WhatsApp'}]}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Status</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center text-center space-y-4">
                        {connected ? (
                            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>
                        ) : (
                            <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
                                <MessageSquare className="h-10 w-10 text-slate-400" />
                            </div>
                        )}
                        
                        <div>
                            <h3 className="font-semibold text-lg">{connected ? 'Connected' : 'Not Configured'}</h3>
                            <p className="text-sm text-muted-foreground">{connected ? 'Messaging active' : 'API not linked'}</p>
                        </div>

                        <Button 
                            className="w-full" 
                            variant={connected ? "outline" : "default"}
                            onClick={() => setSetupOpen(true)}
                        >
                            {connected ? 'Reconfigure' : 'Setup Integration'}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Integration Details</CardTitle>
                        <CardDescription>Manage your Meta Business API connection.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {connected ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground block">Phone Number</span>
                                        <span className="font-medium">+91 98765 43210</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">WABA ID</span>
                                        <span className="font-medium">100568...</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Quality Rating</span>
                                        <span className="text-green-600 font-medium">High</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Messaging Limit</span>
                                        <span className="font-medium">1K / 24h</span>
                                    </div>
                                </div>
                                <Button variant="secondary" onClick={() => navigate('/admin/marketing/whatsapp-broadcast')}>
                                    Go to Messaging Dashboard
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Alert>
                                    <Settings className="h-4 w-4" />
                                    <AlertTitle>Configuration Required</AlertTitle>
                                    <AlertDescription>
                                        You need a Meta Business Account and a WhatsApp Business API phone number to proceed.
                                    </AlertDescription>
                                </Alert>
                                <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                                    <li>Automated Order Confirmations</li>
                                    <li>Shipping Updates</li>
                                    <li>Marketing Broadcasts</li>
                                    <li>Customer Support Bot</li>
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <WhatsAppSetupModal isOpen={setupOpen} onClose={() => setSetupOpen(false)} />
        </div>
    );
};

export default WhatsAppSettings;