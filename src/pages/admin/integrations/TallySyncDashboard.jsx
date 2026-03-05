import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    pullPurchasesFromTally,
    pullJobBillsFromTally,
    pullStockWithDesignDetail as pullStockFromTally,
    syncCustomersFromTally,
    syncSuppliersFromTally,
    syncAgentsFromTally,
    syncOutstandingFromTally
} from '../../../services/TallySyncService';
import {
    RefreshCcw,
    ShoppingCart,
    Factory,
    Package,
    AlertCircle,
    Clock,
    CheckCircle2,
    Activity,
    Server,
    Globe
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
    const [customerCount, setCustomerCount] = useState(0);
    const [supplierCount, setSupplierCount] = useState(0);
    const [agentCount, setAgentCount] = useState(0);
    const [outstandingCount, setOutstandingCount] = useState(0);
    const { toast } = useToast();

    // ─── STATE ───────────────────────────────────────────────
    const [infra, setInfra] = useState({
        frps: 'checking',      // KVM-1 frps service
        frpc: 'checking',      // Windows frpc tunnel
        tally: 'checking',     // Tally Prime app
        nginx: 'checking',     // KVM nginx
        n8n: 'checking',       // n8n automation
        domain: 'checking',    // tally.shreerangtrendz.com
        lastChecked: null,
        tallyCompany: '',
        stockItems: 0,
        frpsUptime: '',
    });

    async function checkInfrastructure() {
        setInfra(prev => ({
            ...prev,
            frps: 'checking', frpc: 'checking', tally: 'checking',
            nginx: 'checking', domain: 'checking'
        }));

        // ── Call our server-side Edge Function to avoid browser CORS ──
        try {
            const r = await fetch(
                'https://zdekydcscwhuusliwqaz.supabase.co/functions/v1/tally-health',
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json'
                    },
                    signal: AbortSignal.timeout(12000)
                }
            );
            const json = await r.json();

            // Check n8n separately (no CORS issue — returns public status)
            let n8nOk = false;
            try {
                const n8nRes = await fetch('https://n8n.shreerangtrendz.com/healthz', {
                    signal: AbortSignal.timeout(5000)
                });
                n8nOk = n8nRes.ok;
            } catch { n8nOk = false; }

            setInfra({
                frps: json.frps || 'offline',
                frpc: json.frpc || 'offline',
                nginx: json.nginx || 'offline',
                tally: json.tally || 'offline',
                domain: json.domain || 'offline',
                n8n: n8nOk ? 'online' : 'offline',
                lastChecked: new Date(),
                tallyCompany: json.tallyCompany || '',
                stockItems: json.stockItems || 0,
            });

        } catch (err) {
            setInfra(prev => ({
                ...prev,
                frps: 'offline', frpc: 'offline', nginx: 'offline',
                tally: 'offline', domain: 'offline',
                lastChecked: new Date(),
            }));
        }
    }

    useEffect(() => {
        checkInfrastructure();
        const interval = setInterval(checkInfrastructure, 60000);
        return () => clearInterval(interval);
    }, []);

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

        // Customers count
        const { count: cc } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .neq('business_type', 'supplier');
        setCustomerCount(cc || 0);

        // Suppliers count
        const { count: supc } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('business_type', 'supplier');
        setSupplierCount(supc || 0);

        // Agents count
        const { count: ac } = await supabase
            .from('sales_team')
            .select('*', { count: 'exact', head: true });
        setAgentCount(ac || 0);

        // Outstanding count
        const { count: oc } = await supabase
            .from('payment_followups')
            .select('*', { count: 'exact', head: true });
        setOutstandingCount(oc || 0);

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
            } else if (type === 'customers') {
                res = await syncCustomersFromTally();
            } else if (type === 'suppliers') {
                res = await syncSuppliersFromTally();
            } else if (type === 'agents') {
                res = await syncAgentsFromTally();
            } else if (type === 'outstanding') {
                res = await syncOutstandingFromTally();
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {[
                    { type: 'stock', title: 'Live Stock', description: 'Sync Stock Detail', icon: <Package className="h-4 w-4" />, count: stockCount, countLabel: 'Records synced for today', color: 'blue' },
                    { type: 'purchases', title: 'Purchases', description: 'Sync Purchases (30d)', icon: <ShoppingCart className="h-4 w-4" />, count: purchaseCount, countLabel: 'Total purchase bills tracked', color: 'indigo' },
                    { type: 'job_bills', title: 'Job Bills', description: 'Sync Job Bills (30d)', icon: <Factory className="h-4 w-4" />, count: jobBillCount, countLabel: 'Total job worker bills', color: 'purple' },
                    { type: 'customers', title: 'Customers (Debtors)', description: 'Pull all Sundry Debtors from Tally', icon: '👥', count: customerCount, countLabel: 'customers in database', color: 'teal' },
                    { type: 'suppliers', title: 'Suppliers (Creditors)', description: 'Pull all Sundry Creditors from Tally', icon: '🏭', count: supplierCount, countLabel: 'suppliers in database', color: 'indigo' },
                    { type: 'agents', title: 'Sales Agents', description: 'Pull agents from Tally Sales Accounts', icon: '🤝', count: agentCount, countLabel: 'agents in database', color: 'pink' },
                    { type: 'outstanding', title: 'Outstanding Bills', description: 'Pull live outstanding from Tally', icon: '💰', count: outstandingCount, countLabel: 'bills tracked', color: 'red' },
                ].map((card) => {
                    const colorData = {
                        blue: { bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-600', btnBorder: 'border-blue-200' },
                        indigo: { bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-600', btnBorder: 'border-indigo-200' },
                        purple: { bg: 'bg-purple-50/50', border: 'border-purple-100', text: 'text-purple-600', btnBorder: 'border-purple-200' },
                        teal: { bg: 'bg-teal-50/50', border: 'border-teal-100', text: 'text-teal-600', btnBorder: 'border-teal-200' },
                        pink: { bg: 'bg-pink-50/50', border: 'border-pink-100', text: 'text-pink-600', btnBorder: 'border-pink-200' },
                        red: { bg: 'bg-red-50/50', border: 'border-red-100', text: 'text-red-600', btnBorder: 'border-red-200' },
                    }[card.color];

                    return (
                        <Card key={card.type} className={`${colorData.bg} border ${colorData.border}`}>
                            <CardHeader className="pb-2">
                                <CardTitle className={`text-sm font-medium ${colorData.text} flex items-center gap-2`}>
                                    {typeof card.icon === 'string' ? <span className="text-lg leading-none">{card.icon}</span> : card.icon}
                                    {card.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{card.count}</div>
                                <p className="text-xs text-slate-500">{card.countLabel}</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`mt-4 w-full bg-white shadow-sm border ${colorData.btnBorder}`}
                                    onClick={() => handleSync(card.type)}
                                    disabled={loading[card.type]}
                                >
                                    <RefreshCcw className={`mr-2 h-3 w-3 ${loading[card.type] ? 'animate-spin' : ''}`} />
                                    {card.description}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
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

                {/* Infrastructure Status Panel */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-indigo-600" /> Infrastructure Status
                        </CardTitle>
                        <Button variant="outline" size="sm" onClick={checkInfrastructure} disabled={infra.domain === 'checking'}>
                            <RefreshCcw className={`h-3 w-3 mr-2 ${infra.domain === 'checking' ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries({
                                'Tally Prime': infra.tally,
                                'FRP Tunnel (Win)': infra.frpc,
                                'FRP Server (KVM)': infra.frps,
                                'Domain Gateway': infra.domain,
                                'Nginx Router': infra.nginx,
                                'n8n Automation': infra.n8n
                            }).map(([label, status]) => {
                                const isOnline = status === 'online';
                                const isChecking = status === 'checking';
                                return (
                                    <div key={label} className="flex justify-between items-center p-2 bg-slate-50 rounded border">
                                        <span className="text-xs font-medium text-slate-700 truncate mr-2">{label}</span>
                                        {isChecking ? (
                                            <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0"></div>
                                        ) : isOnline ? (
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px] h-5 px-1.5 shrink-0">Online</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[10px] h-5 px-1.5 shrink-0">Offline</Badge>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {(infra.tally === 'online' && infra.tallyCompany) ? (
                            <div className="bg-slate-900 p-3 rounded-lg text-white font-mono text-xs space-y-1">
                                <p className="text-green-400">► Connected to Tally ERP Prime</p>
                                <p className="text-slate-300">Company: {infra.tallyCompany}</p>
                                <p className="text-slate-300">Items: {infra.stockItems}</p>
                            </div>
                        ) : infra.tally === 'offline' ? (
                            <div className="bg-slate-900 p-3 rounded-lg text-white font-mono text-xs space-y-1">
                                <p className="text-red-400">► Error Details</p>
                                <p className="text-slate-300">Could not connect to Tally endpoint.</p>
                                <p className="text-slate-400 italic">Check if Tally Prime is open with HTTP Port 9000 enabled.</p>
                            </div>
                        ) : null}

                        <div className="text-xs text-center text-slate-400">
                            Last checked: {infra.lastChecked ? infra.lastChecked.toLocaleTimeString() : 'Never'}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
