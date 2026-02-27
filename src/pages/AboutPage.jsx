import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const milestones = [
  { year: '2010', label: 'Founded in Surat as a grey fabric trader' },
  { year: '2014', label: 'Expanded into Schiffli & value-addition fabrics' },
  { year: '2018', label: 'Digital print vertical launched · Millennium-4 office' },
  { year: '2021', label: 'Incorporated as Shreerang Trendz Pvt. Ltd.' },
  { year: '2024', label: 'Launched customer portal & WhatsApp AI sales bot' },
  { year: '2026', label: 'Full platform launch: 1,084+ SKUs, 247+ designs live' },
];

const AboutPage = () => (
  <>
    <Helmet><title>About Us — Shreerang Trendz</title></Helmet>

    {/* Hero */}
    <section style={{
      background: 'var(--sidebar-bg)', padding: '72px 24px 80px', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.06, backgroundImage: 'linear-gradient(var(--teal-bright) 1px, transparent 1px), linear-gradient(90deg, var(--teal-bright) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: '40%', pointerEvents: 'none',
        backgroundImage: 'url(/fabric-hero.png)', backgroundSize: 'cover', backgroundPosition: 'center',
        opacity: 0.15
      }} />
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal-bright)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 14 }}>Our Story</div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, color: '#C8E8E4', lineHeight: 1.15, marginBottom: 18, maxWidth: 600 }}>
          Where Tradition <span style={{ color: 'var(--gold-light)' }}>Weaves</span> its Magic
        </h1>
        <p style={{ fontSize: 14, color: '#6A9B95', maxWidth: 560, lineHeight: 1.8 }}>
          Shreerang Trendz Pvt. Ltd. is a textile converter and value-addition business headquartered in Surat, India's textile capital. We procure grey fabrics, add value through dyeing, printing, Schiffli embroidery, and sell finished fabrics wholesale across India.
        </p>
      </div>
    </section>

    {/* What we do */}
    <section style={{ padding: '72px 24px', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 10 }}>What We Do</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 700, color: 'var(--text)' }}>The Shreerang Business Model</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {[
            { icon: '🧵', title: 'Grey Fabric Sourcing', desc: 'We procure unfinished grey fabric from mills across Surat, Bhilwara, and Ahmedabad.' },
            { icon: '🎨', title: 'Value Addition', desc: 'Dyeing, rotary printing, digital printing, Schiffli embroidery, Hakoba, and Handwork — outsourced to specialised jobworkers.' },
            { icon: '✨', title: 'Finished Fabric Sales', desc: 'Sell finished and fancy fabrics wholesale to garment manufacturers, traders, and retailers across India.' },
            { icon: '👘', title: 'Readymade Garments', desc: 'Expanding into readymade garments — suits, gowns, lehengas, sarees — as a parallel vertical.' },
          ].map((item, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 'var(--r)', padding: 22 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{item.title}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Our Range */}
    <section style={{ padding: '72px 24px', background: 'var(--sidebar-bg)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.05, backgroundImage: 'linear-gradient(var(--teal-bright) 1px, transparent 1px), linear-gradient(90deg, var(--teal-bright) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 700, color: '#C8E8E4', marginBottom: 8 }}>Our Product Range</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { name: 'Mill Print (Rotary)', icon: '🖨️', count: '500+' },
            { name: 'Digital Poly Print', icon: '💻', count: '300+' },
            { name: 'Digital Pure Print', icon: '🎨', count: '150+' },
            { name: 'Solid Dyed', icon: '🌊', count: '200+' },
            { name: 'Schiffli Embroidery', icon: '✨', count: '100+' },
            { name: 'Hakoba', icon: '🪡', count: '80+' },
            { name: 'Readymade Garments', icon: '👘', count: 'New' },
          ].map((item, i) => (
            <div key={i} style={{ background: 'rgba(14,56,53,0.7)', border: '1px solid var(--sidebar-border)', borderRadius: 8, padding: '16px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#C8E8E4', marginBottom: 4 }}>{item.name}</div>
              <div style={{ fontSize: 10, color: 'var(--teal-bright)', fontFamily: 'var(--mono)' }}>{item.count} SKUs</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Timeline */}
    <section style={{ padding: '72px 24px', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 10 }}>Our Journey</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>15+ Years of Excellence</h2>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 80, top: 0, bottom: 0, width: 2, background: 'var(--border-teal)' }} />
          {milestones.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 24, marginBottom: 28, alignItems: 'flex-start' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--teal)', width: 56, textAlign: 'right', flexShrink: 0, paddingTop: 2 }}>{m.year}</div>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--teal-bright)', border: '2px solid var(--bg)', flexShrink: 0, marginTop: 4, position: 'relative', zIndex: 1, marginLeft: -5 }} />
              <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 8, padding: '10px 14px' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{m.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA */}
    <section style={{ padding: '60px 24px', background: 'linear-gradient(135deg, var(--sidebar-surface2), var(--sidebar-bg))', borderTop: '1px solid var(--sidebar-border)', textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: '#C8E8E4', marginBottom: 10 }}>Ready to Work Together?</h2>
      <p style={{ fontSize: 13, color: '#6A9B95', marginBottom: 24 }}>Browse our catalogue or contact us directly for wholesale enquiries.</p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/shop" style={{ padding: '11px 24px', background: 'var(--teal)', color: '#fff', borderRadius: 8, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          Browse Collection →
        </Link>
        <Link to="/contact" style={{ padding: '11px 24px', border: '1px solid var(--border-gold)', color: 'var(--gold-light)', borderRadius: 8, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          Contact Us
        </Link>
      </div>
    </section>
  </>
);

export default AboutPage;