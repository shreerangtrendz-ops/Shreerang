import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, RefreshCw, Send, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
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

export default function SalesOrderList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => { fetchOrders(); }, [page, statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      let query = supabase
        .from('sales_orders')
        .select('id, order_no, customer_name, total_amount, status, tally_sync_status, tally_voucher_id, created_at, delivery_date, order_channel')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

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
      // Update tally_sync_status to 'syncing'
      await supabase.from('sales_orders').update({ tally_sync_status: 'pending' }).eq('id', orderId);

      const result = await pushOrderToTally(orderId);
      if (result?.success) {
        await supabase.from('sales_orders').update({
          tally_sync_status: 'synced',
          tally_voucher_id: result.voucherNo || null,
        }).eq('id', orderId);
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
    !search || o.order_no?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

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
        {/* Filters */}
        <div className="flex gap-3 mb-4 items-center flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search order no, customer..." className="pl-9" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
          </select>
          <Button variant="outline" size="icon" onClick={fetchOrders}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Table */}
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
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading orders...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">No orders found</td></tr>
              ) : filtered.map(order => (
                <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-green-800 text-xs">
                    {order.order_no || '—'}
                  </td>
                  <td className="px-4 py-3 font-medium max-w-[180px] truncate">{order.customer_name}</td>
                  <td className="px-4 py-3 font-semibold">
                    ₹{(order.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TALLY_STATUS_COLORS[order.tally_sync_status] || TALLY_STATUS_COLORS.pending}`}>
                      {TALLY_STATUS_ICONS[order.tally_sync_status] || TALLY_STATUS_ICONS.pending}
                      {order.tally_sync_status || 'pending'}
                    </span>
                    {order.tally_voucher_id && (
                      <div className="text-xs text-gray-400 mt-0.5 font-mono">{order.tally_voucher_id}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 capitalize">{order.order_channel || 'admin'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-7"
                        onClick={() => navigate(`/admin/orders/${order.id}/edit`)}>
                        Edit
                      </Button>
                      {order.status !== 'draft' && order.tally_sync_status !== 'synced' && (
                        <Button size="sm" className="text-xs px-2 py-1 h-7 bg-blue-700 hover:bg-blue-800 text-white"
                          disabled={pushing[order.id]}
                          onClick={() => handlePushToTally(order.id, order.order_no)}>
                          {pushing[order.id] ? (
                            <><RefreshCw className="w-3 h-3 animate-spin mr-1" />Pushing...</>
                          ) : (
                            <><Send className="w-3 h-3 mr-1" />Push to Tally</>
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
          <span>Showing {filtered.length} orders (page {page + 1})</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</Button>
            <Button variant="outline" size="sm" disabled={filtered.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
