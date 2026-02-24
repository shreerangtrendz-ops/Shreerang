import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { PurchaseOrderService } from '@/services/PurchaseOrderService';

const STATUS_OPTIONS = ['Draft', 'Sent', 'Received', 'Partial'];

const PurchaseOrderForm = ({ initialData, onCancel, onSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  
  const [formData, setFormData] = useState({
    po_number: '',
    date: new Date().toISOString().split('T')[0],
    supplier_id: '',
    status: 'Draft',
    notes: '',
    items: [], // Array of { design_number, quantity, rate, total }
    ...initialData
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const data = await PurchaseOrderService.getSuppliers();
      setSuppliers(data || []);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load suppliers" });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto calculate total
    if (field === 'quantity' || field === 'rate') {
      const qty = Number(newItems[index].quantity) || 0;
      const rate = Number(newItems[index].rate) || 0;
      newItems[index].total = (qty * rate).toFixed(2);
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { design_number: '', quantity: '', rate: '', total: 0 }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateGrandTotal = () => {
    return formData.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier_id) return toast({ variant: "destructive", description: "Please select a supplier" });
    if (formData.items.length === 0) return toast({ variant: "destructive", description: "Please add at least one item" });

    setLoading(true);
    try {
      const payload = {
        ...formData,
        total_amount: calculateGrandTotal()
      };

      if (initialData?.id) {
        await PurchaseOrderService.update(initialData.id, payload);
        toast({ title: "Success", description: "Purchase Order updated successfully" });
      } else {
        await PurchaseOrderService.create(payload);
        toast({ title: "Success", description: "Purchase Order created successfully" });
      }
      onSuccess?.();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{initialData ? 'Edit Purchase Order' : 'New Purchase Order'}</CardTitle>
          <Button type="button" variant="ghost" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>PO Number</Label>
            <Input 
              value={formData.po_number} 
              onChange={e => setFormData({...formData, po_number: e.target.value})}
              placeholder="Auto-generated if empty"
              disabled={!!initialData}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Date <span className="text-red-500">*</span></Label>
            <Input 
              type="date"
              value={formData.date} 
              onChange={e => setFormData({...formData, date: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Supplier <span className="text-red-500">*</span></Label>
            <Select 
              value={formData.supplier_id} 
              onValueChange={val => setFormData({...formData, supplier_id: val})}
            >
              <SelectTrigger><SelectValue placeholder="Select Supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.supplier_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={val => setFormData({...formData, status: val})}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Notes</Label>
            <Textarea 
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="Terms, delivery instructions, etc."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Items</CardTitle>
          <Button type="button" onClick={addItem} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" /> Add Item
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Design / Item</TableHead>
                <TableHead className="w-[20%]">Quantity</TableHead>
                <TableHead className="w-[20%]">Rate</TableHead>
                <TableHead className="w-[20%] text-right">Total</TableHead>
                <TableHead className="w-[10%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-slate-500">
                    No items added yet. Click "Add Item" to start.
                  </TableCell>
                </TableRow>
              ) : (
                formData.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input 
                        value={item.design_number} 
                        onChange={e => handleItemChange(index, 'design_number', e.target.value)}
                        placeholder="e.g. D-101"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number"
                        value={item.quantity} 
                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number"
                        value={item.rate} 
                        onChange={e => handleItemChange(index, 'rate', e.target.value)}
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(item.total).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          <div className="p-4 bg-slate-50 border-t flex justify-end items-center gap-4">
            <span className="text-sm font-medium text-slate-500">Grand Total:</span>
            <span className="text-2xl font-bold text-slate-900">
              ₹{calculateGrandTotal()}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {initialData ? 'Update Order' : 'Create Order'}
        </Button>
      </div>
    </form>
  );
};

export default PurchaseOrderForm;