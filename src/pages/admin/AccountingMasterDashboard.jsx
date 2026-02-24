import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    FileText, ShoppingCart, TrendingUp, AlertCircle, Percent, Receipt, 
    PlusCircle, ArrowRight 
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const AccountingModuleCard = ({ title, description, icon: Icon, color, stats, actionLabel, onAction, onView }) => (
    <Card className="hover:shadow-lg transition-shadow border-t-4" style={{ borderTopColor: color }}>
        <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
                <div className={`p-2 rounded-lg bg-opacity-10`} style={{ backgroundColor: color }}>
                    <Icon className="h-6 w-6" style={{ color: color }} />
                </div>
                {stats && <span className="text-2xl font-bold">{stats}</span>}
            </div>
            <CardTitle className="mt-4 text-lg">{title}</CardTitle>
            <CardDescription className="line-clamp-2 h-10">{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex gap-2 mt-2">
                <Button variant="outline" className="flex-1" onClick={onView}>View All</Button>
                <Button size="icon" style={{ backgroundColor: color }} onClick={onAction}>
                    <PlusCircle className="h-4 w-4 text-white" />
                </Button>
            </div>
        </CardContent>
    </Card>
);

const AccountingMasterDashboard = () => {
    const navigate = useNavigate();

    const modules = [
        {
            title: "Purchase Bills",
            description: "Manage incoming bills for Base Fabric, Finish Fabric, and Raw Materials.",
            icon: Receipt,
            color: "#2563eb", // blue-600
            path: "/admin/accounting/purchase-bills"
        },
        {
            title: "Job Work Bills",
            description: "Track bills for dyeing, printing, embroidery and other value additions.",
            icon: FileText,
            color: "#9333ea", // purple-600
            path: "/admin/accounting/job-work-bills"
        },
        {
            title: "Sales Bills",
            description: "Invoices generated for sales orders and dispatched goods.",
            icon: TrendingUp,
            color: "#16a34a", // green-600
            path: "/admin/accounting/sales-bills"
        },
        {
            title: "Quotations",
            description: "Manage and track price quotations from suppliers and to customers.",
            icon: ShoppingCart,
            color: "#ea580c", // orange-600
            path: "/admin/accounting/quotations"
        },
        {
            title: "Pending Orders",
            description: "Track orders that are confirmed but not yet fully dispatched.",
            icon: AlertCircle,
            color: "#ca8a04", // yellow-600
            path: "/admin/accounting/pending-orders"
        },
        {
            title: "Commission & Brokerage",
            description: "Manage agent commissions on sales and brokerage on purchases.",
            icon: Percent,
            color: "#db2777", // pink-600
            path: "/admin/accounting/commission"
        }
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            <Helmet><title>Accounting Master</title></Helmet>
            <AdminPageHeader 
                title="Accounting Master" 
                description="Central hub for all financial transactions, billing, and order tracking."
                breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Accounting'}]}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((mod, idx) => (
                    <AccountingModuleCard 
                        key={idx}
                        {...mod}
                        onView={() => navigate(mod.path)}
                        onAction={() => navigate(`${mod.path}/new`)}
                    />
                ))}
            </div>

            {/* Quick Stats Summary Section */}
            <Card className="bg-slate-50 border-dashed">
                <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800">Financial Overview</h3>
                        <p className="text-slate-500 text-sm">Quick snapshot of current month's activity.</p>
                    </div>
                    <div className="flex gap-8 text-center">
                        <div>
                            <div className="text-sm text-slate-500 uppercase font-medium">Purchases</div>
                            <div className="text-xl font-bold text-blue-600">₹0.00</div>
                        </div>
                        <div>
                            <div className="text-sm text-slate-500 uppercase font-medium">Sales</div>
                            <div className="text-xl font-bold text-green-600">₹0.00</div>
                        </div>
                        <div>
                            <div className="text-sm text-slate-500 uppercase font-medium">Job Work</div>
                            <div className="text-xl font-bold text-purple-600">₹0.00</div>
                        </div>
                    </div>
                    <Button onClick={() => navigate('/admin/analytics')}>
                        View Detailed Reports <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default AccountingMasterDashboard;