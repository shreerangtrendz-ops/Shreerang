import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Truck, ShieldCheck, Headphones } from 'lucide-react';
import ProductCard from '@/components/customer/ProductCard';
import DesignCard from '@/components/customer/DesignCard';
import { CustomerProductService } from '@/services/CustomerProductService';
import { CustomerDesignService } from '@/services/CustomerDesignService';
import { ensureArray } from '@/lib/arrayValidation';
import { logError } from '@/lib/debugHelpers';

const categories = [
  { name: 'Mill Print', icon: '🖨️', count: '500+', slug: 'mill-print', accent: 'var(--teal)' },
  { name: 'Digital Poly', icon: '💻', count: '300+', slug: 'digital-poly', accent: 'var(--blue)' },
  { name: 'Digital Pure', icon: '🎨', count: '150+', slug: 'digital-pure', accent: 'var(--purple)' },
  { name: 'Solid Dyed', icon: '🌊', count: '200+', slug: 'solid-dyed', accent: 'var(--cyan)' },
  { name: 'Schiffli', icon: '✨', count: '100+', slug: 'schiffli', accent: 'var(--gold)' },
  { name: 'Hakoba', icon: '🪡', count: '80+', slug: 'hakoba', accent: 'var(--magenta)' },
];

const benefits = [
  { icon: Check, title: 'Premium Quality', desc: 'Finest base fabrics + top-tier printing technology. Every meter quality checked.' },
  { icon: Truck, title: 'Pan-India Delivery', desc: 'Optimised logistics. Orders dispatched within 24 hrs of challan.' },
  { icon: ShieldCheck, title: 'Direct Factory Price', desc: 'Wholesale pricing direct from the converter. No middleman mark-up.' },
  { icon: Headphones, title: 'WhatsApp Support', desc: 'Our AI-powered bot + dedicated team available Mon–Sat, 10 AM–7 PM.' },
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
    <div>

      {/* ══ HERO ══ */}
      <section style={{
        background: 'var(--sidebar-bg)',
        position: 'relative', overflow: 'hidden',
        padding: '80px 24px 96px'
      }}>
        {/* Decorative glow */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 60% 50% at 80% 20%, rgba(43,168,152,0.15) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 5% 90%, rgba(212,146,10,0.10) 0%, transparent 50%),
            radial-gradient(ellipse 30% 40% at 50% 50%, rgba(43,168,152,0.05) 0%, transparent 70%)
          `
        }} />
        {/* Animated teal grid lines */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.05,
          backgroundImage: 'linear-gradient(var(--teal-bright) 1px, transparent 1px), linear-gradient(90deg, var(--teal-bright) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 40 }}>
            <div style={{ maxWidth: 640 }}>
              {/* Pre-label */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal-bright)', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--teal-bright)' }}>
                  Premium Fabric Converter — Surat
                </span>
              </div>

              <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, color: '#C8E8E4', lineHeight: 1.1, marginBottom: 20 }}>
                Shreerang<br />
                <span style={{ color: 'var(--gold-light)' }}>Trendz</span>
              </h1>
              <p style={{ fontSize: 15, color: '#6A9B95', lineHeight: 1.8, marginBottom: 8, fontStyle: 'italic' }}>
                Where Tradition Weaves its Magic
              </p>
              <p style={{ fontSize: 13, color: '#4A7A74', lineHeight: 1.7, marginBottom: 32, maxWidth: 520 }}>
                Leading manufacturer and wholesaler of premium fabrics — Schiffli, Digital Print, Mill Print, Hakoba and more. Direct from factory to your door across India.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Link to="/shop" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '12px 24px', background: 'var(--teal)', color: '#fff',
                  borderRadius: 8, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', transition: 'all 0.15s',
                  boxShadow: '0 4px 20px rgba(43,168,152,0.3)'
                }}>
                  Explore Collection <ArrowRight style={{ width: 16, height: 16 }} />
                </Link>
                <Link to="/wholesale" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '12px 24px', background: 'transparent',
                  border: '1px solid var(--border-gold)', color: 'var(--gold-light)',
                  borderRadius: 8, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600,
                  textDecoration: 'none', transition: 'all 0.15s'
                }}>
                  Wholesale Portal →
                </Link>
              </div>

              {/* Trust stats */}
              <div style={{ display: 'flex', gap: 32, marginTop: 40, flexWrap: 'wrap' }}>
                {[['1,084+', 'Active SKUs'], ['247+', 'Designs'], ['15+ yrs', 'Experience'], ['Pan-India', 'Delivery']].map(([v, l], i) => (
                  <div key={i}>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, color: 'var(--teal-bright)' }}>{v}</div>
                    <div style={{ fontSize: 10, color: '#2E5550', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero side card — fabric types */}
            <div className="hidden lg:block" style={{
              background: 'rgba(14,56,53,0.8)',
              border: '1px solid var(--sidebar-border)',
              borderRadius: 12, padding: '24px 20px', minWidth: 200
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#2E5550', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>Our Verticals</div>
              {[
                { label: 'Schiffli', color: 'var(--gold)' },
                { label: 'Mill Print', color: 'var(--teal)' },
                { label: 'Digital Print', color: 'var(--blue)' },
                { label: 'Solid Dyed', color: 'var(--cyan)' },
                { label: 'Hakoba', color: 'var(--magenta)' },
                { label: 'Readymade', color: 'var(--purple)' },
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0',
                  borderBottom: i < 5 ? '1px solid rgba(61,191,174,0.10)' : 'none'
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#6A9B95' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ CATEGORIES ══ */}
      <section style={{ padding: '72px 24px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 10 }}>What We Make</div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>Browse by Category</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>
              Explore our extensive range of specialised fabric processing techniques.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
            {categories.map((cat, idx) => (
              <Link key={idx} to={`/shop?category=${cat.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border-teal)',
                  borderRadius: 10, padding: '24px 16px', textAlign: 'center',
                  transition: 'all 0.2s', cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(43,168,152,0.06)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = cat.accent; e.currentTarget.style.boxShadow = `0 8px 24px rgba(43,168,152,0.12)`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border-teal)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(43,168,152,0.06)'; }}
                >
                  <div style={{ fontSize: 32 }}>{cat.icon}</div>
                  <div>
                    <div style={{ fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{cat.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 99 }}>{cat.count} SKUs</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURED PRODUCTS ══ */}
      <section style={{ padding: '72px 24px', background: 'var(--surface)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>Hand-Picked</div>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Featured Products</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Curated selections from our premium catalogue.</p>
            </div>
            <Link to="/shop" style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>View All →</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} style={{ background: 'var(--surface2)', borderRadius: 10, height: 280, animation: 'pulse 1.5s infinite' }} />
              ))
            ) : (
              featuredProducts.map(p => <ProductCard key={p.id} product={p} />)
            )}
          </div>
          {!loading && featuredProducts.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', background: 'var(--surface2)', borderRadius: 10 }}>
              Products coming soon. Check back shortly.
            </div>
          )}
        </div>
      </section>

      {/* ══ WHY CHOOSE US ══ */}
      <section style={{ padding: '72px 24px', background: 'var(--sidebar-bg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.05,
          backgroundImage: 'linear-gradient(var(--teal-bright) 1px, transparent 1px), linear-gradient(90deg, var(--teal-bright) 1px, transparent 1px)',
          backgroundSize: '80px 80px'
        }} />
        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 700, color: '#C8E8E4', textAlign: 'center', marginBottom: 50 }}>
            Why Choose <span style={{ color: 'var(--gold-light)' }}>Shreerang Trendz</span>?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {benefits.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} style={{
                background: 'rgba(14,56,53,0.7)',
                border: '1px solid var(--sidebar-border)',
                borderRadius: 10, padding: '28px 22px',
                transition: 'all 0.2s'
              }}>
                <div style={{ width: 44, height: 44, background: 'rgba(61,191,174,0.10)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <Icon style={{ width: 20, height: 20, color: 'var(--teal-bright)' }} />
                </div>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: '#C8E8E4', marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 12, color: '#6A9B95', lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TRENDING DESIGNS ══ */}
      <section style={{ padding: '72px 24px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>Latest Drops</div>
              <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Trending Designs</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Latest patterns and artworks from our design studio.</p>
            </div>
            <Link to="/designs" style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>View Gallery →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
            {loading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} style={{ background: 'var(--surface2)', borderRadius: 10, aspectRatio: '1', animation: 'pulse 1.5s infinite' }} />
              ))
            ) : (
              featuredDesigns.map(d => <DesignCard key={d.id} design={d} />)
            )}
          </div>
        </div>
      </section>

      {/* ══ NEWSLETTER ══ */}
      <section style={{
        padding: '72px 24px',
        background: 'linear-gradient(135deg, var(--sidebar-surface2), var(--sidebar-bg))',
        borderTop: '1px solid var(--sidebar-border)'
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: 50, height: 50, background: 'rgba(61,191,174,0.15)', border: '1px solid var(--sidebar-border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 22 }}>📬</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: '#C8E8E4', marginBottom: 10 }}>Stay Updated</h2>
          <p style={{ fontSize: 13, color: '#6A9B95', lineHeight: 1.7, marginBottom: 28 }}>
            Subscribe for the latest design drops, exclusive wholesale offers, and textile industry trends.
          </p>
          <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', gap: 10, maxWidth: 420, margin: '0 auto' }}>
            <input
              type="email" placeholder="Your email address"
              style={{
                flex: 1, background: 'rgba(14,56,53,0.8)',
                border: '1px solid var(--sidebar-border)', borderRadius: 6,
                padding: '10px 14px', fontFamily: 'var(--font)', fontSize: 13,
                color: '#C8E8E4', outline: 'none'
              }}
            />
            <button type="submit" style={{
              padding: '10px 20px', background: 'var(--teal)', color: '#fff',
              border: 'none', borderRadius: 6, fontFamily: 'var(--font)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
            }}>Subscribe</button>
          </form>
        </div>
      </section>

    </div>
  );
};

export default HomePage;