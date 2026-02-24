import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import { ProcessChargeService } from '@/services/ProcessChargeService';
import ProcessChargesForm from '@/components/admin/charges/ProcessChargesForm';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ProcessChargesPage = () => {
  const { toast } = useToast();
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, [search, filterType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await ProcessChargeService.listCharges({ 
        search, 
        processType: filterType 
      });
      setCharges(data || []);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Are you sure?")) return;
    try {
        await ProcessChargeService.deleteCharge(id);
        fetchData();
        toast({ title: 'Deleted', description: 'Record deleted.' });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Process Charges</title></Helmet>
      <AdminPageHeader 
        title="Process Charges" 
        description="Manage dyeing, printing, and other process costs."
        breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Process Charges'}]}
      />

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex gap-2 w-full md:w-auto">
           <div className="relative w-full md:w-64">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
               <Input 
                 placeholder="Search design no..." 
                 className="pl-9"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
           </div>
           <Select value={filterType} onValueChange={setFilterType}>
               <SelectTrigger className="w-[180px]">
                   <Filter className="w-4 h-4 mr-2" />
                   <SelectValue placeholder="Filter Type" />
               </SelectTrigger>
               <SelectContent>
                   <SelectItem value="All">All Processes</SelectItem>
                   <SelectItem value="Dyeing">Dyeing</SelectItem>
                   <SelectItem value="Printing">Printing</SelectItem>
                   <SelectItem value="Bleaching">Bleaching</SelectItem>
               </SelectContent>
           </Select>
        </div>
        <Button onClick={handleCreate}>
           <Plus className="mr-2 h-4 w-4" /> Add Process Charge
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Jobwork Unit</TableHead>
                <TableHead>Process Type</TableHead>
                <TableHead>Design No.</TableHead>
                <TableHead>Rate (₹)</TableHead>
                <TableHead>Shortage %</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : charges.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">No records found.</TableCell></TableRow>
              ) : (
                charges.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell className="font-medium">{item.jobwork_unit_name}</TableCell>
                    <TableCell>{item.process_type}</TableCell>
                    <TableCell>{item.design_number || '-'}</TableCell>
                    <TableCell>₹{item.job_charge}</TableCell>
                    <TableCell>{item.shortage_pct}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                         <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                            <Edit className="h-4 w-4 text-slate-600" />
                         </Button>
                         <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                         </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
           <ProcessChargesForm 
              initialData={editingItem} 
              onSuccess={() => { setIsModalOpen(false); fetchData(); }}
              onCancel={() => setIsModalOpen(false)}
           />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProcessChargesPage;