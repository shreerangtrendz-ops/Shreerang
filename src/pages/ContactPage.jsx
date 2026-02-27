import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const ContactPage = () => {
    const inputStyle = {
        width: '100%', background: 'var(--surface)',
        border: '1px solid var(--border-teal)',
        borderRadius: 'var(--r-sm)', padding: '10px 12px',
        fontFamily: 'var(--font)', fontSize: 13, color: 'var(--text)', outline: 'none'
    };

    return (
        <>
            <Helmet><title>Contact Us — Shreerang Trendz</title></Helmet>

            {/* Hero */}
            <section style={{ background: 'var(--sidebar-bg)', padding: '56px 24px 60px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.05, backgroundImage: 'linear-gradient(var(--teal-bright) 1px, transparent 1px), linear-gradient(90deg, var(--teal-bright) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
                <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal-bright)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 12 }}>Get In Touch</div>
                    <h1 style={{ fontFamily: 'var(--serif)', fontSize: 38, fontWeight: 800, color: '#C8E8E4', marginBottom: 12 }}>Contact <span style={{ color: 'var(--gold-light)' }}>Shreerang Trendz</span></h1>
                    <p style={{ fontSize: 14, color: '#6A9B95', maxWidth: 500, margin: '0 auto' }}>
                        Our team is available Mon–Sat, 10 AM–7 PM (IST). WhatsApp preferred for quick responses.
                    </p>
                </div>
            </section>

            {/* Main content */}
            <section style={{ padding: '64px 24px', background: 'var(--bg)' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 40 }}>

                    {/* Left — Contact Info */}
                    <div>
                        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>Our Offices</h2>

                        {/* Corporate Office */}
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 'var(--r)', padding: 20, marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal-bright)' }} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Corporate Office</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                                <MapPin style={{ width: 14, height: 14, color: 'var(--teal-bright)', flexShrink: 0, marginTop: 2 }} />
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>4081–4084, 4th Floor, Millennium-4 Textile Market, Near Siddhi Vinayak Temple, Bhathena, Udhna, Surat — 395002, Gujarat</span>
                            </div>
                        </div>

                        {/* Sales Office */}
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 'var(--r)', padding: 20, marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold-light)' }} />
                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sales Office</span>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <MapPin style={{ width: 14, height: 14, color: 'var(--gold-light)', flexShrink: 0, marginTop: 2 }} />
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>A-1070–1071, Global Textile Market, Opp. New Bombay Market, Sahara Darwaja, Ring Road, Surat — 395002</span>
                            </div>
                        </div>

                        {/* People */}
                        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Key Contacts</h3>
                        {[
                            { name: 'Shrinandan Maru', role: 'Director', phone: '+91 75678 60000' },
                            { name: 'Shrikumar Maru', role: 'Director', phone: '+91 75678 70000' },
                            { name: 'Accounts Dept', role: 'Billing & Invoices', phone: '+91 78742 00066' },
                            { name: 'Despatch Dept', role: 'Logistics & Delivery', phone: '+91 78742 20000' },
                        ].map((p, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-teal)' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.role}</div>
                                </div>
                                <a href={`tel:${p.phone.replace(/\s/g, '')}`} style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--mono)' }}>{p.phone}</a>
                            </div>
                        ))}

                        {/* Other contacts */}
                        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { Icon: Mail, text: 'shreerangtrendz@gmail.com', href: 'mailto:shreerangtrendz@gmail.com' },
                                { Icon: Clock, text: 'Mon – Sat: 10:00 AM – 7:00 PM (IST)', href: null },
                            ].map(({ Icon, text, href }, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <Icon style={{ width: 14, height: 14, color: 'var(--teal-bright)' }} />
                                    {href ? <a href={href} style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>{text}</a>
                                        : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{text}</span>}
                                </div>
                            ))}
                        </div>

                        {/* GSTIN */}
                        <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--teal-dim)', border: '1px solid var(--border-teal)', borderRadius: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--teal)', fontFamily: 'var(--mono)' }}>GSTIN: 24AAUCS2915F1Z8</span>
                        </div>
                    </div>

                    {/* Right — Contact Form */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 'var(--r)', padding: 28 }}>
                        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Send an Enquiry</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 22 }}>We'll respond within 4 hours on business days.</p>
                        <form onSubmit={e => { e.preventDefault(); alert('Thank you for your enquiry! We will contact you shortly.'); }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                                {[['Your Name *', 'text', 'Firm Name or Your Name'], ['Mobile / WhatsApp *', 'tel', '+91 98765 43210']].map(([label, type, ph], i) => (
                                    <div key={i}>
                                        <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>{label}</label>
                                        <input type={type} placeholder={ph} required={label.includes('*')} style={inputStyle}
                                            onFocus={e => { e.target.style.borderColor = 'var(--teal)'; e.target.style.boxShadow = '0 0 0 3px var(--teal-dim)'; }}
                                            onBlur={e => { e.target.style.borderColor = 'var(--border-teal)'; e.target.style.boxShadow = 'none'; }}
                                        />
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Email</label>
                                <input type="email" placeholder="name@company.com" style={inputStyle}
                                    onFocus={e => { e.target.style.borderColor = 'var(--teal)'; e.target.style.boxShadow = '0 0 0 3px var(--teal-dim)'; }}
                                    onBlur={e => { e.target.style.borderColor = 'var(--border-teal)'; e.target.style.boxShadow = 'none'; }} />
                            </div>
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Type of Enquiry</label>
                                <select style={inputStyle}>
                                    {['Wholesale Fabric Purchase', 'Schiffli / Embroidery Fabric', 'Digital Print Fabric', 'Mill Print Fabric', 'Bulk Order', 'Custom Design Requirement', 'Other'].map(o => <option key={o}>{o}</option>)}
                                </select>
                            </div>
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Message / Requirements *</label>
                                <textarea rows={5} required placeholder="Describe your fabric requirement — type, quantity, width, any specific design or colour preference…" style={{ ...inputStyle, resize: 'vertical' }}
                                    onFocus={e => { e.target.style.borderColor = 'var(--teal)'; e.target.style.boxShadow = '0 0 0 3px var(--teal-dim)'; }}
                                    onBlur={e => { e.target.style.borderColor = 'var(--border-teal)'; e.target.style.boxShadow = 'none'; }} />
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="submit" style={{ flex: 1, padding: '11px', background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                    Send Enquiry →
                                </button>
                                <a href="https://wa.me/917567860000" target="_blank" rel="noopener noreferrer"
                                    style={{ padding: '11px 16px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 'var(--r-sm)', fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    📲 WhatsApp
                                </a>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </>
    );
};

export default ContactPage;