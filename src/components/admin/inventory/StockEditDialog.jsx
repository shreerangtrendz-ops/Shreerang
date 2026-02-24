import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const StockEditDialog = ({ open, onOpenChange, item, onSuccess }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState('Adjustment');
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = async () => {
        if (!quantity || isNaN(quantity)) {
            toast({ variant: 'destructive', title: 'Invalid Quantity' });
            return;
        }

        setLoading(true);
        try {
            const qty = parseFloat(quantity);
            const newStock = (type === 'In' ? (item.ready_stock + qty) : (type === 'Out' ? (item.ready_stock - qty) : item.ready_stock)); 
            
            // 1. Update Stock
            const { error: stockError } = await supabase.from('fabric_stock').update({
                ready_stock: type === 'Adjustment' ? qty : newStock,
                last_updated_date: new Date()
            }).eq('id', item.id);

            if (stockError) throw stockError;

            // 2. Create Transaction
            await supabase.from('stock_transactions').insert({
                fabric_id: item.fabric_id,
                transaction_type: type,
                quantity: qty,
                notes: notes || 'Manual Update'
            });

            toast({ title: 'Stock Updated' });
            onSuccess();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Stock: {item.fabrics?.fabric_name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Transaction Type</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="In">In (Add)</SelectItem>
                                    <SelectItem value="Out">Out (Remove)</SelectItem>
                                    <SelectItem value="Adjustment">Adjustment (Set Exact)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0.00" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason for update..." />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="animate-spin mr-2 h-4 w-4"/>} Update
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
export default StockEditDialog;