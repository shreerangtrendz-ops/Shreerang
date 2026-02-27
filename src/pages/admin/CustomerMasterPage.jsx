import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CustomerService } from '@/services/CustomerService';
import { ensureArray } from '@/lib/arrayValidation';
import { useToast } from '@/components/ui/use-toast';

const AREAS = ['Mumbai/MMR', 'Gujarat - Surat', 'Gujarat - Ahmedabad', 'Rajasthan - Jaipur', 'Rajasthan - Jodhpur', 'Delhi NCR', 'West Bengal', 'Madhya Pradesh', 'Pan-India'];
const TYPES = ['Wholesale', 'Retail', 'Agent'];
const TERMS = ['Advance', 'Against Delivery', '7 Days', '15 Days', '30 Days', '60 Days'];

const empty = { name: '', firm_name: '', phone: '', email: '', agent_name: '', billing_address: '', city: '', state: '', area: '', customer_type: 'Wholesale', payment_terms: 'Against Delivery', credit_limit: '', language_preference: 'Hindi', notes: '' };

const inp = {
    background: 'var(--surface)', border: '1px solid var(--border-teal)',
    borderRadius: 'var(--r-sm)', padding: '8px 10px',
    fontFamily: 'var(--font)', fontSize: 12, color: 'var(--text)', width: '100%', outline: 'none'
};

const CustomerMasterPage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [areaFilter, setAreaFilter] = useState('');
    const [modal, setModal] = useState(null); // null | 'new' | 'edit'
    const [form, setForm] = useState(empty);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await CustomerService.listCustomers({ search });
            setCustomers(ensureArray(data));
        } catch (e) {
            console.error(e);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { load(); }, []);

    const filtered = customers.filter(c => {
        const q = search.toLowerCase();
        const matchSearch = !q || (c.name || '').toLowerCase().includes(q) || (c.firm_name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
        const matchArea = !areaFilter || c.area === areaFilter;
        return matchSearch && matchArea;
    });

    const handleSave = async () => {
        if (!form.name || !form.phone) { toast({ variant: 'destructive', description: 'Name and phone are required.' }); return; }
        setSaving(true);
        try {
            if (form.id) {
                await CustomerService.updateCustomer(form.id, form);
                toast({ description: '✓ Customer updated.' });
            } else {
                await CustomerService.createCustomer(form);
                toast({ description: '✓ Customer created.' });
            }
            setModal(null); setForm(empty); load();
        } catch (e) {
            toast({ variant: 'destructive', description: e.message });
        } finally { setSaving(false); }
    };

    const typeBadge = (t) => {
        if (t === 'Wholesale') return <span className="badge bgreen">Wholesale</span>;
        if (t === 'Agent') return <span className="badge bgold">Agent</span>;
        return <span className="badge bblue">Retail</span>;
    };

    const F = ({ label, children, col }) => (
        <div style={{ gridColumn: col }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>{label}</label>
            {children}
        </div>
    );

    return (
        <div className="screen active">
            <Helmet><title>Customer Master — Shreerang Admin</title></Helmet>
            <div className="topbar">
                <div>
                    <div className="page-title">Customer Master</div>
                    <div className="breadcrumb">CRM → Customer Database · {customers.length} customers</div>
                </div>
                <div className="topbar-right">
                    <button className="btn btn-gold" onClick={() => { setForm(empty); setModal('new'); }}>+ Add Customer</button>
                    <button className="btn btn-outline" onClick={load}>↻ Refresh</button>
                </div>
            </div>

            <div className="content">
                {/* Filters */}
                <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px' }}>
                        <input placeholder="🔍  Search name, firm, phone…" value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && load()}
                            style={{ ...inp, width: 280 }} />
                        <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} style={{ ...inp, width: 200 }}>
                            <option value="">All Areas</option>
                            {AREAS.map(a => <option key={a}>{a}</option>)}
                        </select>
                        <button className="btn btn-teal" onClick={load}>Search</button>
                        <button className="btn btn-outline" onClick={() => { setSearch(''); setAreaFilter(''); setTimeout(load, 50); }}>Clear</button>
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{filtered.length} results</span>
                    </div>
                </div>

                {/* Table */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Customer Database</div>
                        <span className="badge bblue">{filtered.length} customers</span>
                    </div>
                    <div className="tbl">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Name / Firm</th>
                                    <th>Phone</th>
                                    <th>Area</th>
                                    <th>Type</th>
                                    <th>Agent</th>
                                    <th>Pay Terms</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading customers…</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No customers found. Add your first customer →</td></tr>
                                ) : (
                                    filtered.map((c, i) => (
                                        <tr key={c.id || i}>
                                            <td className="mono" style={{ color: 'var(--text-dim)' }}>{i + 1}</td>
                                            <td>
                                                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 12 }}>{c.name || '—'}</div>
                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.firm_name || ''}</div>
                                            </td>
                                            <td className="mono">{c.phone || '—'}</td>
                                            <td><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.area || c.city || '—'}</span></td>
                                            <td>{typeBadge(c.customer_type)}</td>
                                            <td style={{ fontSize: 11 }}>{c.agent_name || '—'}</td>
                                            <td><span className="badge" style={{ background: 'var(--teal-dim)', color: 'var(--teal)' }}>{c.payment_terms || '—'}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-outline btn-sm" onClick={() => { setForm(c); setModal('edit'); }}>Edit</button>
                                                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/admin/customer-360?id=${c.id}`)}>360°</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {modal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,46,43,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setModal(null)}>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 'var(--r)', padding: 28, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{modal === 'edit' ? 'Edit Customer' : 'Add New Customer'}</div>
                            <button style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setModal(null)}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <F label="Full Name *"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></F>
                            <F label="Firm Name"><input value={form.firm_name} onChange={e => setForm({ ...form, firm_name: e.target.value })} style={inp} /></F>
                            <F label="Mobile *"><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></F>
                            <F label="Email"><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} /></F>
                            <F label="Agent Name"><input value={form.agent_name} onChange={e => setForm({ ...form, agent_name: e.target.value })} style={inp} /></F>
                            <F label="Customer Type">
                                <select value={form.customer_type} onChange={e => setForm({ ...form, customer_type: e.target.value })} style={inp}>
                                    {TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </F>
                            <F label="Area / Region">
                                <select value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} style={inp}>
                                    <option value="">Select Area</option>
                                    {AREAS.map(a => <option key={a}>{a}</option>)}
                                </select>
                            </F>
                            <F label="City"><input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} style={inp} /></F>
                            <F label="State"><input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} style={inp} /></F>
                            <F label="Payment Terms">
                                <select value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} style={inp}>
                                    {TERMS.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </F>
                            <F label="Credit Limit (₹)"><input type="number" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })} style={inp} /></F>
                            <F label="Language">
                                <select value={form.language_preference} onChange={e => setForm({ ...form, language_preference: e.target.value })} style={inp}>
                                    {['Hindi', 'Gujarati', 'English', 'Marathi'].map(l => <option key={l}>{l}</option>)}
                                </select>
                            </F>
                            <F label="Billing Address" col="1 / -1">
                                <textarea value={form.billing_address} onChange={e => setForm({ ...form, billing_address: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} />
                            </F>
                            <F label="Notes" col="1 / -1">
                                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Product preferences, requirements, special instructions…" />
                            </F>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn btn-teal" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : modal === 'edit' ? 'Update Customer' : 'Create Customer'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerMasterPage;
