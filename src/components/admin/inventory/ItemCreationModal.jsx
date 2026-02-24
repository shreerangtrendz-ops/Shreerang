import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';

const ItemCreationModal = ({ isOpen, onClose, onItemCreated, initialType = 'ready_made' }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemType, setItemType] = useState(initialType);
  
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    sku: '', // Auto-generated ideally
    retail_price: '',
    
    // Ready Made Specific
    garment_type: '',
    set_type: 'Single',
    sizes: [],
    
    // Fabric Specific
    base_type: '',
    width: '',
    gsm: '',
    process_type: ''
  });

  const SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'];

  const handleSizeChange = (size, checked) => {
    setFormData(prev => ({
      ...prev,
      sizes: checked 
        ? [...prev.sizes, size]
        : prev.sizes.filter(s => s !== size)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast({ title: "Name is required", variant: "destructive" });
    if (!formData.retail_price) return toast({ title: "Price is required", variant: "destructive" });

    setIsSubmitting(true);

    try {
      let result;
      
      if (itemType === 'ready_made') {
        const payload = {
            name: formData.name,
            sku: formData.sku || `SKU-${Date.now()}`,
            retail_price: parseFloat(formData.retail_price),
            garment_type: formData.garment_type,
            set_type: formData.set_type,
            specifications: { sizes: formData.sizes },
            is_active: true
        };
        const { data, error } = await supabase.from('products').insert(payload).select().single();
        if (error) throw error;
        result = data;
      } else {
        const payload = {
            fabric_name: formData.name,
            base_type: formData.base_type,
            width: formData.width,
            gsm: formData.gsm ? parseFloat(formData.gsm) : null,
            process_type: formData.process_type,
            // Assuming price is stored in a related table or handled differently for fabric master
            // For simplicity in this flow, we'll assume there's a default price handling logic
        };
        const { data, error } = await supabase.from('fabrics').insert(payload).select().single();
        if (error) throw error;
        result = { ...data, name: data.fabric_name, retail_price: parseFloat(formData.retail_price) }; 
        // Note: Fabrics table might store price differently (e.g. fabric_costs table), but we return a unified structure for the order form
      }

      toast({ title: "Item Created", description: `${formData.name} added successfully.` });
      onItemCreated({ ...result, item_type: itemType });
      onClose();
      
      // Reset
      setFormData({
        name: '', category_id: '', sku: '', retail_price: '',
        garment_type: '', set_type: 'Single', sizes: [],
        base_type: '', width: '', gsm: '', process_type: ''
      });

    } catch (error) {
      console.error(error);
      toast({ title: "Error creating item", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Item</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
            <RadioGroup value={itemType} onValueChange={setItemType} className="flex gap-4 mb-4">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ready_made" id="new-ready" />
                    <Label htmlFor="new-ready">Ready Made Garment</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fabric" id="new-fabric" />
                    <Label htmlFor="new-fabric">Fabric</Label>
                </div>
            </RadioGroup>

            <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Blue Printed Kurti" />
            </div>

            <div className="space-y-2">
                <Label>Selling Price (₹) *</Label>
                <Input type="number" value={formData.retail_price} onChange={e => setFormData({...formData, retail_price: e.target.value})} />
            </div>

            {itemType === 'ready_made' ? (
                <>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Set Type</Label>
                            <Select value={formData.set_type} onValueChange={v => setFormData({...formData, set_type: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Single">Single</SelectItem>
                                    <SelectItem value="2-Pc Set">2-Pc Set</SelectItem>
                                    <SelectItem value="3-Pc Set">3-Pc Set</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Garment Type</Label>
                            <Input value={formData.garment_type} onChange={e => setFormData({...formData, garment_type: e.target.value})} placeholder="e.g. Kurti" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Available Sizes</Label>
                        <div className="flex flex-wrap gap-4 mt-1">
                            {SIZES.map(size => (
                                <div key={size} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`size-${size}`} 
                                        checked={formData.sizes.includes(size)}
                                        onCheckedChange={(checked) => handleSizeChange(size, checked)}
                                    />
                                    <label htmlFor={`size-${size}`} className="text-sm font-medium leading-none cursor-pointer">{size}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>Base Type</Label>
                            <Input value={formData.base_type} onChange={e => setFormData({...formData, base_type: e.target.value})} placeholder="e.g. Cotton" />
                        </div>
                        <div className="space-y-2">
                            <Label>Width</Label>
                            <Select value={formData.width} onValueChange={v => setFormData({...formData, width: v})}>
                                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="44">44"</SelectItem>
                                    <SelectItem value="58">58"</SelectItem>
                                    <SelectItem value="60">60"</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>GSM</Label>
                            <Input type="number" value={formData.gsm} onChange={e => setFormData({...formData, gsm: e.target.value})} placeholder="e.g. 140" />
                        </div>
                        <div className="space-y-2">
                            <Label>Process Type</Label>
                            <Input value={formData.process_type} onChange={e => setFormData({...formData, process_type: e.target.value})} placeholder="e.g. Printed" />
                        </div>
                    </div>
                </>
            )}

        </div>

        <DialogFooter>
            <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Item
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemCreationModal;