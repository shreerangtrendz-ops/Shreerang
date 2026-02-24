import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal, AlertCircle, CheckCircle2, Clock, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export const KPICard = ({ title, value, subtitle, trend, trendValue, icon: Icon, colorClass, alert }) => (
  <Card className={cn("relative overflow-hidden transition-all hover:shadow-md", alert && "border-red-200 bg-red-50/10")}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn("p-2 rounded-full bg-opacity-10", colorClass.replace('text-', 'bg-'))}>
             <Icon className={cn("h-4 w-4", colorClass)} />
        </div>
      </div>
      <div className="flex flex-col gap-1 mt-2">
        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        {(subtitle || trendValue) && (
             <div className="flex items-center text-xs text-muted-foreground">
                {trend === 'up' && <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />}
                {trend === 'down' && <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />}
                <span className={cn(trend === 'up' ? "text-green-600" : trend === 'down' ? "text-red-600" : "")}>
                    {trendValue}
                </span>
                <span className="ml-1">{subtitle}</span>
            </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export const RecentOrdersTable = ({ orders }) => {
    const navigate = useNavigate();
    return (
        <Card className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>Latest sales activity across all channels.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/sales-orders')}>View All</Button>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Firm</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No recent orders</TableCell></TableRow>
                        ) : (
                            orders.map((order) => (
                                <TableRow key={order.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/sales-order/${order.id}`)}>
                                    <TableCell className="font-medium">{order.order_no}</TableCell>
                                    <TableCell className="truncate max-w-[120px]">{order.party_details?.name}</TableCell>
                                    <TableCell>₹{order.total_amount?.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={cn(
                                            "text-[10px] px-2 py-0.5",
                                            order.status === 'completed' ? "bg-green-50 text-green-700 border-green-200" : 
                                            order.status === 'draft' ? "bg-slate-50 text-slate-700" : 
                                            "bg-blue-50 text-blue-700 border-blue-200"
                                        )}>
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export const PendingDispatchTable = ({ orders }) => {
    const navigate = useNavigate();
    return (
        <Card className="col-span-1 border-l-4 border-l-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-yellow-700">Pending Dispatch</CardTitle>
                    <CardDescription>Orders requiring immediate attention.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/sales-orders/pending')}>View Queue</Button>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Delivery</TableHead>
                            <TableHead className="text-right">Balance Items</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.length === 0 ? (
                            <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No pending dispatches</TableCell></TableRow>
                        ) : (
                            orders.map((order) => (
                                <TableRow key={order.id} className="cursor-pointer hover:bg-yellow-50/30" onClick={() => navigate(`/sales-order/${order.id}`)}>
                                    <TableCell className="font-medium">{order.order_no}</TableCell>
                                    <TableCell>{order.delivery_date ? format(new Date(order.delivery_date), 'dd MMM') : '-'}</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {order.items?.filter(i => (i.dispatched_qty || 0) < i.quantity).length || 0}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export const AlertSection = ({ alerts }) => {
    if (!alerts || alerts.length === 0) return null;
    
    return (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {alerts.map((alert, idx) => (
                <div key={idx} className={cn(
                    "flex items-center p-3 rounded-lg border shadow-sm",
                    alert.type === 'critical' ? "bg-red-50 border-red-200 text-red-900" :
                    alert.type === 'warning' ? "bg-yellow-50 border-yellow-200 text-yellow-900" :
                    "bg-blue-50 border-blue-200 text-blue-900"
                )}>
                    {alert.type === 'critical' ? <AlertCircle className="h-5 w-5 mr-3 text-red-600" /> :
                     alert.type === 'warning' ? <Clock className="h-5 w-5 mr-3 text-yellow-600" /> :
                     <Truck className="h-5 w-5 mr-3 text-blue-600" />}
                    <div>
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-xs opacity-90">{alert.message}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};