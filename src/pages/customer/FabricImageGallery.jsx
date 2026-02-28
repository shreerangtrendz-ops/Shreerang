import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { useUserProfile } from '@/hooks/useUserProfile';
import { TierPricingService } from '@/services/TierPricingService';
import PricingDisplay from '@/components/common/PricingDisplay';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Filter, ShoppingBag, Eye, Share2, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const FabricImageGallery = () => {
  const { profile } = useUserProfile();
  const [fabrics, setFabrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    tier: 'all'
  });
  const [selectedFabric, setSelectedFabric] = useState(null);

  useEffect(() => {
    fetchFabrics();
  }, [filters]);

  const fetchFabrics = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('fabric_master')
        .select(`
          *,
          fabric_images(image_url, display_order),
          fabric_prices(selling_price, cost_price)
        `)
        .eq('is_active', true);

      if (filters.category !== 'all') {
        // Assume category filtering via logic or join, simplistic here
        // query = query.eq('category_id', filters.category);
      }

      if (filters.search) {
        query = query.ilike('fabric_name', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setFabrics(data || []);
    } catch (error) {
      console.error('Error fetching gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const userTier = profile?.tier || 'PUBLIC';

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-[var(--font)]">
      <Helmet><title>Fabric Gallery | Shreerang Trendz</title></Helmet>

      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border-teal)] sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-[var(--text)] font-[var(--serif)]">Fabric Collection</h1>

            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search fabrics..."
                  className="pl-9 w-full md:w-64"
                  value={filters.search}
                  onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))}
                />
              </div>
              <Select value={filters.category} onValueChange={(v) => setFilters(p => ({ ...p, category: v }))}>
                <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Base Fabric">Base Fabric</SelectItem>
                  <SelectItem value="Finish Fabric">Finish Fabric</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
        ) : fabrics.length === 0 ? (
          <div className="text-center py-20 text-slate-500">No fabrics found matching your criteria.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {fabrics.map((fabric) => {
              const mainImage = fabric.fabric_images?.[0]?.image_url || 'https://placehold.co/400x300?text=No+Image';
              const basePrice = fabric.fabric_prices?.selling_price || 0;

              return (
                <Card key={fabric.id} className="group hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img
                      src={mainImage}
                      alt={fabric.fabric_name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setSelectedFabric(fabric)}>
                        <Eye className="h-4 w-4 mr-2" /> View
                      </Button>
                    </div>
                    {userTier === 'VIP' && <Badge className="absolute top-2 right-2 bg-amber-500">VIP Offer</Badge>}
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg text-slate-900 truncate">{fabric.fabric_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                      <span>{fabric.width || 'N/A'}"</span>
                      <span>•</span>
                      <span>{fabric.gsm || 'N/A'} GSM</span>
                    </div>

                    <div className="mt-4">
                      <PricingDisplay basePrice={basePrice} tier={userTier} />
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0 flex gap-2">
                    <Button className="w-full bg-slate-900 hover:bg-slate-800">
                      Request Quote
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedFabric} onOpenChange={() => setSelectedFabric(null)}>
        <DialogContent className="max-w-4xl">
          {selectedFabric && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
                <img
                  src={selectedFabric.fabric_images?.[0]?.image_url || 'https://placehold.co/600x600'}
                  alt={selectedFabric.fabric_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-6">
                <div>
                  <DialogHeader>
                    <DialogTitle className="text-2xl">{selectedFabric.fabric_name}</DialogTitle>
                    <DialogDescription>SKU: {selectedFabric.sku}</DialogDescription>
                  </DialogHeader>
                </div>

                <PricingDisplay basePrice={selectedFabric.fabric_prices?.selling_price} tier={userTier} className="p-4 bg-slate-50 rounded-lg" />

                <div className="space-y-4">
                  <h4 className="font-medium">Specifications</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-slate-500">Width:</span> {selectedFabric.width}"</div>
                    <div><span className="text-slate-500">GSM:</span> {selectedFabric.gsm}</div>
                    <div><span className="text-slate-500">Composition:</span> {selectedFabric.composition || 'N/A'}</div>
                    <div><span className="text-slate-500">Weave:</span> {selectedFabric.construction || 'N/A'}</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button className="flex-1">Add to Quote Request</Button>
                  <Button variant="outline" onClick={() => window.open(`https://wa.me/?text=Check out this fabric: ${selectedFabric.fabric_name}`)}>
                    <Share2 className="h-4 w-4 mr-2" /> Share
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FabricImageGallery;