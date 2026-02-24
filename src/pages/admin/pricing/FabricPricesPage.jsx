import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PricingService } from '@/services/PricingService';
import { FabricPriceModal } from '@/components/admin/pricing/PriceModals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Loader2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { formatCurrency } from '@/api/EcommerceApi';

const FabricPricesPage = () => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const data = await PricingService.getFabricPrices();
      setPrices(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load prices' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrices(); }, []);

  const handleSave = async (data) => {
    try {
      await PricingService.addFabricPrice(data);
      toast({ title: 'Success', description: 'Price updated' });
      setIsModalOpen(false);
      fetchPrices();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6 pb-24">
      <Helmet><title>Fabric Prices | Admin</title></Helmet>
      <AdminPageHeader 
        title="Fabric Price Master" 
        description="Track historical and current prices for all fabrics."
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Price Entry
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Price History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fabric</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Effective Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></TableCell></TableRow>
              ) : prices.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center h-24">No pricing records found</TableCell></TableRow>
              ) : (
                prices.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.fabric_master?.name || '-'}</TableCell>
                    <TableCell><span className="capitalize">{p.fabric_master?.type?.replace('_', ' ') || '-'}</span></TableCell>
                    <TableCell className="font-semibold">{formatCurrency(p.price * 100)}</TableCell>
                    <TableCell>{new Date(p.effective_date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <FabricPriceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleSave} 
      />
    </div>
  );
};

export default FabricPricesPage;