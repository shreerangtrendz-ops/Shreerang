import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { HardDrive, CheckCircle, Folder, RefreshCw, LogOut, ExternalLink, Calendar } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import GuidelinesFooter from '@/components/admin/GuidelinesFooter';
import { useToast } from '@/components/ui/use-toast';
import GoogleDriveAuthModal from '@/components/GoogleDriveAuthModal';
import { GoogleDriveService } from '@/services/GoogleDriveService';

const GoogleDriveSettings = () => {
    const { toast } = useToast();
    const [isConnected, setIsConnected] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [sessionInfo, setSessionInfo] = useState(null);
    const [settings, setSettings] = useState({
        autoUpload: true,
        compress: true,
        rootFolder: 'Shree Rang Trendz/Master'
    });

    useEffect(() => {
        checkConnection();
        
        const handleStatusChange = () => checkConnection();
        window.addEventListener('gdrive_connected', handleStatusChange);
        window.addEventListener('gdrive_disconnected', handleStatusChange);
        
        return () => {
            window.removeEventListener('gdrive_connected', handleStatusChange);
            window.removeEventListener('gdrive_disconnected', handleStatusChange);
        };
    }, []);

    const checkConnection = () => {
        const connected = GoogleDriveService.isAuthenticated();
        setIsConnected(connected);
        if (connected) {
            setSessionInfo(GoogleDriveService.getSession());
        } else {
            setSessionInfo(null);
        }
    };

    const handleDisconnect = () => {
        if(window.confirm("Are you sure you want to disconnect? Syncing will stop.")) {
            GoogleDriveService.signOut();
            toast({ title: 'Disconnected', description: 'Google Drive integration removed.' });
        }
    };

    const handleReauthorize = () => {
        setIsAuthModalOpen(true);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            <Helmet><title>Google Drive Settings</title></Helmet>
            <AdminPageHeader 
                title="Google Drive Integration" 
                breadcrumbs={[{label: 'Settings', href: '/admin/settings'}, {label: 'Google Drive'}]}
            />

            <GoogleDriveAuthModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                onAuthSuccess={() => toast({ title: "Connected", description: "Google Drive authorized successfully." })}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* STATUS CARD */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Connection Status</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center text-center space-y-4">
                        {isConnected ? (
                            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>
                        ) : (
                            <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
                                <HardDrive className="h-10 w-10 text-slate-400" />
                            </div>
                        )}
                        
                        <div>
                            <h3 className="font-semibold text-lg">{isConnected ? 'Connected' : 'Not Connected'}</h3>
                            <p className="text-sm text-muted-foreground">
                                {isConnected 
                                    ? `Token Active` 
                                    : 'Link your Google Account'}
                            </p>
                        </div>

                        {isConnected ? (
                            <div className="w-full space-y-2">
                                <Button variant="outline" className="w-full text-red-600 hover:text-red-700 gap-2" onClick={handleDisconnect}>
                                    <LogOut className="h-4 w-4" /> Disconnect
                                </Button>
                                {sessionInfo && sessionInfo.expires_at < Date.now() + 300000 && (
                                     <Button variant="secondary" className="w-full" onClick={handleReauthorize}>
                                        Re-authorize (Expiring)
                                     </Button>
                                )}
                            </div>
                        ) : (
                            <Button className="w-full gap-2" onClick={() => setIsAuthModalOpen(true)}>
                                <HardDrive className="h-4 w-4" /> Connect Drive
                            </Button>
                        )}
                        
                        {isConnected && sessionInfo && (
                            <div className="text-xs text-slate-400 flex items-center gap-1 justify-center mt-2">
                                <Calendar className="h-3 w-3" />
                                Expires: {new Date(sessionInfo.expires_at).toLocaleTimeString()}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* CONFIG CARD */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Sync Configuration</CardTitle>
                        <CardDescription>Manage how files are stored and organized.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Auto-Upload New Files</Label>
                                    <p className="text-xs text-muted-foreground">Automatically upload new fabrics/designs to Drive</p>
                                </div>
                                <Switch checked={settings.autoUpload} onCheckedChange={c => setSettings({...settings, autoUpload: c})} disabled={!isConnected} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Compress Before Upload</Label>
                                    <p className="text-xs text-muted-foreground">Reduce file size to save storage space</p>
                                </div>
                                <Switch checked={settings.compress} onCheckedChange={c => setSettings({...settings, compress: c})} disabled={!isConnected} />
                            </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t">
                            <Label>Root Folder Name</Label>
                            <div className="flex gap-2">
                                <Input value={settings.rootFolder} onChange={(e) => setSettings({...settings, rootFolder: e.target.value})} className="font-mono text-sm" />
                                <Button variant="outline" size="icon" disabled={!isConnected} title="Sync Folder Structure"><RefreshCw className="h-4 w-4" /></Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Files will be organized as: <code>{settings.rootFolder} / [Category] / [Design Number]</code>
                            </p>
                            <div className="flex gap-2 mt-2">
                                <Badge variant="secondary" className="flex gap-1"><Folder className="h-3 w-3"/> Fabric Master</Badge>
                                <Badge variant="secondary" className="flex gap-1"><Folder className="h-3 w-3"/> Garments</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <GuidelinesFooter 
                guidelines={[
                    { title: "Connect Account", description: "Click Connect and authorize access via the secure Google popup." },
                    { title: "Permissions", description: "We only request access to files created by this app (drive.file scope) for your security." },
                    { title: "Syncing", description: "Images are uploaded in background when you save a new Finish Fabric or Fancy Finish." }
                ]}
                relatedLinks={[
                    { label: "Google Account Permissions", path: "https://myaccount.google.com/permissions" }
                ]}
            />
        </div>
    );
};

export default GoogleDriveSettings;