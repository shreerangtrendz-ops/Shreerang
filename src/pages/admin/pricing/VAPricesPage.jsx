import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PricingService } from '@/services/PricingService';
import { UnitService } from '@/services/UnitService'; // If needed for units, but Modal handles fetching
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Loader2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useForm, Controller } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// VAPriceModal inline for simplicity/speed or could be extracted
const VAPriceModal = ({ isOpen, onClose, onSubmit }) => {
  const { register, handleSubmit, control, formState: { isSubmitting } } = useForm();
  const [fabrics, setFabrics] = useState([]);
  const [units, setUnits] = useState([]);

  useEffect(() => {
    PricingService.getFabrics(['fancy_base', 'fancy_finish']).then(setFabrics);
    UnitService.getVAUnits().then(setUnits);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>VA Price Configuration</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fabric</Label>
              <Controller name="fabric_master_id" control={control} rules={{required:true}} render={({field}) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select Fabric"/></SelectTrigger>
                  <SelectContent>{fabrics.map(f=><SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              )}/>
            </div>
            <div className="space-y-2">
              <Label>VA Unit</Label>
              <Controller name="va_unit_id" control={control} rules={{required:true}} render={({field}) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select Unit"/></SelectTrigger>
                  <SelectContent>{units.map(u=><SelectItem key={u.id} value={u.id}>{u.unit_name}</SelectItem>)}</SelectContent>
                </Select>
              )}/>
            </div>
          </div>
          <div className="space-y-2">
            <Label>VA Category</Label>
            <Input {...register('va_category')} placeholder="e.g. Embroidery" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price</Label>
              <Input type="number" step="0.01" {...register('price', {required:true, min:0})} />
            </div>
            <div className="space-y-2">
              <Label>Shortage %</Label>
              <Input type="number" step="0.01" {...register('shortage_percent', {min:0, max:100})} defaultValue={0} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Effective Date</Label>
            <Input type="date" {...register('effective_date')} defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const VAPricesPage = () => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const data = await PricingService.getVAPrices();
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
      await PricingService.addVAPrice(data);
      toast({ title: 'Success', description: 'VA Price Added' });
      setIsModalOpen(false);
      fetchPrices();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6 pb-24">
      <Helmet><title>VA Prices | Admin</title></Helmet>
      <AdminPageHeader 
        title="Value Addition Prices" 
        description="Manage pricing for value addition processes."
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="bg-slate-900 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add VA Price
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fabric</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Price (₹)</TableHead>
                <TableHead>Shortage %</TableHead>
                <TableHead>Effective Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></TableCell></TableRow>
              ) : prices.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center h-24">No records found</TableCell></TableRow>
              ) : (
                prices.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.fabric_master?.name}</TableCell>
                    <TableCell>{p.va_category || '-'}</TableCell>
                    <TableCell>{p.va_unit?.unit_name}</TableCell>
                    <TableCell className="font-bold">₹{p.price}</TableCell>
                    <TableCell>{p.shortage_percent}%</TableCell>
                    <TableCell>{new Date(p.effective_date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <VAPriceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleSave} 
      />
    </div>
  );
};

export default VAPricesPage;