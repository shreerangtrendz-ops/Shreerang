import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ShoppingBag } from 'lucide-react';

const AgentOrderPortal = () => {
    const [products, setProducts] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        const fetchReadyDesigns = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('is_active', true)
                .order('name');
            
            if (error) {
                toast({ variant: 'destructive', title: 'Error fetching designs', description: error.message });
            } else {
                setProducts(data);
            }
            setLoading(false);
        };
        fetchReadyDesigns();
    }, [toast]);

    const handleSelectProduct = (productId) => {
        setSelectedProducts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    };

    const handleCreateOrder = () => {
        if (selectedProducts.size === 0) {
            toast({ variant: 'destructive', title: 'No products selected' });
            return;
        }
        const selectedItems = products.filter(p => selectedProducts.has(p.id));
        navigate('/sales-order', { state: { selectedItems } });
    };

    return (
        <>
            <Helmet>
                <title>Agent Order Portal - Shreerang Trendz</title>
            </Helmet>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Agent Order Portal</h1>
                    <Button onClick={handleCreateOrder} disabled={selectedProducts.size === 0}>
                        <ShoppingBag className="mr-2 h-4 w-4" /> Create Order ({selectedProducts.size})
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-96"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {products.map(product => (
                            <div key={product.id} className="relative border rounded-lg overflow-hidden group">
                                <label htmlFor={`product-${product.id}`} className="cursor-pointer">
                                    <div className="absolute top-2 right-2 z-10 bg-white rounded-full p-1">
                                        <Checkbox 
                                            id={`product-${product.id}`} 
                                            checked={selectedProducts.has(product.id)}
                                            onCheckedChange={() => handleSelectProduct(product.id)}
                                        />
                                    </div>
                                    <img className="w-full h-48 object-cover transition-transform group-hover:scale-105" alt={product.name} src="https://images.unsplash.com/photo-1634644668925-0827afa08c65" />
                                    <div className="p-3">
                                        <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                                        <p className="text-xs text-gray-500">{product.sku}</p>
                                    </div>
                                </label>
                            </div>
                        ))}
                    </div>
                )}
                 { !loading && products.length === 0 && <p className="p-6 text-center text-gray-500">No ready designs available.</p> }
            </div>
        </>
    );
};

export default AgentOrderPortal;