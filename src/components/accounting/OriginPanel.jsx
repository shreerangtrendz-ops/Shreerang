import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

/*
  OriginPanel — compact collapsible origin trail for SRTPL Horizon
  Props: designNo (string) OR lotNo (string) — at least one required
  Query: design_origin view
  Collapsed: single strip showing the full V-01→V-02→V-04→V-05 chain
  Expanded: 4 stage cards (Grey Purchase / Issue to Mill / REC from Mill / Jobwork Bill)
*/

const T = {
  teal: '#1D9E75', tealDark: '#0B2E2B', tealLight: '#EEF8F6', teal20: '#1D9E7533',
  amber: '#E67E22', amberLight: '#FFF3E8', amber20: '#E67E2233',
  blue: '#2468C8',
  purple: '#9B59B6',
  green: '#1E9E5A', greenLight: '#E8FFF4',
  red: '#D93025',
  border: '#D0EDE8', bg: '#F0F9F7', surface: '#FFFFFF',
  text: '#0B2E2B', muted: '#6A9B95', faint: '#A8C9C3',
};

const fmt    = n => '₹' + Math.abs(Number(n || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtMtr = n => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' m';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
const fmtRate = n => n != null ? '₹' + Number(n).toFixed(2) + '/m' : '—';

// Decode HTML entities from Tally XML (&#10; &#13; &amp; &quot; numeric codes)
const decodeHtml = str => str
  ? str
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#10;/g, ' ')
      .replace(/&#13;/g, '')
      .trim()
  : str;

function KV({ label, value, mono, color }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 9, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: color || T.text, fontWeight: 500, fontFamily: mono ? "'DM Mono',monospace" : "'DM Sans',sans-serif", wordBreak: 'break-word' }}>
        {value ?? '—'}
      </div>
    </div>
  );
}

function PendingNote({ message }) {
  return (
    <div style={{ padding: '8px 10px', background: T.amberLight, border: `1px solid ${T.amber20}`, borderRadius: 6, fontSize: 11, color: T.amber, fontWeight: 600 }}>
      ⚠ {message}
    </div>
  );
}

function ReconBadge({ status }) {
  if (!status) return null;
  const matched = status === 'MATCHED';
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: matched ? T.greenLight : T.amberLight, color: matched ? T.green : T.amber }}>
      {status}
    </span>
  );
}

function StageCard({ title, color, step, children }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 14px', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ background: color, color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
          {step}
        </span>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function OriginPanel({ designNo, lotNo }) {
  const [row, setRow]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]   = useState(false);

  useEffect(() => {
    if (!designNo && !lotNo) return;
    let cancelled = false;
    setLoading(true);
    setRow(null);

    const col = designNo ? 'design_no' : 'lot_no';
    const val = designNo || lotNo;

    supabase.from('design_origin').select('*').eq(col, val).limit(1)
      .then(({ data }) => {
        if (!cancelled) {
          setRow(data?.[0] ?? null);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [designNo, lotNo]);

  if (!designNo && !lotNo) return null;

  if (loading) {
    return (
      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.muted, padding: '6px 0' }}>
        Loading origin…
      </div>
    );
  }

  if (!row) {
    return (
      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: T.muted, padding: '6px 2px' }}>
        No origin data found in <code style={{ fontFamily: "'DM Mono',monospace" }}>design_origin</code> for {designNo ? `design ${designNo}` : `lot ${lotNo}`}
      </div>
    );
  }

  // Shortage % — use view column if present, else compute
  let shortagePct = '—';
  if (row.shortage_pct != null) {
    shortagePct = Number(row.shortage_pct).toFixed(1) + '%';
  } else if (row.issued_qty_mtrs && row.finish_qty_mtrs && Number(row.issued_qty_mtrs) > 0) {
    const pct = ((Number(row.issued_qty_mtrs) - Number(row.finish_qty_mtrs)) / Number(row.issued_qty_mtrs)) * 100;
    shortagePct = pct.toFixed(1) + '%';
  }
  const shortagePctNum = parseFloat(shortagePct);

  const millName = decodeHtml(row.mill_name || row.issue_mill_name) || '—';

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>

      {/* ── Collapsed strip ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          background: T.tealLight, border: `1px solid ${T.teal20}`,
          borderRadius: 8, padding: '8px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}
      >
        <div style={{ fontSize: 12, color: T.tealDark, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700 }}>{decodeHtml(row.supplier_name) || '—'}</span>
          {row.supplier_bill_no && (
            <>
              <span style={{ color: T.faint }}>·</span>
              <span style={{ color: T.muted, fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{decodeHtml(row.supplier_bill_no)}</span>
            </>
          )}
          <span style={{ color: T.faint }}>→</span>
          <span style={{ fontFamily: "'DM Mono',monospace", color: T.teal }}>{row.lot_no || lotNo || '—'}</span>
          <span style={{ color: T.faint }}>→</span>
          <span>{millName}</span>
          {designNo && (
            <>
              <span style={{ color: T.faint }}>→</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: T.tealDark }}>D{designNo}</span>
            </>
          )}
          {row.cost_per_mtr != null && (
            <>
              <span style={{ color: T.faint }}>·</span>
              <span style={{ fontWeight: 700, color: T.green }}>₹{Number(row.cost_per_mtr).toFixed(2)}/m</span>
            </>
          )}
        </div>
        <span style={{ fontSize: 11, color: T.teal, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {open ? '▲' : '▼'} Origin
        </span>
      </button>

      {/* ── Expanded cards ── */}
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 8 }}>

          {/* V-01 Grey Purchase */}
          <StageCard title="Grey Purchase (V-01)" color={T.amber} step="1">
            <KV label="Supplier"      value={decodeHtml(row.supplier_name)} />
            <KV label="Bill No"       value={decodeHtml(row.supplier_bill_no)} mono />
            <KV label="Purchase Date" value={fmtDate(row.purchase_date)} />
            <KV label="Rate"          value={fmtRate(row.grey_purchase_rate_from_gp)} mono />
            <KV label="Purchased"     value={row.purchased_mtrs ? fmtMtr(row.purchased_mtrs) : null} mono />
            {row.grey_broker && <KV label="Broker" value={decodeHtml(row.grey_broker)} />}
          </StageCard>

          {/* V-02 Issue to Mill */}
          <StageCard title="Issue to Mill (V-02)" color={T.blue} step="2">
            {row.issue_challan_no ? (
              <>
                <KV label="Challan No"  value={decodeHtml(row.issue_challan_no)} mono />
                <KV label="Issue Date"  value={fmtDate(row.issue_date)} />
                <KV label="Mill"        value={decodeHtml(row.issue_mill_name)} />
                <KV label="Godown"      value={decodeHtml(row.destination_godown)} />
                <KV label="Issued Qty"  value={row.issued_qty_mtrs ? fmtMtr(row.issued_qty_mtrs) : null} mono />
              </>
            ) : (
              <PendingNote message="V-02 data pending n8n v33 sync" />
            )}
          </StageCard>

          {/* V-04 REC from Mill */}
          <StageCard title="REC from Mill (V-04)" color={T.teal} step="4">
            <KV label="Rec Date"      value={fmtDate(row.rec_date)} />
            <KV label="Mill"          value={decodeHtml(row.mill_name)} />
            <KV label="Party Challan" value={decodeHtml(row.party_challan_no)} mono />
            <KV label="Finish Qty"    value={row.finish_qty_mtrs ? fmtMtr(row.finish_qty_mtrs) : null} mono />
            <KV label="Shortage"      value={shortagePct} color={!isNaN(shortagePctNum) && shortagePctNum > 5 ? T.red : undefined} />
            {row.process_type && <KV label="Process" value={decodeHtml(row.process_type)} />}
            <KV label="Cost/m"        value={fmtRate(row.cost_per_mtr)} color={T.teal} />
            {row.jw_allocated_cost != null && (
              <KV label="JW Alloc" value={fmt(row.jw_allocated_cost)} mono />
            )}
            {row.recon_status && (
              <div style={{ marginTop: 4 }}>
                <ReconBadge status={row.recon_status} />
              </div>
            )}
          </StageCard>

          {/* V-03 Jobwork Bill */}
          <StageCard title="Jobwork Bill (V-03)" color={T.purple} step="3">
            {row.jw_party_name ? (
              <>
                <KV label="JW Party"    value={decodeHtml(row.jw_party_name)} />
                <KV label="Bill Date"   value={fmtDate(row.jw_bill_date)} />
                <KV label="Bill Amt"    value={fmt(row.jw_bill_amount)} mono />
                <KV label="Net Payable" value={fmt(row.jw_net_payable)} mono />
                {row.jw_recon_status && (
                  <div style={{ marginTop: 4 }}>
                    <ReconBadge status={row.jw_recon_status} />
                  </div>
                )}
              </>
            ) : (
              <PendingNote message="JW bill not yet matched" />
            )}
          </StageCard>

        </div>
      )}
    </div>
  );
}
