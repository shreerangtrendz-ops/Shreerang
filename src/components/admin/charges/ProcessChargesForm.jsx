import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProcessChargeService } from '@/services/ProcessChargeService';
import { FabricService } from '@/services/FabricService';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const PROCESS_TYPES = ["Dyeing", "Printing", "Bleaching", "Starching", "Calendering"];

const ProcessChargesForm = ({ initialData, onSuccess, onCancel }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fabrics, setFabrics] = useState([]);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    jobwork_unit_name: '',
    design_number: '',
    process_type: '',
    fabric_type: 'Finish',
    sku_id: '',
    width: '',
    job_charge: '',
    shortage_pct: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        if (!formData.jobwork_unit_name || !formData.process_type || !formData.job_charge) {
            throw new Error("Please fill all required fields.");
        }

        const payload = { ...formData };
        
        if (initialData?.id) {
            await ProcessChargeService.updateCharge(initialData.id, payload);
            toast({ title: "Updated", description: "Process charge updated successfully." });
        } else {
            await ProcessChargeService.createCharge(payload);
            toast({ title: "Created", description: "Process charge created successfully." });
        }
        onSuccess();
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
        setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
       <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
               <Label>Date <span className="text-red-500">*</span></Label>
               <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
           </div>
           <div className="space-y-2">
               <Label>Jobwork Unit Name <span className="text-red-500">*</span></Label>
               <Input value={formData.jobwork_unit_name} onChange={e => setFormData({...formData, jobwork_unit_name: e.target.value})} required placeholder="e.g. A1 Dyers" />
           </div>
       </div>

       <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
               <Label>Process Type <span className="text-red-500">*</span></Label>
               <Select value={formData.process_type} onValueChange={val => setFormData({...formData, process_type: val})}>
                    <SelectTrigger><SelectValue placeholder="Select Process" /></SelectTrigger>
                    <SelectContent>
                        {PROCESS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
               </Select>
           </div>
           <div className="space-y-2">
               <Label>Design Number (Optional)</Label>
               <Input value={formData.design_number} onChange={e => setFormData({...formData, design_number: e.target.value})} placeholder="D-101" />
           </div>
       </div>

       <div className="grid grid-cols-3 gap-4">
           <div className="space-y-2">
               <Label>Fabric Type</Label>
               <Select value={formData.fabric_type} onValueChange={val => setFormData({...formData, fabric_type: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Finish">Finish</SelectItem>
                        <SelectItem value="Fancy">Fancy</SelectItem>
                    </SelectContent>
               </Select>
           </div>
           <div className="space-y-2">
               <Label>Fabric SKU</Label>
               <Select value={formData.sku_id} onValueChange={val => setFormData({...formData, sku_id: val})}>
                    <SelectTrigger><SelectValue placeholder="Select SKU" /></SelectTrigger>
                    <SelectContent>
                        {fabrics.map(f => <SelectItem key={f.id} value={f.sku || f.id}>{f.sku} - {f.name}</SelectItem>)}
                    </SelectContent>
               </Select>
           </div>
           <div className="space-y-2">
               <Label>Width</Label>
               <Input value={formData.width} onChange={e => setFormData({...formData, width: e.target.value})} placeholder='44"' />
           </div>
       </div>

       <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
               <Label>Job Charge (₹) <span className="text-red-500">*</span></Label>
               <Input type="number" value={formData.job_charge} onChange={e => setFormData({...formData, job_charge: e.target.value})} required placeholder="0.00" />
           </div>
           <div className="space-y-2">
               <Label>Shortage %</Label>
               <Input type="number" value={formData.shortage_pct} onChange={e => setFormData({...formData, shortage_pct: e.target.value})} placeholder="0" />
           </div>
       </div>

       <div className="flex justify-end gap-2 pt-4">
           <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
           <Button type="submit" disabled={loading}>
               {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} 
               {initialData ? 'Update Charge' : 'Save Charge'}
           </Button>
       </div>
    </form>
  );
};
export default ProcessChargesForm;