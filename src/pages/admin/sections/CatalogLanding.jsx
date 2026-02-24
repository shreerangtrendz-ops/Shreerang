import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Layers, Shirt, Image as ImageIcon, Upload, Palette, ArrowRight } from 'lucide-react';

const CatalogLanding = () => {
    const navigate = useNavigate();

    const sections = [
        { title: "Product Master", desc: "Manage finished goods and SKUs", icon: Shirt, path: "/admin/products", color: "text-indigo-600" },
        { title: "Fabric Master", desc: "Manage raw material library", icon: Layers, path: "/admin/fabric-master", color: "text-pink-600" },
        { title: "Stock & Inventory", desc: "Track levels, locations, and value", icon: Package, path: "/admin/inventory", color: "text-emerald-600" },
        { title: "Design Catalog", desc: "Manage design prints and patterns", icon: Palette, path: "/admin/design-management", color: "text-amber-600" },
        { title: "Media Library", desc: "Centralized asset management", icon: ImageIcon, path: "/admin/media-library", color: "text-cyan-600" },
        { title: "Bulk Upload", desc: "Import data via CSV/Excel", icon: Upload, path: "/admin/bulk-upload", color: "text-slate-600" },
    ];

    return (
        <div className="space-y-6">
            <Helmet><title>Catalog & Inventory - Command Center</title></Helmet>
            <AdminPageHeader 
                title="Catalog & Inventory" 
                breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Catalog' }]}
                onBack={() => navigate('/admin')}
            />
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sections.map((section, idx) => (
                    <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(section.path)}>
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className={`p-3 rounded-lg bg-slate-100 ${section.color}`}>
                                <section.icon className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <CardTitle className="text-base">{section.title}</CardTitle>
                                <p className="text-xs text-muted-foreground mt-1">{section.desc}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-300" />
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default CatalogLanding;