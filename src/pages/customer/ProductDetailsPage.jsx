import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ShoppingCart, Share2, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { CustomerProductService } from '@/services/CustomerProductService';
import { useCart } from '@/contexts/CartContext';
import { Skeleton } from '@/components/ui/skeleton';

const ProductDetailsPage = () => {
   const { slug } = useParams();
   const { toast } = useToast();
   const { addToCart } = useCart();

   const [product, setProduct] = useState(null);
   const [loading, setLoading] = useState(true);
   const [quantity, setQuantity] = useState(100);
   const [selectedWidth, setSelectedWidth] = useState('');
   const [relatedProducts, setRelatedProducts] = useState([]);

   useEffect(() => {
      const loadProduct = async () => {
         setLoading(true);
         try {
            const data = await CustomerProductService.getProductDetails(slug);
            setProduct(data);
            if (data) {
               // set default width
               // const widths = data.specifications?.width_options || [];
               // if (widths.length > 0) setSelectedWidth(widths[0]);

               const related = await CustomerProductService.getRelatedProducts(data.id);
               setRelatedProducts(related || []);
            }
         } catch (error) {
            console.error(error);
         } finally {
            setLoading(false);
         }
      };
      loadProduct();
   }, [slug]);

   const handleAddToCart = () => {
      if (!product) return;
      addToCart({ ...product, quantity, selectedWidth });
      toast({
         title: "Added to cart",
         description: `${product.name} has been added to your cart.`
      });
   };

   if (loading) return <div className="container py-10"><Skeleton className="h-[500px] w-full" /></div>;
   if (!product) return <div className="container py-20 text-center">Product not found</div>;

   const imageUrl = product.images?.[0] || 'https://via.placeholder.com/600x800?text=No+Image';

   return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-[var(--font)] pb-12">
         <Helmet><title>{product.name} | Shree Rang Trendz</title></Helmet>

         <div className="container px-4 md:px-6 py-6">
            {/* Breadcrumbs */}
            <div className="flex items-center text-sm text-muted-foreground mb-6">
               <Link to="/products" className="hover:text-primary">Products</Link>
               <ChevronRight className="h-4 w-4 mx-2" />
               <span className="text-[var(--text)] font-[var(--serif)] font-medium truncate">{product.name}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
               {/* Image Gallery */}
               <div className="space-y-4">
                  <div className="aspect-[3/4] bg-[var(--surface2)] rounded-[var(--r)] overflow-hidden border border-[var(--border-teal)]">
                     <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  {/* Thumbnails placeholder */}
                  <div className="flex gap-4 overflow-x-auto pb-2">
                     {product.images?.map((img, i) => (
                        <div key={i} className="w-20 h-24 flex-shrink-0 bg-muted rounded border cursor-pointer hover:border-primary">
                           <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                     ))}
                  </div>
               </div>

               {/* Details */}
               <div className="space-y-6">
                  <div>
                     <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--text)] font-[var(--serif)]">{product.name}</h1>
                     <div className="text-lg text-muted-foreground mt-2">{product.categories?.name}</div>
                  </div>

                  <div className="text-3xl font-bold text-[var(--teal)] font-[var(--serif)]">
                     ₹{product.retail_price?.toLocaleString('en-IN') || 'N/A'} <span className="text-sm font-normal text-[var(--text-muted)] font-[var(--font)]">/ meter</span>
                  </div>

                  <div className="prose prose-sm text-muted-foreground">
                     <p>{product.description}</p>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-sm font-medium">Quantity (Meters)</label>
                           <Input
                              type="number"
                              min="1"
                              value={quantity}
                              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-sm font-medium">Width</label>
                           <Select value={selectedWidth} onValueChange={setSelectedWidth}>
                              <SelectTrigger>
                                 <SelectValue placeholder="Select Width" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="44">44"</SelectItem>
                                 <SelectItem value="58">58"</SelectItem>
                                 <SelectItem value="60">60"</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>
                     </div>

                     <div className="flex gap-4 pt-4">
                        <Button size="lg" className="flex-1" onClick={handleAddToCart}>
                           <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
                        </Button>
                        <Button size="lg" variant="outline" className="flex-1">
                           Request Quote
                        </Button>
                     </div>

                     <div className="flex justify-center pt-2">
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                           <Share2 className="mr-2 h-4 w-4" /> Share Product
                        </Button>
                     </div>
                  </div>

                  <div className="pt-6">
                     <Tabs defaultValue="specs">
                        <TabsList className="w-full justify-start">
                           <TabsTrigger value="specs">Specifications</TabsTrigger>
                           <TabsTrigger value="fabric">Fabric Details</TabsTrigger>
                        </TabsList>
                        <TabsContent value="specs" className="mt-4 space-y-2 text-sm">
                           <div className="grid grid-cols-2 py-2 border-b">
                              <span className="font-medium">SKU</span>
                              <span className="text-muted-foreground">{product.sku}</span>
                           </div>
                           <div className="grid grid-cols-2 py-2 border-b">
                              <span className="font-medium">GSM</span>
                              <span className="text-muted-foreground">{product.gsm || 'N/A'}</span>
                           </div>
                           {/* More specs map */}
                        </TabsContent>
                        <TabsContent value="fabric" className="mt-4 text-sm text-muted-foreground">
                           Detailed fabric composition and care instructions...
                        </TabsContent>
                     </Tabs>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default ProductDetailsPage;