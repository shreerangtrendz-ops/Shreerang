import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const STAGES = [
  { id: 'inquiry', label: 'Inquiry', color: 'bg-gray-100 border-gray-300', dot: 'bg-gray-400' },
  { id: 'sampling', label: 'Sampling', color: 'bg-blue-50 border-blue-300', dot: 'bg-blue-500' },
  { id: 'approved', label: 'Order Approved', color: 'bg-yellow-50 border-yellow-300', dot: 'bg-yellow-500' },
  { id: 'production', label: 'In Production', color: 'bg-orange-50 border-orange-300', dot: 'bg-orange-500' },
  { id: 'qc', label: 'QC / Finishing', color: 'bg-purple-50 border-purple-300', dot: 'bg-purple-500' },
  { id: 'dispatch', label: 'Ready to Dispatch', color: 'bg-green-50 border-green-300', dot: 'bg-green-500' },
  { id: 'delivered', label: 'Delivered', color: 'bg-teal-50 border-teal-300', dot: 'bg-teal-500' },
];

export default function MakeToOrderPage() {
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('kanban');
  const [form, setForm] = useState({
    order_no: '', customer_name: '', customer_phone: '', product_description: '',
    quantity: '', unit: 'meters', fabric_type: '', color: '', special_requirements: '',
    delivery_date: '', advance_paid: '', total_amount: '', stage: 'inquiry', priority: 'normal'
  });

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    const { data } = await supabase.from('mto_orders').select('*').order('created_at', { ascending: false });
    setOrders(data || []);
  }

  async function saveOrder(e) {
    e.preventDefault();
    setLoading(true);
    const orderNo = form.order_no || `MTO-${Date.now().toString().slice(-6)}`;
    const { error } = await supabase.from('mto_orders').insert([{ ...form, order_no: orderNo }]);
    if (!error) { fetchOrders(); setShowForm(false); setForm({ order_no: '', customer_name: '', customer_phone: '', product_description: '', quantity: '', unit: 'meters', fabric_type: '', color: '', special_requirements: '', delivery_date: '', advance_paid: '', total_amount: '', stage: 'inquiry', priority: 'normal' }); }
    setLoading(false);
  }

  async function moveStage(order, newStage) {
    await supabase.from('mto_orders').update({ stage: newStage }).eq('id', order.id);
    fetchOrders();
  }

  const getOrdersByStage = (stageId) => orders.filter(o => o.stage === stageId);

  const priorityColors = { urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', normal: 'bg-gray-100 text-gray-600' };

  return (
    <div className="p-6 max-w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Make-to-Order Pipeline</h1>
          <p className="text-gray-500 text-sm mt-1">Track custom fabric orders from inquiry to delivery</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[{ v: 'kanban', icon: '⊞' }, { v: 'list', icon: '☰' }].map(b => (
              <button key={b.v} onClick={() => setView(b.v)}
                className={`px-3 py-1.5 rounded text-sm font-medium ${view === b.v ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                {b.icon}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            + New MTO Order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Orders', value: orders.length },
          { label: 'In Production', value: orders.filter(o => o.stage === 'production').length },
          { label: 'Ready to Dispatch', value: orders.filter(o => o.stage === 'dispatch').length },
          { label: 'Urgent', value: orders.filter(o => o.priority === 'urgent').length },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border p-4">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {view === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => {
              const stageOrders = getOrdersByStage(stage.id);
              return (
                <div key={stage.id} className="w-64 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                    <h3 className="font-medium text-sm text-gray-700">{stage.label}</h3>
                    <span className="ml-auto bg-gray-200 text-gray-600 text-xs rounded-full px-2 py-0.5">{stageOrders.length}</span>
                  </div>
                  <div className={`min-h-32 rounded-xl border-2 p-2 space-y-2 ${stage.color}`}>
                    {stageOrders.map(order => (
                      <div key={order.id} onClick={() => setSelectedOrder(order)}
                        className="bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow border border-gray-100">
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="text-xs font-mono text-gray-500">{order.order_no}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${priorityColors[order.priority] || priorityColors.normal}`}>
                            {order.priority}
                          </span>
                        </div>
                        <p className="font-medium text-sm text-gray-900 truncate">{order.customer_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{order.product_description}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-400">{order.quantity} {order.unit}</span>
                          {order.delivery_date && (
                            <span className={`text-xs ${new Date(order.delivery_date) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              📅 {new Date(order.delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {stageOrders.length === 0 && (
                      <div className="text-center py-6 text-gray-300 text-xs">No orders</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Order No', 'Customer', 'Product', 'Qty', 'Fabric', 'Delivery', 'Amount', 'Stage', 'Priority', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(order => {
                const stage = STAGES.find(s => s.id === order.stage);
                return (
                  <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{order.order_no}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{order.customer_name}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{order.product_description}</td>
                    <td className="px-4 py-3 text-gray-600">{order.quantity} {order.unit}</td>
                    <td className="px-4 py-3 text-gray-600">{order.fabric_type || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3 text-gray-900">₹{order.total_amount ? parseInt(order.total_amount).toLocaleString('en-IN') : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${stage?.dot || 'bg-gray-400'}`} />
                        <span className="text-xs text-gray-600">{stage?.label || order.stage}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[order.priority] || priorityColors.normal}`}>{order.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select value={order.stage} onChange={e => { e.stopPropagation(); moveStage(order, e.target.value); }}
                        onClick={e => e.stopPropagation()}
                        className="text-xs border rounded px-1 py-0.5 focus:outline-none">
                        {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No MTO orders yet. Create your first order!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedOrder.order_no}</h3>
                <p className="text-xs text-gray-500">{selectedOrder.customer_name}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600 text-xl">&#x2715;</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Customer', value: selectedOrder.customer_name },
                  { label: 'Phone', value: selectedOrder.customer_phone || '—' },
                  { label: 'Product', value: selectedOrder.product_description },
                  { label: 'Quantity', value: `${selectedOrder.quantity} ${selectedOrder.unit}` },
                  { label: 'Fabric Type', value: selectedOrder.fabric_type || '—' },
                  { label: 'Color', value: selectedOrder.color || '—' },
                  { label: 'Delivery Date', value: selectedOrder.delivery_date ? new Date(selectedOrder.delivery_date).toLocaleDateString('en-IN') : '—' },
                  { label: 'Total Amount', value: selectedOrder.total_amount ? `₹${parseInt(selectedOrder.total_amount).toLocaleString('en-IN')}` : '—' },
                  { label: 'Advance Paid', value: selectedOrder.advance_paid ? `₹${parseInt(selectedOrder.advance_paid).toLocaleString('en-IN')}` : '—' },
                  { label: 'Priority', value: selectedOrder.priority },
                ].map((f, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">{f.label}</p>
                    <p className="font-medium text-gray-900 text-sm">{f.value}</p>
                  </div>
                ))}
              </div>
              {selectedOrder.special_requirements && (
                <div className="bg-yellow-50 rounded-lg p-3">
                  <p className="text-xs text-yellow-600 font-medium">Special Requirements</p>
                  <p className="text-sm text-gray-800 mt-1">{selectedOrder.special_requirements}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Move to Stage:</p>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map(s => (
                    <button key={s.id} onClick={() => { moveStage(selectedOrder, s.id); setSelectedOrder({...selectedOrder, stage: s.id}); }}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${selectedOrder.stage === s.id ? s.color + ' font-medium' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                      {s.id === selectedOrder.stage ? '✓ ' : ''}{s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">New Make-to-Order</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&#x2715;</button>
            </div>
            <form onSubmit={saveOrder} className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Order No (auto)', key: 'order_no', type: 'text', placeholder: 'Auto-generated' },
                  { label: 'Customer Name *', key: 'customer_name', type: 'text', placeholder: 'Customer name', required: true },
                  { label: 'Customer Phone', key: 'customer_phone', type: 'tel', placeholder: '+91 9876543210' },
                  { label: 'Quantity *', key: 'quantity', type: 'number', placeholder: '100', required: true },
                  { label: 'Fabric Type', key: 'fabric_type', type: 'text', placeholder: 'e.g. Cotton, Linen, Silk' },
                  { label: 'Color / Shade', key: 'color', type: 'text', placeholder: 'e.g. Navy Blue, Off-White' },
                  { label: 'Delivery Date', key: 'delivery_date', type: 'date', placeholder: '' },
                  { label: 'Total Amount (₹)', key: 'total_amount', type: 'number', placeholder: '0' },
                  { label: 'Advance Paid (₹)', key: 'advance_paid', type: 'number', placeholder: '0' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-sm font-medium text-gray-700 block mb-1">{f.label}</label>
                    <input type={f.type} value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                      placeholder={f.placeholder} required={f.required}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Unit</label>
                  <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="meters">Meters</option>
                    <option value="kg">Kilograms</option>
                    <option value="pieces">Pieces</option>
                    <option value="sets">Sets</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Product Description *</label>
                  <textarea value={form.product_description} onChange={e => setForm({...form, product_description: e.target.value})}
                    placeholder="Describe the fabric / product in detail..." rows={2} required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Special Requirements</label>
                  <textarea value={form.special_requirements} onChange={e => setForm({...form, special_requirements: e.target.value})}
                    placeholder="Any special instructions, embroidery details, etc..." rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create MTO Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
