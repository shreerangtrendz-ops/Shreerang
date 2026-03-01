import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════
// CUSTOMER 360° — Full customer view
// Orders · Balance · Visits · WhatsApp · Payments
// ═══════════════════════════════════════════════════

const Badge = ({ children, color = 'gray' }) => {
  const c = { green:'bg-green-100 text-green-800', red:'bg-red-100 text-red-800', yellow:'bg-yellow-100 text-yellow-800', blue:'bg-blue-100 text-blue-800', gray:'bg-gray-100 text-gray-700', purple:'bg-purple-100 text-purple-800', orange:'bg-orange-100 text-orange-800' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c[color]}`}>{children}</span>;
};
const Card = ({ children, className='' }) => <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>{children}</div>;
const StatBox = ({ icon, label, value, sub, color='blue' }) => {
  const colors = { blue:'text-blue-600', green:'text-green-600', red:'text-red-600', yellow:'text-yellow-600', purple:'text-purple-600' };
  return (
    <Card className="p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`text-xl font-black ${colors[color]}`}>{value}</div>
      <div className="text-xs font-medium text-gray-700">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </Card>
  );
};

const fmt = (n) => n ? '₹' + Number(n).toLocaleString('en-IN') : '₹0';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const Customer360Page = () => {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    supabase.from('customers').select('id,name,company_name,city,state,phone,status,tier').order('name')
      .then(({ data }) => setCustomers(data || []));
  }, []);

  const filtered = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const loadCustomer = useCallback(async (cust) => {
    setSelected(cust);
    setLoading(true);
    setData(null);
    setTab('overview');
    try {
      const [ordersRes, visitsRes, paymentsRes, convRes, reqRes] = await Promise.all([
        supabase.from('bulk_bills').select('*').eq('customer_id', cust.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('field_visits').select('*').eq('customer_id', cust.id).order('visit_date', { ascending: false }).limit(20),
        supabase.from('payment_reminders').select('*').eq('customer_id', cust.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('conversations').select('*').eq('customer_id', cust.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('customer_requirements').select('*').eq('customer_id', cust.id).order('created_at', { ascending: false }).limit(10),
      ]);
      // Also load full customer profile
      const { data: profile } = await supabase.from('customers').select('*').eq('id', cust.id).single();

      const orders = ordersRes.data || [];
      const visits = visitsRes.data || [];
      const payments = paymentsRes.data || [];
      const convs = convRes.data || [];
      const reqs = reqRes.data || [];

      const totalOrdered = orders.reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
      const totalPaid = orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (parseFloat(o.total_amount) || 0), 0);
      const outstanding = totalOrdered - totalPaid;
      const lastOrder = orders[0];
      const lastVisit = visits[0];
      const daysSinceVisit = lastVisit ? Math.round((Date.now() - new Date(lastVisit.visit_date)) / 86400000) : null;
      const pendingCommitted = visits.reduce((s, v) => s + (parseFloat(v.payment_committed_amount) || 0), 0);

      setData({ profile: profile || cust, orders, visits, payments, convs, reqs, totalOrdered, totalPaid, outstanding, lastOrder, lastVisit, daysSinceVisit, pendingCommitted });
    } catch(err) { console.error(err); }
    setLoading(false);
  }, []);

  const TABS = ['overview','orders','visits','payments','whatsapp','requirements'];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left: Customer List */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-black text-gray-900">🏦 Customer 360°</h1>
          <p className="text-xs text-gray-500 mt-0.5">Full view — orders, visits, balance, WA</p>
        </div>
        <div className="p-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search customers..."
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => loadCustomer(c)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-blue-50 transition-colors ${selected?.id === c.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
            >
              <div className="font-semibold text-sm text-gray-900 truncate">{c.name}</div>
              {c.company_name && <div className="text-xs text-gray-500 truncate">{c.company_name}</div>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">{c.city}</span>
                {c.status === 'active' ? <Badge color="green">Active</Badge> : <Badge color="red">{c.status}</Badge>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Detail */}
      <div className="flex-1 p-6 overflow-y-auto">
        {!selected && (
          <div className="flex items-center justify-center h-96 text-gray-400">
            <div className="text-center">
              <div className="text-6xl mb-4">🏦</div>
              <p className="text-lg font-medium">Select a customer to view 360° profile</p>
            </div>
          </div>
        )}

        {selected && loading && (
          <div className="flex items-center justify-center h-96 text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-3 animate-spin">⏳</div>
              <p>Loading customer data...</p>
            </div>
          </div>
        )}

        {selected && data && !loading && (
          <div className="space-y-5">
            {/* Profile Header */}
            <Card className="p-5">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-black text-gray-900">{data.profile.name}</h2>
                    {data.profile.tier && <Badge color="purple">{data.profile.tier}</Badge>}
                    {data.profile.is_restricted && <Badge color="red">🚫 Restricted</Badge>}
                    {data.profile.status !== 'active' && <Badge color="red">{data.profile.status}</Badge>}
                  </div>
                  <p className="text-gray-600 mt-1">{data.profile.company_name}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                    <span>📍 {data.profile.city}, {data.profile.state}</span>
                    <span>📞 {data.profile.phone}</span>
                    {data.profile.email && <span>✉️ {data.profile.email}</span>}
                    <span>💳 {data.profile.payment_terms}</span>
                    <span>📅 Credit: {data.profile.credit_days}d</span>
                  </div>
                  {data.profile.gst_number && <p className="text-xs text-gray-400 mt-1">GST: {data.profile.gst_number}</p>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {data.profile.phone && (
                    <a href={`https://wa.me/${data.profile.phone?.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600">
                      💬 WhatsApp
                    </a>
                  )}
                  <a href={`/admin/field-visits`}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
                    📍 Log Visit
                  </a>
                </div>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatBox icon="🛒" label="Total Orders" value={data.orders.length} color="blue" />
              <StatBox icon="💰" label="Total Billed" value={fmt(data.totalOrdered)} color="blue" />
              <StatBox icon="✅" label="Total Paid" value={fmt(data.totalPaid)} color="green" />
              <StatBox icon="⚠️" label="Outstanding" value={fmt(data.outstanding)} color={data.outstanding > 0 ? 'red' : 'green'} />
              <StatBox icon="📅" label="Last Visit" value={data.daysSinceVisit !== null ? data.daysSinceVisit + 'd ago' : 'Never'} color={data.daysSinceVisit > 30 ? 'red' : 'green'} />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto">
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap ${tab===t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {t === 'overview' ? '📊 Overview' : t === 'orders' ? '🛒 Orders ('+ data.orders.length +')' : t === 'visits' ? '📍 Visits ('+ data.visits.length +')' : t === 'payments' ? '💰 Payments' : t === 'whatsapp' ? '💬 WhatsApp' : '📋 Requirements'}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {tab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <p className="text-sm font-bold text-gray-700 mb-3">📊 Financial Summary</p>
                  <div className="space-y-2">
                    {[
                      ['Total Ordered', fmt(data.totalOrdered)],
                      ['Total Paid', fmt(data.totalPaid)],
                      ['Outstanding Balance', fmt(data.outstanding)],
                      ['Committed (field)', fmt(data.pendingCommitted)],
                      ['Credit Limit', fmt(data.profile.credit_limit)],
                    ].map(([k,v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-gray-600">{k}</span>
                        <span className="font-semibold text-gray-900">{v}</span>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="text-sm font-bold text-gray-700 mb-3">📋 Account Details</p>
                  <div className="space-y-2">
                    {[
                      ['Payment Terms', data.profile.payment_terms],
                      ['Credit Days', data.profile.credit_days + ' days'],
                      ['Tier', data.profile.tier || 'Standard'],
                      ['Source', data.profile.source || '—'],
                      ['Business Type', data.profile.business_type || '—'],
                      ['Language', data.profile.language_preference || 'English'],
                    ].map(([k,v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-gray-600">{k}</span>
                        <span className="font-semibold text-gray-900">{v}</span>
                      </div>
                    ))}
                  </div>
                </Card>
                {data.profile.notes && (
                  <Card className="p-4 md:col-span-2">
                    <p className="text-sm font-bold text-gray-700 mb-2">📝 Notes</p>
                    <p className="text-sm text-gray-600">{data.profile.notes}</p>
                  </Card>
                )}
                {data.reqs.length > 0 && (
                  <Card className="p-4 md:col-span-2">
                    <p className="text-sm font-bold text-gray-700 mb-3">🎯 Recent Requirements</p>
                    <div className="space-y-2">
                      {data.reqs.slice(0,3).map(r => (
                        <div key={r.id} className="flex items-start gap-2 text-sm">
                          <span className="text-blue-500 mt-0.5 flex-shrink-0">→</span>
                          <span className="text-gray-700">{r.requirement || r.description || JSON.stringify(r).substring(0,100)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Tab: Orders */}
            {tab === 'orders' && (
              <div className="space-y-3">
                {data.orders.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">No orders found</div>
                ) : data.orders.map(o => (
                  <Card key={o.id} className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900">{o.bill_number || o.invoice_number || o.id?.substring(0,8)}</span>
                          <Badge color={o.payment_status === 'paid' ? 'green' : o.payment_status === 'partial' ? 'yellow' : 'red'}>
                            {o.payment_status || 'pending'}
                          </Badge>
                          {o.fabric_type && <Badge color="blue">{o.fabric_type}</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{fmtDate(o.bill_date || o.created_at)} · {o.quantity ? o.quantity + 'm' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{fmt(o.total_amount)}</p>
                        {o.due_date && <p className="text-xs text-gray-400">Due: {fmtDate(o.due_date)}</p>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Tab: Visits */}
            {tab === 'visits' && (
              <div className="space-y-3">
                {data.visits.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">No visits recorded yet</div>
                ) : data.visits.map(v => (
                  <Card key={v.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge color={v.visit_type === 'payment' ? 'green' : v.visit_type === 'sales' ? 'blue' : 'purple'}>{v.visit_type}</Badge>
                          <Badge color="gray">{v.status?.replace(/_/g,' ')}</Badge>
                          {v.is_outstation && <Badge color="orange">📍 Outstation</Badge>}
                        </div>
                        <p className="text-sm text-gray-700">{v.raw_notes?.substring(0,150)}</p>
                        {v.customer_requirement && <p className="text-xs text-purple-700 mt-1">📦 {v.customer_requirement}</p>}
                        {v.payment_committed_amount && (
                          <p className="text-xs text-green-700 mt-1">💰 Committed: {fmt(v.payment_committed_amount)} by {fmtDate(v.payment_committed_date)}</p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                          <span>👤 {v.salesperson_name}</span>
                          <span>📅 {fmtDate(v.visit_date)}</span>
                          {v.gps_link && <a href={v.gps_link} target="_blank" rel="noopener noreferrer" className="text-blue-500">🗺 Location</a>}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Tab: Payments */}
            {tab === 'payments' && (
              <div className="space-y-3">
                {data.payments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>No payment reminders logged</p>
                    <p className="text-sm mt-2">Outstanding balance: <span className="font-bold text-red-600">{fmt(data.outstanding)}</span></p>
                  </div>
                ) : data.payments.map(p => (
                  <Card key={p.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm">{fmt(p.amount || p.outstanding_amount)}</p>
                        <p className="text-xs text-gray-500">{p.notes || p.message || 'Payment reminder'}</p>
                        <p className="text-xs text-gray-400 mt-1">{fmtDate(p.due_date || p.created_at)}</p>
                      </div>
                      <Badge color={p.status === 'paid' ? 'green' : p.status === 'overdue' ? 'red' : 'yellow'}>{p.status || 'pending'}</Badge>
                    </div>
                  </Card>
                ))}
                {/* Outstanding summary */}
                <Card className="p-4 bg-red-50 border-red-200">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-red-800">Total Outstanding</span>
                    <span className="text-2xl font-black text-red-600">{fmt(data.outstanding)}</span>
                  </div>
                </Card>
              </div>
            )}

            {/* Tab: WhatsApp */}
            {tab === 'whatsapp' && (
              <div className="space-y-3">
                {data.convs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">No WhatsApp conversations found</div>
                ) : data.convs.map(c => (
                  <Card key={c.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">💬</div>
                      <div>
                        <p className="text-sm text-gray-700">{c.last_message || c.message || c.content || JSON.stringify(c).substring(0,100)}</p>
                        <p className="text-xs text-gray-400 mt-1">{fmtDate(c.created_at || c.last_message_at)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
                {data.profile.phone && (
                  <a href={`https://wa.me/${data.profile.phone.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer"
                    className="block w-full py-3 bg-green-500 text-white text-center rounded-xl font-semibold hover:bg-green-600">
                    💬 Open WhatsApp Chat
                  </a>
                )}
              </div>
            )}

            {/* Tab: Requirements */}
            {tab === 'requirements' && (
              <div className="space-y-3">
                {data.reqs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">No requirements recorded</div>
                ) : data.reqs.map(r => (
                  <Card key={r.id} className="p-4">
                    <p className="text-sm text-gray-700">{r.requirement || r.description || r.notes || JSON.stringify(r).substring(0,200)}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {r.fabric_type && <Badge color="blue">{r.fabric_type}</Badge>}
                      {r.status && <Badge color="gray">{r.status}</Badge>}
                      <span className="text-xs text-gray-400">{fmtDate(r.created_at)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Customer360Page;
