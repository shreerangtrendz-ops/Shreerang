import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AREAS = ['Mumbai/MMR', 'Gujarat - Surat', 'Gujarat - Ahmedabad', 'Rajasthan - Jaipur', 'Rajasthan - Jodhpur', 'Delhi NCR', 'West Bengal', 'Madhya Pradesh', 'Pan-India'];
const TYPES = ['Wholesale', 'Retail', 'Agent'];
const TERMS = ['Advance', 'Against Delivery', '7 Days', '15 Days', '30 Days', '60 Days'];
const PAGE_SIZE = 50;

const empty = { name: '', firm_name: '', phone: '', email: '', agent_name: '', billing_address: '', city: '', state: '', area: '', customer_type: 'Wholesale', payment_terms: 'Against Delivery', credit_limit: '', language_preference: 'Hindi', notes: '' };
const inp = { background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 'var(--r-sm)', padding: '8px 10px', fontFamily: 'var(--font)', fontSize: 12, color: 'var(--text)', width: '100%', outline: 'none' };

const CustomerMasterPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Source tab: 'all' shows all customers table (Tally + CRM), 'crm' shows CRM-created only
  const [sourceTab, setSourceTab] = useState('all');
  const [customers, setCustomers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [page, setPage] = useState(0);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let countQuery = supabase.from('customers').select('*', { count: 'exact', head: true });
      let dataQuery = supabase.from('customers').select('id, name, firm_name, phone, email, area, city, customer_type, agent_name, payment_terms, business_type, source, created_at').order('created_at', { ascending: false }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Filter by source tab
      if (sourceTab === 'crm') {
        countQuery = countQuery.eq('source', 'crm');
        dataQuery = dataQuery.eq('source', 'crm');
      }

      // Search filter
      if (search) {
        const searchFilter = `name.ilike.%${search}%,firm_name.ilike.%${search}%,phone.ilike.%${search}%,city.ilike.%${search}%`;
        countQuery = countQuery.or(searchFilter);
        dataQuery = dataQuery.or(searchFilter);
      }

      const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery]);
      if (error) throw error;
      setTotalCount(count || 0);
      setCustomers(data || []);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', description: 'Failed to load customers: ' + e.message });
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [search, areaFilter, page, sourceTab]);

  useEffect(() => { setPage(0); }, [search, sourceTab]);
  useEffect(() => { load(); }, [load]);

  const handleSearch = () => { setSearch(searchInput); };

  const handleSave = async () => {
    if (!form.name || !form.phone) {
      toast({ variant: 'destructive', description: 'Name and phone are required.' });
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        const { error } = await supabase.from('customers').update({ ...form, updated_at: new Date().toISOString() }).eq('id', form.id);
        if (error) throw error;
        toast({ description: '✓ Customer updated.' });
      } else {
        const { error } = await supabase.from('customers').insert([{ ...form, source: 'crm', created_at: new Date().toISOString() }]);
        if (error) throw error;
        toast({ description: '✓ Customer created.' });
      }
      setModal(null);
      setForm(empty);
      load();
    } catch (e) {
      toast({ variant: 'destructive', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const typeBadge = (t) => {
    const styles = { Wholesale: { background: '#e8fff4', color: '#1E9E5A' }, Agent: { background: '#FFF8E8', color: '#D4920A' }, Retail: { background: '#EEF6FF', color: '#2468C8' } };
    const s = styles[t] || { background: '#f1f5f9', color: '#64748b' };
    return <span style={{ ...s, padding: '2px 7px', borderRadius: 100, fontSize: 10, fontWeight: 700 }}>{t || 'Unknown'}</span>;
  };

  const sourceBadge = (src) => {
    if (src === 'crm') return <span style={{ background: '#EEF6FF', color: '#2468C8', padding: '1px 6px', borderRadius: 100, fontSize: 10, fontWeight: 600 }}>CRM</span>;
    if (src === 'tally') return <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '1px 6px', borderRadius: 100, fontSize: 10, fontWeight: 600 }}>Tally</span>;
    return <span style={{ background: '#f8f8f8', color: '#888', padding: '1px 6px', borderRadius: 100, fontSize: 10, fontWeight: 600 }}>{src || 'System'}</span>;
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
          <div className="breadcrumb">CRM → Unified Customer Database · {totalCount.toLocaleString('en-IN')} total customers</div>
        </div>
        <div className="topbar-right">
          <button className="btn btn-gold" onClick={() => { setForm(empty); setModal('new'); }}>+ Add Customer</button>
          <button className="btn btn-outline" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      <div className="content">
        {/* Source Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: '#fff', borderRadius: 10, border: '1px solid rgba(43,168,152,.15)', overflow: 'hidden', alignSelf: 'flex-start', width: 'fit-content' }}>
          {[
            { key: 'all', label: '🏢 All Customers', desc: 'Tally + CRM' },
            { key: 'crm', label: '👤 CRM Only', desc: 'Manually added' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setSourceTab(tab.key)} style={{ padding: '10px 20px', border: 'none', borderRight: '1px solid rgba(43,168,152,.15)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 13, fontWeight: sourceTab === tab.key ? 700 : 500, color: sourceTab === tab.key ? '#0B2E2B' : '#6A9B95', background: sourceTab === tab.key ? 'linear-gradient(135deg,#E8FFF4,#D4F7EF)' : '#fff', transition: 'all .15s' }}>
              {tab.label}
              <span style={{ display: 'block', fontSize: 10, color: sourceTab === tab.key ? '#2BA898' : '#94a3b8', fontWeight: 400 }}>{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* Stats Bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total in DB', value: totalCount.toLocaleString('en-IN'), color: '#0B2E2B', icon: '👥' },
            { label: 'This Page', value: customers.length, color: '#2468C8', icon: '📄' },
            { label: 'Page', value: `${page + 1} / ${totalPages || 1}`, color: '#6E44C8', icon: '📑' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(43,168,152,.12)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: '#6A9B95', fontWeight: 600 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '12px 16px' }}>
            <input
              placeholder="🔍 Search name, firm, phone, city…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{ ...inp, width: 300 }}
            />
            <button className="btn btn-teal" onClick={handleSearch}>Search</button>
            <button className="btn btn-outline" onClick={() => { setSearchInput(''); setSearch(''); setAreaFilter(''); setPage(0); }}>Clear</button>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{totalCount.toLocaleString('en-IN')} results</span>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {sourceTab === 'all' ? '🏢 All Customers (Tally + CRM)' : '👤 CRM Customers'}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {sourceTab === 'all' && (
                <span style={{ fontSize: 11, color: '#6A9B95', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '3px 8px' }}>
                  ✅ {totalCount.toLocaleString('en-IN')} Tally-synced customers visible
                </span>
              )}
              <span className="badge bblue">{totalCount.toLocaleString('en-IN')} customers</span>
            </div>
          </div>
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name / Firm</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Type</th>
                  <th>Source</th>
                  <th>Agent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading customers…</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    {search ? `No customers match "${search}"` : 'No customers found. Add your first customer →'}
                  </td></tr>
                ) : (
                  customers.map((c, i) => (
                    <tr key={c.id || i}>
                      <td className="mono" style={{ color: 'var(--text-dim)' }}>{page * PAGE_SIZE + i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 12 }}>{c.name || '—'}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{c.firm_name || c.company_name || ''}</div>
                      </td>
                      <td className="mono">{c.phone || '—'}</td>
                      <td><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.city || c.area || '—'}</span></td>
                      <td>{typeBadge(c.customer_type || c.business_type)}</td>
                      <td>{sourceBadge(c.source)}</td>
                      <td style={{ fontSize: 11 }}>{c.agent_name || '—'}</td>
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

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid rgba(43,168,152,.1)', fontSize: 12, color: '#6A9B95' }}>
            <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString('en-IN')} customers</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(0)}>«</button>
              <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>← Prev</button>
              <span style={{ padding: '4px 10px', background: 'var(--teal-dim)', borderRadius: 6, fontWeight: 700, color: 'var(--teal)' }}>
                {page + 1} / {totalPages || 1}
              </span>
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
              <button className="btn btn-outline btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</button>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,46,43,0.6)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setModal(null)}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border-teal)', borderRadius: 'var(--r)', padding: 28, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{modal === 'edit' ? 'Edit Customer' : 'Add New CRM Customer'}</div>
              <button style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setModal(null)}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="Full Name *"><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></F>
              <F label="Firm Name"><input value={form.firm_name || ''} onChange={e => setForm({ ...form, firm_name: e.target.value })} style={inp} /></F>
              <F label="Mobile *"><input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} style={inp} /></F>
              <F label="Email"><input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} /></F>
              <F label="Agent Name"><input value={form.agent_name || ''} onChange={e => setForm({ ...form, agent_name: e.target.value })} style={inp} /></F>
              <F label="Customer Type">
                <select value={form.customer_type || 'Wholesale'} onChange={e => setForm({ ...form, customer_type: e.target.value })} style={inp}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </F>
              <F label="Area / Region">
                <select value={form.area || ''} onChange={e => setForm({ ...form, area: e.target.value })} style={inp}>
                  <option value="">Select Area</option>
                  {AREAS.map(a => <option key={a}>{a}</option>)}
                </select>
              </F>
              <F label="City"><input value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} style={inp} /></F>
              <F label="State"><input value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} style={inp} /></F>
              <F label="Payment Terms">
                <select value={form.payment_terms || 'Against Delivery'} onChange={e => setForm({ ...form, payment_terms: e.target.value })} style={inp}>
                  {TERMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </F>
              <F label="Credit Limit (₹)"><input type="number" value={form.credit_limit || ''} onChange={e => setForm({ ...form, credit_limit: e.target.value })} style={inp} /></F>
              <F label="Language">
                <select value={form.language_preference || 'Hindi'} onChange={e => setForm({ ...form, language_preference: e.target.value })} style={inp}>
                  {['Hindi', 'Gujarati', 'English', 'Marathi'].map(l => <option key={l}>{l}</option>)}
                </select>
              </F>
              <F label="Billing Address" col="1 / -1">
                <textarea value={form.billing_address || ''} onChange={e => setForm({ ...form, billing_address: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} />
              </F>
              <F label="Notes" col="1 / -1">
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Product preferences, requirements, special instructions…" />
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
