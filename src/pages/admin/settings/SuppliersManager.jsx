import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { SupplierService } from '@/services/SupplierService';
import { Plus, Edit, Trash2, Download, Search } from 'lucide-react';

const SuppliersManager = () => {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    supplier_name: '',
    contact_person: '',
    phone: '',
    email: '',
    payment_terms: 'Cash',
    address: '',
    notes: ''
  });

  useEffect(() => { loadSuppliers(); }, [search]);

  const loadSuppliers = async () => {
    try {
      const data = await SupplierService.getSuppliers({ search });
      setSuppliers(data);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load suppliers' });
    }
  };

  const handleOpenModal = (supplier = null) => {
    if (supplier) {
      setEditingId(supplier.id);
      setFormData({
        supplier_name: supplier.supplier_name || '',
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        payment_terms: supplier.payment_terms || 'Cash',
        address: supplier.address || '',
        notes: supplier.notes || ''
      });
    } else {
      setEditingId(null);
      setFormData({ supplier_name: '', contact_person: '', phone: '', email: '', payment_terms: 'Cash', address: '', notes: '' });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.supplier_name) throw new Error("Supplier Name is required");
      
      if (editingId) {
        await SupplierService.updateSupplier(editingId, formData);
        toast({ title: 'Success', description: 'Supplier updated' });
      } else {
        await SupplierService.createSupplier(formData);
        toast({ title: 'Success', description: 'Supplier added' });
      }
      setModalOpen(false);
      loadSuppliers();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      try {
        await SupplierService.deleteSupplier(id);
        toast({ title: 'Success', description: 'Supplier deleted' });
        loadSuppliers();
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete' });
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Helmet><title>Suppliers Manager</title></Helmet>
      
      <div className="flex justify-between items-center bg-slate-900 text-amber-500 p-6 rounded-xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold">Suppliers Manager</h1>
          <p className="text-slate-300 mt-2">Manage fabric suppliers and contacts</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-amber-500 border-amber-500 hover:bg-slate-800" onClick={() => SupplierService.exportToExcel(suppliers)}><Download className="w-4 h-4 mr-2"/> Export</Button>
          <Button className="bg-amber-500 text-slate-900 hover:bg-amber-400" onClick={() => handleOpenModal()}><Plus className="w-4 h-4 mr-2"/> Add Supplier</Button>
        </div>
      </div>

      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2 max-w-sm">
            <Search className="text-slate-400 w-5 h-5"/>
            <Input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.supplier_name}</TableCell>
                  <TableCell>
                    <div>{s.contact_person}</div>
                    <div className="text-sm text-slate-500">{s.phone}</div>
                  </TableCell>
                  <TableCell>{s.payment_terms}</TableCell>
                  <TableCell className="max-w-xs truncate">{s.address}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(s)}><Edit className="w-4 h-4 text-blue-600"/></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-red-600"/></Button>
                  </TableCell>
                </TableRow>
              ))}
              {suppliers.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8">No suppliers found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Supplier Name *</Label><Input value={formData.supplier_name} onChange={e => setFormData({...formData, supplier_name: e.target.value})} /></div>
            <div className="space-y-2"><Label>Contact Person</Label><Input value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select value={formData.payment_terms} onValueChange={v => setFormData({...formData, payment_terms: v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {['Cash', '7 Days', '15 Days', '30 Days', '45 Days', '60 Days'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2"><Label>Address</Label><Textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
            <div className="space-y-2 col-span-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-slate-900 text-white">Save Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default SuppliersManager;