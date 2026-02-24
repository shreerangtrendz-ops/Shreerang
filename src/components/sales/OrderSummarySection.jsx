import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const OrderSummarySection = ({ totals, setTotals, itemsTotal }) => {
  return (
    <Card className="h-full">
      <CardHeader className="py-3 bg-slate-50 border-b">
        <CardTitle className="text-sm font-medium">Payment & Totals</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        
        <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">₹{itemsTotal.toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 items-center">
            <Label className="text-xs">Discount</Label>
            <div className="flex gap-1">
                <Input 
                    type="number" 
                    className="h-7 text-xs" 
                    placeholder="0" 
                    value={totals.discount}
                    onChange={(e) => setTotals({...totals, discount: e.target.value})}
                />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-2 items-center">
            <Label className="text-xs">GST (%)</Label>
            <Input 
                type="number" 
                className="h-7 text-xs" 
                value={totals.taxPercent}
                onChange={(e) => setTotals({...totals, taxPercent: e.target.value})}
            />
        </div>

        <div className="grid grid-cols-2 gap-2 items-center">
            <Label className="text-xs">Shipping Cost</Label>
            <Input 
                type="number" 
                className="h-7 text-xs" 
                value={totals.shipping}
                onChange={(e) => setTotals({...totals, shipping: e.target.value})}
            />
        </div>

        <Separator />

        <div className="flex justify-between items-end">
            <span className="font-bold text-base">Total Amount</span>
            <span className="font-bold text-xl text-primary">₹{totals.finalAmount.toFixed(2)}</span>
        </div>

        <div className="space-y-2 pt-2">
            <Label className="text-xs">Payment Terms</Label>
            <Select 
                value={totals.paymentTerms} 
                onValueChange={(v) => setTotals({...totals, paymentTerms: v})}
            >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select terms" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="Immediate">Immediate</SelectItem>
                    <SelectItem value="Net 15">Net 15 Days</SelectItem>
                    <SelectItem value="Net 30">Net 30 Days</SelectItem>
                    <SelectItem value="Net 60">Net 60 Days</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="space-y-2">
            <Label className="text-xs">Notes</Label>
            <Textarea 
                placeholder="Payment notes or instructions..." 
                className="h-20 text-xs resize-none"
                value={totals.notes}
                onChange={(e) => setTotals({...totals, notes: e.target.value})}
            />
        </div>

      </CardContent>
    </Card>
  );
};

export default OrderSummarySection;