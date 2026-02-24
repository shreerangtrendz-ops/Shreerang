import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, FolderSync, Clock, AlertCircle } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const GoogleDriveSyncPage = () => {
  const { toast } = useToast();
  const [folderUrl, setFolderUrl] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [lastSync, setLastSync] = useState(null);

  const handleSync = () => {
    if (!folderUrl) return toast({ variant: 'destructive', title: 'Error', description: 'Please enter a Google Drive folder URL.' });

    setSyncing(true);
    setProgress(0);
    setLogs([]);

    // Mock Simulation of Sync Process
    const steps = [
        "Connecting to Google Drive...",
        "Scanning Inventory Folder...",
        "Found 3 Categories (Rayon, Cotton, Silk)...",
        "Scanning Subfolders for Widths...",
        "Processing images for 'Rayon/58 inch/Allover'...",
        "Syncing D101.jpg...",
        "Syncing D102.jpg...",
        "Updating database records...",
        "Sync Complete."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
        if (currentStep >= steps.length) {
            clearInterval(interval);
            setSyncing(false);
            setLastSync(new Date());
            toast({ title: "Sync Successful", description: "Design inventory updated from Drive." });
        } else {
            const stepMsg = steps[currentStep];
            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: stepMsg }]);
            setProgress(Math.round(((currentStep + 1) / steps.length) * 100));
            currentStep++;
        }
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <Helmet><title>Google Drive Sync</title></Helmet>
      <AdminPageHeader title="Google Drive Integration" breadcrumbs={[{label: 'Settings', href: '/admin/settings'}, {label: 'Drive Sync'}]} />

      <Card>
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><FolderSync className="h-6 w-6 text-blue-600"/> Design Inventory Sync</CardTitle>
              <CardDescription>Automatically sync design images and folders from your Google Drive to the inventory system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="space-y-2">
                  <label className="text-sm font-medium">Google Drive Folder URL</label>
                  <div className="flex gap-2">
                      <Input 
                        placeholder="https://drive.google.com/drive/folders/..." 
                        value={folderUrl}
                        onChange={(e) => setFolderUrl(e.target.value)}
                      />
                      <Button onClick={handleSync} disabled={syncing}>
                          {syncing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCw className="mr-2 h-4 w-4"/>}
                          Sync Now
                      </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Ensure the folder is shared with the system service account email.</p>
              </div>

              {lastSync && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded">
                      <CheckCircle className="h-4 w-4"/>
                      Last synced successfully at {lastSync.toLocaleString()}
                  </div>
              )}

              {syncing && (
                  <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                          <span>Sync Progress</span>
                          <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2"/>
                  </div>
              )}

              <div className="border rounded-lg bg-slate-900 text-slate-200 p-4 h-64 overflow-y-auto font-mono text-xs">
                  {logs.length === 0 ? (
                      <div className="text-slate-500 italic">Waiting for sync to start...</div>
                  ) : (
                      logs.map((log, i) => (
                          <div key={i} className="mb-1">
                              <span className="text-slate-500">[{log.time}]</span> {log.msg}
                          </div>
                      ))
                  )}
              </div>
          </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
              <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4"/> Auto-Sync Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                      <span className="text-sm">Frequency</span>
                      <select className="text-sm border rounded p-1 bg-white">
                          <option>Every 1 Hour</option>
                          <option>Every 6 Hours</option>
                          <option>Daily (Midnight)</option>
                      </select>
                  </div>
                  <div className="flex items-center justify-between">
                      <span className="text-sm">Auto-Sync Status</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                  </div>
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4"/> Folder Structure Guide</CardTitle>
              </CardHeader>
              <CardContent>
                  <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
                      <li>Root Folder (Inventory)</li>
                      <li>└─ Category (e.g., Rayon)</li>
                      <li>&nbsp;&nbsp;&nbsp;└─ Width (e.g., 58 inch)</li>
                      <li>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└─ Design Files (D101.jpg)</li>
                  </ul>
              </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default GoogleDriveSyncPage;