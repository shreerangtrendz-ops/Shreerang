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
import { ProcessHSNService, ValueAdditionHSNService, ExpenseHSNService, GarmentHSNService } from '@/services/HSNCodeService';
import { Plus, Edit, Trash2, Download, Search, AlertTriangle } from 'lucide-react';

const HSNCodeMaster = () => {
  const { toast } = useToast();
  const [codes, setCodes] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('process');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    hsn_code: '',
    description: '',
    gst_rate: 5,
    notes: ''
  });

  const getService = () => {
    switch(category) {
      case 'process': return ProcessHSNService;
      case 'value_addition': return ValueAdditionHSNService;
      case 'expense': return ExpenseHSNService;
      case 'garment': return GarmentHSNService;
      default: return ProcessHSNService;
    }
  };

  useEffect(() => { loadCodes(); }, [search, category]);

  const loadCodes = async () => {
    try {
      const data = await getService().getAll();
      const filtered = data.filter(c => 
        (c.hsn_code && c.hsn_code.includes(search)) || 
        (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
      );
      setCodes(filtered);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load HSN codes' });
    }
  };

  const handleOpenModal = (code = null) => {
    if (code) {
      setEditingId(code.id);
      setFormData({
        hsn_code: code.hsn_code || '',
        description: code.description || '',
        gst_rate: code.gst_rate || 5,
        notes: code.notes || ''
      });
    } else {
      setEditingId(null);
      setFormData({ hsn_code: '', description: '', gst_rate: 5, notes: '' });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      getService().validateHSNCode(formData.hsn_code);
      
      if (editingId) {
        await getService().update(editingId, formData);
        toast({ title: 'Success', description: 'HSN Code updated' });
      } else {
        await getService().create(formData);
        toast({ title: 'Success', description: 'HSN Code added' });
      }
      setModalOpen(false);
      loadCodes();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Validation Error', description: e.message });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this HSN Code?")) {
      try {
        await getService().delete(id);
        toast({ title: 'Success', description: 'HSN Code deleted' });
        loadCodes();
      } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete' });
      }
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Helmet><title>HSN Code Master</title></Helmet>
      
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3 mb-6">
        <AlertTriangle className="text-red-500 w-5 h-5 mt-0.5" />
        <div>
          <h3 className="text-red-800 font-bold">IMPORTANT NOTE</h3>
          <p className="text-red-700">HSN codes are INTERNAL ONLY - never shown in fabric names or SKUs.</p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-slate-900 text-amber-500 p-6 rounded-xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold">HSN Code Master</h1>
          <p className="text-slate-300 mt-2">Manage tax classifications internally</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="text-amber-500 border-amber-500 hover:bg-slate-800" onClick={() => getService().exportToExcel(codes)}><Download className="w-4 h-4 mr-2"/> Export</Button>
          <Button className="bg-amber-500 text-slate-900 hover:bg-amber-400" onClick={() => handleOpenModal()}><Plus className="w-4 h-4 mr-2"/> Add HSN Code</Button>
        </div>
      </div>

      <Card className="rounded-xl shadow-lg">
        <CardHeader className="flex flex-row justify-between items-center">
          <div className="flex items-center gap-2 max-w-sm">
            <Search className="text-slate-400 w-5 h-5"/>
            <Input placeholder="Search HSN codes..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="w-64">
             <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="process">Process HSN</SelectItem>
                  <SelectItem value="value_addition">Value Addition HSN</SelectItem>
                  <SelectItem value="expense">Expense HSN</SelectItem>
                  <SelectItem value="garment">Garment HSN</SelectItem>
                </SelectContent>
              </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>HSN Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>GST Rate (%)</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold">{c.hsn_code}</TableCell>
                  <TableCell>{c.description}</TableCell>
                  <TableCell>{c.gst_rate}%</TableCell>
                  <TableCell className="text-sm text-slate-500 max-w-xs truncate">{c.notes}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(c)}><Edit className="w-4 h-4 text-blue-600"/></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-red-600"/></Button>
                  </TableCell>
                </TableRow>
              ))}
              {codes.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8">No HSN codes found for this category</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'Edit HSN Code' : 'Add New HSN Code'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>HSN Code (8 digits) *</Label><Input value={formData.hsn_code} onChange={e => setFormData({...formData, hsn_code: e.target.value})} maxLength={8} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
            <div className="space-y-2"><Label>GST Rate (%)</Label><Input type="number" value={formData.gst_rate} onChange={e => setFormData({...formData, gst_rate: e.target.value})} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-slate-900 text-white">Save HSN Code</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default HSNCodeMaster;