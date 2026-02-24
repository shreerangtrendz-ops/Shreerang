import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, Eye, Loader2, ArrowLeft, Upload, FileDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import EmptyState from '@/components/common/EmptyState';
import BulkFabricImportWizard from '@/components/admin/fabric/BulkFabricImportWizard';
import { FabricExportService } from '@/services/FabricExportService';

const BaseFabricDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fabrics, setFabrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    fetchFabrics();
  }, []);

  const fetchFabrics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('base_fabrics')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setFabrics(data || []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch fabrics' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
     try {
       FabricExportService.exportToExcel(fabrics, 'BaseFabrics_Export');
       toast({ title: 'Export Successful', description: 'File downloaded successfully.' });
     } catch (e) {
       toast({ variant: 'destructive', title: 'Export Failed', description: e.message });
     }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this fabric?')) return;
    try {
      const { error } = await supabase.from('base_fabrics').delete().eq('id', id);
      if (error) throw error;
      setFabrics(fabrics.filter(f => f.id !== id));
      toast({ title: 'Success', description: 'Fabric deleted successfully' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete' });
    }
  };

  const filteredFabrics = fabrics.filter(f => 
    (f.generated_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (f.generated_sku?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (f.fabric_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
           <Button variant="ghost" onClick={() => navigate('/admin/fabric-sku')}>
             <ArrowLeft className="mr-2 h-4 w-4" /> Back
           </Button>
           <h1 className="text-3xl font-bold text-slate-800">Base Fabrics</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
             <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
             <FileDown className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button onClick={() => navigate('/admin/fabric-sku/base/create')} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Create New
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              placeholder="Search by Name or SKU..." 
              className="pl-9 max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
          ) : filteredFabrics.length === 0 ? (
             <EmptyState title="No base fabrics found" description="Create a new one to get started" />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Fabric Name</TableHead>
                    <TableHead>Generated Name</TableHead>
                    <TableHead>Generated SKU</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFabrics.map((fabric) => (
                    <TableRow key={fabric.id}>
                      <TableCell className="font-medium">{fabric.fabric_name || 'N/A'}</TableCell>
                      <TableCell>{fabric.generated_name || fabric.base_fabric_name || '-'}</TableCell>
                      <TableCell>
                        <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs">{fabric.generated_sku || fabric.sku || '-'}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/fabric-sku/base/${fabric.id}`)}>
                            <Eye className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/fabric-sku/base/${fabric.id}/edit`)}>
                            <Edit className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(fabric.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <BulkFabricImportWizard 
         isOpen={isImportOpen} 
         onClose={() => {
            setIsImportOpen(false);
            fetchFabrics(); 
         }} 
         fabricType="base"
      />
    </div>
  );
};

export default BaseFabricDashboard;