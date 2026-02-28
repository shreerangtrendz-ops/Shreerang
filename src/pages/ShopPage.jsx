import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Filter, SlidersHorizontal, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import ProductCard from '@/components/customer/ProductCard';
import ShopFilters from '@/components/shop/ShopFilters';
import { CustomerProductService } from '@/services/CustomerProductService';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    fabricType: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    search: ''
  });

  useEffect(() => {
    loadProducts();
  }, [filters]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, count } = await CustomerProductService.getProducts(filters);
      setProducts(ensureArray(data, 'ShopPage'));
      setTotalCount(count || 0);
    } catch (error) {
      logError(error, 'ShopPage fetch');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const safeProducts = ensureArray(products);

  return (
    <div className="container py-8 px-4 md:px-6">
      <Helmet><title>Shop | Shreerang Trendz</title></Helmet>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="hidden md:block w-64 flex-shrink-0 space-y-6">
          <div className="sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</h2>
              <Button variant="ghost" size="sm" onClick={() => setFilters({ category: '', fabricType: '', minPrice: '', maxPrice: '', sort: 'newest', search: '' })}>Clear</Button>
            </div>
            <ShopFilters filters={filters} onChange={handleFilterChange} />
          </div>
        </aside>

        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[var(--text)] font-[var(--serif)]">Product Catalog</h1>
              <p className="text-[var(--text-muted)] text-sm mt-1">Showing {safeProducts.length} of {totalCount} products</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="md:hidden flex-1"><SlidersHorizontal className="mr-2 h-4 w-4" /> Filters</Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                  <div className="mt-4">
                    <ShopFilters filters={filters} onChange={handleFilterChange} />
                  </div>
                </SheetContent>
              </Sheet>

              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search SKU..."
                  className="pl-9"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>

              <Select value={filters.sort} onValueChange={(v) => handleFilterChange('sort', v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))
            ) : safeProducts.length > 0 ? (
              safeProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full py-20 text-center bg-[var(--surface)] border border-[var(--border-teal)] rounded-[var(--r)]">
                <h3 className="text-lg font-bold text-[var(--text)] font-[var(--serif)]">No products found</h3>
                <p className="text-[var(--text-muted)] mt-2">Try adjusting your filters or search terms.</p>
                <Button variant="outline" className="mt-4 border-[var(--border-teal)] text-[var(--teal)] hover:bg-[var(--surface2)]" onClick={() => setFilters({ category: '', fabricType: '', minPrice: '', maxPrice: '', sort: 'newest', search: '' })}>Clear Filters</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;