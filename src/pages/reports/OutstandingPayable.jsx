import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function OutstandingPayable() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    useEffect(() => { fetchData(); }, []);

    async function fetchData() {
        setLoading(true);
        // Pull from purchase_fabric grouped by supplier
        const { data: rows, error } = await supabase
            .from('purchase_fabric')
            .select(`
        id, supplier_name, invoice_date, total_amount,
        amount_paid, due_date, status, tally_voucher_no
      `)
            .order('invoice_date', { ascending: false });

        if (!error) {
            // Group by supplier
            const grouped = {};
            for (const row of (rows || [])) {
                const key = row.supplier_name || 'Unknown';
                if (!grouped[key]) {
                    grouped[key] = {
                        supplier_name: key,
                        total_billed: 0,
                        total_paid: 0,
                        bills: [],
                        oldest_bill_date: row.invoice_date,
                    };
                }
                grouped[key].total_billed += Number(row.total_amount || 0);
                grouped[key].total_paid += Number(row.amount_paid || 0);
                grouped[key].bills.push(row);
                if (row.invoice_date < grouped[key].oldest_bill_date) {
                    grouped[key].oldest_bill_date = row.invoice_date;
                }
            }
            const result = Object.values(grouped).map(s => ({
                ...s,
                outstanding: s.total_billed - s.total_paid,
                days_pending: s.oldest_bill_date
                    ? Math.floor((new Date() - new Date(s.oldest_bill_date)) / 86400000)
                    : 0,
            })).filter(s => s.outstanding > 0)
                .sort((a, b) => b.outstanding - a.outstanding);
            setData(result);
        }
        setLoading(false);
    }

    const filtered = data.filter(r => {
        const match = r.supplier_name?.toLowerCase().includes(search.toLowerCase());
        if (filter === 'overdue') return match && r.days_pending > 30;
        if (filter === 'current') return match && r.days_pending <= 30;
        return match;
    });

    const totalPayable = filtered.reduce((s, r) => s + r.outstanding, 0);

    function formatCurrency(n) {
        return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    function getAgingColor(days) {
        if (days <= 15) return 'bg-green-100 text-green-800';
        if (days <= 30) return 'bg-blue-100 text-blue-800';
        if (days <= 60) return 'bg-yellow-100 text-yellow-800';
        if (days <= 90) return 'bg-orange-100 text-orange-800';
        return 'bg-red-100 text-red-800';
    }

    function sendWhatsApp(supplier, amount) {
        const msg = encodeURIComponent(
            `Dear ${supplier},\n\nWe acknowledge an outstanding payment of ${formatCurrency(amount)} is due to you.\n\nWe will process your payment shortly.\n\nRegards,\nShreerang Trendz Pvt. Ltd.\n📞 7874200066`
        );
        window.open(`https://wa.me/?text=${msg}`, '_blank');
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Outstanding Payable</h1>
                <p className="text-gray-500 text-sm mt-1">Money Shreerang Trendz owes TO suppliers</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm text-gray-500">Total Payable</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalPayable)}</p>
                    <p className="text-xs text-gray-400 mt-1">{filtered.length} suppliers</p>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-200 p-5">
                    <p className="text-sm text-red-600">Overdue (30+ days)</p>
                    <p className="text-2xl font-bold text-red-700 mt-1">
                        {formatCurrency(filtered.filter(r => r.days_pending > 30).reduce((s, r) => s + r.outstanding, 0))}
                    </p>
                    <p className="text-xs text-red-400 mt-1">
                        {filtered.filter(r => r.days_pending > 30).length} suppliers
                    </p>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-200 p-5">
                    <p className="text-sm text-green-600">Within 30 Days</p>
                    <p className="text-2xl font-bold text-green-700 mt-1">
                        {formatCurrency(filtered.filter(r => r.days_pending <= 30).reduce((s, r) => s + r.outstanding, 0))}
                    </p>
                    <p className="text-xs text-green-400 mt-1">
                        {filtered.filter(r => r.days_pending <= 30).length} suppliers
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                    type="text"
                    placeholder="Search supplier..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                    {['all', 'overdue', 'current'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600'
                                }`}>{f}</button>
                    ))}
                </div>
                <button onClick={fetchData}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600">
                    ↻ Refresh
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        <p className="text-2xl mb-2">✅</p>
                        <p>No outstanding payables — all suppliers paid!</p>
                        <p className="text-xs mt-2">Data populates from Tally sync → purchase_fabric table</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">#</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Supplier</th>
                                <th className="text-right px-4 py-3 text-gray-600 font-medium">Total Billed</th>
                                <th className="text-right px-4 py-3 text-gray-600 font-medium">Paid</th>
                                <th className="text-right px-4 py-3 text-gray-600 font-medium">Outstanding</th>
                                <th className="text-center px-4 py-3 text-gray-600 font-medium">Pending Days</th>
                                <th className="text-center px-4 py-3 text-gray-600 font-medium">Bills</th>
                                <th className="text-center px-4 py-3 text-gray-600 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((row, i) => (
                                <tr key={row.supplier_name} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-gray-900">{row.supplier_name}</p>
                                        <p className="text-xs text-gray-400">
                                            Oldest: {row.oldest_bill_date
                                                ? new Date(row.oldest_bill_date).toLocaleDateString('en-IN')
                                                : '—'}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(row.total_billed)}</td>
                                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(row.total_paid)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(row.outstanding)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAgingColor(row.days_pending)}`}>
                                            {row.days_pending} days
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-500">{row.bills.length}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => sendWhatsApp(row.supplier_name, row.outstanding)}
                                            className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-lg"
                                        >📱 WhatsApp</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
