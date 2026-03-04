import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    pullPurchasesFromTally,
    pullJobBillsFromTally,
    pullStockWithDesignDetail as pullStockFromTally
} from '../../../services/TallySyncService';
import {
    RefreshCcw,
    ShoppingCart,
    Factory,
    Package,
    AlertCircle,
    Clock,
    CheckCircle2
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { useToast } from '../../../components/ui/use-toast';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';

export default function TallySyncDashboard() {
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState({});
    const [lastSyncs, setLastSyncs] = useState({});
    const [stockCount, setStockCount] = useState(0);
    const [purchaseCount, setPurchaseCount] = useState(0);
    const [jobBillCount, setJobBillCount] = useState(0);
    const { toast } = useToast();

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    useEffect(() => { loadDashboardData(); }, []);

    async function loadDashboardData() {
        // Last sync times from tally_sync_errors
        const { data: errData } = await supabase
            .from('tally_sync_errors')
            .select('*')
            .eq('resolved', false)
            .order('created_at', { ascending: false })
            .limit(10);
        setErrors(errData || []);

        // Stock count
        const { count: sc } = await supabase
            .from('fabric_stock_live')
            .select('*', { count: 'exact', head: true })
            .eq('sync_date', today);
        setStockCount(sc || 0);

        // Purchase count
        const { count: pc } = await supabase
            .from('purchase_fabric')
            .select('*', { count: 'exact', head: true });
        setPurchaseCount(pc || 0);

        // Job bill count
        const { count: jc } = await supabase
            .from('process_charges')
            .select('*', { count: 'exact', head: true });
        setJobBillCount(jc || 0);

        // Fetch last sync times from tally_sync_log
        const { data: logData } = await supabase
            .from('tally_sync_log')
            .select('sync_type, synced_at')
            .order('synced_at', { ascending: false });

        if (logData) {
            const latest = {};
            logData.forEach(log => {
                if (!latest[log.sync_type]) latest[log.sync_type] = log.synced_at;
            });
            setLastSyncs(latest);
        }
    }

    async function handleSync(type) {
        setLoading(prev => ({ ...prev, [type]: true }));
        let res;

        try {
            if (type === 'purchases') {
                res = await pullPurchasesFromTally(thirtyDaysAgo, today);
            } else if (type === 'job_bills') {
                res = await pullJobBillsFromTally(thirtyDaysAgo, today);
            } else if (type === 'stock') {
                res = await pullStockFromTally();
            }

            if (res?.success) {
                toast({ title: "Sync Successful", description: `Synced ${res.count} records.` });
                await loadDashboardData();
            } else {
                toast({ variant: "destructive", title: "Sync Failed", description: res?.error || "Unknown error" });
            }
        } catch (err) {
            toast({ variant: "destructive", title: "Internal Error", description: err.message });
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <AdminPageHeader
                title="Tally Sync Dashboard"
                description="Real-time integration status with Tally ERP Prime"
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-blue-50/50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                            <Package className="h-4 w-4" /> Live Stock
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stockCount}</div>
                        <p className="text-xs text-slate-500">Records synced for today</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 w-full bg-white shadow-sm border-blue-200"
                            onClick={() => handleSync('stock')}
                            disabled={loading.stock}
                        >
                            <RefreshCcw className={`mr-2 h-3 w-3 ${loading.stock ? 'animate-spin' : ''}`} />
                            Sync Stock Detail
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-indigo-50/50 border-indigo-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-600 flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" /> Purchases
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{purchaseCount}</div>
                        <p className="text-xs text-slate-500">Total purchase bills tracked</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 w-full bg-white shadow-sm border-indigo-200"
                            onClick={() => handleSync('purchases')}
                            disabled={loading.purchases}
                        >
                            <RefreshCcw className={`mr-2 h-3 w-3 ${loading.purchases ? 'animate-spin' : ''}`} />
                            Sync Purchases (30d)
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50/50 border-purple-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
                            <Factory className="h-4 w-4" /> Job Bills
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{jobBillCount}</div>
                        <p className="text-xs text-slate-500">Total job worker bills</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 w-full bg-white shadow-sm border-purple-200"
                            onClick={() => handleSync('job_bills')}
                            disabled={loading.job_bills}
                        >
                            <RefreshCcw className={`mr-2 h-3 w-3 ${loading.job_bills ? 'animate-spin' : ''}`} />
                            Sync Job Bills (30d)
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sync Errors */}
                <Card className="border-red-100 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-red-700 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" /> Recent Sync Errors
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {errors.length === 0 ? (
                                <div className="text-center py-6 text-slate-500 italic">No unresolved sync errors found.</div>
                            ) : (
                                errors.map(err => (
                                    <div key={err.id} className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                                        <Badge variant="destructive" className="mt-0.5 whitespace-nowrap">{err.sync_type}</Badge>
                                        <div className="space-y-1 overflow-hidden shrink min-w-0">
                                            <p className="text-sm font-medium text-red-900 truncate">{err.error_message}</p>
                                            <p className="text-xs text-red-600 flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {new Date(err.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Sync Status / Logs Table Snapshot */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" /> Tally Gateway Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="font-medium">Ngrok Tunnel</span>
                            </div>
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>
                        </div>

                        <div className="space-y-3 pt-2">
                            <h4 className="text-sm font-semibold uppercase text-slate-500 tracking-wider">Last Successful Syncs</h4>
                            <div className="space-y-2 text-sm">
                                {lastSyncs.purchases && (
                                    <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                                        <span className="text-slate-700 font-medium">Purchases</span>
                                        <span className="text-slate-500 text-xs">{new Date(lastSyncs.purchases).toLocaleString()}</span>
                                    </div>
                                )}
                                {lastSyncs.job_bills && (
                                    <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                                        <span className="text-slate-700 font-medium">Job Bills</span>
                                        <span className="text-slate-500 text-xs">{new Date(lastSyncs.job_bills).toLocaleString()}</span>
                                    </div>
                                )}
                                {lastSyncs.stock_pull_with_design && (
                                    <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                                        <span className="text-slate-700 font-medium">Stock Detail</span>
                                        <span className="text-slate-500 text-xs">{new Date(lastSyncs.stock_pull_with_design).toLocaleString()}</span>
                                    </div>
                                )}
                                {Object.keys(lastSyncs).length === 0 && (
                                    <p className="text-xs text-slate-400 italic py-2">No sync records found in log.</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-slate-900 p-4 rounded-lg text-white font-mono text-[10px] space-y-1 mt-4">
                            <p className="text-slate-400"># Tally ERP Ready on Port 9000</p>
                            <p className="text-green-400">Ngrok: Forwarding https://yvone...-wilford.ngrok-free.app</p>
                            <p className="text-blue-400">Status: Listening for data requests...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
