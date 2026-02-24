import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Truck, ShieldCheck, Headphones, Layers, Scissors, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/customer/ProductCard';
import DesignCard from '@/components/customer/DesignCard';
import { CustomerProductService } from '@/services/CustomerProductService';
import { CustomerDesignService } from '@/services/CustomerDesignService';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredDesigns, setFeaturedDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [products, designs] = await Promise.all([
          CustomerProductService.getFeaturedProducts(),
          CustomerDesignService.getFeaturedDesigns()
        ]);
        setFeaturedProducts(ensureArray(products, 'HomePage products'));
        setFeaturedDesigns(ensureArray(designs, 'HomePage designs'));
      } catch (error) {
        logError(error, 'HomePage fetch');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const categories = [
    { name: 'Mill Print', icon: Layers, count: '500+', slug: 'mill-print' },
    { name: 'Digital Poly', icon: Droplets, count: '300+', slug: 'digital-poly' },
    { name: 'Digital Pure', icon: Droplets, count: '150+', slug: 'digital-pure' },
    { name: 'Solid Dyed', icon: Layers, count: '200+', slug: 'solid-dyed' },
    { name: 'Schiffli', icon: Scissors, count: '100+', slug: 'schiffli' },
    { name: 'Hakoba', icon: Scissors, count: '80+', slug: 'hakoba' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative bg-slate-900 text-white py-24 lg:py-32 overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1585337871471-fbe1b55b0a99?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center opacity-30"></div>
         <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
         <div className="container relative z-10 px-4 md:px-6">
            <div className="max-w-3xl space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-700">
               <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-7xl">
                 <span className="block text-primary">Shreerang Trendz</span>
                 Premium Fabrics & Designs
               </h1>
               <p className="text-lg text-slate-300 md:text-xl max-w-2xl leading-relaxed">
                 Experience the finest collection of textile mastery. From traditional Mill Prints to avant-garde Digital Art, we define the fabric of fashion.
               </p>
               <div className="flex flex-wrap gap-4 pt-4">
                  <Link to="/shop">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-white border-none h-12 px-8 text-lg">
                       Explore Products <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/designs">
                    <Button size="lg" variant="outline" className="bg-white/5 backdrop-blur-sm hover:bg-white/20 text-white border-white/40 h-12 px-8 text-lg">
                       View Design Gallery
                    </Button>
                  </Link>
               </div>
            </div>
         </div>
      </section>

      <section className="py-20 bg-slate-50">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12">
             <h2 className="text-3xl font-bold tracking-tight mb-4">Browse by Category</h2>
             <p className="text-muted-foreground max-w-2xl mx-auto">Explore our extensive range of specialized fabric processing techniques.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((cat, idx) => (
              <Link key={idx} to={`/shop?category=${cat.slug}`} className="group">
                <div className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-all text-center h-full flex flex-col items-center justify-center gap-3 group-hover:-translate-y-1">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <cat.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{cat.name}</h3>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{cat.count} Products</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container px-4 md:px-6">
           <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Featured Products</h2>
                <p className="text-muted-foreground mt-2">Hand-picked selections just for you.</p>
              </div>
              <Link to="/shop" className="text-primary font-medium hover:underline hidden sm:block">View All Products</Link>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="space-y-4">
                     <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                     <Skeleton className="h-4 w-2/3" />
                     <Skeleton className="h-4 w-1/3" />
                  </div>
                ))
              ) : (
                featuredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))
              )}
           </div>
           
           {!loading && featuredProducts.length === 0 && (
             <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg">
               No featured products available at the moment.
             </div>
           )}

           <div className="mt-10 text-center sm:hidden">
              <Link to="/shop"><Button variant="outline" size="lg" className="w-full">View All Products</Button></Link>
           </div>
        </div>
      </section>

      <section className="py-20 bg-slate-900 text-white">
         <div className="container px-4 md:px-6">
            <h2 className="text-3xl font-bold text-center mb-16">Why Choose Shree Rang Trendz?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               <BenefitCard 
                 icon={CheckCircle2} 
                 title="Premium Quality" 
                 desc="We source only the finest base fabrics and use top-tier printing technology."
               />
               <BenefitCard 
                 icon={Truck} 
                 title="Fast Delivery" 
                 desc="Optimized logistics ensure your orders reach you on time, every time."
               />
               <BenefitCard 
                 icon={ShieldCheck} 
                 title="Best Prices" 
                 desc="Competitive wholesale pricing directly from the manufacturer."
               />
               <BenefitCard 
                 icon={Headphones} 
                 title="Expert Support" 
                 desc="Our dedicated team is here to assist with all your textile needs."
               />
            </div>
         </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container px-4 md:px-6">
           <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Trending Designs</h2>
                <p className="text-muted-foreground mt-2">Latest patterns and artworks from our studio.</p>
              </div>
              <Link to="/designs" className="text-primary font-medium hover:underline hidden sm:block">View Design Gallery</Link>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {loading ? (
                Array(6).fill(0).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)
              ) : (
                featuredDesigns.map(design => (
                  <DesignCard key={design.id} design={design} />
                ))
              )}
           </div>
        </div>
      </section>

      <section className="py-20 bg-primary/5 border-t">
         <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold mb-4 text-slate-900">Stay Updated</h2>
            <p className="text-slate-600 mb-8 max-w-xl mx-auto">
              Subscribe to our newsletter for the latest design drops, exclusive wholesale offers, and textile trends.
            </p>
            <form className="max-w-md mx-auto flex gap-2" onSubmit={(e) => e.preventDefault()}>
               <input 
                 type="email" 
                 placeholder="Enter your email" 
                 className="flex-1 px-4 py-3 rounded-md border text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
               />
               <Button size="lg" className="font-semibold">Subscribe</Button>
            </form>
         </div>
      </section>
    </div>
  );
};

const BenefitCard = ({ icon: Icon, title, desc }) => (
  <div className="flex flex-col items-center text-center p-8 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
     <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center mb-6 text-primary">
        <Icon className="h-7 w-7" />
     </div>
     <h3 className="font-semibold text-xl mb-3">{title}</h3>
     <p className="text-slate-400 leading-relaxed">{desc}</p>
  </div>
);

export default HomePage;