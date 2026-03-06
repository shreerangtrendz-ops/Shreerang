import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function OutstandingReceivable() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    async function syncFromTally() {
        setSyncing(true);
        try {
            const res = await fetch('/api/tally-outstanding', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
            const json = await res.json();
            if (json.success) {
                alert(`✅ Synced ${json.synced} outstanding records from Tally`);
                fetchData();
            } else {
                alert('Tally offline or error: ' + (json.error || 'Check FRP tunnel'));
            }
        } catch(e) { alert('Error: ' + e.message); }
        finally { setSyncing(false); }
    }
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // all | overdue | current

    useEffect(() => { fetchData(); }, []);

    async function fetchData() {
        setLoading(true);
        const { data: rows, error } = await supabase
            .from('outstanding_receivable')
            .select('*')
            .order('outstanding_amount', { ascending: false });
        if (!error) setData(rows || []);
        setLoading(false);
    }

    const filtered = data.filter(r => {
        const matchSearch = r.customer_name?.toLowerCase().includes(search.toLowerCase());
        if (filter === 'overdue') return matchSearch && r.max_days_overdue > 0;
        if (filter === 'current') return matchSearch && r.max_days_overdue <= 0;
        return matchSearch;
    });

    const totalOutstanding = filtered.reduce((s, r) => s + Number(r.outstanding_amount || 0), 0);
    const totalOverdue = filtered.filter(r => r.max_days_overdue > 0)
        .reduce((s, r) => s + Number(r.outstanding_amount || 0), 0);

    function getAgingColor(days) {
        if (!days || days <= 0) return 'bg-green-100 text-green-800';
        if (days <= 30) return 'bg-blue-100 text-blue-800';
        if (days <= 60) return 'bg-yellow-100 text-yellow-800';
        if (days <= 90) return 'bg-orange-100 text-orange-800';
        return 'bg-red-100 text-red-800';
    }

    function formatCurrency(n) {
        return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    function sendWhatsApp(customer, amount) {
        const msg = encodeURIComponent(
            `Dear ${customer},\n\nThis is a gentle reminder that ₹${Number(amount).toLocaleString('en-IN')} is outstanding in your account with Shreerang Trendz.\n\nKindly arrange payment at your earliest convenience.\n\nRegards,\nShreerang Trendz Pvt. Ltd.\n📞 7874200066`
        );
        window.open(`https://wa.me/?text=${msg}`, '_blank');
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Outstanding Receivable</h1>
                    <button onClick={syncFromTally} disabled={syncing}
                        className="px-4 py-2 rounded-lg text-white text-sm font-bold"
                        style={{ background: syncing ? '#999' : 'linear-gradient(135deg,#3DBFAE,#2BA898)', cursor: syncing ? 'wait':'pointer' }}>
                        {syncing ? '⏳ Syncing…' : '↻ Sync from Tally'}
                    </button>
                </div>
                <p className="text-gray-500 text-sm mt-1">Money owed TO Shreerang Trendz by customers</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm text-gray-500">Total Outstanding</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalOutstanding)}</p>
                    <p className="text-xs text-gray-400 mt-1">{filtered.length} customers</p>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-200 p-5">
                    <p className="text-sm text-red-600">Overdue Amount</p>
                    <p className="text-2xl font-bold text-red-700 mt-1">{formatCurrency(totalOverdue)}</p>
                    <p className="text-xs text-red-400 mt-1">{filtered.filter(r => r.max_days_overdue > 0).length} customers overdue</p>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-200 p-5">
                    <p className="text-sm text-green-600">Within Credit Period</p>
                    <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totalOutstanding - totalOverdue)}</p>
                    <p className="text-xs text-green-400 mt-1">{filtered.filter(r => r.max_days_overdue <= 0).length} customers current</p>
                </div>
            </div>

            {/* Aging Buckets Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">Aging Summary</p>
                <div className="grid grid-cols-5 gap-3 text-center">
                    {[
                        { label: '0–30 days', color: 'bg-blue-500', filter: r => r.max_days_overdue >= 0 && r.max_days_overdue <= 30 },
                        { label: '31–60 days', color: 'bg-yellow-500', filter: r => r.max_days_overdue > 30 && r.max_days_overdue <= 60 },
                        { label: '61–90 days', color: 'bg-orange-500', filter: r => r.max_days_overdue > 60 && r.max_days_overdue <= 90 },
                        { label: '91–120 days', color: 'bg-red-400', filter: r => r.max_days_overdue > 90 && r.max_days_overdue <= 120 },
                        { label: '120+ days', color: 'bg-red-700', filter: r => r.max_days_overdue > 120 },
                    ].map(bucket => {
                        const bucketAmt = data.filter(bucket.filter).reduce((s, r) => s + Number(r.outstanding_amount || 0), 0);
                        const bucketCnt = data.filter(bucket.filter).length;
                        return (
                            <div key={bucket.label} className="rounded-lg bg-gray-50 p-3">
                                <div className={`w-3 h-3 rounded-full ${bucket.color} mx-auto mb-2`}></div>
                                <p className="text-xs text-gray-500">{bucket.label}</p>
                                <p className="text-sm font-bold text-gray-800">{formatCurrency(bucketAmt)}</p>
                                <p className="text-xs text-gray-400">{bucketCnt} parties</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Filters + Search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                    type="text"
                    placeholder="Search customer..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                    {['all', 'overdue', 'current'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600'
                                }`}
                        >{f}</button>
                    ))}
                </div>
                <button
                    onClick={fetchData}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600"
                >↻ Refresh</button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No outstanding records found</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">#</th>
                                <th className="text-left px-4 py-3 text-gray-600 font-medium">Customer</th>
                                <th className="text-right px-4 py-3 text-gray-600 font-medium">Total Billed</th>
                                <th className="text-right px-4 py-3 text-gray-600 font-medium">Received</th>
                                <th className="text-right px-4 py-3 text-gray-600 font-medium">Outstanding</th>
                                <th className="text-center px-4 py-3 text-gray-600 font-medium">Overdue Days</th>
                                <th className="text-center px-4 py-3 text-gray-600 font-medium">Last Payment</th>
                                <th className="text-center px-4 py-3 text-gray-600 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((row, i) => (
                                <tr key={row.customer_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-gray-900">{row.customer_name}</p>
                                        <p className="text-xs text-gray-400">{row.tally_ledger_name || '—'}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(row.total_billed)}</td>
                                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(row.total_received)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(row.outstanding_amount)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAgingColor(row.max_days_overdue)}`}>
                                            {row.max_days_overdue > 0 ? `${row.max_days_overdue} days` : 'Current'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-500 text-xs">
                                        {row.last_payment_date ? new Date(row.last_payment_date).toLocaleDateString('en-IN') : 'Never'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => sendWhatsApp(row.customer_name, row.outstanding_amount)}
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
