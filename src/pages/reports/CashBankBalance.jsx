import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function CashBankBalance() {
    const [balances, setBalances] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('today');

    useEffect(() => { fetchData(); }, []);

    async function fetchData() {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Today's balances
        const { data: todayData } = await supabase
            .from('cash_bank_ledger')
            .select('*')
            .eq('balance_date', today)
            .order('account_type');

        // 7-day history for chart
        const { data: histData } = await supabase
            .from('cash_bank_ledger')
            .select('*')
            .gte('balance_date', sevenDaysAgo)
            .order('balance_date', { ascending: true });

        setBalances(todayData || []);
        setHistory(histData || []);
        setLoading(false);
    }

    function formatCurrency(n) {
        return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    const totalCash = balances
        .filter(b => b.account_type === 'cash')
        .reduce((s, b) => s + Number(b.balance || 0), 0);

    const totalBank = balances
        .filter(b => b.account_type === 'bank')
        .reduce((s, b) => s + Number(b.balance || 0), 0);

    const totalBalance = totalCash + totalBank;

    // Group history by date for mini chart
    const dateGroups = {};
    for (const row of history) {
        if (!dateGroups[row.balance_date]) dateGroups[row.balance_date] = 0;
        dateGroups[row.balance_date] += Number(row.balance || 0);
    }
    const chartDates = Object.keys(dateGroups).sort();
    const chartValues = chartDates.map(d => dateGroups[d]);
    const maxVal = Math.max(...chartValues, 1);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Cash & Bank Balance</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Live balances synced from Tally · Updated daily
                </p>
            </div>

            {loading ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-900 rounded-xl p-5 text-white">
                            <p className="text-sm text-gray-400">Total Available</p>
                            <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
                            <p className="text-xs text-gray-500 mt-1">Cash + All Banks</p>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">💵</span>
                                <p className="text-sm text-green-700 font-medium">Cash in Hand</p>
                            </div>
                            <p className="text-2xl font-bold text-green-800">{formatCurrency(totalCash)}</p>
                            <p className="text-xs text-green-500 mt-1">
                                {balances.filter(b => b.account_type === 'cash').length} cash account(s)
                            </p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">🏦</span>
                                <p className="text-sm text-blue-700 font-medium">Bank Balance</p>
                            </div>
                            <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalBank)}</p>
                            <p className="text-xs text-blue-500 mt-1">
                                {balances.filter(b => b.account_type === 'bank').length} bank account(s)
                            </p>
                        </div>
                    </div>

                    {/* 7-Day Chart */}
                    {chartDates.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
                            <h3 className="font-semibold text-gray-900 mb-4">7-Day Cash Movement</h3>
                            <div className="flex items-end gap-2 h-24">
                                {chartDates.map((date, i) => (
                                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                                        <p className="text-xs text-gray-500">
                                            {formatCurrency(chartValues[i])}
                                        </p>
                                        <div
                                            className="w-full bg-blue-500 rounded-t"
                                            style={{ height: `${(chartValues[i] / maxVal) * 60}px`, minHeight: '4px' }}
                                        />
                                        <p className="text-xs text-gray-400">
                                            {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Account Breakdown */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900">Account-wise Balance</h3>
                        </div>
                        {balances.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <p className="text-2xl mb-2">📊</p>
                                <p className="text-sm">No balance data yet</p>
                                <p className="text-xs mt-2 text-gray-300">
                                    Balances will appear after Tally sync
                                </p>
                                <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-left max-w-sm mx-auto">
                                    <p className="text-xs font-semibold text-amber-800">To populate this page:</p>
                                    <p className="text-xs text-amber-700 mt-1">
                                        Run this SQL in Supabase to manually enter today's balance from Tally:
                                    </p>
                                    <code className="text-xs text-amber-900 block mt-2 bg-amber-100 p-2 rounded">
                                        INSERT INTO cash_bank_ledger (account_name, account_type, balance, balance_date, synced_from_tally){'\n'}
                                        VALUES{'\n'}
                                        ('Cash', 'cash', 0, CURRENT_DATE, false),{'\n'}
                                        ('HDFC Bank', 'bank', 0, CURRENT_DATE, false);
                                    </code>
                                </div>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Account</th>
                                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Type</th>
                                        <th className="text-right px-4 py-3 text-gray-500 font-medium">Balance</th>
                                        <th className="text-center px-4 py-3 text-gray-500 font-medium">Source</th>
                                        <th className="text-center px-4 py-3 text-gray-500 font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {balances.map(acc => (
                                        <tr key={acc.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{acc.account_name}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${acc.account_type === 'cash'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {acc.account_type === 'cash' ? '💵 Cash' : '🏦 Bank'}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${Number(acc.balance) >= 0 ? 'text-gray-900' : 'text-red-600'
                                                }`}>
                                                {formatCurrency(acc.balance)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {acc.synced_from_tally
                                                    ? <span className="text-xs text-green-600">✅ Tally</span>
                                                    : <span className="text-xs text-gray-400">Manual</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-400 text-xs">
                                                {new Date(acc.balance_date).toLocaleDateString('en-IN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Quick Entry */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                        <h3 className="font-semibold text-amber-900 mb-1">
                            💡 No Tally sync for cash/bank yet?
                        </h3>
                        <p className="text-sm text-amber-700">
                            Run this SQL daily until automatic sync is set up.
                            Replace the 0 values with today's actual balances from Tally:
                        </p>
                        <pre className="mt-3 bg-amber-100 rounded-lg p-3 text-xs text-amber-900 overflow-x-auto">
                            {`INSERT INTO cash_bank_ledger 
  (account_name, account_type, balance, balance_date, synced_from_tally)
VALUES
  ('Cash',      'cash', 0, CURRENT_DATE, false),
  ('HDFC Bank', 'bank', 0, CURRENT_DATE, false),
  ('SBI',       'bank', 0, CURRENT_DATE, false)
ON CONFLICT (account_name, balance_date) 
DO UPDATE SET balance = EXCLUDED.balance;`}
                        </pre>
                    </div>
                </>
            )}
        </div>
    );
}
