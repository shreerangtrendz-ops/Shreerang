import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

// ═══════════════════════════════════════════════════════════════════
// MISSING REC FROM MILL PAGE
// Source: missing_rec_from_mill VIEW (Supabase)
// View logic: issue_to_mill LEFT JOIN rec_from_mill ON grey_lot_no = lot_no
//             WHERE rec_from_mill has no match
//
// Columns from view (all exact):
//   issue_id, lot_no, tally_voucher_no, issue_date, mill_name,
//   grey_item_name, taka_pcs, issued_qty_mtrs, issued_amount,
//   destination_godown, godown_name, narration, is_sampling, process_type,
//   supplier_name, supplier_invoice_no, gp_actual_qty_mtrs, gp_rate,
//   gp_total_amount, broker_name, days_pending, rec_sync_cutoff, urgency
//
// Urgency values: 'OVERDUE' | 'PENDING' | 'RECENT' | 'SYNC_LAG'
// ═══════════════════════════════════════════════════════════════════

const T = {
  teal:'#2BA898', tealLight:'#EEF8F6',
  red:'#D93025', redLight:'#FFF5F5',
  orange:'#E67E22', orangeLight:'#FFF8F0',
  gold:'#E8A800', goldLight:'#FFF8E8',
  green:'#1E9E5A', greenLight:'#E8FFF4',
  blue:'#2468C8', blueLight:'#EBF8FF',
  muted:'#6A9B95', border:'#D0EDE8',
  bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B',
};

const fmt  = n => n ? '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:0}) : '—';
const fmtL = n => { const v = Number(n||0); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:fmt(v); };
const fmtQ = n => n ? Number(n).toLocaleString('en-IN', {maximumFractionDigits:1})+' m' : '—';
const fmtD = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'2-digit'}) : '—';

const URGENCY = {
  OVERDUE:  { color: T.red,    bg: T.redLight,    label: '🔴 Overdue',   desc: 'Issued >60 days ago, no REC in Tally' },
  PENDING:  { color: T.orange, bg: T.orangeLight, label: '🟡 Pending',   desc: 'Issued 31–60 days ago' },
  RECENT:   { color: T.green,  bg: T.greenLight,  label: '🟢 Recent',    desc: 'Issued ≤30 days ago' },
  SYNC_LAG: { color: T.blue,   bg: T.blueLight,   label: '🔵 Sync Lag',  desc: 'Issued after last REC sync — may exist in Tally' },
};

function KPICard({ label, value, sub, color }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
      padding:'14px 18px', borderTop:`3px solid ${color}` }}>
      <div style={{ fontSize:10, color:T.muted, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:800, color:T.text }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function UrgencyBadge({ urgency }) {
  const u = URGENCY[urgency] || URGENCY.SYNC_LAG;
  return (
    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700,
      background:u.bg, color:u.color, whiteSpace:'nowrap' }}>
      {u.label}
    </span>
  );
}

export default function MissingRecFromMillPage() {
  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter,   setFilter]   = useState('ALL');
  const [search,   setSearch]   = useState('');
  const [mill,     setMill]     = useState('all');
  const [summary,  setSummary]  = useState({ overdue:0, pending:0, recent:0, sync_lag:0, total_cost:0, total_mtrs:0 });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('missing_rec_from_mill')
      .select('*')
      .order('urgency', { ascending: true })
      .order('gp_total_amount', { ascending: false, nullsFirst: false });

    const d = data || [];
    setRows(d);
    setSummary({
      overdue:   d.filter(r=>r.urgency==='OVERDUE').length,
      pending:   d.filter(r=>r.urgency==='PENDING').length,
      recent:    d.filter(r=>r.urgency==='RECENT').length,
      sync_lag:  d.filter(r=>r.urgency==='SYNC_LAG').length,
      total_cost: d.filter(r=>r.urgency!=='SYNC_LAG').reduce((s,r)=>s+Number(r.gp_total_amount||0),0),
      total_mtrs: d.filter(r=>r.urgency!=='SYNC_LAG').reduce((s,r)=>s+Number(r.gp_actual_qty_mtrs||0),0),
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Use destination_godown for mill identity — mill_name is NULL for ~97% of rows
  const allMills = [...new Set(rows.map(r=>r.destination_godown).filter(Boolean))].sort();

  const filtered = rows.filter(r => {
    if (filter !== 'ALL' && r.urgency !== filter) return false;
    if (mill !== 'all' && r.destination_godown !== mill) return false;
    if (search) {
      const sq = search.toLowerCase();
      return (r.lot_no||'').toLowerCase().includes(sq)
          || (r.destination_godown||'').toLowerCase().includes(sq)
          || (r.supplier_name||'').toLowerCase().includes(sq)
          || (r.tally_voucher_no||'').toLowerCase().includes(sq);
    }
    return true;
  });

  const TH = ({ l, r }) => (
    <th style={{ padding:'9px 12px', textAlign:r?'right':'left', fontSize:10, fontWeight:700,
      color:T.muted, textTransform:'uppercase', letterSpacing:.4,
      borderBottom:`1px solid ${T.border}`, background:T.bg, whiteSpace:'nowrap' }}>{l}</th>
  );

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:T.bg, minHeight:'100vh', padding:'20px 24px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:T.text, margin:0 }}>
            🔍 Missing REC FROM MILL
          </h1>
          <p style={{ color:T.muted, fontSize:12, margin:'4px 0 0' }}>
            Issue to Mill entries with no REC FROM MILL passed in Tally — accountant action required
          </p>
        </div>
        <button onClick={load} style={{ padding:'8px 14px', background:T.teal, color:'#fff',
          border:'none', borderRadius:8, fontWeight:600, fontSize:12, cursor:'pointer' }}>
          🔄 Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
        <KPICard label="🔴 Overdue (>60 days)"  value={summary.overdue}  sub="Must pass REC in Tally" color={T.red}/>
        <KPICard label="🟡 Pending (31-60 days)" value={summary.pending}  sub="Pass REC soon"          color={T.orange}/>
        <KPICard label="🟢 Recent (≤30 days)"    value={summary.recent}   sub="Monitor"                color={T.green}/>
        <KPICard label="🔵 Sync Lag"              value={summary.sync_lag} sub="May exist in Tally"    color={T.blue}/>
        <KPICard label="Fabric Cost at Risk"
          value={fmtL(summary.total_cost)}
          sub={`${fmtQ(summary.total_mtrs)} total metres (excl. sync lag)`}
          color={T.gold}/>
      </div>

      {/* What to do box */}
      <div style={{ background:'#FFF8E8', border:`1px solid ${T.gold}`, borderRadius:10,
        padding:'12px 16px', marginBottom:16, fontSize:12 }}>
        <b style={{ color:T.gold }}>📋 Accountant Action Guide</b>
        <div style={{ marginTop:6, color:T.text, lineHeight:1.8 }}>
          For each <b>OVERDUE</b> lot: Open Tally → <b>REC FROM MILL</b> → Enter voucher →
          Reference No = <b>Lot No</b> → Party Ch. No = mill's challan number →
          Source: grey fabric from mill godown → Destination: finished design → Main Location.
          The lot_no, mill_name, supplier_invoice_no, and qty below give you all the fields you need.
        </div>
      </div>

      {/* Filters */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10,
        padding:'10px 14px', marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>

        {/* Urgency filter tabs */}
        <div style={{ display:'flex', gap:3 }}>
          {['ALL','OVERDUE','PENDING','RECENT','SYNC_LAG'].map(u => (
            <button key={u} onClick={()=>setFilter(u)}
              style={{ padding:'5px 12px', borderRadius:6, border:'none', cursor:'pointer',
                fontSize:11, fontWeight:700,
                background: filter===u ? (URGENCY[u]?.color||T.teal) : T.bg,
                color: filter===u ? '#fff' : T.muted }}>
              {u === 'ALL' ? `All (${rows.length})` : `${URGENCY[u]?.label} (${
                u==='OVERDUE'?summary.overdue:u==='PENDING'?summary.pending:u==='RECENT'?summary.recent:summary.sync_lag
              })`}
            </button>
          ))}
        </div>

        <div style={{ flex:'1 1 180px' }}>
          <div style={{ fontSize:10, color:T.muted, fontWeight:700, marginBottom:3, textTransform:'uppercase' }}>Mill</div>
          <select value={mill} onChange={e=>setMill(e.target.value)}
            style={{ width:'100%', padding:'7px 10px', border:`1px solid ${T.border}`,
              borderRadius:7, fontSize:12, background:'#fff', outline:'none' }}>
            <option value="all">All Mills</option>
            {allMills.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ flex:'1 1 200px' }}>
          <div style={{ fontSize:10, color:T.muted, fontWeight:700, marginBottom:3, textTransform:'uppercase' }}>Search</div>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Lot no, mill, supplier, voucher…"
            style={{ width:'100%', padding:'7px 10px', border:`1px solid ${T.border}`,
              borderRadius:7, fontSize:12, outline:'none', boxSizing:'border-box' }}/>
        </div>
      </div>

      {/* Table */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:60, textAlign:'center', color:T.muted }}>Loading missing REC entries…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:60, textAlign:'center', color:T.muted }}>No missing REC entries for current filter.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
              <thead>
                <tr>
                  <TH l="Lot No"/>
                  <TH l="Issue Date"/>
                  <TH l="Days"/>
                  <TH l="Job Godown (Mill)"/>
                  <TH l="Supplier"/>
                  <TH l="Qty (m)" r/>
                  <TH l="Fabric Cost" r/>
                  <TH l="Rate" r/>
                  <TH l="Urgency"/>
                  <TH l=""/>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const exp = expanded === r.issue_id;
                  const u = URGENCY[r.urgency] || URGENCY.SYNC_LAG;
                  return (
                    <>
                      <tr key={r.issue_id}
                        onClick={() => setExpanded(exp ? null : r.issue_id)}
                        style={{ borderBottom:`1px solid ${T.border}`,
                          background: exp ? u.bg : i%2===0 ? T.surface : T.bg,
                          cursor:'pointer' }}>
                        <td style={{ padding:'9px 12px', fontFamily:'monospace', fontWeight:700,
                          color:T.teal, whiteSpace:'nowrap' }}>{r.lot_no}</td>
                        <td style={{ padding:'9px 12px', color:T.muted, whiteSpace:'nowrap' }}>{fmtD(r.issue_date)}</td>
                        <td style={{ padding:'9px 12px', textAlign:'center', fontWeight:700,
                          color: r.days_pending>60 ? T.red : r.days_pending>30 ? T.orange : T.green }}>
                          {r.days_pending}d
                        </td>
                        <td style={{ padding:'9px 12px', fontWeight:600, maxWidth:180,
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {r.destination_godown||r.mill_name||'—'}
                        </td>
                        <td style={{ padding:'9px 12px', color:T.muted, maxWidth:160,
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {r.supplier_name||'—'}
                        </td>
                        <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'monospace' }}>
                          {fmtQ(r.gp_actual_qty_mtrs)}
                        </td>
                        <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:700,
                          color:T.gold, fontFamily:'monospace' }}>
                          {fmt(r.gp_total_amount)}
                        </td>
                        <td style={{ padding:'9px 12px', textAlign:'right', color:T.muted,
                          fontFamily:'monospace' }}>
                          {r.gp_rate ? `₹${Number(r.gp_rate).toFixed(2)}/m` : '—'}
                        </td>
                        <td style={{ padding:'9px 12px' }}><UrgencyBadge urgency={r.urgency}/></td>
                        <td style={{ padding:'9px 12px', textAlign:'center', color:T.teal }}>{exp?'▲':'▼'}</td>
                      </tr>

                      {exp && (
                        <tr key={'exp-'+r.issue_id}>
                          <td colSpan={10} style={{ padding:'16px 18px', background:'#F8FFFE',
                            borderBottom:`2px solid ${u.color}` }}>

                            {/* Action guide for this specific lot */}
                            <div style={{ background:u.bg, border:`1px solid ${u.color}`, borderRadius:8,
                              padding:'10px 14px', marginBottom:14, fontSize:12 }}>
                              <b style={{ color:u.color }}>Action for this lot:</b>
                              {r.urgency === 'SYNC_LAG'
                                ? ` Issued on ${fmtD(r.issue_date)} — after last REC sync (${fmtD(r.rec_sync_cutoff)}). Check Tally to see if REC has already been passed. If yes, run n8n sync. If no, pass REC now.`
                                : ` In Tally → REC FROM MILL → Reference No: ${r.lot_no} → Job Godown: ${r.destination_godown || r.mill_name || '?'} → Supplier Invoice (Party Ch. No): confirm with mill → Grey lot: ${r.lot_no} → Main Location`}
                            </div>

                            {/* Two columns: Issue details | Grey Purchase details */}
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

                              <div>
                                <div style={{ fontSize:11, fontWeight:700, color:T.muted,
                                  textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
                                  Issue to Mill — Tally fields for REC entry
                                </div>
                                {[
                                  ['Lot No (Reference No)',    r.lot_no,                              true],
                                  ['Tally Voucher No',         r.tally_voucher_no],
                                  ['Issue Date',               fmtD(r.issue_date)],
                                  ['Job Godown (Mill)',         r.destination_godown || r.mill_name,   true],
                                  ['Mill Name (registered)',    r.mill_name],
                                  ['Source Godown',            r.godown_name],
                                  ['Grey Item',                r.grey_item_name],
                                  ['Issued Qty (m)',           fmtQ(r.issued_qty_mtrs)],
                                  ['Process Type',             r.process_type],
                                  ['Is Sampling',              r.is_sampling ? 'Yes — Sampling' : 'No — Production'],
                                  ['Narration',                r.narration],
                                  ['Days Pending',             `${r.days_pending} days`],
                                  ['REC Sync Cutoff',          fmtD(r.rec_sync_cutoff)],
                                ].filter(([,v])=>v).map(([l,v,bold])=>(
                                  <div key={l} style={{ display:'flex', justifyContent:'space-between',
                                    padding:'4px 0', borderBottom:`1px solid ${T.border}`, fontSize:12 }}>
                                    <span style={{ color:T.muted }}>{l}</span>
                                    <span style={{ fontWeight:bold?700:500 }}>{v}</span>
                                  </div>
                                ))}
                              </div>

                              <div>
                                <div style={{ fontSize:11, fontWeight:700, color:T.muted,
                                  textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
                                  Grey Purchase — original fabric details
                                </div>
                                {[
                                  ['Supplier',            r.supplier_name,        true],
                                  ['Supplier Invoice No', r.supplier_invoice_no],
                                  ['Broker',              r.broker_name],
                                  ['Actual Qty (m)',      fmtQ(r.gp_actual_qty_mtrs)],
                                  ['Rate per m',          r.gp_rate ? `₹${Number(r.gp_rate).toFixed(2)}/m` : null],
                                  ['Total Amount',        fmt(r.gp_total_amount), true],
                                ].filter(([,v])=>v).map(([l,v,bold])=>(
                                  <div key={l} style={{ display:'flex', justifyContent:'space-between',
                                    padding:'4px 0', borderBottom:`1px solid ${T.border}`, fontSize:12 }}>
                                    <span style={{ color:T.muted }}>{l}</span>
                                    <span style={{ fontWeight:bold?700:500 }}>{v}</span>
                                  </div>
                                ))}

                                {/* What accountant needs to fill in Tally */}
                                <div style={{ marginTop:14, background:T.goldLight, borderRadius:8,
                                  padding:'10px 12px', fontSize:11, color:T.text }}>
                                  <b style={{ color:T.gold }}>Fields to fill in Tally REC FROM MILL:</b>
                                  <div style={{ marginTop:6, lineHeight:2 }}>
                                    Reference No: <b>{r.lot_no}</b><br/>
                                    Lot No (OUT batch): <b>{r.lot_no}</b><br/>
                                    Job Godown: <b>{r.destination_godown || r.mill_name}</b><br/>
                                    Our Godown: <b>Main Location</b><br/>
                                    Grey item: <b>{r.grey_item_name || '—'}</b><br/>
                                    Party Ch. No: <b>confirm with mill</b>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {!loading && (
          <div style={{ padding:'10px 16px', background:T.bg, borderTop:`1px solid ${T.border}`,
            fontSize:12, color:T.muted, display:'flex', justifyContent:'space-between' }}>
            <span>Showing {filtered.length} of {rows.length} entries</span>
            <span>Total overdue fabric at risk: <b style={{ color:T.red }}>{fmtL(summary.total_cost)}</b></span>
          </div>
        )}
      </div>
    </div>
  );
}
