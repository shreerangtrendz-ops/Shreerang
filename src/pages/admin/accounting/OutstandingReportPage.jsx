import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

// ═══════════════════════════════════════════════════════════════════
// OUTSTANDING REPORT PAGE
// Source: sales_bills + receipt_payment_lines + customers
// ⚠️  receipt_payments only from Jul-2024 — bills before that appear
//     as 100% unpaid. Warning banner shown in UI.
//
// Tabs: Party-wise | City-wise | Area-wise | Broker-wise | Ageing
// Created: 06-Apr-2026
// ═══════════════════════════════════════════════════════════════════

const T = {
  teal:'#2BA898', tealLight:'#EEF8F6',
  red:'#D93025', redLight:'#FFF5F5',
  orange:'#E67E22', orangeLight:'#FFF8F0',
  gold:'#E8A800', goldLight:'#FFF8E8',
  green:'#1E9E5A', greenLight:'#E8FFF4',
  blue:'#2468C8', blueLight:'#EBF8FF',
  purple:'#7C3AED', purpleLight:'#F5F0FF',
  muted:'#6A9B95', border:'#D0EDE8',
  bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B',
};

const fmt  = n => '₹' + Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0});
const fmtL = n => { const v = Number(n||0); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:fmt(v); };
const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'2-digit'}) : '—';
const pct  = (a,b) => b ? ((a/b)*100).toFixed(1)+'%' : '—';

const AGEING_BUCKETS = [
  { key:'0_30',   label:'0–30 days',   color:T.green,  bg:T.greenLight  },
  { key:'31_60',  label:'31–60 days',  color:T.gold,   bg:T.goldLight   },
  { key:'61_90',  label:'61–90 days',  color:T.orange, bg:T.orangeLight },
  { key:'gt90',   label:'>90 days',    color:T.red,    bg:T.redLight    },
];

const TABS = ['Party-wise', 'City-wise', 'Area-wise', 'Broker-wise', 'Ageing'];

function KPICard({ label, value, sub, color, warn }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${warn ? T.orange : T.border}`,
      borderRadius:12, padding:'14px 18px', borderTop:`3px solid ${color}` }}>
      <div style={{ fontSize:10, color:T.muted, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color:T.text }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function AgeBadge({ days }) {
  if (days === null || days === undefined) return <span style={{ color:T.muted }}>—</span>;
  const d = Number(days);
  const { color, bg } = d > 90 ? { color:T.red, bg:T.redLight }
    : d > 60 ? { color:T.orange, bg:T.orangeLight }
    : d > 30 ? { color:T.gold,   bg:T.goldLight   }
    : { color:T.green, bg:T.greenLight };
  return (
    <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:bg, color, whiteSpace:'nowrap' }}>
      {d}d
    </span>
  );
}

const TH = ({ l, r, w }) => (
  <th style={{ padding:'9px 12px', textAlign:r?'right':'left', fontSize:10, fontWeight:700,
    color:T.muted, textTransform:'uppercase', letterSpacing:.4, width:w||'auto',
    borderBottom:`1px solid ${T.border}`, background:T.bg, whiteSpace:'nowrap' }}>{l}</th>
);

const TD = ({ children, r, bold, mono, color, style:s }) => (
  <td style={{ padding:'9px 12px', textAlign:r?'right':'left',
    fontWeight:bold?700:400, fontFamily:mono?'monospace':'inherit',
    color:color||T.text, ...s }}>{children}</td>
);

// ─── Dimension summary helpers ───────────────────────────────────
function buildDimensionRows(bills, dimFn) {
  const map = {};
  bills.forEach(b => {
    const key = dimFn(b) || '(Unknown)';
    if (!map[key]) map[key] = { dim:key, billed:0, received:0, outstanding:0, count:0, maxAge:0 };
    map[key].billed      += b.total_amount;
    map[key].received    += b.received;
    map[key].outstanding += b.outstanding;
    map[key].count       += 1;
    if (b.days_outstanding > map[key].maxAge) map[key].maxAge = b.days_outstanding;
  });
  return Object.values(map).sort((a,b) => b.outstanding - a.outstanding);
}

function DimensionTable({ rows, dimLabel }) {
  if (!rows.length) return <div style={{ padding:40, textAlign:'center', color:T.muted }}>No data</div>;
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
        <thead>
          <tr>
            <TH l={dimLabel} w={200}/>
            <TH l="Bills" r/>
            <TH l="Billed" r/>
            <TH l="Received" r/>
            <TH l="Outstanding" r/>
            <TH l="Recovery %" r/>
            <TH l="Oldest Bill" r/>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i) => (
            <tr key={r.dim} style={{ borderBottom:`1px solid ${T.border}`,
              background: i%2===0 ? T.surface : T.bg }}>
              <TD bold>{r.dim}</TD>
              <TD r>{r.count}</TD>
              <TD r mono>{fmtL(r.billed)}</TD>
              <TD r mono color={T.green}>{fmtL(r.received)}</TD>
              <TD r mono bold color={r.outstanding > 500000 ? T.red : r.outstanding > 100000 ? T.orange : T.text}>
                {fmtL(r.outstanding)}
              </TD>
              <TD r color={T.muted}>{pct(r.received, r.billed)}</TD>
              <td style={{ padding:'9px 12px', textAlign:'right' }}>
                <AgeBadge days={r.maxAge}/>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background:T.tealLight, fontWeight:700 }}>
            <td style={{ padding:'9px 12px', fontSize:12 }}>TOTAL</td>
            <td style={{ padding:'9px 12px', textAlign:'right', fontSize:12 }}>{rows.reduce((s,r)=>s+r.count,0)}</td>
            <td style={{ padding:'9px 12px', textAlign:'right', fontSize:12, fontFamily:'monospace' }}>{fmtL(rows.reduce((s,r)=>s+r.billed,0))}</td>
            <td style={{ padding:'9px 12px', textAlign:'right', fontSize:12, fontFamily:'monospace', color:T.green }}>{fmtL(rows.reduce((s,r)=>s+r.received,0))}</td>
            <td style={{ padding:'9px 12px', textAlign:'right', fontSize:12, fontFamily:'monospace', color:T.red, fontWeight:800 }}>{fmtL(rows.reduce((s,r)=>s+r.outstanding,0))}</td>
            <td colSpan={2}/>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Party-wise table (detailed, expandable to individual bills) ──
function PartyTable({ bills }) {
  const [expanded, setExpanded] = useState(null);
  const partyRows = buildDimensionRows(bills, b => b.customer_name);

  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
        <thead>
          <tr>
            <TH l="Party Name" w={220}/>
            <TH l="Bills" r/>
            <TH l="Billed" r/>
            <TH l="Received" r/>
            <TH l="Outstanding" r/>
            <TH l="Recovery %" r/>
            <TH l="Oldest" r/>
            <TH l="" w={30}/>
          </tr>
        </thead>
        <tbody>
          {partyRows.map((row, i) => {
            const exp = expanded === row.dim;
            const partyBills = bills.filter(b => b.customer_name === row.dim)
              .sort((a,b) => b.days_outstanding - a.days_outstanding);
            return (
              <>
                <tr key={row.dim}
                  onClick={() => setExpanded(exp ? null : row.dim)}
                  style={{ borderBottom:`1px solid ${T.border}`,
                    background: exp ? T.tealLight : i%2===0 ? T.surface : T.bg, cursor:'pointer' }}>
                  <td style={{ padding:'9px 12px', fontWeight:700 }}>{row.dim}</td>
                  <TD r>{row.count}</TD>
                  <TD r mono>{fmtL(row.billed)}</TD>
                  <TD r mono color={T.green}>{fmtL(row.received)}</TD>
                  <TD r mono bold color={row.outstanding > 500000 ? T.red : row.outstanding > 100000 ? T.orange : T.text}>
                    {fmtL(row.outstanding)}
                  </TD>
                  <TD r color={T.muted}>{pct(row.received, row.billed)}</TD>
                  <td style={{ padding:'9px 12px', textAlign:'right' }}><AgeBadge days={row.maxAge}/></td>
                  <td style={{ padding:'9px 12px', textAlign:'center', color:T.teal }}>{exp?'▲':'▼'}</td>
                </tr>

                {exp && (
                  <tr key={'exp-'+row.dim}>
                    <td colSpan={8} style={{ padding:'0 0 0 24px', background:'#F8FFFE',
                      borderBottom:`2px solid ${T.teal}` }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11.5 }}>
                        <thead>
                          <tr style={{ background:T.tealLight }}>
                            <th style={{ padding:'6px 10px', textAlign:'left', color:T.muted, fontWeight:700, fontSize:10, textTransform:'uppercase' }}>Bill No</th>
                            <th style={{ padding:'6px 10px', textAlign:'left', color:T.muted, fontWeight:700, fontSize:10, textTransform:'uppercase' }}>Bill Date</th>
                            <th style={{ padding:'6px 10px', textAlign:'right', color:T.muted, fontWeight:700, fontSize:10, textTransform:'uppercase' }}>Billed</th>
                            <th style={{ padding:'6px 10px', textAlign:'right', color:T.muted, fontWeight:700, fontSize:10, textTransform:'uppercase' }}>Received</th>
                            <th style={{ padding:'6px 10px', textAlign:'right', color:T.muted, fontWeight:700, fontSize:10, textTransform:'uppercase' }}>Outstanding</th>
                            <th style={{ padding:'6px 10px', textAlign:'right', color:T.muted, fontWeight:700, fontSize:10, textTransform:'uppercase' }}>Age</th>
                            <th style={{ padding:'6px 10px', textAlign:'left', color:T.muted, fontWeight:700, fontSize:10, textTransform:'uppercase' }}>Broker</th>
                          </tr>
                        </thead>
                        <tbody>
                          {partyBills.map(b => (
                            <tr key={b.tally_voucher_no} style={{ borderBottom:`1px solid ${T.border}` }}>
                              <td style={{ padding:'6px 10px', fontFamily:'monospace', color:T.teal, fontWeight:700 }}>{b.bill_number}</td>
                              <td style={{ padding:'6px 10px', color:T.muted }}>{fmtD(b.bill_date)}</td>
                              <td style={{ padding:'6px 10px', textAlign:'right', fontFamily:'monospace' }}>{fmt(b.total_amount)}</td>
                              <td style={{ padding:'6px 10px', textAlign:'right', fontFamily:'monospace', color:T.green }}>{fmt(b.received)}</td>
                              <td style={{ padding:'6px 10px', textAlign:'right', fontFamily:'monospace', fontWeight:700,
                                color: b.outstanding > 200000 ? T.red : b.outstanding > 50000 ? T.orange : T.text }}>
                                {fmt(b.outstanding)}
                              </td>
                              <td style={{ padding:'6px 10px', textAlign:'right' }}><AgeBadge days={b.days_outstanding}/></td>
                              <td style={{ padding:'6px 10px', color:T.muted, fontSize:11 }}>{b.broker_name||'—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Ageing tab ──────────────────────────────────────────────────
function AgeingTable({ bills }) {
  const buckets = {
    '0_30':  bills.filter(b => b.days_outstanding <= 30),
    '31_60': bills.filter(b => b.days_outstanding > 30  && b.days_outstanding <= 60),
    '61_90': bills.filter(b => b.days_outstanding > 60  && b.days_outstanding <= 90),
    'gt90':  bills.filter(b => b.days_outstanding > 90),
  };

  const sum = arr => arr.reduce((s,b) => s + b.outstanding, 0);
  const total = sum(bills);

  return (
    <div>
      {/* Bucket cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {AGEING_BUCKETS.map(bk => {
          const rows = buckets[bk.key];
          const amt  = sum(rows);
          return (
            <div key={bk.key} style={{ background:T.surface, border:`1px solid ${bk.color}`,
              borderRadius:12, padding:'14px 18px', borderTop:`3px solid ${bk.color}` }}>
              <div style={{ fontSize:10, color:bk.color, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>{bk.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:T.text }}>{fmtL(amt)}</div>
              <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{rows.length} bills · {pct(amt, total)} of total</div>
            </div>
          );
        })}
      </div>

      {/* Overdue detail table (>90 days) */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, background:T.redLight }}>
          <span style={{ fontWeight:700, color:T.red, fontSize:13 }}>
            🔴 Bills Overdue &gt;90 days — {buckets.gt90.length} bills · {fmtL(sum(buckets.gt90))}
          </span>
        </div>
        {buckets.gt90.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:T.green }}>✅ No bills overdue more than 90 days</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
              <thead>
                <tr>
                  <TH l="Bill No"/>
                  <TH l="Date"/>
                  <TH l="Party"/>
                  <TH l="City"/>
                  <TH l="Broker"/>
                  <TH l="Billed" r/>
                  <TH l="Received" r/>
                  <TH l="Outstanding" r/>
                  <TH l="Age" r/>
                </tr>
              </thead>
              <tbody>
                {buckets.gt90.sort((a,b) => b.days_outstanding - a.days_outstanding).map((b,i) => (
                  <tr key={b.tally_voucher_no} style={{ borderBottom:`1px solid ${T.border}`,
                    background: i%2===0 ? T.surface : T.redLight }}>
                    <td style={{ padding:'9px 12px', fontFamily:'monospace', color:T.teal, fontWeight:700 }}>{b.bill_number}</td>
                    <td style={{ padding:'9px 12px', color:T.muted }}>{fmtD(b.bill_date)}</td>
                    <td style={{ padding:'9px 12px', fontWeight:600, maxWidth:180,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.customer_name}</td>
                    <td style={{ padding:'9px 12px', color:T.muted }}>{b.city||'—'}</td>
                    <td style={{ padding:'9px 12px', color:T.muted, fontSize:11 }}>{b.broker_name||'—'}</td>
                    <TD r mono>{fmt(b.total_amount)}</TD>
                    <TD r mono color={T.green}>{fmt(b.received)}</TD>
                    <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'monospace',
                      fontWeight:700, color:T.red }}>{fmt(b.outstanding)}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right' }}><AgeBadge days={b.days_outstanding}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export default function OutstandingReportPage() {
  const [tab,     setTab]     = useState(0);
  const [bills,   setBills]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [minAmt,  setMinAmt]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);

    // Fetch sales_bills (only positive-value bills)
    const { data: sbData } = await supabase
      .from('sales_bills')
      .select('tally_voucher_no, bill_number, bill_date, customer_name, broker_name, total_amount')
      .gt('total_amount', 0)
      .order('bill_date', { ascending: false });

    if (!sbData) { setLoading(false); return; }

    // Fetch receipt payment lines (type=Receipt only)
    const { data: rplData } = await supabase
      .from('receipt_payment_lines')
      .select('bill_ref, bill_amount, voucher_type')
      .eq('voucher_type', 'Receipt');

    // Build receipt map: bill_ref → total received
    const recMap = {};
    (rplData || []).forEach(r => {
      recMap[r.bill_ref] = (recMap[r.bill_ref] || 0) + Number(r.bill_amount || 0);
    });

    // Fetch customer dimension data (city, state, area)
    const { data: custData } = await supabase
      .from('customers')
      .select('tally_ledger_name, city, state, area');

    const custMap = {};
    (custData || []).forEach(c => { custMap[c.tally_ledger_name] = c; });

    const today = new Date();
    const processed = sbData.map(b => {
      const received    = recMap[b.tally_voucher_no] || 0;
      const outstanding = Number(b.total_amount) - received;
      const billDate    = new Date(b.bill_date);
      const days        = Math.floor((today - billDate) / 86400000);
      const cust        = custMap[b.customer_name] || {};
      return {
        ...b,
        received,
        outstanding,
        days_outstanding: days,
        city:  cust.city  || null,
        state: cust.state || null,
        area:  cust.area  || null,
      };
    }).filter(b => b.outstanding > 0.5); // exclude fully paid

    setBills(processed);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = bills.filter(b => {
    if (minAmt && b.outstanding < Number(minAmt)) return false;
    if (search) {
      const sq = search.toLowerCase();
      return (b.customer_name||'').toLowerCase().includes(sq)
          || (b.bill_number||'').toLowerCase().includes(sq)
          || (b.city||'').toLowerCase().includes(sq)
          || (b.broker_name||'').toLowerCase().includes(sq);
    }
    return true;
  });

  const totalBilled      = filtered.reduce((s,b) => s + b.total_amount, 0);
  const totalReceived    = filtered.reduce((s,b) => s + b.received, 0);
  const totalOutstanding = filtered.reduce((s,b) => s + b.outstanding, 0);
  const partiesCount     = new Set(filtered.map(b => b.customer_name)).size;

  const cityRows    = buildDimensionRows(filtered, b => b.city || '(No city)');
  const areaRows    = buildDimensionRows(filtered, b => b.area || '(No area)');
  const brokerRows  = buildDimensionRows(filtered, b => b.broker_name || '(No broker)');

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:T.bg, minHeight:'100vh', padding:'20px 24px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:T.text, margin:0 }}>
            📊 Outstanding Report
          </h1>
          <p style={{ color:T.muted, fontSize:12, margin:'4px 0 0' }}>
            Sales bills with pending receivables — party, city, area, broker &amp; ageing analysis
          </p>
        </div>
        <button onClick={load} style={{ padding:'8px 14px', background:T.teal, color:'#fff',
          border:'none', borderRadius:8, fontWeight:600, fontSize:12, cursor:'pointer' }}>
          🔄 Refresh
        </button>
      </div>

      {/* ⚠️ Data caveat */}
      <div style={{ background:'#FFF8F0', border:`1px solid ${T.orange}`, borderRadius:8,
        padding:'10px 14px', marginBottom:16, fontSize:12, color:T.text }}>
        <b style={{ color:T.orange }}>⚠️ Data caveat:</b> Receipt payments are only synced from{' '}
        <b>July 2024</b> onwards. Bills issued before Jul-2024 will appear as fully unpaid even if
        partially or fully collected. Use with caution for bills older than ~21 months.
      </div>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
        <KPICard label="Total Outstanding" value={fmtL(totalOutstanding)} sub={`${filtered.length} bills`} color={T.red}/>
        <KPICard label="Total Billed"      value={fmtL(totalBilled)}      sub="filtered bills"             color={T.teal}/>
        <KPICard label="Total Received"    value={fmtL(totalReceived)}     sub="receipts logged"            color={T.green}/>
        <KPICard label="Recovery Rate"     value={pct(totalReceived, totalBilled)} sub="of filtered bills"  color={T.blue}/>
        <KPICard label="Parties"           value={partiesCount}            sub="unique customers"           color={T.purple}/>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search party / city / broker / bill no…"
          style={{ flex:1, minWidth:260, padding:'8px 12px', border:`1px solid ${T.border}`,
            borderRadius:8, fontSize:12, background:T.surface, color:T.text }}
        />
        <input
          type="number"
          value={minAmt}
          onChange={e => setMinAmt(e.target.value)}
          placeholder="Min outstanding (₹)"
          style={{ width:180, padding:'8px 12px', border:`1px solid ${T.border}`,
            borderRadius:8, fontSize:12, background:T.surface, color:T.text }}
        />
        {(search || minAmt) && (
          <button onClick={() => { setSearch(''); setMinAmt(''); }}
            style={{ padding:'8px 12px', background:T.bg, border:`1px solid ${T.border}`,
              borderRadius:8, fontSize:12, cursor:'pointer', color:T.muted }}>
            ✕ Clear
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16 }}>
        {TABS.map((t,i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ padding:'7px 16px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12,
              fontWeight: tab===i ? 700 : 500,
              background: tab===i ? T.teal : T.surface,
              color:       tab===i ? '#fff' : T.muted,
              boxShadow:   tab===i ? '0 2px 8px rgba(43,168,152,.3)' : 'none' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Table area */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:60, textAlign:'center', color:T.muted }}>Loading outstanding data…</div>
        ) : (
          <>
            {tab === 0 && <PartyTable bills={filtered} />}
            {tab === 1 && <DimensionTable rows={cityRows}   dimLabel="City"   />}
            {tab === 2 && <DimensionTable rows={areaRows}   dimLabel="Area"   />}
            {tab === 3 && <DimensionTable rows={brokerRows} dimLabel="Broker" />}
            {tab === 4 && <AgeingTable   bills={filtered}  />}
          </>
        )}

        {!loading && (
          <div style={{ padding:'10px 16px', background:T.bg, borderTop:`1px solid ${T.border}`,
            fontSize:12, color:T.muted, display:'flex', justifyContent:'space-between' }}>
            <span>Showing {filtered.length} outstanding bills across {partiesCount} parties</span>
            <span>Total outstanding: <b style={{ color:T.red }}>{fmtL(totalOutstanding)}</b></span>
          </div>
        )}
      </div>
    </div>
  );
}
