import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

const T = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6', teal100:'#9FE1CB',
  gold:'#E8A800', goldLight:'#FFF8E8',
  navy:'#0B2E2B', green:'#1E9E5A', greenLight:'#E8FFF4',
  blue:'#2468C8', blueLight:'#EBF8FF',
  red:'#D93025', redLight:'#FFF5F5',
  orange:'#E67E22', orangeLight:'#FFF3E8',
  purple:'#7C3AED', purpleLight:'#F5F3FF',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95', textFaint:'#A8C9C3',
};

const fmtDate = d => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day:'numeric', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' });
};

function Badge({ label, color = T.teal, bg }) {
  return (
    <span style={{ padding:'2px 8px', borderRadius:4, fontSize:10, fontWeight:700,
      background:bg||color+'22', color, letterSpacing:.3 }}>
      {label}
    </span>
  );
}

function SummaryCard({ label, value, sub, color = T.teal }) {
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
      padding:'14px 18px', borderTop:`3px solid ${color}` }}>
      <div style={{ fontSize:10, color:T.textMuted, fontWeight:700, textTransform:'uppercase',
        letterSpacing:.6, marginBottom:6 }}>{label}</div>
      <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:22,
        color:T.text, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:T.textMuted, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

// ── Voucher pipeline definition (V-01 → V-05) ─────────────────────────────
const VOUCHERS = [
  { id:'V-01', table:'grey_purchase',    label:'Grey Purchase',    rows:785,  status:'ok' },
  { id:'V-02', table:'issue_to_mill',    label:'Issue to Mill',    rows:0,    status:'blocked',
    note:'n8n sync BLOCKED — fix: v.reference → v.partyChNo' },
  { id:'V-03', table:'jobwork_expenses', label:'Jobwork Expenses', rows:1527, status:'ok' },
  { id:'V-04', table:'rec_from_mill',    label:'Rec from Mill',    rows:3387, status:'ok' },
  { id:'V-05', table:'sales_bills',      label:'Sales Bills',      rows:973,  status:'ok' },
];

const VOUCHER_STATUS_COLOR = { ok:T.green, blocked:T.red, partial:T.orange };

// ── Pending tasks ──────────────────────────────────────────────────────────
const PENDING = [
  { id:'T-01', tag:'Route/Sidebar', label:'MissingRecFromMillPage',
    detail:'Wire up route in App.jsx + sidebar entry', priority:'high' },
  { id:'T-02', tag:'Gold Standard', label:'PurchaseBillsPage',
    detail:'Upgrade to gold standard: teal theme, FY tabs, SummaryCards, Math.abs(), 50-row pagination', priority:'high' },
  { id:'T-03', tag:'Gold Standard', label:'ProcessIssuesPage',
    detail:'Upgrade to gold standard', priority:'medium' },
  { id:'T-04', tag:'Gold Standard', label:'JobWorkBillsPage',
    detail:'Upgrade to gold standard', priority:'medium' },
  { id:'T-05', tag:'SQL', label:'jw_allocated_cost + jw_allocation_pct',
    detail:'Implement via compute_jw_allocation() stored procedure', priority:'high' },
  { id:'T-06', tag:'n8n Sync', label:'issue_to_mill — V-02 BLOCKED',
    detail:'Fix: v.reference → v.partyChNo in n8n workflow', priority:'critical' },
];

const PRIORITY_COLOR = { critical:T.red, high:T.orange, medium:T.gold, low:T.blue };

// ── RLS status (static — cannot query from client) ────────────────────────
const RLS_TABLES = [
  { table:'grey_purchase',    rls:true,  policy:'Authenticated read; service role write' },
  { table:'issue_to_mill',    rls:true,  policy:'Authenticated read; service role write' },
  { table:'jobwork_expenses', rls:true,  policy:'Authenticated read; service role write' },
  { table:'rec_from_mill',    rls:true,  policy:'Authenticated read; service role write' },
  { table:'sales_bills',      rls:true,  policy:'Authenticated read; service role write' },
  { table:'tally_sync_log',   rls:true,  policy:'Authenticated read; service role write' },
  { table:'tally_ledgers',    rls:true,  policy:'Authenticated read; service role write' },
  { table:'tally_sync_errors',rls:true,  policy:'Authenticated read; service role write' },
  { table:'purchase_bills',   rls:true,  policy:'Authenticated read; service role write' },
  { table:'process_issues',   rls:true,  policy:'Authenticated read; service role write' },
];

const PAGE = 50;

export default function CodeReviewPage() {
  const [syncLog, setSyncLog]         = useState([]);
  const [logCount, setLogCount]       = useState(0);
  const [logPage, setLogPage]         = useState(0);
  const [loading, setLoading]         = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const totalRows = VOUCHERS.reduce((s, v) => s + v.rows, 0);
  const blockedCount = VOUCHERS.filter(v => v.status === 'blocked').length;
  const criticalTasks = PENDING.filter(t => t.priority === 'critical').length;
  const highTasks = PENDING.filter(t => t.priority === 'high').length;

  const fetchLog = useCallback(async (pg = 0) => {
    setLoading(true);
    const from = pg * PAGE, to = from + PAGE - 1;
    const { data, error, count } = await supabase
      .from('tally_sync_log')
      .select('*', { count:'exact' })
      .order('created_at', { ascending:false })
      .range(from, to);
    if (!error) {
      setSyncLog(data || []);
      setLogCount(count || 0);
    }
    setLogPage(pg);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLog(0);
    const interval = setInterval(() => fetchLog(0), 30_000);
    return () => clearInterval(interval);
  }, [fetchLog]);

  const totalLogPages = Math.ceil(logCount / PAGE);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:T.bg, minHeight:'100vh', padding:'20px 24px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:24, color:T.text, margin:0 }}>
            Horizon Code Review
          </h1>
          <div style={{ fontSize:12, color:T.textMuted, marginTop:3 }}>
            Schema stats · Sync log · RLS status · Pending tasks
            {lastRefresh && <span style={{ marginLeft:8 }}>· refreshed {fmtDate(lastRefresh)}</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <Badge label={`Project: zdekydcscwhuusliwqaz`} color={T.navy} />
          <button
            onClick={() => fetchLog(0)}
            disabled={loading}
            style={{ padding:'7px 16px', background:T.teal, color:'#fff', border:'none',
              borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', opacity:loading?0.6:1 }}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
        <SummaryCard label="Total Voucher Rows"  value={totalRows.toLocaleString('en-IN')} sub="across V-01 → V-05"              color={T.teal} />
        <SummaryCard label="Pipelines Active"    value={`${VOUCHERS.length - blockedCount} / ${VOUCHERS.length}`} sub="sync pipelines healthy" color={T.green} />
        <SummaryCard label="Pipelines Blocked"   value={blockedCount}                       sub="need immediate fix"               color={T.red} />
        <SummaryCard label="Critical Tasks"      value={criticalTasks}                      sub={`+ ${highTasks} high priority`}   color={T.orange} />
        <SummaryCard label="Sync Log Entries"    value={logCount.toLocaleString('en-IN')}   sub="tally_sync_log total"             color={T.blue} />
      </div>

      {/* Two-column: Voucher Pipeline + Pending Tasks */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

        {/* Voucher Pipeline */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`, background:T.bg,
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:15, color:T.text, fontWeight:700 }}>
              Voucher Pipeline
            </div>
            <Badge label="V-01 → V-05" color={T.teal} />
          </div>
          {VOUCHERS.map((v, i) => (
            <div key={v.id} style={{ padding:'13px 18px',
              borderBottom: i < VOUCHERS.length - 1 ? `1px solid ${T.border}` : 'none',
              background: v.status === 'blocked' ? T.redLight : '#fff' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:T.textMuted,
                    background:T.bg, border:`1px solid ${T.border}`, borderRadius:4,
                    padding:'1px 6px', flexShrink:0 }}>{v.id}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{v.label}</div>
                    <div style={{ fontSize:11, color:T.textMuted, marginTop:1,
                      fontFamily:"'DM Mono',monospace" }}>{v.table}</div>
                    {v.note && (
                      <div style={{ fontSize:11, color:T.red, marginTop:4, fontStyle:'italic' }}>
                        ⚠ {v.note}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:18,
                    color: v.rows === 0 ? T.red : T.text }}>
                    {v.rows.toLocaleString('en-IN')}
                  </div>
                  <div style={{ marginTop:3 }}>
                    <Badge
                      label={v.status === 'blocked' ? 'BLOCKED' : 'OK'}
                      color={VOUCHER_STATUS_COLOR[v.status] || T.teal}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Tasks */}
        <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`, background:T.bg,
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:15, color:T.text, fontWeight:700 }}>
              Pending Tasks
            </div>
            <Badge label={`${PENDING.length} items`} color={T.orange} />
          </div>
          {PENDING.map((t, i) => (
            <div key={t.id} style={{ padding:'13px 18px',
              borderBottom: i < PENDING.length - 1 ? `1px solid ${T.border}` : 'none',
              background: t.priority === 'critical' ? T.redLight : '#fff' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:T.textMuted,
                  background:T.bg, border:`1px solid ${T.border}`, borderRadius:4,
                  padding:'1px 5px', flexShrink:0, marginTop:1 }}>{t.id}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                    <Badge label={t.tag} color={T.blue} />
                    <Badge
                      label={t.priority.toUpperCase()}
                      color={PRIORITY_COLOR[t.priority] || T.teal}
                    />
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{t.label}</div>
                  <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>{t.detail}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Log */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
        overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`, background:T.bg,
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:15, color:T.text, fontWeight:700 }}>
              Tally Sync Log
            </div>
            <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>tally_sync_log · last {PAGE} entries</div>
          </div>
          <Badge label={`${logCount.toLocaleString()} total entries`} color={T.teal} bg={T.tealLight} />
        </div>

        {/* Table header */}
        <div style={{ display:'grid', gridTemplateColumns:'160px 100px 100px 80px 1fr',
          background:T.bg, borderBottom:`1px solid ${T.border}`, padding:'9px 16px' }}>
          {['Timestamp','Sync Type','Status','Records','Error Message'].map((h, i) => (
            <div key={i} style={{ fontSize:10, color:T.textMuted, fontWeight:700,
              textTransform:'uppercase', letterSpacing:.5,
              textAlign: i === 3 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding:50, textAlign:'center', color:T.textMuted }}>Loading sync log…</div>
        ) : syncLog.length === 0 ? (
          <div style={{ padding:50, textAlign:'center', color:T.textMuted }}>No sync log entries found</div>
        ) : syncLog.map((row, i) => {
          const ts = row.created_at || row.synced_at;
          const isError = row.status === 'error' || row.status === 'failed';
          const isPartial = row.status === 'partial';
          const statusColor = isError ? T.red : isPartial ? T.orange : T.green;
          return (
            <div key={row.id || i} style={{ display:'grid',
              gridTemplateColumns:'160px 100px 100px 80px 1fr',
              padding:'10px 16px', borderBottom:`1px solid ${T.border}`,
              background: isError ? T.redLight : '#fff', alignItems:'center' }}
              onMouseEnter={e => { if (!isError) e.currentTarget.style.background = T.bg; }}
              onMouseLeave={e => { if (!isError) e.currentTarget.style.background = '#fff'; }}>
              <div style={{ fontSize:11, color:T.textMuted, fontFamily:"'DM Mono',monospace" }}>
                {fmtDate(ts)}
              </div>
              <div style={{ fontSize:12, color:T.text, fontWeight:500 }}>
                {row.sync_type || '—'}
              </div>
              <div>
                <Badge
                  label={(row.status || '—').toUpperCase()}
                  color={statusColor}
                />
              </div>
              <div style={{ fontSize:12, textAlign:'right', fontFamily:"'DM Mono',monospace",
                color: row.records_synced > 0 ? T.text : T.textFaint }}>
                {Math.abs(row.records_synced ?? 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize:11, color:isError ? T.red : T.textMuted,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                paddingLeft:8, fontStyle: row.error_message ? 'normal' : 'italic' }}>
                {row.error_message || <span style={{ color:T.textFaint }}>no errors</span>}
              </div>
            </div>
          );
        })}

        {totalLogPages > 1 && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 20px', borderTop:`1px solid ${T.border}`, background:T.bg }}>
            <span style={{ fontSize:12, color:T.textMuted }}>
              {logCount.toLocaleString()} total · Page {logPage + 1} of {totalLogPages}
            </span>
            <div style={{ display:'flex', gap:6 }}>
              {logPage > 0 && (
                <button onClick={() => fetchLog(logPage - 1)}
                  style={{ padding:'6px 14px', border:`1px solid ${T.border}`, borderRadius:6,
                    fontSize:12, cursor:'pointer', background:'#fff', color:T.text }}>← Prev</button>
              )}
              {logPage < totalLogPages - 1 && (
                <button onClick={() => fetchLog(logPage + 1)}
                  style={{ padding:'6px 14px', background:T.teal, border:'none', borderRadius:6,
                    fontSize:12, cursor:'pointer', color:'#fff', fontWeight:700 }}>Next →</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RLS Status */}
      <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${T.border}`, background:T.bg,
          display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',Georgia,serif", fontSize:15, color:T.text, fontWeight:700 }}>
              RLS Status
            </div>
            <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>
              Row Level Security — static snapshot (client cannot query pg_policies)
            </div>
          </div>
          <Badge label={`${RLS_TABLES.filter(r => r.rls).length}/${RLS_TABLES.length} enabled`} color={T.green} bg={T.greenLight} />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:0 }}>
          {RLS_TABLES.map((r, i) => (
            <div key={r.table} style={{ padding:'12px 18px',
              borderBottom: i < RLS_TABLES.length - 2 ? `1px solid ${T.border}` : 'none',
              borderRight: i % 2 === 0 ? `1px solid ${T.border}` : 'none',
              display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:T.text,
                  fontWeight:600 }}>{r.table}</div>
                <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>{r.policy}</div>
              </div>
              <Badge
                label={r.rls ? 'RLS ON' : 'RLS OFF'}
                color={r.rls ? T.green : T.red}
                bg={r.rls ? T.greenLight : T.redLight}
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
