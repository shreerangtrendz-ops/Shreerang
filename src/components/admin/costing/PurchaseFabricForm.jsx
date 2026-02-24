import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PurchaseFabricService } from '@/services/PurchaseFabricService';
import { FabricService } from '@/services/FabricService';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { FABRIC_TYPES, PAYMENT_TERMS } from '@/lib/formConstants';
import { validateRequired, validatePositiveNumber, validatePercentage } from '@/lib/validationHelpers';

const PurchaseFabricForm = ({ initialData, onSuccess, onCancel }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fabrics, setFabrics] = useState([]);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    fabric_type: FABRIC_TYPES.BASE,
    sku_id: '',
    price_per_meter: '',
    discount_percent: '',
    payment_terms: '',
    design_number: '',
    ...initialData
  });

  useEffect(() => {
    loadFabrics();
  }, []);

  const loadFabrics = async () => {
    try {
      const data = await FabricService.listFabrics();
      setFabrics(data || []);
    } catch(e) { console.error(e); }
  };

  // Filter SKUs based on selected fabric type
  const filteredFabrics = fabrics.filter(f => f.type === formData.fabric_type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!validateRequired(formData.date)) return toast({ variant: "destructive", title: "Error", description: "Date is required" });
    if (!validateRequired(formData.supplier_name)) return toast({ variant: "destructive", title: "Error", description: "Supplier Name is required" });
    if (!validateRequired(formData.sku_id)) return toast({ variant: "destructive", title: "Error", description: "SKU is required" });
    if (!validatePositiveNumber(formData.price_per_meter)) return toast({ variant: "destructive", title: "Error", description: "Valid Price is required" });
    if (formData.discount_percent && !validatePercentage(formData.discount_percent)) return toast({ variant: "destructive", title: "Error", description: "Invalid Discount %" });

    // Conditional Validation: Design Number required for Finish/Fancy
    if ((formData.fabric_type === FABRIC_TYPES.FINISH || formData.fabric_type === FABRIC_TYPES.FANCY) && !validateRequired(formData.design_number)) {
      return toast({ variant: "destructive", title: "Error", description: "Design Number is required for this fabric type" });
    }

    setLoading(true);
    try {
      const payload = { ...formData };
      
      if (initialData?.id) {
        await PurchaseFabricService.updatePurchase(initialData.id, payload);
        toast({ title: "Updated", description: "Purchase record updated." });
      } else {
        await PurchaseFabricService.createPurchase(payload);
        toast({ title: "Created", description: "Purchase record created." });
      }
      onSuccess?.();
    } catch(e) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date <span className="text-red-500">*</span></Label>
          <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Supplier Name <span className="text-red-500">*</span></Label>
          <Input value={formData.supplier_name} onChange={e => setFormData({...formData, supplier_name: e.target.value})} placeholder="e.g. ABC Textiles" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fabric Type <span className="text-red-500">*</span></Label>
          <Select value={formData.fabric_type} onValueChange={val => setFormData({...formData, fabric_type: val, sku_id: ''})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.values(FABRIC_TYPES).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>SKU <span className="text-red-500">*</span></Label>
          <Select value={formData.sku_id} onValueChange={val => setFormData({...formData, sku_id: val})}>
            <SelectTrigger><SelectValue placeholder="Select SKU" /></SelectTrigger>
            <SelectContent>
              {filteredFabrics.map(f => <SelectItem key={f.id} value={f.id}>{f.sku} - {f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Price per Meter (₹) <span className="text-red-500">*</span></Label>
          <Input type="number" value={formData.price_per_meter} onChange={e => setFormData({...formData, price_per_meter: e.target.value})} placeholder="0.00" />
        </div>
        <div className="space-y-2">
          <Label>Discount %</Label>
          <Input type="number" value={formData.discount_percent} onChange={e => setFormData({...formData, discount_percent: e.target.value})} placeholder="0" />
        </div>
        <div className="space-y-2">
          <Label>Payment Terms</Label>
          <Select value={formData.payment_terms} onValueChange={val => setFormData({...formData, payment_terms: val})}>
            <SelectTrigger><SelectValue placeholder="Select Terms" /></SelectTrigger>
            <SelectContent>
              {PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(formData.fabric_type === FABRIC_TYPES.FINISH || formData.fabric_type === FABRIC_TYPES.FANCY) && (
        <div className="space-y-2">
          <Label>Design Number <span className="text-red-500">*</span></Label>
          <Input value={formData.design_number} onChange={e => setFormData({...formData, design_number: e.target.value})} placeholder="Enter Design Number" />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
          {initialData ? 'Update Purchase' : 'Save Purchase'}
        </Button>
      </div>
    </form>
  );
};

export default PurchaseFabricForm;