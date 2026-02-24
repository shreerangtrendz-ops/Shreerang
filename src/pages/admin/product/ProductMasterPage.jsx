import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ProductMasterForm from './ProductMasterForm';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

const ProductMasterPage = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase.from('product_masters').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setProducts(ensureArray(data, 'ProductMasterPage'));
    } catch (error) {
        logError(error, 'ProductMasterPage fetch');
        toast({ variant: 'destructive', title: 'Error', description: error.message });
        setProducts([]);
    } finally {
        setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Are you sure?")) return;
    try {
        await supabase.from('product_masters').delete().eq('id', id);
        fetchProducts();
        toast({ title: 'Deleted', description: 'Product deleted successfully.' });
    } catch(e) {
        logError(e, 'ProductMasterPage delete');
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const toggleStatus = async (product) => {
      const newStatus = product.status === 'Ready' ? 'Out of Stock' : 'Ready';
      try {
          await supabase.from('product_masters').update({ status: newStatus }).eq('id', product.id);
          setProducts(prev => ensureArray(prev).map(p => p.id === product.id ? { ...p, status: newStatus } : p));
      } catch(e) {
          logError(e, 'ProductMasterPage toggle status');
          toast({ variant: 'destructive', title: 'Update Failed', description: e.message });
      }
  };

  const safeProducts = ensureArray(products);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Product Master</title></Helmet>
      <AdminPageHeader 
        title="Product Master" 
        description="Manage your main product catalog and link them to base fabrics."
        breadcrumbs={[{label: 'Dashboard', href: '/admin'}, {label: 'Product Master'}]}
      />

      <div className="flex justify-end">
          <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-2" /> Create New Product</Button>
      </div>

      <Card>
          <CardContent className="p-0">
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Process Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600"/></TableCell></TableRow>
                    ) : safeProducts.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">No products found. Create one to get started.</TableCell></TableRow>
                    ) : (
                        safeProducts.map(product => (
                            <TableRow key={product.id}>
                                <TableCell className="font-medium">{product.product_name}</TableCell>
                                <TableCell><span className="px-2 py-1 rounded bg-slate-100 text-xs font-mono">{product.product_type}</span></TableCell>
                                <TableCell>
                                    <button onClick={() => toggleStatus(product)} className="flex items-center gap-2 text-sm">
                                        {product.status === 'Ready' 
                                            ? <span className="flex items-center text-green-600"><ToggleRight className="h-5 w-5 mr-1"/> Ready</span> 
                                            : <span className="flex items-center text-slate-400"><ToggleLeft className="h-5 w-5 mr-1"/> Out of Stock</span>
                                        }
                                    </button>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}><Edit className="h-4 w-4 text-slate-500"/></Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
             </Table>
          </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
            <ProductMasterForm 
                initialData={editingProduct || {}} 
                onSuccess={() => { setIsModalOpen(false); fetchProducts(); }}
                onCancel={() => setIsModalOpen(false)}
            />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductMasterPage;