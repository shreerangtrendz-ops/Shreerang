import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DesignCard from '@/components/customer/DesignCard';
import FilterSidebar from '@/components/customer/FilterSidebar';
import { CustomerDesignService } from '@/services/CustomerDesignService';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

const DesignGallery = () => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDesigns();
  }, [filters, search]);

  const fetchDesigns = async () => {
    setLoading(true);
    try {
      const { data } = await CustomerDesignService.getAllDesigns({
        filters: { ...filters, search }
      });
      setDesigns(ensureArray(data, 'DesignGallery'));
    } catch (error) {
      logError(error, 'DesignGallery fetch');
      setDesigns([]);
    } finally {
      setLoading(false);
    }
  };

  const safeDesigns = ensureArray(designs);

  return (
    <div className="min-h-screen bg-background pb-12">
      <Helmet><title>Design Gallery | Shree Rang Trendz</title></Helmet>
      
      <div className="container px-4 md:px-6 pt-8">
         <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
            <div>
               <h1 className="text-3xl font-bold tracking-tight">Design Gallery</h1>
               <p className="text-muted-foreground mt-1">Browse our exclusive library of patterns and prints</p>
            </div>
            <div className="relative w-full md:w-72">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <Input 
                 placeholder="Search by design number..." 
                 className="pl-9"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
            </div>
         </div>

         <div className="flex gap-8">
             <div className="hidden md:block w-64 flex-shrink-0">
                <FilterSidebar 
                   filters={filters} 
                   onFilterChange={setFilters} 
                   categories={['Floral', 'Geometric', 'Abstract', 'Traditional', 'Modern']}
                />
             </div>
             
             <div className="flex-1">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                   {loading ? (
                      Array(8).fill(0).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)
                   ) : safeDesigns.length > 0 ? (
                      safeDesigns.map(design => (
                         <DesignCard key={design.id} design={design} />
                      ))
                   ) : (
                      <div className="col-span-full py-20 text-center">
                         <h3 className="text-lg font-semibold">No designs found</h3>
                      </div>
                   )}
                </div>
             </div>
         </div>
      </div>
    </div>
  );
};

export default DesignGallery;