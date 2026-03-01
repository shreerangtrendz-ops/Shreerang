import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export default function AIPriceSyncPage() {
  const [tab, setTab] = useState('alerts');
  const [alerts, setAlerts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rawText, setRawText] = useState('');
  const [parsedPrices, setParsedPrices] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const [form, setForm] = useState({ supplier_name: '', product_name: '', old_price: '', new_price: '', effective_date: '', notes: '' });

  useEffect(() => { fetchAlerts(); fetchProducts(); fetchHistory(); }, []);

  async function fetchAlerts() {
    const { data } = await supabase.from('supplier_price_alerts').select('*').order('created_at', { ascending: false }).limit(20);
    setAlerts(data || []);
  }

  async function fetchProducts() {
    const { data } = await supabase.from('fabrics').select('id, name, selling_price, cost_price').limit(50);
    setProducts(data || []);
  }

  async function fetchHistory() {
    const { data } = await supabase.from('price_change_log').select('*').order('changed_at', { ascending: false }).limit(30);
    setPriceHistory(data || []);
  }

  async function parseWithAI() {
    if (!rawText.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'system',
            content: 'You are a price extraction assistant for a fabric company. Extract product names and prices from the supplier message. Return JSON array: [{product_name, price, unit, supplier_notes}]'
          }, {
            role: 'user',
            content: rawText
          }],
          temperature: 0.2
        })
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '[]';
      const jsonMatch = content.match(/\[.*\]/s);
      if (jsonMatch) setParsedPrices(JSON.parse(jsonMatch[0]));
    } catch(e) { console.error(e); }
    setAiLoading(false);
  }

  async function saveAlert(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('supplier_price_alerts').insert([form]);
    if (!error) { fetchAlerts(); setForm({ supplier_name: '', product_name: '', old_price: '', new_price: '', effective_date: '', notes: '' }); }
    setLoading(false);
  }

  async function approvePrice(alert) {
    const fabric = products.find(p => p.name?.toLowerCase().includes(alert.product_name?.toLowerCase()));
    if (fabric) {
      await supabase.from('fabrics').update({ cost_price: parseFloat(alert.new_price) }).eq('id', fabric.id);
      await supabase.from('price_change_log').insert([{
        product_id: fabric.id, product_name: fabric.name,
        old_price: alert.old_price, new_price: alert.new_price,
        changed_by: 'admin', change_reason: 'Supplier price update'
      }]);
      await supabase.from('supplier_price_alerts').update({ status: 'approved' }).eq('id', alert.id);
      fetchAlerts(); fetchHistory();
    }
  }

  const tabs = [
    { id: 'alerts', label: 'Price Alerts', icon: '🔔' },
    { id: 'ai-parse', label: 'AI Parser', icon: '🤖' },
    { id: 'add', label: 'Add Alert', icon: '➕' },
    { id: 'history', label: 'Price History', icon: '📊' },
  ];

  const pctChange = (oldP, newP) => oldP && newP ? (((newP - oldP) / oldP) * 100).toFixed(1) : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Price Sync</h1>
        <p className="text-gray-500 text-sm mt-1">Monitor supplier price changes and sync with product catalog</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Alerts', value: alerts.filter(a => a.status === 'pending').length, color: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700' },
          { label: 'Approved Today', value: alerts.filter(a => a.status === 'approved').length, color: 'bg-green-50 border-green-200', text: 'text-green-700' },
          { label: 'Price Increases', value: alerts.filter(a => parseFloat(a.new_price) > parseFloat(a.old_price)).length, color: 'bg-red-50 border-red-200', text: 'text-red-700' },
          { label: 'Price Drops', value: alerts.filter(a => parseFloat(a.new_price) < parseFloat(a.old_price)).length, color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl border p-4 ${s.color}`}>
            <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
            <p className={`text-sm ${s.text} opacity-80`}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'alerts' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Supplier', 'Product', 'Old Price', 'New Price', 'Change', 'Effective', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alerts.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No price alerts yet. Add alerts manually or use AI Parser.</td></tr>
              ) : alerts.map(a => {
                const pct = pctChange(parseFloat(a.old_price), parseFloat(a.new_price));
                const isIncrease = parseFloat(a.new_price) > parseFloat(a.old_price);
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.supplier_name}</td>
                    <td className="px-4 py-3 text-gray-700">{a.product_name}</td>
                    <td className="px-4 py-3 text-gray-600">₹{a.old_price}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">₹{a.new_price}</td>
                    <td className="px-4 py-3">
                      {pct && <span className={`text-xs font-medium px-2 py-1 rounded-full ${isIncrease ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {isIncrease ? '↑' : '↓'} {Math.abs(pct)}%
                      </span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{a.effective_date || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'approved' ? 'bg-green-100 text-green-700' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {a.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.status === 'pending' && (
                        <button onClick={() => approvePrice(a)} className="text-xs text-blue-600 hover:underline">Approve</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'ai-parse' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Paste Supplier Message / Whatsapp / Email</h3>
            <textarea value={rawText} onChange={e => setRawText(e.target.value)}
              placeholder="Paste supplier price message here... e.g. 'Cotton fabric 40s count now ₹85/meter from ₹80, linen ₹120/meter new rate...'"
              rows={8} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono" />
            <button onClick={parseWithAI} disabled={aiLoading || !rawText.trim()}
              className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {aiLoading ? <><span className="animate-spin">⚙️</span> Parsing...</> : '🤖 Parse with AI'}
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Parsed Results</h3>
            {parsedPrices.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-center">
                <div><div className="text-4xl mb-2">🤖</div><p className="text-sm">AI parsed prices will appear here</p></div>
              </div>
            ) : (
              <div className="space-y-3">
                {parsedPrices.map((p, i) => (
                  <div key={i} className="border rounded-lg p-3 bg-blue-50">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-sm text-gray-900">{p.product_name}</p>
                      <span className="text-sm font-bold text-blue-700">₹{p.price}/{p.unit || 'meter'}</span>
                    </div>
                    {p.supplier_notes && <p className="text-xs text-gray-500 mt-1">{p.supplier_notes}</p>}
                    <button onClick={() => setForm({...form, product_name: p.product_name, new_price: p.price, notes: p.supplier_notes})}
                      className="mt-2 text-xs text-blue-600 hover:underline">Use this →</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'add' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-lg">
          <h3 className="font-semibold text-gray-900 mb-4">Add Price Alert Manually</h3>
          <form onSubmit={saveAlert} className="space-y-4">
            {[
              { label: 'Supplier Name', key: 'supplier_name', type: 'text', placeholder: 'e.g. Ramesh Textiles' },
              { label: 'Product Name', key: 'product_name', type: 'text', placeholder: 'e.g. Cotton 40s Count' },
              { label: 'Old Price (₹)', key: 'old_price', type: 'number', placeholder: '0.00' },
              { label: 'New Price (₹)', key: 'new_price', type: 'number', placeholder: '0.00' },
              { label: 'Effective Date', key: 'effective_date', type: 'date', placeholder: '' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-sm font-medium text-gray-700 block mb-1">{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                  placeholder={f.placeholder} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Add Price Alert'}
            </button>
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Product', 'Old Price', 'New Price', 'Changed By', 'Reason', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {priceHistory.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No price change history yet</td></tr>
              ) : priceHistory.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{h.product_name}</td>
                  <td className="px-4 py-3 text-gray-500">₹{h.old_price}</td>
                  <td className="px-4 py-3 font-medium">₹{h.new_price}</td>
                  <td className="px-4 py-3 text-gray-600">{h.changed_by || 'system'}</td>
                  <td className="px-4 py-3 text-gray-500">{h.change_reason || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{h.changed_at ? new Date(h.changed_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
