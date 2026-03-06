import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, TrendingDown, Download } from 'lucide-react';

export default function DesignProfitabilityPage() {
  const { toast } = useToast();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('orders_count');
  const [sortDir, setSortDir] = useState('desc');
  const [period, setPeriod] = useState('90'); // days

  useEffect(() => { loadData(); }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const fromDate = new Date(Date.now() - Number(period) * 86400000).toISOString().split('T')[0];

      // Get design master for reference
      const { data: designMaster } = await supabase
        .from('design_batch_master')
        .select('design_no, item_name, gsm, weight, construction, width')
        .limit(2000);

      // Get order items to count design sales
      // Since order_details is JSONB, we need to work with what we have
      const { data: orders } = await supabase
        .from('sales_orders')
        .select('id, order_no, order_details, total_amount, created_at, customer_name')
        .gte('created_at', fromDate)
        .in('status', ['confirmed', 'dispatched', 'delivered'])
        .limit(1000);

      // Aggregate by design_no
      const designMap = {};
      (orders || []).forEach(order => {
        const items = order.order_details?.items || [];
        items.forEach(item => {
          const dno = item.design_no || item.design_number || '—';
          if (!designMap[dno]) {
            designMap[dno] = {
              design_no: dno,
              orders_count: 0,
              total_qty: 0,
              total_revenue: 0,
              customers: new Set(),
              last_ordered: null,
            };
          }
          designMap[dno].orders_count++;
          designMap[dno].total_qty += Number(item.quantity || 0);
          designMap[dno].total_revenue += Number(item.amount || 0);
          designMap[dno].customers.add(order.customer_name);
          if (!designMap[dno].last_ordered || order.created_at > designMap[dno].last_ordered) {
            designMap[dno].last_ordered = order.created_at;
          }
        });
      });

      // Enrich with design master info
      const dmMap = {};
      (designMaster || []).forEach(d => { dmMap[d.design_no] = d; });

      const rows = Object.values(designMap).map(d => ({
        ...d,
        customers: d.customers.size,
        avg_rate: d.total_qty > 0 ? d.total_revenue / d.total_qty : 0,
        item_name: dmMap[d.design_no]?.item_name || '—',
        gsm: dmMap[d.design_no]?.gsm || '—',
        construction: dmMap[d.design_no]?.construction || '—',
      }));

      setDesigns(rows);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
    setLoading(false);
  }

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
  const fmtQty = n => `${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 1 })} m`;

  const filtered = designs
    .filter(d => !search || d.design_no?.toLowerCase().includes(search.toLowerCase()) || d.item_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      return (a[sortBy] > b[sortBy] ? 1 : -1) * mul;
    });

  const grandTotal = filtered.reduce((s, d) => ({
    revenue: s.revenue + d.total_revenue,
    qty: s.qty + d.total_qty,
    orders: s.orders + d.orders_count,
  }), { revenue: 0, qty: 0, orders: 0 });

  function exportCSV() {
    const h = 'Design No,Item Name,Orders,Qty (m),Revenue,Avg Rate,Customers,Last Ordered\n';
    const rows = filtered.map(d =>
      `${d.design_no},"${d.item_name}",${d.orders_count},${d.total_qty.toFixed(1)},${d.total_revenue.toFixed(0)},${d.avg_rate.toFixed(2)},${d.customers},${d.last_ordered?.split('T')[0] || ''}`
    ).join('\n');
    const blob = new Blob([h + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `design-profitability-${period}d.csv`; a.click();
  }

  const SortIcon = ({ col }) => sortBy === col
    ? <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
    : <span className="ml-1 text-gray-300">↕</span>;

  return (
    <div>
      <AdminPageHeader
        title="Design Profitability"
        subtitle="Revenue and velocity by design number — track your best performers"
      />
      <div className="p-6 space-y-4">
        {/* Controls */}
        <div className="flex gap-3 items-center bg-white rounded-xl border p-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search design no, item name..." className="pl-9" />
          </div>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            className="border rounded px-3 py-2 text-sm">
            <option value="30">Last 30 Days</option>
            <option value="60">Last 60 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="180">Last 6 Months</option>
            <option value="365">Last 1 Year</option>
          </select>
          {filtered.length > 0 && (
            <Button size="sm" variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1" />Export
            </Button>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Designs Sold', value: filtered.length, icon: '🎨' },
            { label: 'Total Revenue', value: fmt(grandTotal.revenue), icon: '💰' },
            { label: 'Total Meters', value: fmtQty(grandTotal.qty), icon: '📏' },
            { label: 'Total Orders', value: grandTotal.orders, icon: '📦' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border p-4">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label} (last {period}d)</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer" onClick={() => toggleSort('design_no')}>
                  Design No <SortIcon col="design_no" />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Item Name</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer" onClick={() => toggleSort('orders_count')}>
                  Orders <SortIcon col="orders_count" />
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer" onClick={() => toggleSort('total_qty')}>
                  Qty (m) <SortIcon col="total_qty" />
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer" onClick={() => toggleSort('total_revenue')}>
                  Revenue <SortIcon col="total_revenue" />
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer" onClick={() => toggleSort('avg_rate')}>
                  Avg Rate <SortIcon col="avg_rate" />
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600 cursor-pointer" onClick={() => toggleSort('customers')}>
                  Customers <SortIcon col="customers" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Analyzing design performance...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">No order data found for this period</td></tr>
              ) : filtered.map((d, i) => {
                const rank = i + 1;
                const isTop = rank <= 3;
                return (
                  <tr key={d.design_no} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {isTop ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-green-800">{d.design_no}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{d.item_name}</td>
                    <td className="px-4 py-3 text-right font-medium">{d.orders_count}</td>
                    <td className="px-4 py-3 text-right">{fmtQty(d.total_qty)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-700">{fmt(d.total_revenue)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(d.avg_rate)}/m</td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">{d.customers}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
