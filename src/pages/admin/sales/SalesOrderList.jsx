import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, RefreshCw, Send, CheckCircle, XCircle, Clock, Download, LayoutGrid, List } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { pushOrderToTally } from '@/services/TallySyncService';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  confirmed: 'bg-blue-100 text-blue-700',
  dispatched: 'bg-yellow-100 text-yellow-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const TALLY_STATUS_COLORS = {
  synced: 'bg-green-50 text-green-700 border border-green-200',
  failed: 'bg-red-50 text-red-700 border border-red-200',
  pending: 'bg-gray-50 text-gray-500 border border-gray-200',
};

const TALLY_STATUS_ICONS = {
  synced: <CheckCircle className="w-3 h-3" />,
  failed: <XCircle className="w-3 h-3" />,
  pending: <Clock className="w-3 h-3" />,
};

const KANBAN_COLUMNS = [
  { key: 'draft', label: 'Draft', color: 'bg-gray-50 border-gray-200', headerColor: 'bg-gray-200 text-gray-700' },
  { key: 'confirmed', label: 'Confirmed', color: 'bg-blue-50 border-blue-200', headerColor: 'bg-blue-600 text-white' },
  { key: 'dispatched', label: 'Dispatched', color: 'bg-yellow-50 border-yellow-200', headerColor: 'bg-yellow-500 text-white' },
  { key: 'delivered', label: 'Delivered', color: 'bg-green-50 border-green-200', headerColor: 'bg-green-600 text-white' },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-red-50 border-red-200', headerColor: 'bg-red-500 text-white' },
];

function KanbanCard({ order, onEdit, onPushToTally, pushing }) {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-3 mb-2 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onEdit(order.id)}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-mono text-xs font-bold text-green-800">{order.order_no || '—'}</span>
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${TALLY_STATUS_COLORS[order.tally_sync_status] || TALLY_STATUS_COLORS.pending}`}>
          {TALLY_STATUS_ICONS[order.tally_sync_status] || TALLY_STATUS_ICONS.pending}
          {order.tally_sync_status || 'pending'}
        </span>
      </div>
      <p className="text-sm font-semibold text-gray-800 truncate mb-1">{order.party_name || order.party_details?.name || '—'}</p>
      <p className="text-base font-bold text-gray-900 mb-2">₹{(order.total_amount || 0).toLocaleString('en-IN')}</p>
      <div className="flex justify-between items-center text-xs text-gray-400">
        <span>{order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '—'}</span>
        <span className="capitalize">{order.order_channel || 'admin'}</span>
      </div>
      {order.status !== 'draft' && order.tally_sync_status !== 'synced' && (
        <Button
          size="sm"
          className="w-full mt-2 text-xs h-7 bg-blue-700 hover:bg-blue-800 text-white"
          disabled={pushing[order.id]}
          onClick={e => { e.stopPropagation(); onPushToTally(order.id, order.order_no); }}
        >
          {pushing[order.id] ? <><RefreshCw className="w-3 h-3 animate-spin mr-1" />Pushing...</> : <><Send className="w-3 h-3 mr-1" />Push to Tally</>}
        </Button>
      )}
    </div>
  );
}

export default function SalesOrderList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'kanban'
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => { fetchOrders(); }, [page, statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      let query = supabase
        .from('sales_orders')
        .select('id, order_no, party_name, party_details, total_amount, status, tally_sync_status, tally_voucher_id, created_at, delivery_date, order_channel')
        .order('created_at', { ascending: false });

      // In kanban mode, fetch all (no pagination); in table mode, paginate
      if (viewMode === 'table') {
        query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      } else {
        query = query.limit(200);
      }

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error loading orders', description: err.message });
    }
    setLoading(false);
  }

  async function handlePushToTally(orderId, orderNo) {
    setPushing(p => ({ ...p, [orderId]: true }));
    try {
      await supabase.from('sales_orders').update({ tally_sync_status: 'pending' }).eq('id', orderId);
      const result = await pushOrderToTally(orderId);
      if (result?.success) {
        await supabase.from('sales_orders').update({ tally_sync_status: 'synced', tally_voucher_id: result.voucherNo || null }).eq('id', orderId);
        toast({ title: '✅ Pushed to Tally', description: `${orderNo} → Tally Voucher: ${result.voucherNo || 'OK'}` });
      } else {
        await supabase.from('sales_orders').update({ tally_sync_status: 'failed' }).eq('id', orderId);
        toast({ variant: 'destructive', title: 'Push Failed', description: result?.error || 'Unknown error. Check Tally is open.' });
      }
    } catch (err) {
      await supabase.from('sales_orders').update({ tally_sync_status: 'failed' }).eq('id', orderId);
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
    setPushing(p => ({ ...p, [orderId]: false }));
    fetchOrders();
  }

  const filtered = orders.filter(o =>
    !search ||
    o.order_no?.toLowerCase().includes(search.toLowerCase()) ||
    (o.party_name || o.party_details?.name)?.toLowerCase().includes(search.toLowerCase())
  );

  // Kanban: group by status
  const kanbanGroups = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.key] = filtered.filter(o => o.status === col.key);
    return acc;
  }, {});

  return (
    <div>
      <AdminPageHeader
        title="Sales Orders"
        subtitle="All orders • SRTPL/NNNN/YY-YY format • Tally sync status"
        actions={
          <Button onClick={() => navigate('/admin/orders/new')} className="bg-green-700 hover:bg-green-800 text-white">
            <Plus className="w-4 h-4 mr-1" /> New Order
          </Button>
        }
      />
      <div className="p-6">
        {/* Filters + View Toggle */}
        <div className="flex gap-3 mb-4 items-center flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order no, customer..." className="pl-9" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button variant="outline" size="icon" onClick={fetchOrders}><RefreshCw className="w-4 h-4" /></Button>
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${viewMode === 'table' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <List className="w-4 h-4" /> Table
            </button>
            <button
              onClick={() => { setViewMode('kanban'); setStatusFilter('all'); fetchOrders(); }}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${viewMode === 'kanban' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Kanban
            </button>
          </div>
        </div>

        {/* Summary Chips */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {KANBAN_COLUMNS.map(col => {
            const count = orders.filter(o => o.status === col.key).length;
            const total = orders.filter(o => o.status === col.key).reduce((s, o) => s + (o.total_amount || 0), 0);
            return (
              <div key={col.key} className="flex items-center gap-1.5 bg-white border rounded-full px-3 py-1 text-xs">
                <span className={col.headerColor.replace('bg-', 'bg-').split(' ')[0] + ' w-2 h-2 rounded-full inline-block'}></span>
                <span className="font-semibold capitalize">{col.label}</span>
                <span className="text-gray-500">{count} • ₹{(total/1000).toFixed(0)}K</span>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading orders...</div>
        ) : viewMode === 'kanban' ? (
          /* KANBAN VIEW */
          <div className="grid grid-cols-5 gap-3" style={{ minHeight: '60vh' }}>
            {KANBAN_COLUMNS.map(col => (
              <div key={col.key} className={`rounded-xl border ${col.color} flex flex-col`}>
                <div className={`${col.headerColor} rounded-t-xl px-3 py-2 flex justify-between items-center`}>
                  <span className="font-semibold text-sm">{col.label}</span>
                  <span className="text-xs opacity-80">{kanbanGroups[col.key].length}</span>
                </div>
                <div className="p-2 flex-1 overflow-y-auto max-h-[70vh]">
                  {kanbanGroups[col.key].length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-6">No orders</div>
                  ) : (
                    kanbanGroups[col.key].map(order => (
                      <KanbanCard
                        key={order.id}
                        order={order}
                        onEdit={(id) => navigate(`/admin/orders/${id}/edit`)}
                        onPushToTally={handlePushToTally}
                        pushing={pushing}
                      />
                    ))
                  )}
                </div>
                <div className="px-3 py-2 border-t text-xs text-gray-500 font-semibold">
                  ₹{kanbanGroups[col.key].reduce((s, o) => s + (o.total_amount || 0), 0).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* TABLE VIEW */
          <>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Order No.</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Customer</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Tally</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Channel</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400">No orders found</td></tr>
                  ) : filtered.map(order => (
                    <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-green-800 text-xs">{order.order_no || '—'}</td>
                      <td className="px-4 py-3 font-medium max-w-[180px] truncate">{order.party_name || order.party_details?.name || '—'}</td>
                      <td className="px-4 py-3 font-semibold">₹{(order.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>{order.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TALLY_STATUS_COLORS[order.tally_sync_status] || TALLY_STATUS_COLORS.pending}`}>
                          {TALLY_STATUS_ICONS[order.tally_sync_status] || TALLY_STATUS_ICONS.pending}
                          {order.tally_sync_status || 'pending'}
                        </span>
                        {order.tally_voucher_id && <div className="text-xs text-gray-400 mt-0.5 font-mono">{order.tally_voucher_id}</div>}
                      </td>
                      <td className="px-4 py-3"><span className="text-xs text-gray-500 capitalize">{order.order_channel || 'admin'}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-500">{order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-7" onClick={() => navigate(`/admin/orders/${order.id}/edit`)}>Edit</Button>
                          {order.status !== 'draft' && order.tally_sync_status !== 'synced' && (
                            <Button size="sm" className="text-xs px-2 py-1 h-7 bg-blue-700 hover:bg-blue-800 text-white" disabled={pushing[order.id]} onClick={() => handlePushToTally(order.id, order.order_no)}>
                              {pushing[order.id] ? <><RefreshCw className="w-3 h-3 animate-spin mr-1" />Pushing...</> : <><Send className="w-3 h-3 mr-1" />Push to Tally</>}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
              <span>Showing {filtered.length} orders (page {page + 1})</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</Button>
                <Button variant="outline" size="sm" disabled={filtered.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Next →</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
