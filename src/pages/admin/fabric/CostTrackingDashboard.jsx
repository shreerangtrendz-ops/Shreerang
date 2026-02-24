import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, TrendingUp, IndianRupee, PieChart, Calendar } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { BulkBillService } from '@/services/BulkBillService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ResponsiveContainer, PieChart as RePie, Pie, Cell, Tooltip as ReTooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const CostTrackingDashboard = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      const data = await BulkBillService.getAllBills();
      setBills(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const totalCost = bills.reduce((sum, b) => sum + (parseFloat(b.bill_amount) || 0), 0);
  const purchaseCost = bills.filter(b => b.bill_type === 'Purchase').reduce((sum, b) => sum + (parseFloat(b.bill_amount) || 0), 0);
  const jobWorkCost = bills.filter(b => b.bill_type === 'JobWork').reduce((sum, b) => sum + (parseFloat(b.bill_amount) || 0), 0);

  // Data for Pie Chart
  const typeData = [
      { name: 'Raw Material', value: purchaseCost },
      { name: 'Job Work', value: jobWorkCost }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Cost Tracking</title></Helmet>
      <AdminPageHeader 
        title="Cost Tracking" 
        description="Monitor fabric expenditure and job work costs."
        breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Cost Tracking'}]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-l-4 border-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenditure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
                <IndianRupee className="h-5 w-5 mr-1 text-slate-400" />
                {totalCost.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Raw Material Purchase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
                <IndianRupee className="h-5 w-5 mr-1 text-slate-400" />
                {purchaseCost.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Job Work Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
                <IndianRupee className="h-5 w-5 mr-1 text-slate-400" />
                {jobWorkCost.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bills">Bill History</TabsTrigger>
              <TabsTrigger value="analysis">Cost Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                      <CardHeader><CardTitle>Cost Distribution</CardTitle></CardHeader>
                      <CardContent className="h-[300px] flex items-center justify-center">
                          {typeData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                  <RePie data={typeData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                                      {typeData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                  </RePie>
                                  <ReTooltip />
                                  <Legend />
                              </ResponsiveContainer>
                          ) : <p className="text-muted-foreground">No data available</p>}
                      </CardContent>
                  </Card>
                  
                  <Card>
                      <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                      <CardContent>
                          <div className="space-y-4">
                              {bills.slice(0, 5).map((bill, i) => (
                                  <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                                      <div className="flex items-center gap-3">
                                          <div className={`p-2 rounded-full ${bill.bill_type === 'Purchase' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                                              {bill.bill_type === 'Purchase' ? <TrendingUp className="h-4 w-4"/> : <PieChart className="h-4 w-4"/>}
                                          </div>
                                          <div>
                                              <p className="font-medium text-sm">{bill.extracted_data?.supplier_name || 'Unknown Vendor'}</p>
                                              <p className="text-xs text-muted-foreground">{new Date(bill.bill_date).toLocaleDateString()}</p>
                                          </div>
                                      </div>
                                      <span className="font-bold">₹{bill.bill_amount}</span>
                                  </div>
                              ))}
                          </div>
                      </CardContent>
                  </Card>
              </div>
          </TabsContent>

          <TabsContent value="bills">
            <Card>
                <CardHeader className="flex flex-row justify-between">
                    <CardTitle>All Recorded Bills</CardTitle>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" /> Export Excel
                    </Button>
                </CardHeader>
                <CardContent>
                {loading ? <LoadingSpinner /> : (
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {bills.map(bill => (
                            <TableRow key={bill.id}>
                                <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                                <TableCell className="font-medium">
                                    {bill.extracted_data?.supplier_name || bill.extracted_data?.job_worker_name || 'Unknown'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{bill.bill_type}</Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                    {bill.extracted_data?.description}
                                </TableCell>
                                <TableCell>₹{bill.bill_amount}</TableCell>
                                <TableCell>
                                    <Badge variant={bill.status === 'Confirmed' ? 'success' : 'secondary'}>
                                    {bill.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                )}
                </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
    </div>
  );
};

export default CostTrackingDashboard;