import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import FabricMasterForm from '@/components/admin/fabric/FabricMasterForm';
import { SchiffliMasterService } from '@/services/SchiffliMasterService';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import FormErrorBoundary from '@/components/common/FormErrorBoundary';

const FabricMasterListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentType = searchParams.get('type') || 'base';
  
  const [fabrics, setFabrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFabric, setEditingFabric] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFabrics();
  }, [currentType]);

  const fetchFabrics = async () => {
    setLoading(true);
    try {
      const data = await SchiffliMasterService.listFabricMasters(currentType);
      setFabrics(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load fabrics' });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (val) => {
    setSearchParams({ type: val });
  };

  const handleCreate = () => {
    setEditingFabric(null);
    setIsFormOpen(true);
  };

  const handleEdit = (fabric) => {
    setEditingFabric(fabric);
    setIsFormOpen(true);
  };

  const handleSuccess = () => {
    setIsFormOpen(false);
    fetchFabrics();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Fabric Master List | Admin</title></Helmet>
      <AdminPageHeader 
        title="Fabric Master List" 
        description="Manage all base, fancy, and finished fabrics."
        breadcrumbs={[{label: 'Admin', href: '/admin'}, {label: 'Fabric Master List'}]}
        actions={
          <Button onClick={handleCreate} className="bg-slate-900 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add {currentType.replace('_', ' ')} Fabric
          </Button>
        }
      />

      <Tabs value={currentType} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="base">Base Fabric</TabsTrigger>
          <TabsTrigger value="fancy_base">Fancy Base</TabsTrigger>
          <TabsTrigger value="finish">Finish Fabric</TabsTrigger>
          <TabsTrigger value="fancy_finish">Fancy Finish</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : fabrics.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-32 text-center text-slate-500">No fabrics found.</TableCell></TableRow>
            ) : (
              fabrics.map((fabric) => (
                <TableRow key={fabric.id}>
                  <TableCell className="font-mono">{fabric.sku}</TableCell>
                  <TableCell className="font-medium">{fabric.name}</TableCell>
                  <TableCell><Badge variant="outline">{fabric.type}</Badge></TableCell>
                  <TableCell>
                    <Badge className={fabric.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}>
                      {fabric.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(fabric)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                    <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFabric ? 'Edit' : 'Create'} {currentType.replace('_', ' ')} Fabric</DialogTitle>
          </DialogHeader>
          <FormErrorBoundary>
            <FabricMasterForm 
              type={currentType} 
              initialData={editingFabric} 
              onSuccess={handleSuccess} 
              onCancel={() => setIsFormOpen(false)}
            />
          </FormErrorBoundary>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FabricMasterListPage;