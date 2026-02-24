import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { FabricMasterService } from '@/services/FabricMasterService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, Edit2, Trash2, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import DynamicDropdown from '@/components/common/DynamicDropdown';

const FabricMasterTablePage = () => {
  const [fabrics, setFabrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ base: '', process: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchFabrics();
  }, [search, filters]);

  const fetchFabrics = async () => {
    setLoading(true);
    try {
      const data = await FabricMasterService.getAllFabrics({ search, ...filters });
      setFabrics(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load fabrics' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this fabric?')) return;
    try {
      await FabricMasterService.deleteFabric(id);
      toast({ title: 'Success', description: 'Fabric deleted successfully' });
      fetchFabrics();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete fabric' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Fabric Inventory | Admin</title></Helmet>
      <AdminPageHeader 
        title="Fabric Master List" 
        description="View and manage all fabric definitions."
        breadcrumbs={[{label: 'Admin', href: '/admin'}, {label: 'Fabric Master'}]} 
        actions={
          <Link to="/admin/fabric-master">
            <Button className="bg-slate-900 text-white"><Plus className="mr-2 h-4 w-4" /> Create New</Button>
          </Link>
        }
      />

      <Card className="p-4 bg-slate-50 border-slate-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by SKU or Fabric Name..." 
              className="pl-9 bg-white" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <DynamicDropdown 
              category="base" 
              placeholder="Filter by Base" 
              value={filters.base}
              onChange={(val) => setFilters(prev => ({ ...prev, base: val }))}
            />
          </div>
          <div className="w-full md:w-48">
            <DynamicDropdown 
              category="process_type" 
              placeholder="Filter by Process"
              value={filters.process}
              onChange={(val) => setFilters(prev => ({ ...prev, process: val }))}
            />
          </div>
        </div>
      </Card>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-[120px]">SKU</TableHead>
                <TableHead>Fabric Name</TableHead>
                <TableHead>Base</TableHead>
                <TableHead>Width</TableHead>
                <TableHead>GSM</TableHead>
                <TableHead>Process</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              ) : fabrics.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-slate-500">No fabrics found.</TableCell></TableRow>
              ) : (
                fabrics.map((fabric) => (
                  <TableRow key={fabric.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono font-medium">{fabric.sku || '-'}</TableCell>
                    <TableCell className="font-medium text-slate-900">{fabric.fabric_name}</TableCell>
                    <TableCell>{fabric.base}</TableCell>
                    <TableCell>{fabric.width}</TableCell>
                    <TableCell>{fabric.gsm}</TableCell>
                    <TableCell>
                      {fabric.process_type && <Badge variant="outline">{fabric.process_type.split('(')[0]}</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* Edit functionality would link to edit page with ID */}
                         <Link to={`/admin/fabric-master?id=${fabric.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600"><Edit2 className="h-4 w-4" /></Button>
                         </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(fabric.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default FabricMasterTablePage;