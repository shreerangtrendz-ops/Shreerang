import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, UploadCloud, Trash2, Edit, History, 
  Search, Layers, Palette, Sparkles, Filter 
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import FabricMasterFilter from '@/components/admin/fabric/FabricMasterFilter';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ITEMS_PER_PAGE = 50;

const FabricMasterDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Data States
  const [data, setData] = useState({
    base: [],
    finish: [],
    fancyBase: [],
    fancyFinish: []
  });
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [filters, setFilters] = useState({
    category: 'base',
    search: '',
    base: null,
    process: null,
    width: null,
    valueAddition: null
  });

  // Fetch all data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [baseRes, finishRes, fancyBaseRes, fancyFinishRes] = await Promise.all([
        supabase.from('base_fabrics').select('*').order('created_at', { ascending: false }),
        supabase.from('finish_fabrics').select('*').order('created_at', { ascending: false }),
        supabase.from('fancy_base_fabrics').select('*').order('created_at', { ascending: false }),
        supabase.from('fancy_finish_fabrics').select('*').order('created_at', { ascending: false })
      ]);

      if (baseRes.error) throw baseRes.error;
      if (finishRes.error) throw finishRes.error;
      if (fancyBaseRes.error) throw fancyBaseRes.error;
      if (fancyFinishRes.error) throw fancyFinishRes.error;

      setData({
        base: baseRes.data || [],
        finish: finishRes.data || [],
        fancyBase: fancyBaseRes.data || [],
        fancyFinish: fancyFinishRes.data || []
      });
    } catch (error) {
      console.error('Error fetching fabrics:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load fabric data. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      category: 'base',
      search: '',
      base: null,
      process: null,
      width: null,
      valueAddition: null
    });
  };

  // Generic Filter Logic
  const filterData = (items, type) => {
    // 1. Filter by Category (handled by Accordion UI showing/hiding mostly, but logic here too)
    // If specific category is selected in filter, we might only want to show matches, 
    // but the UI structure is accordions. We'll filter the items list itself.

    return items.filter(item => {
      // Search (SKU or Name)
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const skuMatch = item.sku?.toLowerCase().includes(query);
        const nameMatch = (item.name || item.fabric_name || '').toLowerCase().includes(query);
        if (!skuMatch && !nameMatch) return false;
      }

      // Base Filter
      if (filters.base && item.base !== filters.base) return false;

      // Process Filter
      if (filters.process && item.process !== filters.process) return false;

      // Width Filter
      if (filters.width && item.width !== filters.width) return false;

      // Value Addition (Only for fancy types)
      if ((type === 'fancyBase' || type === 'fancyFinish') && filters.valueAddition) {
        if (item.value_addition !== filters.valueAddition) return false;
      }

      return true;
    });
  };

  // Filtered Data Sets
  const filteredBase = useMemo(() => filterData(data.base, 'base'), [data.base, filters]);
  const filteredFinish = useMemo(() => filterData(data.finish, 'finish'), [data.finish, filters]);
  const filteredFancyBase = useMemo(() => filterData(data.fancyBase, 'fancyBase'), [data.fancyBase, filters]);
  const filteredFancyFinish = useMemo(() => filterData(data.fancyFinish, 'fancyFinish'), [data.fancyFinish, filters]);

  // Dashboard Stats
  const stats = useMemo(() => {
    // Most used base (simple calc)
    const baseCount = {};
    data.base.forEach(b => baseCount[b.base] = (baseCount[b.base] || 0) + 1);
    const topBase = Object.entries(baseCount).sort((a,b) => b[1] - a[1])[0];

    return {
      totalBase: data.base.length,
      totalFinish: data.finish.length,
      totalFancyBase: data.fancyBase.length,
      totalFancyFinish: data.fancyFinish.length,
      topBase: topBase ? topBase[0] : 'N/A'
    };
  }, [data]);

  // Delete Handler
  const handleDelete = async (id, table) => {
    if (!window.confirm('Are you sure you want to delete this record? This cannot be undone.')) return;

    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Record deleted successfully' });
      fetchAllData(); // Refresh
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Delete failed' });
    }
  };

  // Render Table Helper
  const renderTable = (items, type, tableName) => {
    if (items.length === 0) {
      return (
        <EmptyState 
          title="No fabrics found" 
          description={filters.search ? "Try adjusting your filters" : "Start by adding new fabrics"}
          icon={Layers}
        />
      );
    }

    return (
      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Base / Process</TableHead>
              <TableHead>Width</TableHead>
              {(type === 'fancyBase' || type === 'fancyFinish') && <TableHead>Value Addition</TableHead>}
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.slice(0, ITEMS_PER_PAGE).map((item) => (
              <TableRow key={item.id} className="hover:bg-slate-50">
                <TableCell className="font-medium text-blue-600">{item.sku}</TableCell>
                <TableCell>{item.name || item.fabric_name}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.base}</span>
                    <span className="text-xs text-muted-foreground">{item.process}</span>
                  </div>
                </TableCell>
                <TableCell>{item.width}</TableCell>
                {(type === 'fancyBase' || type === 'fancyFinish') && (
                  <TableCell>{item.value_addition}</TableCell>
                )}
                <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/fabric-master/${type}/${item.id}`)}>
                      <Edit className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id, tableName)}>
                      <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length > ITEMS_PER_PAGE && (
           <div className="p-4 border-t text-center text-sm text-muted-foreground">
             Showing first {ITEMS_PER_PAGE} of {items.length} records
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 p-6">
      <Helmet><title>Fabric Master Dashboard</title></Helmet>
      
      <AdminPageHeader 
        title="Fabric Master" 
        description="Comprehensive management of Base, Finish, and Fancy fabrics."
        breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Fabric Master'}]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Total Base Fabrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.totalBase}</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">Total Finish Fabrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{stats.totalFinish}</div>
          </CardContent>
        </Card>
        <Card className="bg-pink-50 border-pink-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-pink-800">Fancy Fabrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-900">{stats.totalFancyBase + stats.totalFancyFinish}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Top Base Material</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-green-900 truncate">{stats.topBase}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter */}
      <FabricMasterFilter onApplyFilters={handleApplyFilters} onClearFilters={handleClearFilters} />

      {loading ? (
        <LoadingSpinner text="Loading fabric data..." fullHeight />
      ) : (
        <Accordion type="multiple" defaultValue={['base_fabric']} className="space-y-4">
          
          {/* Base Fabric Accordion */}
          <AccordionItem value="base_fabric" className="bg-white border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 w-full">
                <Layers className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-lg">Base Fabrics</span>
                <Badge variant="secondary" className="ml-2">{filteredBase.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-6">
              <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/fabric-master/import')}>
                  <UploadCloud className="h-4 w-4 mr-2" /> Bulk Import
                </Button>
                <Button size="sm" onClick={() => navigate('/admin/fabric-master/new')}>
                  <Plus className="h-4 w-4 mr-2" /> Add New
                </Button>
              </div>
              {renderTable(filteredBase, 'base', 'base_fabrics')}
            </AccordionContent>
          </AccordionItem>

          {/* Finish Fabric Accordion */}
          <AccordionItem value="finish_fabric" className="bg-white border rounded-lg px-4">
             <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3 w-full">
                <Palette className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-lg">Finish Fabrics</span>
                <Badge variant="secondary" className="ml-2">{filteredFinish.length}</Badge>
              </div>
             </AccordionTrigger>
             <AccordionContent className="pt-2 pb-6">
                <div className="flex justify-end gap-2 mb-4">
                  <Button variant="outline" size="sm" onClick={() => navigate('/admin/fabric-master/finish/import')}>
                    <UploadCloud className="h-4 w-4 mr-2" /> Bulk Import
                  </Button>
                  <Button size="sm" onClick={() => navigate('/admin/fabric-master/finish/new')}>
                    <Plus className="h-4 w-4 mr-2" /> Add New
                  </Button>
                </div>
                {renderTable(filteredFinish, 'finish', 'finish_fabrics')}
             </AccordionContent>
          </AccordionItem>

          {/* Fancy Base Accordion */}
          <AccordionItem value="fancy_base_fabric" className="bg-white border rounded-lg px-4">
             <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 w-full">
                  <Sparkles className="h-5 w-5 text-pink-600" />
                  <span className="font-semibold text-lg">Fancy Base Fabrics</span>
                  <Badge variant="secondary" className="ml-2">{filteredFancyBase.length}</Badge>
                </div>
             </AccordionTrigger>
             <AccordionContent className="pt-2 pb-6">
                <div className="flex justify-end gap-2 mb-4">
                  <Button size="sm" onClick={() => navigate('/admin/fabric-master/fancy-base/new')}>
                    <Plus className="h-4 w-4 mr-2" /> Add New
                  </Button>
                </div>
                {renderTable(filteredFancyBase, 'fancyBase', 'fancy_base_fabrics')}
             </AccordionContent>
          </AccordionItem>

          {/* Fancy Finish Accordion */}
          <AccordionItem value="fancy_finish_fabric" className="bg-white border rounded-lg px-4">
             <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 w-full">
                  <Sparkles className="h-5 w-5 text-orange-600" />
                  <span className="font-semibold text-lg">Fancy Finish Fabrics</span>
                  <Badge variant="secondary" className="ml-2">{filteredFancyFinish.length}</Badge>
                </div>
             </AccordionTrigger>
             <AccordionContent className="pt-2 pb-6">
                <div className="flex justify-end gap-2 mb-4">
                  <Button size="sm" onClick={() => navigate('/admin/fabric-master/fancy-finish/new')}>
                     <Plus className="h-4 w-4 mr-2" /> Add New
                  </Button>
                </div>
                {renderTable(filteredFancyFinish, 'fancyFinish', 'fancy_finish_fabrics')}
             </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
};

export default FabricMasterDashboard;