import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Loader2, Plus, Edit2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const InventoryPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ name: '', sku: '', quantity: '', unit_price: '' });
  const [formErrors, setFormErrors] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Fetching from 'products' table as per standard inventory requirement.
      // Assuming 'quantity' maps to stock_quantity column in DB or 'quantity' if simplified.
      // Based on schema 'products' has 'stock_quantity' and 'retail_price'. Mapping accordingly.
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (formErrors[e.target.name]) setFormErrors({ ...formErrors, [e.target.name]: null });
  };

  const validate = () => {
    const errors = {};
    if (!formData.name || formData.name.length < 2) errors.name = "Min 2 chars";
    if (!formData.sku) errors.sku = "Required";
    if (!formData.quantity || Number(formData.quantity) < 0) errors.quantity = "Invalid quantity";
    if (!formData.unit_price || Number(formData.unit_price) <= 0) errors.unit_price = "Invalid price";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const payload = {
        name: formData.name,
        sku: formData.sku,
        stock_quantity: Number(formData.quantity),
        retail_price: Number(formData.unit_price),
        // Defaults for required schema fields if simplified form
        slug: formData.name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substr(2, 5),
        is_active: true
      };

      if (editingProduct) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id);
        if (error) throw error;
        toast({ title: "Updated", description: "Product updated." });
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
        toast({ title: "Created", description: "Product created." });
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Product removed." });
      fetchProducts();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const openModal = (product = null) => {
    setEditingProduct(product);
    if (product) {
        setFormData({
            name: product.name,
            sku: product.sku,
            quantity: product.stock_quantity,
            unit_price: product.retail_price
        });
    } else {
        setFormData({ name: '', sku: '', quantity: '', unit_price: '' });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) || 
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Helmet><title>Inventory | Admin</title></Helmet>
      <AdminPageHeader title="Product Inventory" description="Manage stock levels and product details." breadcrumbs={[{label: 'Admin', href: '/admin'}, {label: 'Inventory'}]} actions={
        <Button onClick={() => openModal()} className="bg-slate-900 text-white"><Plus className="mr-2 h-4 w-4"/> Add Product</Button>
      } />

      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input placeholder="Search products..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow className="bg-slate-50">
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {loading ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin"/></TableCell></TableRow>
                ) : filteredProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-slate-500">No products found.</TableCell></TableRow>
                ) : (
                    filteredProducts.map(product => (
                        <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.sku}</TableCell>
                            <TableCell>{product.stock_quantity}</TableCell>
                            <TableCell>₹{product.retail_price}</TableCell>
                            <TableCell>
                                {product.stock_quantity <= 0 ? (
                                    <Badge variant="destructive">Out of Stock</Badge>
                                ) : product.stock_quantity < 10 ? (
                                    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Low Stock</Badge>
                                ) : (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">In Stock</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => openModal(product)}><Edit2 className="h-4 w-4 text-slate-600"/></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label>Product Name</Label>
                    <Input name="name" value={formData.name} onChange={handleInputChange} className={formErrors.name ? "border-red-500" : ""} />
                    {formErrors.name && <span className="text-xs text-red-500">{formErrors.name}</span>}
                </div>
                <div className="space-y-2">
                    <Label>SKU</Label>
                    <Input name="sku" value={formData.sku} onChange={handleInputChange} className={formErrors.sku ? "border-red-500" : ""} />
                    {formErrors.sku && <span className="text-xs text-red-500">{formErrors.sku}</span>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} className={formErrors.quantity ? "border-red-500" : ""} />
                        {formErrors.quantity && <span className="text-xs text-red-500">{formErrors.quantity}</span>}
                    </div>
                    <div className="space-y-2">
                        <Label>Unit Price (₹)</Label>
                        <Input type="number" name="unit_price" value={formData.unit_price} onChange={handleInputChange} className={formErrors.unit_price ? "border-red-500" : ""} />
                        {formErrors.unit_price && <span className="text-xs text-red-500">{formErrors.unit_price}</span>}
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit}>{editingProduct ? 'Update' : 'Create'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryPage;