import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FabricService } from '@/services/FabricService';
import { PriceService } from '@/services/PriceService';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const PriceForm = ({ onSuccess, onCancel }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fabrics, setFabrics] = useState([]);
  const [formData, setFormData] = useState({
    fabric_master_id: '',
    cost_price: 0,
    margin_percent: 10,
    discount_percent: 0,
    commission_percent: 2
  });
  const [sellingPrice, setSellingPrice] = useState(0);

  useEffect(() => {
    loadFabrics();
  }, []);

  useEffect(() => {
    calculateSellingPrice();
  }, [formData]);

  const loadFabrics = async () => {
    const data = await FabricService.listFabrics();
    setFabrics(data || []);
  };

  const calculateSellingPrice = () => {
    // Formula: SP = CP + (CP * Margin%) - (SP * Discount%) - (SP * Commission%)
    // SP + SP*Discount% + SP*Commission% = CP * (1 + Margin%)
    // SP * (1 + Discount% + Commission%) = CP * (1 + Margin%)
    // SP = (CP * (1 + Margin%)) / (1 + Discount% + Commission%)
    
    const cp = Number(formData.cost_price) || 0;
    const margin = Number(formData.margin_percent) / 100;
    const discount = Number(formData.discount_percent) / 100;
    const commission = Number(formData.commission_percent) / 100;

    const numerator = cp * (1 + margin);
    const denominator = 1 + discount + commission; // Approximation based on user formula SP reference recursion
    // The user formula was: Selling Price = Cost Price + (Cost Price × Margin%) - (Selling Price × Discount%) - (Selling Price × Commission%)
    // SP = CP(1+M) - SP(D) - SP(C)
    // SP + SP(D) + SP(C) = CP(1+M)
    // SP (1 + D + C) = CP(1+M)
    // SP = CP(1+M) / (1 + D + C)
    // NOTE: Discount and Commission often calculated on Final SP, so this algebraic rearrangement is correct for that logic.

    const sp = denominator !== 0 ? numerator / denominator : 0;
    setSellingPrice(sp.toFixed(2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fabric_master_id) {
        toast({ variant: "destructive", title: "Validation", description: "Select a fabric." });
        return;
    }
    setLoading(true);
    try {
        await PriceService.createPrice({
            ...formData,
            selling_price: sellingPrice
        });
        toast({ title: "Saved", description: "Price entry created." });
        onSuccess();
    } catch(e) {
        toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
        setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
       <div className="space-y-2">
           <Label>Fabric</Label>
           <Select onValueChange={(val) => setFormData({...formData, fabric_master_id: val})}>
                <SelectTrigger><SelectValue placeholder="Select Fabric..." /></SelectTrigger>
                <SelectContent>
                    {fabrics.map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.sku})</SelectItem>)}
                </SelectContent>
           </Select>
       </div>
       
       <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
               <Label>Cost Price (₹)</Label>
               <Input type="number" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} />
           </div>
           <div className="space-y-2">
               <Label>Margin (%)</Label>
               <Input type="number" value={formData.margin_percent} onChange={e => setFormData({...formData, margin_percent: e.target.value})} />
           </div>
           <div className="space-y-2">
               <Label>Discount (%)</Label>
               <Input type="number" value={formData.discount_percent} onChange={e => setFormData({...formData, discount_percent: e.target.value})} />
           </div>
           <div className="space-y-2">
               <Label>Commission (%)</Label>
               <Input type="number" value={formData.commission_percent} onChange={e => setFormData({...formData, commission_percent: e.target.value})} />
           </div>
       </div>

       <div className="p-4 bg-slate-100 rounded-lg text-center">
            <span className="text-sm text-slate-500 block">Calculated Selling Price</span>
            <span className="text-2xl font-bold text-indigo-600">₹{sellingPrice}</span>
       </div>

       <div className="flex justify-end gap-2 pt-4">
           <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
           <Button type="submit" disabled={loading}>
               {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Price
           </Button>
       </div>
    </form>
  );
};
export default PriceForm;