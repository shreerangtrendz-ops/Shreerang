import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck, Receipt, Eye, Activity, Layers, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import ProductCard from '@/components/customer/ProductCard';
import { CustomerProductService } from '@/services/CustomerProductService';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

/* ──────────────────────────────────────────────────────────────────────────
   HomePage — 2026 redesign
   Audience priority: office team first, wholesale buyers second, retail third.
   Design principles:
   - Real numbers (from Supabase public_homepage_stats), no placeholder figures
   - Two parallel CTA paths in hero: Buyer / Staff
   - Drop fake testimonials; show capability claims that are demonstrably true
   - Same color tokens (var(--teal), var(--gold), etc.) — no design system change
   ─────────────────────────────────────────────────────────────────────────── */

// Fabric category cards — kept from previous version, condensed
const categories = [
  { name: 'Mill Print',     slug: 'mill-print',     hue: '#2BA898', desc: 'Rotary print, high-volume runs' },
  { name: 'Digital Poly',   slug: 'digital-poly',   hue: '#3DBFAE', desc: 'Sublimation on synthetics' },
  { name: 'Digital Pure',   slug: 'digital-pure',   hue: '#6E44C8', desc: 'Reactive on cotton & rayon' },
  { name: 'Solid Dyed',     slug: 'solid-dyed',     hue: '#1E9E5A', desc: 'Continuous dyeing, broad palette' },
  { name: 'Schiffli',       slug: 'schiffli',       hue: '#D4920A', desc: 'Embroidered on base fabric' },
  { name: 'Hakoba',         slug: 'hakoba',         hue: '#C9106E', desc: 'Cutwork & chikan styles' },
];

// Real, verifiable capabilities (replaces fake testimonials)
const capabilities = [
  { icon: Eye,        title: 'Real-time inventory',           desc: 'Wholesale partners see what is actually in stock today, not a stale catalogue PDF.' },
  { icon: Receipt,    title: 'GST-compliant invoicing',       desc: 'Auto-generated tax invoices with HSN, IRN, e-Way Bill — straight to your registered email and Tally.' },
  { icon: Activity,   title: 'Live order tracking',           desc: 'Every consignment from issue-to-mill through dispatch is visible to the buyer end-to-end.' },
  { icon: Layers,     title: 'Direct from Surat unit',        desc: 'No middlemen. Pricing reflects the converter rate, not a layered margin chain.' },
  { icon: Truck,      title: 'Same-day dispatch',             desc: 'Orders confirmed before noon ship the same evening across the Surat-Mumbai-Delhi corridor.' },
  { icon: ShieldCheck, title: 'Quality batch trail',          desc: 'Every roll links back to its grey lot, mill, and shortage record. Disputes resolve on data, not memory.' },
];

const fmtNumber = n => {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return n.toLocaleString('en-IN');
};

const HomePage = () => {
  const [stats, setStats] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Fetch real public stats (single query, single row)
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('public_homepage_stats')
      .select('*')
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          logError(error, 'HomePage stats');
        } else {
          setStats(data);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Fetch featured products
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const products = await CustomerProductService.getFeaturedProducts();
        if (!cancelled) setFeaturedProducts(ensureArray(products, 'HomePage products'));
      } catch (e) {
        logError(e, 'HomePage products fetch');
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-[var(--bg)] min-h-screen text-[var(--text)] font-[var(--font)]">

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden">
        {/* Decorative pattern band — subtle, doesn't fight the headline */}
        <div className="absolute inset-0 pointer-events-none -z-10" aria-hidden>
          <div className="absolute top-0 right-0 w-[55%] h-full bg-gradient-to-bl from-[var(--surface2)] via-[var(--surface3)] to-transparent opacity-60" />
          <div className="absolute top-1/4 right-12 w-72 h-72 rounded-full bg-[var(--teal-dim)] blur-3xl" />
          <div className="absolute top-1/2 right-32 w-48 h-48 rounded-full bg-[var(--gold-dim)] blur-2xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-20 lg:pt-28 pb-16 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* ── Left: copy + dual CTA ── */}
            <div className="lg:col-span-7 space-y-7">
              <div className="inline-flex items-center gap-2 bg-[var(--surface)] border border-[var(--border-teal)] rounded-full px-4 py-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[var(--teal)] animate-pulse" />
                <span className="text-[10px] font-bold tracking-[0.18em] text-[var(--teal-light)] uppercase">
                  Surat · Premium fabric converter · Est. {stats?.established_year || '2019'}
                </span>
              </div>

              <h1 className="font-[var(--serif)] text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
                Shreerang <span className="text-[var(--teal)]">Trendz</span>
              </h1>

              <p className="font-[var(--serif)] italic text-xl md:text-2xl text-[var(--text-muted)] border-l-4 border-[var(--gold)] pl-4 max-w-2xl">
                "Where Tradition Weaves its Magic"
              </p>

              <p className="text-[14px] leading-relaxed text-[var(--text-muted)] max-w-xl">
                Direct from our Surat processing unit. Schiffli, digital prints, mill prints, and
                solid-dyed fabrics — with real-time stock visibility and Tally-grade billing for
                every order.
              </p>

              {/* Dual entry: Buyers + Staff */}
              <div className="space-y-4 pt-2">
                <div className="text-[10px] font-bold tracking-[0.18em] text-[var(--text-muted)] uppercase">
                  For wholesale buyers
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/shop"
                    className="group inline-flex items-center gap-2 bg-[var(--teal)] hover:bg-[var(--teal-light)] text-white font-semibold px-6 py-3 rounded-[var(--r-sm)] text-[13px] shadow-md transition-colors"
                  >
                    Browse fabrics
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <a
                    href="https://wa.me/917567860000?text=Hi%2C%20I%27d%20like%20to%20enquire%20about%20fabric"
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] hover:opacity-90 text-white font-semibold px-6 py-3 rounded-[var(--r-sm)] text-[13px] shadow-md transition-opacity"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp for quote
                  </a>
                  <Link
                    to="/customer/login"
                    className="inline-flex items-center gap-2 bg-transparent border border-[var(--border-teal)] hover:border-[var(--teal)] hover:bg-[var(--teal-dim)] text-[var(--text)] hover:text-[var(--teal)] font-semibold px-6 py-3 rounded-[var(--r-sm)] text-[13px] transition-all"
                  >
                    Customer login
                  </Link>
                </div>

                <div className="text-[10px] font-bold tracking-[0.18em] text-[var(--text-muted)] uppercase pt-3">
                  For our team
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/admin"
                    className="group inline-flex items-center gap-2 bg-[var(--sidebar-bg)] hover:bg-[var(--sidebar-surface)] text-white font-semibold px-6 py-3 rounded-[var(--r-sm)] text-[13px] shadow-md transition-colors"
                  >
                    Open admin panel
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 bg-transparent border border-[var(--border-teal)] hover:border-[var(--teal)] text-[var(--text)] hover:text-[var(--teal)] font-semibold px-6 py-3 rounded-[var(--r-sm)] text-[13px] transition-all"
                  >
                    Staff login
                  </Link>
                </div>
              </div>
            </div>

            {/* ── Right: live numbers panel ── */}
            <div className="lg:col-span-5 lg:pl-6">
              <div className="bg-[var(--surface)] border border-[var(--border-teal)] rounded-[var(--r)] p-6 lg:p-8 shadow-[0_10px_40px_rgba(43,168,152,0.08)]">
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                  <span className="text-[10px] font-bold tracking-[0.16em] text-[var(--text-muted)] uppercase">Live · from our books</span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-7">
                  <Stat
                    label="Wholesale customers"
                    value={stats ? fmtNumber(stats.customers_count) : '…'}
                    sub={stats ? 'across India' : ''}
                  />
                  <Stat
                    label="Designs in catalogue"
                    value={stats ? fmtNumber(stats.designs_count) : '…'}
                    sub={stats ? 'live SKUs' : ''}
                  />
                  <Stat
                    label="Meters delivered"
                    value={stats ? fmtNumber(stats.meters_sold_lifetime) : '…'}
                    sub={stats ? `since ${stats.established_year}` : ''}
                    accent
                  />
                  <Stat
                    label="Mill partners"
                    value={stats ? fmtNumber(stats.suppliers_count) : '…'}
                    sub={stats ? 'in our network' : ''}
                  />
                </div>

                <div className="mt-7 pt-6 border-t border-[var(--border-teal)]">
                  <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Numbers refresh as orders process through our Tally-integrated pipeline.
                    No stale brochure figures.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FABRIC VERTICALS ═══════════ */}
      <section className="bg-[var(--surface)] border-y border-[var(--border-teal)] py-20 lg:py-24 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-[10px] font-bold tracking-[0.2em] text-[var(--teal)] uppercase mb-3">What we make</div>
            <h2 className="font-[var(--serif)] text-3xl md:text-4xl font-bold mb-4">Fabric verticals</h2>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
              Six specialisations under one roof, each with its own production line, quality team, and
              dedicated stockist relationships.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                to={`/shop?category=${cat.slug}`}
                className="group block bg-[var(--bg)] border border-[var(--border-teal)] hover:border-[var(--teal)] rounded-[var(--r)] p-6 transition-all hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(43,168,152,0.12)]"
              >
                {/* Color block instead of cluttered icon */}
                <div
                  className="w-full aspect-square rounded-[var(--r-sm)] mb-4 flex items-end p-3 transition-transform group-hover:scale-[1.02]"
                  style={{ background: `linear-gradient(135deg, ${cat.hue} 0%, ${cat.hue}aa 100%)` }}
                >
                  <span className="text-[10px] font-bold tracking-wider text-white/80 uppercase">{cat.slug}</span>
                </div>
                <h3 className="font-[var(--serif)] text-[15px] font-bold mb-1 group-hover:text-[var(--teal)] transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] leading-snug">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURED PRODUCTS ═══════════ */}
      <section className="bg-[var(--bg)] py-20 lg:py-24 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
            <div>
              <div className="text-[10px] font-bold tracking-[0.2em] text-[var(--gold)] uppercase mb-3">Hand-picked</div>
              <h2 className="font-[var(--serif)] text-3xl md:text-4xl font-bold">Featured products</h2>
            </div>
            <Link
              to="/shop"
              className="group mt-4 md:mt-0 inline-flex items-center gap-2 text-[var(--teal)] hover:text-[var(--teal-light)] font-semibold text-[13px]"
            >
              View full catalogue
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loadingProducts ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="bg-[var(--surface)] border border-[var(--border-teal)] rounded-[var(--r)] p-4 animate-pulse h-80">
                  <div className="w-full h-48 bg-[var(--surface2)] rounded-md mb-4" />
                  <div className="w-3/4 h-4 bg-[var(--surface2)] rounded mb-2" />
                  <div className="w-1/2 h-3 bg-[var(--surface2)] rounded" />
                </div>
              ))
            ) : featuredProducts.length > 0 ? (
              featuredProducts.slice(0, 4).map(p => (
                <div key={p.id} className="bg-[var(--surface)] border border-[var(--border-teal)] rounded-[var(--r)] overflow-hidden shadow-sm hover:shadow-[0_4px_16px_rgba(43,168,152,0.12)] transition-shadow">
                  <ProductCard product={p} />
                </div>
              ))
            ) : (
              // Honest empty state — doesn't pretend products exist
              <div className="col-span-full bg-[var(--surface)] border border-[var(--border-teal)] rounded-[var(--r)] py-12 px-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <div className="text-[10px] font-bold tracking-[0.18em] text-[var(--gold)] uppercase mb-2">Catalogue loading</div>
                  <p className="font-[var(--serif)] text-[18px] font-bold mb-1">
                    Featured selection coming online
                  </p>
                  <p className="text-[12px] text-[var(--text-muted)] max-w-md leading-relaxed">
                    {stats?.designs_count
                      ? `${fmtNumber(stats.designs_count)} active designs in our catalogue. WhatsApp us to get a tailored selection for your buying needs.`
                      : 'Our full catalogue is being indexed. WhatsApp us to discuss your requirements.'}
                  </p>
                </div>
                <a
                  href="https://wa.me/917567860000?text=Hi%2C%20I%27d%20like%20a%20fabric%20selection"
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] hover:opacity-90 text-white font-semibold px-6 py-3 rounded-[var(--r-sm)] text-[12px] shrink-0 transition-opacity"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp for selection
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════ CAPABILITIES (replaces testimonials) ═══════════ */}
      <section className="bg-[var(--surface)] border-t border-[var(--border-teal)] py-20 lg:py-24 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-[10px] font-bold tracking-[0.2em] text-[var(--teal)] uppercase mb-3">Built for serious buyers</div>
            <h2 className="font-[var(--serif)] text-3xl md:text-4xl font-bold mb-4">What working with us looks like</h2>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
              We modernised wholesale textile workflows so our partners spend less time chasing
              paperwork and more time selling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="bg-[var(--bg)] border border-[var(--border-teal)] hover:border-[var(--teal)] rounded-[var(--r)] p-7 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-[var(--r-sm)] bg-[var(--teal-dim)] group-hover:bg-[var(--teal)] flex items-center justify-center mb-4 transition-colors">
                    <Icon className="w-4 h-4 text-[var(--teal)] group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-[var(--serif)] text-[15px] font-bold mb-2">{cap.title}</h3>
                  <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">{cap.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER CTA BAND ═══════════ */}
      <section className="bg-[var(--sidebar-bg)] text-white py-16 lg:py-20 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <h3 className="font-[var(--serif)] text-2xl md:text-3xl font-bold mb-2 text-white">
              Ready to source from Surat?
            </h3>
            <p className="text-[13px] text-[var(--sidebar-text)] max-w-xl leading-relaxed">
              Talk to our team about volumes, pricing, and a sample run. Most partner conversations
              start on WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://wa.me/917567860000?text=Hi%2C%20interested%20in%20wholesale%20fabric"
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:opacity-90 text-white font-semibold px-6 py-3 rounded-[var(--r-sm)] text-[13px] transition-opacity"
            >
              <MessageCircle className="w-4 h-4" />
              Start on WhatsApp
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-transparent border border-white/30 hover:border-white/60 hover:bg-white/5 text-white font-semibold px-6 py-3 rounded-[var(--r-sm)] text-[13px] transition-all"
            >
              Visit our office
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

// ──────────── Local components ────────────

function Stat({ label, value, sub, accent }) {
  return (
    <div>
      <div className={`font-[var(--serif)] text-3xl lg:text-4xl font-bold leading-none ${accent ? 'text-[var(--gold)]' : 'text-[var(--teal)]'}`}>
        {value}
      </div>
      <div className="text-[10px] font-bold tracking-[0.08em] text-[var(--text-muted)] uppercase mt-2">
        {label}
      </div>
      {sub && (
        <div className="text-[10px] text-[var(--text-muted)] opacity-70 mt-1">{sub}</div>
      )}
    </div>
  );
}

export default HomePage;
