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
import { Plus, Search, Filter, Trash2, Edit, MoreHorizontal, Upload, FileClock } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import BulkDeleteModal from '@/components/admin/fabric/BulkDeleteModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const FancyFinishFabricDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fabrics, setFabrics] = useState([]);
  const [filteredFabrics, setFilteredFabrics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  useEffect(() => {
    fetchFabrics();
  }, []);

  useEffect(() => {
    let result = [...fabrics];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.fancy_finish_name?.toLowerCase().includes(q) || f.fancy_finish_fabric_sku?.toLowerCase().includes(q));
    }
    setFilteredFabrics(result);
  }, [fabrics, searchQuery]);

  const fetchFabrics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fancy_finish_fabrics')
        .select('*, finish_fabrics(base_fabrics(base_fabric_name))')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setFabrics(data || []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      const { error } = await supabase.from('fancy_finish_fabrics').delete().eq('id', id);
      if (error) throw error;
      fetchFabrics();
    } catch (e) { toast({ variant:'destructive', title:'Error', description:e.message}) }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto pb-20 space-y-6">
      <Helmet><title>Fancy Finish Fabric Dashboard</title></Helmet>
      <AdminPageHeader 
        title="Fancy Finish Fabrics" 
        description="Complex fabrics with multiple process history and value additions."
        actions={
          <div className="flex gap-2">
             <Button variant="outline" onClick={() => navigate('/admin/fabric/bulk-import')}><Upload className="mr-2 h-4 w-4" /> Bulk Import</Button>
             <Button onClick={() => navigate('/admin/fabric/fancy-finish/new')} className="bg-orange-600 hover:bg-orange-700"><Plus className="mr-2 h-4 w-4" /> Add New</Button>
          </div>
        }
      />

      <Card>
         <CardContent className="p-4 flex justify-between items-center">
            <div className="relative w-96">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
               <Input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search..." className="pl-9" />
            </div>
            {selectedIds.length > 0 && (
               <Button variant="destructive" size="sm" onClick={()=>setIsBulkDeleteOpen(true)}>Delete Selected</Button>
            )}
         </CardContent>
      </Card>

      <Card>
         <CardContent className="p-0">
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Fabric Name</TableHead>
                 <TableHead>Base Fabric</TableHead>
                 <TableHead>Value Addition</TableHead>
                 <TableHead>Last Process</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead className="text-right">Actions</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {loading ? <TableRow><TableCell colSpan={6} className="h-24 text-center"><LoadingSpinner/></TableCell></TableRow> : 
                filteredFabrics.map(f => (
                  <TableRow key={f.id}>
                    <TableCell>
                       <div className="font-medium">{f.fancy_finish_name}</div>
                       <div className="text-xs text-orange-600 font-mono">{f.fancy_finish_fabric_sku}</div>
                    </TableCell>
                    <TableCell>{f.finish_fabrics?.base_fabrics?.base_fabric_name || 'N/A'}</TableCell>
                    <TableCell><Badge variant="outline">{f.value_addition_type}</Badge></TableCell>
                    <TableCell>
                       {f.last_process_name}
                       {f.process_history?.length > 1 && <Badge className="ml-2" variant="secondary">+{f.process_history.length - 1}</Badge>}
                    </TableCell>
                    <TableCell><Badge variant={f.status==='active'?'success':'secondary'}>{f.status}</Badge></TableCell>
                    <TableCell className="text-right">
                       <Dialog>
                          <DialogTrigger asChild><Button variant="ghost" size="icon"><FileClock className="h-4 w-4"/></Button></DialogTrigger>
                          <DialogContent>
                             <DialogHeader><DialogTitle>Process History</DialogTitle></DialogHeader>
                             <div className="space-y-2 mt-2">
                                {(f.process_history || []).map((p,i) => (
                                   <div key={i} className="flex justify-between border-b pb-2">
                                      <span>{i+1}. {p.process}</span>
                                      <span className="text-slate-500 text-sm">{p.processType}</span>
                                   </div>
                                ))}
                             </div>
                          </DialogContent>
                       </Dialog>
                       <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/fabric/fancy-finish/${f.id}/edit`)}><Edit className="h-4 w-4"/></Button>
                       <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(f.id)}><Trash2 className="h-4 w-4"/></Button>
                    </TableCell>
                  </TableRow>
                ))
               }
             </TableBody>
           </Table>
         </CardContent>
      </Card>
      
      <BulkDeleteModal 
        isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)}
        selectedIds={selectedIds} fabricType="Fancy Finish" tableName="fancy_finish_fabrics"
        onConfirm={() => { setIsBulkDeleteOpen(false); setSelectedIds([]); fetchFabrics(); }}
      />
    </div>
  );
};

export default FancyFinishFabricDashboard;