import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

const HSNCodeModal = ({ isOpen, onClose, initialData, type, service, refreshData }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    hsn_code: '',
    hsn_code_description: '',
    gst_rate: '5',
    status: 'active',
    notes: ''
  });

  const getNameField = () => {
    switch(type) {
      case 'process': return 'process_name';
      case 'value_addition': return 'value_addition_name';
      case 'expense': return 'expense_name';
      case 'garment': return 'garment_name';
      default: return 'name';
    }
  };

  const getLabel = () => {
    switch(type) {
      case 'process': return 'Process Name';
      case 'value_addition': return 'Value Addition Name';
      case 'expense': return 'Expense Name';
      case 'garment': return 'Garment Name';
      default: return 'Name';
    }
  };

  useEffect(() => {
    if (initialData) {
      const nameKey = getNameField();
      setFormData({
        name: initialData[nameKey],
        hsn_code: initialData.hsn_code,
        hsn_code_description: initialData.hsn_code_description || '',
        gst_rate: initialData.gst_rate,
        status: initialData.status,
        notes: initialData.notes || ''
      });
    } else {
        setFormData({
            name: '',
            hsn_code: '',
            hsn_code_description: '',
            gst_rate: '5',
            status: 'active',
            notes: ''
          });
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.hsn_code || !formData.gst_rate) {
      return toast({ variant: 'destructive', title: 'Error', description: 'Please fill all required fields.' });
    }

    setLoading(true);
    try {
      const payload = {
        [getNameField()]: formData.name,
        hsn_code: formData.hsn_code,
        hsn_code_description: formData.hsn_code_description,
        gst_rate: parseFloat(formData.gst_rate),
        status: formData.status,
        notes: formData.notes
      };

      if (initialData?.id) {
        await service.update(initialData.id, payload);
        toast({ title: 'Success', description: 'HSN Code updated successfully.' });
      } else {
        await service.create(payload);
        toast({ title: 'Success', description: 'HSN Code created successfully.' });
      }
      refreshData();
      onClose();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save HSN Code.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit' : 'Add'} {getLabel()} HSN</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>{getLabel()} <span className="text-red-500">*</span></Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder={`Enter ${getLabel()}`}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label>HSN Code <span className="text-red-500">*</span></Label>
                <Input 
                    value={formData.hsn_code} 
                    onChange={e => setFormData({...formData, hsn_code: e.target.value})} 
                    placeholder="e.g. 5208"
                />
                </div>
                <div className="space-y-2">
                <Label>GST Rate (%) <span className="text-red-500">*</span></Label>
                <Select value={String(formData.gst_rate)} onValueChange={v => setFormData({...formData, gst_rate: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="18">18%</SelectItem>
                        <SelectItem value="28">28%</SelectItem>
                    </SelectContent>
                </Select>
                </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={formData.hsn_code_description} 
                onChange={e => setFormData({...formData, hsn_code_description: e.target.value})} 
                placeholder="Official HSN description..."
              />
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default HSNCodeModal;