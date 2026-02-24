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
import { FabricService } from '@/services/FabricService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import BulkDeleteModal from '@/components/admin/fabric/BulkDeleteModal';
import { BASE_PROCESS_TYPES, FABRIC_CLASSES, FABRIC_TAGS } from '@/lib/fabricHierarchyConstants';

const FinishFabricDashboard = () => {
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
  const [filterProcess, setFilterProcess] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_desc'); // created_desc, created_asc, name_asc, name_desc

  useEffect(() => {
    fetchFabrics();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [fabrics, searchQuery, filterProcess, filterClass, filterStatus, sortBy]);

  const fetchFabrics = async () => {
    setLoading(true);
    try {
      const data = await FabricService.getAllFinishFabrics();
      setFabrics(data || []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load finish fabrics' });
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
        (f.finish_fabric_name?.toLowerCase().includes(q)) || 
        (f.finish_fabric_sku?.toLowerCase().includes(q)) ||
        (f.base_fabrics?.base_fabric_name?.toLowerCase().includes(q))
      );
    }

    // Filters
    if (filterProcess !== 'all') result = result.filter(f => f.process === filterProcess);
    if (filterClass !== 'all') result = result.filter(f => f.class === filterClass);
    if (filterStatus !== 'all') result = result.filter(f => f.status === filterStatus);

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'created_desc': return new Date(b.created_at) - new Date(a.created_at);
        case 'created_asc': return new Date(a.created_at) - new Date(b.created_at);
        case 'name_asc': return (a.finish_fabric_name || '').localeCompare(b.finish_fabric_name || '');
        case 'name_desc': return (b.finish_fabric_name || '').localeCompare(a.finish_fabric_name || '');
        default: return 0;
      }
    });

    setFilteredFabrics(result);
  };

  const handleDelete = async (id) => {
    // In a real scenario, check dependencies first
    if (!window.confirm("Are you sure? This cannot be undone.")) return;
    try {
      await FabricService.deleteFinishFabric(id);
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

  const handleBulkDelete = async () => {
    setIsBulkDeleteOpen(true);
    // Modal will handle the actual deletion logic and calling service
  };

  const handleBulkDeleteComplete = () => {
    setIsBulkDeleteOpen(false);
    setSelectedIds([]);
    fetchFabrics();
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto pb-20 space-y-6">
      <Helmet><title>Finish Fabric Dashboard</title></Helmet>
      
      <AdminPageHeader 
        title="Finish Fabrics" 
        description="Manage processed fabrics, dyeing, printing, and finishing details."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/fabric/bulk-import')}>
              <Upload className="mr-2 h-4 w-4" /> Bulk Import
            </Button>
            <Button onClick={() => navigate('/admin/fabric/finish/new')} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> Add Finish Fabric
            </Button>
          </div>
        }
      />

      {/* Filters & Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex flex-1 gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder="Search by Name, SKU, or Base..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={filterProcess} onValueChange={setFilterProcess}>
                <SelectTrigger className="w-[140px]">
                  <div className="flex items-center gap-2"><Filter className="h-3 w-3" /> <SelectValue placeholder="Process" /></div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Processes</SelectItem>
                  {/* Flatten processes from constant */}
                  {['Mill Print', 'Digital Print', 'Dyed', 'RFD'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {FABRIC_CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                 <SelectTrigger className="w-[150px]"><SelectValue placeholder="Sort" /></SelectTrigger>
                 <SelectContent>
                    <SelectItem value="created_desc">Newest First</SelectItem>
                    <SelectItem value="created_asc">Oldest First</SelectItem>
                    <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                 </SelectContent>
              </Select>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5">
                <span className="text-sm text-slate-500">{selectedIds.length} selected</span>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
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
                <TableHead>Base Fabric</TableHead>
                <TableHead>Process Info</TableHead>
                <TableHead>Class/Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <LoadingSpinner />
                  </TableCell>
                </TableRow>
              ) : filteredFabrics.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      No finish fabrics found. Try adjusting filters or create a new one.
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
                        <span className="font-medium text-slate-900">{fabric.finish_fabric_name}</span>
                        <span className="text-xs font-mono text-slate-500">{fabric.finish_fabric_sku}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="text-sm text-slate-600">
                          {fabric.base_fabrics?.base_fabric_name || 'Unknown Base'}
                       </div>
                       <div className="text-xs text-slate-400">{fabric.base_fabrics?.sku}</div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="w-fit">{fabric.process}</Badge>
                          {fabric.process_type && <span className="text-xs text-slate-500">{fabric.process_type}</span>}
                       </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex flex-col gap-1 text-xs">
                          {fabric.class && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full w-fit">{fabric.class}</span>}
                          {fabric.tags && <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full w-fit">{fabric.tags}</span>}
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
                           <DropdownMenuLabel>Actions</DropdownMenuLabel>
                           <DropdownMenuItem onClick={() => navigate(`/admin/fabric/finish/${fabric.id}/edit`)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Details
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => navigate(`/admin/fabric/fancy-finish/new?source=${fabric.id}`)}>
                              <Plus className="mr-2 h-4 w-4" /> Create Fancy Finish
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

      <div className="text-xs text-slate-500 text-right">
         Showing {filteredFabrics.length} of {fabrics.length} records
      </div>

      <BulkDeleteModal 
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        selectedIds={selectedIds}
        fabricType="Finish Fabric"
        onConfirm={handleBulkDeleteComplete}
      />
    </div>
  );
};

export default FinishFabricDashboard;