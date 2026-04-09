import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/* ══════════════════════════════════════════════════════════════════
   TALLY ACCOUNTING HUB — v27
   3-section layout: Sync Health · V-01→V-05 Pipeline · Supporting
   ══════════════════════════════════════════════════════════════════ */

const T = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6',
  gold:'#E8A800', goldLight:'#FFF8E8',
  navy:'#0B2E2B', green:'#1E9E5A', greenLight:'#E8FFF4',
  blue:'#2468C8', blueLight:'#EBF8FF',
  red:'#D93025', redLight:'#FFF5F5',
  orange:'#E67E22', orangeLight:'#FFF3E8',
  purple:'#9B59B6', purpleLight:'#F5F0FF',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95', textFaint:'#A8C9C3',
};

const fmtD = d => d
  ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'2-digit'})
  : '—';
const fmtAgo = d => {
  if (!d) return '—';
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 60)  return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m/60)}h ago`;
  return `${Math.floor(m/1440)}d ago`;
};
const daysSince = d => d ? Math.floor((Date.now() - new Date(d)) / 86400000) : 999;
const healthDot = d => { const n = daysSince(d); return n <= 7 ? T.green : n <= 30 ? T.orange : T.red; };

const N8N_WEBHOOK = 'https://n8n.shreerangtrendz.com/webhook/tally-sync';

// All voucher tables — used for stats + fetch
const VOUCHER_TYPES = [
  { key:'sales',       table:'sales_bills',        dateField:'bill_date'    },
  { key:'purchase',    table:'purchase_bills',      dateField:'bill_date'    },
  { key:'grey',        table:'grey_purchase',       dateField:'voucher_date' },
  { key:'issue',       table:'issue_to_mill',       dateField:'voucher_date' },
  { key:'rec',         table:'rec_from_mill',       dateField:'voucher_date' },
  { key:'jobwork',     table:'jobwork_expenses',    dateField:'voucher_date' },
  { key:'process',     table:'process_issues',      dateField:'issue_date'   },
  { key:'financial',   table:'accounting_vouchers', dateField:'voucher_date' },
  { key:'credit_note', table:'credit_note',         dateField:'voucher_date' },
  { key:'debit_note',  table:'debit_note',          dateField:'voucher_date' },
  { key:'stock_jnl',   table:'stock_journal',       dateField:'voucher_date' },
];

// V-01 → V-05 pipeline stages
const PIPELINE = [
  {
    id:'grey',    label:'Grey Fabric',     sub:'V-01 Grey Purchase',
    color:T.teal, icon:'🧵',
    statKeys:['grey'],
    viewPath:'/admin/accounting/grey-purchase',
    fetchKey:'grey',
  },
  {
    id:'issue',   label:'Issue to Mill',   sub:'V-02 Mill Dispatch',
    color:T.blue, icon:'🏭',
    statKeys:['issue'],
    viewPath:'/admin/accounting/job-work-bills',
    fetchKey:'issue',
  },
  {
    id:'mill',    label:'Mill Processing', sub:'V-04 REC · V-03 JW',
    color:T.gold, icon:'⚙️',
    statKeys:['rec','jobwork'],
    viewPath:'/admin/accounting/rec-from-mill',
    fetchKey:'rec',
    statLabels:{ rec:'REC from Mill', jobwork:'Jobwork Exp.' },
  },
  {
    id:'sales',   label:'Sales',           sub:'V-05 Sales Bills',
    color:T.purple, icon:'📤',
    statKeys:['sales'],
    viewPath:'/admin/accounting/sales-bills',
    fetchKey:'sales',
  },
];

// Supporting vouchers — 3 × 3 grid
const GRID = [
  { key:'purchase',    label:'Purchase Bills',      icon:'📥', color:'#2468C8', path:'/admin/accounting/purchase-bills' },
  { key:'grey',        label:'Grey Purchase',        icon:'🧵', color:T.teal,   path:'/admin/accounting/grey-purchase'  },
  { key:'credit_note', label:'Credit Notes',         icon:'📋', color:'#DB2777', path:null                               },
  { key:'debit_note',  label:'Debit Notes',           icon:'📝', color:T.red,    path:null                               },
  { key:'rpl',         label:'Receipt / Pmt Lines',  icon:'🧾', color:'#059669', path:null                               },
  { key:'process',     label:'Process Issues',        icon:'⚙️', color:'#6B7280', path:'/admin/accounting/process-issues' },
  { key:'missing',     label:'Missing REC',           icon:'❓', color:T.orange,  path:'/admin/accounting/missing-rec', warn:true },
  { key:'stock_jnl',   label:'Stock Journals',        icon:'📒', color:'#4338CA', path:null                               },
  { key:'financial',   label:'Financial Vouchers',    icon:'💰', color:T.teal,    path:'/admin/accounting/vouchers'       },
];

// ─── Arrow connector between pipeline cards ───────────────────────
function Arrow() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',
      width:34,flexShrink:0,alignSelf:'stretch',paddingTop:52}}>
      <span style={{fontSize:18,color:T.textFaint,fontWeight:300,lineHeight:1}}>→</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function TallyAccountingHub() {
  const navigate = useNavigate();

  const [stats, setStats]           = useState({});
  const [syncHealth, setSyncHealth] = useState(null);
  const [syncing, setSyncing]       = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [fetchingKey, setFetchingKey] = useState(null);
  const [tallyStatus, setTallyStatus] = useState('checking');

  // ─── Sync health bar (30s auto-refresh) ────────────────────────
  const loadSyncHealth = useCallback(async () => {
    try {
      const { data: last } = await supabase
        .from('tally_sync_log')
        .select('synced_at,records_synced,status')
        .order('synced_at', {ascending:false})
        .limit(1);
      const { data: recent } = await supabase
        .from('tally_sync_log')
        .select('status')
        .order('synced_at', {ascending:false})
        .limit(10);
      const errCount = (recent||[]).filter(r => r.status !== 'success').length;
      if (last?.[0]) setSyncHealth({ ...last[0], errorCount: errCount });
    } catch {}
  }, []);

  // ─── Table row counts + last entry date ────────────────────────
  const loadStats = useCallback(async () => {
    const results = {};
    await Promise.all(VOUCHER_TYPES.map(async vt => {
      try {
        const { count } = await supabase
          .from(vt.table).select('*', {count:'exact', head:true});
        const { data } = await supabase
          .from(vt.table).select(vt.dateField)
          .order(vt.dateField, {ascending:false}).limit(1);
        results[vt.key] = { count: count||0, lastDate: data?.[0]?.[vt.dateField] ?? null };
      } catch { results[vt.key] = { count:0, lastDate:null }; }
    }));
    // receipt_payment_lines — not a VOUCHER_TYPE but shown in grid
    try {
      const { count } = await supabase
        .from('receipt_payment_lines').select('*', {count:'exact', head:true});
      results['rpl'] = { count: count||0, lastDate: null };
    } catch { results['rpl'] = { count:0, lastDate:null }; }
    setStats(results);
  }, []);

  // ─── Check Tally reachability ──────────────────────────────────
  const checkTally = useCallback(async () => {
    setTallyStatus('checking');
    try {
      const r = await fetch('https://tally.shreerangtrendz.com',
        {method:'GET', signal: AbortSignal.timeout(5000)});
      setTallyStatus(r.status < 500 ? 'online' : 'offline');
    } catch { setTallyStatus('offline'); }
  }, []);

  useEffect(() => {
    loadSyncHealth();
    loadStats();
    checkTally();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh health every 30 s
  useEffect(() => {
    const id = setInterval(loadSyncHealth, 30000);
    return () => clearInterval(id);
  }, [loadSyncHealth]);

  // ─── Trigger n8n full sync ─────────────────────────────────────
  const triggerSync = useCallback(async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const r = await fetch(N8N_WEBHOOK, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({trigger:'manual'}),
      });
      const d = await r.json();
      setSyncResult(d);
      await loadStats();
      await loadSyncHealth();
    } catch (e) { setSyncResult({error: e.message}); }
    setSyncing(false);
  }, [loadStats, loadSyncHealth]);

  // ─── Fetch a single voucher type (currently triggers full sync) ─
  const fetchOne = useCallback(async (key) => {
    setFetchingKey(key);
    await triggerSync();
    setFetchingKey(null);
  }, [triggerSync]);

  // ─── Derived: sync health bar values ──────────────────────────
  const daysBehind  = syncHealth ? daysSince(syncHealth.synced_at) : null;
  const behindColor = daysBehind == null ? T.textMuted
    : daysBehind > 90 ? T.red
    : daysBehind > 30 ? T.orange
    : T.green;
  const tallyDot    = tallyStatus==='online' ? T.green
    : tallyStatus==='offline' ? T.red : T.gold;

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh',padding:'20px 24px'}}>

      {/* ── Header ── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:24,
            color:T.text,margin:0}}>Accounting Hub</h1>
          <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>
            Tally sync · 11 voucher types · pipeline health
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          {/* Tally dot */}
          <div style={{display:'flex',alignItems:'center',gap:6,background:T.surface,
            border:`1px solid ${T.border}`,borderRadius:8,padding:'6px 12px'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:tallyDot,
              boxShadow:`0 0 6px ${tallyDot}`}}/>
            <span style={{fontSize:11,fontWeight:600,color:T.text}}>
              Tally {tallyStatus==='checking'?'Checking…':tallyStatus==='online'?'Online':'Offline'}
            </span>
            <button onClick={checkTally} style={{background:'none',border:'none',
              cursor:'pointer',fontSize:11,color:T.teal,padding:0}}>↺</button>
          </div>
          {/* Sync All Now */}
          <button onClick={triggerSync} disabled={syncing}
            style={{background:syncing?'#ccc':T.teal,border:'none',borderRadius:8,
              padding:'8px 20px',color:'#fff',fontWeight:700,fontSize:12,
              cursor:syncing?'not-allowed':'pointer',
              display:'flex',alignItems:'center',gap:6}}>
            <span style={{display:'inline-block',
              animation:syncing?'spin 1s linear infinite':'none'}}>⟳</span>
            {syncing ? 'Syncing All…' : '⚡ Sync All Now'}
          </button>
        </div>
      </div>

      {/* ── Sync result banner ── */}
      {syncResult && (
        <div style={{marginBottom:16,borderRadius:8,padding:'10px 16px',fontSize:12,
          display:'flex',alignItems:'flex-start',gap:8,
          background:syncResult.error?'#FEF2F2':syncResult.status==='success'?'#ECFDF5':'#FFF7ED',
          border:`1px solid ${syncResult.error?T.red:syncResult.status==='success'?T.green:T.orange}`}}>
          <span style={{fontSize:16}}>
            {syncResult.error?'❌':syncResult.status==='success'?'✅':'⚠️'}
          </span>
          {syncResult.error
            ? <span style={{color:T.red,fontWeight:600}}>{syncResult.error}</span>
            : <div style={{flex:1}}>
                <div style={{fontWeight:700,color:T.text}}>
                  Sync {syncResult.status}{syncResult.batch ? ` · ${syncResult.batch}` : ''}
                </div>
                {syncResult.synced && (
                  <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:4}}>
                    {Object.entries(syncResult.synced).map(([k,v])=>(
                      <span key={k} style={{fontSize:10,color:T.textMuted}}>
                        <strong style={{color:T.text}}>{v}</strong> {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
          }
          <button onClick={()=>setSyncResult(null)}
            style={{marginLeft:'auto',background:'none',border:'none',
              cursor:'pointer',color:T.textMuted,fontSize:16}}>×</button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          SECTION 1 — Sync Health Bar
          ════════════════════════════════════════════════════════════ */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,
        padding:'12px 20px',marginBottom:24,
        display:'flex',alignItems:'center',gap:0,flexWrap:'wrap'}}>

        <div style={{fontSize:10,color:T.textMuted,fontWeight:700,
          textTransform:'uppercase',letterSpacing:.6,marginRight:16,whiteSpace:'nowrap'}}>
          Sync Health
        </div>

        <Pill>
          <Dot color={behindColor}/>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>
            {syncHealth ? fmtAgo(syncHealth.synced_at) : '—'}
          </span>
          <Label>last sync</Label>
        </Pill>

        <Sep/>

        <Pill>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>
            {syncHealth ? Number(syncHealth.records_synced||0).toLocaleString('en-IN') : '—'}
          </span>
          <Label>records synced</Label>
        </Pill>

        <Sep/>

        <Pill>
          <span style={{fontSize:13,fontWeight:700,color:behindColor}}>
            {daysBehind != null ? `${daysBehind}d` : '—'}
          </span>
          <Label>since last sync</Label>
          {daysBehind != null && daysBehind > 30 && (
            <span style={{padding:'2px 7px',borderRadius:4,fontSize:9,fontWeight:800,
              background:daysBehind>90?T.redLight:T.orangeLight,
              color:daysBehind>90?T.red:T.orange,
              letterSpacing:.3}}>
              {daysBehind > 90 ? 'CRITICAL' : 'STALE'}
            </span>
          )}
        </Pill>

        <Sep/>

        <Pill>
          <span style={{fontSize:13,fontWeight:700,
            color:syncHealth?.errorCount>0?T.red:T.green}}>
            {syncHealth?.errorCount ?? '—'}
          </span>
          <Label>errors (last 10)</Label>
        </Pill>

        {syncHealth?.status && (
          <>
            <Sep/>
            <span style={{padding:'3px 12px',borderRadius:20,fontSize:10,fontWeight:700,
              background:syncHealth.status==='success'?T.greenLight:T.orangeLight,
              color:syncHealth.status==='success'?T.green:T.orange}}>
              {syncHealth.status.toUpperCase()}
            </span>
          </>
        )}

        <button onClick={loadSyncHealth}
          style={{marginLeft:'auto',background:'none',border:`1px solid ${T.border}`,
            borderRadius:6,padding:'4px 10px',fontSize:11,color:T.textMuted,cursor:'pointer'}}>
          ↺ Refresh
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 2 — V-01 → V-05 Pipeline
          ════════════════════════════════════════════════════════════ */}
      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,color:T.textMuted,fontWeight:700,
          textTransform:'uppercase',letterSpacing:.7,marginBottom:12}}>
          V-01 → V-05 Pipeline
        </div>
        <div style={{display:'flex',alignItems:'stretch'}}>
          {PIPELINE.map((stage, idx) => {
            const totalCount = stage.statKeys.reduce((s,k) => s+(stats[k]?.count||0), 0);
            const lastDate   = stats[stage.statKeys[0]]?.lastDate;
            const health     = healthDot(lastDate);
            const isFetching = fetchingKey === stage.fetchKey;

            return (
              <React.Fragment key={stage.id}>
                <div style={{flex:1,minWidth:0,background:T.surface,
                  border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>

                  {/* Stage header */}
                  <div style={{background:stage.color,padding:'10px 14px',
                    display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
                      <span style={{fontSize:18,flexShrink:0}}>{stage.icon}</span>
                      <div style={{minWidth:0}}>
                        <div style={{color:'#fff',fontWeight:700,fontSize:13,
                          lineHeight:1.2,whiteSpace:'nowrap'}}>{stage.label}</div>
                        <div style={{color:'rgba(255,255,255,.75)',fontSize:10,
                          whiteSpace:'nowrap'}}>{stage.sub}</div>
                      </div>
                    </div>
                    {/* Health dot */}
                    <div style={{width:10,height:10,borderRadius:'50%',background:health,
                      boxShadow:`0 0 8px ${health}`,border:'2px solid rgba(255,255,255,.5)',
                      flexShrink:0}}
                      title={`Last entry: ${fmtD(lastDate)}`}/>
                  </div>

                  {/* Stage body */}
                  <div style={{padding:'12px 14px'}}>
                    {stage.statKeys.length === 1 ? (
                      <div style={{marginBottom:10}}>
                        <div style={{fontFamily:"'Playfair Display',Georgia,serif",
                          fontSize:26,color:T.text,lineHeight:1}}>
                          {totalCount.toLocaleString('en-IN')}
                        </div>
                        <div style={{fontSize:10,color:T.textMuted,marginTop:2}}>records</div>
                      </div>
                    ) : (
                      <div style={{display:'flex',gap:14,marginBottom:10}}>
                        {stage.statKeys.map(k => (
                          <div key={k}>
                            <div style={{fontFamily:"'Playfair Display',Georgia,serif",
                              fontSize:20,color:T.text,lineHeight:1}}>
                              {(stats[k]?.count||0).toLocaleString('en-IN')}
                            </div>
                            <div style={{fontSize:9,color:T.textMuted,marginTop:1}}>
                              {stage.statLabels?.[k] || k}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{fontSize:10,color:T.textMuted,marginBottom:12}}>
                      Last entry:{' '}
                      <span style={{color:health,fontWeight:600}}>{fmtD(lastDate)}</span>
                    </div>

                    <div style={{display:'flex',gap:6}}>
                      <button onClick={() => navigate(stage.viewPath)}
                        style={{flex:1,background:T.tealLight,border:`1px solid ${T.border}`,
                          borderRadius:6,padding:'6px 0',fontSize:11,fontWeight:600,
                          color:T.tealDark,cursor:'pointer'}}>
                        View All
                      </button>
                      <button onClick={() => fetchOne(stage.fetchKey)}
                        disabled={isFetching || syncing}
                        style={{flex:1,background:isFetching||syncing?'#ccc':stage.color,
                          border:'none',borderRadius:6,padding:'6px 0',fontSize:11,
                          fontWeight:700,color:'#fff',
                          cursor:isFetching||syncing?'not-allowed':'pointer',
                          opacity:isFetching||syncing?0.7:1}}>
                        {isFetching ? 'Syncing…' : '↓ Fetch'}
                      </button>
                    </div>
                  </div>
                </div>

                {idx < PIPELINE.length - 1 && <Arrow/>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SECTION 3 — Supporting Vouchers
          ════════════════════════════════════════════════════════════ */}
      <div>
        <div style={{fontSize:11,color:T.textMuted,fontWeight:700,
          textTransform:'uppercase',letterSpacing:.7,marginBottom:12}}>
          Supporting Vouchers
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {GRID.map(item => {
            const s         = stats[item.key];
            const isFetching = fetchingKey === item.key;
            const hasVT     = VOUCHER_TYPES.some(v => v.key === item.key);
            const health    = s?.lastDate ? healthDot(s.lastDate) : null;

            return (
              <div key={`${item.key}-${item.label}`}
                style={{background:T.surface,borderRadius:10,overflow:'hidden',
                  border:`1px solid ${item.warn?T.orange:T.border}`,
                  borderLeft:`3px solid ${item.warn?T.orange:item.color}`}}>
                <div style={{padding:'10px 14px'}}>
                  {/* Card header */}
                  <div style={{display:'flex',alignItems:'flex-start',
                    justifyContent:'space-between',marginBottom:6}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:15}}>{item.icon}</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:700,color:T.text,
                          lineHeight:1.2}}>{item.label}</div>
                        <div style={{fontSize:10,color:T.textMuted,marginTop:1}}>
                          {s ? s.count.toLocaleString('en-IN') + ' records' : '—'}
                        </div>
                      </div>
                    </div>
                    {health && (
                      <div style={{width:7,height:7,borderRadius:'50%',
                        background:health,marginTop:4,flexShrink:0}}
                        title={`Last: ${fmtD(s.lastDate)}`}/>
                    )}
                  </div>

                  {s?.lastDate && (
                    <div style={{fontSize:10,color:T.textMuted,marginBottom:8}}>
                      Last: <span style={{color:health,fontWeight:600}}>{fmtD(s.lastDate)}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{display:'flex',gap:6}}>
                    {item.path && (
                      <button onClick={() => navigate(item.path)}
                        style={{flex:1,background:T.tealLight,border:`1px solid ${T.border}`,
                          borderRadius:5,padding:'5px 0',fontSize:11,fontWeight:600,
                          color:T.tealDark,cursor:'pointer'}}>
                        View
                      </button>
                    )}
                    {hasVT && (
                      <button onClick={() => fetchOne(item.key)}
                        disabled={isFetching || syncing}
                        style={{flex:item.path?1:2,background:isFetching||syncing?'#ccc':item.color,
                          border:'none',borderRadius:5,padding:'5px 0',fontSize:11,
                          fontWeight:700,color:'#fff',
                          cursor:isFetching||syncing?'not-allowed':'pointer',
                          opacity:isFetching||syncing?0.7:1}}>
                        {isFetching ? 'Syncing…' : '↓ Fetch'}
                      </button>
                    )}
                    {item.warn && !hasVT && (
                      <span style={{flex:1,textAlign:'center',padding:'5px 0',fontSize:10,
                        fontWeight:800,color:T.orange,background:T.orangeLight,
                        borderRadius:5,border:`1px solid ${T.orange}22`}}>
                        ACTION
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Tiny inline layout helpers ────────────────────────────────────
function Pill({ children }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:6,padding:'4px 14px 4px 0',
      flexWrap:'nowrap'}}>
      {children}
    </div>
  );
}
function Label({ children }) {
  return <span style={{fontSize:11,color:T.textMuted,whiteSpace:'nowrap'}}>{children}</span>;
}
function Dot({ color }) {
  return <div style={{width:7,height:7,borderRadius:'50%',background:color,flexShrink:0}}/>;
}
function Sep() {
  return <div style={{width:1,height:20,background:T.border,flexShrink:0,margin:'0 4px'}}/>;
}
