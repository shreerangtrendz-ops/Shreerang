import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, Package, Warehouse, ChevronDown, ChevronRight } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { useToast } from '@/components/ui/use-toast';
import { syncStockFromTally } from '@/services/TallySyncService';

const THRESHOLD_RED  = 50;   // <50m = critical
const THRESHOLD_WARN = 200;  // <200m = low

function StockBadge({ qty }) {
  if (qty <= 0)           return <Badge className="bg-gray-100 text-gray-500 border">Out of Stock</Badge>;
  if (qty < THRESHOLD_RED)  return <Badge className="bg-red-100 text-red-700 border border-red-200">Critical</Badge>;
  if (qty < THRESHOLD_WARN) return <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200">Low</Badge>;
  return <Badge className="bg-green-100 text-green-700 border border-green-200">In Stock</Badge>;
}

function GodownBreakdown({ godowns }) {
  if (!godowns || godowns.length === 0) return (
    <span className="text-xs text-gray-400 italic">No godown detail</span>
  );
  return (
    <div className="flex flex-wrap gap-1">
      {godowns.map((g, i) => (
        <span key={i} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
          <Warehouse className="w-2.5 h-2.5" />
          <span className="font-medium">{g.godown}</span>
          <span className="text-blue-500">— {Number(g.quantity).toLocaleString('en-IN')}m</span>
        </span>
      ))}
    </div>
  );
}

export default function LiveStockPage() {
  const { toast } = useToast();
  const [stock, setStock]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [syncing, setSyncing]   = useState(false);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [expanded, setExpanded] = useState({});
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => { fetchStock(); }, []);

  async function fetchStock() {
    setLoading(true);
    const { data, error } = await supabase
      .from('fabric_stock_live')
      .select('id, fabric_name, fabric_sku, closing_qty_mtrs, tally_group, godown_balances, sync_date, last_tally_sync')
      .order('closing_qty_mtrs');
    if (error) toast({ variant: 'destructive', description: error.message });
    else {
      setStock(data || []);
      if (data?.length) setLastSync(data[0].last_tally_sync);
    }
    setLoading(false);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await syncStockFromTally();
      toast({ title: '✅ Stock Synced from Tally', description: `${result.stock || 0} items updated.` });
      await fetchStock();
    } catch (e) {
      toast({ variant: 'destructive', description: e.message });
    }
    setSyncing(false);
  }

  const filtered = stock.filter(s => {
    const matchSearch = !search ||
      s.fabric_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.fabric_sku?.toLowerCase().includes(search.toLowerCase()) ||
      s.tally_group?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'critical') return s.closing_qty_mtrs < THRESHOLD_RED;
    if (filter === 'low')      return s.closing_qty_mtrs >= THRESHOLD_RED && s.closing_qty_mtrs < THRESHOLD_WARN;
    if (filter === 'ok')       return s.closing_qty_mtrs >= THRESHOLD_WARN;
    if (filter === 'out')      return s.closing_qty_mtrs <= 0;
    return true;
  });

  const totals = {
    items: stock.length,
    totalMtrs: stock.reduce((s, r) => s + (r.closing_qty_mtrs || 0), 0),
    critical: stock.filter(r => r.closing_qty_mtrs > 0 && r.closing_qty_mtrs < THRESHOLD_RED).length,
    out: stock.filter(r => r.closing_qty_mtrs <= 0).length,
  };

  const toggleRow = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div>
      <Helmet><title>Live Stock — Shreerang Trendz</title></Helmet>
      <AdminPageHeader
        title="Live Stock"
        subtitle={lastSync ? `Last synced: ${new Date(lastSync).toLocaleString('en-IN')}` : 'Synced from Tally Prime'}
        actions={
          <Button onClick={handleSync} disabled={syncing} className="bg-green-700 hover:bg-green-800 text-white">
            <RefreshCw className={`w-4 h-4 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync from Tally'}
          </Button>
        }
      />
      <div className="p-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Items',   value: totals.items,                           color: 'text-gray-800' },
            { label: 'Total Metres',  value: `${totals.totalMtrs.toLocaleString('en-IN')}m`, color: 'text-blue-700' },
            { label: 'Critical Stock',value: totals.critical,                        color: 'text-red-600' },
            { label: 'Out of Stock',  value: totals.out,                             color: 'text-gray-400' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white border rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{kpi.label}</p>
              <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search fabric, SKU, group…" className="pl-9" />
          </div>
          {['all','critical','low','ok','out'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors border
                ${filter === f ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {f === 'all' ? 'All' : f === 'critical' ? '🔴 Critical' : f === 'low' ? '🟡 Low' : f === 'ok' ? '🟢 OK' : '⬛ Out'}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400">{filtered.length} items</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-6"></th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Fabric Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">SKU</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Group</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Stock (Mtrs)</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Godowns</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Sync Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400">Loading stock…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400">No items found</td></tr>
              ) : filtered.map(row => {
                const hasGodowns = row.godown_balances?.length > 0;
                const isExpanded = expanded[row.id];
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      className={`border-b ${row.closing_qty_mtrs <= 0 ? 'bg-gray-50 opacity-60' : row.closing_qty_mtrs < THRESHOLD_RED ? 'bg-red-50/40' : 'hover:bg-gray-50'} transition-colors`}
                    >
                      <td className="px-4 py-3">
                        {hasGodowns && (
                          <button onClick={() => toggleRow(row.id)} className="text-gray-400 hover:text-blue-600 transition-colors">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-900 max-w-[220px] truncate">{row.fabric_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.fabric_sku}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{row.tally_group || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-base">
                        {Number(row.closing_qty_mtrs || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3"><StockBadge qty={row.closing_qty_mtrs} /></td>
                      <td className="px-4 py-3">
                        {hasGodowns ? (
                          <button onClick={() => toggleRow(row.id)} className="text-xs text-blue-600 hover:underline">
                            {row.godown_balances.length} godown{row.godown_balances.length > 1 ? 's' : ''}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{row.sync_date}</td>
                    </tr>
                    {isExpanded && hasGodowns && (
                      <tr className="bg-blue-50/30 border-b">
                        <td></td>
                        <td colSpan={7} className="px-4 py-2.5">
                          <GodownBreakdown godowns={row.godown_balances} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Low stock alert banner */}
        {totals.critical > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-red-500 text-lg">⚠️</span>
            <p className="text-sm text-red-700 font-medium">
              {totals.critical} fabric{totals.critical > 1 ? 's are' : ' is'} critically low. Sync Tally for latest balances.
            </p>
            <button onClick={handleSync} disabled={syncing} className="ml-auto text-xs font-semibold text-red-600 underline hover:no-underline">
              Re-sync now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
