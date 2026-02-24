import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { FabricService } from '@/services/FabricService';

const PROCESS_TYPES = [
    "MILL_PRINT", "DIGITAL_PRINT_POLY", "DIGITAL_PRINT_PURE", 
    "SOLID_DYED", "EMBROIDERY", "SCHIFFLI", "HAKOBA", "VALUE_ADDITION"
];

const ProductMasterForm = ({ initialData, onSuccess, onCancel }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    process_type: '',
    fabric_master_id: '',
    status: 'Ready', // Ready / Out of Stock
    ...initialData
  });
  const [fabrics, setFabrics] = useState([]);
  const [loading, setLoading] = useState(false);

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
    if (!formData.name || !formData.process_type || !formData.fabric_master_id) {
        toast({ variant: "destructive", title: "Missing Fields", description: "Please fill all required fields." });
        return;
    }

    setLoading(true);
    try {
        const payload = {
            product_name: formData.name, // Mapping to correct DB column from provided schema if differs
            product_type: formData.process_type,
            sku: formData.fabric_master_id, // Storing ID reference or actual SKU? Usually ID. Schema says sku text. I'll store ID for relation or fetch SKU.
            // Adjusting based on standard practice: store ID in a relation column, but provided table 'product_masters' has product_type, sku. 
            // I'll assume 'sku' column stores the fabric_master_id for now as foreign key or actual sku string.
            // Let's store the ID in a new column if possible or stick to 'sku' as foreign key text.
            status: formData.status
        };
        
        // Actually, the schema for product_masters has: product_name, product_type, sku, status. 
        // I will use 'sku' to store fabric_master_id for linking as per typical relation in this setup if no specific FK column exists.

        if (initialData?.id) {
            await supabase.from('product_masters').update(payload).eq('id', initialData.id);
            toast({ title: "Updated", description: "Product updated successfully" });
        } else {
            await supabase.from('product_masters').insert([payload]);
            toast({ title: "Created", description: "New product created successfully" });
        }
        if (onSuccess) onSuccess();
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Product' : 'Create New Product'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Product Name <span className="text-red-500">*</span></Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Process Type <span className="text-red-500">*</span></Label>
                    <Select value={formData.process_type} onValueChange={val => setFormData({...formData, process_type: val})}>
                        <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                        <SelectContent>
                            {PROCESS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Base Fabric <span className="text-red-500">*</span></Label>
                    <Select value={formData.fabric_master_id} onValueChange={val => setFormData({...formData, fabric_master_id: val})}>
                        <SelectTrigger><SelectValue placeholder="Select Fabric" /></SelectTrigger>
                        <SelectContent>
                            {fabrics.map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.sku})</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
                <Switch 
                    id="stock-status" 
                    checked={formData.status === 'Ready'}
                    onCheckedChange={(checked) => setFormData({...formData, status: checked ? 'Ready' : 'Out of Stock'})}
                />
                <Label htmlFor="stock-status">Status: {formData.status}</Label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Product
                </Button>
            </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProductMasterForm;