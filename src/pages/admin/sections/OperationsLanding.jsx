import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, FileText, Truck, Calendar, ArrowRight } from 'lucide-react';

const OperationsLanding = () => {
    const navigate = useNavigate();

    const sections = [
        { title: "Sales Orders", desc: "Manage B2B orders and invoices", icon: FileText, path: "/admin/sales-orders", color: "text-blue-600" },
        { title: "Online Orders", desc: "Process e-commerce orders", icon: ShoppingCart, path: "/admin/orders", color: "text-green-600" },
        { title: "Despatch", desc: "Shipment tracking and logistics", icon: Truck, path: "/admin/despatch", color: "text-orange-600" },
        { title: "Appointments", desc: "Manage client visits and schedule", icon: Calendar, path: "/admin/appointments", color: "text-purple-600" },
    ];

    return (
        <div className="space-y-6">
            <Helmet><title>Operations - Command Center</title></Helmet>
            <AdminPageHeader 
                title="Operations Hub" 
                breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Operations' }]}
                onBack={() => navigate('/admin')}
            />
            
            <div className="grid md:grid-cols-2 gap-6">
                {sections.map((section, idx) => (
                    <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(section.path)}>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className={`p-3 rounded-lg bg-slate-100 ${section.color}`}>
                                <section.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">{section.title}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">{section.desc}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="ml-auto">
                                <ArrowRight className="h-5 w-5 text-slate-400" />
                            </Button>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default OperationsLanding;