import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const inputStyle = {
  width: '100%', background: 'var(--surface)', border: '1px solid var(--border-teal)',
  borderRadius: 'var(--r-sm)', padding: '10px 12px',
  fontFamily: 'var(--font)', fontSize: 13, color: 'var(--text)', outline: 'none'
};

const benefits = [
  { icon: '📦', title: 'Bulk Pricing', desc: 'Wholesale rates from 50m+ per colour. Flat tiered pricing with no hidden charges.' },
  { icon: '🎨', title: '1,000+ SKUs', desc: 'Mill Print, Digital, Schiffli Embroidery, Solid Dyed, Hakoba — all in one source.' },
  { icon: '✂️', title: 'Custom Orders', desc: 'Custom colour, width, print, embroidery. MTO orders accepted with 15–30 day lead time.' },
  { icon: '🚚', title: 'Pan-India Despatch', desc: 'Surat → Mumbai, Delhi, Jaipur, Ahmedabad, Kolkata. Road + Courier options.' },
];

const WholesalePortalPage = () => (
  <>
    <Helmet><title>Wholesale Portal — Shreerang Trendz</title></Helmet>

    {/* Hero */}
    <section style={{
      background: 'var(--sidebar-bg)', padding: '80px 24px', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(ellipse 50% 60% at 80% 50%, rgba(212,146,10,0.08) 0%, transparent 65%)' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.05, backgroundImage: 'linear-gradient(var(--teal-bright) 1px, transparent 1px), linear-gradient(90deg, var(--teal-bright) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--gold-dim)', border: '1px solid var(--border-gold)', borderRadius: 99, padding: '4px 12px', marginBottom: 20 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--gold-light)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Wholesale Trade Portal</span>
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, color: '#C8E8E4', lineHeight: 1.15, marginBottom: 16 }}>
            Shreerang B2B <span style={{ color: 'var(--gold-light)' }}>Wholesale</span> Network
          </h1>
          <p style={{ fontSize: 13, color: '#6A9B95', lineHeight: 1.8, marginBottom: 28, maxWidth: 440 }}>
            For garment manufacturers, fabric traders, and retail shop owners. Get access to wholesale pricing, the full digital catalogue, and dedicated sales support.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="#enquiry" style={{ padding: '11px 22px', background: 'var(--gold)', color: '#fff', borderRadius: 8, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              Apply for Wholesale Account →
            </a>
            <a href="https://wa.me/917567860000?text=Hi%20Shreerang%2C%20I%20am%20interested%20in%20wholesale%20fabric%20pricing." target="_blank" rel="noopener noreferrer"
              style={{ padding: '11px 20px', background: '#25D366', color: '#fff', borderRadius: 8, fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
              📲 WhatsApp Enquiry
            </a>
          </div>
        </div>
        {/* Stats card */}
        <div style={{ background: 'rgba(14,56,53,0.8)', border: '1px solid var(--sidebar-border)', borderRadius: 12, padding: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { val: '1,000+', label: 'SKUs Available' },
              { val: '247+', label: 'Live Designs' },
              { val: '15+', label: 'Years in Trade' },
              { val: 'Pan-India', label: 'Delivery Reach' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: 16, background: 'rgba(43,168,152,0.06)', borderRadius: 8, border: '1px solid rgba(61,191,174,0.1)' }}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 800, color: 'var(--gold-light)', marginBottom: 4 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#6A9B95', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* Benefits */}
    <section style={{ padding: '72px 24px', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 10 }}>Why Work With Us</div>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>Built for B2B Trade</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {benefits.map((b, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 'var(--r)', padding: 22 }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{b.icon}</div>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 7 }}>{b.title}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Product categories */}
    <section style={{ padding: '64px 24px', background: 'var(--surface2)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 28, textAlign: 'center' }}>What We Stock</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
          {[
            { category: 'Mill Print Fabrics', items: ['Rotary Print on PC', 'Crepe', 'Chiffon', 'Georgette', 'Voile'], gsm: '60–120 GSM', widths: '44", 58", 60"' },
            { category: 'Digital Print Fabrics', items: ['Super Poly Digital', 'Pure Poly Digital', 'Satin Digital', 'Organza Digital'], gsm: '60–180 GSM', widths: '58", 60"' },
            { category: 'Schiffli Embroidery', items: ['PC Grey Schiffli', 'Net Schiffli', 'Organza Schiffli', 'Chiffon Schiffli'], gsm: 'Varies', widths: '42", 54", 58"' },
            { category: 'Value-Added Fabrics', items: ['Solid Dyed', 'Hakoba', 'Kantha Work', 'Heavy Embroidery (Handwork)'], gsm: '80–200 GSM', widths: 'Custom' },
          ].map((cat, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 'var(--r)', padding: 18 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10, fontFamily: 'var(--serif)' }}>{cat.category}</h3>
              <ul style={{ paddingLeft: 14, margin: '0 0 10px', color: 'var(--text-muted)' }}>
                {cat.items.map(item => <li key={item} style={{ fontSize: 11, marginBottom: 3 }}>{item}</li>)}
              </ul>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, background: 'var(--teal-dim)', color: 'var(--teal)', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>GSM: {cat.gsm}</span>
                <span style={{ fontSize: 9, background: 'var(--gold-dim)', color: 'var(--gold)', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>Width: {cat.widths}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Enquiry Form */}
    <section id="enquiry" style={{ padding: '72px 24px', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Apply for Wholesale Account</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fill the form below. Our team will contact you within 24 hours with wholesale rate cards.</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 'var(--r)', padding: 28 }}>
          <form onSubmit={e => { e.preventDefault(); alert('Thank you! Our sales team will contact you within 24 hours.'); }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {[['Firm / Company Name *', 'text', 'Your firm name'], ['Owner / Contact Person *', 'text', 'Your name']].map(([label, type, ph], i) => (
                <div key={i}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{label}</label>
                  <input type={type} placeholder={ph} required={label.includes('*')} style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'var(--teal)'; e.target.style.boxShadow = '0 0 0 3px var(--teal-dim)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-teal)'; e.target.style.boxShadow = 'none'; }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {[['WhatsApp Number *', 'tel', '+91 98765 43210'], ['City / Area', 'text', 'Mumbai, Delhi, Surat…']].map(([label, type, ph], i) => (
                <div key={i}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{label}</label>
                  <input type={type} placeholder={ph} required={label.includes('*')} style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'var(--teal)'; e.target.style.boxShadow = '0 0 0 3px var(--teal-dim)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-teal)'; e.target.style.boxShadow = 'none'; }} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Nature of Business</label>
              <select style={inputStyle}>
                {['Garment Manufacturer', 'Fabric Trader / Retailer', 'Wholesaler', 'Export House', 'Boutique Owner', 'Other'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Interested In</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Mill Print', 'Digital Print', 'Schiffli', 'Solid Dyed', 'Hakoba', 'Readymade'].map(cat => (
                  <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input type="checkbox" /> {cat}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Requirements / Monthly Volume</label>
              <textarea rows={3} placeholder="e.g. 500m/month of Schiffli embroidery fabric, 58 inch, light colours for suits…" style={{ ...inputStyle, resize: 'vertical' }}
                onFocus={e => { e.target.style.borderColor = 'var(--teal)'; e.target.style.boxShadow = '0 0 0 3px var(--teal-dim)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-teal)'; e.target.style.boxShadow = 'none'; }} />
            </div>
            <button type="submit" style={{ width: '100%', padding: '12px', background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--font)', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Submit Wholesale Enquiry →
            </button>
          </form>
        </div>
      </div>
    </section>
  </>
);

export default WholesalePortalPage;