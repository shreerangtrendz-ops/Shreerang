import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Search, Download, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PartyLedgerPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, tally_ledger_name, city')
      .neq('business_type', 'supplier')
      .order('name')
      .limit(500);
    setCustomers(data || []);
  }

  async function loadLedger(customerId) {
    setLoading(true);
    try {
      // Fetch orders (debits)
      const { data: orders } = await supabase
        .from('sales_orders')
        .select('id, order_no, created_at, total_amount, status, tally_sync_status')
        .eq('customer_id', customerId)
        .gte('created_at', fromDate)
        .lte('created_at', toDate + 'T23:59:59')
        .order('created_at');

      // Fetch payments received
      const { data: payments } = await supabase
        .from('payment_followups')
        .select('id, payment_date, actual_received, payment_mode, notes')
        .eq('customer_id', customerId)
        .gte('payment_date', fromDate)
        .lte('payment_date', toDate)
        .eq('status', 'received')
        .order('payment_date');

      // Merge and sort by date
      const entries = [];
      let runningBalance = 0;

      const allTxns = [
        ...(orders || []).map(o => ({
          date: o.created_at?.split('T')[0],
          type: 'invoice',
          ref: o.order_no,
          debit: o.total_amount || 0,
          credit: 0,
          status: o.status,
          tally: o.tally_sync_status,
        })),
        ...(payments || []).map(p => ({
          date: p.payment_date,
          type: 'payment',
          ref: `PMT-${p.id?.slice(0,8)}`,
          debit: 0,
          credit: p.actual_received || 0,
          status: 'received',
          tally: '-',
          notes: p.notes,
          mode: p.payment_mode,
        })),
      ].sort((a, b) => new Date(a.date) - new Date(b.date));

      allTxns.forEach(t => {
        runningBalance += t.debit - t.credit;
        entries.push({ ...t, balance: runningBalance });
      });

      setLedgerEntries(entries);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
    setLoading(false);
  }

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const totals = ledgerEntries.reduce((acc, e) => ({
    debit: acc.debit + e.debit,
    credit: acc.credit + e.credit,
  }), { debit: 0, credit: 0 });

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  function exportCSV() {
    const headers = 'Date,Type,Reference,Debit,Credit,Balance\n';
    const rows = ledgerEntries.map(e =>
      `${e.date},${e.type},${e.ref},${e.debit},${e.credit},${e.balance}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `party-ledger-${selectedCustomer?.name}-${fromDate}.csv`;
    a.click();
  }

  return (
    <div>
      <AdminPageHeader
        title="Party Ledger"
        subtitle="View account statement for any customer — invoices & payments"
      />
      <div className="p-6 flex gap-4">
        {/* Customer list */}
        <div className="w-72 bg-white rounded-xl border flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
          <div className="p-3 border-b">
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search customer..." />
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredCustomers.map(c => (
              <div key={c.id}
                onClick={() => { setSelectedCustomer(c); loadLedger(c.id); }}
                className={`px-4 py-3 cursor-pointer border-b hover:bg-gray-50 transition-colors ${selectedCustomer?.id === c.id ? 'bg-green-50 border-l-4 border-l-green-600' : ''}`}>
                <div className="font-medium text-sm">{c.name}</div>
                <div className="text-xs text-gray-400">{c.city || c.phone || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ledger panel */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Date filters */}
          <div className="flex gap-3 items-center bg-white rounded-xl border p-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm" />
            </div>
            <Button size="sm" variant="outline" onClick={() => selectedCustomer && loadLedger(selectedCustomer.id)}>
              <RefreshCw className="w-4 h-4 mr-1" />Apply
            </Button>
            {ledgerEntries.length > 0 && (
              <Button size="sm" variant="outline" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-1" />Export CSV
              </Button>
            )}
          </div>

          {!selectedCustomer ? (
            <div className="bg-white rounded-xl border flex items-center justify-center" style={{ height: 300 }}>
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">👈</div>
                <div className="text-sm">Select a customer to view their ledger</div>
              </div>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total Billed', value: fmt(totals.debit), icon: <TrendingUp className="w-5 h-5 text-blue-600" />, color: 'bg-blue-50 border-blue-200' },
                  { label: 'Total Received', value: fmt(totals.credit), icon: <TrendingDown className="w-5 h-5 text-green-600" />, color: 'bg-green-50 border-green-200' },
                  { label: 'Net Outstanding', value: fmt(totals.debit - totals.credit), icon: <span className="text-lg">💰</span>, color: (totals.debit - totals.credit) > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200' },
                ].map(c => (
                  <div key={c.label} className={`rounded-xl border p-4 flex items-center gap-3 ${c.color}`}>
                    {c.icon}
                    <div>
                      <div className="text-xs text-gray-500">{c.label}</div>
                      <div className="text-xl font-bold">{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ledger table */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50 font-semibold text-sm">
                  Account Ledger — {selectedCustomer.name}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 text-gray-500 font-medium">Date</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-medium">Type</th>
                        <th className="text-left px-4 py-2 text-gray-500 font-medium">Reference</th>
                        <th className="text-right px-4 py-2 text-gray-500 font-medium">Debit (₹)</th>
                        <th className="text-right px-4 py-2 text-gray-500 font-medium">Credit (₹)</th>
                        <th className="text-right px-4 py-2 text-gray-500 font-medium">Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
                      ) : ledgerEntries.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-400">No transactions in this period</td></tr>
                      ) : ledgerEntries.map((e, i) => (
                        <tr key={i} className={`border-b hover:bg-gray-50 ${e.type === 'payment' ? 'bg-green-50/30' : ''}`}>
                          <td className="px-4 py-2.5 text-gray-600">{e.date}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.type === 'payment' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                              {e.type === 'payment' ? `💵 Payment${e.mode ? ` (${e.mode})` : ''}` : '🧾 Invoice'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs">{e.ref}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-red-600">
                            {e.debit > 0 ? fmt(e.debit) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-green-600">
                            {e.credit > 0 ? fmt(e.credit) : '—'}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-bold ${e.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {fmt(Math.abs(e.balance))} {e.balance > 0 ? 'Dr' : 'Cr'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {ledgerEntries.length > 0 && (
                      <tfoot className="bg-gray-50 border-t-2 font-bold">
                        <tr>
                          <td colSpan={3} className="px-4 py-2.5 text-sm">TOTALS</td>
                          <td className="px-4 py-2.5 text-right text-red-600">{fmt(totals.debit)}</td>
                          <td className="px-4 py-2.5 text-right text-green-600">{fmt(totals.credit)}</td>
                          <td className={`px-4 py-2.5 text-right ${(totals.debit - totals.credit) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {fmt(Math.abs(totals.debit - totals.credit))} {(totals.debit - totals.credit) > 0 ? 'Dr' : 'Cr'}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
