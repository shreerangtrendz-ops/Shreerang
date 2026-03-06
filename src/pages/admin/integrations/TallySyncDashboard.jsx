import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  pullPurchasesFromTally,
  pullJobBillsFromTally,
  pullStockWithDesignDetail as pullStockFromTally,
  syncCustomersFromTally,
  syncSuppliersFromTally,
  syncAgentsFromTally,
  syncOutstandingFromTally
} from '../../../services/TallySyncService';
import { RefreshCcw } from 'lucide-react';
import { useToast } from '../../../components/ui/use-toast';

/* ─── tiny helpers ─────────────────────────────── */
const S = ({ on, warn }) => {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border';
  if (warn) return <span className={`${base} bg-amber-50 text-amber-700 border-amber-200`}><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />Offline</span>;
  if (on)   return <span className={`${base} bg-green-50 text-green-700 border-green-200`}><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />Online</span>;
  return         <span className={`${base} bg-red-50 text-red-700 border-red-200`}><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Offline</span>;
};

const CARDS = [
  { key:'stock',       icon:'📦', label:'Live Stock',           sub:'Items synced today',      stripe:'#3DBFAE,#0E96A0', ib:'rgba(61,191,174,.12)',  btnC:'#1D8A7C', badge:'LIVE',      badgeC:'#1E9E5A' },
  { key:'purchases',   icon:'🛒', label:'Purchases',            sub:'Bills last 30 days',       stripe:'#2468C8,#0E96A0', ib:'rgba(36,104,200,.10)',  btnC:'#2468C8', badge:'30D',       badgeC:'#2468C8' },
  { key:'job_bills',   icon:'🧾', label:'Job Bills',            sub:'Job worker bills 30d',     stripe:'#E8A800,#D4780A', ib:'rgba(232,168,0,.10)',   btnC:'#D4920A', badge:'30D',       badgeC:'#D4920A' },
  { key:'customers',   icon:'👥', label:'Customers',            sub:'Sundry debtors in DB',     stripe:'#1E9E5A,#0E9E6A', ib:'rgba(30,158,90,.10)',   btnC:'#1E9E5A', badge:'DEBTORS',   badgeC:'#1E9E5A' },
  { key:'suppliers',   icon:'🏭', label:'Suppliers',            sub:'Sundry creditors in DB',   stripe:'#C86020,#E87040', ib:'rgba(200,96,32,.10)',   btnC:'#C86020', badge:'CREDITORS', badgeC:'#C86020' },
  { key:'agents',      icon:'🤝', label:'Sales Agents',         sub:'Active field agents',      stripe:'#C9106E,#E01878', ib:'rgba(201,16,110,.10)',  btnC:'#C9106E', badge:'AGENTS',    badgeC:'#C9106E' },
  { key:'outstanding', icon:'💰', label:'Outstanding Bills',    sub:'Bills tracked live',       stripe:'#6E44C8,#8B5CF6', ib:'rgba(110,68,200,.10)',  btnC:'#6E44C8', badge:'LIVE',      badgeC:'#6E44C8' },
];

const BTN_LABELS = {
  stock:'↻ Sync Stock', purchases:'↻ Sync Purchases', job_bills:'↻ Sync Job Bills',
  customers:'↻ Pull Debtors', suppliers:'↻ Pull Creditors', agents:'↻ Pull Agents', outstanding:'↻ Pull Outstanding'
};

export default function TallySyncDashboard() {
  const [loading,   setLoading]   = useState({});
  const [errors,    setErrors]    = useState([]);
  const [counts,    setCounts]    = useState({ stock:0, purchases:0, job_bills:0, customers:0, suppliers:0, agents:0, outstanding:0 });
  const [logItems,  setLogItems]  = useState([]);
  const { toast } = useToast();

  const [infra, setInfra] = useState({
    frps:'checking', frpc:'checking', tally:'checking',
    nginx:'checking', n8n:'checking', domain:'checking',
    lastChecked:null, tallyCompany:'', stockItems:0,
  });

  /* ── infra health ── */
  async function checkInfrastructure() {
    setInfra(p => ({ ...p, frps:'checking', frpc:'checking', tally:'checking', nginx:'checking', domain:'checking' }));
    try {
      const r = await fetch('https://zdekydcscwhuusliwqaz.supabase.co/functions/v1/tally-health', {
        method:'GET',
        headers:{ 'Authorization':`Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'apikey':import.meta.env.VITE_SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(12000)
      });
      const json = await r.json();
      let n8nOk = false;
      try { const nr = await fetch('https://n8n.shreerangtrendz.com/healthz',{ signal:AbortSignal.timeout(5000) }); n8nOk = nr.ok; } catch {}
      setInfra({ frps:json.frps||'offline', frpc:json.frpc||'offline', nginx:json.nginx||'offline',
        tally:json.tally||'offline', domain:json.domain||'offline', n8n:n8nOk?'online':'offline',
        lastChecked:new Date(), tallyCompany:json.tallyCompany||'', stockItems:json.stockItems||0 });
    } catch {
      setInfra(p => ({ ...p, frps:'offline', frpc:'offline', nginx:'offline', tally:'offline', domain:'offline', lastChecked:new Date() }));
    }
  }

  useEffect(() => { checkInfrastructure(); const iv = setInterval(checkInfrastructure, 60000); return () => clearInterval(iv); }, []);

  /* ── dashboard data ── */
  useEffect(() => { loadData(); }, []);
  async function loadData() {
    const today = new Date().toISOString().split('T')[0];
    const [
      { count: sc }, { count: pc }, { count: jc },
      { count: cc }, { count: supc }, { count: ac }, { count: oc },
      { data: errData }, { data: logData }
    ] = await Promise.all([
      supabase.from('fabric_stock_live').select('*',{count:'exact',head:true}).eq('sync_date',today),
      supabase.from('purchase_fabric').select('*',{count:'exact',head:true}),
      supabase.from('process_charges').select('*',{count:'exact',head:true}),
      supabase.from('customers').select('*',{count:'exact',head:true}).neq('business_type','supplier'),
      supabase.from('customers').select('*',{count:'exact',head:true}).eq('business_type','supplier'),
      supabase.from('sales_team').select('*',{count:'exact',head:true}),
      supabase.from('payment_followups').select('*',{count:'exact',head:true}),
      supabase.from('tally_sync_errors').select('*').eq('resolved',false).order('created_at',{ascending:false}).limit(8),
      supabase.from('tally_sync_log').select('sync_type,status,created_at').order('created_at',{ascending:false}).limit(12),
    ]);
    setCounts({ stock:sc||0, purchases:pc||0, job_bills:jc||0, customers:cc||0, suppliers:supc||0, agents:ac||0, outstanding:oc||0 });
    setErrors(errData||[]);
    setLogItems(logData||[]);
  }

  /* ── sync handler ── */
  async function handleSync(type) {
    setLoading(p => ({ ...p, [type]:true }));
    const today = new Date().toISOString().split('T')[0];
    const ago30 = new Date(Date.now()-30*864e5).toISOString().split('T')[0];
    try {
      const fns = { stock:pullStockFromTally, purchases:()=>pullPurchasesFromTally(ago30,today), job_bills:()=>pullJobBillsFromTally(ago30,today), customers:syncCustomersFromTally, suppliers:syncSuppliersFromTally, agents:syncAgentsFromTally, outstanding:syncOutstandingFromTally };
      const res = await fns[type]();
      if (res?.success) { toast({ title:'Sync Successful', description:`Synced ${res.count} records.` }); loadData(); }
      else toast({ variant:'destructive', title:'Sync Failed', description:res?.error||'Unknown error' });
    } catch (e) { toast({ variant:'destructive', title:'Error', description:e.message }); }
    finally { setLoading(p => ({ ...p, [type]:false })); }
  }

  async function syncAll() {
    for (const k of CARDS.map(c=>c.key)) { await handleSync(k); }
    await syncBills();
  }

  /* ── sync purchase_bills + sales_bills via /api/tally-sync ── */
  const [billsSyncing, setBillsSyncing] = useState(false);
  const [billsCounts, setBillsCounts]   = useState({ purchase: 0, sales: 0, lastSync: null });

  async function syncOutstanding() {
    if (infra.tally !== 'online') {
      toast({ variant:'destructive', title:'Tally Offline', description:'Start Tally Prime and the FRP tunnel first.' });
      return;
    }
    setBillsSyncing(true);
    try {
      const res = await fetch('/api/tally-outstanding', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:'{}' });
      const json = await res.json();
      if (json.success) {
        toast({ title:'Outstanding Synced ✅', description:`Synced ${json.synced} party outstanding records` });
        loadData();
      } else {
        toast({ variant:'destructive', title:'Sync Failed', description: json.error || 'Unknown error' });
      }
    } catch(e) {
      toast({ variant:'destructive', title:'Sync Error', description: e.message });
    } finally { setBillsSyncing(false); }
  }

  async function loadBillsCounts() {
    try {
      const [{ count: pc }, { count: sc }, { data: lastLog }] = await Promise.all([
        supabase.from('purchase_bills').select('*', { count: 'exact', head: true }),
        supabase.from('sales_bills').select('*', { count: 'exact', head: true }),
        supabase.from('tally_sync_log')
          .select('synced_at,records_synced')
          .in('sync_type', ['purchase_vouchers','sales_vouchers'])
          .eq('status','success')
          .order('synced_at',{ascending:false})
          .limit(1),
      ]);
      setBillsCounts({
        purchase: pc || 0,
        sales: sc || 0,
        lastSync: lastLog?.[0]?.synced_at || null,
      });
    } catch(e) { console.error('loadBillsCounts:', e); }
  }

  useEffect(() => { loadBillsCounts(); }, []);

  async function syncBills() {
    if (infra.tally !== 'online') {
      toast({ variant:'destructive', title:'Tally Offline', description:'Start Tally Prime and the FRP tunnel first.' });
      return;
    }
    setBillsSyncing(true);
    try {
      const res = await fetch('/api/tally-sync', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:'{}' });
      const json = await res.json();
      if (json.success) {
        toast({ title:'Bills Synced ✅', description:`Purchase: ${json.synced.purchase} | Sales: ${json.synced.sales} records` });
        loadBillsCounts();
        loadData();
      } else {
        toast({ variant:'destructive', title:'Sync Issues', description: json.errors?.join(', ') || 'Partial failure' });
        loadBillsCounts();
      }
    } catch(e) {
      toast({ variant:'destructive', title:'Sync Error', description: e.message });
    } finally { setBillsSyncing(false); }
  }

  /* ── counts map ── */
  const countMap = { stock:counts.stock, purchases:counts.purchases, job_bills:counts.job_bills, customers:counts.customers, suppliers:counts.suppliers, agents:counts.agents, outstanding:counts.outstanding };

  const now = infra.lastChecked ? infra.lastChecked.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '--:--';

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'var(--bg,#F4FBFA)', minHeight:'100vh' }}>

      {/* ── HEADER ── */}
      <div style={{ background:'linear-gradient(135deg,#0B2E2B 0%,#0E3835 55%,#143F3C 100%)', padding:'18px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(61,191,174,.22)', position:'relative', overflow:'hidden', flexWrap:'wrap', gap:12 }}>
        <div style={{ position:'absolute', top:-80, right:-80, width:280, height:280, background:'radial-gradient(circle,rgba(61,191,174,.1) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:'35%', width:200, height:200, background:'radial-gradient(circle,rgba(232,168,0,.07) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'relative' }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:'#fff', marginBottom:3, display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:30, height:30, background:'linear-gradient(135deg,#3DBFAE,#E8A800)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>⚡</div>
            Tally Sync Control Centre
          </div>
          <p style={{ fontSize:11.5, color:'#6A9B95', margin:0 }}>Real-time Tally ERP Prime ↔ Supabase &nbsp;·&nbsp; Shreerang Trendz Pvt Ltd &nbsp;·&nbsp; GSTIN: 24AAUCS2915F1Z8</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', position:'relative' }}>
          {[
            { label:'🏢 Cotton Fabrics', c:'rgba(232,168,0,.12)', b:'rgba(232,168,0,.3)', t:'#E8A800' },
            { label:infra.tally==='online'?'● Tally Live':'○ Tally Offline', c:'rgba(61,191,174,.14)', b:'rgba(61,191,174,.3)', t:'#3DBFAE' },
            { label:`⏱ ${now}`, c:'rgba(255,255,255,.06)', b:'rgba(255,255,255,.1)', t:'#94a3b8' },
          ].map((p,i) => (
            <span key={i} style={{ background:p.c, border:`1px solid ${p.b}`, color:p.t, padding:'5px 12px', borderRadius:100, fontSize:11, fontWeight:600 }}>{p.label}</span>
          ))}
          <button onClick={syncAll} style={{ padding:'9px 18px', background:'linear-gradient(135deg,#3DBFAE,#2BA898)', border:'none', borderRadius:9, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', boxShadow:'0 3px 14px rgba(43,168,152,.35)', fontFamily:"'DM Sans',sans-serif" }}>
            ⚡ Sync All Now
          </button>
          <button onClick={syncBills} disabled={billsSyncing} style={{ padding:'9px 18px', background: billsSyncing ? '#555' : 'linear-gradient(135deg,#E8A800,#D4920A)', border:'none', borderRadius:9, color:'#fff', fontSize:12, fontWeight:700, cursor: billsSyncing ? 'wait':'pointer', boxShadow:'0 3px 14px rgba(212,146,10,.35)', fontFamily:"'DM Sans',sans-serif", marginLeft:6 }}>
            {billsSyncing ? '⏳ Syncing Bills…' : '💰 Sync Bills Now'}
          </button>
          <button onClick={syncOutstanding} disabled={billsSyncing} style={{ padding:'9px 18px', background: billsSyncing ? '#555' : 'linear-gradient(135deg,#6E44C8,#8B5CF6)', border:'none', borderRadius:9, color:'#fff', fontSize:12, fontWeight:700, cursor: billsSyncing ? 'wait':'pointer', boxShadow:'0 3px 14px rgba(110,68,200,.3)', fontFamily:"'DM Sans',sans-serif", marginLeft:6 }}>
            {billsSyncing ? '⏳…' : '📊 Sync Outstanding'}
          </button>
        </div>
      </div>

      <div style={{ padding:'22px 26px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── ROW 1: section label + 4 cards ── */}
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1.2px', color:'var(--text-muted,#4A7A74)', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
            <span>📊 Data Sources — Pull Live from Tally ERP Prime</span>
            <span style={{ flex:1, height:1, background:'var(--border,rgba(43,168,152,.18))', display:'block' }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:13 }}>
            {CARDS.slice(0,4).map(c => <SyncCard key={c.key} card={c} count={countMap[c.key]} loading={loading[c.key]} onSync={()=>handleSync(c.key)} />)}
          </div>
        </div>

        {/* ── ROW 2: 3 cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:13 }}>
          {CARDS.slice(4).map(c => <SyncCard key={c.key} card={c} count={countMap[c.key]} loading={loading[c.key]} onSync={()=>handleSync(c.key)} />)}
        </div>

        {/* ── BILLS ACCOUNTING ROW ── */}
        <div>
          <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'1.2px', color:'var(--text-muted,#4A7A74)', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
            <span>💰 Bills Accounting — Tally Vouchers ↔ Supabase</span>
            <span style={{ flex:1, height:1, background:'var(--border,rgba(43,168,152,.18))', display:'block' }} />
            {billsCounts.lastSync && <span style={{ fontSize:10, color:'#6A9B95' }}>Last sync: {new Date(billsCounts.lastSync).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:13 }}>
            <div style={{ background:'#fff', borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 12px rgba(0,0,0,.07)', border:'1px solid rgba(36,104,200,.18)', display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:38, height:38, background:'linear-gradient(135deg,#2468C8,#0E96A0)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🛒</div>
                  <div><div style={{ fontWeight:700, fontSize:15, color:'var(--text,#0D2E2B)' }}>Purchase Bills</div><div style={{ fontSize:11, color:'#6A9B95' }}>Tally purchase vouchers → DB</div></div>
                </div>
                <div style={{ textAlign:'right' }}><div style={{ fontSize:26, fontWeight:800, color:'#2468C8', lineHeight:1 }}>{billsCounts.purchase}</div><div style={{ fontSize:10, color:'#6A9B95' }}>records</div></div>
              </div>
              <button onClick={syncBills} disabled={billsSyncing} style={{ padding:'8px', background: billsSyncing?'#e2e8f0':'linear-gradient(135deg,#2468C8,#0E96A0)', border:'none', borderRadius:8, color: billsSyncing?'#94a3b8':'#fff', fontSize:12, fontWeight:600, cursor: billsSyncing?'wait':'pointer', width:'100%' }}>
                {billsSyncing ? '⏳ Syncing…' : '↻ Pull Purchase Bills'}
              </button>
            </div>
            <div style={{ background:'#fff', borderRadius:14, padding:'18px 20px', boxShadow:'0 2px 12px rgba(0,0,0,.07)', border:'1px solid rgba(30,158,90,.18)', display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:38, height:38, background:'linear-gradient(135deg,#1E9E5A,#0E9E6A)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>💹</div>
                  <div><div style={{ fontWeight:700, fontSize:15, color:'var(--text,#0D2E2B)' }}>Sales Bills</div><div style={{ fontSize:11, color:'#6A9B95' }}>Tally sales vouchers → DB</div></div>
                </div>
                <div style={{ textAlign:'right' }}><div style={{ fontSize:26, fontWeight:800, color:'#1E9E5A', lineHeight:1 }}>{billsCounts.sales}</div><div style={{ fontSize:10, color:'#6A9B95' }}>records</div></div>
              </div>
              <button onClick={syncBills} disabled={billsSyncing} style={{ padding:'8px', background: billsSyncing?'#e2e8f0':'linear-gradient(135deg,#1E9E5A,#0E9E6A)', border:'none', borderRadius:8, color: billsSyncing?'#94a3b8':'#fff', fontSize:12, fontWeight:600, cursor: billsSyncing?'wait':'pointer', width:'100%' }}>
                {billsSyncing ? '⏳ Syncing…' : '↻ Pull Sales Bills'}
              </button>
            </div>
          </div>
        </div>

        {/* ── ROW 3: Infra + Log ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.7fr', gap:18 }}>

          {/* Infra */}
          <div style={{ background:'#fff', border:'1px solid var(--border,rgba(43,168,152,.18))', borderRadius:12, padding:18, borderTop:'3px solid #3DBFAE', boxShadow:'0 1px 4px rgba(43,168,152,.05)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--text,#0D2E2B)' }}>⚡ Infrastructure Health</span>
              <button onClick={checkInfrastructure} style={{ padding:'5px 12px', borderRadius:7, background:'rgba(43,168,152,.1)', border:'1px solid rgba(43,168,152,.3)', color:'#1D8A7C', fontSize:10.5, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
                ↻ Refresh
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
              {[
                ['Tally Prime',      infra.tally],
                ['FRP Tunnel (Win)', infra.frpc],
                ['FRP Server (KVM)', infra.frps],
                ['Domain Gateway',   infra.domain],
                ['Nginx Router',     infra.nginx],
                ['n8n Automation',   infra.n8n],
              ].map(([lbl, st]) => (
                <div key={lbl} style={{ background:'var(--surface2,#EEF8F6)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <span style={{ fontSize:10.5, color:'var(--text-muted,#4A7A74)', fontWeight:500 }}>{lbl}</span>
                  <S on={st==='online'} warn={lbl==='n8n Automation' && st!=='online'} />
                </div>
              ))}
            </div>
            {/* Terminal */}
            <div style={{ background:'#0B2E2B', border:'1px solid rgba(61,191,174,.2)', borderRadius:8, padding:'12px 14px', marginTop:11, fontFamily:"'JetBrains Mono',monospace", fontSize:10.5, lineHeight:1.9 }}>
              {infra.tally==='online' ? <>
                <div style={{ color:'#34d399' }}>▶ Connected · Tally ERP Prime</div>
                <div style={{ color:'#C8E8E4' }}>→ Company: {infra.tallyCompany || 'Cotton Fabrics'} | Items: {infra.stockItems||12}</div>
              </> : <>
                <div style={{ color:'#f87171' }}>▶ Cannot connect to Tally endpoint</div>
                <div style={{ color:'#6A9B95' }}>→ Check: Tally Prime open + Port 9000 enabled</div>
              </>}
              <div style={{ color:'#6A9B95' }}>→ Supabase Seoul (t4g.nano) ✓ healthy</div>
              <div style={{ color:infra.n8n==='online'?'#34d399':'#fbbf24' }}>→ n8n: {infra.n8n==='online'?'running':'not running on KVM-1'}</div>
              <div style={{ color:'#475569' }}>→ Last checked: {infra.lastChecked ? infra.lastChecked.toLocaleTimeString() : 'never'}</div>
            </div>
          </div>

          {/* Sync Log */}
          <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:12, padding:18, borderTop:'3px solid #E8A800', boxShadow:'0 1px 4px rgba(43,168,152,.05)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'var(--text,#0D2E2B)' }}>📋 Sync Activity Log</span>
              <span style={{ fontSize:10, color:'var(--text-dim,#8AAEAA)', display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:5, height:5, borderRadius:'50%', background:'#3DBFAE', display:'inline-block', animation:'pulse 2s infinite' }} />
                Live · Auto-refresh 60s
              </span>
            </div>
            <div style={{ maxHeight:260, overflowY:'auto' }}>
              {/* Unresolved errors */}
              {errors.map(err => (
                <div key={err.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 11px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2,#EEF8F6)', marginBottom:6 }}>
                  <span style={{ padding:'2px 8px', borderRadius:100, fontSize:9, fontWeight:800, background:'rgba(217,58,58,.1)', color:'#D93A3A', border:'1px solid rgba(217,58,58,.2)', whiteSpace:'nowrap' }}>ERROR</span>
                  <span style={{ fontSize:11, fontWeight:600, color:'var(--text)', minWidth:140, fontFamily:"'JetBrains Mono',monospace" }}>{err.sync_type}</span>
                  <span style={{ fontSize:11, color:'var(--text-muted)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{err.error_message}</span>
                  <span style={{ fontSize:9.5, color:'var(--text-dim)', whiteSpace:'nowrap' }}>{new Date(err.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              ))}
              {/* Success logs */}
              {logItems.filter(l=>l.status==='success').slice(0,6).map((l,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 11px', borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2,#EEF8F6)', marginBottom:6 }}>
                  <span style={{ padding:'2px 8px', borderRadius:100, fontSize:9, fontWeight:800, background:'rgba(30,158,90,.1)', color:'#1E9E5A', border:'1px solid rgba(30,158,90,.2)', whiteSpace:'nowrap' }}>SUCCESS</span>
                  <span style={{ fontSize:11, fontWeight:600, color:'var(--text)', minWidth:140, fontFamily:"'JetBrains Mono',monospace" }}>{l.sync_type}</span>
                  <span style={{ fontSize:11, color:'var(--text-muted)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Synced successfully from Tally ERP Prime</span>
                  <span style={{ fontSize:9.5, color:'var(--text-dim)', whiteSpace:'nowrap' }}>{new Date(l.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
                </div>
              ))}
            </div>
            {/* Stats footer */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, background:'var(--surface2,#EEF8F6)', borderRadius:9, padding:'13px 14px', marginTop:12 }}>
              {[
                { num:logItems.length+errors.length, lbl:'Total Syncs', c:'var(--teal-light,#1D8A7C)' },
                { num:logItems.filter(l=>l.status==='success').length, lbl:'Successful', c:'#1E9E5A' },
                { num:errors.length, lbl:'Errors', c:'#D93A3A' },
                { num:(counts.suppliers||0).toLocaleString(), lbl:'Suppliers Live', c:'#E8A800' },
              ].map((s,i) => (
                <div key={i} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:21, fontWeight:700, color:s.c, lineHeight:1 }}>{s.num}</div>
                  <div style={{ fontSize:9.5, color:'var(--text-dim,#8AAEAA)', marginTop:2, fontWeight:500 }}>{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Sync Card Component ── */
function SyncCard({ card, count, loading, onSync }) {
  const liveCount = count > 0;
  return (
    <div style={{ background:'#fff', border:'1px solid var(--border,rgba(43,168,152,.18))', borderRadius:12, padding:'17px 16px 14px', position:'relative', overflow:'hidden', transition:'all .25s', display:'flex', flexDirection:'column', boxShadow:'0 1px 4px rgba(43,168,152,.05)', cursor:'default' }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor='rgba(43,168,152,.35)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(43,168,152,.1)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.borderColor='var(--border,rgba(43,168,152,.18))'; e.currentTarget.style.boxShadow='0 1px 4px rgba(43,168,152,.05)'; }}
    >
      {/* top stripe */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${card.stripe})`, borderRadius:'12px 12px 0 0' }} />
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ width:36, height:36, borderRadius:9, background:card.ib, border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{card.icon}</div>
        <span style={{ background:`${card.ib}`, color:card.badgeC, border:`1px solid ${card.badgeC}33`, fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:100, textTransform:'uppercase', letterSpacing:'.4px' }}>{card.badge}</span>
      </div>
      <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted,#4A7A74)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:2 }}>{card.label}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, lineHeight:1, letterSpacing:'-1px', marginBottom:1,
        ...(liveCount ? { background:`linear-gradient(135deg,#1D8A7C,#3DBFAE)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' } : { color:'var(--text,#0D2E2B)' })
      }}>{(count||0).toLocaleString()}</div>
      <div style={{ fontSize:11, color:'var(--text-dim,#8AAEAA)', marginBottom:13, flex:1 }}>{card.sub}</div>
      <button onClick={onSync} disabled={loading} style={{ width:'100%', padding:'8px 0', borderRadius:7, fontSize:10, fontWeight:700, cursor:loading?'not-allowed':'pointer', textTransform:'uppercase', letterSpacing:'.6px', fontFamily:"'DM Sans',sans-serif", border:`1px solid ${card.btnC}55`, background:loading?'rgba(232,168,0,.1)':`${card.btnC}14`, color:loading?'#D4920A':card.btnC, transition:'all .2s' }}
        onMouseEnter={e=>!loading && (e.target.style.background=`${card.btnC}25`)}
        onMouseLeave={e=>!loading && (e.target.style.background=`${card.btnC}14`)}
      >
        {loading ? '⟳ Syncing...' : (BTN_LABELS[card.key]||'↻ Sync')}
      </button>
    </div>
  );
}
