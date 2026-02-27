import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';
import { ensureArray } from '@/lib/arrayValidation';
import { useToast } from '@/components/ui/use-toast';

const DesignVelocityPage = () => {
    const { toast } = useToast();
    const [designs, setDesigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('order_count');
    const [filter, setFilter] = useState('');
    const [period, setPeriod] = useState('30');

    const load = async () => {
        setLoading(true);
        try {
            // Fetch designs with order count aggregation
            const { data: designData, error } = await supabase
                .from('design_images')
                .select('id, design_number, description, fabric_type, created_at, is_active')
                .order('created_at', { ascending: false })
                .limit(500);
            if (error) throw error;

            const designs = ensureArray(designData);
            const since = new Date();
            since.setDate(since.getDate() - parseInt(period));

            // Fetch order line items to count velocity
            const { data: orderLines } = await supabase
                .from('order_items')
                .select('design_number, quantity')
                .gte('created_at', since.toISOString());

            const velocityMap = {};
            ensureArray(orderLines).forEach(ol => {
                if (!ol.design_number) return;
                velocityMap[ol.design_number] = (velocityMap[ol.design_number] || 0) + 1;
            });

            const enriched = designs.map(d => ({
                ...d,
                order_count: velocityMap[d.design_number] || 0,
                velocity: velocityMap[d.design_number] > 5 ? 'hot' : velocityMap[d.design_number] > 2 ? 'warm' : velocityMap[d.design_number] > 0 ? 'slow' : 'dead'
            })).sort((a, b) => b[sortBy] - a[sortBy]);

            setDesigns(enriched);
        } catch (e) {
            console.error(e);
            setDesigns([]);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [period]);

    const filtered = designs.filter(d => {
        const q = filter.toLowerCase();
        return !q || (d.design_number || '').toLowerCase().includes(q) || (d.fabric_type || '').toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q);
    });

    const sorted = [...filtered].sort((a, b) => b[sortBy] - a[sortBy]);
    const hot = sorted.filter(d => d.velocity === 'hot').length;
    const warm = sorted.filter(d => d.velocity === 'warm').length;
    const dead = sorted.filter(d => d.velocity === 'dead').length;

    const velBadge = (v) => {
        if (v === 'hot') return <span style={{ background: 'rgba(212,120,10,0.15)', color: 'var(--amber)', border: '1px solid var(--border-gold)', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>🔥 Hot</span>;
        if (v === 'warm') return <span style={{ background: 'var(--teal-dim)', color: 'var(--teal)', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>📈 Warm</span>;
        if (v === 'slow') return <span style={{ background: 'var(--magenta-dim)', color: 'var(--magenta)', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>📉 Slow</span>;
        return <span style={{ background: 'var(--surface2)', color: 'var(--text-dim)', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>💤 Inactive</span>;
    };

    return (
        <div className="screen active">
            <Helmet><title>Design Velocity — Shreerang Admin</title></Helmet>
            <div className="topbar">
                <div>
                    <div className="page-title">Design Velocity</div>
                    <div className="breadcrumb">Design Catalogue → Hot vs Slow Movers</div>
                </div>
                <div className="topbar-right">
                    <select value={period} onChange={e => { setPeriod(e.target.value); }} style={{ background: 'var(--surface2)', border: '1px solid var(--border-teal)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font)' }}>
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                        <option value="365">Last 12 months</option>
                    </select>
                    <button className="btn btn-teal" onClick={load}>↻ Refresh</button>
                </div>
            </div>

            <div className="content">
                {/* KPIs */}
                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
                    {[
                        { label: 'Total Designs', value: designs.length, color: 'var(--text)' },
                        { label: '🔥 Hot Movers', value: hot, color: 'var(--amber)' },
                        { label: '📈 Warm', value: warm, color: 'var(--teal)' },
                        { label: '💤 Inactive', value: dead, color: 'var(--text-dim)' },
                    ].map((k, i) => (
                        <div className="kpi-card" key={i}>
                            <div className="kpi-label">{k.label}</div>
                            <div className="kpi-value" style={{ color: k.color, fontSize: 28 }}>{loading ? '—' : k.value}</div>
                        </div>
                    ))}
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input placeholder="🔍  Filter by design no, fabric…" value={filter} onChange={e => setFilter(e.target.value)}
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 6, padding: '7px 10px', fontFamily: 'var(--font)', fontSize: 12, color: 'var(--text)', width: 260, outline: 'none' }} />
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: 'var(--surface2)', border: '1px solid var(--border-teal)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font)' }}>
                        <option value="order_count">Sort by Orders</option>
                    </select>
                </div>

                {/* Table */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Design Performance</div>
                        <span className="badge bblue">{sorted.length} designs</span>
                    </div>
                    <div className="tbl">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Design No.</th>
                                    <th>Fabric Type</th>
                                    <th>Description</th>
                                    <th>Orders ({period}d)</th>
                                    <th>Velocity</th>
                                    <th>Added</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Calculating velocity…</td></tr>
                                ) : sorted.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No design data found. Upload designs first.</td></tr>
                                ) : (
                                    sorted.map((d, i) => (
                                        <tr key={d.id || i}>
                                            <td className="mono" style={{ color: 'var(--text-dim)' }}>{i + 1}</td>
                                            <td><span className="mono" style={{ color: 'var(--teal)', fontWeight: 700 }}>{d.design_number || '—'}</span></td>
                                            <td><span className="badge bblue">{d.fabric_type || '—'}</span></td>
                                            <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200 }}>{d.description || '—'}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ width: Math.min(80, d.order_count * 8), height: 6, background: d.order_count > 5 ? 'var(--amber)' : d.order_count > 0 ? 'var(--teal)' : 'var(--surface3)', borderRadius: 3 }} />
                                                    <span className="mono">{d.order_count}</span>
                                                </div>
                                            </td>
                                            <td>{velBadge(d.velocity)}</td>
                                            <td className="mono" style={{ fontSize: 10 }}>{d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN') : '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesignVelocityPage;
