import React from 'react';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ShoppingCart, Clock } from 'lucide-react';
import DataErrorBoundary from '@/components/common/DataErrorBoundary';

const OrderManagement = () => {
  return (
    <DataErrorBoundary>
      <div className="space-y-6">
        <Helmet><title>Orders | Admin</title></Helmet>
        <AdminPageHeader title="Order Management" description="Select order type to manage" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link to="/admin/order-database/sales">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="p-4 bg-blue-100 rounded-full text-blue-600">
                  <ShoppingCart className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Sales Orders</h3>
                  <p className="text-slate-500">Manage confirmed sales orders</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/admin/order-database/pending">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-500">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className="p-4 bg-orange-100 rounded-full text-orange-600">
                  <Clock className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Pending Orders</h3>
                  <p className="text-slate-500">Track pending and processing orders</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </DataErrorBoundary>
  );
};

export default OrderManagement;