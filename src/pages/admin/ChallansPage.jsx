import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabase';
import { ensureArray } from '@/lib/arrayValidation';
import { useToast } from '@/components/ui/use-toast';

const fmtDate = (d) => { if (!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); };
const todayStr = () => new Date().toISOString().split('T')[0];

const STATUS_COLORS = {
    'open': { bg: 'var(--teal-dim)', color: 'var(--teal)', label: 'Open' },
    'in_transit': { bg: 'rgba(36,104,200,0.10)', color: 'var(--blue)', label: 'In Transit' },
    'received': { bg: 'rgba(30,158,90,0.10)', color: 'var(--green)', label: 'Received' },
    'partial': { bg: 'var(--amber-dim)', color: 'var(--amber)', label: 'Partial Rcvd' },
};

const empty = { challan_number: '', date: todayStr(), party_name: '', process_type: '', fabric_description: '', quantity_sent: '', unit: 'meters', status: 'open', notes: '' };
const inp = { background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 'var(--r-sm)', padding: '8px 10px', fontFamily: 'var(--font)', fontSize: 12, color: 'var(--text)', width: '100%', outline: 'none' };

const ChallansPage = () => {
    const { toast } = useToast();
    const [challans, setChallans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState(empty);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('challans')
                .select('*')
                .order('date', { ascending: false })
                .limit(200);
            if (error) throw error;
            setChallans(ensureArray(data));
        } catch (e) {
            console.error('Challans load:', e);
            setChallans([]);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleSave = async () => {
        if (!form.challan_number || !form.party_name) { toast({ variant: 'destructive', description: 'Challan number and party name required.' }); return; }
        setSaving(true);
        try {
            if (form.id) {
                const { error } = await supabase.from('challans').update(form).eq('id', form.id);
                if (error) throw error;
                toast({ description: '✓ Challan updated.' });
            } else {
                const { error } = await supabase.from('challans').insert([form]);
                if (error) throw error;
                toast({ description: '✓ Challan created.' });
            }
            setModal(null); setForm(empty); load();
        } catch (e) {
            toast({ variant: 'destructive', description: e.message });
        } finally { setSaving(false); }
    };

    const updateStatus = async (id, status) => {
        try {
            await supabase.from('challans').update({ status }).eq('id', id);
            load();
        } catch (e) { console.error(e); }
    };

    const filtered = challans.filter(c => {
        const q = filter.toLowerCase();
        return !q || (c.challan_number || '').toLowerCase().includes(q) || (c.party_name || '').toLowerCase().includes(q) || (c.process_type || '').toLowerCase().includes(q);
    });

    const openCount = challans.filter(c => c.status === 'open' || c.status === 'in_transit').length;
    const totalMeters = challans.filter(c => c.status === 'open' || c.status === 'in_transit').reduce((sum, c) => sum + (parseFloat(c.quantity_sent) || 0), 0);

    const F = ({ label, children, col }) => (
        <div style={{ gridColumn: col }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>{label}</label>
            {children}
        </div>
    );

    return (
        <div className="screen active">
            <Helmet><title>Challans — Shreerang Admin</title></Helmet>
            <div className="topbar">
                <div>
                    <div className="page-title">Challan Tracker</div>
                    <div className="breadcrumb">Operations → Fabric Dispatch Challans · {openCount} open</div>
                </div>
                <div className="topbar-right">
                    <span className="badge borg">{openCount} Open Challans</span>
                    <span className="badge bblue">{totalMeters.toFixed(0)} m at processors</span>
                    <button className="btn btn-gold" onClick={() => { setForm(empty); setModal('new'); }}>+ New Challan</button>
                </div>
            </div>

            <div className="content">
                {/* KPI row */}
                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
                    {[
                        { label: 'Open Challans', value: challans.filter(c => c.status === 'open').length, color: 'var(--teal)' },
                        { label: 'In Transit', value: challans.filter(c => c.status === 'in_transit').length, color: 'var(--blue)' },
                        { label: 'Partial Returned', value: challans.filter(c => c.status === 'partial').length, color: 'var(--amber)' },
                        { label: 'Completed', value: challans.filter(c => c.status === 'received').length, color: 'var(--green)' },
                    ].map((k, i) => (
                        <div className="kpi-card" key={i}>
                            <div className="kpi-label">{k.label}</div>
                            <div className="kpi-value" style={{ color: k.color, fontSize: 28 }}>{k.value}</div>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input placeholder="🔍  Search challan, party, process…" value={filter} onChange={e => setFilter(e.target.value)}
                        style={{ ...inp, width: 320 }} />
                    <button className="btn btn-outline" onClick={load}>↻ Refresh</button>
                </div>

                {/* Table */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Dispatch Register</div>
                    </div>
                    <div className="tbl">
                        <table>
                            <thead>
                                <tr>
                                    <th>Challan No.</th>
                                    <th>Date</th>
                                    <th>Party / Processor</th>
                                    <th>Process</th>
                                    <th>Fabric</th>
                                    <th>Qty Sent</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading challans…</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No challans found. Create your first dispatch →</td></tr>
                                ) : (
                                    filtered.map((c, i) => {
                                        const s = STATUS_COLORS[c.status] || STATUS_COLORS['open'];
                                        return (
                                            <tr key={c.id || i}>
                                                <td><span className="mono" style={{ color: 'var(--teal)', fontWeight: 600 }}>{c.challan_number}</span></td>
                                                <td className="mono">{fmtDate(c.date)}</td>
                                                <td style={{ fontWeight: 500 }}>{c.party_name}</td>
                                                <td><span className="badge bblue">{c.process_type || '—'}</span></td>
                                                <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 180 }}>{c.fabric_description || '—'}</td>
                                                <td className="mono">{c.quantity_sent} {c.unit || 'm'}</td>
                                                <td><span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600 }}>{s.label}</span></td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button className="btn btn-outline btn-sm" onClick={() => { setForm(c); setModal('edit'); }}>Edit</button>
                                                        {c.status === 'open' && <button className="btn btn-sm" style={{ background: 'var(--green)', color: '#fff', padding: '3px 8px', borderRadius: 4, border: 'none', fontSize: 11, cursor: 'pointer' }} onClick={() => updateStatus(c.id, 'received')}>✓ Rcvd</button>}
                                                    </div>
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

            {/* Modal */}
            {modal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,46,43,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setModal(null)}>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 'var(--r)', padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{modal === 'edit' ? 'Edit Challan' : 'New Dispatch Challan'}</div>
                            <button style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <F label="Challan Number *"><input value={form.challan_number} onChange={e => setForm({ ...form, challan_number: e.target.value })} style={inp} placeholder="e.g. CH/2026/001" /></F>
                            <F label="Date *"><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inp} /></F>
                            <F label="Party / Processor *"><input value={form.party_name} onChange={e => setForm({ ...form, party_name: e.target.value })} style={inp} placeholder="e.g. Surbhi Jobwork Surat" /></F>
                            <F label="Process Type">
                                <select value={form.process_type} onChange={e => setForm({ ...form, process_type: e.target.value })} style={inp}>
                                    {['', 'Dyeing', 'Printing', 'Schiffli', 'Hakoba', 'Embroidery', 'Washing', 'Finishing', 'Other'].map(p => <option key={p} value={p}>{p || 'Select process'}</option>)}
                                </select>
                            </F>
                            <F label="Quantity Sent"><input type="number" value={form.quantity_sent} onChange={e => setForm({ ...form, quantity_sent: e.target.value })} style={inp} /></F>
                            <F label="Unit">
                                <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} style={inp}>
                                    {['meters', 'pieces', 'kg'].map(u => <option key={u}>{u}</option>)}
                                </select>
                            </F>
                            <F label="Status">
                                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
                                    <option value="open">Open</option>
                                    <option value="in_transit">In Transit</option>
                                    <option value="partial">Partial Received</option>
                                    <option value="received">Received</option>
                                </select>
                            </F>
                            <F label="Fabric Description" col="1 / -1">
                                <textarea value={form.fabric_description} onChange={e => setForm({ ...form, fabric_description: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="e.g. 58&quot; PC Dyed Schiffli Grey" />
                            </F>
                            <F label="Notes" col="1 / -1">
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} />
                            </F>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn btn-teal" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : modal === 'edit' ? 'Update' : 'Create Challan'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChallansPage;
