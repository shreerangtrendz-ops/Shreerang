import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Check, AlertTriangle, PackageOpen } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const DesignSelectionGrid = ({ onSelectDesign, selectedDesigns = [], productId }) => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Mock initial designs based on product context (In real app, fetch from design_master/stock)
  useEffect(() => {
    const fetchDesigns = async () => {
        setLoading(true);
        // Simulating fetch - in reality, join design_master with design_ready_stock
        // For demo, we generate mock data if no DB data exists
        const { data } = await supabase.from('design_ready_stock').select('*');
        
        if (data && data.length > 0) {
            setDesigns(data);
        } else {
            // Fallback Mock Data for Demo
            const mockDesigns = Array.from({ length: 8 }).map((_, i) => ({
                id: `d-${i}`,
                design_id: `D-${1000 + i}`,
                name: `Floral Print ${i+1}`,
                fabric_name: i % 2 === 0 ? 'Rayon 140g' : 'Cotton 60x60',
                quantity_available: Math.floor(Math.random() * 200),
                image_url: `https://source.unsplash.com/random/200x200?pattern,fabric&sig=${i}`
            }));
            setDesigns(mockDesigns);
        }
        setLoading(false);
    };
    fetchDesigns();
  }, [productId]);

  const filteredDesigns = designs.filter(d => 
    d.design_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (qty) => {
      if (qty <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700' };
      if (qty < 50) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-700' };
      return { label: 'In Stock', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="space-y-4">
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by Design ID or Name..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {designs.length < 5 && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-md border border-yellow-200">
                <AlertTriangle className="h-4 w-4" />
                <span>Limited designs available for this product category.</span>
            </div>
        )}

        <ScrollArea className="h-[400px] border rounded-md p-4 bg-slate-50">
            {filteredDesigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <PackageOpen className="h-10 w-10 mb-2 opacity-50" />
                    <p>No designs found in stock.</p>
                    <p className="text-xs">New designs will be created upon order confirmation.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredDesigns.map(design => {
                        const isSelected = selectedDesigns.some(d => d.id === design.id);
                        const stock = getStockStatus(design.quantity_available);
                        
                        return (
                            <Card 
                                key={design.id} 
                                className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
                                onClick={() => onSelectDesign(design)}
                            >
                                <div className="aspect-square bg-slate-200 relative overflow-hidden">
                                    {/* Placeholder for real image */}
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-100">
                                        No Image
                                    </div>
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                                            <Check className="h-3 w-3" />
                                        </div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 px-2 truncate">
                                        {design.design_id}
                                    </div>
                                </div>
                                <CardContent className="p-3 space-y-2">
                                    <div>
                                        <p className="font-medium text-sm truncate">{design.name || 'Untitled'}</p>
                                        <p className="text-xs text-muted-foreground">{design.fabric_name}</p>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <Badge variant="outline" className={`${stock.color} border-0`}>
                                            {stock.label}
                                        </Badge>
                                        <span className="font-mono">{design.quantity_available}m</span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </ScrollArea>
    </div>
  );
};

export default DesignSelectionGrid;