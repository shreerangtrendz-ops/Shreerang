import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';
import { ensureArray } from '@/lib/arrayValidation';
import { useToast } from '@/components/ui/use-toast';

const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDate = (d) => { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); };
const monthStartStr = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`; };

const inp = { background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 'var(--r-sm)', padding: '8px 10px', fontFamily: 'var(--font)', fontSize: 12, color: 'var(--text)', width: '100%', outline: 'none' };
const empty = { date: todayStr(), source: 'WhatsApp', category: '', supplier_party: '', product: '', old_price: '', new_price: '', unit: 'per meter', notes: '', status: 'pending' };

const MarketIntelPage = () => {
    const { toast } = useToast();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(empty);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('market_intelligence')
                .select('*')
                .order('date', { ascending: false })
                .limit(200);
            if (error) throw error;
            setEntries(ensureArray(data));
        } catch (e) {
            console.error(e);
            setEntries([]);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const changeAmt = parseFloat(form.new_price) - parseFloat(form.old_price || 0);
            const payload = { ...form, price_change: changeAmt };
            if (form.id) {
                await supabase.from('market_intelligence').update(payload).eq('id', form.id);
                toast({ description: '✓ Entry updated.' });
            } else {
                await supabase.from('market_intelligence').insert([payload]);
                toast({ description: '✓ Entry added.' });
            }
            setModal(null); setForm(empty); load();
        } catch (e) {
            toast({ variant: 'destructive', description: e.message });
        } finally { setSaving(false); }
    };

    const SOURCES = ['WhatsApp Group', 'Direct Supplier', 'Market Visit', 'Competitor Website', 'Trade Show', 'Agent'];
    const CATEGORIES = ['Grey Fabric', 'Dyeing Charges', 'Printing Charges', 'Embroidery (Schiffli)', 'Transportation', 'Competitor Retail Price', 'Other'];

    const F = ({ label, children, col }) => (
        <div style={{ gridColumn: col }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>{label}</label>
            {children}
        </div>
    );

    return (
        <div className="screen active">
            <Helmet><title>Market Intelligence — Shreerang Admin</title></Helmet>
            <div className="topbar">
                <div>
                    <div className="page-title">Market Intelligence</div>
                    <div className="breadcrumb">Operations → Price Monitoring & Competitor Tracking</div>
                </div>
                <div className="topbar-right">
                    <button className="btn btn-gold" onClick={() => { setForm(empty); setModal('new'); }}>+ Log Price Update</button>
                    <button className="btn btn-outline" onClick={load}>↻ Refresh</button>
                </div>
            </div>

            <div className="content">
                <div className="alert a-info">
                    ℹ️ Log competitor prices, WhatsApp group price updates, and market observations here. AI summary from WA messages can be added in the <b>WA Price Alerts</b> module.
                </div>

                {/* Stats */}
                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 16 }}>
                    {[
                        { label: 'Total Entries', value: entries.length, color: 'var(--text)' },
                        { label: 'Price Increases', value: entries.filter(e => (e.price_change || 0) > 0).length, color: 'var(--red)' },
                        { label: 'Price Drops', value: entries.filter(e => (e.price_change || 0) < 0).length, color: 'var(--green)' },
                        { label: 'This Month', value: entries.filter(e => e.date >= monthStartStr()).length, color: 'var(--teal)' },
                    ].map((k, i) => (
                        <div className="kpi-card" key={i}>
                            <div className="kpi-label">{k.label}</div>
                            <div className="kpi-value" style={{ color: k.color, fontSize: 28 }}>{loading ? '—' : k.value}</div>
                        </div>
                    ))}
                </div>

                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Price Intelligence Log</div>
                    </div>
                    <div className="tbl">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Product</th>
                                    <th>Party</th>
                                    <th>Old Price</th>
                                    <th>New Price</th>
                                    <th>Change</th>
                                    <th>Source</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading intelligence data…</td></tr>
                                ) : entries.length === 0 ? (
                                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No entries yet. Log your first market observation →</td></tr>
                                ) : (
                                    entries.map((e, i) => {
                                        const chg = e.price_change || 0;
                                        return (
                                            <tr key={e.id || i}>
                                                <td className="mono">{fmtDate(e.date)}</td>
                                                <td><span className="badge bblue">{e.category || '—'}</span></td>
                                                <td style={{ fontSize: 11 }}>{e.product || '—'}</td>
                                                <td style={{ fontSize: 11, fontWeight: 500 }}>{e.supplier_party || '—'}</td>
                                                <td className="mono">₹{e.old_price || '—'}</td>
                                                <td className="mono" style={{ fontWeight: 700 }}>₹{e.new_price || '—'}</td>
                                                <td className="mono" style={{ color: chg > 0 ? 'var(--red)' : chg < 0 ? 'var(--green)' : 'var(--text-muted)', fontWeight: 700 }}>
                                                    {chg > 0 ? `+₹${chg.toFixed(2)}` : chg < 0 ? `−₹${Math.abs(chg).toFixed(2)}` : '—'}
                                                </td>
                                                <td><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{e.source}</span></td>
                                                <td>
                                                    <button className="btn btn-outline btn-sm" onClick={() => { setForm(e); setModal('edit'); }}>Edit</button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {modal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,46,43,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setModal(null)}>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 'var(--r)', padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Log Price Update</div>
                            <button style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <F label="Date"><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp} /></F>
                            <F label="Source">
                                <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} style={inp}>
                                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </F>
                            <F label="Category">
                                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inp}>
                                    <option value="">Select category</option>
                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </F>
                            <F label="Party / Supplier"><input value={form.supplier_party} onChange={e => setForm({ ...form, supplier_party: e.target.value })} style={inp} /></F>
                            <F label="Product / Fabric" col="1 / -1"><input value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} style={inp} placeholder="e.g. 58&quot; PC Grey Fabric" /></F>
                            <F label="Old Price (₹)"><input type="number" value={form.old_price} onChange={e => setForm({ ...form, old_price: e.target.value })} style={inp} /></F>
                            <F label="New Price (₹)"><input type="number" value={form.new_price} onChange={e => setForm({ ...form, new_price: e.target.value })} style={inp} /></F>
                            <F label="Notes" col="1 / -1">
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Additional context, seasonal note, demand observation…" />
                            </F>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn btn-teal" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Entry'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketIntelPage;
