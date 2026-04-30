import { useState, useEffect, useMemo } from 'react';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

/* ══════════════════════════════════════════════════════════════════
   OUTSTANDING RECEIVABLE v3
   - Hierarchy: Broker → Customer → Bills (oldest → newest)
   - City + State always visible at customer row
   - Subtotals at every level
   - WhatsApp / Call inline at customer row
   - Sticky filter bar, virtualized-friendly markup
   Data sources:
     - outstanding_by_broker_party (one row per broker+customer, with aging buckets)
     - outstanding_receivable_v2 (drill-down bill detail when a customer is expanded)
   ══════════════════════════════════════════════════════════════════ */

const T = {
  navy:'#0B2E2B', teal:'#2BA898', tealDeep:'#1D8A7C', tealLight:'#EEF8F6',
  green:'#1E9E5A', greenLight:'#DCFCE7',
  amber:'#D4920A', amberLight:'#FEF3C7',
  orange:'#E67E22', orangeLight:'#FED7AA',
  red:'#D93A3A', redLight:'#FEE2E2', redDeep:'#991B1B',
  gold:'#E8A800', goldLight:'#FFF7E0',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', muted:'#6A9B95', faint:'#A8C9C3',
  whatsapp:'#25D366',
};

const fmt = n => '₹' + Math.round(Number(n||0)).toLocaleString('en-IN');
const fmtL = n => {
  const v = Number(n||0);
  if (v >= 10000000) return '₹' + (v/10000000).toFixed(2) + ' Cr';
  if (v >= 100000) return '₹' + (v/100000).toFixed(2) + ' L';
  return '₹' + Math.round(v).toLocaleString('en-IN');
};
const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
const fmtDay = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—';

// -------- Aging config (computed from days_overdue) --------
const agingOf = days => {
  if (days == null || days <= 0) return 'not_due';
  if (days <= 30) return '1_30';
  if (days <= 60) return '31_60';
  if (days <= 90) return '61_90';
  return 'over_90';
};
const AGING_META = {
  not_due: { label:'Not Due',     color:T.green,  bg:T.greenLight  },
  '1_30':  { label:'1-30 days',   color:T.amber,  bg:T.amberLight  },
  '31_60': { label:'31-60 days',  color:T.orange, bg:T.orangeLight },
  '61_90': { label:'61-90 days',  color:T.red,    bg:T.redLight    },
  over_90: { label:'90+ days',    color:T.redDeep,bg:T.redLight    },
};

function AgingChip({ days }) {
  const k = agingOf(days);
  const m = AGING_META[k];
  return (
    <span style={{background:m.bg,color:m.color,padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,whiteSpace:'nowrap'}}>
      {m.label}
    </span>
  );
}

// -------- Top KPI cards --------
function KPICard({ label, value, sub, color, accent }) {
  return (
    <div style={{
      background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
      padding:'14px 18px', borderTop:`3px solid ${color}`, minWidth:140
    }}>
      <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:0.5}}>{label}</div>
      <div style={{fontSize:22,fontWeight:800,color:accent || T.navy,marginTop:4,lineHeight:1.1}}>{value}</div>
      {sub && <div style={{fontSize:11,color:T.muted,marginTop:4}}>{sub}</div>}
    </div>
  );
}

// =============================================================================
//  MAIN PAGE
// =============================================================================
export default function OutstandingReceivableV3() {
  const [partyRows, setPartyRows]     = useState([]);   // broker+customer rollup
  const [billDetails, setBillDetails] = useState({});   // { customer_name: [bills...] }
  const [loadingBills, setLoadingBills] = useState({}); // { customer_name: true }
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [agingFilter, setAgingFilter] = useState('');
  const [minAmount, setMinAmount]     = useState(0);
  const [sortBy, setSortBy]           = useState('outstanding'); // outstanding | overdue | oldest
  const [expandedBroker, setExpandedBroker]   = useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('outstanding_by_broker_party')
        .select('*')
        .order('total_outstanding', { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error('outstanding_by_broker_party load failed', error);
      } else {
        setPartyRows(data || []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Filtered rows
  const filtered = useMemo(() => {
    let rows = partyRows;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.customer_name||'').toLowerCase().includes(q) ||
        (r.broker_name||'').toLowerCase().includes(q) ||
        (r.city||'').toLowerCase().includes(q) ||
        (r.state||'').toLowerCase().includes(q)
      );
    }
    if (stateFilter) rows = rows.filter(r => r.state === stateFilter);
    if (agingFilter) {
      rows = rows.filter(r => {
        if (agingFilter === 'over_90') return Number(r.amt_over_90 || 0) > 0;
        if (agingFilter === '61_90')   return Number(r.amt_61_90 || 0) > 0;
        if (agingFilter === '31_60')   return Number(r.amt_31_60 || 0) > 0;
        if (agingFilter === '1_30')    return Number(r.amt_1_30 || 0) > 0;
        if (agingFilter === 'not_due') return Number(r.amt_not_due || 0) > 0;
        return true;
      });
    }
    if (minAmount > 0) rows = rows.filter(r => Number(r.total_outstanding||0) >= minAmount);
    return rows;
  }, [partyRows, search, stateFilter, agingFilter, minAmount]);

  // Group by broker — preserve sort order from filtered
  const brokerGroups = useMemo(() => {
    const groups = new Map();
    for (const r of filtered) {
      const key = r.broker_key || r.broker_name || '(Unbrokered)';
      if (!groups.has(key)) {
        groups.set(key, { broker_name: r.broker_name, broker_key: key, customers: [], totals: {bills:0,billed:0,paid:0,outstanding:0,maxOverdue:0,oldest:null} });
      }
      const g = groups.get(key);
      g.customers.push(r);
      g.totals.bills       += Number(r.bill_count || 0);
      g.totals.billed      += Number(r.total_billed || 0);
      g.totals.paid        += Number(r.total_paid || 0);
      g.totals.outstanding += Number(r.total_outstanding || 0);
      g.totals.maxOverdue   = Math.max(g.totals.maxOverdue, Number(r.max_days_overdue || 0));
      if (!g.totals.oldest || (r.oldest_bill_date && r.oldest_bill_date < g.totals.oldest)) {
        g.totals.oldest = r.oldest_bill_date;
      }
    }
    // Sort customers within each broker by chosen criteria
    for (const g of groups.values()) {
      g.customers.sort((a, b) => {
        if (sortBy === 'overdue') return Number(b.max_days_overdue||0) - Number(a.max_days_overdue||0);
        if (sortBy === 'oldest')  return new Date(a.oldest_bill_date||'9999-12-31') - new Date(b.oldest_bill_date||'9999-12-31');
        return Number(b.total_outstanding||0) - Number(a.total_outstanding||0);
      });
    }
    // Sort brokers by total outstanding desc
    return Array.from(groups.values()).sort((a,b) => b.totals.outstanding - a.totals.outstanding);
  }, [filtered, sortBy]);

  // Grand totals
  const grand = useMemo(() => {
    return brokerGroups.reduce((acc,g) => ({
      brokers: acc.brokers + 1,
      customers: acc.customers + g.customers.length,
      bills: acc.bills + g.totals.bills,
      outstanding: acc.outstanding + g.totals.outstanding,
      billed: acc.billed + g.totals.billed,
    }), {brokers:0, customers:0, bills:0, outstanding:0, billed:0});
  }, [brokerGroups]);

  // Available states for filter
  const allStates = useMemo(() => {
    return Array.from(new Set(partyRows.map(r => r.state).filter(Boolean))).sort();
  }, [partyRows]);

  // Lazy-load bill detail for a specific customer
  const loadBillsForCustomer = async (customerName) => {
    if (billDetails[customerName] || loadingBills[customerName]) return;
    setLoadingBills(s => ({...s, [customerName]: true}));
    const { data, error } = await supabase
      .from('outstanding_receivable_v2')
      .select('bill_number, bill_date, due_date, days_overdue, billed_amount, paid_amount, outstanding_amount, design_no, fabric_name, quantity_mtrs, destination_city, tally_voucher_no')
      .eq('customer_name', customerName)
      .gt('outstanding_amount', 0)
      .order('bill_date', { ascending: true });   // oldest → newest as user requested
    if (!error) setBillDetails(s => ({...s, [customerName]: data || []}));
    setLoadingBills(s => ({...s, [customerName]: false}));
  };

  // Toggle broker expansion
  const toggleBroker = (key) => setExpandedBroker(expandedBroker === key ? null : key);
  const toggleCustomer = (name) => {
    if (expandedCustomer === name) {
      setExpandedCustomer(null);
    } else {
      setExpandedCustomer(name);
      loadBillsForCustomer(name);
    }
  };

  // ============ RENDER ============
  return (
    <div style={{padding:'18px 22px', background:T.bg, minHeight:'100vh', fontFamily:"'DM Sans',sans-serif"}}>

      {/* HEADER */}
      <div style={{marginBottom:18}}>
        <div style={{display:'flex', alignItems:'baseline', gap:10, marginBottom:4}}>
          <h1 style={{fontSize:24, fontWeight:800, color:T.navy, margin:0}}>📊 Outstanding Receivable</h1>
          <span style={{fontSize:11, color:T.muted, fontWeight:600, padding:'2px 8px', background:T.gold, color:'#fff', borderRadius:4, letterSpacing:0.5}}>v3</span>
        </div>
        <div style={{fontSize:12, color:T.muted}}>Agency-wise → Party-wise → Bill-wise · oldest first · with city &amp; aging</div>
      </div>

      {/* TOP KPI BAND */}
      <div style={{display:'flex', flexWrap:'wrap', gap:12, marginBottom:14}}>
        <KPICard label="Total Outstanding" value={fmtL(grand.outstanding)} sub={`${grand.bills.toLocaleString('en-IN')} bills`} color={T.red} accent={T.red} />
        <KPICard label="Total Billed"      value={fmtL(grand.billed)}      sub={`across ${grand.customers} customers`}    color={T.teal} />
        <KPICard label="Brokers"           value={grand.brokers.toLocaleString('en-IN')} sub="distinct agencies"           color={T.gold} />
        <KPICard label="Customers"         value={grand.customers.toLocaleString('en-IN')} sub="with open bills"           color={T.navy} />
        <KPICard label="Avg per Customer"  value={fmtL(grand.customers ? grand.outstanding / grand.customers : 0)}
                                            sub="outstanding"              color={T.orange} />
      </div>

      {/* FILTER BAR */}
      <div style={{
        display:'flex', flexWrap:'wrap', gap:10, alignItems:'center',
        background:T.surface, border:`1px solid ${T.border}`, borderRadius:10,
        padding:'10px 12px', marginBottom:12, position:'sticky', top:0, zIndex:5,
      }}>
        <input
          type="text"
          placeholder="Search broker / customer / city / state..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex:'1 1 280px', minWidth:200, padding:'7px 12px',
            border:`1px solid ${T.border}`, borderRadius:6, fontSize:13,
            background:T.bg, color:T.text, outline:'none',
          }}
        />
        <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
          style={{padding:'7px 10px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, background:T.surface, color:T.text}}>
          <option value="">All States</option>
          {allStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={agingFilter} onChange={e => setAgingFilter(e.target.value)}
          style={{padding:'7px 10px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, background:T.surface, color:T.text}}>
          <option value="">All Aging</option>
          <option value="not_due">Not Due</option>
          <option value="1_30">1-30 days</option>
          <option value="31_60">31-60 days</option>
          <option value="61_90">61-90 days</option>
          <option value="over_90">90+ days</option>
        </select>
        <select value={minAmount} onChange={e => setMinAmount(Number(e.target.value))}
          style={{padding:'7px 10px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, background:T.surface, color:T.text}}>
          <option value="0">Any Amount</option>
          <option value="10000">≥ ₹10K</option>
          <option value="100000">≥ ₹1L</option>
          <option value="500000">≥ ₹5L</option>
          <option value="1000000">≥ ₹10L</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{padding:'7px 10px', border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, background:T.surface, color:T.text}}>
          <option value="outstanding">Sort: Outstanding ↓</option>
          <option value="overdue">Sort: Days Overdue ↓</option>
          <option value="oldest">Sort: Oldest Bill ↑</option>
        </select>
        {(search || stateFilter || agingFilter || minAmount > 0) && (
          <button
            onClick={() => { setSearch(''); setStateFilter(''); setAgingFilter(''); setMinAmount(0); }}
            style={{padding:'7px 12px', background:T.faint, color:T.navy, border:'none', borderRadius:6, fontSize:12, fontWeight:700, cursor:'pointer'}}>
            Clear
          </button>
        )}
      </div>

      {/* MAIN TABLE */}
      {loading ? (
        <div style={{padding:60, textAlign:'center', color:T.muted}}>Loading outstanding…</div>
      ) : brokerGroups.length === 0 ? (
        <div style={{padding:60, textAlign:'center', color:T.muted, background:T.surface, border:`1px dashed ${T.border}`, borderRadius:10}}>
          No matching outstanding bills.
        </div>
      ) : (
        <div style={{background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, overflow:'hidden'}}>
          {brokerGroups.map((g) => (
            <BrokerSection
              key={g.broker_key}
              broker={g}
              expanded={expandedBroker === g.broker_key}
              onToggle={() => toggleBroker(g.broker_key)}
              expandedCustomer={expandedCustomer}
              onCustomerToggle={toggleCustomer}
              billDetails={billDetails}
              loadingBills={loadingBills}
            />
          ))}

          {/* GRAND TOTAL ROW */}
          <div style={{
            background:T.navy, color:'#fff',
            padding:'14px 18px',
            display:'flex', alignItems:'center', gap:14,
            fontWeight:800, fontSize:14, letterSpacing:0.3,
          }}>
            <span style={{flex:1}}>GRAND TOTAL</span>
            <span style={{opacity:0.7, fontSize:12, fontWeight:600}}>
              {grand.brokers} brokers · {grand.customers} customers · {grand.bills.toLocaleString('en-IN')} bills
            </span>
            <span style={{fontSize:18, color:T.gold}}>{fmtL(grand.outstanding)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
//  Broker Section — collapsible
// =============================================================================
function BrokerSection({ broker, expanded, onToggle, expandedCustomer, onCustomerToggle, billDetails, loadingBills }) {
  const t = broker.totals;
  return (
    <div style={{borderBottom:`2px solid ${T.border}`}}>
      {/* BROKER HEADER */}
      <div
        onClick={onToggle}
        style={{
          background: expanded ? T.tealLight : T.surface,
          padding:'12px 16px',
          display:'flex', alignItems:'center', gap:12,
          cursor:'pointer', userSelect:'none',
          borderLeft:`4px solid ${T.teal}`,
          transition:'background .12s',
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = T.bg; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = T.surface; }}
      >
        <span style={{fontSize:14, color:T.muted, width:14}}>{expanded ? '▼' : '▶'}</span>
        <span style={{fontSize:11, fontWeight:700, color:T.teal, background:T.tealLight, padding:'2px 8px', borderRadius:4, letterSpacing:0.5, border:`1px solid ${T.border}`}}>BROKER</span>
        <span style={{fontSize:14, fontWeight:800, color:T.navy, flex:1}}>{broker.broker_name}</span>
        <span style={{fontSize:11, color:T.muted}}>{broker.customers.length} customers</span>
        <span style={{fontSize:11, color:T.muted}}>{t.bills.toLocaleString('en-IN')} bills</span>
        <span style={{fontSize:11, color:T.muted}}>oldest: {fmtDay(t.oldest)}</span>
        <span style={{fontSize:11, color:T.red, fontWeight:700}}>max overdue: {t.maxOverdue}d</span>
        <span style={{fontSize:15, fontWeight:800, color:T.red, minWidth:120, textAlign:'right'}}>{fmtL(t.outstanding)}</span>
      </div>

      {/* CUSTOMER ROWS */}
      {expanded && (
        <div style={{background:T.bg}}>
          {broker.customers.map((c) => (
            <CustomerRow
              key={c.broker_key + '|' + c.customer_name}
              cust={c}
              expanded={expandedCustomer === c.customer_name}
              onToggle={() => onCustomerToggle(c.customer_name)}
              bills={billDetails[c.customer_name]}
              loadingBills={!!loadingBills[c.customer_name]}
            />
          ))}
          {/* BROKER SUBTOTAL */}
          <div style={{
            background:T.tealLight, color:T.navy,
            padding:'8px 16px 8px 50px',
            display:'flex', alignItems:'center', gap:14,
            fontWeight:700, fontSize:12, letterSpacing:0.3,
            borderTop:`1px solid ${T.border}`,
          }}>
            <span style={{flex:1, textTransform:'uppercase', color:T.muted}}>↳ Subtotal: {broker.broker_name}</span>
            <span style={{fontSize:13, color:T.tealDeep, minWidth:120, textAlign:'right'}}>{fmtL(t.outstanding)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
//  Customer Row — collapsible (with city + WhatsApp + Call)
// =============================================================================
function CustomerRow({ cust, expanded, onToggle, bills, loadingBills }) {
  const cityState = [cust.city, cust.state].filter(Boolean).join(' · ');
  const phoneStub = ''; // could enrich from customers table

  // Build a small aging strip indicator
  const buckets = [
    { key:'not_due', val:Number(cust.amt_not_due||0), color:T.green },
    { key:'1_30',    val:Number(cust.amt_1_30||0),    color:T.amber },
    { key:'31_60',   val:Number(cust.amt_31_60||0),   color:T.orange },
    { key:'61_90',   val:Number(cust.amt_61_90||0),   color:T.red },
    { key:'over_90', val:Number(cust.amt_over_90||0), color:T.redDeep },
  ];
  const total = buckets.reduce((s,b) => s + b.val, 0);

  return (
    <>
      {/* Customer summary row */}
      <div
        onClick={onToggle}
        style={{
          padding:'10px 16px 10px 38px',
          display:'flex', alignItems:'center', gap:12,
          background: expanded ? T.surface : 'transparent',
          borderBottom:`1px solid ${T.border}`,
          cursor:'pointer', userSelect:'none',
          transition:'background .12s',
        }}
        onMouseEnter={e => { if (!expanded) e.currentTarget.style.background = T.surface; }}
        onMouseLeave={e => { if (!expanded) e.currentTarget.style.background = 'transparent'; }}
      >
        <span style={{fontSize:11, color:T.faint, width:12}}>{expanded ? '▾' : '▸'}</span>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:13, fontWeight:700, color:T.navy, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
            {cust.customer_name}
          </div>
          <div style={{fontSize:10, color:T.muted, marginTop:2}}>
            📍 {cityState || '—'}
          </div>
        </div>

        {/* Aging strip — proportional bar */}
        {total > 0 && (
          <div style={{display:'flex', height:6, borderRadius:3, overflow:'hidden', minWidth:80, flex:'0 0 80px'}}>
            {buckets.map(b => b.val > 0 && (
              <div key={b.key} style={{background:b.color, width: (b.val / total * 100) + '%'}} />
            ))}
          </div>
        )}

        <span style={{fontSize:10, color:T.muted, minWidth:60, textAlign:'right'}}>
          {cust.bill_count} {cust.bill_count === 1 ? 'bill' : 'bills'}
        </span>
        <span style={{fontSize:10, color:T.muted, minWidth:80, textAlign:'right'}}>
          oldest: {fmtDay(cust.oldest_bill_date)}
        </span>
        <span style={{fontSize:10, color:Number(cust.max_days_overdue||0) > 90 ? T.red : T.muted, minWidth:60, textAlign:'right', fontWeight:600}}>
          {Number(cust.max_days_overdue||0)}d overdue
        </span>
        <span style={{fontSize:14, fontWeight:800, color:T.red, minWidth:110, textAlign:'right'}}>
          {fmtL(cust.total_outstanding)}
        </span>

        {/* Quick actions */}
        <div style={{display:'flex', gap:6}} onClick={e => e.stopPropagation()}>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Dear ${cust.customer_name}, gentle reminder: outstanding amount of ${fmt(cust.total_outstanding)} against ${cust.bill_count} bill(s). Kindly arrange payment. — Shreerang Trendz`)}`}
            target="_blank" rel="noreferrer"
            title="Send WhatsApp reminder"
            style={{padding:'4px 8px', background:T.whatsapp, color:'#fff', borderRadius:4, fontSize:11, fontWeight:700, textDecoration:'none'}}>
            WA
          </a>
        </div>
      </div>

      {/* Expanded — bill detail (oldest first) */}
      {expanded && (
        <div style={{padding:'4px 16px 14px 50px', background:T.bg, borderBottom:`1px solid ${T.border}`}}>
          {loadingBills ? (
            <div style={{padding:'12px 0', fontSize:11, color:T.muted}}>Loading bills…</div>
          ) : !bills ? null : bills.length === 0 ? (
            <div style={{padding:'12px 0', fontSize:11, color:T.muted}}>No bill detail available.</div>
          ) : (
            <div style={{background:T.surface, border:`1px solid ${T.border}`, borderRadius:6, overflow:'hidden'}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                <thead>
                  <tr style={{background:T.bg, color:T.muted, textTransform:'uppercase', fontSize:9, letterSpacing:0.5}}>
                    <th style={{padding:'7px 10px', textAlign:'left', fontWeight:700}}>Bill #</th>
                    <th style={{padding:'7px 10px', textAlign:'left', fontWeight:700}}>Bill Date</th>
                    <th style={{padding:'7px 10px', textAlign:'left', fontWeight:700}}>Due Date</th>
                    <th style={{padding:'7px 10px', textAlign:'left', fontWeight:700}}>Aging</th>
                    <th style={{padding:'7px 10px', textAlign:'left', fontWeight:700}}>Design / Fabric</th>
                    <th style={{padding:'7px 10px', textAlign:'right', fontWeight:700}}>Qty (m)</th>
                    <th style={{padding:'7px 10px', textAlign:'right', fontWeight:700}}>Billed</th>
                    <th style={{padding:'7px 10px', textAlign:'right', fontWeight:700}}>Paid</th>
                    <th style={{padding:'7px 10px', textAlign:'right', fontWeight:700}}>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b, idx) => (
                    <tr key={b.tally_voucher_no || idx} style={{borderTop:idx === 0 ? 'none' : `1px solid ${T.border}`}}>
                      <td style={{padding:'7px 10px', color:T.navy, fontFamily:"'DM Mono',monospace", fontWeight:700}}>{b.bill_number}</td>
                      <td style={{padding:'7px 10px', color:T.text}}>{fmtD(b.bill_date)}</td>
                      <td style={{padding:'7px 10px', color:T.muted}}>{fmtD(b.due_date)}</td>
                      <td style={{padding:'7px 10px'}}><AgingChip days={b.days_overdue} /></td>
                      <td style={{padding:'7px 10px', color:T.text}}>
                        {b.design_no && <span style={{fontWeight:700}}>D-{b.design_no} </span>}
                        <span style={{color:T.muted, fontSize:10}}>{b.fabric_name || '—'}</span>
                      </td>
                      <td style={{padding:'7px 10px', textAlign:'right', color:T.text, fontFamily:"'DM Mono',monospace"}}>{Number(b.quantity_mtrs||0).toFixed(0)}</td>
                      <td style={{padding:'7px 10px', textAlign:'right', color:T.text, fontFamily:"'DM Mono',monospace"}}>{fmt(b.billed_amount)}</td>
                      <td style={{padding:'7px 10px', textAlign:'right', color:T.green, fontFamily:"'DM Mono',monospace"}}>{Number(b.paid_amount||0) > 0 ? fmt(b.paid_amount) : '—'}</td>
                      <td style={{padding:'7px 10px', textAlign:'right', color:T.red, fontWeight:800, fontFamily:"'DM Mono',monospace"}}>{fmt(b.outstanding_amount)}</td>
                    </tr>
                  ))}
                  {/* Customer subtotal row */}
                  <tr style={{background:T.bg, fontWeight:800}}>
                    <td colSpan={6} style={{padding:'8px 10px', textAlign:'right', color:T.muted, textTransform:'uppercase', fontSize:9, letterSpacing:0.5}}>
                      ↳ Customer subtotal ({bills.length} bills)
                    </td>
                    <td style={{padding:'8px 10px', textAlign:'right', color:T.text, fontFamily:"'DM Mono',monospace"}}>
                      {fmt(bills.reduce((s,x) => s + Number(x.billed_amount||0), 0))}
                    </td>
                    <td style={{padding:'8px 10px', textAlign:'right', color:T.green, fontFamily:"'DM Mono',monospace"}}>
                      {fmt(bills.reduce((s,x) => s + Number(x.paid_amount||0), 0))}
                    </td>
                    <td style={{padding:'8px 10px', textAlign:'right', color:T.red, fontFamily:"'DM Mono',monospace"}}>
                      {fmt(bills.reduce((s,x) => s + Number(x.outstanding_amount||0), 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
