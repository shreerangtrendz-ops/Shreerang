import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, MessageSquare, ArrowRight } from 'lucide-react';

const CustomersLanding = () => {
    const navigate = useNavigate();

    const sections = [
        { title: "Customer Database", desc: "View and manage all customer profiles", icon: Users, path: "/admin/customers", color: "text-blue-600" },
        // Placeholder for future modules
        { title: "Segments", desc: "Manage customer groups (Coming Soon)", icon: UserPlus, path: "#", color: "text-gray-400" },
        { title: "Communication", desc: "Message history and logs (Coming Soon)", icon: MessageSquare, path: "#", color: "text-gray-400" },
    ];

    return (
        <div className="space-y-6">
            <Helmet><title>Customers - Command Center</title></Helmet>
            <AdminPageHeader 
                title="Customer Management" 
                breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Customers' }]}
                onBack={() => navigate('/admin')}
            />
            
            <div className="grid md:grid-cols-2 gap-6">
                {sections.map((section, idx) => (
                    <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(section.path)}>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className={`p-3 rounded-lg bg-slate-100 ${section.color}`}>
                                <section.icon className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-lg">{section.title}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">{section.desc}</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-slate-300" />
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default CustomersLanding;