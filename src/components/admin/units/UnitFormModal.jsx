import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const UnitFormModal = ({ isOpen, onClose, onSubmit, initialData, type = 'Job' }) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (isOpen) {
      reset(initialData || {
        unit_name: '',
        unit_code: '',
        contact_person: '',
        phone: '',
        email: '',
        address: ''
      });
    }
  }, [isOpen, initialData, reset]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit' : 'Add'} {type} Unit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_name">Unit Name *</Label>
              <Input id="unit_name" {...register('unit_name', { required: 'Required' })} className={errors.unit_name ? "border-red-500" : ""} />
              {errors.unit_name && <p className="text-xs text-red-500">{errors.unit_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_code">Unit Code *</Label>
              <Input id="unit_code" {...register('unit_code', { required: 'Required' })} className={errors.unit_code ? "border-red-500" : ""} />
              {errors.unit_code && <p className="text-xs text-red-500">{errors.unit_code.message}</p>}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input id="contact_person" {...register('contact_person')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone', { pattern: { value: /^\d{10}$/, message: "10 digits required" } })} />
              {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email', { pattern: { value: /^\S+@\S+$/i, message: "Invalid email" } })} />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...register('address')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Unit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UnitFormModal;