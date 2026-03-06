import React from 'react';

const EcomControlPage = () => {
    return (
        <div style={{ padding: '2rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                🛒 Ecom Control
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                Manage your online store — products, orders, visibility, and storefront settings.
            </p>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '1.25rem'
            }}>
                {[
                    { icon: '📦', label: 'Product Listings', desc: 'Manage live products on the store.' },
                    { icon: '🛍️', label: 'Orders', desc: 'View and process customer orders.' },
                    { icon: '👁️', label: 'Store Visibility', desc: 'Toggle products online / offline.' },
                    { icon: '💳', label: 'Payments', desc: 'Payment gateway status and logs.' },
                    { icon: '🔖', label: 'Coupons & Offers', desc: 'Create discount codes and campaigns.' },
                    { icon: '📊', label: 'Ecom Analytics', desc: 'Sales, traffic, and conversion metrics.' },
                ].map(({ icon, label, desc }) => (
                    <div
                        key={label}
                        style={{
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                            cursor: 'pointer',
                            transition: 'box-shadow 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
                    >
                        <div style={{ fontSize: '1.75rem' }}>{icon}</div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{label}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EcomControlPage;
