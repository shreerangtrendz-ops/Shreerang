import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownRight, Package, ShoppingCart, Users, AlertCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Sales Chart Widget
export const SalesChartWidget = ({ data }) => (
  <Card className="col-span-2">
    <CardHeader>
      <CardTitle>Revenue (Last 30 Days)</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" hide />
            <Tooltip 
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                cursor={{ fill: '#f1f5f9' }}
            />
            <Bar dataKey="amount" fill="#0f172a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

// Low Stock Widget
export const LowStockWidget = ({ products }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
      <AlertCircle className="h-4 w-4 text-red-500" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {products.slice(0, 3).map(p => (
            <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[120px]" title={p.name}>{p.name}</span>
                <span className="font-bold text-red-600">{p.stock_quantity} left</span>
            </div>
        ))}
        {products.length === 0 && <p className="text-xs text-muted-foreground">All stock levels healthy.</p>}
        <Link to="/admin/stock">
            <Button variant="link" className="px-0 text-xs w-full justify-start h-auto mt-2">View all alerts</Button>
        </Link>
      </div>
    </CardContent>
  </Card>
);

// Pending Approvals Widget
export const PendingApprovalsWidget = ({ count }) => (
  <Card className="bg-amber-50 border-amber-200">
    <CardHeader className="pb-2">
        <CardTitle className="text-amber-900 text-lg">Pending Approvals</CardTitle>
        <CardDescription className="text-amber-700">Price requests awaiting review</CardDescription>
    </CardHeader>
    <CardContent>
        <div className="flex items-baseline justify-between">
            <span className="text-4xl font-bold text-amber-900">{count}</span>
            <Link to="/admin/price-approvals">
                <Button size="sm" variant="outline" className="bg-white border-amber-300 text-amber-900 hover:bg-amber-100">Review</Button>
            </Link>
        </div>
    </CardContent>
  </Card>
);

// Quick Actions Widget
export const QuickActionsWidget = () => (
    <Card>
        <CardHeader><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
            <Link to="/admin/sales-orders">
                <Button variant="outline" className="w-full justify-start h-auto py-3 px-2 flex-col gap-1 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200">
                    <ShoppingCart className="h-5 w-5"/> <span className="text-xs">New Order</span>
                </Button>
            </Link>
            <Link to="/admin/customers">
                 <Button variant="outline" className="w-full justify-start h-auto py-3 px-2 flex-col gap-1 hover:bg-green-50 hover:text-green-700 hover:border-green-200">
                    <Users className="h-5 w-5"/> <span className="text-xs">Add Customer</span>
                </Button>
            </Link>
            <Link to="/admin/design-management">
                 <Button variant="outline" className="w-full justify-start h-auto py-3 px-2 flex-col gap-1 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200">
                    <FileText className="h-5 w-5"/> <span className="text-xs">Upload Design</span>
                </Button>
            </Link>
             <Link to="/admin/stock">
                 <Button variant="outline" className="w-full justify-start h-auto py-3 px-2 flex-col gap-1 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200">
                    <Package className="h-5 w-5"/> <span className="text-xs">Update Stock</span>
                </Button>
            </Link>
        </CardContent>
    </Card>
);