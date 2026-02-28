import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Cloud, HardDrive, CheckCircle2, RefreshCw, Server } from 'lucide-react';

const CloudSyncPage = () => {
    const { toast } = useToast();
    const [driveConnected, setDriveConnected] = useState(false);
    const [bunnyConnected, setBunnyConnected] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const handleDriveConnect = () => {
        toast({ title: 'Connecting to Google Drive...', description: 'Initiating OAuth flow.' });
        setTimeout(() => {
            setDriveConnected(true);
            toast({ title: 'Google Drive Connected', description: 'Storage access granted.' });
        }, 1500);
    };

    const handleBunnyConnect = () => {
        setBunnyConnected(true);
        toast({ title: 'Bunny.net Connected', description: 'CDN Pull Zone linked successfully.' });
    };

    const handleSync = () => {
        if (!driveConnected || !bunnyConnected) {
            toast({ variant: 'destructive', title: 'Connection Missing', description: 'Please connect both accounts.' });
            return;
        }
        setSyncing(true);
        setTimeout(() => {
            setSyncing(false);
            toast({ title: 'Sync Complete', description: 'All assets synced with Bunny.net and Google Drive.' });
        }, 2500);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 border-l-4 border-blue-600 pl-3">Cloud Storage & Assets</h1>
                    <p className="text-slate-500 mt-2">Manage Google Drive backups and Bunny.net CDN connections.</p>
                </div>
                <Button onClick={handleSync} disabled={syncing} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Force Sync All'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Google Drive Card */}
                <Card className="shadow-md border-slate-200">
                    <CardHeader className="bg-slate-50 border-b pb-4">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 rounded-lg"><HardDrive className="h-6 w-6 text-blue-600" /></div>
                                <div>
                                    <CardTitle>Google Drive Setup</CardTitle>
                                    <CardDescription className="mt-1">Connect for automatic catalog backups.</CardDescription>
                                </div>
                            </div>
                            {driveConnected && <CheckCircle2 className="text-green-500 h-6 w-6" />}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <p className="text-sm text-slate-600">
                            Link your 2TB Google Drive to backup all high-resolution design files and auto-sync fabric master sheets.
                        </p>
                        {driveConnected ? (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center justify-between">
                                <span>Status: <strong>Active</strong></span>
                                <Button variant="outline" size="sm" onClick={() => setDriveConnected(false)}>Disconnect</Button>
                            </div>
                        ) : (
                            <Button className="w-full bg-slate-900 text-white hover:bg-slate-800" onClick={handleDriveConnect}>
                                Authorize Google Drive
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Bunny.net Card */}
                <Card className="shadow-md border-slate-200">
                    <CardHeader className="bg-slate-50 border-b pb-4">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-orange-100 rounded-lg"><Server className="h-6 w-6 text-orange-600" /></div>
                                <div>
                                    <CardTitle>Bunny.net CDN</CardTitle>
                                    <CardDescription className="mt-1">Global edge delivery for images.</CardDescription>
                                </div>
                            </div>
                            {bunnyConnected && <CheckCircle2 className="text-green-500 h-6 w-6" />}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <p className="text-sm text-slate-600">
                            Provide your API details to upload images directly to Bunny.net and serve them securely to the customer portal.
                        </p>
                        {bunnyConnected ? (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center justify-between">
                                <span>Pull Zone: <strong>shreerang-media.b-cdn.net</strong></span>
                                <Button variant="outline" size="sm" onClick={() => setBunnyConnected(false)}>Disconnect</Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <Input placeholder="Storage Zone Name" defaultValue="shreerang-media" />
                                <Input type="password" placeholder="API Key (Write Access)" defaultValue="xxxxxxxx-xxxx-xxxx" />
                                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" onClick={handleBunnyConnect}>
                                    Connect Bunny.net
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CloudSyncPage;
