import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';

const DispatchModal = ({ isOpen, onClose, order, onDispatchSuccess }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    bill_number: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    notes: '',
    items: [] 
  });

  useEffect(() => {
    if (order && order.items) {
      // Initialize items with 0 dispatch qty, preserving max limit
      setFormData(prev => ({
        ...prev,
        items: order.items.map(item => ({
          sales_order_item_id: item.id,
          item_name: item.product_name || item.item_name, // Fallback depending on query join
          design_number: item.design_number,
          order_qty: item.quantity,
          prev_dispatched: item.dispatched_qty || 0,
          current_dispatch: '', // User input
          unit: item.unit || 'Pcs'
        }))
      }));
    }
  }, [order, isOpen]);

  const handleQtyChange = (itemId, val) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.sales_order_item_id === itemId ? { ...item, current_dispatch: val } : item
      )
    }));
  };

  const handleSubmit = async () => {
    if (!formData.bill_number) return toast({ title: "Bill Number Required", variant: "destructive" });
    
    // Filter items that have a dispatch quantity > 0
    const itemsToDispatch = formData.items.filter(i => parseFloat(i.current_dispatch) > 0);
    
    if (itemsToDispatch.length === 0) return toast({ title: "No items to dispatch", description: "Please enter quantity for at least one item.", variant: "destructive" });

    // Validate quantities
    for (const item of itemsToDispatch) {
        const dispatching = parseFloat(item.current_dispatch);
        const remaining = item.order_qty - item.prev_dispatched;
        if (dispatching > remaining) {
            return toast({ 
                title: "Invalid Quantity", 
                description: `Cannot dispatch ${dispatching} for ${item.item_name}. Max remaining is ${remaining}.`, 
                variant: "destructive" 
            });
        }
    }

    setIsSubmitting(true);
    try {
        // 1. Create Dispatch Record
        const { data: dispatchData, error: dispatchError } = await supabase
            .from('order_dispatches')
            .insert({
                sales_order_id: order.id,
                bill_number: formData.bill_number,
                dispatch_date: formData.dispatch_date,
                notes: formData.notes,
                created_by: (await supabase.auth.getUser()).data.user.id
            })
            .select()
            .single();

        if (dispatchError) throw dispatchError;

        // 2. Create Dispatch Items
        const dispatchItemsPayload = itemsToDispatch.map(item => ({
            order_dispatch_id: dispatchData.id,
            sales_order_item_id: item.sales_order_item_id,
            item_name: item.item_name,
            design_number: item.design_number,
            dispatched_qty: parseFloat(item.current_dispatch),
            dispatched_unit: item.unit
        }));

        const { error: itemsError } = await supabase.from('order_dispatch_items').insert(dispatchItemsPayload);
        if (itemsError) throw itemsError;

        // 3. Update Sales Order Items (increment dispatched_qty)
        for (const item of itemsToDispatch) {
            const newTotal = parseFloat(item.prev_dispatched) + parseFloat(item.current_dispatch);
            await supabase
                .from('sales_order_items')
                .update({ dispatched_qty: newTotal })
                .eq('id', item.sales_order_item_id);
        }

        // 4. Update Sales Order Status
        // Check if fully dispatched
        let allCompleted = true;
        let anyDispatched = true; // Since we just dispatched something, at least partially dispatched

        // Re-check all items from original + updates
        // Simplification: We check if formData items (representing all order items) are now fully fulfilled
        const updatedItems = formData.items.map(i => {
             const justDispatched = parseFloat(i.current_dispatch) || 0;
             const total = (parseFloat(i.prev_dispatched) || 0) + justDispatched;
             return { ...i, totalDispatched: total };
        });

        const isFullyComplete = updatedItems.every(i => i.totalDispatched >= i.order_qty);
        
        const newStatus = isFullyComplete ? 'completed' : 'partially_dispatched';

        await supabase
            .from('sales_orders')
            .update({ 
                order_status: newStatus,
                dispatch_status: newStatus
            })
            .eq('id', order.id);

        toast({ title: "Dispatch Successful", description: "Inventory updated and dispatch recorded." });
        onDispatchSuccess();
        onClose();

    } catch (error) {
        console.error("Dispatch failed", error);
        toast({ title: "Dispatch Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Dispatch / Invoice</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
                <Label>Bill / Invoice Number *</Label>
                <Input value={formData.bill_number} onChange={e => setFormData({...formData, bill_number: e.target.value})} placeholder="e.g. INV-2024-001" />
            </div>
            <div className="space-y-2">
                <Label>Dispatch Date</Label>
                <Input type="date" value={formData.dispatch_date} onChange={e => setFormData({...formData, dispatch_date: e.target.value})} />
            </div>
        </div>

        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Design</TableHead>
                        <TableHead className="text-right">Order Qty</TableHead>
                        <TableHead className="text-right">Prev. Sent</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="w-[120px]">Dispatch Now</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {formData.items.map(item => {
                        const balance = item.order_qty - item.prev_dispatched;
                        return (
                            <TableRow key={item.sales_order_item_id}>
                                <TableCell className="font-medium">{item.item_name}</TableCell>
                                <TableCell>{item.design_number || '-'}</TableCell>
                                <TableCell className="text-right">{item.order_qty} {item.unit}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{item.prev_dispatched}</TableCell>
                                <TableCell className="text-right font-medium">{balance}</TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        className="h-8 w-full" 
                                        placeholder="0" 
                                        max={balance}
                                        value={item.current_dispatch}
                                        onChange={(e) => handleQtyChange(item.sales_order_item_id, e.target.value)}
                                        disabled={balance <= 0}
                                    />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>

        <div className="py-2">
             <Label>Notes (Optional)</Label>
             <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Transport details, etc." />
        </div>

        <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Dispatch
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DispatchModal;