import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { UnitService } from '@/services/UnitService';
import UnitFormModal from '@/components/admin/units/UnitFormModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Edit, Trash2, Loader2 } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

const VAUnitsPage = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const { toast } = useToast();

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const data = await UnitService.getVAUnits();
      setUnits(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load units' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUnits(); }, []);

  const handleSave = async (data) => {
    try {
      if (editingUnit) {
        await UnitService.updateVAUnit(editingUnit.id, data);
        toast({ title: 'Success', description: 'VA Unit updated' });
      } else {
        await UnitService.addVAUnit(data);
        toast({ title: 'Success', description: 'VA Unit added' });
      }
      setIsModalOpen(false);
      fetchUnits();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Operation failed' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await UnitService.deleteVAUnit(id);
      toast({ title: 'Deleted', description: 'Unit deleted' });
      fetchUnits();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Delete failed' });
    }
  };

  const filteredUnits = units.filter(u => 
    u.unit_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.unit_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6 pb-24">
      <Helmet><title>VA Units | Admin</title></Helmet>
      <AdminPageHeader 
        title="VA Units" 
        description="Manage Value Addition units."
        actions={
          <Button onClick={() => { setEditingUnit(null); setIsModalOpen(true); }} className="bg-slate-900 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add VA Unit
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
             <CardTitle>VA Units</CardTitle>
             <div className="relative w-64">
               <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
               <Input placeholder="Search..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
             </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></TableCell></TableRow>
              ) : filteredUnits.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24">No units found</TableCell></TableRow>
              ) : (
                filteredUnits.map(unit => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.unit_name}</TableCell>
                    <TableCell><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{unit.unit_code || 'N/A'}</span></TableCell>
                    <TableCell>{unit.contact_person || '-'}</TableCell>
                    <TableCell>{unit.email || '-'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingUnit(unit); setIsModalOpen(true); }}>
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(unit.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UnitFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleSave} 
        initialData={editingUnit}
        type="VA"
      />
    </div>
  );
};

export default VAUnitsPage;