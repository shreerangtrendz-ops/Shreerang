import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layers, Shirt, Palette, Sparkles, Settings, FileDown } from 'lucide-react';

const FabricHierarchyDashboard = () => {
  const navigate = useNavigate();

  const categories = [
    {
      title: 'Base Fabrics',
      description: 'Raw materials, Greige, RFD',
      icon: Layers,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      path: '/admin/fabric-master' // Points to BaseFabricDashboard essentially
    },
    {
      title: 'Finish Fabrics',
      description: 'Dyed, Printed, Processed',
      icon: Shirt,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      path: '/admin/fabric/finish-fabrics'
    },
    {
      title: 'Fancy Base Fabrics',
      description: 'Value added on Base (Embroidery, etc.)',
      icon: Palette,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      path: '/admin/fabric/fancy-base-fabric'
    },
    {
      title: 'Fancy Finish Fabrics',
      description: 'Complex multi-process fabrics',
      icon: Sparkles,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      path: '/admin/fabric/fancy-finish-fabric'
    }
  ];

  return (
    <div className="p-6 max-w-[1200px] mx-auto pb-20 space-y-8">
      <Helmet><title>Fabric Master Hub</title></Helmet>
      
      <AdminPageHeader 
        title="Fabric Master Hub" 
        description="Central management for all fabric categories and specifications."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {categories.map((cat) => (
           <Card key={cat.title} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(cat.path)}>
             <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className={`p-3 rounded-lg ${cat.bgColor} ${cat.color}`}>
                   <cat.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                   <CardTitle className="text-lg">{cat.title}</CardTitle>
                </div>
             </CardHeader>
             <CardContent>
                <CardDescription>{cat.description}</CardDescription>
                <Button variant="link" className="px-0 mt-2 text-blue-600">Manage &rarr;</Button>
             </CardContent>
           </Card>
         ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Card>
            <CardHeader>
               <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuration
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/admin/fabric/dropdown-management')}>
                  Manage Dropdown Values (Colors, Processes, etc.)
               </Button>
               <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/admin/fabric/import-history')}>
                  View Import History & Logs
               </Button>
            </CardContent>
         </Card>

         <Card>
            <CardHeader>
               <CardTitle className="flex items-center gap-2">
                  <FileDown className="h-5 w-5" />
                  Bulk Operations
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/admin/fabric/bulk-import')}>
                  Import Fabrics via Excel
               </Button>
               <Button variant="outline" className="w-full justify-start" disabled>
                  Export All Data (Coming Soon)
               </Button>
            </CardContent>
         </Card>
      </div>
    </div>
  );
};

export default FabricHierarchyDashboard;