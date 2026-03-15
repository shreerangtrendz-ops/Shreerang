import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ShieldCheck, Headphones, Zap, TrendingUp, Gem, Star } from 'lucide-react';
import ProductCard from '@/components/customer/ProductCard';
import { CustomerProductService } from '@/services/CustomerProductService';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

// ─── Fabric Category Icons ─────────────────────────────────────────────────
const CategoryIcon = ({ slug }) => {
  const icons = {
    'mill-print': (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="20" fill="#1B4D47"/>
        <path d="M8 12h24M8 18h18M8 24h24M8 30h14" stroke="#3DBFAE" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="30" cy="24" r="4" fill="#3DBFAE" opacity="0.7"/>
      </svg>
    ),
    'digital-poly': (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="20" fill="#1B3A47"/>
        <path d="M10 28L18 16l6 8 4-6 6 10H10z" fill="#3DBFAE" opacity="0.85"/>
        <circle cx="28" cy="13" r="3" fill="#9BE0D8"/>
      </svg>
    ),
    'digital-pure': (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="20" fill="#2A1B47"/>
        <polygon points="20,8 24,16 33,17 27,24 29,33 20,28 11,33 13,24 7,17 16,16" fill="#A78BFA" opacity="0.85"/>
      </svg>
    ),
    'solid-dyed': (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="20" fill="#1B3D20"/>
        <circle cx="20" cy="20" r="10" fill="#4ADE80" opacity="0.3"/>
        <circle cx="20" cy="20" r="6" fill="#4ADE80" opacity="0.6"/>
        <circle cx="20" cy="20" r="3" fill="#4ADE80"/>
      </svg>
    ),
    'schiffli': (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="20" fill="#472B1B"/>
        <path d="M12 20 Q16 14 20 20 Q24 26 28 20" stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <path d="M12 25 Q16 19 20 25 Q24 31 28 25" stroke="#F59E0B" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/>
        <circle cx="12" cy="20" r="2" fill="#F59E0B"/>
        <circle cx="28" cy="20" r="2" fill="#F59E0B"/>
      </svg>
    ),
    'hakoba': (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="20" fill="#471B38"/>
        <rect x="14" y="14" width="5" height="5" rx="1" fill="#F472B6" opacity="0.8"/>
        <rect x="21" y="14" width="5" height="5" rx="1" fill="#F472B6" opacity="0.4"/>
        <rect x="14" y="21" width="5" height="5" rx="1" fill="#F472B6" opacity="0.4"/>
        <rect x="21" y="21" width="5" height="5" rx="1" fill="#F472B6" opacity="0.8"/>
      </svg>
    ),
  };
  return icons[slug] || <Gem className="w-8 h-8 text-[var(--teal)]" />;
};

const categories = [
  { name: 'Mill Print',    count: '500+',  slug: 'mill-print'   },
  { name: 'Digital Poly',  count: '300+',  slug: 'digital-poly' },
  { name: 'Digital Pure',  count: '150+',  slug: 'digital-pure' },
  { name: 'Solid Dyed',    count: '200+',  slug: 'solid-dyed'   },
  { name: 'Schiffli',      count: '100+',  slug: 'schiffli'     },
  { name: 'Hakoba',        count: '80+',   slug: 'hakoba'       },
];

const benefits = [
  { icon: ShieldCheck, title: 'Premium Quality Assured',     desc: 'Sourced from the finest base fabrics. Every meter undergoes rigorous multi-point quality checks.' },
  { icon: Zap,         title: 'Lightning Fast Dispatch',     desc: 'Optimized internal logistics ensure your orders are dispatched within 24 hours of invoice generation.' },
  { icon: TrendingUp,  title: 'Direct Factory Pricing',      desc: 'Enjoy aggressive wholesale pricing directly from the converter. Absolutely no middleman mark-ups.' },
  { icon: Headphones,  title: '24/7 AI WhatsApp Support',    desc: 'Our dual-layered support system features high-tech AI bots combined with a dedicated human team.' },
];

const stats = [
  { value: '1,250+', label: 'Active SKUs',       sub: 'Live Catalogue'  },
  { value: '2.4M',   label: 'Meters Delivered',  sub: 'Since 2018'      },
  { value: 'AI',     label: 'Powered Costing',   sub: 'Auto Pricing'    },
  { value: '24/7',   label: 'B2B Portal',        sub: 'Always Online'   },
];

const testimonials = [
  { name: 'Priya Mehta',    city: 'Mumbai',    text: 'Best digital print fabric supplier in the market. Fast delivery and quality is consistent every single time.' },
  { name: 'Rajesh Kapoor',  city: 'Delhi',     text: 'Their Schiffli collection is unmatched. We have been ordering for 3 years and never had a quality complaint.' },
  { name: 'Sunita Sharma',  city: 'Ahmedabad', text: 'The B2B portal makes reordering so easy. AI costing saves us hours of manual calculation every week.' },
];

const HERO_IMAGE = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=900&q=80';

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroImgOk, setHeroImgOk] = useState(true);

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

      {/* ══ HERO ══ */}
      <section className="relative pt-32 pb-24 px-6 lg:px-12 z-10 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="absolute top-0 right-0 w-1/2 h-[70vh] bg-[var(--surface2)] rounded-bl-[100px] -z-10 opacity-70 border-b border-l border-[var(--border-teal)] max-w-2xl hidden lg:block" />

        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-8">
            <div className="inline-flex items-center space-x-2 bg-[var(--surface)] border border-[var(--border-teal)] rounded-full px-4 py-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[var(--teal)] animate-pulse" />
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
              <Link to="/shop" className="group relative px-6 py-3 bg-[var(--teal)] text-white font-semibold rounded-[var(--r-sm)] overflow-hidden shadow-md hover:bg-[var(--teal-light)] transition-all flex items-center text-[12px]">
                <span>Explore Products</span>
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/customer/design-gallery" className="px-6 py-3 bg-transparent border border-[var(--border-teal)] text-[var(--text)] font-semibold rounded-[var(--r-sm)] hover:border-[var(--teal)] hover:bg-[var(--teal-dim)] hover:text-[var(--teal)] transition-all flex items-center text-[12px]">
                View Design Gallery
              </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 pt-10 border-t border-[var(--border-teal)] w-full mt-6">
              {stats.map((stat, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-3xl font-bold text-[var(--teal)] font-[var(--serif)]">{stat.value}</span>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.06em] mt-1">{stat.label}</span>
                  <span className="text-[9px] text-[var(--teal)] opacity-70 mt-0.5">{stat.sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Image */}
          <div className="lg:col-span-5 hidden lg:block">
            <div className="relative w-full aspect-[4/5] bg-[var(--surface)] p-3 rounded-[var(--r)] shadow-[0_10px_40px_rgba(43,168,152,0.1)] border border-[var(--border-teal)] transform transition-transform duration-700 hover:-translate-y-2">
              {heroImgOk ? (
                <img
                  src={HERO_IMAGE}
                  alt="Premium Fabric Collection"
                  className="w-full h-full object-cover rounded-[calc(var(--r)-4px)]"
                  onError={() => setHeroImgOk(false)}
                />
              ) : (
                /* Fallback: gradient tile when image fails */
                <div className="w-full h-full rounded-[calc(var(--r)-4px)] flex flex-col items-center justify-center gap-4"
                  style={{ background: 'linear-gradient(135deg, var(--surface2) 0%, var(--surface3) 100%)' }}>
                  <div className="grid grid-cols-3 gap-2 p-6 w-full">
                    {['#3DBFAE','#F59E0B','#A78BFA','#4ADE80','#F472B6','#9BE0D8'].map((c,i) => (
                      <div key={i} className="aspect-square rounded-lg opacity-60" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="text-[var(--teal)] font-[var(--serif)] font-bold text-sm">Premium Fabric Collection</span>
                </div>
              )}
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

      {/* ══ FABRIC VERTICALS ══ */}
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
                <div className="bg-[var(--surface)] border border-[var(--border-teal)] rounded-[var(--r)] p-6 text-center transform transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(43,168,152,0.12)] hover:border-[var(--teal)] flex flex-col items-center justify-center min-h-[160px] h-full">
                  <div className="mb-4 z-10 w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <CategoryIcon slug={cat.slug} />
                  </div>
                  <h4 className="font-bold text-[13px] text-[var(--text)] mb-2 group-hover:text-[var(--teal)] transition-colors">{cat.name}</h4>
                  <span className="text-[10px] font-semibold px-2.5 py-1 bg-[var(--surface2)] text-[var(--teal-light)] rounded-full border border-[var(--border-teal)]">{cat.count} Variants</span>
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
              <h3 className="text-3xl font-bold text-[var(--text)] font-[var(--serif)]">Featured Products</h3>
            </div>
            <Link to="/shop" className="group mt-4 md:mt-0 flex items-center text-[var(--teal)] font-semibold hover:text-[var(--teal-light)] transition-colors text-[13px]">
              View All Catalogue <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              [1,2,3,4].map(i => (
                <div key={i} className="h-80 bg-[var(--surface)] rounded-[var(--r)] border border-[var(--border-teal)] p-4 animate-pulse">
                  <div className="w-full h-48 bg-[var(--surface2)] rounded-md mb-4" />
                  <div className="w-3/4 h-4 bg-[var(--surface2)] rounded mb-2" />
                  <div className="w-1/2 h-3 bg-[var(--surface2)] rounded" />
                </div>
              ))
            ) : featuredProducts.length > 0 ? (
              featuredProducts.slice(0, 4).map(p => (
                <div key={p.id} className="bg-[var(--surface)] border border-[var(--border-teal)] rounded-[var(--r)] overflow-hidden shadow-sm hover:shadow-[0_4px_16px_rgba(43,168,152,0.1)] transition-all">
                  <ProductCard product={p} />
                </div>
              ))
            ) : (
              /* ── Better Empty State ── */
              <div className="col-span-1 sm:col-span-2 lg:col-span-4 w-full py-12 bg-[var(--surface)] border border-[var(--border-teal)] rounded-[var(--r)] flex flex-col md:flex-row items-center justify-between gap-6 px-8">
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] font-bold tracking-widest text-[var(--gold)] uppercase mb-2">Catalogue Coming Soon</span>
                  <p className="font-[var(--serif)] font-bold text-[18px] text-[var(--text)] mb-1">Full Product Range Available</p>
                  <p className="text-[12px] text-[var(--text-muted)] max-w-sm leading-relaxed">
                    Browse our 1,250+ SKUs across all fabric categories. Place orders, check stock and pricing directly through the portal.
                  </p>
                </div>
                <div className="flex flex-col gap-3 shrink-0">
                  <Link to="/shop" className="px-6 py-3 bg-[var(--teal)] text-white font-semibold rounded-[var(--r-sm)] text-[12px] hover:bg-[var(--teal-light)] transition-all flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" /> Browse All Categories
                  </Link>
                  <a
                    href="https://wa.me/917567860000?text=Hi%2C%20I%27d%20like%20to%20get%20a%20fabric%20quote"
                    target="_blank" rel="noreferrer"
                    className="px-6 py-3 bg-[#25D366] text-white font-semibold rounded-[var(--r-sm)] text-[12px] hover:opacity-90 transition-all flex items-center gap-2 justify-center"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp for Quote
                  </a>
                </div>
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
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section className="py-24 px-6 lg:px-12 bg-[var(--bg)] border-t border-[var(--border-teal)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-[10px] font-bold tracking-[0.2em] text-[var(--teal)] uppercase mb-3">Client Stories</h2>
            <h3 className="text-3xl font-bold text-[var(--text)] font-[var(--serif)]">What Our Buyers Say</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-[var(--surface)] border border-[var(--border-teal)] rounded-[var(--r)] p-8 flex flex-col gap-4 hover:border-[var(--teal)] transition-colors">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, s) => <Star key={s} className="w-3.5 h-3.5 text-[var(--gold)] fill-[var(--gold)]" />)}
                </div>
                <p className="text-[13px] text-[var(--text-muted)] leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-[var(--border-teal)]">
                  <div className="w-9 h-9 rounded-full bg-[var(--teal)] flex items-center justify-center text-white font-bold text-[12px] shrink-0">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-[var(--text)]">{t.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
