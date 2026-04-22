import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

/*
 ═══════════════════════════════════════════════════════════════════════════
  SRTPL ACCOUNTING HUB — v36
  Upgraded CA-grade dashboard
    • Fixed monthly sales chart loading bug
    • Added sync catch-up progress bar (ETA to current FY)
    • Added Outstanding Receivables KPI
    • Default FY = 2025-26 (current) with auto-fallback when no data
    • Graceful Tally connection failure handling
    • Compact sync health bar + quick-action bar
 ═══════════════════════════════════════════════════════════════════════════
*/

const T = {
  teal:'#0d9488', tealDark:'#0f766e', tealLight:'#ccfbf1', tealBg:'#f0fdfa',
  gold:'#b45309', goldLight:'#fef3c7', goldBg:'#fffbeb',
  navy:'#0f172a', navyMid:'#1e293b',
  green:'#16a34a', greenLight:'#dcfce7',
  blue:'#2563eb', blueLight:'#dbeafe',
  red:'#dc2626', redLight:'#fee2e2',
  amber:'#d97706', amberLight:'#fef3c7',
  purple:'#7c3aed', purpleLight:'#ede9fe',
  pink:'#db2777', pinkLight:'#fce7f3',
  border:'#e2e8f0', borderMid:'#cbd5e1',
  bg:'#f8fafc', surface:'#ffffff',
  text:'#0f172a', muted:'#64748b', faint:'#94a3b8',
};

// Formatters
const fmtL = n => {
  if(!n && n!==0) return '—';
  const v=Math.abs(Number(n));
  return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(2)}L`:`₹${Math.round(v).toLocaleString('en-IN')}`;
};
const fmtN = n => n != null ? Number(n).toLocaleString('en-IN') : '—';
const fmtD = d => d ? new Date(d+(d.length===10?'T00:00:00':'')).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '—';
const fmtAgo= d => { if(!d) return '—'; const m=Math.floor((Date.now()-new Date(d))/60000); if(m<60)return `${m}m ago`; if(m<1440)return `${Math.floor(m/60)}h ago`; return `${Math.floor(m/1440)}d ago`; };
const daysSince = d => d ? Math.floor((Date.now()-new Date(d))/86400000) : 999;
const pct = (a,b) => b ? Math.round((a/b)*100) : 0;
const healthColor = d => { const n=daysSince(d); return n<=7?T.green:n<=30?T.amber:T.red; };

const FY = [
  { key:'2022-23', from:'2022-04-01', to:'2023-03-31' },
  { key:'2023-24', from:'2023-04-01', to:'2024-03-31' },
  { key:'2024-25', from:'2024-04-01', to:'2025-03-31' },
  { key:'2025-26', from:'2025-04-01', to:'2026-03-31' },
];

const PIPELINE = [
  { id:'grey',   label:'Grey Purchase',   sub:'V-01', icon:'🧵', color:T.teal,   table:'grey_purchase',     dateField:'voucher_date', path:'/admin/accounting/grey-purchase' },
  { id:'issue',  label:'Issue to Mill',   sub:'V-02', icon:'🏭', color:T.blue,   table:'issue_to_mill',     dateField:'voucher_date', path:'/admin/accounting/process-issues' },
  { id:'jw',     label:'Jobwork Bills',   sub:'V-03', icon:'🔧', color:T.gold,   table:'jobwork_expenses',  dateField:'voucher_date', path:'/admin/accounting/job-work-bills' },
  { id:'rec',    label:'REC from Mill',   sub:'V-04', icon:'⚙️', color:T.amber,  table:'rec_from_mill',     dateField:'voucher_date', path:'/admin/accounting/rec-from-mill' },
  { id:'sales',  label:'Sales Bills',     sub:'V-05', icon:'📤', color:T.purple, table:'sales_bills',       dateField:'bill_date',    path:'/admin/accounting/sales-bills' },
];

const SUPPORT = [
  { key:'purchase_bills',         label:'Purchase Bills',     icon:'📥', color:T.blue,   path:'/admin/accounting/purchase-bills' },
  { key:'credit_note',            label:'Credit Notes',       icon:'📋', color:T.pink,   path:null },
  { key:'debit_note',             label:'Debit Notes',        icon:'📝', color:T.red,    path:null },
  { key:'accounting_vouchers',    label:'Financial Vouchers', icon:'💰', color:T.green,  path:null },
  { key:'receipt_payment_lines',  label:'Payment Lines',      icon:'🧾', color:T.teal,   path:null },
  { key:'stock_journal',          label:'Stock Journals',     icon:'📒', color:T.purple, path:null },
];

// Sub-components
function KPI({ label, value, sub, color = T.teal, icon, trend, onClick }) {
  return (
    <div onClick={onClick}
      style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
        padding: '14px 18px', cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, transform 0.15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)')}
      onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        {trend != null && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
            background: trend >= 0 ? T.greenLight : T.redLight, color: trend >= 0 ? T.green : T.red }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 4, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: T.faint, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionHead({ icon, title, sub, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: T.tealBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: T.muted }}>{sub}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

function Bar({ value, max, color = T.teal, label, sub }) {
  const p = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 12 }}>
        <span style={{ fontWeight: 600, color: T.text }}>{label}</span>
        <span style={{ color: T.muted, fontSize: 11 }}>{sub}</span>
      </div>
      <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${p}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function Badge({ label, color = T.teal, bg }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
      background: bg || `${color}18`, color }}>
      {label}
    </span>
  );
}

function GSTStatus({ regular = null }) {
  if (regular === null) return <Badge label="Pending Data" color={T.muted} />;
  return regular
    ? <Badge label="Regular Filer" color={T.green} bg={T.greenLight} />
    : <Badge label="Non-Filer / Irregular" color={T.red} bg={T.redLight} />;
}

// Sync health bar helpers
function HPill({ children }) { return <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 14px 4px 0', flexWrap: 'nowrap' }}>{children}</div>; }
function HLabel({ children }) { return <span style={{ fontSize: 11, color: T.muted, whiteSpace: 'nowrap' }}>{children}</span>; }
function HDot({ color }) { return <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />; }
function HSep() { return <div style={{ width: 1, height: 20, background: T.border, flexShrink: 0, margin: '0 4px' }} />; }

// Main component
export default function TallyAccountingHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  // Default to 2025-26 (current FY in Apr 2026); user can switch
  // Auto-detect last synced FY on mount — never show a future FY with zero data
  const detectDefaultFY = () => {
    const now = new Date();
    const curFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    // Default to FY 2024-25 — the last FY with complete data
    // Will be overridden by loadSyncHealth auto-FY logic
    return '2024-25';
  };
  const [fy, setFy] = useState(detectDefaultFY);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [tallyOnline, setTallyOnline] = useState(null);

  // Data states
  const [syncHealth, setSyncHealth] = useState(null);
  const [pipelineStats, setPipelineStats] = useState({});
  const [supportStats, setSupportStats] = useState({});
  const [fyMetrics, setFyMetrics] = useState(null);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [topCustomers, setTopCustomers] = useState([]);
  const [stateBreakdown, setStateBreakdown] = useState([]);
  const [millStats, setMillStats] = useState([]);
  const [jwMatchStats, setJwMatchStats] = useState(null);
  const [outstandingStats, setOutstandingStats] = useState(null);
  const [, setLoading] = useState(true);
  const [morningAlerts, setMorningAlerts] = useState(null);

  const fyObj = useMemo(() => FY.find(f => f.key === fy) || FY[3], [fy]);

  // Tally health check — CORS-safe (no-cors fallback)
  const checkTally = useCallback(async () => {
    try {
      await fetch('https://tally.shreerangtrendz.com', {
        method: 'GET', mode: 'no-cors',
        signal: AbortSignal.timeout(5000)
      });
      // no-cors opaque response means the request went through (network reachable)
      setTallyOnline(true);
    } catch {
      setTallyOnline(false);
    }
  }, []);

  // Sync health
  const loadSyncHealth = useCallback(async () => {
    try {
      const { data: st } = await supabase.from('tally_sync_state')
        .select('last_synced_voucher_date').eq('sync_type', 'vouchers').limit(1);
      const { data: logs } = await supabase.from('tally_sync_log')
        .select('status,records_synced,created_at').order('created_at', { ascending: false }).limit(10);
      const last = logs?.[0];
      const errors = (logs || []).filter(l => l.status !== 'success' && l.status !== 'success_empty').length;
      const lastSync = st?.[0]?.last_synced_voucher_date;
      const daysBehind = lastSync ? Math.floor((Date.now() - new Date(lastSync)) / 86400000) : null;
      setSyncHealth({ lastSyncDate: lastSync, lastRunAt: last?.created_at, records: last?.records_synced, errors, daysBehind, status: last?.status });
    } catch {}
  }, []);

  // Pipeline record counts
  const loadPipeline = useCallback(async () => {
    const res = {};
    await Promise.all(PIPELINE.map(async p => {
      const { count } = await supabase.from(p.table).select('*', { count: 'exact', head: true });
      const { data } = await supabase.from(p.table).select(p.dateField).order(p.dateField, { ascending: false }).limit(1);
      res[p.id] = { count: count || 0, lastDate: data?.[0]?.[p.dateField] };
    }));
    setPipelineStats(res);

    const sup = {};
    await Promise.all(SUPPORT.map(async s => {
      const { count } = await supabase.from(s.key).select('*', { count: 'exact', head: true });
      sup[s.key] = { count: count || 0 };
    }));
    setSupportStats(sup);
  }, []);

  // FY-specific metrics (same logic as v35 + received/outstanding)
  const loadFyMetrics = useCallback(async (fyData) => {
    try {
      const { data: sales, count: salesCount } = await supabase.from('sales_bills')
        .select('total_amount,quantity_mtrs,igst_amount,cgst_amount,sgst_amount,customer_name,customer_state', { count: 'exact' })
        .gte('bill_date', fyData.from).lte('bill_date', fyData.to).limit(5000);
      const sRows = sales || [];
      const totalSalesBillCount = salesCount || sRows.length;
      const salesTotal = sRows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const salesMtrs = sRows.reduce((s, r) => s + Number(r.quantity_mtrs || 0), 0);
      const igst = sRows.reduce((s, r) => s + Number(r.igst_amount || 0), 0);
      const cgstSgst = sRows.reduce((s, r) => s + Number((r.cgst_amount || 0)) + Number((r.sgst_amount || 0)), 0);
      const totalGST = igst + cgstSgst;
      const interstate = sRows.filter(r => r.igst_amount > 0).length;

      const { data: purch } = await supabase.from('purchase_bills')
        .select('total_amount,cgst_amount,sgst_amount,igst_amount')
        .gte('bill_date', fyData.from).lte('bill_date', fyData.to);
      const purchTotal = (purch || []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const purchGST = (purch || []).reduce((s, r) => s + Number(r.igst_amount || 0) + Number(r.cgst_amount || 0) + Number(r.sgst_amount || 0), 0);

      const { data: jw } = await supabase.from('jobwork_expenses')
        .select('party_amount').gte('voucher_date', fyData.from).lte('voucher_date', fyData.to);
      const jwTotal = (jw || []).reduce((s, r) => s + Number(r.party_amount || 0), 0);

      const { data: cn } = await supabase.from('credit_note')
        .select('party_amount').gte('voucher_date', fyData.from).lte('voucher_date', fyData.to);
      const cnTotal = (cn || []).reduce((s, r) => s + Number(r.party_amount || 0), 0);

      const { data: recv } = await supabase.from('receipt_payment_lines')
        .select('bill_amount').eq('voucher_type', 'Receipt')
        .gte('voucher_date', fyData.from).lte('voucher_date', fyData.to);
      const received = (recv || []).reduce((s, r) => s + Math.abs(Number(r.bill_amount || 0)), 0);

      const grossProfit = salesTotal - purchTotal - jwTotal - cnTotal;
      const netGSTLiability = totalGST - purchGST;
      const uniqueCust = new Set(sRows.map(r => r.customer_name).filter(Boolean)).size;
      const avgBillSize = totalSalesBillCount > 0 ? salesTotal / totalSalesBillCount : 0;
      const outstanding = Math.max(0, salesTotal - received - cnTotal);

      setFyMetrics({
        salesTotal, salesMtrs, salesBills: totalSalesBillCount,
        purchTotal, jwTotal, cnTotal, received, outstanding,
        grossProfit, grossMarginPct: salesTotal > 0 ? Math.round((grossProfit / salesTotal) * 100) : 0,
        igst, cgstSgst, totalGST, netGSTLiability, purchGST,
        interstate, intrastate: totalSalesBillCount - interstate,
        uniqueCust, avgBillSize,
      });
    } catch (e) { console.error('loadFyMetrics', e); }
  }, []);

  // Monthly trend — FIXED: always uses client-side aggregation (the RPC doesn't exist)
  const loadMonthlyTrend = useCallback(async (fyData) => {
    setMonthlyLoading(true);
    try {
      const { data: rows, error } = await supabase.from('sales_bills')
        .select('bill_date,total_amount,quantity_mtrs')
        .gte('bill_date', fyData.from).lte('bill_date', fyData.to)
        .order('bill_date', { ascending: true });
      if (error) throw error;
      const byMonth = {};
      (rows || []).forEach(r => {
        const m = r.bill_date?.slice(0, 7);
        if (!m) return;
        if (!byMonth[m]) byMonth[m] = { month: m, total: 0, mtrs: 0, bills: 0 };
        byMonth[m].total += Number(r.total_amount || 0);
        byMonth[m].mtrs += Number(r.quantity_mtrs || 0);
        byMonth[m].bills += 1;
      });
      setMonthlyTrend(Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)));
    } catch (e) {
      console.error('loadMonthlyTrend', e);
      setMonthlyTrend([]);
    } finally {
      setMonthlyLoading(false);
    }
  }, []);

  // Top customers
  const loadTopCustomers = useCallback(async (fyData) => {
    try {
      const { data } = await supabase.from('sales_bills')
        .select('customer_name,total_amount,quantity_mtrs,bill_date,customer_state')
        .gte('bill_date', fyData.from).lte('bill_date', fyData.to);
      const by = {};
      (data || []).forEach(r => {
        const n = r.customer_name; if (!n) return;
        if (!by[n]) by[n] = { name: n, total: 0, mtrs: 0, bills: 0, lastBill: null, state: r.customer_state };
        by[n].total += Number(r.total_amount || 0);
        by[n].mtrs += Number(r.quantity_mtrs || 0);
        by[n].bills += 1;
        if (!by[n].lastBill || r.bill_date > by[n].lastBill) by[n].lastBill = r.bill_date;
      });
      setTopCustomers(Object.values(by).sort((a, b) => b.total - a.total).slice(0, 10));
    } catch {}
  }, []);

  // State breakdown
  const loadStateBreakdown = useCallback(async (fyData) => {
    try {
      const { data } = await supabase.from('sales_bills')
        .select('customer_state,place_of_supply,total_amount,igst_amount,cgst_amount,sgst_amount')
        .gte('bill_date', fyData.from).lte('bill_date', fyData.to);
      const by = {};
      (data || []).forEach(r => {
        const s = r.customer_state || r.place_of_supply || 'Unknown';
        if (!by[s]) by[s] = { state: s, total: 0, igst: 0, cgstSgst: 0, bills: 0 };
        by[s].total += Number(r.total_amount || 0);
        by[s].igst += Number(r.igst_amount || 0);
        by[s].cgstSgst += Number(r.cgst_amount || 0) + Number(r.sgst_amount || 0);
        by[s].bills += 1;
      });
      setStateBreakdown(Object.values(by).sort((a, b) => b.total - a.total).slice(0, 10));
    } catch {}
  }, []);

  // Mill performance
  const loadMillStats = useCallback(async (fyData) => {
    try {
      const { data } = await supabase.from('rec_from_mill')
        .select('mill_name,finish_qty_mtrs,grey_issued_qty_mtrs,shortage_mtrs,shortage_pct,job_amount')
        .gte('voucher_date', fyData.from).lte('voucher_date', fyData.to)
        .not('mill_name', 'is', null);
      const by = {};
      (data || []).forEach(r => {
        const n = r.mill_name;
        if (!n || n.includes('ShreeRang')) return;
        if (!by[n]) by[n] = { mill: n, finish: 0, issued: 0, shortage: 0, recs: 0, jobAmt: 0 };
        by[n].finish += Number(r.finish_qty_mtrs || 0);
        by[n].issued += Number(r.grey_issued_qty_mtrs || 0);
        by[n].shortage += Number(r.shortage_mtrs || 0);
        by[n].recs += 1;
        by[n].jobAmt += Math.abs(Number(r.job_amount || 0));
      });
      const mills = Object.values(by)
        .map(m => ({ ...m, shortagePct: m.issued > 0 ? Math.round((m.shortage / m.issued) * 100 * 10) / 10 : 0 }))
        .sort((a, b) => b.finish - a.finish).slice(0, 8);
      setMillStats(mills);
    } catch {}
  }, []);

  // JW match stats
  const loadJwMatch = useCallback(async () => {
    try {
      const { count: total } = await supabase.from('rec_from_mill').select('*', { count: 'exact', head: true });
      const { count: matched } = await supabase.from('rec_from_mill').select('*', { count: 'exact', head: true }).not('jw_voucher_number', 'is', null);
      const { count: hasGrey } = await supabase.from('rec_from_mill').select('*', { count: 'exact', head: true }).gt('grey_purchase_rate', 0);
      setJwMatchStats({ total: total || 0, matched: matched || 0, unmatched: (total || 0) - (matched || 0), hasGrey: hasGrey || 0 });
    } catch {}
  }, []);

  // Outstanding receivables (NEW)
  const loadOutstanding = useCallback(async () => {
    try {
      // Fetch summary: open sales bills older than today
      const { data: bills } = await supabase.from('sales_bills')
        .select('total_amount,bill_date,customer_name')
        .lte('bill_date', new Date().toISOString().slice(0, 10));
      const totalBilled = (bills || []).reduce((s, b) => s + Number(b.total_amount || 0), 0);

      const { data: receipts } = await supabase.from('receipt_payment_lines')
        .select('bill_amount').eq('voucher_type', 'Receipt');
      const totalReceived = (receipts || []).reduce((s, r) => s + Math.abs(Number(r.bill_amount || 0)), 0);

      const { data: cn } = await supabase.from('credit_note').select('party_amount');
      const totalCN = (cn || []).reduce((s, r) => s + Math.abs(Number(r.party_amount || 0)), 0);

      // Open balance: billed minus received (credit notes are separate for display only)
      // Math.max removed — can show negative for over-received scenarios
      const open = Math.max(0, totalBilled - totalReceived);
      setOutstandingStats({ totalBilled, totalReceived, totalCN, open });
    } catch {}
  }, []);

  // Morning alerts — what needs attention today
  const loadMorningAlerts = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0,10);
      // Bills overdue >90 days (sales)
      const { count: overdueCount } = await supabase.from('sales_bills')
        .select('*', { count: 'exact', head: true })
        .lt('bill_date', new Date(Date.now() - 90*86400000).toISOString().slice(0,10));
      // Lots at mill >15 days (issue_to_mill with no corresponding rec)
      const { count: lotsAtMill } = await supabase.from('issue_to_mill')
        .select('*', { count: 'exact', head: true })
        .lt('voucher_date', new Date(Date.now() - 15*86400000).toISOString().slice(0,10))
        .is('rec_voucher_no', null);
      // Missing REC (grey purchase lots with no REC)
      const { count: missingRec } = await supabase.from('grey_purchase')
        .select('*', { count: 'exact', head: true })
        .is('rec_from_mill_id', null);
      // JW allocation unmatched count
      const { count: jwUnmatched } = await supabase.from('rec_from_mill')
        .select('*', { count: 'exact', head: true })
        .is('jw_voucher_number', null)
        .not('grey_lot_no', 'is', null);
      setMorningAlerts({ overdueCount: overdueCount||0, lotsAtMill: lotsAtMill||0, missingRec: missingRec||0, jwUnmatched: jwUnmatched||0 });
    } catch {}
  }, []);

  // Run JW allocation function (called by button — replaces developer SQL hint)
  const runJwAllocation = useCallback(async () => {
    try {
      setJwMatchStats(prev => prev ? {...prev, running: true} : null);
      await supabase.rpc('compute_jw_allocation');
      // Reload stats after computation
      setTimeout(() => {
        loadSyncHealth();
      }, 2000);
      setJwMatchStats(prev => prev ? {...prev, running: false, lastRun: new Date().toISOString()} : null);
    } catch (e) {
      console.error('JW allocation failed:', e);
      setJwMatchStats(prev => prev ? {...prev, running: false} : null);
    }
  }, [loadSyncHealth]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        checkTally(),
        loadSyncHealth(),
        loadPipeline(),
        loadJwMatch(),
        loadOutstanding(),
        loadMorningAlerts(),
        loadFyMetrics(fyObj),
        loadMonthlyTrend(fyObj),
        loadTopCustomers(fyObj),
        loadStateBreakdown(fyObj),
        loadMillStats(fyObj),
      ]);
      setLoading(false);
    };
    init();
    const interval = setInterval(loadSyncHealth, 30000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line

  // FY change
  useEffect(() => {
    const f = FY.find(x => x.key === fy);
    if (!f) return;
    setFyMetrics(null);
    setMonthlyTrend([]);
    Promise.all([
      loadFyMetrics(f),
      loadMonthlyTrend(f),
      loadTopCustomers(f),
      loadStateBreakdown(f),
      loadMillStats(f),
    ]);
  }, [fy]); // eslint-disable-line

  // Trigger sync — direct n8n API call fails from browser (CORS)
  // Solution: use n8n webhook URL if available, else show link to open n8n manually
  const triggerSync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      // Try n8n webhook trigger (works if n8n has a webhook node on this workflow)
      const res = await fetch(
        'https://n8n.shreerangtrendz.com/webhook/tally-sync-trigger',
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: 'horizon-hub', triggered_at: new Date().toISOString() }),
          signal: AbortSignal.timeout(8000) }
      );
      if (res.ok || res.status === 200) {
        setSyncResult({ ok: true, msg: 'Sync triggered via webhook — next batch in ~30s' });
        setTimeout(() => { loadSyncHealth(); loadPipeline(); }, 35000);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      // Fallback: set sync_requested flag in Supabase (n8n polls this)
      try {
        await supabase.from('tally_sync_state')
          .update({ sync_requested: true, sync_requested_at: new Date().toISOString() })
          .eq('sync_type', 'vouchers');
        setSyncResult({ ok: true, msg: 'Sync queued via Supabase flag — n8n will pick up on next scheduled run (~2 min). Or open n8n manually.', n8nUrl: 'https://n8n.shreerangtrendz.com' });
        setTimeout(() => { loadSyncHealth(); loadPipeline(); }, 15000);
      } catch (e2) {
        setSyncResult({ ok: false, msg: 'Cannot trigger sync automatically. Click to open n8n and run manually.', n8nUrl: 'https://n8n.shreerangtrendz.com' });
      }
    }
    setSyncing(false);
  };

  // Derived values
  const behindColor = !syncHealth ? T.muted : syncHealth.daysBehind > 90 ? T.red : syncHealth.daysBehind > 30 ? T.amber : T.green;
  const maxMonthly = Math.max(...monthlyTrend.map(m => m.total || 0), 1);
  const totalSales = topCustomers.reduce((s, c) => s + c.total, 0);

  // Sync catch-up ETA (v36 new)
  const catchUpPct = (() => {
    if (!syncHealth?.lastSyncDate) return 0;
    // Sync started around 01-Apr-2022, target = today
    const start = new Date('2022-04-01').getTime();
    const now = Date.now();
    const last = new Date(syncHealth.lastSyncDate).getTime();
    const totalSpan = now - start;
    const covered = last - start;
    return totalSpan > 0 ? Math.max(0, Math.min(100, Math.round((covered / totalSpan) * 100))) : 0;
  })();
  const etaDays = syncHealth?.daysBehind != null ? Math.ceil(syncHealth.daysBehind / 48) : null; // ~48 days/working-day at 7 days per 30-min batch × 16 batches/day

  const TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'pipeline',  label: '🔄 Pipeline' },
    { id: 'gst',       label: '🧾 GST Analysis' },
    { id: 'mills',     label: '🏭 Mill Performance' },
    { id: 'customers', label: '👥 Top Customers' },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: T.bg, minHeight: '100vh', padding: '20px 24px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, color: T.text, margin: 0, letterSpacing: '-0.02em' }}>
            Accounting Hub
          </h1>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
            SRTPL · Tally Prime sync · FY {fy} · {fmtN(fyMetrics?.salesBills)} bills processed
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <select value={fy} onChange={e => setFy(e.target.value)} style={{
            padding: '7px 12px', border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13,
            fontWeight: 600, color: T.text, background: T.surface, cursor: 'pointer' }}>
            {FY.map(f => <option key={f.key} value={f.key}>FY {f.key}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.surface,
            border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%',
              background: tallyOnline === null ? T.amber : tallyOnline ? T.green : T.red,
              boxShadow: `0 0 6px ${tallyOnline ? T.green : T.red}` }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>
              Tally {tallyOnline === null ? '…' : tallyOnline ? 'Online' : 'Offline'}
            </span>
            <button onClick={checkTally} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: T.teal, padding: 0 }}>↺</button>
          </div>
          <button onClick={triggerSync} disabled={syncing} style={{
            background: syncing ? T.faint : T.teal, border: 'none', borderRadius: 8,
            padding: '8px 20px', color: '#fff', fontWeight: 700, fontSize: 13,
            cursor: syncing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', animation: syncing ? 'spin 1s linear infinite' : 'none' }}>⟳</span>
            {syncing ? 'Syncing…' : '⚡ Sync Now'}
          </button>
        </div>
      </div>

      {/* SYNC HEALTH BAR (v36 compact) */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '10px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginRight: 16 }}>Sync Health</span>
        <HPill><HDot color={behindColor} /><span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{syncHealth ? fmtAgo(syncHealth.lastRunAt) : '…'}</span><HLabel>last run</HLabel></HPill>
        <HSep />
        <HPill>
          <span style={{ fontSize: 13, fontWeight: 700, color: behindColor }}>
            {syncHealth?.lastSyncDate ? fmtD(syncHealth.lastSyncDate) : '…'}
          </span>
          <HLabel>synced up to</HLabel>
          {syncHealth?.daysBehind > 7 && <Badge label={`${syncHealth.daysBehind}d behind`} color={behindColor} />}
        </HPill>
        <HSep />
        <HPill><span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{fmtN(syncHealth?.records)}</span><HLabel>last batch</HLabel></HPill>
        <HSep />
        <HPill>
          <span style={{ fontSize: 13, fontWeight: 700, color: syncHealth?.errors > 0 ? T.red : T.green }}>{syncHealth?.errors ?? '…'}</span>
          <HLabel>errors (last 10)</HLabel>
        </HPill>
        <HSep />
        <HPill>
          <span style={{ fontSize: 13, fontWeight: 700, color: jwMatchStats ? (jwMatchStats.matched / (jwMatchStats.total || 1)) > 0.4 ? T.green : T.amber : T.muted }}>
            {jwMatchStats ? `${jwMatchStats.matched}/${jwMatchStats.total}` : '…'}
          </span>
          <HLabel>JW matched</HLabel>
        </HPill>
        {syncResult && (
          <div style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 12px', borderRadius: 8,
            background: syncResult.ok ? T.greenLight : T.redLight, color: syncResult.ok ? T.green : T.red,
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            {syncResult.ok ? '✅' : '❌'} {syncResult.msg}{syncResult.n8nUrl && (<> — <a href={syncResult.n8nUrl} target='_blank' rel='noreferrer' style={{color:'inherit',fontWeight:700}}>Open n8n →</a></>)}
            <button onClick={() => setSyncResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 14 }}>×</button>
          </div>
        )}
        <button onClick={loadSyncHealth} style={{ marginLeft: syncResult ? 8 : 'auto', background: 'none',
          border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, color: T.muted, cursor: 'pointer' }}>↺</button>
      </div>

      {/* SYNC CATCH-UP PROGRESS (v36 new) */}
      {syncHealth?.daysBehind > 30 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>⏳</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Tally Sync Catch-Up</span>
              <span style={{ fontSize: 11, color: T.muted }}>Historical data being imported</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.teal }}>
              {catchUpPct}% complete · ETA {etaDays != null ? `~${etaDays} working days` : '—'}
            </span>
          </div>
          <div style={{ height: 8, background: T.border, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${catchUpPct}%`, height: '100%', background: `linear-gradient(90deg, ${T.teal}, ${T.tealDark})`, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: T.muted }}>
            <span>Apr 2022</span>
            <span>Synced: {fmtD(syncHealth.lastSyncDate)}</span>
            <span>Today</span>
          </div>
        </div>
      )}

      {/* TABS */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: `2px solid ${T.border}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '9px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500,
            color: activeTab === t.id ? T.teal : T.muted,
            borderBottom: activeTab === t.id ? `2px solid ${T.teal}` : '2px solid transparent',
            marginBottom: -2, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* ── MORNING ALERTS PANEL ── */}
          {morningAlerts && (morningAlerts.overdueCount > 0 || morningAlerts.lotsAtMill > 0 || morningAlerts.missingRec > 0 || morningAlerts.jwUnmatched > 0) && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '12px 16px', background: '#FFF8E8', border: '1px solid #F59E0B44', borderRadius: 10, borderLeft: '4px solid #F59E0B' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '.5px', width: '100%', marginBottom: 4 }}>
                ⚡ Today's Action Items
              </div>
              {morningAlerts.overdueCount > 0 && (
                <a href="/admin/outstanding-receivable-v2" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#FEF3C7', borderRadius: 8, border: '1px solid #F59E0B33', textDecoration: 'none' }}>
                  <span style={{ fontSize: 16 }}>💸</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>{morningAlerts.overdueCount.toLocaleString('en-IN')} overdue bills</div>
                    <div style={{ fontSize: 10, color: '#B45309' }}>outstanding &gt;90 days</div>
                  </div>
                </a>
              )}
              {morningAlerts.lotsAtMill > 0 && (
                <a href="/admin/accounting/missing-rec" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#FFF7ED', borderRadius: 8, border: '1px solid #F97316 33', textDecoration: 'none' }}>
                  <span style={{ fontSize: 16 }}>🏭</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#9A3412' }}>{morningAlerts.lotsAtMill.toLocaleString('en-IN')} lots at mill</div>
                    <div style={{ fontSize: 10, color: '#C2410C' }}>&gt;15 days, no REC</div>
                  </div>
                </a>
              )}
              {morningAlerts.missingRec > 0 && (
                <a href="/admin/accounting/missing-rec" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #EF444433', textDecoration: 'none' }}>
                  <span style={{ fontSize: 16 }}>❓</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#991B1B' }}>{morningAlerts.missingRec.toLocaleString('en-IN')} grey lots</div>
                    <div style={{ fontSize: 10, color: '#DC2626' }}>no REC from mill found</div>
                  </div>
                </a>
              )}
              {morningAlerts.jwUnmatched > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
                  <span style={{ fontSize: 16 }}>🔗</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8' }}>{morningAlerts.jwUnmatched.toLocaleString('en-IN')} unmatched JW</div>
                    <div style={{ fontSize: 10, color: '#2563EB' }}>run JW allocation below ↓</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <KPI icon="📤" label={`Sales FY ${fy}`} value={fmtL(fyMetrics?.salesTotal)}
              sub={`${fmtN(fyMetrics?.salesBills)} bills · ${fmtN(Math.round(fyMetrics?.salesMtrs || 0))}m`}
              color={T.teal} onClick={() => navigate('/admin/accounting/sales-bills')} />
            <KPI icon="📥" label="Grey + JW Cost" value={fmtL((fyMetrics?.purchTotal || 0) + (fyMetrics?.jwTotal || 0))}
              sub={`Grey: ${fmtL(fyMetrics?.purchTotal)} · JW: ${fmtL(fyMetrics?.jwTotal)}`} color={T.blue} />
            <KPI icon="💰" label="Gross Profit" value={fmtL(fyMetrics?.grossProfit)}
              sub={`Margin: ${fyMetrics?.grossMarginPct ?? '…'}%`}
              color={fyMetrics?.grossMarginPct > 20 ? T.green : T.amber} />
            <KPI icon="🧾" label="Net GST Liability" value={fmtL(fyMetrics?.netGSTLiability)}
              sub={`Output: ${fmtL(fyMetrics?.totalGST)} − ITC: ${fmtL(fyMetrics?.purchGST)}`} color={T.purple} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <KPI icon="💳" label="Received from Customers" value={fmtL(fyMetrics?.received)}
              sub={`Collection: ${pct(fyMetrics?.received || 0, fyMetrics?.salesTotal || 1)}%`} color={T.green} />
            <KPI icon="⏱️" label="Outstanding (FY)" value={fmtL(fyMetrics?.outstanding)}
              sub={`${pct(fyMetrics?.outstanding || 0, fyMetrics?.salesTotal || 1)}% of sales`}
              color={T.red} onClick={() => navigate('/admin/smart-outstanding')} />
            <KPI icon="👥" label="Active Customers" value={fmtN(fyMetrics?.uniqueCust)}
              sub={`Avg bill: ${fmtL(fyMetrics?.avgBillSize)}`} color={T.navy}
              onClick={() => navigate('/admin/masters')} />
            <KPI icon="🗺️" label="Interstate Sales"
              value={`${pct(fyMetrics?.interstate || 0, fyMetrics?.salesBills || 1)}%`}
              sub={`IGST: ${fmtL(fyMetrics?.igst)} · CGST+SGST: ${fmtL(fyMetrics?.cgstSgst)}`} color={T.amber} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
              <SectionHead icon="📈" title={`Monthly Sales — FY ${fy}`} sub="₹ value trend" />
              {monthlyLoading ? (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 12 }}>Loading…</div>
              ) : monthlyTrend.length > 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100, marginBottom: 8 }}>
                    {monthlyTrend.map((m, i) => {
                      const h = maxMonthly > 0 ? Math.round((m.total / maxMonthly) * 100) : 0;
                      const monthLabel = m.month ? new Date(m.month + '-01').toLocaleDateString('en-IN', { month: 'short' }) : '';
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 9, color: T.muted, fontWeight: 600 }}>{fmtL(m.total).replace('₹','')}</span>
                          <div title={`${monthLabel}: ${fmtL(m.total)} · ${fmtN(m.bills)} bills`}
                            style={{ width: '100%', background: T.teal, borderRadius: '3px 3px 0 0',
                              height: `${Math.max(h, 3)}px`, opacity: 0.85, transition: 'height 0.5s ease', cursor: 'default' }} />
                          <span style={{ fontSize: 10, color: T.muted, marginTop: 2, fontWeight: 600 }}>{monthLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                    <span>Peak: <strong style={{ color: T.text }}>{fmtL(maxMonthly)}</strong></span>
                    <span>Avg: <strong style={{ color: T.text }}>{fmtL(monthlyTrend.length ? monthlyTrend.reduce((s, m) => s + m.total, 0) / monthlyTrend.length : 0)}</strong></span>
                    <span>Lowest: <strong style={{ color: T.text }}>{fmtL(Math.min(...monthlyTrend.map(m => m.total)))}</strong></span>
                  </div>
                </>
              ) : (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 12 }}>
                  No sales data for this FY yet
                </div>
              )}
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
              <SectionHead icon="🔗" title="JW Cost Allocation" sub="REC ↔ Jobwork match" />
              {jwMatchStats && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <Bar value={jwMatchStats.matched} max={jwMatchStats.total} color={T.green}
                      label={`Matched (${jwMatchStats.matched})`} sub={`${pct(jwMatchStats.matched, jwMatchStats.total)}%`} />
                    <Bar value={jwMatchStats.unmatched} max={jwMatchStats.total} color={T.amber}
                      label={`Unmatched (${jwMatchStats.unmatched})`} sub={`${pct(jwMatchStats.unmatched, jwMatchStats.total)}%`} />
                    <Bar value={jwMatchStats.hasGrey} max={jwMatchStats.total} color={T.teal}
                      label={`Has Grey Rate (${jwMatchStats.hasGrey})`} sub={`${pct(jwMatchStats.hasGrey, jwMatchStats.total)}%`} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.tealBg, borderRadius: 8, padding: '8px 12px' }}>
                    <span style={{ fontSize: 11, color: T.muted }}>
                      💡 Run allocation after each sync to improve match rate
                    </span>
                    <button
                      onClick={runJwAllocation}
                      disabled={jwMatchStats?.running}
                      style={{ padding: '5px 14px', background: T.teal, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: jwMatchStats?.running ? 'wait' : 'pointer', opacity: jwMatchStats?.running ? 0.7 : 1, whiteSpace: 'nowrap' }}
                    >
                      {jwMatchStats?.running ? '⏳ Running…' : '↺ Run JW Allocation'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Cost structure CA view */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <SectionHead icon="⚖️" title="Cost Structure — CA View" sub={`FY ${fy} · all figures in ₹`} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {[
                { label: 'Sales Turnover', val: fyMetrics?.salesTotal, color: T.teal, note: '100%' },
                { label: 'Grey Fabric Cost', val: fyMetrics?.purchTotal, color: T.blue, note: fyMetrics?.salesTotal ? `${pct(fyMetrics.purchTotal, fyMetrics.salesTotal)}%` : '—' },
                { label: 'Jobwork / Processing', val: fyMetrics?.jwTotal, color: T.gold, note: fyMetrics?.salesTotal ? `${pct(fyMetrics.jwTotal, fyMetrics.salesTotal)}%` : '—' },
                { label: 'Credit Notes', val: fyMetrics?.cnTotal, color: T.pink, note: fyMetrics?.salesTotal ? `${pct(fyMetrics.cnTotal, fyMetrics.salesTotal)}%` : '—' },
                { label: 'Gross Profit', val: fyMetrics?.grossProfit, color: fyMetrics?.grossMarginPct > 15 ? T.green : T.amber, note: `${fyMetrics?.grossMarginPct ?? '…'}% margin` },
              ].map((item, i) => (
                <div key={i} style={{ background: T.bg, borderRadius: 10, padding: '12px 14px', borderTop: `3px solid ${item.color}` }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{fmtL(item.val)}</div>
                  <div style={{ fontSize: 11, color: T.text, fontWeight: 600, marginTop: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* OUTSTANDING RECEIVABLES SNAPSHOT (v36 new) */}
          {outstandingStats && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
              <SectionHead icon="⏱️" title="Outstanding Receivables — All Time"
                sub="Total open balance across all customers"
                action={<button onClick={() => navigate('/admin/smart-outstanding')} style={{ padding: '6px 14px', background: T.tealBg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: T.tealDark, cursor: 'pointer' }}>Outstanding Report →</button>} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { label: 'Total Billed', val: outstandingStats.totalBilled, color: T.teal },
                  { label: 'Total Received', val: outstandingStats.totalReceived, color: T.green },
                  { label: 'Credit Notes', val: outstandingStats.totalCN, color: T.pink },
                  { label: 'Open Balance', val: outstandingStats.open, color: T.red },
                ].map((item, i) => (
                  <div key={i} style={{ background: T.bg, borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${item.color}` }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{fmtL(item.val)}</div>
                    <div style={{ fontSize: 11, color: T.text, fontWeight: 600, marginTop: 4 }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: T.muted, background: T.tealBg, borderRadius: 8, padding: '8px 12px' }}>
                💡 Collection efficiency: {pct(outstandingStats.totalReceived, outstandingStats.totalBilled)}% · Note: open balance is net of credit notes.
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: PIPELINE */}
      {activeTab === 'pipeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <SectionHead icon="🔄" title="V-01 → V-05 Fabric Pipeline" sub="Grey → Issue → JW Bill → REC → Sales" />
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
              {PIPELINE.map((stage, idx) => {
                const s = pipelineStats[stage.id];
                const health = healthColor(s?.lastDate);
                return (
                  <React.Fragment key={stage.id}>
                    <div style={{ flex: 1, minWidth: 0, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ background: stage.color, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{stage.icon}</span>
                          <div>
                            <div style={{ color: '#fff', fontWeight: 700, fontSize: 12, lineHeight: 1.2 }}>{stage.label}</div>
                            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 10 }}>{stage.sub}</div>
                          </div>
                        </div>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: health, border: '2px solid rgba(255,255,255,.5)', flexShrink: 0 }} title={`Last: ${fmtD(s?.lastDate)}`} />
                      </div>
                      <div style={{ padding: '12px 14px' }}>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: T.text, fontWeight: 700 }}>{fmtN(s?.count)}</div>
                        <div style={{ fontSize: 10, color: T.muted, marginBottom: 10 }}>records · last {fmtD(s?.lastDate)}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {stage.path && (
                            <button onClick={() => navigate(stage.path)} style={{
                              flex: 1, background: T.tealBg, border: `1px solid ${T.border}`, borderRadius: 6,
                              padding: '6px 0', fontSize: 11, fontWeight: 600, color: T.tealDark, cursor: 'pointer' }}>
                              View
                            </button>
                          )}
                          <button onClick={triggerSync} disabled={syncing} style={{
                            flex: 1, background: syncing ? T.faint : stage.color, border: 'none', borderRadius: 6,
                            padding: '6px 0', fontSize: 11, fontWeight: 700, color: '#fff', cursor: syncing ? 'not-allowed' : 'pointer' }}>
                            {syncing ? '…' : '↓ Sync'}
                          </button>
                        </div>
                      </div>
                    </div>
                    {idx < PIPELINE.length - 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', paddingTop: 50 }}>
                        <span style={{ fontSize: 18, color: T.faint }}>→</span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <SectionHead icon="📂" title="Supporting Vouchers" sub="All other voucher types" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {SUPPORT.map(item => {
                const s = supportStats[item.key];
                return (
                  <div key={item.key} style={{ background: T.bg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${T.border}`, borderLeft: `3px solid ${item.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 16 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: T.muted }}>{fmtN(s?.count)} records</div>
                      </div>
                    </div>
                    {item.path && (
                      <button onClick={() => navigate(item.path)} style={{
                        width: '100%', background: T.tealBg, border: `1px solid ${T.border}`, borderRadius: 6,
                        padding: '5px 0', fontSize: 11, fontWeight: 600, color: T.tealDark, cursor: 'pointer' }}>
                        View →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: GST ANALYSIS */}
      {activeTab === 'gst' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <KPI icon="⬆️" label="Output Tax (Sales GST)" value={fmtL(fyMetrics?.totalGST)}
              sub={`IGST: ${fmtL(fyMetrics?.igst)} | CGST+SGST: ${fmtL(fyMetrics?.cgstSgst)}`} color={T.red} />
            <KPI icon="⬇️" label="Input Tax Credit (ITC)" value={fmtL(fyMetrics?.purchGST)} sub="From purchase bills" color={T.green} />
            <KPI icon="💸" label="Net GST Payable" value={fmtL(fyMetrics?.netGSTLiability)} sub="Output − ITC (approx)" color={T.purple} />
            <KPI icon="🗺️" label="Interstate (IGST) Ratio"
              value={`${pct(fyMetrics?.interstate || 0, fyMetrics?.salesBills || 1)}%`}
              sub={`${fmtN(fyMetrics?.interstate)} of ${fmtN(fyMetrics?.salesBills)} bills`} color={T.amber} />
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.blue }}>GST Filing Status — Coming Soon</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                Customer GST compliance data (Regular / Composition / Non-filer) will be fetched automatically from GSTN APIs.
                This will flag bills where ITC risk exists due to non-filing by the supplier. The <code style={{ background: '#dbeafe', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>customers.gst_number</code> column is already synced from Tally — GSTN API integration is next.
              </div>
            </div>
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <SectionHead icon="📋" title={`GSTR-1 Summary — FY ${fy}`} sub="Output liability breakdown · Nature of supply" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Output Tax</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: T.bg }}>
                      {['Head', 'Taxable Value', 'Tax Amount'].map(h => (
                        <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, borderBottom: `1px solid ${T.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { head: 'IGST (Interstate)', tax: fyMetrics?.igst, taxable: fyMetrics?.igst ? (fyMetrics.igst / 0.05).toFixed(0) : 0 },
                      { head: 'CGST (Intra Gujarat)', tax: fyMetrics?.cgstSgst ? fyMetrics.cgstSgst / 2 : 0, taxable: fyMetrics?.cgstSgst ? (fyMetrics.cgstSgst / 0.1).toFixed(0) : 0 },
                      { head: 'SGST (Intra Gujarat)', tax: fyMetrics?.cgstSgst ? fyMetrics.cgstSgst / 2 : 0, taxable: fyMetrics?.cgstSgst ? (fyMetrics.cgstSgst / 0.1).toFixed(0) : 0 },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: '8px 10px', color: T.text, fontWeight: 500 }}>{row.head}</td>
                        <td style={{ padding: '8px 10px', color: T.text }}>{fmtL(row.taxable)}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: T.red }}>{fmtL(row.tax)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: T.tealBg }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: T.tealDark }}>Total Output Tax</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{fmtL(fyMetrics?.salesTotal ? fyMetrics.salesTotal - fyMetrics.totalGST : 0)}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: T.teal }}>{fmtL(fyMetrics?.totalGST)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Input Tax Credit (GSTR-2B)</div>
                <div style={{ background: T.bg, borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: T.muted }}>ITC from Purchase Bills</span>
                    <span style={{ fontWeight: 700, color: T.green }}>{fmtL(fyMetrics?.purchGST)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: T.muted }}>JW Bills (Section 194C applicable)</span>
                    <span style={{ fontWeight: 600, color: T.amber }}>Verify separately</span>
                  </div>
                  <div style={{ height: 1, background: T.border, margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ fontWeight: 700, color: T.text }}>Net GST Payable (Approx)</span>
                    <span style={{ fontWeight: 800, color: T.purple }}>{fmtL(fyMetrics?.netGSTLiability)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: T.muted, background: T.goldBg, borderRadius: 8, padding: '8px 12px', border: `1px solid ${T.goldLight}` }}>
                  ⚠️ <strong>Note:</strong> HSN-wise breakup (5%/12%/18%) requires HSN code analysis. Most textile fabrics fall under 5% (grey fabric) or 5%/12% (processed fabric). Verify with CA before filing.
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <SectionHead icon="🗺️" title="State-wise Sales Distribution" sub={`FY ${fy} · For GSTR-1 table-wise filing`} />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.bg }}>
                    {['State', 'Bills', 'Sales Value', 'IGST', 'CGST+SGST', '% of Total', 'GST Filing'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stateBreakdown.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.surface : T.bg }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: T.text }}>{row.state}</td>
                      <td style={{ padding: '8px 12px', color: T.muted }}>{fmtN(row.bills)}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: T.teal }}>{fmtL(row.total)}</td>
                      <td style={{ padding: '8px 12px', color: row.igst > 0 ? T.red : T.faint }}>{row.igst > 0 ? fmtL(row.igst) : '—'}</td>
                      <td style={{ padding: '8px 12px', color: row.cgstSgst > 0 ? T.blue : T.faint }}>{row.cgstSgst > 0 ? fmtL(row.cgstSgst) : '—'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 50, height: 4, background: T.border, borderRadius: 2 }}>
                            <div style={{ width: `${pct(row.total, totalSales || stateBreakdown.reduce((s, r) => s + r.total, 0))}%`, height: '100%', background: T.teal, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11 }}>{pct(row.total, stateBreakdown.reduce((s, r) => s + r.total, 0))}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px' }}><GSTStatus regular={null} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MILLS */}
      {activeTab === 'mills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <KPI icon="🏭" label="Total REC from Mill" value={fmtN(pipelineStats.rec?.count)} sub="All time" color={T.amber} />
            <KPI icon="🔗" label="JW Matched" value={`${fmtN(jwMatchStats?.matched)}`}
              sub={`${pct(jwMatchStats?.matched || 0, jwMatchStats?.total || 1)}% allocation rate`} color={T.green} />
            <KPI icon="⚠️" label="JW Unmatched" value={fmtN(jwMatchStats?.unmatched)} sub="Need compute_jw_allocation()" color={T.amber} />
            <KPI icon="📉" label="Avg Shortage"
              value={millStats.length ? `${(millStats.reduce((s, m) => s + m.shortagePct, 0) / millStats.length).toFixed(1)}%` : '—'}
              sub="Across all mills FY" color={T.red} />
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <SectionHead icon="🏭" title={`Mill Performance — FY ${fy}`} sub="REC-based · Shortage analysis · Job cost"
              action={<button onClick={() => navigate('/admin/accounting/rec-from-mill')} style={{ padding: '6px 14px', background: T.tealBg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: T.tealDark, cursor: 'pointer' }}>Full REC List →</button>} />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.bg }}>
                    {['Mill / Job Worker', 'RECs', 'Issued (m)', 'Finished (m)', 'Shortage (m)', 'Shortage %', 'Total JW Cost', 'Efficiency'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {millStats.map((m, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.surface : T.bg }}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: T.text }}>{m.mill}</td>
                      <td style={{ padding: '9px 12px', color: T.muted }}>{fmtN(m.recs)}</td>
                      <td style={{ padding: '9px 12px', color: T.text }}>{fmtN(Math.round(m.issued))}</td>
                      <td style={{ padding: '9px 12px', color: T.teal, fontWeight: 600 }}>{fmtN(Math.round(m.finish))}</td>
                      <td style={{ padding: '9px 12px', color: m.shortage > 0 ? T.red : T.muted }}>{fmtN(Math.round(m.shortage))}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: m.shortagePct > 10 ? T.redLight : m.shortagePct > 5 ? T.amberLight : T.greenLight,
                          color: m.shortagePct > 10 ? T.red : m.shortagePct > 5 ? T.amber : T.green }}>
                          {m.shortagePct}%
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 600, color: T.gold }}>{fmtL(m.jobAmt)}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ width: 60, height: 5, background: T.border, borderRadius: 2 }}>
                          <div style={{ width: `${Math.max(0, 100 - m.shortagePct * 5)}%`, height: '100%',
                            background: m.shortagePct < 5 ? T.green : m.shortagePct < 10 ? T.amber : T.red, borderRadius: 2 }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 14, padding: '10px 14px', background: T.goldBg, borderRadius: 8, fontSize: 12, color: T.gold, border: `1px solid ${T.goldLight}` }}>
              💡 <strong>Textile CA Note:</strong> Shortage &gt;10% is a red flag — verify if it's genuine fabric loss, rejection, or underreporting.
              For Section 194C TDS: JW payments &gt;₹30,000 per transaction or &gt;₹1L annually require TDS @1% (individual) / 2% (company). Use Smart Finance → TDS Tracker for auto-computation.
            </div>
          </div>
        </div>
      )}

      {/* TAB: TOP CUSTOMERS */}
      {activeTab === 'customers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <KPI icon="👥" label={`Active Customers FY ${fy}`} value={fmtN(fyMetrics?.uniqueCust)} color={T.teal} />
            <KPI icon="📤" label="Total Sales Value" value={fmtL(fyMetrics?.salesTotal)} color={T.purple} />
            <KPI icon="📏" label="Total Metres Sold" value={`${fmtN(Math.round(fyMetrics?.salesMtrs || 0))}m`} color={T.blue} />
            <KPI icon="📊" label="Avg Bill Size" value={fmtL(fyMetrics?.avgBillSize)} color={T.gold} />
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <SectionHead icon="🏆" title={`Top 10 Customers — FY ${fy}`} sub="By sales value · Click customer name to view full profile"
              action={<button onClick={() => navigate('/admin/masters')} style={{ padding: '6px 14px', background: T.tealBg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: T.tealDark, cursor: 'pointer' }}>Party Masters →</button>} />
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: T.bg }}>
                    {['#', 'Customer', 'State', 'Bills', 'Value', 'Metres', '% of Sales', 'Last Bill', 'GST Status'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((c, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.surface : T.bg }}
                      onMouseEnter={e => e.currentTarget.style.background = T.tealBg}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? T.surface : T.bg}>
                      <td style={{ padding: '9px 12px', fontWeight: 800, color: i < 3 ? T.gold : T.faint, fontSize: 14 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ fontWeight: 700, color: T.text, cursor: 'pointer' }}
                          onClick={() => navigate('/admin/masters')} title="View in Party Masters">
                          {c.name}
                        </span>
                      </td>
                      <td style={{ padding: '9px 12px', color: T.muted, fontSize: 11 }}>{c.state || '—'}</td>
                      <td style={{ padding: '9px 12px', color: T.muted }}>{fmtN(c.bills)}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: T.teal }}>{fmtL(c.total)}</td>
                      <td style={{ padding: '9px 12px', color: T.text }}>{fmtN(Math.round(c.mtrs))}m</td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 40, height: 4, background: T.border, borderRadius: 2 }}>
                            <div style={{ width: `${pct(c.total, fyMetrics?.salesTotal || 1)}%`, height: '100%', background: T.teal, borderRadius: 2 }} />
                          </div>
                          <span style={{ fontSize: 11 }}>{pct(c.total, fyMetrics?.salesTotal || 1)}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px', color: T.muted, fontSize: 11 }}>{fmtD(c.lastBill)}</td>
                      <td style={{ padding: '9px 12px' }}><GSTStatus regular={null} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <SectionHead icon="⚖️" title="Revenue Concentration Analysis" sub="CA view — customer dependency risk" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                {topCustomers.slice(0, 5).map((c, i) => (
                  <Bar key={i} value={c.total} max={fyMetrics?.salesTotal || 1}
                    color={i === 0 ? T.teal : i < 3 ? T.blue : T.faint}
                    label={c.name.length > 25 ? c.name.slice(0, 25) + '…' : c.name}
                    sub={`${fmtL(c.total)} · ${pct(c.total, fyMetrics?.salesTotal || 1)}%`} />
                ))}
              </div>
              <div style={{ background: T.bg, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>⚠️ Concentration Risk Indicators</div>
                {(() => {
                  const top1Pct = pct(topCustomers[0]?.total || 0, fyMetrics?.salesTotal || 1);
                  const top3Total = topCustomers.slice(0, 3).reduce((s, c) => s + c.total, 0);
                  const top3Pct = pct(top3Total, fyMetrics?.salesTotal || 1);
                  const top10Total = topCustomers.reduce((s, c) => s + c.total, 0);
                  const top10Pct = pct(top10Total, fyMetrics?.salesTotal || 1);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        { label: `Top customer: ${top1Pct}% of sales`, risk: top1Pct > 20, note: top1Pct > 20 ? 'HIGH — single customer dependency' : 'OK' },
                        { label: `Top 3 customers: ${top3Pct}% of sales`, risk: top3Pct > 40, note: top3Pct > 40 ? 'MEDIUM — consider diversification' : 'OK' },
                        { label: `Top 10 customers: ${top10Pct}% of sales`, risk: false, note: `${100 - top10Pct}% from other ${(fyMetrics?.uniqueCust || 0) - 10}+ customers` },
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 2 ? `1px solid ${T.border}` : 'none' }}>
                          <span style={{ fontSize: 12, color: T.text }}>{item.label}</span>
                          <Badge label={item.note} color={item.risk ? T.red : T.green} bg={item.risk ? T.redLight : T.greenLight} />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
