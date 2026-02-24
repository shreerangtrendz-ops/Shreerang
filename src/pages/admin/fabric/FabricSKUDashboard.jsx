import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layers, Palette, Sparkles, Wand2 } from 'lucide-react';

const DashboardCard = ({ title, count, icon: Icon, colorClass, route, navigate }) => (
  <Card className="hover:shadow-xl transition-all duration-300 border-t-4 border-t-transparent hover:border-t-current" style={{ borderColor: 'inherit' }}>
    <CardHeader className={`${colorClass} bg-opacity-10 rounded-t-lg pb-4`}>
      <CardTitle className="flex items-center gap-3 text-lg">
        <div className={`p-2 rounded-lg ${colorClass} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-6">
      <div className="text-3xl font-bold mb-2">{count || '-'}</div>
      <p className="text-muted-foreground text-sm">Active items in inventory</p>
    </CardContent>
    <CardFooter className="flex gap-2">
      <Button variant="outline" className="flex-1" onClick={() => navigate(route)}>View All</Button>
      <Button className="flex-1" onClick={() => navigate(`${route}/create`)}>Create New</Button>
    </CardFooter>
  </Card>
);

const FabricSKUDashboard = () => {
  const navigate = useNavigate();

  // In a real app, fetch these counts from DB
  const stats = {
    base: '---',
    finish: '---',
    fancyBase: '---',
    fancyFinish: '---'
  };

  return (
    <div className="container mx-auto py-12 px-4 space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Fabric SKU Management System
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Centralized hub for managing fabric definitions, generating standardized SKUs, and tracking inventory classifications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <DashboardCard 
          title="Base Fabrics" 
          count={stats.base} 
          icon={Layers} 
          colorClass="bg-blue-600" 
          route="/admin/fabric-sku/base" 
          navigate={navigate}
        />
        <DashboardCard 
          title="Finish Fabrics" 
          count={stats.finish} 
          icon={Palette} 
          colorClass="bg-purple-600" 
          route="/admin/fabric-sku/finish" 
          navigate={navigate}
        />
        <DashboardCard 
          title="Fancy Base Fabrics" 
          count={stats.fancyBase} 
          icon={Wand2} 
          colorClass="bg-pink-600" 
          route="/admin/fabric-sku/fancy-base" 
          navigate={navigate}
        />
        <DashboardCard 
          title="Fancy Finish Fabrics" 
          count={stats.fancyFinish} 
          icon={Sparkles} 
          colorClass="bg-orange-600" 
          route="/admin/fabric-sku/fancy-finish" 
          navigate={navigate}
        />
      </div>
    </div>
  );
};

export default FabricSKUDashboard;