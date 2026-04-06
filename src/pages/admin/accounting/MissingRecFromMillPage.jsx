import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

const T = {
  teal: '#2BA898', tealDark: '#0B2E2B', tealLight: '#EEF8F6',
  gold: '#E8A800', goldLight: '#FFF8E8',
  navy: '#0B2E2B', green: '#1E9E5A', greenLight: '#E8FFF4',
  blue: '#2468C8', blueLight: '#EBF8FF',
  red: '#D93025', redLight: '#FFF5F5',
  orange: '#E67E22', orangeLight: '#FFF3E8',
  purple: '#7C3AED', purpleLight: '#F3EEFF',
  border: '#D0EDE8', bg: '#F0F9F7', surface: '#FFFFFF',
  text: '#0B2E2B', textMuted: '#6A9B95', textFaint: '#A8C9C3',
};

const fmtMtr = n => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' m';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
const PAGE = 50;

function daysSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function Badge({ label, color = T.teal, bg }) {
  return <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: bg || color + '22', color, letterSpacing: .3 }}>{label}</span>;
}

function SummaryCard({ label, value, sub, color = T.teal }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 18px', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 22, color: T.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function AlertBadge({ days }) {
  const threshold = 15;
  const warn = 10;
  if (days === null) return null;
  const color = days >= threshold ? T.red : days >= warn ? T.orange : T.green;
  const bg = days >= threshold ? T.redLight : days >= warn ? T.orangeLight : T.greenLight;
  const label = days >= threshold ? `${days}d ⚠ OVERDUE` : `${days}d`;
  return <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: bg, color, letterSpacing: .3 }}>{label}</span>;
}

export default function MissingRecFromMillPage() {
  const [missingData, setMissingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [millFilter, setMillFilter] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchMissing = useCallback(async () => {
    setLoading(true);
    // Direct query to the view missing_rec_from_mill
    const { data, error } = await supabase
      .from('missing_rec_from_mill')
      .select('*')
      .order('voucher_date', { ascending: false });

    if (!error && data) {
      setMissingData(data);
    } else {
      console.error("Error fetching missing rec:", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMissing();
  }, [fetchMissing]);

  // Derived summaries
  const filteredData = missingData.filter(d => {
    const sMatch = !search || String(d.lot_no).toLowerCase().includes(search.toLowerCase()) || String(d.mill_name).toLowerCase().includes(search.toLowerCase());
    const mMatch = !millFilter || String(d.mill_name).toLowerCase().includes(millFilter.toLowerCase());
    return sMatch && mMatch;
  });

  const totalMissingMtrs = filteredData.reduce((acc, r) => acc + Number(r.qty_mtrs || 0), 0);
  const totalMissingCount = filteredData.length;
  const overdueCount = filteredData.filter(r => daysSince(r.voucher_date) >= 15).length;
  
  const inp = { padding: '7px 10px', borderRadius: 6, border: `1px solid ${T.border}`, fontSize: 12, color: T.text, background: T.surface, outline: 'none' };

  return (
    <div style={{ background: T.bg, minHeight: '100vh', padding: '20px 16px', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 26, color: T.tealDark, margin: 0 }}>Missing Recieve from Mill</h1>
        <p style={{ fontSize: 12, color: T.textMuted, margin: '4px 0 0' }}>Actionable report for accountants to identify unaccounted fabric stuck at mills.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 20 }}>
        <SummaryCard label="Unaccounted Entries" value={totalMissingCount} sub="Missing REC in Tally" color={T.red} />
        <SummaryCard label="Total Unaccounted Mtrs" value={fmtMtr(totalMissingMtrs)} color={T.orange} />
        <SummaryCard label="Overdue (>15 days)" value={overdueCount} sub="Urgent follow-up needed" color={T.red} />
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <input placeholder="Search lot or mill..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, minWidth: 200 }} />
        <input placeholder="Filter by Mill..." value={millFilter} onChange={e => setMillFilter(e.target.value)} style={{ ...inp, minWidth: 160 }} />
        <button onClick={fetchMissing} style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: T.teal, color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginLeft: 'auto' }}>
          Refresh Data
        </button>
      </div>

      <div>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: T.textMuted }}>Scanning database for missing entries...</div>}
        
        {!loading && filteredData.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: T.green, fontWeight: 700 }}>
            🎉 Great job! No missing REC FROM MILL entries found. All issued fabric is accounted for!
          </div>
        )}

        {!loading && filteredData.map(iss => {
          const days = daysSince(iss.voucher_date);
          const isOpen = expandedRow === iss.id || expandedRow === iss.lot_no;
          
          return (
            <div key={iss.id || iss.lot_no} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
              <div 
                onClick={() => setExpandedRow(isOpen ? null : (iss.id || iss.lot_no))}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', borderLeft: `4px solid ${days >= 15 ? T.red : T.orange}` }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>Issue Lot: {iss.lot_no || '—'}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>{iss.mill_name} · Issued {fmtDate(iss.voucher_date)}</div>
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Issued Qty</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.orange }}>{fmtMtr(iss.qty_mtrs)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 100 }}>
                  <AlertBadge days={days} />
                </div>
                <div style={{ color: T.textFaint, fontSize: 16 }}>{isOpen ? '▲' : '▼'}</div>
              </div>
              
              {isOpen && (
                <div style={{ padding: '12px 16px', background: T.redLight, borderTop: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 12, color: T.red, fontWeight: 600, marginBottom: 12 }}>
                    ⚠ ACTION REQUIRED: This fabric was issued to {iss.mill_name} but has not been marked as received back in Tally. If the fabric has been received, the accountant must pass a REC FROM MILL entry in Tally for lot number: <strong>{iss.lot_no}</strong>.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
                    {[['Lot / Challan No', iss.lot_no], ['Mill Name', iss.mill_name], ['Grey Item', iss.item_name], ['Tally Voucher (Issue)', iss.tally_voucher_no], ['Issue Date', fmtDate(iss.voucher_date)], ['Days Pending', days + ' days']].map(([l,v])=>(
                      <div key={l}><div style={{ fontSize: 10, color: T.textMuted, fontWeight: 700, marginBottom: 2 }}>{l}</div><div style={{ fontSize: 13, color: T.textDark }}>{v || '—'}</div></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
