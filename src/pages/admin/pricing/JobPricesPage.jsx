import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PricingService } from '@/services/PricingService';
import { JobPriceModal } from '@/components/admin/pricing/PriceModals';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Loader2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import WhatsAppButton from '@/components/admin/whatsapp/WhatsAppButton';

const JobPricesPage = () => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const data = await PricingService.getJobPrices();
      setPrices(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrices(); }, []);

  const handleSave = async (data) => {
    try {
      await PricingService.addJobPrice(data);
      toast({ title: 'Success', description: 'Job Price Added' });
      setIsModalOpen(false);
      fetchPrices();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6 pb-24">
      <Helmet><title>Job Prices | Admin</title></Helmet>
      <AdminPageHeader 
        title="Job Work Prices" 
        description="Manage job work rates for different units."
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Job Price
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fabric</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Price (₹)</TableHead>
                <TableHead>Charge On</TableHead>
                <TableHead>Shortage %</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></TableCell></TableRow>
              ) : prices.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24">No records found</TableCell></TableRow>
              ) : (
                prices.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.fabric_master?.name}</TableCell>
                    <TableCell>{p.job_work_unit?.unit_name}</TableCell>
                    <TableCell className="font-bold">₹{p.price}</TableCell>
                    <TableCell>{p.charge_on}</TableCell>
                    <TableCell>{p.shortage_percent}%</TableCell>
                    <TableCell>{new Date(p.effective_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                       <WhatsAppButton data={p} type="job_price" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <JobPriceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleSave} 
      />
    </div>
  );
};

export default JobPricesPage;