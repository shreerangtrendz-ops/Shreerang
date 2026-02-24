import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarPlus as CalendarIcon, User, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const SalesOrderHeader = ({ orderDetails, setOrderDetails, customers, selectedCustomer, onCustomerSelect }) => {
  return (
    <Card className="mb-6">
      <CardHeader className="py-3 bg-slate-50 border-b">
        <div className="flex justify-between items-center">
             <CardTitle className="text-sm font-medium">Order Information</CardTitle>
             <span className="text-xs font-mono bg-slate-200 px-2 py-1 rounded text-slate-700">{orderDetails.orderNo || 'New Order'}</span>
        </div>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Customer Selection */}
        <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1"><User className="h-3 w-3" /> Customer Name *</Label>
            <Select value={selectedCustomer?.id} onValueChange={onCustomerSelect}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select Customer" /></SelectTrigger>
                <SelectContent>
                    {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {selectedCustomer && (
                <div className="text-xs text-muted-foreground bg-slate-50 p-2 rounded border">
                    <p>{selectedCustomer.contact_person}</p>
                    <p>{selectedCustomer.email}</p>
                    <p>{selectedCustomer.phone}</p>
                </div>
            )}
        </div>

        {/* Dates */}
        <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> Order Date</Label>
            <Input 
                type="date" 
                value={orderDetails.date} 
                onChange={e => setOrderDetails({...orderDetails, date: e.target.value})} 
                className="h-9"
            />
            <Label className="text-xs font-semibold flex items-center gap-1 mt-2">Delivery Date</Label>
            <Input 
                type="date" 
                value={orderDetails.deliveryDate} 
                onChange={e => setOrderDetails({...orderDetails, deliveryDate: e.target.value})} 
                className="h-9"
            />
        </div>

        {/* Shipping Address */}
        <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center gap-1"><MapPin className="h-3 w-3" /> Delivery Address</Label>
            <Textarea 
                value={orderDetails.deliveryAddress} 
                onChange={e => setOrderDetails({...orderDetails, deliveryAddress: e.target.value})} 
                className="h-[105px] resize-none text-xs"
                placeholder="Enter delivery address..."
            />
        </div>

      </CardContent>
    </Card>
  );
};

export default SalesOrderHeader;