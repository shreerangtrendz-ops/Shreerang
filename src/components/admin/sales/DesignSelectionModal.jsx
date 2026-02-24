import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingSpinner from '@/components/common/LoadingSpinner';

const DesignSelectionModal = ({ isOpen, onClose, onSelect, selectedDesignId }) => {
  const [activeTab, setActiveTab] = useState('category');
  const [categories, setCategories] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchDesigns();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('design_categories').select('*');
    setCategories(data || []);
  };

  const fetchDesigns = async () => {
    setLoading(true);
    // Now that DB is fixed, this query will work
    let query = supabase.from('designs').select('*, design_categories(category_name)');
    
    if (searchTerm) {
      query = query.or(`design_number.ilike.%${searchTerm}%,design_name.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;
    if (error) console.error("Error fetching designs:", error);
    setDesigns(data || []);
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDesigns();
  };

  const filteredDesigns = selectedCategory 
    ? designs.filter(d => d.category_id === selectedCategory)
    : designs;

  const handleDesignClick = (design) => {
    onSelect(design);
    onClose();
  };

  const renderDesignGrid = (designList) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-1">
      {designList.map(design => (
        <Card 
          key={design.id} 
          className={`cursor-pointer transition-all hover:shadow-md hover:border-primary group ${selectedDesignId === design.id ? 'ring-2 ring-primary border-primary' : ''}`}
          onClick={() => handleDesignClick(design)}
        >
          <div className="aspect-square bg-slate-100 relative overflow-hidden rounded-t-lg">
            {design.image_url ? (
              <img src={design.image_url} alt={design.design_number} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
            {selectedDesignId === design.id && (
              <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                <CheckCircle className="h-4 w-4" />
              </div>
            )}
          </div>
          <CardContent className="p-3">
            <div className="font-bold text-sm truncate">{design.design_number}</div>
            <div className="text-xs text-muted-foreground truncate">{design.design_name || 'Unnamed'}</div>
            {design.design_categories?.category_name && (
               <Badge variant="secondary" className="mt-1 text-[10px] h-5">{design.design_categories.category_name}</Badge>
            )}
          </CardContent>
        </Card>
      ))}
      {designList.length === 0 && !loading && (
        <div className="col-span-full text-center py-10 text-muted-foreground">
          No designs found.
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Select Design</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-6 py-2 border-b bg-slate-50 flex justify-between items-center">
              <TabsList>
                <TabsTrigger value="category">By Category</TabsTrigger>
                <TabsTrigger value="all">All Designs</TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="category" className="flex-1 p-6 overflow-hidden flex flex-col m-0">
              {!selectedCategory ? (
                <ScrollArea className="flex-1">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {categories.map(cat => (
                      <Card 
                        key={cat.id} 
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        <CardContent className="p-6 text-center">
                          <h3 className="font-bold text-lg">{cat.category_name}</h3>
                          <p className="text-sm text-muted-foreground">{cat.description || 'No description'}</p>
                          <p className="text-xs mt-2 text-primary font-medium">
                            {designs.filter(d => d.category_id === cat.id).length} Designs
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col h-full">
                  <Button 
                    variant="ghost" 
                    onClick={() => setSelectedCategory(null)} 
                    className="self-start mb-4 pl-0 hover:pl-2 transition-all"
                  >
                    ← Back to Categories
                  </Button>
                  <ScrollArea className="flex-1">
                    {renderDesignGrid(filteredDesigns)}
                  </ScrollArea>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="flex-1 p-6 overflow-hidden m-0">
               <ScrollArea className="h-full">
                  {loading ? <LoadingSpinner /> : renderDesignGrid(designs)}
               </ScrollArea>
            </TabsContent>

            <TabsContent value="search" className="flex-1 p-6 overflow-hidden flex flex-col m-0">
              <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                <Input 
                  placeholder="Enter Design Number or Name..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
                <Button type="submit"><Search className="h-4 w-4 mr-2" /> Search</Button>
              </form>
              <ScrollArea className="flex-1">
                 {loading ? <LoadingSpinner /> : renderDesignGrid(designs)}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DesignSelectionModal;