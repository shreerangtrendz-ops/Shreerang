import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', messages: 120, orders: 5 },
  { name: 'Tue', messages: 150, orders: 8 },
  { name: 'Wed', messages: 180, orders: 12 },
  { name: 'Thu', messages: 140, orders: 6 },
  { name: 'Fri', messages: 200, orders: 15 },
  { name: 'Sat', messages: 90, orders: 4 },
  { name: 'Sun', messages: 60, orders: 2 },
];

const WhatsAppAnalytics = () => {
    const navigate = useNavigate();

    const StatCard = ({ title, value, icon: Icon, trend }) => (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <Icon className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-baseline justify-between">
                    <div className="text-2xl font-bold">{value}</div>
                    <span className="text-xs text-green-500 flex items-center">{trend}</span>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            <Helmet><title>WhatsApp Analytics</title></Helmet>
            <AdminPageHeader 
                title="WhatsApp Performance" 
                breadcrumbs={[{label: 'Analytics', href: '/admin/analytics'}, {label: 'WhatsApp'}]}
                onBack={() => navigate('/admin')}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Messages" value="1,245" icon={MessageSquare} trend="+12% vs last week" />
                <StatCard title="Orders via WhatsApp" value="45" icon={ShoppingCart} trend="+5% vs last week" />
                <StatCard title="Active Conversations" value="120" icon={Users} trend="+8% vs last week" />
                <StatCard title="Conversion Rate" value="3.6%" icon={TrendingUp} trend="+0.2%" />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Activity Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="messages" fill="#22c55e" name="Messages" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="orders" fill="#0ea5e9" name="Orders" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default WhatsAppAnalytics;