import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Truck, ShieldCheck, Headphones, Zap, TrendingUp, Layers, Gem } from 'lucide-react';
import ProductCard from '@/components/customer/ProductCard';
import DesignCard from '@/components/customer/DesignCard';
import { CustomerProductService } from '@/services/CustomerProductService';
import { CustomerDesignService } from '@/services/CustomerDesignService';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

const categories = [
  { name: 'Mill Print', icon: <img src="https://imagedelivery.net/LqiWLm-3MGbYHtFuUbcBtA/119580eb-abd9-4191-b93a-f01938786700/public" className="w-8 h-8 object-cover rounded-full" alt="mill" />, count: '500+', slug: 'mill-print', color: 'from-blue-400 to-blue-600' },
  { name: 'Digital Poly', icon: <Layers className="w-8 h-8 text-indigo-400" />, count: '300+', slug: 'digital-poly', color: 'from-indigo-400 to-indigo-600' },
  { name: 'Digital Pure', icon: <Gem className="w-8 h-8 text-teal-400" />, count: '150+', slug: 'digital-pure', color: 'from-teal-400 to-teal-600' },
  { name: 'Solid Dyed', icon: <img src="https://imagedelivery.net/LqiWLm-3MGbYHtFuUbcBtA/119580eb-abd9-4191-b93a-f01938786700/public" className="w-8 h-8 object-cover rounded-full" alt="solid" />, count: '200+', slug: 'solid-dyed', color: 'from-cyan-400 to-cyan-600' },
  { name: 'Schiffli', icon: <img src="https://imagedelivery.net/LqiWLm-3MGbYHtFuUbcBtA/119580eb-abd9-4191-b93a-f01938786700/public" className="w-8 h-8 object-cover rounded-full" alt="schiffli" />, count: '100+', slug: 'schiffli', color: 'from-yellow-400 to-yellow-600' },
  { name: 'Hakoba', icon: <Gem className="w-8 h-8 text-fuchsia-400" />, count: '80+', slug: 'hakoba', color: 'from-fuchsia-400 to-fuchsia-600' },
];

const benefits = [
  { icon: ShieldCheck, title: 'Premium Quality Assured', desc: 'Sourced from the finest base fabrics. Every meter undergoes rigorous multi-point quality checks.' },
  { icon: Zap, title: 'Lightning Fast Dispatch', desc: 'Optimized internal logistics ensure your orders are dispatched within 24 hours of invoice generation.' },
  { icon: TrendingUp, title: 'Direct Factory Pricing', desc: 'Enjoy aggressive wholesale pricing directly from the converter. Absolutely no middleman mark-ups.' },
  { icon: Headphones, title: '24/7 AI WhatsApp Support', desc: 'Our dual-layered support system features high-tech AI bots combined with a dedicated human team.' },
];

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredDesigns, setFeaturedDesigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [products, designs] = await Promise.all([
          CustomerProductService.getFeaturedProducts(),
          CustomerDesignService.getFeaturedDesigns()
        ]);
        setFeaturedProducts(ensureArray(products, 'HomePage products'));
        setFeaturedDesigns(ensureArray(designs, 'HomePage designs'));
      } catch (e) { logError(e, 'HomePage fetch'); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="bg-slate-950 min-h-screen text-slate-200 font-sans overflow-hidden">

      {/* ══ HERO SECTION ══ */}
      <section className="relative pt-32 pb-24 px-6 lg:px-12 z-10 flex flex-col items-center justify-center min-h-[85vh]">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <div className="absolute w-[600px] h-[600px] bg-teal-500/10 blur-[120px] rounded-full top-[-100px] left-[-150px]"></div>
          <div className="absolute w-[500px] h-[500px] bg-amber-500/10 blur-[100px] rounded-full bottom-[-50px] right-[-100px]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-8">
            <div className="inline-flex items-center space-x-2 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-1.5 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              <span className="text-xs font-bold tracking-widest text-teal-400 uppercase">Surat's Premier Fabric Hub</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
              Shreerang <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">Trendz</span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-400 italic font-medium max-w-2xl border-l-4 border-teal-500 pl-4">
              "Where Tradition Weaves its Magic"
            </p>

            <p className="text-base text-slate-400 leading-relaxed max-w-xl">
              Equipped with a futuristic supply chain and AI-integrated costing. We deliver premium Schiffli, Digital Prints, and solid-dyed fabrics with unparalleled precision—straight from the factory to your doorstep.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4 w-full">
              <Link to="/shop" className="group relative px-6 py-3.5 bg-teal-600 text-white font-semibold rounded-lg overflow-hidden shadow-[0_0_20px_rgba(13,148,136,0.3)] transition-all hover:shadow-[0_0_30px_rgba(13,148,136,0.5)]">
                <span className="relative z-10 flex items-center">
                  Explore Products <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-teal-500 transform scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 ease-out z-0"></div>
              </Link>

              <Link to="/customer/design-gallery" className="px-6 py-3.5 bg-transparent border border-slate-700 text-slate-300 font-semibold rounded-lg hover:border-slate-500 hover:text-white transition-all backdrop-blur-sm">
                View Design Gallery
              </Link>

              <Link to="/customer/product-catalog" className="px-6 py-3.5 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-all">
                Product Catalog
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 pt-10 border-t border-slate-800/60 w-full">
              {[
                { value: '1,250+', label: 'Active SKUs' },
                { value: '2.4M', label: 'Meters Delivered' },
                { value: 'AI', label: 'Powered Costing' },
                { value: '24/7', label: 'B2B Portal' }
              ].map((stat, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-2xl font-bold text-teal-400">{stat.value}</span>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 hidden lg:block perspective-1000">
            <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl shadow-teal-900/20 transform rotate-y-[-10deg] rotate-x-[5deg] transition-transform duration-700 hover:rotate-0 group border border-slate-800">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10"></div>
              <img
                src="https://imagedelivery.net/LqiWLm-3MGbYHtFuUbcBtA/119580eb-abd9-4191-b93a-f01938786700/public"
                alt="Premium Fabric Display"
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute bottom-6 left-6 z-20 bg-slate-900/80 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-xl">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Automated Delivery</p>
                    <p className="text-xs text-slate-400">Integrated with Transport</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CATEGORIES SECTION ══ */}
      <section className="py-24 px-6 lg:px-12 bg-slate-900 border-y border-slate-800 relative">
        <div className="max-w-7xl mx-auto z-10 relative">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold tracking-[0.2em] text-teal-500 uppercase mb-3">Our Expertise</h2>
            <h3 className="text-3xl md:text-5xl font-bold text-white mb-4">Fabric Verticals</h3>
            <p className="text-slate-400 max-w-2xl mx-auto">Discover our expansive ecosystem of specialized fabrics, curated for speed, scale, and uncompromising quality.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((cat, i) => (
              <Link key={i} to={`/shop?category=${cat.slug}`} className="group block">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-teal-900/10 hover:border-slate-700 relative overflow-hidden h-full flex flex-col items-center justify-center min-h-[160px]">
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${cat.color} transition-opacity duration-300`}></div>
                  <div className="mb-4 z-10 transition-transform duration-300 group-hover:scale-110">
                    {cat.icon}
                  </div>
                  <h4 className="font-bold text-white z-10 mb-1">{cat.name}</h4>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full z-10">
                    {cat.count} Variants
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURED PRODUCTS ══ */}
      <section className="py-24 px-6 lg:px-12 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-sm font-bold tracking-[0.2em] text-amber-500 uppercase mb-3">Hand-Picked</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-white">Featured Products</h3>
            </div>
            <Link to="/shop" className="group mt-4 md:mt-0 flex items-center text-teal-400 font-semibold hover:text-teal-300 transition-colors">
              View All Catalogue <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-80 bg-slate-900 rounded-xl animate-pulse border border-slate-800"></div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="w-full py-20 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500">
              <Gem className="w-12 h-12 mb-4 opacity-50" />
              <p className="font-medium text-lg">Inventory syncing currently in progress.</p>
              <p className="text-sm">Check back shortly as our integrated systems update the master catalogue.</p>
            </div>
          )}
        </div>
      </section>

      {/* ══ WHY CHOOSE US ══ */}
      <section className="py-24 px-6 lg:px-12 bg-slate-900 relative border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">The Shreerang Advantage</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">We've modernized traditional textile wholesale with a robust digital backend designed for B2B efficiency.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-slate-950 border border-slate-800 p-8 rounded-2xl hover:border-teal-900/50 transition-colors group">
                  <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center mb-6 border border-slate-800 group-hover:bg-teal-950/30 transition-colors">
                    <Icon className="w-6 h-6 text-teal-500" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-3">{item.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;