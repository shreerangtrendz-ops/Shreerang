import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

export default function DayBookPage() {
  const { toast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ sales: 0, payments: 0, purchases: 0, expenses: 0 });

  useEffect(() => { loadDayBook(date); }, [date]);

  async function loadDayBook(d) {
    setLoading(true);
    try {
      const nextDay = new Date(d); nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];

      // Sales orders on this day
      const { data: orders } = await supabase
        .from('sales_orders')
        .select('id, order_no, customer_name, total_amount, status, created_at, tally_sync_status')
        .gte('created_at', d)
        .lt('created_at', nextDayStr)
        .order('created_at');

      // Payments received
      const { data: payments } = await supabase
        .from('payment_followups')
        .select('id, customer_id, actual_received, payment_mode, notes, payment_date, customers(name)')
        .eq('payment_date', d)
        .eq('status', 'received')
        .order('payment_date');

      // Purchase bills on this day
      const { data: purchases } = await supabase
        .from('purchase_fabric')
        .select('id, tally_voucher_no, supplier_name, total_amount, invoice_date')
        .eq('invoice_date', d)
        .order('invoice_date');

      // Merge all entries
      const all = [
        ...(orders || []).map(o => ({
          time: new Date(o.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          type: 'Sales Invoice',
          typeColor: 'bg-blue-100 text-blue-700',
          party: o.customer_name,
          ref: o.order_no,
          amount: o.total_amount,
          effect: 'debit',
          status: o.status,
          tally: o.tally_sync_status,
        })),
        ...(payments || []).map(p => ({
          time: '—',
          type: 'Receipt',
          typeColor: 'bg-green-100 text-green-700',
          party: p.customers?.name || '—',
          ref: `PMT-${p.id?.slice(0,8)}`,
          amount: p.actual_received,
          effect: 'credit',
          status: 'received',
          tally: '-',
          notes: `${p.payment_mode || ''} ${p.notes || ''}`.trim(),
        })),
        ...(purchases || []).map(p => ({
          time: '—',
          type: 'Purchase',
          typeColor: 'bg-orange-100 text-orange-700',
          party: p.supplier_name || '—',
          ref: p.tally_voucher_no || '—',
          amount: p.total_amount,
          effect: 'purchase',
          status: 'recorded',
          tally: 'synced',
        })),
      ];

      // Summary
      setSummary({
        sales: (orders || []).reduce((s, o) => s + (o.total_amount || 0), 0),
        payments: (payments || []).reduce((s, p) => s + (p.actual_received || 0), 0),
        purchases: (purchases || []).reduce((s, p) => s + (p.total_amount || 0), 0),
        count: all.length,
      });

      setEntries(all);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
    setLoading(false);
  }

  function prevDay() {
    const d = new Date(date); d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  }
  function nextDay() {
    const d = new Date(date); d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
  }

  const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const isToday = date === new Date().toISOString().split('T')[0];

  function exportCSV() {
    const h = 'Type,Party,Reference,Amount,Effect,Status\n';
    const rows = entries.map(e => `${e.type},${e.party},${e.ref},${e.amount},${e.effect},${e.status}`).join('\n');
    const blob = new Blob([h + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `day-book-${date}.csv`; a.click();
  }

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div>
      <AdminPageHeader
        title="Day Book"
        subtitle="All transactions for a given day — sales, receipts, purchases"
      />
      <div className="p-6 space-y-4">
        {/* Date navigator */}
        <div className="flex items-center gap-4 bg-white rounded-xl border p-4">
          <Button variant="outline" size="icon" onClick={prevDay}><ChevronLeft className="w-4 h-4" /></Button>
          <div className="flex-1 text-center">
            <div className="text-lg font-bold">{displayDate}</div>
            {isToday && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Today</span>}
          </div>
          <Button variant="outline" size="icon" onClick={nextDay} disabled={isToday}><ChevronRight className="w-4 h-4" /></Button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm" />
          {entries.length > 0 && (
            <Button size="sm" variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Sales', value: fmt(summary.sales), color: 'border-l-blue-500', sub: 'Invoices raised' },
            { label: 'Receipts', value: fmt(summary.payments), color: 'border-l-green-500', sub: 'Cash/NEFT received' },
            { label: 'Purchases', value: fmt(summary.purchases), color: 'border-l-orange-500', sub: 'Purchase bills' },
          ].map(c => (
            <div key={c.label} className={`bg-white rounded-xl border border-l-4 ${c.color} p-4`}>
              <div className="text-sm text-gray-500">{c.label}</div>
              <div className="text-2xl font-bold mt-1">{c.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Entries table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Time</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Party</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Reference</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Tally</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <div className="text-gray-300 text-4xl mb-2">📋</div>
                    <div className="text-gray-400 text-sm">No transactions recorded on this day</div>
                  </td>
                </tr>
              ) : entries.map((e, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.time}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.typeColor}`}>{e.type}</span>
                  </td>
                  <td className="px-4 py-3 font-medium max-w-[200px] truncate">{e.party}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.ref}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${e.effect === 'credit' ? 'text-green-600' : e.effect === 'purchase' ? 'text-orange-600' : 'text-blue-700'}`}>
                    {fmt(e.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.tally === 'synced' ? 'bg-green-100 text-green-600' : e.tally === 'pending' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-600'}`}>
                      {e.tally}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
