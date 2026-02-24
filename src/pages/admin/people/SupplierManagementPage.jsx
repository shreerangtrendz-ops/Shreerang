import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Plus, Search, Phone, Mail, MapPin, 
  Trash2, Edit, ExternalLink 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { SupplierService } from '@/services/SupplierService';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

const SupplierManagementPage = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await SupplierService.getAllSuppliers();
      setSuppliers(ensureArray(data, 'SupplierManagementPage'));
    } catch (e) {
      logError(e, 'SupplierManagementPage fetch');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (formData.id) {
        await SupplierService.updateSupplier(formData.id, formData);
        toast({ title: "Updated", description: "Supplier updated" });
      } else {
        await SupplierService.createSupplier(formData);
        toast({ title: "Created", description: "Supplier added" });
      }
      setIsCreateOpen(false);
      loadData();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    try {
      await SupplierService.deleteSupplier(id);
      loadData();
      toast({ title: "Deleted", description: "Supplier removed" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  const safeSuppliers = ensureArray(suppliers);

  return (
    <div className="space-y-6">
      <Helmet><title>Suppliers | Admin</title></Helmet>
      <AdminPageHeader 
        title="Supplier Management" 
        description="Manage vendor relationships and details"
        actions={
          <Button onClick={() => { setFormData({}); setIsCreateOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Supplier
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {safeSuppliers.map(supplier => (
          <Card key={supplier.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{supplier.supplier_name}</h3>
                  <p className="text-sm text-slate-500">{supplier.contact_person}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setFormData(supplier); setIsCreateOpen(true); }}>
                    <Edit className="h-4 w-4 text-blue-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4" /> {supplier.phone || supplier.mobile || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4" /> {supplier.email || 'N/A'}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-4 w-4" /> {supplier.address || 'N/A'}
                </div>
              </div>

              <div className="pt-2 border-t flex justify-between items-center text-xs text-slate-500">
                <span>GST: {supplier.gst_number || 'N/A'}</span>
                <span>Terms: {supplier.payment_terms || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{formData.id ? 'Edit' : 'Add'} Supplier</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Supplier Name</Label>
              <Input value={formData.supplier_name || ''} onChange={e => setFormData({...formData, supplier_name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={formData.contact_person || ''} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GST Number</Label>
                <Input value={formData.gst_number || ''} onChange={e => setFormData({...formData, gst_number: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Input value={formData.payment_terms || ''} onChange={e => setFormData({...formData, payment_terms: e.target.value})} placeholder="e.g. 30 Days" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit}>{formData.id ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierManagementPage;