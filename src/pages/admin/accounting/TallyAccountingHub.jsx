import { useState, useEffect, useCallback } from 'react';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

/* ══════════════════════════════════════════════════════════════════
   TALLY ACCOUNTING HUB — v26
   All 11 voucher types: fetch from Tally + view + push back
   + Design costing P&L visibility
   ══════════════════════════════════════════════════════════════════ */

const T = {
  navy:'#0B2E2B', teal:'#2BA898', tealLight:'#EEF8F6',
  green:'#1E9E5A', red:'#E74C3C', orange:'#E67E22',
  blue:'#2468C8', gold:'#E8A800', purple:'#9B59B6',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', muted:'#6A9B95',
};
const fmt = n => '₹' + Math.round(Number(n||0)).toLocaleString('en-IN');
const fmtQ = n => Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2}) + ' m';
const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
const pct  = n => n != null ? Number(n).toFixed(1)+'%' : '—';

const VOUCHER_TYPES = [
  { key:'sales',       label:'Sales Bills',         table:'sales_bills',       icon:'📤', color:T.green,  conflict:'bill_number',                  dateField:'bill_date',    partyField:'customer_name',  amtField:'total_amount' },
  { key:'purchase',    label:'Purchase Bills',       table:'purchase_bills',    icon:'📥', color:T.blue,   conflict:'bill_number',                  dateField:'bill_date',    partyField:'supplier_name',  amtField:'total_amount' },
  { key:'grey',        label:'Grey Purchase',        table:'grey_purchase',     icon:'🧵', color:'#8B5CF6', conflict:'supplier_invoice_no,voucher_date', dateField:'voucher_date', partyField:'supplier_name',  amtField:'total_amount' },
  { key:'issue',       label:'Issue to Mill',        table:'issue_to_mill',     icon:'🏭', color:'#C86020', conflict:'lot_no,voucher_date',           dateField:'voucher_date', partyField:'mill_name',      amtField:'amount' },
  { key:'rec',         label:'REC from Mill',        table:'rec_from_mill',     icon:'🏗', color:'#E8A800', conflict:'party_challan_no,voucher_date', dateField:'voucher_date', partyField:'mill_name',      amtField:'gross_amount' },
  { key:'process',     label:'Process Issues',       table:'process_issues',    icon:'⚙️', color:'#6B7280', conflict:'challan_no',                   dateField:'issue_date',   partyField:'worker_name',    amtField:'job_amount' },
  { key:'jobwork',     label:'Jobwork & Expenses',   table:'jobwork_expenses',  icon:'🧾', color:'#9333EA', conflict:'voucher_number',               dateField:'voucher_date', partyField:'party_name',     amtField:'total_amount' },
  { key:'financial',   label:'Financial Vouchers',   table:'accounting_vouchers',icon:'💰', color:T.teal,   conflict:'voucher_number,voucher_type',  dateField:'voucher_date', partyField:'party_name',     amtField:'total_amount' },
  { key:'credit_note', label:'Credit Notes',         table:'credit_note',       icon:'📋', color:'#DB2777', conflict:'tally_voucher_no',             dateField:'voucher_date', partyField:'party_name',     amtField:'party_amount' },
  { key:'debit_note',  label:'Debit Notes',          table:'debit_note',        icon:'📝', color:T.red,    conflict:'tally_voucher_no',             dateField:'voucher_date', partyField:'party_name',     amtField:'party_amount' },
  { key:'stock_jnl',  label:'Stock Journals',        table:'stock_journal',     icon:'📒', color:'#4338CA', conflict:'tally_voucher_no',             dateField:'voucher_date', partyField:'grey_item_name', amtField:'grey_qty_mtrs' },
];

const N8N_WEBHOOK = 'https://n8n.shreerangtrendz.com/webhook/tally-sync';
const TALLY_URL   = 'https://tally.shreerangtrendz.com';

function getCurrentFY() {
  const now = new Date();
  const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: `${yr}-04-01`, to: `${yr+1}-03-31`, label:`${yr}-${String(yr+1).slice(2)}` };
}

// ─── Stat Card ───────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'16px 20px',borderTop:`3px solid ${color}`}}>
      <div style={{fontSize:22,marginBottom:4}}>{icon}</div>
      <div style={{fontSize:22,fontWeight:800,color:T.navy}}>{value}</div>
      <div style={{fontSize:12,fontWeight:600,color:T.text}}>{label}</div>
      {sub && <div style={{fontSize:10,color:T.muted,marginTop:2}}>{sub}</div>}
    </div>
  );
}

// ─── Voucher Type Card ───────────────────────────────────────────
function VoucherCard({ vt, count, amount, lastSync, onView, fetching, onFetch }) {
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden',cursor:'pointer',transition:'box-shadow .15s'}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
      <div style={{background:vt.color,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:18}}>{vt.icon}</span>
        <span style={{color:'#fff',fontWeight:700,fontSize:13}}>{vt.label}</span>
      </div>
      <div style={{padding:'12px 14px'}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
          <div>
            <div style={{fontSize:20,fontWeight:800,color:T.navy}}>{(count||0).toLocaleString()}</div>
            <div style={{fontSize:10,color:T.muted}}>records</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:14,fontWeight:700,color:vt.color}}>{fmt(amount)}</div>
            <div style={{fontSize:10,color:T.muted}}>total value</div>
          </div>
        </div>
        <div style={{fontSize:10,color:T.muted,marginBottom:10}}>
          Last sync: {lastSync ? fmtD(lastSync.slice(0,10)) : '—'}
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={onView} style={{flex:1,background:T.tealLight,border:`1px solid ${T.border}`,borderRadius:6,padding:'6px 0',fontSize:11,fontWeight:600,color:T.navy,cursor:'pointer'}}>
            View All
          </button>
          <button onClick={onFetch} disabled={fetching}
            style={{flex:1,background:fetching?'#ccc':vt.color,border:'none',borderRadius:6,padding:'6px 0',fontSize:11,fontWeight:700,color:'#fff',cursor:fetching?'not-allowed':'pointer',opacity:fetching?.7:1}}>
            {fetching?'Syncing…':'↓ Fetch'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Design Costing Row ──────────────────────────────────────────
function CostingRow({ row, expanded, onToggle }) {
  const margin = Number(row.gross_margin_pct||0);
  const marginColor = margin>20?T.green:margin>5?T.gold:T.red;
  return (
    <>
      <tr onClick={onToggle} style={{cursor:'pointer',background:expanded?T.tealLight:'#fff',borderBottom:`1px solid ${T.border}`}}>
        <td style={{padding:'8px 12px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {row.primary_image_url
              ? <img src={row.primary_image_url} style={{width:36,height:36,objectFit:'cover',borderRadius:4}} />
              : <div style={{width:36,height:36,background:T.tealLight,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>🎨</div>}
            <div>
              <div style={{fontWeight:700,color:T.navy,fontSize:12}}>D No-{row.design_no}</div>
              <div style={{fontSize:10,color:T.muted}}>{(row.finish_item_name||'').slice(0,30)}</div>
            </div>
          </div>
        </td>
        <td style={{padding:'8px 12px',fontSize:11}}>{row.mill_name||'—'}</td>
        <td style={{padding:'8px 12px',fontSize:11,textAlign:'right'}}>{fmtQ(row.finish_qty_mtrs)}</td>
        <td style={{padding:'8px 12px',fontSize:11,textAlign:'right',color:T.blue}}>{fmt(row.factory_cost_per_mtr||0)}/m</td>
        <td style={{padding:'8px 12px',fontSize:11,textAlign:'right',color:T.green}}>{fmt(row.avg_selling_rate||0)}/m</td>
        <td style={{padding:'8px 12px',fontSize:11,textAlign:'right',color:marginColor,fontWeight:700}}>
          {pct(row.gross_margin_pct)}
        </td>
        <td style={{padding:'8px 12px',fontSize:11,textAlign:'right'}}>{fmtQ(row.unsold_qty_mtrs||0)}</td>
        <td style={{padding:'8px 12px',fontSize:11,textAlign:'center'}}>
          <span style={{fontSize:10}}>{expanded?'▲':'▼'}</span>
        </td>
      </tr>
      {expanded && (
        <tr style={{background:'#FAFFFE'}}>
          <td colSpan={8} style={{padding:'0 12px 12px 12px'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,paddingTop:8}}>
              {[
                ['Lot No',          row.lot_no||'—',                           T.text,  false],
                ['Supplier',        row.supplier_name||'—',                    T.text,  false],
                ['Supplier Invoice',row.supplier_invoice_no||'—',              T.blue,  true ],
                ['Process Date',    fmtD(row.process_date),                    T.muted, false],
                ['Grey Issued',     fmtQ(row.grey_issued_qty_mtrs),            T.text,  false],
                ['Finish Received', fmtQ(row.finish_qty_mtrs),                 T.green, false],
                ['Shortage',        fmtQ(row.short_qty_mtrs)+' ('+pct(row.shortage_pct)+')', T.red, false],
                ['Grey Purchase Rate', fmt(row.grey_purchase_rate||0)+'/m',    T.blue,  false],
                ['Grey Fabric Cost', fmt(row.grey_fabric_cost||0),             T.text,  false],
                ['Mill Processing', fmt(row.mill_processing_cost||0)+' @'+fmt(row.mill_processing_rate||0)+'/m', T.text, false],
                ['Total Batch Cost', fmt(row.total_batch_cost||0),             T.navy,  true ],
                ['Factory Cost/m',  fmt(row.factory_cost_per_mtr||0),         T.red,   true ],
                ['Sold Qty',        fmtQ(row.sold_qty_mtrs),                  T.green, false],
                ['Gross Revenue',   fmt(row.gross_revenue||0),                 T.green, false],
                ['Credit Note Adj', fmt(row.credit_note_adj||0),               T.red,   false],
                ['Net Revenue',     fmt(row.net_revenue||0),                   T.green, true ],
                ['Broker Comm',     fmt(row.broker_commission||0),             T.orange,false],
                ['Avg Selling/m',   fmt(row.avg_selling_rate||0),              T.green, false],
                ['Profit/m',        fmt(row.profit_per_mtr||0),                margin>0?T.green:T.red, true],
                ['Sales Bills',     String(row.sales_bills_count||0),          T.muted, false],
              ].map(([lbl,val,col,bold])=>(
                <div key={lbl} style={{background:T.surface,borderRadius:6,padding:'6px 10px',border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:9,color:T.muted,textTransform:'uppercase',letterSpacing:'.5px'}}>{lbl}</div>
                  <div style={{fontSize:12,fontWeight:bold?700:500,color:col,marginTop:1}}>{val}</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function TallyAccountingHub() {
  const fy = getCurrentFY();
  const [stats, setStats]           = useState({});
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [tab, setTab]               = useState('overview');   // overview | costing | vouchers
  const [fetchingKey, setFetchingKey] = useState(null);

  // Costing
  const [costing, setCosting]       = useState([]);
  const [costLoading, setCostLoading] = useState(false);
  const [costExpanded, setCostExpanded] = useState(null);
  const [costSearch, setCostSearch] = useState('');
  const [costSort, setCostSort]     = useState('gross_margin_pct');

  // Sync state
  const [syncState, setSyncState]   = useState(null);
  const [tallyStatus, setTallyStatus] = useState('checking');

  const [dateFrom, setDateFrom]     = useState(fy.from);
  const [dateTo, setDateTo]         = useState(fy.to);

  // ─── Load table stats ──────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setLoading(true);
    const results = {};
    await Promise.all(VOUCHER_TYPES.map(async vt => {
      try {
        const { count } = await supabase.from(vt.table).select('*',{count:'exact',head:true});
        // Get max date and total
        const { data } = await supabase.from(vt.table)
          .select(`${vt.dateField},${vt.amtField}`)
          .order(vt.dateField,{ascending:false}).limit(1);
        const { data: totData } = await supabase.from(vt.table)
          .select(vt.amtField).gte(vt.dateField, dateFrom).lte(vt.dateField, dateTo);
        const total = (totData||[]).reduce((s,r)=>s+Number(r[vt.amtField]||0),0);
        results[vt.key] = {
          count: count||0,
          lastSync: data?.[0]?.[vt.dateField],
          amount: total
        };
      } catch { results[vt.key] = {count:0,lastSync:null,amount:0}; }
    }));
    setStats(results);

    // Load sync state
    try {
      const { data } = await supabase.from('tally_sync_state')
        .select('*').eq('sync_type','vouchers').single();
      setSyncState(data);
    } catch {}

    setLoading(false);
  }, [dateFrom, dateTo]);

  // ─── Check Tally status ────────────────────────────────────────
  const checkTally = useCallback(async () => {
    setTallyStatus('checking');
    try {
      const r = await fetch(TALLY_URL, {method:'GET',signal:AbortSignal.timeout(5000)});
      setTallyStatus(r.status < 500 ? 'online' : 'offline');
    } catch { setTallyStatus('offline'); }
  }, []);

  // ─── Load design costing ───────────────────────────────────────
  const loadCosting = useCallback(async () => {
    setCostLoading(true);
    try {
      const { data, error } = await supabase.from('design_costing_v1')
        .select('*').order(costSort, {ascending:false}).limit(200);
      if (!error) setCosting(data||[]);
    } catch {}
    setCostLoading(false);
  }, [costSort]);

  useEffect(() => { loadStats(); checkTally(); }, [loadStats, checkTally]);
  useEffect(() => { if (tab==='costing') loadCosting(); }, [tab, loadCosting]);

  // ─── Trigger n8n sync ─────────────────────────────────────────
  const triggerSync = async (fromDate, toDate) => {
    setSyncing(true); setSyncResult(null);
    try {
      const r = await fetch(N8N_WEBHOOK, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ from: fromDate, to: toDate, trigger:'manual' })
      });
      const d = await r.json();
      setSyncResult(d);
      await loadStats();
    } catch(e) { setSyncResult({error:e.message}); }
    setSyncing(false);
  };

  // ─── Fetch single voucher type ─────────────────────────────────
  const fetchVoucherType = async (vt) => {
    setFetchingKey(vt.key);
    await triggerSync(dateFrom, dateTo);
    setFetchingKey(null);
  };

  // ─── KPIs ──────────────────────────────────────────────────────
  const totalSales     = stats.sales?.amount||0;
  const totalPurchase  = (stats.purchase?.amount||0) + (stats.grey?.amount||0);
  const totalJobwork   = stats.jobwork?.amount||0;
  const totalReceipts  = stats.financial?.amount||0;
  const totalRecords   = VOUCHER_TYPES.reduce((s,vt)=>s+(stats[vt.key]?.count||0),0);

  // ─── Costing filters ──────────────────────────────────────────
  const filteredCosting = costing.filter(r =>
    !costSearch || String(r.design_no).includes(costSearch) ||
    (r.finish_item_name||'').toLowerCase().includes(costSearch.toLowerCase()) ||
    (r.mill_name||'').toLowerCase().includes(costSearch.toLowerCase())
  );

  // Costing aggregates
  const costAgg = filteredCosting.reduce((a,r)=>({
    totalBatchCost: a.totalBatchCost+(Number(r.total_batch_cost)||0),
    totalRevenue:   a.totalRevenue+(Number(r.net_revenue)||0),
    totalUnsold:    a.totalUnsold+(Number(r.unsold_qty_mtrs)||0),
    count: a.count+1
  }),{totalBatchCost:0,totalRevenue:0,totalUnsold:0,count:0});
  const overallMargin = costAgg.totalBatchCost>0
    ? ((costAgg.totalRevenue-costAgg.totalBatchCost)/costAgg.totalBatchCost*100).toFixed(1)
    : '—';

  const tallyDot = tallyStatus==='online'?T.green:tallyStatus==='offline'?T.red:'#F59E0B';

  return (
    <div style={{minHeight:'100vh',background:T.bg,padding:'20px 24px',fontFamily:"'DM Sans',sans-serif"}}>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontSize:22,fontWeight:800,color:T.navy,margin:0}}>⚡ Tally Accounting Hub</h1>
            <p style={{fontSize:12,color:T.muted,margin:'4px 0 0'}}>All vouchers · Sync status · Design P&L · Push to Tally</p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            {/* Tally status */}
            <div style={{display:'flex',alignItems:'center',gap:6,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:'6px 12px'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:tallyDot,boxShadow:`0 0 6px ${tallyDot}`}} />
              <span style={{fontSize:11,fontWeight:600,color:T.text}}>
                Tally {tallyStatus==='checking'?'Checking…':tallyStatus==='online'?'Online':'Offline'}
              </span>
              <button onClick={checkTally} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:T.teal,padding:0}}>↺</button>
            </div>
            {/* Sync state */}
            {syncState && (
              <div style={{fontSize:11,color:T.muted,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:'6px 12px'}}>
                Last sync: {fmtD(syncState.last_synced_voucher_date)} · {(syncState.total_records_synced||0).toLocaleString()} records
              </div>
            )}
            {/* Date range */}
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                style={{fontSize:11,padding:'5px 8px',border:`1px solid ${T.border}`,borderRadius:6,color:T.text}} />
              <span style={{fontSize:11,color:T.muted}}>to</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                style={{fontSize:11,padding:'5px 8px',border:`1px solid ${T.border}`,borderRadius:6,color:T.text}} />
            </div>
            <button onClick={()=>triggerSync(dateFrom,dateTo)} disabled={syncing||tallyStatus!=='online'}
              style={{background:syncing||tallyStatus!=='online'?'#ccc':T.teal,border:'none',borderRadius:8,padding:'8px 20px',color:'#fff',fontWeight:700,fontSize:12,cursor:syncing||tallyStatus!=='online'?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:6}}>
              <span style={{display:'inline-block',animation:syncing?'spin 1s linear infinite':'none'}}>⟳</span>
              {syncing?'Syncing All…':'⚡ Sync All Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div style={{marginBottom:16,background:syncResult.error?'#FEF2F2':syncResult.status==='success'?'#ECFDF5':'#FFF7ED',
          border:`1px solid ${syncResult.error?T.red:syncResult.status==='success'?T.green:T.orange}`,
          borderRadius:8,padding:'10px 16px',fontSize:12,display:'flex',alignItems:'flex-start',gap:8,flexWrap:'wrap'}}>
          <span style={{fontSize:16}}>{syncResult.error?'❌':syncResult.status==='success'?'✅':'⚠️'}</span>
          {syncResult.error ? (
            <span style={{color:T.red,fontWeight:600}}>{syncResult.error}</span>
          ) : (
            <div>
              <div style={{fontWeight:700,color:T.navy,marginBottom:4}}>
                Sync {syncResult.status} · {syncResult.batch}
              </div>
              {syncResult.synced && (
                <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                  {Object.entries(syncResult.synced).map(([k,v])=>(
                    <span key={k} style={{fontSize:10,color:T.muted}}>
                      <strong style={{color:T.navy}}>{v}</strong> {k}
                    </span>
                  ))}
                </div>
              )}
              {syncResult.log && (
                <details style={{marginTop:6}}>
                  <summary style={{fontSize:10,color:T.teal,cursor:'pointer'}}>View sync log</summary>
                  <pre style={{fontSize:9,color:T.muted,marginTop:4,maxHeight:120,overflow:'auto',background:'#f8f8f8',padding:6,borderRadius:4}}>
                    {(syncResult.log||[]).join('\n')}
                  </pre>
                </details>
              )}
            </div>
          )}
          <button onClick={()=>setSyncResult(null)} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:T.muted,fontSize:16}}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:`2px solid ${T.border}`}}>
        {[
          {key:'overview', label:'📊 Overview'},
          {key:'costing',  label:'💹 Design Costing'},
          {key:'vouchers', label:'📋 All Vouchers'},
        ].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{padding:'8px 20px',borderRadius:'8px 8px 0 0',border:`2px solid ${tab===t.key?T.teal:T.border}`,
              borderBottom:'none',background:tab===t.key?T.teal:T.surface,color:tab===t.key?'#fff':T.text,
              fontWeight:tab===t.key?700:500,fontSize:12,cursor:'pointer',marginBottom:-2}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW ── */}
      {tab==='overview' && (
        <>
          {/* KPI Row */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
            <StatCard label="Total Sales" value={fmt(totalSales)} sub={fy.label} color={T.green} icon="📤" />
            <StatCard label="Total Purchases" value={fmt(totalPurchase)} sub="Grey + Bills" color={T.blue} icon="📥" />
            <StatCard label="Jobwork Cost" value={fmt(totalJobwork)} sub="Mill processing" color={T.orange} icon="🏭" />
            <StatCard label="Vouchers Synced" value={totalRecords.toLocaleString()} sub="All types" color={T.teal} icon="🔄" />
            <StatCard label="Receipt Lines" value={loading?'…':'Ready'} sub="receipt_payment_lines" color={T.purple} icon="💰" />
          </div>

          {/* Voucher Type Cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
            {VOUCHER_TYPES.map(vt => (
              <VoucherCard key={vt.key} vt={vt}
                count={stats[vt.key]?.count||0}
                amount={stats[vt.key]?.amount||0}
                lastSync={stats[vt.key]?.lastSync}
                fetching={fetchingKey===vt.key}
                onFetch={()=>fetchVoucherType(vt)}
                onView={()=>setTab('vouchers')}
              />
            ))}
          </div>

          {/* Info panel */}
          <div style={{marginTop:20,background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'16px 20px'}}>
            <h3 style={{fontSize:13,fontWeight:700,color:T.navy,margin:'0 0 12px'}}>📐 Key Business Relationships</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
              {[
                ['grey_purchase → issue_to_mill','lot_no links purchase to mill issue challan'],
                ['issue_to_mill → rec_from_mill','grey_lot_no = lot_no links what was issued to what returned'],
                ['rec_from_mill → jobwork_expenses','party_challan_no links receipt to mill\'s invoice'],
                ['rec_from_mill → sales_bills','design_no links finished fabric to sale'],
                ['sales_bills → receipt_payments','bill_number links invoice to customer payment'],
                ['receipt_payment_lines','Per-bill breakdown with broker UDF fields for exact outstanding'],
              ].map(([key,val])=>(
                <div key={key} style={{background:T.tealLight,borderRadius:6,padding:'8px 12px'}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.teal,fontFamily:'monospace'}}>{key}</div>
                  <div style={{fontSize:10,color:T.muted,marginTop:2}}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── TAB: DESIGN COSTING ── */}
      {tab==='costing' && (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,flexWrap:'wrap'}}>
            <input value={costSearch} onChange={e=>setCostSearch(e.target.value)}
              placeholder="Search design no, fabric, mill…"
              style={{flex:'1 1 200px',minWidth:0,padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,color:T.text}} />
            <select value={costSort} onChange={e=>setCostSort(e.target.value)}
              style={{padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,color:T.text,background:T.surface}}>
              <option value="gross_margin_pct">Sort: Margin %</option>
              <option value="profit_per_mtr">Sort: Profit/m</option>
              <option value="total_batch_cost">Sort: Batch Cost</option>
              <option value="net_revenue">Sort: Revenue</option>
              <option value="process_date">Sort: Date</option>
              <option value="unsold_qty_mtrs">Sort: Unsold Stock</option>
            </select>
            <button onClick={loadCosting} disabled={costLoading}
              style={{background:T.teal,border:'none',borderRadius:8,padding:'8px 16px',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>
              {costLoading?'Loading…':'⟳ Refresh'}
            </button>
          </div>

          {/* Costing KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
            <StatCard label="Designs" value={costAgg.count} sub="in range" color={T.teal} icon="🎨" />
            <StatCard label="Total Batch Cost" value={fmt(costAgg.totalBatchCost)} sub="Grey+Job" color={T.red} icon="🏭" />
            <StatCard label="Net Revenue" value={fmt(costAgg.totalRevenue)} sub="After CN" color={T.green} icon="💰" />
            <StatCard label="Overall Margin" value={overallMargin+'%'} sub="(Revenue-Cost)/Cost" color={Number(overallMargin)>15?T.green:T.orange} icon="📊" />
            <StatCard label="Unsold Stock" value={fmtQ(costAgg.totalUnsold)} sub="At factory cost" color={T.gold} icon="📦" />
          </div>

          {/* Costing Table */}
          {costLoading ? (
            <div style={{textAlign:'center',padding:40,color:T.muted}}>Loading design costing data…</div>
          ) : filteredCosting.length === 0 ? (
            <div style={{textAlign:'center',padding:40,color:T.muted}}>
              No costing data found.{' '}
              <button onClick={loadCosting} style={{color:T.teal,background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>Refresh</button>
            </div>
          ) : (
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead>
                  <tr style={{background:T.navy}}>
                    {['Design','Mill','Finish Qty','Cost/m','Sell/m','Margin %','Unsold',''].map(h=>(
                      <th key={h} style={{padding:'10px 12px',color:'rgba(255,255,255,.8)',textAlign:['Finish Qty','Cost/m','Sell/m','Margin %','Unsold'].includes(h)?'right':'left',fontSize:10,fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCosting.map((row,i) => (
                    <CostingRow key={row.design_no+(row.lot_no||'')+i} row={row}
                      expanded={costExpanded===(row.design_no+row.lot_no)}
                      onToggle={()=>setCostExpanded(costExpanded===(row.design_no+row.lot_no)?null:(row.design_no+row.lot_no))} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ALL VOUCHERS ── */}
      {tab==='vouchers' && (
        <VouchersDetailTab dateFrom={dateFrom} dateTo={dateTo} />
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── Vouchers Detail Tab ────────────────────────────────────────── */
function VouchersDetailTab({ dateFrom, dateTo }) {
  const [activeType, setActiveType] = useState(VOUCHER_TYPES[0].key);
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(0);
  const [search, setSearch]         = useState('');
  const [expanded, setExpanded]     = useState(null);
  const PAGE = 50;

  const vt = VOUCHER_TYPES.find(v=>v.key===activeType);

  const load = useCallback(async (pg=0) => {
    setLoading(true);
    const from=pg*PAGE, to=from+PAGE-1;
    let q = supabase.from(vt.table)
      .select('*',{count:'exact'})
      .order(vt.dateField,{ascending:false})
      .range(from,to);
    if (dateFrom) q=q.gte(vt.dateField,dateFrom);
    if (dateTo)   q=q.lte(vt.dateField,dateTo);
    if (search)   q=q.or(`${vt.partyField}.ilike.%${search}%`);
    const {data,count,error} = await q;
    if (!error) { setRows(data||[]); setTotal(count||0); }
    setPage(pg); setLoading(false);
  }, [vt, dateFrom, dateTo, search]);

  useEffect(()=>{ setPage(0); load(0); }, [activeType, dateFrom, dateTo, search]);

  const cols = vt ? Object.keys(rows[0]||{}).filter(k=>!['id','line_items','ledger_entries','bill_allocations'].includes(k)).slice(0,8) : [];

  return (
    <div>
      {/* Type selector */}
      <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:16}}>
        {VOUCHER_TYPES.map(v=>(
          <button key={v.key} onClick={()=>{setActiveType(v.key);setSearch('');}}
            style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${activeType===v.key?v.color:T.border}`,
              background:activeType===v.key?v.color:T.surface,color:activeType===v.key?'#fff':T.text,
              fontSize:11,fontWeight:activeType===v.key?700:400,cursor:'pointer'}}>
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:12}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder={`Search ${vt?.label}…`}
          style={{flex:1,padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}} />
        <div style={{fontSize:11,color:T.muted,padding:'7px 0',whiteSpace:'nowrap'}}>{total.toLocaleString()} records</div>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:40,color:T.muted}}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{textAlign:'center',padding:40,color:T.muted}}>No records found for this period.</div>
      ) : (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
            <thead>
              <tr style={{background:T.navy}}>
                {cols.map(c=>(
                  <th key={c} style={{padding:'8px 10px',color:'rgba(255,255,255,.75)',textAlign:'left',fontSize:9,textTransform:'uppercase',letterSpacing:'.5px',whiteSpace:'nowrap'}}>
                    {c.replace(/_/g,' ')}
                  </th>
                ))}
                <th style={{padding:'8px 10px',color:'rgba(255,255,255,.75)',fontSize:9}}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row,i) => (
                <>
                  <tr key={row.id||i} onClick={()=>setExpanded(expanded===i?null:i)}
                    style={{background:expanded===i?T.tealLight:i%2===0?'#fff':'#FAFFFE',cursor:'pointer',borderBottom:`1px solid ${T.border}`}}>
                    {cols.map(c=>{
                      const v=row[c];
                      const isAmt = c.includes('amount')||c.includes('total')||c.includes('rate');
                      const isDate = c.includes('date');
                      return (
                        <td key={c} style={{padding:'7px 10px',color:T.text,whiteSpace:'nowrap',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis'}}>
                          {isDate ? fmtD(v) : isAmt ? fmt(v) : String(v??'—').slice(0,40)}
                        </td>
                      );
                    })}
                    <td style={{padding:'7px 10px',textAlign:'center'}}>{expanded===i?'▲':'▼'}</td>
                  </tr>
                  {expanded===i && (
                    <tr><td colSpan={cols.length+1} style={{padding:'0 10px 10px',background:'#FAFFFE'}}>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,paddingTop:8}}>
                        {Object.entries(row).filter(([k])=>k!=='id').map(([k,v])=>(
                          <div key={k} style={{background:T.surface,borderRadius:4,padding:'5px 8px',border:`1px solid ${T.border}`}}>
                            <div style={{fontSize:8,color:T.muted,textTransform:'uppercase',letterSpacing:'.4px'}}>{k.replace(/_/g,' ')}</div>
                            <div style={{fontSize:10,color:T.text,marginTop:1,wordBreak:'break-word',maxHeight:40,overflow:'hidden'}}>
                              {k==='bill_allocations'||k==='ledger_entries'||k==='line_items'
                                ? <pre style={{fontSize:8,margin:0}}>{JSON.stringify(JSON.parse(v||'[]'), null, 1).slice(0,200)}</pre>
                                : String(v??'—')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td></tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          {total > PAGE && (
            <div style={{padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:`1px solid ${T.border}`}}>
              <button disabled={page===0} onClick={()=>load(page-1)}
                style={{padding:'5px 14px',border:`1px solid ${T.border}`,borderRadius:6,cursor:page===0?'not-allowed':'pointer',background:T.surface,fontSize:11,color:T.text}}>← Prev</button>
              <span style={{fontSize:11,color:T.muted}}>Page {page+1} of {Math.ceil(total/PAGE)}</span>
              <button disabled={(page+1)*PAGE>=total} onClick={()=>load(page+1)}
                style={{padding:'5px 14px',border:`1px solid ${T.border}`,borderRadius:6,cursor:(page+1)*PAGE>=total?'not-allowed':'pointer',background:T.surface,fontSize:11,color:T.text}}>Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
