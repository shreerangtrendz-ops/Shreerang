import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Trash2, Edit, MoreHorizontal, FileDown, Upload } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import BulkDeleteModal from '@/components/admin/fabric/BulkDeleteModal';
import { VALUE_ADDITIONS } from '@/lib/fabricHierarchyConstants';

const FancyBaseFabricDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fabrics, setFabrics] = useState([]);
  const [filteredFabrics, setFilteredFabrics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  
  // Filters
  const [filterVA, setFilterVA] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_desc');

  useEffect(() => {
    fetchFabrics();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [fabrics, searchQuery, filterVA, filterStatus, sortBy]);

  const fetchFabrics = async () => {
    setLoading(true);
    try {
      // Fetch with joined base fabric data
      const { data, error } = await supabase
        .from('fancy_base_fabrics')
        .select('*, base_fabrics(base_fabric_name, sku, base, process)')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setFabrics(data || []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load fancy base fabrics' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...fabrics];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => 
        (f.fabric_name?.toLowerCase().includes(q)) || 
        (f.sku?.toLowerCase().includes(q)) ||
        (f.base_fabrics?.base_fabric_name?.toLowerCase().includes(q))
      );
    }

    // Filters
    if (filterVA !== 'all') result = result.filter(f => f.value_addition === filterVA);
    if (filterStatus !== 'all') result = result.filter(f => f.status === filterStatus);

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'created_desc': return new Date(b.created_at) - new Date(a.created_at);
        case 'created_asc': return new Date(a.created_at) - new Date(b.created_at);
        case 'name_asc': return (a.fabric_name || '').localeCompare(b.fabric_name || '');
        case 'name_desc': return (b.fabric_name || '').localeCompare(a.fabric_name || '');
        default: return 0;
      }
    });

    setFilteredFabrics(result);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;
    try {
      const { error } = await supabase.from('fancy_base_fabrics').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Fabric deleted successfully' });
      fetchFabrics();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(filteredFabrics.map(f => f.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) setSelectedIds([...selectedIds, id]);
    else setSelectedIds(selectedIds.filter(sid => sid !== id));
  };

  const handleBulkDeleteComplete = () => {
    setIsBulkDeleteOpen(false);
    setSelectedIds([]);
    fetchFabrics();
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto pb-20 space-y-6">
      <Helmet><title>Fancy Base Fabric Dashboard</title></Helmet>
      
      <AdminPageHeader 
        title="Fancy Base Fabrics" 
        description="Manage value-added base fabrics (Embroidery, Hakoba, Foil, etc.)"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/fabric/bulk-import')}>
              <Upload className="mr-2 h-4 w-4" /> Bulk Import
            </Button>
            <Button onClick={() => navigate('/admin/fabric/fancy-base/new')} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="mr-2 h-4 w-4" /> Add Fancy Base
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex flex-1 gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Search by Name, SKU..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={filterVA} onValueChange={setFilterVA}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2"><Filter className="h-3 w-3" /> <SelectValue placeholder="Value Addition" /></div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {VALUE_ADDITIONS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5">
                <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedIds.length})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300"
                    checked={filteredFabrics.length > 0 && selectedIds.length === filteredFabrics.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableHead>
                <TableHead>Fabric Details</TableHead>
                <TableHead>Value Addition</TableHead>
                <TableHead>Concept/Thread</TableHead>
                <TableHead>Base Info</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center"><LoadingSpinner /></TableCell>
                </TableRow>
              ) : filteredFabrics.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      No fabrics found.
                   </TableCell>
                </TableRow>
              ) : (
                filteredFabrics.map((fabric) => (
                  <TableRow key={fabric.id} className="hover:bg-slate-50">
                    <TableCell>
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300"
                        checked={selectedIds.includes(fabric.id)}
                        onChange={(e) => handleSelectOne(fabric.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{fabric.fabric_name}</span>
                        <span className="text-xs font-mono text-purple-600">{fabric.sku}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                         {fabric.value_addition}
                       </Badge>
                    </TableCell>
                    <TableCell>
                       <div className="text-sm">
                         {fabric.concept && <div className="font-medium">{fabric.concept}</div>}
                         {fabric.thread && <div className="text-xs text-slate-500">{fabric.thread}</div>}
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="text-xs text-slate-500">
                          <div>{fabric.base_fabrics?.base_fabric_name}</div>
                          <div>{fabric.width} | {fabric.base_fabrics?.process}</div>
                       </div>
                    </TableCell>
                    <TableCell>
                       <Badge variant={fabric.status === 'active' ? 'success' : 'secondary'}>
                         {fabric.status || 'Active'}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => navigate(`/admin/fabric/fancy-base/${fabric.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                           </DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(fabric.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BulkDeleteModal 
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        selectedIds={selectedIds}
        fabricType="Fancy Base Fabric"
        tableName="fancy_base_fabrics"
        onConfirm={handleBulkDeleteComplete}
      />
    </div>
  );
};

export default FancyBaseFabricDashboard;