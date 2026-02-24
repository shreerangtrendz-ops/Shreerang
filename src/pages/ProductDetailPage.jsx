import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CustomerProductService } from '@/services/CustomerProductService';
import { useCart } from '@/contexts/CartContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureArray } from '@/lib/arrayValidation';
import DataErrorBoundary from '@/components/common/DataErrorBoundary';
import { logError } from '@/lib/debugHelpers';

const ProductDetailPageContent = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(100);
  const [activeImage, setActiveImage] = useState(0);
  const { addToCart } = useCart();

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      try {
        const data = await CustomerProductService.getProductBySlug(slug) || 
                     await CustomerProductService.getProductById(slug);
        setProduct(data);
      } catch (e) {
        logError(e, 'ProductDetailPage load');
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [slug]);

  if (loading) return <div className="container py-12"><Skeleton className="h-[600px] w-full" /></div>;
  if (!product) return <div className="container py-12 text-center">Product not found</div>;

  const images = ensureArray(product.images && product.images.length > 0 ? product.images : [product.image_url]);

  return (
    <div className="container py-10 px-4 md:px-6">
      <Helmet><title>{product.name} | Shreerang Trendz</title></Helmet>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image Gallery */}
        <div className="space-y-4">
           <div className="aspect-[3/4] bg-slate-100 rounded-lg overflow-hidden border">
              <img 
                src={images[activeImage] || '/placeholder.jpg'} 
                alt={product.name} 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
           </div>
           <div className="flex gap-4 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveImage(idx)}
                  className={`relative w-24 aspect-[3/4] rounded-md overflow-hidden border-2 ${activeImage === idx ? 'border-primary' : 'border-transparent'}`}
                >
                  <img src={img || '/placeholder.jpg'} alt="Thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
           </div>
        </div>

        {/* Product Details */}
        <div className="space-y-6">
           <div>
             <div className="flex justify-between items-start">
               <div>
                 <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
                 <p className="text-lg text-slate-500 mt-1">Design #{product.sku}</p>
               </div>
               <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500"><Heart className="h-6 w-6" /></Button>
             </div>
             <div className="mt-4 flex items-center gap-4">
               <span className="text-3xl font-bold text-primary">₹{product.retail_price}</span>
               <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">In Stock</Badge>
             </div>
           </div>

           <div className="h-px bg-slate-200" />

           <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-slate-500 block">Fabric Type</span>
                  <span className="font-medium">{product.specifications?.fabric_type || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">Width</span>
                  <span className="font-medium">{product.specifications?.width || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">GSM</span>
                  <span className="font-medium">{product.specifications?.gsm || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 block">MOQ</span>
                  <span className="font-medium">{product.min_wholesale_quantity || 100} Meters</span>
                </div>
             </div>
           </div>

           <div className="bg-slate-50 p-4 rounded-lg space-y-4 border">
             <div className="flex items-center justify-between">
                <label className="font-medium">Quantity (Meters)</label>
                <div className="flex items-center gap-2">
                   <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 10))}>-</Button>
                   <Input 
                     type="number" 
                     value={quantity} 
                     onChange={(e) => setQuantity(Number(e.target.value))} 
                     className="w-20 text-center"
                   />
                   <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 10)}>+</Button>
                </div>
             </div>
             <div className="flex gap-3">
                <Button size="lg" className="flex-1" onClick={() => addToCart(product, quantity)}>Add to Cart</Button>
                <Button size="lg" variant="outline" className="flex-1">Request Sample</Button>
             </div>
           </div>

           <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="desc">
                <AccordionTrigger>Product Description</AccordionTrigger>
                <AccordionContent className="text-slate-600">
                  {product.description || "No description available."}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="shipping">
                <AccordionTrigger>Shipping & Returns</AccordionTrigger>
                <AccordionContent className="text-slate-600">
                  <p>Fast shipping available across India. Bulk orders are shipped via transport. Returns accepted for manufacturing defects only within 7 days.</p>
                </AccordionContent>
              </AccordionItem>
           </Accordion>
        </div>
      </div>
    </div>
  );
};

const ProductDetailPage = () => (
  <DataErrorBoundary>
    <ProductDetailPageContent />
  </DataErrorBoundary>
);

export default ProductDetailPage;