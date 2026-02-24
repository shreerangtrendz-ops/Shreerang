import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Database, Trash2, Search, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { 
  seedDropdownsDirectly, 
  clearAllDropdowns, 
  verifyDropdownData 
} from '@/lib/seedDropdownsDirectly';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

const SeedDataPage = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [verificationStats, setVerificationStats] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { toast } = useToast();

  const addLog = (type, message) => {
    setLogs(prev => [{ type, message, timestamp: new Date().toLocaleTimeString() }, ...prev]);
  };

  const handleSeed = async () => {
    setLoading(true);
    addLog('info', '🌱 Starting seed process...');
    try {
      const result = await seedDropdownsDirectly();
      if (result.success) {
        addLog('success', `✅ Seeding Complete. Categories: ${result.results.addedCategories}, Options: ${result.results.addedOptions}`);
        toast({ title: "Seeding Successful", description: `Added ${result.results.addedOptions} options.` });
        if (result.results.errors.length > 0) {
          result.results.errors.forEach(err => addLog('error', `⚠️ ${err}`));
        }
        // Auto verify after seed
        handleVerify();
      } else {
        addLog('error', `❌ Critical Error: ${result.error}`);
        toast({ variant: "destructive", title: "Seeding Failed", description: result.error });
      }
    } catch (err) {
      addLog('error', `❌ Unexpected Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    setShowClearConfirm(false);
    addLog('warning', '🗑️ Attempting to clear all dropdown data...');
    try {
      const result = await clearAllDropdowns();
      if (result.success) {
        addLog('success', '✅ Database cleared successfully.');
        toast({ title: "Database Cleared", description: "All dropdown categories and options removed." });
        setVerificationStats(null);
      } else {
        addLog('error', `❌ Clear Failed: ${result.error}`);
        toast({ variant: "destructive", title: "Clear Failed", description: result.error });
      }
    } catch (err) {
      addLog('error', `❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    addLog('info', '🔍 Verifying database state...');
    try {
      const result = await verifyDropdownData();
      if (result.success) {
        setVerificationStats(result.stats);
        addLog('info', `📊 Status: ${result.stats.totalCategories} Categories, ${result.stats.totalOptions} Options found.`);
        toast({ title: "Verification Complete", description: "Stats updated." });
      } else {
        addLog('error', `❌ Verification Failed: ${result.error}`);
      }
    } catch (err) {
      addLog('error', `❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 p-6">
      <Helmet><title>Seed Data | Admin</title></Helmet>
      
      <AdminPageHeader 
        title="Seed Dropdown Data" 
        description="Manage master data initialization for dropdowns."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Actions Panel */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Execute database operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleSeed} 
              disabled={loading} 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              Seed All Dropdowns
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleVerify} 
              disabled={loading} 
              className="w-full border-blue-200 hover:bg-blue-50 text-blue-700"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Verify Data
            </Button>

            <div className="pt-4 border-t">
              <Button 
                variant="destructive" 
                onClick={() => setShowClearConfirm(true)} 
                disabled={loading} 
                className="w-full"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Clear All Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status & Results Panel */}
        <div className="md:col-span-2 space-y-6">
          {verificationStats && (
            <Card className="border-blue-100 bg-blue-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                  <CheckCircle className="h-5 w-5 text-blue-600" /> Current Database State
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-slate-500 uppercase font-bold">Categories</p>
                    <p className="text-2xl font-mono text-blue-600">{verificationStats.totalCategories}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-slate-500 uppercase font-bold">Options</p>
                    <p className="text-2xl font-mono text-blue-600">{verificationStats.totalOptions}</p>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-2">Breakdown</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(verificationStats.categoryCounts).map(([cat, count]) => (
                      <Badge key={cat} variant="secondary" className="font-mono text-xs">
                        {cat}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Operation Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] overflow-y-auto bg-slate-950 text-slate-300 p-4 rounded-md font-mono text-sm space-y-1">
                {logs.length === 0 && <p className="text-slate-600 italic">No logs yet...</p>}
                {logs.map((log, i) => (
                  <div key={i} className={`flex gap-2 ${
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'success' ? 'text-green-400' : 
                    log.type === 'warning' ? 'text-yellow-400' : 'text-slate-300'
                  }`}>
                    <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Warning: Destructive Action
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL categories and dropdown options from the database. 
              This action cannot be undone and may break forms relying on this data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} className="bg-red-600 hover:bg-red-700">
              Yes, Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SeedDataPage;