import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

/*
  DesignLedgerPanel — chronological ledger for the FULL LIFETIME of a design.
  Props: designNo (string) — required
  Query: design_ledger view (one row per voucher event, all stages, all history)

  Renders:
    [Summary bar: N grey lots, N issues, N RECs, N JW bills, N sales · lifetime totals]
    [Filter pills: All / Grey / Issue / REC / JW / Sales]
    [Timeline rows, chronological, color-coded by stage, expandable]

  Honest about the 1:many:many:many:many shape — no card is hiding anything.
*/

const T = {
  teal: '#1D9E75', tealDark: '#0B2E2B', tealLight: '#EEF8F6', teal20: '#1D9E7533',
  amber: '#E67E22', amberLight: '#FFF3E8', amber20: '#E67E2233',
  blue: '#2468C8', blueLight: '#EBF8FF',
  purple: '#9B59B6', purpleLight: '#F3EEFF',
  sales: '#7C3AED', salesLight: '#F3EEFF',
  green: '#1E9E5A', greenLight: '#E8FFF4',
  red: '#D93025', redLight: '#FEF2F2',
  border: '#D0EDE8', bg: '#F0F9F7', surface: '#FFFFFF',
  text: '#0B2E2B', muted: '#6A9B95', faint: '#A8C9C3',
};

const STAGE_META = {
  grey_purchase: { label: 'Grey Purchase', short: 'V-01', color: T.amber, bg: T.amberLight, icon: '📦' },
  issue_to_mill: { label: 'Issue to Mill', short: 'V-02', color: T.blue,  bg: T.blueLight,  icon: '🏭' },
  rec_from_mill: { label: 'REC from Mill', short: 'V-04', color: T.teal,  bg: T.tealLight,  icon: '✅' },
  jobwork_bill:  { label: 'Jobwork Bill',  short: 'V-03', color: T.purple, bg: T.purpleLight, icon: '💵' },
  sales_bill:    { label: 'Sales Bill',    short: 'V-05', color: T.sales, bg: T.salesLight, icon: '💰' },
};

const fmt    = n => '₹' + Math.abs(Number(n || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtMtr = n => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' m';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
const fmtRate = n => n != null && Number(n) !== 0 ? '₹' + Number(n).toFixed(2) + '/m' : '—';

const decodeHtml = str => str
  ? str.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
       .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
       .replace(/&#10;/g, ' ').replace(/&#13;/g, '').trim()
  : str;

function KV({ label, value, mono }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: T.text, fontFamily: mono ? "'DM Mono',monospace" : "'DM Sans',sans-serif" }}>
        {value ?? '—'}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px', borderTop: `3px solid ${color}`, minWidth: 120 }}>
      <div style={{ fontSize: 9, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function DesignLedgerPanel({ designNo }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!designNo) return;
    let cancelled = false;
    setLoading(true);

    supabase.from('design_ledger')
      .select('*')
      .eq('design_no', designNo)
      .order('event_date', { ascending: true })
      .order('stage_order', { ascending: true })
      .then(({ data, error }) => {
        if (!cancelled) {
          if (error) console.error('DesignLedger query failed:', error);
          setRows(data || []);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [designNo]);

  // Summary stats per stage
  const stats = useMemo(() => {
    const s = {
      grey_purchase: { count: 0, qty: 0, amt: 0 },
      issue_to_mill: { count: 0, qty: 0, amt: 0 },
      rec_from_mill: { count: 0, qty: 0, amt: 0 },
      jobwork_bill:  { count: 0, qty: 0, amt: 0 },
      sales_bill:    { count: 0, qty: 0, amt: 0 },
    };
    for (const r of rows) {
      if (!s[r.stage]) continue;
      s[r.stage].count++;
      s[r.stage].qty += Math.abs(Number(r.qty_mtrs || 0));
      s[r.stage].amt += Math.abs(Number(r.amount || 0));
    }
    return s;
  }, [rows]);

  // Filtered rows for display
  const displayRows = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter(r => r.stage === filter);
  }, [rows, filter]);

  // Margin summary
  const summary = useMemo(() => {
    const greyVal = stats.grey_purchase.amt;
    const jwVal   = stats.jobwork_bill.amt;
    const salesVal = stats.sales_bill.amt;
    const totalCost = greyVal + jwVal;
    const marginPct = totalCost > 0 ? ((salesVal - totalCost) / totalCost) * 100 : null;
    return {
      totalCost,
      salesVal,
      marginPct,
      profit: salesVal - totalCost,
    };
  }, [stats]);

  if (!designNo) return null;

  if (loading) {
    return (
      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, padding: 12 }}>
        Loading ledger for design {designNo}…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: T.muted, padding: 12 }}>
        No ledger entries found for design {designNo}.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>

      {/* HEADER: Lifetime summary */}
      <div style={{
        background: 'linear-gradient(135deg, ' + T.tealLight + ' 0%, ' + T.bg + ' 100%)',
        border: `1px solid ${T.teal20}`,
        borderRadius: 10, padding: '12px 14px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.tealDark }}>
            Design {designNo} — Lifetime Ledger
          </span>
          <span style={{ fontSize: 11, color: T.muted }}>
            {rows.length} events from {fmtDate(rows[0]?.event_date)} → {fmtDate(rows[rows.length - 1]?.event_date)}
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <StatCard
            label="Grey Lots"
            value={stats.grey_purchase.count}
            sub={`${fmtMtr(stats.grey_purchase.qty)} · ${fmt(stats.grey_purchase.amt)}`}
            color={T.amber}
          />
          <StatCard
            label="Issues"
            value={stats.issue_to_mill.count}
            sub={stats.issue_to_mill.qty > 0 ? fmtMtr(stats.issue_to_mill.qty) : 'qty pending'}
            color={T.blue}
          />
          <StatCard
            label="RECs"
            value={stats.rec_from_mill.count}
            sub={`${fmtMtr(stats.rec_from_mill.qty)} received`}
            color={T.teal}
          />
          <StatCard
            label="JW Bills"
            value={stats.jobwork_bill.count}
            sub={fmt(stats.jobwork_bill.amt)}
            color={T.purple}
          />
          <StatCard
            label="Sales Bills"
            value={stats.sales_bill.count}
            sub={`${fmtMtr(stats.sales_bill.qty)} · ${fmt(stats.sales_bill.amt)}`}
            color={T.sales}
          />
          {summary.marginPct != null && (
            <StatCard
              label="Lifetime Margin"
              value={(summary.marginPct >= 0 ? '+' : '') + summary.marginPct.toFixed(1) + '%'}
              sub={(summary.profit >= 0 ? '+' : '') + fmt(summary.profit) + ' profit'}
              color={summary.marginPct >= 15 ? T.green : summary.marginPct >= 0 ? T.amber : T.red}
            />
          )}
        </div>
      </div>

      {/* FILTER PILLS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <FilterPill label={`All (${rows.length})`} active={filter === 'all'} onClick={() => setFilter('all')} color={T.tealDark} />
        {Object.entries(STAGE_META).map(([key, meta]) => {
          const c = stats[key].count;
          if (c === 0) return null;
          return (
            <FilterPill
              key={key}
              label={`${meta.icon} ${meta.label} (${c})`}
              active={filter === key}
              onClick={() => setFilter(key)}
              color={meta.color}
            />
          );
        })}
      </div>

      {/* LEDGER ROWS */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
        {displayRows.map((row, idx) => {
          const meta = STAGE_META[row.stage] || { label: row.stage, color: T.muted, bg: T.bg, icon: '•', short: '' };
          const isOpen = expanded === `${row.stage}-${row.source_id}`;
          return (
            <LedgerRow
              key={`${row.stage}-${row.source_id}-${idx}`}
              row={row}
              meta={meta}
              isOpen={isOpen}
              onToggle={() => setExpanded(isOpen ? null : `${row.stage}-${row.source_id}`)}
            />
          );
        })}
      </div>
    </div>
  );
}

function FilterPill({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 14, fontSize: 11, fontWeight: 700,
        border: `1px solid ${active ? color : '#E0E7E5'}`,
        background: active ? color : T.surface,
        color: active ? '#fff' : T.muted,
        cursor: 'pointer', transition: 'all .15s',
      }}
    >
      {label}
    </button>
  );
}

function LedgerRow({ row, meta, isOpen, onToggle }) {
  const qty = row.qty_mtrs ? fmtMtr(row.qty_mtrs) : null;
  const amt = row.amount && Number(row.amount) !== 0 ? fmt(row.amount) : null;
  const shortageBad = Number(row.shortage_pct) > 8;

  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: isOpen ? meta.bg : T.surface,
          border: 'none', borderLeft: `4px solid ${meta.color}`,
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
          transition: 'background .12s',
        }}
        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = T.bg; }}
        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = T.surface; }}
      >
        {/* Icon + stage short */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, minWidth: 80 }}>
          <span style={{ fontSize: 14 }}>{meta.icon}</span>
          <span style={{
            fontSize: 9, fontWeight: 800, color: meta.color,
            background: meta.bg, padding: '2px 6px', borderRadius: 3, letterSpacing: 0.5,
          }}>{meta.short}</span>
        </div>

        {/* Date */}
        <div style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono',monospace", flexShrink: 0, minWidth: 80 }}>
          {fmtDate(row.event_date)}
        </div>

        {/* Party + reference */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {decodeHtml(row.party_name) || <span style={{ color: T.faint, fontStyle: 'italic' }}>unknown party</span>}
          </div>
          <div style={{ fontSize: 10, color: T.muted, fontFamily: "'DM Mono',monospace", marginTop: 1 }}>
            {[row.reference_no && `Ref ${decodeHtml(row.reference_no)}`, row.lot_no && `Lot ${row.lot_no}`]
              .filter(Boolean).join(' · ') || '—'}
          </div>
        </div>

        {/* Qty + rate */}
        {qty && (
          <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 110 }}>
            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: T.text }}>
              {qty}
            </div>
            {row.rate_per_mtr != null && Number(row.rate_per_mtr) !== 0 && (
              <div style={{ fontSize: 10, color: T.muted, fontFamily: "'DM Mono',monospace" }}>
                @ {fmtRate(row.rate_per_mtr)}
              </div>
            )}
          </div>
        )}

        {/* Amount */}
        {amt && (
          <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
            <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono',monospace", color: meta.color }}>
              {amt}
            </div>
          </div>
        )}

        {/* Status badge */}
        {row.status && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
            background: row.status === 'matched' || row.status === 'MATCHED' ? T.greenLight :
                        row.status === 'pending' || row.status === 'Pending' ? T.amberLight :
                        row.status === 'sampling' ? T.amberLight : T.bg,
            color: row.status === 'matched' || row.status === 'MATCHED' ? T.green :
                   row.status === 'pending' || row.status === 'Pending' ? T.amber :
                   row.status === 'sampling' ? T.amber : T.muted,
            textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0,
          }}>
            {row.status}
          </span>
        )}

        {/* Shortage badge (REC only) */}
        {row.shortage_pct != null && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
            background: shortageBad ? T.redLight : T.greenLight,
            color: shortageBad ? T.red : T.green,
            flexShrink: 0,
          }}>
            {Number(row.shortage_pct).toFixed(1)}% short
          </span>
        )}

        <span style={{ color: T.faint, fontSize: 11, flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Expanded detail */}
      {isOpen && (
        <div style={{ background: meta.bg, padding: '12px 14px 12px 34px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <KV label="Voucher No"   value={decodeHtml(row.voucher_no)} mono />
            <KV label="Reference"    value={decodeHtml(row.reference_no)} mono />
            <KV label="Lot No"       value={row.lot_no} mono />
            <KV label="Party"        value={decodeHtml(row.party_name)} />
            <KV label="Item"         value={decodeHtml(row.item_name)} />
            <KV label="Qty"          value={row.qty_mtrs != null ? fmtMtr(row.qty_mtrs) : null} mono />
            <KV label="Rate"         value={fmtRate(row.rate_per_mtr)} mono />
            <KV label="Amount"       value={row.amount != null ? fmt(row.amount) : null} mono />
            {row.shortage_pct != null && (
              <KV label="Shortage"   value={Number(row.shortage_pct).toFixed(2) + '%'} />
            )}
            {row.broker_name && <KV label="Broker" value={decodeHtml(row.broker_name)} />}
            {row.customer_state && <KV label="State" value={row.customer_state} />}
            {row.status && <KV label="Status" value={row.status} />}
          </div>
        </div>
      )}
    </div>
  );
}
