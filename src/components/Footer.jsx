import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Clock } from 'lucide-react';

const Footer = () => {
  const linkStyle = {
    color: '#6A9B95', fontSize: 13, textDecoration: 'none',
    transition: 'color 0.13s', display: 'block', padding: '3px 0'
  };

  return (
    <footer style={{
      background: 'var(--sidebar-bg)',
      borderTop: '1px solid var(--sidebar-border)',
      fontFamily: 'var(--font)'
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 24px 0' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 48, paddingBottom: 48 }}>

          {/* Brand */}
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, background: 'var(--teal-bright)', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 800, color: '#071E1C',
                boxShadow: '0 2px 12px rgba(61,191,174,0.4)'
              }}>SR</div>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700, color: '#C8E8E4' }}>Shreerang</div>
                <div style={{ background: 'var(--gold-light)', color: '#0B2E2B', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.15em', padding: '1px 6px', borderRadius: 99, display: 'inline-block', textTransform: 'uppercase' }}>Trendz Pvt Ltd</div>
              </div>
            </Link>
            <p style={{ color: '#2E5550', fontSize: 12, lineHeight: 1.7, marginBottom: 16 }}>
              Leading manufacturer and wholesaler of premium fabrics. Schiffli, Digital Print, Mill Print. Where Tradition Weaves its Magic.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a key={i} href="#" style={{
                  width: 30, height: 30, borderRadius: 6,
                  border: '1px solid var(--sidebar-border)',
                  background: 'rgba(14,56,53,0.6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon style={{ width: 14, height: 14, color: '#6A9B95' }} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: '#C8E8E4', marginBottom: 16, letterSpacing: '0.02em' }}>Quick Links</h3>
            {[
              { label: 'Shop Collection', to: '/shop' },
              { label: 'Wholesale Portal', to: '/wholesale' },
              { label: 'Our Story', to: '/about' },
              { label: 'Contact Us', to: '/contact' },
              { label: 'Privacy Policy', to: '#' },
              { label: 'Returns & Exchanges', to: '#' },
            ].map((l, i) => (
              <Link key={i} to={l.to} style={linkStyle}>{l.label}</Link>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: '#C8E8E4', marginBottom: 16 }}>Contact Us</h3>
            {[
              { Icon: MapPin, text: 'Corporate: 4081-4084, 4th Floor, Millennium-4 Textile Market, Near Siddhi Vinayak Temple, Bhathena, Udhna, Surat-395002' },
              { Icon: MapPin, text: 'Sales: A-1070-1071, Global Textile Market, Opp. New Bombay Market, Sahara Darwaja, Surat-395002' },
              { Icon: Phone, text: 'Shrinandan Maru: +91 75678 60000' },
              { Icon: Phone, text: 'Shrikumar Maru: +91 75678 70000' },
              { Icon: Phone, text: 'Accounts: 78742 00066 | Despatch: 78742 20000' },
              { Icon: Mail, text: 'shreerangtrendz@gmail.com' },
              { Icon: Clock, text: 'Mon – Sat: 10:00 AM – 7:00 PM (IST)' },
            ].map(({ Icon, text }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                <Icon style={{ width: 14, height: 14, color: 'var(--teal-bright)', flexShrink: 0, marginTop: 2 }} />
                <span style={{ color: '#6A9B95', fontSize: 12, lineHeight: 1.6 }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Newsletter */}
          <div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 700, color: '#C8E8E4', marginBottom: 8 }}>Stay Updated</h3>
            <p style={{ color: '#2E5550', fontSize: 12, marginBottom: 14, lineHeight: 1.6 }}>
              New arrivals, exclusive wholesale offers, and textile trends.
            </p>
            <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="email" placeholder="Your email address"
                style={{
                  background: 'rgba(14,56,53,0.8)',
                  border: '1px solid var(--sidebar-border)',
                  borderRadius: 6, padding: '8px 12px',
                  fontFamily: 'var(--font)', fontSize: 12, color: '#C8E8E4', outline: 'none'
                }}
              />
              <button type="submit" style={{
                background: 'var(--teal)', color: '#fff',
                border: 'none', borderRadius: 6, padding: '8px 14px',
                fontFamily: 'var(--font)', fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}>Subscribe</button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid var(--sidebar-border)',
          padding: '16px 0',
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8
        }}>
          <p style={{ color: '#2E5550', fontSize: 11 }}>© 2026 Shreerang Trendz Pvt. Ltd. All rights reserved.</p>
          <div style={{ display: 'flex', gap: 20 }}>
            <span style={{ color: '#2E5550', fontSize: 11 }}>GST: 24AAUCS2915F1Z8</span>
            <span style={{ color: '#2E5550', fontSize: 11 }}>Made with ♥ in Surat, India</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;