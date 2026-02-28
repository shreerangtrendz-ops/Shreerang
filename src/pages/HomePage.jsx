import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ShieldCheck, Headphones, Zap, TrendingUp, Layers, Gem } from 'lucide-react';
import ProductCard from '@/components/customer/ProductCard';
import { CustomerProductService } from '@/services/CustomerProductService';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

const categories = [
  { name: 'Mill Print', icon: <img src="https://imagedelivery.net/LqiWLm-3MGbYHtFuUbcBtA/119580eb-abd9-4191-b93a-f01938786700/public" className="w-8 h-8 object-cover rounded-full" alt="mill" />, count: '500+', slug: 'mill-print' },
  { name: 'Digital Poly', icon: <Layers className="w-8 h-8 text-[var(--teal)]" />, count: '300+', slug: 'digital-poly' },
  { name: 'Digital Pure', icon: <Gem className="w-8 h-8 text-[var(--teal)]" />, count: '150+', slug: 'digital-pure' },
  { name: 'Solid Dyed', icon: <img src="https://imagedelivery.net/LqiWLm-3MGbYHtFuUbcBtA/119580eb-abd9-4191-b93a-f01938786700/public" className="w-8 h-8 object-cover rounded-full" alt="solid" />, count: '200+', slug: 'solid-dyed' },
  { name: 'Schiffli', icon: <img src="https://imagedelivery.net/LqiWLm-3MGbYHtFuUbcBtA/119580eb-abd9-4191-b93a-f01938786700/public" className="w-8 h-8 object-cover rounded-full" alt="schiffli" />, count: '100+', slug: 'schiffli' },
  { name: 'Hakoba', icon: <Gem className="w-8 h-8 text-[var(--gold)]" />, count: '80+', slug: 'hakoba' },
];

const benefits = [
  { icon: ShieldCheck, title: 'Premium Quality Assured', desc: 'Sourced from the finest base fabrics. Every meter undergoes rigorous multi-point quality checks.' },
  { icon: Zap, title: 'Lightning Fast Dispatch', desc: 'Optimized internal logistics ensure your orders are dispatched within 24 hours of invoice generation.' },
  { icon: TrendingUp, title: 'Direct Factory Pricing', desc: 'Enjoy aggressive wholesale pricing directly from the converter. Absolutely no middleman mark-ups.' },
  { icon: Headphones, title: '24/7 AI WhatsApp Support', desc: 'Our dual-layered support system features high-tech AI bots combined with a dedicated human team.' },
];

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const products = await CustomerProductService.getFeaturedProducts();
        setFeaturedProducts(ensureArray(products, 'HomePage products'));
      } catch (e) { logError(e, 'HomePage fetch'); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="bg-[var(--bg)] min-h-screen text-[var(--text)] font-[var(--font)] overflow-hidden">

      {/* ══ HERO SECTION ══ */}
      <section className="relative pt-32 pb-24 px-6 lg:px-12 z-10 flex flex-col items-center justify-center min-h-[80vh]">
        {/* Subtle Background Accent */}
        <div className="absolute top-0 right-0 w-1/2 h-[70vh] bg-[var(--surface2)] rounded-bl-[100px] -z-10 opacity-70 border-b border-l border-[var(--border-teal)] max-w-2xl hidden lg:block"></div>

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-8">
            <div className="inline-flex items-center space-x-2 bg-[var(--surface)] border border-[var(--border-teal)] rounded-full px-4 py-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[var(--teal)] animate-pulse"></span>
              <span className="text-xs font-bold tracking-widest text-[var(--teal-light)] uppercase">Surat's Premier Fabric Hub</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-[var(--text)] leading-tight font-[var(--serif)]">
              Shreerang <span className="text-[var(--teal)]">Trendz</span>
            </h1>

            <p className="text-xl md:text-2xl text-[var(--text-muted)] italic font-medium max-w-2xl border-l-4 border-[var(--gold)] pl-4 font-[var(--serif)]">
              "Where Tradition Weaves its Magic"
            </p>

            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed max-w-xl">
              Equipped with a futuristic supply chain and AI-integrated costing. We deliver premium Schiffli, Digital Prints, and solid-dyed fabrics with unparalleled precision—straight from the factory to your doorstep.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4 w-full">
              <Link
                to="/shop"
                className="group relative px-6 py-3 bg-[var(--teal)] text-white font-semibold rounded-[var(--r-sm)] overflow-hidden shadow-md hover:bg-[var(--teal-light)] transition-all flex items-center text-[12px]"
              >
                <span>Explore Products</span>
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/customer/design-gallery"
                className="px-6 py-3 bg-transparent border border-[var(--border-teal)] text-[var(--text)] font-semibold rounded-[var(--r-sm)] hover:border-[var(--teal)] hover:bg-[var(--teal-dim)] hover:text-[var(--teal)] transition-all flex items-center text-[12px]"
              >
                View Design Gallery
              </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 pt-10 border-t border-[var(--border-teal)] w-full mt-6">
              {[
                { value: '1,250+', label: 'Active SKUs' },
                { value: '2.4M', label: 'Meters Delivered' },
                { value: 'AI', label: 'Powered Costing' },
                { value: '24/7', label: 'B2B Portal' }
              ].map((stat, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-3xl font-bold text-[var(--teal)] font-[var(--serif)]">{stat.value}</span>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mt-1">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Image Block */}
          <div className="lg:col-span-5 hidden lg:block">
            <div className="relative w-full aspect-[4/5] bg-[var(--surface)] p-3 rounded-[var(--r)] shadow-[0_10px_40px_rgba(43,168,152,0.1)] border border-[var(--border-teal)] transform transition-transform duration-700 hover:-translate-y-2">
              <img
                src="https://imagedelivery.net/LqiWLm-3MGbYHtFuUbcBtA/119580eb-abd9-4191-b93a-f01938786700/public"
                alt="Premium Fabric Display"
                className="w-full h-full object-cover rounded-[calc(var(--r)-4px)]"
              />
              <div className="absolute bottom-[-20px] left-[-20px] z-20 bg-[var(--surface)] border border-[var(--border-teal)] p-4 rounded-[var(--r)] shadow-lg max-w-[220px]">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--surface3)] border border-[var(--border-teal)] flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-[var(--teal)]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[var(--text)] font-[var(--serif)]">Automated Delivery</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Integrated Transport</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ══ CATEGORIES SECTION ══ */}
      <section className="py-24 px-6 lg:px-12 bg-[var(--surface)] border-y border-[var(--border-teal)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[10px] font-bold tracking-[0.2em] text-[var(--teal)] uppercase mb-3">Our Expertise</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-4 font-[var(--serif)]">Fabric Verticals</h3>
            <p className="text-[13px] text-[var(--text-muted)] max-w-2xl mx-auto">Discover our expansive ecosystem of specialized fabrics, curated for speed, scale, and uncompromising quality.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((cat, i) => (
              <Link key={i} to={`/shop?category=${cat.slug}`} className="group block h-full">
                <div className="bg-[var(--surface)] border border-[var(--border-teal)] rounded-[var(--r)] p-6 text-center transform transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(43,168,152,0.08)] hover:border-[var(--teal)] flex flex-col items-center justify-center min-h-[160px] h-full">
                  <div className="mb-4 z-10 bg-[var(--surface2)] w-14 h-14 rounded-full flex items-center justify-center border border-[var(--border-teal)] group-hover:scale-110 transition-transform duration-300">
                    {cat.icon}
                  </div>
                  <h4 className="font-bold text-[13px] text-[var(--text)] mb-2 group-hover:text-[var(--teal)] transition-colors">{cat.name}</h4>
                  <span className="text-[10px] font-semibold px-2.5 py-1 bg-[var(--surface2)] text-[var(--teal-light)] rounded-full border border-[var(--border-teal)]">
                    {cat.count} Variants
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURED PRODUCTS ══ */}
      <section className="py-24 px-6 lg:px-12 bg-[var(--bg)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h2 className="text-[10px] font-bold tracking-[0.2em] text-[var(--gold)] uppercase mb-3">Hand-Picked</h2>
              <h3 className="text-3xl md:text-3xl font-bold text-[var(--text)] font-[var(--serif)]">Featured Products</h3>
            </div>
            <Link to="/shop" className="group mt-4 md:mt-0 flex items-center text-[var(--teal)] font-semibold hover:text-[var(--teal-light)] transition-colors text-[13px]">
              View All Catalogue <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="h-80 bg-[var(--surface)] rounded-[var(--r)] border border-[var(--border-teal)] p-4 animate-pulse">
                  <div className="w-full h-48 bg-[var(--surface2)] rounded-md mb-4"></div>
                  <div className="w-3/4 h-4 bg-[var(--surface2)] rounded mb-2"></div>
                  <div className="w-1/2 h-3 bg-[var(--surface2)] rounded text-[var(--mono)]"></div>
                </div>
              ))
            ) : featuredProducts.length > 0 ? (
              featuredProducts.slice(0, 4).map(p => (
                <div key={p.id} className="bg-[var(--surface)] border border-[var(--border-teal)] rounded-[var(--r)] overflow-hidden shadow-sm hover:shadow-[0_4px_16px_rgba(43,168,152,0.1)] transition-all">
                  <ProductCard product={p} />
                </div>
              ))
            ) : (
              <div className="col-span-1 sm:col-span-2 lg:col-span-4 w-full py-16 bg-[var(--surface)] border border-[var(--border-teal)] rounded-[var(--r)] flex flex-col items-center justify-center text-[var(--text-muted)]">
                <div className="w-14 h-14 bg-[var(--surface3)] rounded-full flex items-center justify-center mb-4">
                  <Gem className="w-6 h-6 text-[var(--teal)] opacity-60" />
                </div>
                <p className="font-[var(--serif)] font-bold text-[15px] text-[var(--text)]">Inventory syncing currently in progress.</p>
                <p className="text-[12px] mt-2 text-center max-w-sm">Check back shortly as our integrated systems update the master catalogue with Tally Prime.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ WHY CHOOSE US ══ */}
      <section className="py-24 px-6 lg:px-12 bg-[var(--surface)] border-t border-[var(--border-teal)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-[28px] md:text-3xl font-bold text-[var(--text)] mb-4 font-[var(--serif)]">The Shreerang Advantage</h2>
            <p className="text-[13px] text-[var(--text-muted)] max-w-2xl mx-auto">We've modernized traditional textile wholesale with a robust digital backend designed for B2B efficiency.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-[var(--bg)] border border-[var(--border-teal)] p-8 rounded-[var(--r)] hover:border-[var(--teal)] hover:bg-[var(--surface4)] transition-colors group">
                  <div className="w-12 h-12 bg-[var(--surface)] rounded-[var(--r-sm)] flex items-center justify-center mb-5 border border-[var(--border-teal)] group-hover:bg-[var(--teal)] group-hover:border-[var(--teal)] transition-all">
                    <Icon className="w-5 h-5 text-[var(--teal)] group-hover:text-white transition-colors" />
                  </div>
                  <h4 className="text-[15px] font-[var(--serif)] font-bold text-[var(--text)] mb-2">{item.title}</h4>
                  <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">{item.desc}</p>
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