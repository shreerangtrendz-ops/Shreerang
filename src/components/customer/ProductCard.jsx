import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const image = product.images?.[0] || product.image_url || '/placeholder.jpg';

  return (
    <div className="group bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full">
       <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
          <img 
            src={image} 
            alt={product.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {product.is_new && <Badge className="absolute top-3 left-3 bg-blue-600">New</Badge>}
          
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
             <Button size="icon" variant="secondary" className="rounded-full shadow-md bg-white hover:bg-red-50 hover:text-red-500 h-8 w-8">
                <Heart className="h-4 w-4" />
             </Button>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
             <Button onClick={() => addToCart(product)} className="w-full bg-white text-slate-900 hover:bg-slate-100 border-none shadow-lg">
                <ShoppingBag className="mr-2 h-4 w-4" /> Add to Cart
             </Button>
          </div>
       </div>

       <div className="p-4 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-2">
             <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{product.sku}</p>
             <p className="font-bold text-primary">₹{product.retail_price}</p>
          </div>
          <Link to={`/product/${product.slug || product.id}`} className="block mb-2">
             <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
          </Link>
          <div className="mt-auto pt-3 border-t flex items-center justify-between text-xs text-slate-500">
             <span>{product.specifications?.fabric_type || 'Fabric'}</span>
             <span>{product.specifications?.width || 'N/A'}"</span>
          </div>
       </div>
    </div>
  );
};

export default ProductCard;