import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const FY_YEARS = [2022, 2023, 2024, 2025, 2026];
const PAGE_SIZE = 50;

const FMT_INR = (v) => {
  if (v == null || v === '') return '—';
  const n = Math.abs(Number(v));
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const FMT_NUM = (v, dec = 1) => {
  if (v == null) return '—';
  return Number(v).toLocaleString('en-IN', { maximumFractionDigits: dec });
};

const FMT_DATE = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
};

const NEGATIVE_HINT = "⚠ Negative = cost to P&L (money paid OUT to mill)";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color = 'teal', warn }) {
  const borderMap = { teal: 'border-teal-500', red: 'border-red-500', amber: 'border-amber-500', blue: 'border-blue-500', purple: 'border-purple-500', green: 'border-green-500' };
  return (
    <div className={`bg-white rounded-xl border-t-4 ${borderMap[color]} shadow-sm p-4 min-w-[140px]`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      {warn && <p className="text-xs text-amber-600 mt-1">{warn}</p>}
    </div>
  );
}

function FYTabs({ activeFY, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {FY_YEARS.map(yr => (
        <button
          key={yr}
          onClick={() => onChange(yr)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeFY === yr
              ? 'bg-teal-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          FY {yr}-{(yr + 1).toString().slice(-2)}
        </button>
      ))}
    </div>
  );
}

function Pagination({ page, total, onPage }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
      <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}</span>
      <div className="flex gap-2">
        <button onClick={() => onPage(page - 1)} disabled={page === 0} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">←</button>
        <span className="px-3 py-1">Page {page + 1} / {totalPages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages - 1} className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50">→</button>
      </div>
    </div>
  );
}

function LoadingRow({ cols }) {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="animate-pulse">
      {Array.from({ length: cols }).map((__, j) => (
        <td key={j} className="px-3 py-2"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
      ))}
    </tr>
  ));
}

function EmptyRow({ cols, msg = 'No records found' }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-gray-400 text-sm">{msg}</td>
    </tr>
  );
}

function NegativeTag({ val }) {
  if (val == null) return <span className="text-gray-400">—</span>;
  const n = Number(val);
  const color = n < 0 ? 'text-red-600' : 'text-gray-800';
  return <span className={color}>{FMT_INR(val)}{n < 0 ? '' : ''}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — GREY PURCHASE
// ─────────────────────────────────────────────────────────────────────────────
function GreyPurchaseTab() {
  const [activeFY, setActiveFY] = useState(2025);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({ bills: 0, metres: 0, amount: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const from = `${activeFY}-04-01`, to = `${activeFY + 1}-03-31`;
    let q = supabase.from('grey_purchase')
      .select('*', { count: 'exact' })
      .gte('voucher_date', from).lte('voucher_date', to)
      .order('voucher_date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (search) q = q.or(`lot_no.ilike.%${search}%,supplier_name.ilike.%${search}%,supplier_invoice_no.ilike.%${search}%`);
    const { data, count } = await q;
    setRows(data || []);
    setTotal(count || 0);

    // summary
    let sq = supabase.from('grey_purchase').select('actual_qty_mtrs,total_amount').gte('voucher_date', from).lte('voucher_date', to);
    if (search) sq = sq.or(`lot_no.ilike.%${search}%,supplier_name.ilike.%${search}%,supplier_invoice_no.ilike.%${search}%`);
    const { data: sd } = await sq;
    if (sd) setSummary({ bills: sd.length, metres: sd.reduce((s, r) => s + (r.actual_qty_mtrs || 0), 0), amount: sd.reduce((s, r) => s + (r.total_amount || 0), 0) });
    setLoading(false);
  }, [activeFY, page, search]);

  useEffect(() => { load(); }, [load]);
  const handleFY = (yr) => { setActiveFY(yr); setPage(0); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 justify-between items-start">
        <FYTabs activeFY={activeFY} onChange={handleFY} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search lot no, supplier, invoice…" className="border rounded-lg px-3 py-2 text-sm w-64" />
      </div>
      <div className="flex flex-wrap gap-3">
        <SummaryCard label="Total Bills" value={summary.bills.toLocaleString()} color="blue" />
        <SummaryCard label="Total Metres" value={`${FMT_NUM(summary.metres, 0)} m`} color="teal" />
        <SummaryCard label="Total Amount (incl GST)" value={FMT_INR(summary.amount)} color="green" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Voucher Date','Supplier Name','Supplier Inv No','Inv Date','Lot No (KEY 1)','Item Name','Taka/Pcs','Actual Qty (m)','Billed Qty (m)','Rate/m','Item Amt','Total Amt (GST)','Godown','Broker','Comm %','Narration'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? <LoadingRow cols={16} /> : rows.length === 0 ? <EmptyRow cols={16} /> : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">{FMT_DATE(r.voucher_date)}</td>
                <td className="px-3 py-2 font-medium text-gray-800 max-w-[180px] truncate" title={r.supplier_name}>{r.supplier_name}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.supplier_invoice_no}</td>
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{FMT_DATE(r.supplier_invoice_date)}</td>
                <td className="px-3 py-2 font-mono text-teal-700 font-semibold whitespace-nowrap">{r.lot_no}</td>
                <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate" title={r.item_name}>{r.item_name}</td>
                <td className="px-3 py-2 text-center">{r.taka_pcs}</td>
                <td className="px-3 py-2 text-right">{FMT_NUM(r.actual_qty_mtrs)}</td>
                <td className="px-3 py-2 text-right text-gray-500">{FMT_NUM(r.billed_qty_mtrs)}</td>
                <td className="px-3 py-2 text-right font-medium">₹{r.rate}</td>
                <td className="px-3 py-2 text-right">{FMT_INR(r.item_amount)}</td>
                <td className="px-3 py-2 text-right font-semibold text-green-700">{FMT_INR(r.total_amount)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.godown_name}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.broker_name}</td>
                <td className="px-3 py-2 text-right text-xs">{r.comm_rate ? `${r.comm_rate}%` : '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-400 max-w-[120px] truncate" title={r.narration}>{r.narration}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={total} onPage={setPage} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — ISSUE TO MILL
// ─────────────────────────────────────────────────────────────────────────────
function IssueToMillTab() {
  const [activeFY, setActiveFY] = useState(2025);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({ records: 0, metres: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const from = `${activeFY}-04-01`, to = `${activeFY + 1}-03-31`;
    let q = supabase.from('issue_to_mill')
      .select('*', { count: 'exact' })
      .gte('voucher_date', from).lte('voucher_date', to)
      .order('voucher_date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (search) q = q.or(`lot_no.ilike.%${search}%,destination_godown.ilike.%${search}%,item_name.ilike.%${search}%`);
    const { data, count } = await q;
    setRows(data || []);
    setTotal(count || 0);

    let sq = supabase.from('issue_to_mill').select('batch_qty_mtrs').gte('voucher_date', from).lte('voucher_date', to);
    if (search) sq = sq.or(`lot_no.ilike.%${search}%,destination_godown.ilike.%${search}%`);
    const { data: sd } = await sq;
    if (sd) setSummary({ records: sd.length, metres: sd.reduce((s, r) => s + (r.batch_qty_mtrs || 0), 0) });
    setLoading(false);
  }, [activeFY, page, search]);

  useEffect(() => { load(); }, [load]);
  const handleFY = (yr) => { setActiveFY(yr); setPage(0); };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        ⚠ <strong>NOTE:</strong> qty_mtrs is 0 for many entries. Use batch_qty_mtrs or join grey_purchase via lot_no for actual metres issued.
      </div>
      <div className="flex flex-wrap gap-4 justify-between items-start">
        <FYTabs activeFY={activeFY} onChange={handleFY} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search lot no, mill godown, item…" className="border rounded-lg px-3 py-2 text-sm w-64" />
      </div>
      <div className="flex flex-wrap gap-3">
        <SummaryCard label="Records" value={summary.records.toLocaleString()} color="blue" />
        <SummaryCard label="Batch Qty (m)" value={`${FMT_NUM(summary.metres, 0)} m`} color="amber" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Voucher Date','Tally Vch No','Lot No (KEY 1)','Destination Godown (Mill)','Source Godown','Item Name','Stage No','Is Sampling','Taka/Pcs','Qty (m)','Batch Qty (m)','Rate','Amount','Process Type','Narration'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? <LoadingRow cols={15} /> : rows.length === 0 ? <EmptyRow cols={15} /> : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">{FMT_DATE(r.voucher_date)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.tally_voucher_no}</td>
                <td className="px-3 py-2 font-mono text-teal-700 font-semibold whitespace-nowrap">{r.lot_no}</td>
                <td className="px-3 py-2 font-medium text-gray-800 max-w-[160px] truncate" title={r.destination_godown}>{r.destination_godown}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.godown_name}</td>
                <td className="px-3 py-2 text-gray-700 max-w-[140px] truncate" title={r.item_name}>{r.item_name}</td>
                <td className="px-3 py-2 text-center">
                  {r.stage_no && r.stage_no > 1 ? <span className="bg-purple-100 text-purple-700 rounded px-1.5 py-0.5 text-xs font-semibold">S{r.stage_no}</span> : r.stage_no || '1'}
                </td>
                <td className="px-3 py-2 text-center">
                  {r.is_sampling ? <span className="bg-orange-100 text-orange-700 rounded px-1.5 text-xs">Sample</span> : '—'}
                </td>
                <td className="px-3 py-2 text-center">{r.taka_pcs}</td>
                <td className="px-3 py-2 text-right text-gray-400">{r.qty_mtrs === 0 ? <span className="text-red-400">0⚠</span> : FMT_NUM(r.qty_mtrs)}</td>
                <td className="px-3 py-2 text-right font-medium">{FMT_NUM(r.batch_qty_mtrs)}</td>
                <td className="px-3 py-2 text-right">₹{r.rate}</td>
                <td className="px-3 py-2 text-right">{FMT_INR(r.amount)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.process_type}</td>
                <td className="px-3 py-2 text-xs text-gray-400 max-w-[120px] truncate" title={r.narration}>{r.narration}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={total} onPage={setPage} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3 — REC FROM MILL
// ─────────────────────────────────────────────────────────────────────────────
function RecFromMillTab() {
  const [activeFY, setActiveFY] = useState(2025);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [millFilter, setMillFilter] = useState('');
  const [summary, setSummary] = useState({ records: 0, issued: 0, finished: 0, jobCost: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const from = `${activeFY}-04-01`, to = `${activeFY + 1}-03-31`;
    let q = supabase.from('rec_from_mill')
      .select('*', { count: 'exact' })
      .gte('voucher_date', from).lte('voucher_date', to)
      .order('voucher_date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (search) q = q.or(`grey_lot_no.ilike.%${search}%,design_no.ilike.%${search}%,party_challan_no.ilike.%${search}%`);
    if (millFilter) q = q.ilike('job_godown', `%${millFilter}%`);
    const { data, count } = await q;
    setRows(data || []);
    setTotal(count || 0);

    let sq = supabase.from('rec_from_mill').select('grey_issued_qty_mtrs,finish_qty_mtrs,job_amount').gte('voucher_date', from).lte('voucher_date', to);
    if (search) sq = sq.or(`grey_lot_no.ilike.%${search}%,design_no.ilike.%${search}%`);
    if (millFilter) sq = sq.ilike('job_godown', `%${millFilter}%`);
    const { data: sd } = await sq;
    if (sd) setSummary({
      records: sd.length,
      issued: sd.reduce((s, r) => s + (r.grey_issued_qty_mtrs || 0), 0),
      finished: sd.reduce((s, r) => s + (r.finish_qty_mtrs || 0), 0),
      jobCost: sd.reduce((s, r) => s + (r.job_amount || 0), 0),
    });
    setLoading(false);
  }, [activeFY, page, search, millFilter]);

  useEffect(() => { load(); }, [load]);
  const handleFY = (yr) => { setActiveFY(yr); setPage(0); };

  return (
    <div className="space-y-4">
      {/* Explanation Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
        <p className="text-sm font-semibold text-blue-900">📋 REC FROM MILL — How it works</p>
        <p className="text-xs text-blue-800">This is a <strong>Stock Journal</strong> in Tally with TWO sides:</p>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-blue-100 rounded-lg p-3">
            <p className="text-xs font-bold text-blue-900">⬅ SOURCE (Left / Consumption)</p>
            <p className="text-xs text-blue-700 mt-1">Grey fabric LEAVING the mill godown.</p>
            <ul className="text-xs text-blue-700 mt-1 space-y-0.5">
              <li>• Grey Lot No = <strong>KEY 1</strong> (links to grey_purchase)</li>
              <li>• Grey Issued Qty = metres sent to mill</li>
              <li>• Job Rate UDF = processing rate/mtr</li>
              <li>• <strong>Job Amount = NEGATIVE</strong> (cost paid to mill)</li>
            </ul>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs font-bold text-green-900">➡ DESTINATION (Right / Production)</p>
            <p className="text-xs text-green-700 mt-1">Finished fabric ARRIVING at Main Location.</p>
            <ul className="text-xs text-green-700 mt-1 space-y-0.5">
              <li>• <strong>Design No = KEY 3 (born here!)</strong></li>
              <li>• Finish Qty = metres received back</li>
              <li>• Shortage = issued − finished (waste → cost rises)</li>
              <li>• Cumulative Cost/Mtr = grey rate + job rate</li>
            </ul>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-2">
          <p className="text-xs text-red-800"><strong>❓ Why is job_amount NEGATIVE?</strong> In Tally's P&L, the job processing cost is a <em>deduction</em> / expense that reduces profit. Tally records it as a credit (negative) against the fabric asset. A negative job_amount like ₹-24,208 means you PAID that amount to the mill for processing. <strong>Always use Math.abs(job_amount)</strong> when showing cost figures. The formula: Cost/mtr = grey_purchase_rate + |job_rate|</p>
        </div>
        <p className="text-xs text-amber-700">⚠ <strong>Known Bug:</strong> party_challan_no currently stores Reference No (= your lot no) instead of Party Ch. No (= mill's own challan). n8n v28 fix pending. party_challan_no highlighted in amber below.</p>
      </div>

      <div className="flex flex-wrap gap-4 justify-between items-start">
        <FYTabs activeFY={activeFY} onChange={handleFY} />
        <div className="flex gap-2">
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search lot no, design no…" className="border rounded-lg px-3 py-2 text-sm w-52" />
          <input value={millFilter} onChange={e => { setMillFilter(e.target.value); setPage(0); }} placeholder="Filter by mill…" className="border rounded-lg px-3 py-2 text-sm w-44" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <SummaryCard label="Records" value={summary.records.toLocaleString()} color="blue" />
        <SummaryCard label="Issued (m)" value={`${FMT_NUM(summary.issued, 0)} m`} color="amber" />
        <SummaryCard label="Finished (m)" value={`${FMT_NUM(summary.finished, 0)} m`} color="teal" />
        <SummaryCard
          label="Total Job Cost"
          value={FMT_INR(Math.abs(summary.jobCost))}
          color="red"
          warn="Shown as positive (original is negative in DB)"
        />
        {summary.issued > 0 && (
          <SummaryCard
            label="Avg Shortage %"
            value={`${(((summary.issued - summary.finished) / summary.issued) * 100).toFixed(1)}%`}
            color="purple"
          />
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Date</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Tally Vch No</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-teal-600 whitespace-nowrap">Grey Lot (KEY 1)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-green-700 whitespace-nowrap">Design No (KEY 3)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-amber-600 whitespace-nowrap">Party Ch. No (KEY 2 ⚠)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Job Godown (Mill)</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Finish Item</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Issued (m)</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-teal-600 whitespace-nowrap">Finished (m)</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-purple-600 whitespace-nowrap">Shortage %</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Job Rate/m</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-red-600 whitespace-nowrap" title={NEGATIVE_HINT}>Job Amt (neg = cost) ⓘ</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">Grey Rate/m</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-teal-700 whitespace-nowrap">Cost/Mtr</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-blue-600 whitespace-nowrap">JW Alloc</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? <LoadingRow cols={16} /> : rows.length === 0 ? <EmptyRow cols={16} /> : rows.map(r => {
              const shortage = r.grey_issued_qty_mtrs && r.finish_qty_mtrs
                ? ((r.grey_issued_qty_mtrs - r.finish_qty_mtrs) / r.grey_issued_qty_mtrs * 100)
                : null;
              const highShortage = shortage > 15;
              return (
                <tr key={r.id} className={`hover:bg-gray-50 ${highShortage ? 'bg-red-50' : ''}`}>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">{FMT_DATE(r.voucher_date)}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{r.tally_voucher_no}</td>
                  <td className="px-3 py-2 font-mono text-teal-700 font-semibold whitespace-nowrap">{r.grey_lot_no}</td>
                  <td className="px-3 py-2 font-mono text-green-700 font-semibold">{r.design_no || <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2 text-xs font-mono text-amber-700 bg-amber-50" title="⚠ Bug: currently stores lot_no (wrong). Should be mill's own challan no.">{r.party_challan_no}</td>
                  <td className="px-3 py-2 text-gray-700 text-xs max-w-[140px] truncate" title={r.job_godown}>{r.job_godown}</td>
                  <td className="px-3 py-2 text-gray-700 text-xs max-w-[140px] truncate" title={r.finish_item_name}>{r.finish_item_name}</td>
                  <td className="px-3 py-2 text-right text-amber-700">{FMT_NUM(r.grey_issued_qty_mtrs)}</td>
                  <td className="px-3 py-2 text-right text-teal-700 font-medium">{FMT_NUM(r.finish_qty_mtrs)}</td>
                  <td className="px-3 py-2 text-right">
                    {shortage != null ? (
                      <span className={`font-medium ${highShortage ? 'text-red-600' : shortage > 8 ? 'text-amber-600' : 'text-gray-600'}`}>
                        {shortage.toFixed(1)}%{highShortage ? ' 🔴' : ''}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">₹{r.job_rate}</td>
                  <td className="px-3 py-2 text-right">
                    {r.job_amount != null ? (
                      <span className="text-red-600 font-medium" title={NEGATIVE_HINT}>
                        {FMT_INR(r.job_amount)}
                        <span className="text-xs text-red-400 ml-1">(neg)</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">₹{r.grey_purchase_rate || r.grey_rate}</td>
                  <td className="px-3 py-2 text-right font-semibold text-teal-800">
                    {r.cumulative_cost_per_mtr ? `₹${Number(r.cumulative_cost_per_mtr).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-blue-700 text-xs">
                    {r.jw_allocated_cost ? FMT_INR(r.jw_allocated_cost) : <span className="text-gray-300">pending</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.stage_no && r.stage_no > 1 ? <span className="bg-purple-100 text-purple-700 rounded px-1.5 text-xs">S{r.stage_no}</span> : '1'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination page={page} total={total} onPage={setPage} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4 — JOBWORK EXPENSES
// ─────────────────────────────────────────────────────────────────────────────
function JobworkExpensesTab() {
  const [activeFY, setActiveFY] = useState(2025);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [summary, setSummary] = useState({ bills: 0, expense: 0, cgst: 0, sgst: 0, igst: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const from = `${activeFY}-04-01`, to = `${activeFY + 1}-03-31`;
    let q = supabase.from('jobwork_expenses')
      .select('*', { count: 'exact' })
      .gte('voucher_date', from).lte('voucher_date', to)
      .order('voucher_date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (search) q = q.or(`supplier_invoice_no.ilike.%${search}%,party_name.ilike.%${search}%`);
    if (typeFilter) q = q.eq('voucher_type', typeFilter);
    const { data, count } = await q;
    setRows(data || []);
    setTotal(count || 0);

    let sq = supabase.from('jobwork_expenses').select('expense_amount,cgst_amount,sgst_amount,igst_amount').gte('voucher_date', from).lte('voucher_date', to);
    if (typeFilter) sq = sq.eq('voucher_type', typeFilter);
    const { data: sd } = await sq;
    if (sd) setSummary({ bills: sd.length, expense: sd.reduce((s, r) => s + (r.expense_amount || 0), 0), cgst: sd.reduce((s, r) => s + (r.cgst_amount || 0), 0), sgst: sd.reduce((s, r) => s + (r.sgst_amount || 0), 0), igst: sd.reduce((s, r) => s + (r.igst_amount || 0), 0) });
    setLoading(false);
  }, [activeFY, page, search, typeFilter]);

  useEffect(() => { load(); }, [load]);
  const handleFY = (yr) => { setActiveFY(yr); setPage(0); };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
        <p><strong>⚠ Important column note:</strong> There is NO <code>amount</code> column — always use <code>expense_amount</code>. The <code>total_amount</code> is gross including GST.</p>
        <p><strong>KEY 2 link:</strong> <code>supplier_invoice_no</code> should = <code>rec_from_mill.party_challan_no</code> for JW cost allocation. Currently broken (see party_challan_no bug above).</p>
        <p><strong>Voucher types:</strong> <em>Jobwork</em> = mill processing bills | <em>Expenses</em> = other production costs</p>
      </div>
      <div className="flex flex-wrap gap-4 justify-between items-start">
        <FYTabs activeFY={activeFY} onChange={handleFY} />
        <div className="flex gap-2">
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All Types</option>
            <option value="Jobwork">Jobwork</option>
            <option value="Expenses">Expenses</option>
          </select>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search supplier inv, party…" className="border rounded-lg px-3 py-2 text-sm w-56" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <SummaryCard label="Bills" value={summary.bills.toLocaleString()} color="blue" />
        <SummaryCard label="Expense Amount (excl GST)" value={FMT_INR(summary.expense)} color="teal" />
        <SummaryCard label="CGST + SGST" value={FMT_INR(summary.cgst + summary.sgst)} color="purple" />
        <SummaryCard label="IGST" value={FMT_INR(summary.igst)} color="amber" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Date','Vch No','Type','Party Name','Supplier Inv No (KEY 2)','Inv Date','Expense Ledger','Expense Amt (excl GST)','CGST','SGST','IGST','TDS','Party Amt (net)','Total (GST)','Recon','GP No','Narration'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? <LoadingRow cols={17} /> : rows.length === 0 ? <EmptyRow cols={17} /> : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">{FMT_DATE(r.voucher_date)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.voucher_number}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.voucher_type === 'Jobwork' ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-600'}`}>{r.voucher_type}</span>
                </td>
                <td className="px-3 py-2 font-medium text-gray-800 max-w-[160px] truncate" title={r.party_name}>{r.party_name}</td>
                <td className="px-3 py-2 font-mono text-xs text-amber-700 bg-amber-50">{r.supplier_invoice_no}</td>
                <td className="px-3 py-2 text-xs whitespace-nowrap text-gray-500">{FMT_DATE(r.supplier_invoice_date)}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{r.expense_ledger}</td>
                <td className="px-3 py-2 text-right font-semibold text-teal-700">{FMT_INR(r.expense_amount)}</td>
                <td className="px-3 py-2 text-right text-xs text-gray-500">{FMT_INR(r.cgst_amount)}</td>
                <td className="px-3 py-2 text-right text-xs text-gray-500">{FMT_INR(r.sgst_amount)}</td>
                <td className="px-3 py-2 text-right text-xs text-gray-500">{FMT_INR(r.igst_amount)}</td>
                <td className="px-3 py-2 text-right text-xs text-gray-500">{FMT_INR(r.tds_amount)}</td>
                <td className="px-3 py-2 text-right">{FMT_INR(r.party_amount)}</td>
                <td className="px-3 py-2 text-right font-medium">{FMT_INR(r.total_amount)}</td>
                <td className="px-3 py-2">
                  {r.recon_status ? (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      r.recon_status === 'matched' ? 'bg-green-100 text-green-700' :
                      r.recon_status === 'mismatch' ? 'bg-red-100 text-red-700' :
                      r.recon_status === 'missing_rec' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{r.recon_status}</span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.gp_number || '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-400 max-w-[120px] truncate" title={r.narration}>{r.narration}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={total} onPage={setPage} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 5 — SALES BILLS
// ─────────────────────────────────────────────────────────────────────────────
function SalesBillsTab() {
  const [activeFY, setActiveFY] = useState(2025);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({ bills: 0, metres: 0, amount: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const from = `${activeFY}-04-01`, to = `${activeFY + 1}-03-31`;
    let q = supabase.from('sales_bills')
      .select('*', { count: 'exact' })
      .gte('bill_date', from).lte('bill_date', to)
      .order('bill_date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (search) q = q.or(`tally_voucher_no.ilike.%${search}%,customer_name.ilike.%${search}%,design_no.ilike.%${search}%,bill_number.ilike.%${search}%`);
    const { data, count } = await q;
    setRows(data || []);
    setTotal(count || 0);

    let sq = supabase.from('sales_bills').select('quantity_mtrs,total_amount').gte('bill_date', from).lte('bill_date', to);
    if (search) sq = sq.or(`tally_voucher_no.ilike.%${search}%,customer_name.ilike.%${search}%`);
    const { data: sd } = await sq;
    if (sd) setSummary({ bills: sd.length, metres: sd.reduce((s, r) => s + (r.quantity_mtrs || 0), 0), amount: sd.reduce((s, r) => s + (r.total_amount || 0), 0) });
    setLoading(false);
  }, [activeFY, page, search]);

  useEffect(() => { load(); }, [load]);
  const handleFY = (yr) => { setActiveFY(yr); setPage(0); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 justify-between items-start">
        <FYTabs activeFY={activeFY} onChange={handleFY} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search bill no, customer, design…" className="border rounded-lg px-3 py-2 text-sm w-64" />
      </div>
      <div className="flex flex-wrap gap-3">
        <SummaryCard label="Bills" value={summary.bills.toLocaleString()} color="green" />
        <SummaryCard label="Total Metres" value={`${FMT_NUM(summary.metres, 0)} m`} color="teal" />
        <SummaryCard label="Total Sales" value={FMT_INR(summary.amount)} color="green" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Bill Date','Tally Vch No','Bill No','Customer','GSTIN','State','Design No (KEY 3)','Item Name','Taka/Pcs','Qty (m)','Rate/m','Taxable Value','CGST','SGST','IGST','Total Amt','Broker','Comm %','Broker Amt','IRN','e-Way Bill','Narration'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? <LoadingRow cols={22} /> : rows.length === 0 ? <EmptyRow cols={22} /> : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">{FMT_DATE(r.bill_date)}</td>
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{r.tally_voucher_no}</td>
                <td className="px-3 py-2 font-mono font-semibold text-gray-800">{r.bill_number}</td>
                <td className="px-3 py-2 font-medium text-gray-800 max-w-[160px] truncate" title={r.customer_name}>{r.customer_name}</td>
                <td className="px-3 py-2 text-xs text-gray-400">{r.customer_gstin}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.customer_state}</td>
                <td className="px-3 py-2">
                  {r.design_no ? (
                    <span className="font-mono text-green-700 font-semibold">{r.design_no}</span>
                  ) : (
                    <span className="bg-amber-100 text-amber-700 rounded px-1.5 text-xs">Primary Batch</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600 max-w-[120px] truncate" title={r.item_name}>{r.item_name}</td>
                <td className="px-3 py-2 text-center">{r.total_taka_pcs}</td>
                <td className="px-3 py-2 text-right font-medium">{FMT_NUM(r.quantity_mtrs)}</td>
                <td className="px-3 py-2 text-right">₹{r.rate_per_mtr}</td>
                <td className="px-3 py-2 text-right">{FMT_INR(r.taxable_value)}</td>
                <td className="px-3 py-2 text-right text-xs text-gray-500">{FMT_INR(r.cgst_amount)}</td>
                <td className="px-3 py-2 text-right text-xs text-gray-500">{FMT_INR(r.sgst_amount)}</td>
                <td className="px-3 py-2 text-right text-xs text-gray-500">{FMT_INR(r.igst_amount)}</td>
                <td className="px-3 py-2 text-right font-semibold text-green-700">{FMT_INR(r.total_amount)}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{r.broker_name}</td>
                <td className="px-3 py-2 text-right text-xs">{r.comm_rate ? `${r.comm_rate}%` : '—'}</td>
                <td className="px-3 py-2 text-right text-xs text-gray-500">{FMT_INR(r.comm_amount)}</td>
                <td className="px-3 py-2 text-xs text-gray-400 max-w-[80px] truncate" title={r.irn}>{r.irn ? '✓' : '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-400">{r.eway_bill_no ? '✓' : '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-400 max-w-[120px] truncate" title={r.narration}>{r.narration}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={total} onPage={setPage} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 6 — PROCESS ISSUES
// ─────────────────────────────────────────────────────────────────────────────
function ProcessIssuesTab() {
  const [activeFY, setActiveFY] = useState(2025);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const from = `${activeFY}-04-01`, to = `${activeFY + 1}-03-31`;
    let q = supabase.from('process_issues')
      .select('*', { count: 'exact' })
      .gte('voucher_date', from).lte('voucher_date', to)
      .order('voucher_date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (search) q = q.or(`voucher_number.ilike.%${search}%,party_name.ilike.%${search}%`);
    const { data, count } = await q;
    setRows(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [activeFY, page, search]);

  useEffect(() => { load(); }, [load]);
  const handleFY = (yr) => { setActiveFY(yr); setPage(0); };

  // Dynamic columns from first row
  const sampleKeys = rows.length > 0 ? Object.keys(rows[0]).filter(k => !['id', 'created_at', 'updated_at'].includes(k)) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 justify-between items-start">
        <FYTabs activeFY={activeFY} onChange={handleFY} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search voucher no, party…" className="border rounded-lg px-3 py-2 text-sm w-64" />
      </div>
      <SummaryCard label="Records" value={total.toLocaleString()} color="teal" sub={`FY ${activeFY}-${activeFY + 1}`} />
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {sampleKeys.slice(0, 12).map(k => (
                <th key={k} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? <LoadingRow cols={12} /> : rows.length === 0 ? <EmptyRow cols={12} /> : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                {sampleKeys.slice(0, 12).map(k => (
                  <td key={k} className="px-3 py-2 text-xs text-gray-700 max-w-[150px] truncate" title={String(r[k])}>{r[k] != null ? String(r[k]) : '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={total} onPage={setPage} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 7 — FINANCIAL VOUCHERS (Receipt/Payment/Contra/Journal)
// ─────────────────────────────────────────────────────────────────────────────
function FinancialVouchersTab() {
  const [activeFY, setActiveFY] = useState(2025);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [summary, setSummary] = useState({ receipts: 0, payments: 0, receiptAmt: 0, paymentAmt: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const from = `${activeFY}-04-01`, to = `${activeFY + 1}-03-31`;
    let q = supabase.from('accounting_vouchers')
      .select('*', { count: 'exact' })
      .gte('voucher_date', from).lte('voucher_date', to)
      .order('voucher_date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (search) q = q.or(`party_name.ilike.%${search}%,voucher_number.ilike.%${search}%`);
    if (typeFilter) q = q.eq('voucher_type', typeFilter);
    const { data, count } = await q;
    setRows(data || []);
    setTotal(count || 0);

    let sq = supabase.from('accounting_vouchers').select('voucher_type,total_amount').gte('voucher_date', from).lte('voucher_date', to);
    const { data: sd } = await sq;
    if (sd) {
      const rec = sd.filter(r => r.voucher_type === 'Receipt');
      const pay = sd.filter(r => r.voucher_type === 'Payment');
      setSummary({ receipts: rec.length, payments: pay.length, receiptAmt: rec.reduce((s, r) => s + Math.abs(r.total_amount || 0), 0), paymentAmt: pay.reduce((s, r) => s + Math.abs(r.total_amount || 0), 0) });
    }
    setLoading(false);
  }, [activeFY, page, search, typeFilter]);

  useEffect(() => { load(); }, [load]);
  const handleFY = (yr) => { setActiveFY(yr); setPage(0); };

  const TYPE_COLOR = { Receipt: 'bg-green-100 text-green-700', Payment: 'bg-red-100 text-red-700', Contra: 'bg-blue-100 text-blue-700', Journal: 'bg-gray-100 text-gray-600' };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 justify-between items-start">
        <FYTabs activeFY={activeFY} onChange={handleFY} />
        <div className="flex gap-2">
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All Types</option>
            <option value="Receipt">Receipt</option>
            <option value="Payment">Payment</option>
            <option value="Contra">Contra</option>
            <option value="Journal">Journal</option>
          </select>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search party, voucher no…" className="border rounded-lg px-3 py-2 text-sm w-56" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <SummaryCard label="Receipts" value={`${summary.receipts} • ${FMT_INR(summary.receiptAmt)}`} color="green" />
        <SummaryCard label="Payments" value={`${summary.payments} • ${FMT_INR(summary.paymentAmt)}`} color="red" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Date','Voucher No','Type','Party Name','Dr Ledger','Dr Amount','Cr Ledger','Cr Amount','Bank Ledger','Payment Mode','Instrument No','Inst Date','Total Amount','Narration'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? <LoadingRow cols={14} /> : rows.length === 0 ? <EmptyRow cols={14} /> : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">{FMT_DATE(r.voucher_date)}</td>
                <td className="px-3 py-2 text-xs font-mono text-gray-500">{r.voucher_number}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLOR[r.voucher_type] || 'bg-gray-100 text-gray-600'}`}>{r.voucher_type}</span>
                </td>
                <td className="px-3 py-2 font-medium text-gray-800 max-w-[160px] truncate" title={r.party_name}>{r.party_name}</td>
                <td className="px-3 py-2 text-xs text-gray-600 max-w-[120px] truncate">{r.dr_ledger}</td>
                <td className="px-3 py-2 text-right">{FMT_INR(r.dr_amount)}</td>
                <td className="px-3 py-2 text-xs text-gray-600 max-w-[120px] truncate">{r.cr_ledger}</td>
                <td className="px-3 py-2 text-right">{FMT_INR(r.cr_amount)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.bank_ledger}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.payment_mode}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.instrument_no}</td>
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{FMT_DATE(r.instrument_date)}</td>
                <td className="px-3 py-2 text-right font-semibold">{FMT_INR(r.total_amount)}</td>
                <td className="px-3 py-2 text-xs text-gray-400 max-w-[120px] truncate" title={r.narration}>{r.narration}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={total} onPage={setPage} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 8 — CREDIT NOTES
// ─────────────────────────────────────────────────────────────────────────────
function CreditNotesTab() {
  const [activeFY, setActiveFY] = useState(2025);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [lineItems, setLineItems] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const from = `${activeFY}-04-01`, to = `${activeFY + 1}-03-31`;
    let q = supabase.from('credit_note')
      .select('*', { count: 'exact' })
      .gte('voucher_date', from).lte('voucher_date', to)
      .order('voucher_date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (search) q = q.or(`party_name.ilike.%${search}%,tally_voucher_no.ilike.%${search}%,bill_ref.ilike.%${search}%`);
    const { data, count } = await q;
    setRows(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [activeFY, page, search]);

  useEffect(() => { load(); }, [load]);
  const handleFY = (yr) => { setActiveFY(yr); setPage(0); };

  const loadLineItems = async (vchNo) => {
    if (lineItems[vchNo]) { setExpanded(expanded === vchNo ? null : vchNo); return; }
    const { data } = await supabase.from('credit_note_items').select('*').eq('tally_voucher_no', vchNo);
    setLineItems(prev => ({ ...prev, [vchNo]: data || [] }));
    setExpanded(expanded === vchNo ? null : vchNo);
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <strong>KEY 4:</strong> <code>bill_ref</code> = <code>sales_bills.bill_number</code>. Click a row to expand line items (per design). <strong>design_no in line items = the returned design</strong> (KEY 3 for P&L).
      </div>
      <div className="flex flex-wrap gap-4 justify-between items-start">
        <FYTabs activeFY={activeFY} onChange={handleFY} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search party, vch no, bill ref…" className="border rounded-lg px-3 py-2 text-sm w-64" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['','Date','CN Voucher No','Party Name','Bill Ref (KEY 4)','Orig Voucher','CGST','SGST','IGST','Discount','Party Amount (net)','Broker','Comm %','Narration'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow cols={14} /> : rows.length === 0 ? <EmptyRow cols={14} /> : rows.map(r => (
              <>
                <tr key={r.id} className="hover:bg-gray-50 cursor-pointer border-b border-gray-50" onClick={() => loadLineItems(r.tally_voucher_no)}>
                  <td className="px-3 py-2 text-gray-400 text-xs">{expanded === r.tally_voucher_no ? '▼' : '▶'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">{FMT_DATE(r.voucher_date)}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-gray-700">{r.tally_voucher_no}</td>
                  <td className="px-3 py-2 font-medium text-gray-800 max-w-[160px] truncate" title={r.party_name}>{r.party_name}</td>
                  <td className="px-3 py-2 font-mono text-blue-700">{r.bill_ref}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{r.original_voucher_no}</td>
                  <td className="px-3 py-2 text-right text-xs">{FMT_INR(r.cgst_amount)}</td>
                  <td className="px-3 py-2 text-right text-xs">{FMT_INR(r.sgst_amount)}</td>
                  <td className="px-3 py-2 text-right text-xs">{FMT_INR(r.igst_amount)}</td>
                  <td className="px-3 py-2 text-right text-xs">{FMT_INR(r.discount_amount)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-red-700">{FMT_INR(r.party_amount)}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{r.broker_name}</td>
                  <td className="px-3 py-2 text-xs">{r.comm_rate ? `${r.comm_rate}%` : '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-400 max-w-[120px] truncate" title={r.narration}>{r.narration}</td>
                </tr>
                {expanded === r.tally_voucher_no && lineItems[r.tally_voucher_no] && (
                  <tr key={`${r.id}-items`}>
                    <td colSpan={14} className="px-6 py-2 bg-blue-50 border-b border-blue-100">
                      <p className="text-xs font-semibold text-blue-800 mb-2">Line Items (returned designs):</p>
                      <table className="text-xs w-auto">
                        <thead>
                          <tr className="text-blue-600">
                            {['Item Name','Design No (KEY 3)','Godown','Qty (m)','Rate','Amount'].map(h => <th key={h} className="px-2 py-1 text-left">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems[r.tally_voucher_no].map((li, i) => (
                            <tr key={i}>
                              <td className="px-2 py-1">{li.item_name}</td>
                              <td className="px-2 py-1 font-mono text-green-700 font-semibold">{li.design_no}</td>
                              <td className="px-2 py-1">{li.godown_name}</td>
                              <td className="px-2 py-1 text-right">{FMT_NUM(li.qty_mtrs)}</td>
                              <td className="px-2 py-1 text-right">₹{li.rate}</td>
                              <td className="px-2 py-1 text-right">{FMT_INR(li.item_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={total} onPage={setPage} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 9 — DEBIT NOTES
// ─────────────────────────────────────────────────────────────────────────────
function DebitNotesTab() {
  const [activeFY, setActiveFY] = useState(2025);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const from = `${activeFY}-04-01`, to = `${activeFY + 1}-03-31`;
    let q = supabase.from('debit_note')
      .select('*', { count: 'exact' })
      .gte('voucher_date', from).lte('voucher_date', to)
      .order('voucher_date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (search) q = q.or(`party_name.ilike.%${search}%,tally_voucher_no.ilike.%${search}%`);
    const { data, count } = await q;
    setRows(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [activeFY, page, search]);

  useEffect(() => { load(); }, [load]);
  const handleFY = (yr) => { setActiveFY(yr); setPage(0); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 justify-between items-start">
        <FYTabs activeFY={activeFY} onChange={handleFY} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search party, voucher no…" className="border rounded-lg px-3 py-2 text-sm w-64" />
      </div>
      <SummaryCard label="Records" value={total.toLocaleString()} color="teal" sub={`FY ${activeFY}-${activeFY + 1}`} />
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Date','Tally Vch No','Party Name','Bill Ref','Orig Bill Date','Nature of Return','Expense Ledger','Expense Amt','CGST','SGST','IGST','Party Amount','Narration'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? <LoadingRow cols={13} /> : rows.length === 0 ? <EmptyRow cols={13} /> : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">{FMT_DATE(r.voucher_date)}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500">{r.tally_voucher_no}</td>
                <td className="px-3 py-2 font-medium text-gray-800 max-w-[160px] truncate">{r.party_name}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.bill_ref}</td>
                <td className="px-3 py-2 text-xs whitespace-nowrap">{FMT_DATE(r.original_bill_date)}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{r.nature_of_return}</td>
                <td className="px-3 py-2 text-xs text-gray-600">{r.expense_ledger}</td>
                <td className="px-3 py-2 text-right font-semibold">{FMT_INR(r.expense_amount)}</td>
                <td className="px-3 py-2 text-right text-xs">{FMT_INR(r.cgst_amount)}</td>
                <td className="px-3 py-2 text-right text-xs">{FMT_INR(r.sgst_amount)}</td>
                <td className="px-3 py-2 text-right text-xs">{FMT_INR(r.igst_amount)}</td>
                <td className="px-3 py-2 text-right font-semibold text-red-700">{FMT_INR(r.party_amount)}</td>
                <td className="px-3 py-2 text-xs text-gray-400 max-w-[120px] truncate">{r.narration}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={total} onPage={setPage} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 10 — STOCK JOURNALS
// ─────────────────────────────────────────────────────────────────────────────
function StockJournalsTab() {
  const [activeFY, setActiveFY] = useState(2025);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const from = `${activeFY}-04-01`, to = `${activeFY + 1}-03-31`;
    const q = supabase.from('stock_journals')
      .select('*', { count: 'exact' })
      .gte('voucher_date', from).lte('voucher_date', to)
      .order('voucher_date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    const { data, count } = await q;
    setRows(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [activeFY, page]);

  useEffect(() => { load(); }, [load]);

  const sampleKeys = rows.length > 0 ? Object.keys(rows[0]).filter(k => !['id', 'created_at'].includes(k)) : ['voucher_date','voucher_number','item_name','qty','amount'];

  return (
    <div className="space-y-4">
      <FYTabs activeFY={activeFY} onChange={(yr) => { setActiveFY(yr); setPage(0); }} />
      <SummaryCard label="Records" value={total.toLocaleString()} color="teal" sub={`FY ${activeFY}-${activeFY + 1}`} />
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{sampleKeys.slice(0, 10).map(k => <th key={k} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{k}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? <LoadingRow cols={10} /> : rows.length === 0 ? <EmptyRow cols={10} /> : rows.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                {sampleKeys.slice(0, 10).map(k => <td key={k} className="px-3 py-2 text-xs text-gray-700 max-w-[150px] truncate">{r[k] != null ? String(r[k]) : '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={total} onPage={setPage} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'grey',       label: 'Grey Purchase',      icon: '🧵', color: 'bg-blue-500',   component: GreyPurchaseTab },
  { id: 'issue',      label: 'Issue to Mill',      icon: '🏭', color: 'bg-amber-500',  component: IssueToMillTab },
  { id: 'rec',        label: 'REC from Mill',      icon: '✅', color: 'bg-teal-600',   component: RecFromMillTab },
  { id: 'jw',         label: 'Jobwork & Expenses', icon: '💰', color: 'bg-purple-500', component: JobworkExpensesTab },
  { id: 'sales',      label: 'Sales Bills',        icon: '📤', color: 'bg-green-600',  component: SalesBillsTab },
  { id: 'process',    label: 'Process Issues',     icon: '🔬', color: 'bg-gray-500',   component: ProcessIssuesTab },
  { id: 'financial',  label: 'Financial Vouchers', icon: '🏦', color: 'bg-indigo-500', component: FinancialVouchersTab },
  { id: 'cn',         label: 'Credit Notes',       icon: '📋', color: 'bg-red-500',    component: CreditNotesTab },
  { id: 'dn',         label: 'Debit Notes',        icon: '📄', color: 'bg-orange-500', component: DebitNotesTab },
  { id: 'sj',         label: 'Stock Journals',     icon: '📦', color: 'bg-gray-400',   component: StockJournalsTab },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function AccountingHubPage() {
  const [activeTab, setActiveTab] = useState('grey');
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component;

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">⚡ Tally Accounting Hub</h1>
        <p className="text-sm text-gray-500 mt-1">All vouchers · Sync status · Design P&L · Push to Tally — <span className="text-teal-600 font-medium">All 10 voucher types with complete Tally fields</span></p>
      </div>

      {/* Costing Chain Banner */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 text-xs text-gray-600 shadow-sm">
        <p className="font-semibold text-gray-800 mb-2">📍 Business Cycle Chain (KEY 1 → KEY 2 → KEY 3 → KEY 4)</p>
        <div className="flex flex-wrap items-center gap-1">
          {[
            { label: 'Grey Purchase', key: 'lot_no', color: 'bg-blue-100 text-blue-700' },
            { arrow: true },
            { label: 'Issue to Mill', key: 'lot_no', color: 'bg-amber-100 text-amber-700' },
            { arrow: true },
            { label: 'REC from Mill', key: 'design_no born here', color: 'bg-teal-100 text-teal-700', special: true },
            { arrow: true },
            { label: 'JW Expenses', key: 'party_challan_no (KEY 2)', color: 'bg-purple-100 text-purple-700' },
            { pipe: true },
            { label: 'Sales Bills', key: 'design_no (KEY 3)', color: 'bg-green-100 text-green-700' },
            { arrow: true },
            { label: 'Credit Notes', key: 'bill_ref (KEY 4)', color: 'bg-red-100 text-red-700' },
          ].map((item, i) => item.arrow
            ? <span key={i} className="text-gray-400 font-bold">→</span>
            : item.pipe
              ? <span key={i} className="text-gray-400 mx-1 font-bold">|</span>
              : <span key={i} className={`px-2 py-1 rounded-lg font-medium ${item.color} ${item.special ? 'ring-2 ring-teal-400' : ''}`}>{item.label} <span className="opacity-70">({item.key})</span></span>
          )}
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm ${
              activeTab === t.id
                ? `${t.color} text-white shadow-md`
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Active Tab */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}
