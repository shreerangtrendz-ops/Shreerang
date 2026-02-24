import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Search, Download, Settings } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const PriceDatabasePage = () => {
  const [prices, setPrices] = useState([]);
  const { toast } = useToast();

  useEffect(() => { loadPrices(); }, []);

  const loadPrices = async () => {
    try {
      const { data } = await supabase.from('price_database').select('*').order('created_at', { ascending: false }).limit(20);
      setPrices(data || []);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load' });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <Helmet><title>Price Database</title></Helmet>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Price Database</h1>
          <p className="text-sm text-slate-500 mt-1">Formula: Selling Price = Factory Cost/mtr + Margin% + (1 + Dhara%)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Settings className="w-4 h-4 mr-2"/> Bulk Update Margin</Button>
          <Button variant="outline"><Download className="w-4 h-4 mr-2"/> Export Excel</Button>
          <Button>Add Price</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Pricing Records</CardTitle>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <Input placeholder="Search SKU..." className="w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Fabric Name</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Width 44"</TableHead>
                <TableHead>Width 58"</TableHead>
                <TableHead>Formula Price</TableHead>
                <TableHead>Final Price</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell>{p.fabric_name}</TableCell>
                  <TableCell>{p.component}</TableCell>
                  <TableCell>₹{p.width_44_price}</TableCell>
                  <TableCell>₹{p.width_58_price}</TableCell>
                  <TableCell>₹{p.formula_price}</TableCell>
                  <TableCell className="font-bold text-green-700">₹{p.final_price}</TableCell>
                  <TableCell><Button variant="ghost" size="sm">Edit</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
export default PriceDatabasePage;