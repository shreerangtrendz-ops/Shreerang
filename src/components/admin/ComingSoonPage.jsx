import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';

/**
 * ComingSoonPage — reusable branded placeholder for features under development.
 * Usage: <ComingSoonPage title="Market Intelligence" icon="📡" desc="..." />
 */
const ComingSoonPage = ({ title, icon = '🚀', desc, topbarTitle, breadcrumb }) => {
    const navigate = useNavigate();
    return (
        <div className="screen active">
            <Helmet><title>{title} — Shreerang Admin</title></Helmet>

            {/* Topbar */}
            <div className="topbar">
                <div>
                    <div className="page-title">{topbarTitle || title}</div>
                    <div className="breadcrumb">{breadcrumb || `Admin → ${title}`}</div>
                </div>
            </div>

            {/* Content */}
            <div className="content">
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: 380, textAlign: 'center',
                    background: 'var(--surface)', border: '1px solid var(--border-teal)',
                    borderRadius: 'var(--r)', padding: 48
                }}>
                    {/* Icon ring */}
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        border: '2px solid var(--border-teal)',
                        background: 'var(--teal-dim)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 36, marginBottom: 24,
                        boxShadow: '0 0 30px rgba(43,168,152,0.15)'
                    }}>{icon}</div>

                    <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                        {title}
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 440, lineHeight: 1.7, marginBottom: 28 }}>
                        {desc || `The ${title} module is being built and will be available in the next update. All data is preserved.`}
                    </p>

                    {/* Status pills */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
                        <span className="badge bg">🔧 In Development</span>
                        <span className="badge bgold">📅 Coming Soon</span>
                        <span className="badge bgreen">✓ Data Safe</span>
                    </div>

                    <button className="btn btn-outline" onClick={() => navigate('/admin/dashboard')}>
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComingSoonPage;
