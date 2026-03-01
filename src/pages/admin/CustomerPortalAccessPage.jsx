import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ACCESS_CATEGORIES = [
  { id: 'catalogue', label: 'Product Catalogue', icon: '📁', desc: 'View full fabric catalogue' },
  { id: 'pricing', label: 'Pricing Access', icon: '💰', desc: 'View wholesale prices' },
  { id: 'orders', label: 'Order History', icon: '📦', desc: 'View past orders' },
  { id: 'tracking', label: 'Order Tracking', icon: '🚚', desc: 'Track current orders' },
  { id: 'invoices', label: 'Invoices', icon: '🧾', desc: 'Download invoices' },
  { id: 'ledger', label: 'Account Ledger', icon: '📒', desc: 'View payment ledger' },
  { id: 'new_order', label: 'Place Orders', icon: '🛒', desc: 'Place new orders online' },
  { id: 'samples', label: 'Sample Requests', icon: '🧵', desc: 'Request fabric samples' },
];

export default function CustomerPortalAccessPage() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [access, setAccess] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({ total: 0, withAccess: 0, restricted: 0 });

  useEffect(() => { fetchCustomers(); }, []);
  useEffect(() => { if (selected) fetchAccess(selected.id); }, [selected]);

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('id, name, phone, email, city, is_restricted, portal_access_enabled').order('name');
    const list = data || [];
    setCustomers(list);
    setStats({
      total: list.length,
      withAccess: list.filter(c => c.portal_access_enabled).length,
      restricted: list.filter(c => c.is_restricted).length,
    });
  }

  async function fetchAccess(customerId) {
    const { data } = await supabase.from('customer_portal_access').select('*').eq('customer_id', customerId).single();
    if (data) {
      const a = {};
      ACCESS_CATEGORIES.forEach(cat => { a[cat.id] = data[cat.id] || false; });
      setAccess(a);
    } else {
      const defaultAccess = {};
      ACCESS_CATEGORIES.forEach(cat => { defaultAccess[cat.id] = cat.id === 'catalogue' || cat.id === 'tracking'; });
      setAccess(defaultAccess);
    }
  }

  async function saveAccess() {
    if (!selected) return;
    setSaving(true);
    const payload = { customer_id: selected.id, ...access, updated_at: new Date().toISOString() };
    const { data: existing } = await supabase.from('customer_portal_access').select('id').eq('customer_id', selected.id).single();
    if (existing) {
      await supabase.from('customer_portal_access').update(payload).eq('customer_id', selected.id);
    } else {
      await supabase.from('customer_portal_access').insert([payload]);
    }
    const hasAnyAccess = Object.values(access).some(v => v);
    await supabase.from('customers').update({ portal_access_enabled: hasAnyAccess }).eq('id', selected.id);
    fetchCustomers();
    setSaving(false);
  }

  async function togglePortalAccess(customer) {
    const newVal = !customer.portal_access_enabled;
    await supabase.from('customers').update({ portal_access_enabled: newVal }).eq('id', customer.id);
    if (!newVal) {
      await supabase.from('customer_portal_access').delete().eq('customer_id', customer.id);
    }
    fetchCustomers();
    if (selected?.id === customer.id) setSelected({ ...customer, portal_access_enabled: newVal });
  }

  async function enableAllAccess() {
    if (!selected) return;
    const allAccess = {};
    ACCESS_CATEGORIES.forEach(cat => { allAccess[cat.id] = true; });
    setAccess(allAccess);
  }

  async function disableAllAccess() {
    if (!selected) return;
    const noAccess = {};
    ACCESS_CATEGORIES.forEach(cat => { noAccess[cat.id] = false; });
    setAccess(noAccess);
  }

  const filtered = customers.filter(c => {
    const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.city?.toLowerCase().includes(search.toLowerCase());
    if (filter === 'enabled') return matchSearch && c.portal_access_enabled;
    if (filter === 'disabled') return matchSearch && !c.portal_access_enabled;
    if (filter === 'restricted') return matchSearch && c.is_restricted;
    return matchSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Portal Access</h1>
        <p className="text-gray-500 text-sm mt-1">Control which features each customer can access in the portal</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Customers', value: stats.total, color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { label: 'Portal Access Enabled', value: stats.withAccess, color: 'text-green-700 bg-green-50 border-green-200' },
          { label: 'Restricted Customers', value: stats.restricted, color: 'text-red-700 bg-red-50 border-red-200' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl border p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="w-80 flex-shrink-0 bg-white rounded-xl shadow-sm border flex flex-col">
          <div className="p-3 border-b space-y-2">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search customers..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-1">
              {[['all','All'],['enabled','Enabled'],['disabled','No Access'],['restricted','Restricted']].map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`flex-1 text-xs py-1 rounded-md transition-all ${filter === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-y-auto flex-1 max-h-96">
            {filtered.map(customer => (
              <div key={customer.id} onClick={() => setSelected(customer)}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selected?.id === customer.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${customer.is_restricted ? 'bg-red-400' : 'bg-blue-500'}`}>
                      {customer.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-32">{customer.name}</p>
                      <p className="text-xs text-gray-400">{customer.city || customer.phone || 'No info'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {customer.portal_access_enabled ? (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">Active</span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">No access</span>
                    )}
                    {customer.is_restricted && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full">Restricted</span>}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-gray-400 text-sm">No customers found</div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm border">
          {selected ? (
            <div>
              <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{selected.name}</h3>
                  <p className="text-xs text-gray-500">{selected.phone} · {selected.city}</p>
                  {selected.email && <p className="text-xs text-gray-400">{selected.email}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {selected.is_restricted && (
                    <span className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-full font-medium">⚠️ Restricted Customer</span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Portal Access:</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={selected.portal_access_enabled || false}
                        onChange={() => togglePortalAccess(selected)} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">Feature Access Control</h4>
                  <div className="flex gap-2">
                    <button onClick={enableAllAccess} className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">Enable All</button>
                    <button onClick={disableAllAccess} className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Disable All</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {ACCESS_CATEGORIES.map(cat => (
                    <div key={cat.id} onClick={() => setAccess({...access, [cat.id]: !access[cat.id]})}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${access[cat.id] ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                      <span className="text-xl mt-0.5">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className={`text-sm font-medium ${access[cat.id] ? 'text-blue-900' : 'text-gray-700'}`}>{cat.label}</p>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-2 ${access[cat.id] ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                            {access[cat.id] && <span className="text-white text-xs">✓</span>}
                          </div>
                        </div>
                        <p className={`text-xs mt-0.5 ${access[cat.id] ? 'text-blue-600' : 'text-gray-400'}`}>{cat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2 border-t">
                  <div className="flex-1 text-sm text-gray-500 flex items-center">
                    {Object.values(access).filter(Boolean).length} of {ACCESS_CATEGORIES.length} features enabled
                  </div>
                  <button onClick={saveAccess} disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 font-medium">
                    {saving ? 'Saving...' : 'Save Access Settings'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-64 text-gray-400">
              <div className="text-center">
                <div className="text-5xl mb-3">👤</div>
                <p className="font-medium">Select a customer</p>
                <p className="text-sm mt-1">Choose a customer from the list to manage their portal access</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
