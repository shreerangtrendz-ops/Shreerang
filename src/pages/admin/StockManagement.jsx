import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useNavigate } from 'react-router-dom';

const StockManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [tempStock, setTempStock] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, stock_quantity, is_active')
      .order('name');
    
    if (error) toast({ variant: "destructive", title: "Error", description: error.message });
    else setProducts(data || []);
    setLoading(false);
  };

  const handleUpdateStock = async (id) => {
    const { error } = await supabase
      .from('products')
      .update({ stock_quantity: parseInt(tempStock) })
      .eq('id', id);

    if (error) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } else {
      setProducts(products.map(p => p.id === id ? { ...p, stock_quantity: parseInt(tempStock) } : p));
      setEditingId(null);
      toast({ title: "Success", description: "Stock updated successfully" });
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Helmet><title>Stock Management - Admin</title></Helmet>
      <div className="space-y-6">
        <AdminPageHeader 
          title="Stock Management" 
          breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Stock' }]}
          onBack={() => navigate('/admin')}
        />

        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
           <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search Product or SKU..." 
              className="pl-8" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground">
              Total Products: {products.length}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="rounded-md border max-h-[70vh] overflow-auto">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No products found.</TableCell></TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                        <TableCell>
                          {editingId === product.id ? (
                            <Input 
                              type="number" 
                              className="w-24 h-8" 
                              value={tempStock} 
                              onChange={e => setTempStock(e.target.value)}
                              autoFocus
                            />
                          ) : (
                            <span className={product.stock_quantity < 10 ? "text-red-600 font-bold" : ""}>
                              {product.stock_quantity}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === product.id ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" onClick={() => handleUpdateStock(product.id)}>Save</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => { setEditingId(product.id); setTempStock(product.stock_quantity); }}
                            >
                              Adjust
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default StockManagement;