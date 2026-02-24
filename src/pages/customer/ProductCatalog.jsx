import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import ProductCard from '@/components/customer/ProductCard';
import FilterSidebar from '@/components/customer/FilterSidebar';
import { CustomerProductService } from '@/services/CustomerProductService';
import { Skeleton } from '@/components/ui/skeleton';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  
  // Pagination (Simple for now)
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [filters, sort, page, search]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, count } = await CustomerProductService.getAllProducts({
        filters: { ...filters, search },
        sort,
        page,
        pageSize: 12
      });
      setProducts(data || []);
      // Check if more
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    // trigger effect dependency
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Helmet><title>Product Catalog | Shree Rang Trendz</title></Helmet>
      
      <div className="container px-4 md:px-6 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shop All Products</h1>
            <p className="text-muted-foreground mt-1">Explore our premium textile collection</p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
             <form onSubmit={handleSearch} className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search products..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </form>
             
             <Sheet>
               <SheetTrigger asChild>
                 <Button variant="outline" size="icon" className="md:hidden">
                   <Filter className="h-4 w-4" />
                 </Button>
               </SheetTrigger>
               <SheetContent side="left">
                 <FilterSidebar filters={filters} onFilterChange={setFilters} />
               </SheetContent>
             </Sheet>
          </div>
        </div>

        <div className="flex gap-8">
           {/* Desktop Sidebar */}
           <div className="hidden md:block w-64 flex-shrink-0">
              <FilterSidebar filters={filters} onFilterChange={setFilters} />
           </div>

           {/* Product Grid */}
           <div className="flex-1">
              <div className="flex justify-between items-center mb-6">
                 <p className="text-sm text-muted-foreground">Showing {products.length} results</p>
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-medium hidden sm:inline-block">Sort by:</span>
                    <Select value={sort} onValueChange={setSort}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort order" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest Arrivals</SelectItem>
                        <SelectItem value="price_asc">Price: Low to High</SelectItem>
                        <SelectItem value="price_desc">Price: High to Low</SelectItem>
                        <SelectItem value="popular">Popularity</SelectItem>
                      </SelectContent>
                    </Select>
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                 {loading ? (
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="space-y-4">
                         <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                         <Skeleton className="h-4 w-2/3" />
                         <Skeleton className="h-4 w-1/3" />
                      </div>
                    ))
                 ) : products.length > 0 ? (
                    products.map(product => (
                       <ProductCard key={product.id} product={product} />
                    ))
                 ) : (
                    <div className="col-span-full py-20 text-center">
                       <h3 className="text-lg font-semibold">No products found</h3>
                       <p className="text-muted-foreground">Try adjusting your filters or search query.</p>
                       <Button variant="link" onClick={() => { setFilters({}); setSearch(''); }}>Clear all filters</Button>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCatalog;