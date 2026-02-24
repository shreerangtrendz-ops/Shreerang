import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { PricingService } from '@/services/PricingService';
import { UnitService } from '@/services/UnitService';

// Generic Fabric Price Modal
export const FabricPriceModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm();
  const [fabrics, setFabrics] = useState([]);

  useEffect(() => {
    PricingService.getFabrics().then(setFabrics);
    if (isOpen) {
      reset(initialData || { fabric_master_id: '', price: '', effective_date: new Date().toISOString().split('T')[0] });
    }
  }, [isOpen, initialData, reset]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initialData ? 'Edit' : 'Add'} Fabric Price</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Fabric</Label>
            <Controller
              name="fabric_master_id"
              control={control}
              rules={{ required: 'Required' }}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={!!initialData}>
                  <SelectTrigger><SelectValue placeholder="Select Fabric" /></SelectTrigger>
                  <SelectContent>
                    {fabrics.map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.sku})</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.fabric_master_id && <p className="text-xs text-red-500">Required</p>}
          </div>
          <div className="space-y-2">
            <Label>Price (₹/mtr)</Label>
            <Input type="number" step="0.01" {...register('price', { required: 'Required', min: 0 })} />
          </div>
          <div className="space-y-2">
            <Label>Effective Date</Label>
            <Input type="date" {...register('effective_date', { required: 'Required' })} />
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

// Job Price Modal
export const JobPriceModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { register, handleSubmit, control, reset, formState: { isSubmitting } } = useForm();
  const [fabrics, setFabrics] = useState([]);
  const [units, setUnits] = useState([]);

  useEffect(() => {
    PricingService.getFabrics(['finish', 'fancy_base', 'fancy_finish']).then(setFabrics);
    UnitService.getJobWorkUnits().then(setUnits);
    if (isOpen) {
      reset(initialData || { 
        fabric_master_id: '', job_work_unit_id: '', price: '', 
        charge_on: 'Input', shortage_percent: 0, effective_date: new Date().toISOString().split('T')[0] 
      });
    }
  }, [isOpen, initialData, reset]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Job Price Configuration</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Fabric</Label>
                <Controller
                  name="fabric_master_id"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select Fabric" /></SelectTrigger>
                      <SelectContent>
                        {fabrics.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
             </div>
             <div className="space-y-2">
                <Label>Job Unit</Label>
                <Controller
                  name="job_work_unit_id"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
                      <SelectContent>
                        {units.map(u => <SelectItem key={u.id} value={u.id}>{u.unit_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" step="0.01" {...register('price', { required: true, min: 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Shortage %</Label>
              <Input type="number" step="0.01" {...register('shortage_percent', { min: 0, max: 100 })} />
            </div>
          </div>
          <div className="space-y-2">
              <Label>Charge On</Label>
              <Controller
                  name="charge_on"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Input">Input Quantity</SelectItem>
                        <SelectItem value="Output">Output Quantity</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
          </div>
          <div className="space-y-2">
            <Label>Effective Date</Label>
            <Input type="date" {...register('effective_date', { required: true })} />
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