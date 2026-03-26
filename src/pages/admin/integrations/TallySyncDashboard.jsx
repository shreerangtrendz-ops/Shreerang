import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
  pullPurchasesFromTally,
  pullJobBillsFromTally,
  pullStockWithDesignDetail as pullStockFromTally,
  syncCustomersFromTally,
  syncSuppliersFromTally,
  syncAgentsFromTally,
  syncOutstandingFromTally,
  syncAllFromTally
} from '../../../services/TallySyncService';
import { RefreshCcw } from 'lucide-react';
import { useToast } from '../../../components/ui/use-toast';

/* ---- status badge helper ---- */
const S = ({ on, warn }) => {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border';
  if (warn)  return <span className={`${base} bg-amber-50 text-amber-700 border-amber-200`}><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />Offline</span>;
  if (on)    return <span className={`${base} bg-green-50 text-green-700 border-green-200`}><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />Online</span>;
  return             <span className={`${base} bg-red-50 text-red-700 border-red-200`}><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Offline</span>;
};

const CARDS = [
  { key:'stock',       icon:'', label:'Live Stock',       sub:'Items synced today',       stripe:'#3DBFAE,#0E96A0', ib:'rgba(61,191,174,.12)',  btnC:'#1D8A7C', badge:'LIVE',     badgeC:'#1E9E5A' },
  { key:'purchases',   icon:'', label:'Purchases',        sub:'Bills last 30 days',        stripe:'#2468C8,#0E96A0', ib:'rgba(36,104,200,.10)',  btnC:'#2468C8', badge:'30D',      badgeC:'#2468C8' },
  { key:'job_bills',   icon:'', label:'Job Bills',        sub:'Job worker bills 30d',      stripe:'#E8A800,#D4780A', ib:'rgba(232,168,0,.10)',   btnC:'#D4920A', badge:'30D',      badgeC:'#D4920A' },
  { key:'customers',   icon:'', label:'Customers',        sub:'Sundry debtors in DB',      stripe:'#1E9E5A,#0E9E6A', ib:'rgba(30,158,90,.10)',   btnC:'#1E9E5A', badge:'DEBTORS',  badgeC:'#1E9E5A' },
  { key:'suppliers',   icon:'', label:'Suppliers',        sub:'Sundry creditors in DB',    stripe:'#C86020,#E87040', ib:'rgba(200,96,32,.10)',   btnC:'#C86020', badge:'CREDITORS',badgeC:'#C86020' },
  { key:'agents',      icon:'', label:'Sales Agents',     sub:'Active field agents',       stripe:'#C9106E,#E01878', ib:'rgba(201,16,110,.10)',  btnC:'#C9106E', badge:'AGENTS',   badgeC:'#C9106E' },
  { key:'outstanding', icon:'', label:'Outstanding Bills',sub:'Bills tracked live',        stripe:'#6E44C8,#8B5CF6', ib:'rgba(110,68,200,.10)',  btnC:'#6E44C8', badge:'LIVE',     badgeC:'#6E44C8' },
];

const BTN_LABELS = {
  stock:' Sync Stock', purchases:' Sync Purchases', job_bills:' Sync Job Bills',
  customers:' Pull Debtors', suppliers:' Pull Creditors', agents:' Pull Agents', outstanding:' Pull Outstanding'
};

/* 
   INFRASTRUCTURE STATUS PANEL
 */
function InfraPanel({ infra, onRefresh, refreshing }) {
  const systems = [
    {
      key: 'nginx',
      icon: '',
      label: 'Nginx Proxy',
      sublabel: 'VPS Reverse Proxy',
      status: infra.nginx,
      fixTitle: 'Nginx is Down',
      fix: 'Run: sudo systemctl restart nginx on VPS'
    },
    {
      key: 'frps',
      icon: '',
      label: 'FRP Server',
      sublabel: 'VPS  Port 7000/8080',
      status: infra.frps,
      fixTitle: 'FRP Server (frps) is Down',
      fix: 'Run: kill $(pgrep frps); nohup /opt/frp/frps -c /opt/frp/frps.toml > /opt/frp/frps.log 2>&1 &'
    },
    {
      key: 'frpc',
      icon: '',
      label: 'FRP Tunnel',
      sublabel: 'Office PC  VPS',
      status: infra.frpc,
      fixTitle: 'FRP Client (frpc) is Disconnected',
      fix: 'On Office PC: Open CMD as Admin in FRP folder  run: frpc.exe -c frpc.toml'
    },
    {
      key: 'tally',
      icon: '',
      label: 'Tally Prime',
      sublabel: 'tally.shreerangtrendz.com',
      status: infra.tally,
      fixTitle: 'Tally Prime is Offline',
      fix: 'Open Tally Prime on Office PC, load company, then restart frpc.exe'
    },
  ];

  const allOnline = systems.every(s => s.status === 'online');
  const anyOffline = systems.some(s => s.status === 'offline');

  return (
    <div style={{
      background: allOnline ? 'linear-gradient(135deg,#0B2E1F,#0D3524)' : anyOffline ? 'linear-gradient(135deg,#2E0B0B,#3A1010)' : 'linear-gradient(135deg,#1A1A2E,#16213E)',
      borderRadius: 16, padding: '20px 24px', marginBottom: 24,
      border: `1px solid ${allOnline ? '#1E5E3A' : anyOffline ? '#5E1E1E' : '#2A2A4A'}`,
      boxShadow: allOnline ? '0 0 30px rgba(30,158,90,.08)' : anyOffline ? '0 0 30px rgba(220,50,50,.08)' : '0 0 20px rgba(0,0,0,.2)'
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background: allOnline?'#22c55e':anyOffline?'#ef4444':'#f59e0b', boxShadow:`0 0 8px ${allOnline?'#22c55e':anyOffline?'#ef4444':'#f59e0b'}` }} />
          <h2 style={{ color:'#fff', fontSize:15, fontWeight:700, margin:0, fontFamily:"'DM Sans', sans-serif", letterSpacing:'.3px' }}>
            Infrastructure Status
          </h2>
          <span style={{ background: allOnline?'rgba(34,197,94,.15)':anyOffline?'rgba(239,68,68,.15)':'rgba(245,158,11,.15)', color: allOnline?'#22c55e':anyOffline?'#ef4444':'#f59e0b', border:`1px solid ${allOnline?'rgba(34,197,94,.3)':anyOffline?'rgba(239,68,68,.3)':'rgba(245,158,11,.3)'}`, borderRadius:100, padding:'2px 8px', fontSize:9, fontWeight:800, letterSpacing:'.8px' }}>
            {allOnline ? 'ALL SYSTEMS ONLINE' : anyOffline ? 'SYSTEM ISSUE DETECTED' : 'CHECKING...'}
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {infra.lastChecked && (
            <span style={{ color:'#6B7280', fontSize:10 }}>
              Checked {new Date(infra.lastChecked).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
            </span>
          )}
          <button onClick={onRefresh} disabled={refreshing} style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, padding:'5px 12px', color:'#ccc', fontSize:11, cursor:refreshing?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ display:'inline-block', animation:refreshing?'spin 1s linear infinite':'none' }}></span>
            {refreshing ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* System Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {systems.map(sys => {
          const isOnline  = sys.status === 'online';
          const isChecking = sys.status === 'checking';
          const isOffline = !isOnline && !isChecking;
          return (
            <div key={sys.key} style={{
              background: isOnline ? 'rgba(34,197,94,.06)' : isOffline ? 'rgba(239,68,68,.06)' : 'rgba(255,255,255,.03)',
              border: `1px solid ${isOnline ? 'rgba(34,197,94,.2)' : isOffline ? 'rgba(239,68,68,.2)' : 'rgba(255,255,255,.06)'}`,
              borderRadius: 12, padding:'14px 16px', position:'relative', overflow:'hidden'
            }}>
              {/* top accent line */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background: isOnline ? 'linear-gradient(90deg,#22c55e,#16a34a)' : isOffline ? 'linear-gradient(90deg,#ef4444,#dc2626)' : 'linear-gradient(90deg,#6b7280,#4b5563)' }} />
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:20 }}>{sys.icon}</span>
                {isChecking ? (
                  <span style={{ fontSize:9, color:'#9ca3af', background:'rgba(156,163,175,.1)', border:'1px solid rgba(156,163,175,.2)', borderRadius:100, padding:'2px 6px', fontWeight:700 }}>CHECKING</span>
                ) : isOnline ? (
                  <span style={{ fontSize:9, color:'#22c55e', background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.2)', borderRadius:100, padding:'2px 6px', fontWeight:700 }}> ONLINE</span>
                ) : (
                  <span style={{ fontSize:9, color:'#ef4444', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:100, padding:'2px 6px', fontWeight:700 }}> OFFLINE</span>
                )}
              </div>
              <div style={{ fontSize:13, fontWeight:700, color: isOnline?'#f0fdf4':isOffline?'#fef2f2':'#e5e7eb', marginBottom:2, fontFamily:"'DM Sans',sans-serif" }}>{sys.label}</div>
              <div style={{ fontSize:10, color:'#9ca3af', marginBottom: isOffline ? 10 : 0 }}>{sys.sublabel}</div>
              {isOffline && (
                <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.15)', borderRadius:6, padding:'6px 8px', marginTop:6 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:'#f87171', marginBottom:3 }}> HOW TO FIX:</div>
                  <div style={{ fontSize:9, color:'#fca5a5', lineHeight:1.5, fontFamily:"'JetBrains Mono',monospace" }}>{sys.fix}</div>
                </div>
              )}
              {sys.key === 'frpc' && infra.tallyCompany && isOnline && (
                <div style={{ fontSize:9, color:'#6ee7b7', marginTop:4, fontStyle:'italic' }}> {infra.tallyCompany}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* n8n row */}
      <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'rgba(255,255,255,.02)', borderRadius:8, border:'1px solid rgba(255,255,255,.04)' }}>
        <span style={{ fontSize:13 }}></span>
        <span style={{ fontSize:11, fontWeight:600, color:'#9ca3af' }}>n8n Automation Engine</span>
        <span style={{ fontSize:9, color: infra.n8n==='online'?'#22c55e':'#ef4444', background: infra.n8n==='online'?'rgba(34,197,94,.1)':'rgba(239,68,68,.1)', border:`1px solid ${infra.n8n==='online'?'rgba(34,197,94,.2)':'rgba(239,68,68,.2)'}`, borderRadius:100, padding:'1px 6px', fontWeight:700 }}>
          {infra.n8n==='online' ? ' ONLINE' : infra.n8n==='checking' ? 'CHECKING' : ' OFFLINE'}
        </span>
        <span style={{ fontSize:10, color:'#6b7280', marginLeft:'auto' }}>Tally sync workflows  Daily auto-sync</span>
      </div>
    </div>
  );
}

/* 
   SYNC CARD COMPONENT
 */
function SyncCard({ card, count, loading, onSync }) {
  const liveCount = count > 0;
  return (
    <div style={{ background:'#fff', border:'1px solid var(--border,rgba(43,168,152,.18))', borderRadius:12, padding:'17px 16px 14px', position:'relative', overflow:'hidden', transition:'all .25s', display:'flex', flexDirection:'column', boxShadow:'0 1px 4px rgba(43,168,152,.05)', cursor:'default' }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor='rgba(43,168,152,.35)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(43,168,152,.1)'; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.borderColor='var(--border,rgba(43,168,152,.18))'; e.currentTarget.style.boxShadow='0 1px 4px rgba(43,168,152,.05)'; }}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${card.stripe})`, borderRadius:'12px 12px 0 0' }} />
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4 }}>
        <div style={{ width:36, height:36, borderRadius:9, background:card.ib, border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{card.icon}</div>
        <span style={{ background:`${card.ib}`, color:card.badgeC, border:`1px solid ${card.badgeC}33`, fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:100, textTransform:'uppercase', letterSpacing:'.4px' }}>{card.badge}</span>
      </div>
      <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted,#4A7A74)', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:2 }}>{card.label}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, lineHeight:1, letterSpacing:'-1px', marginBottom:1,
        ...(liveCount ? { background:`linear-gradient(135deg,#1D8A7C,#3DBFAE)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' } : { color:'var(--text,#0D2E2B)' })
      }}>{(count||0).toLocaleString()}</div>
      <div style={{ fontSize:11, color:'var(--text-dim,#8AAEAA)', marginBottom:13, flex:1 }}>{card.sub}</div>
      <button onClick={onSync} disabled={loading} style={{ width:'100%', padding:'8px 0', borderRadius:7, fontSize:10, fontWeight:700, cursor:loading?'not-allowed':'pointer', textTransform:'uppercase', letterSpacing:'.6px', border:`1px solid ${card.btnC}55`, background:loading?`rgba(232,168,0,.1)`:`${card.btnC}14`, color:loading?'#D4920A':card.btnC, transition:'all .2s' }}
        onMouseEnter={e=>!loading && (e.target.style.background=`${card.btnC}25`)}
        onMouseLeave={e=>!loading && (e.target.style.background=`${card.btnC}14`)}
      >
        {loading ? ' Syncing...' : (BTN_LABELS[card.key]||' Sync')}
      </button>
    </div>
  );
}

/* 
   LOG ENTRY COMPONENT
 */
function LogEntry({ l }) {
  return (
    <div style={{ padding:'8px 0', borderBottom:'1px solid rgba(43,168,152,.08)', display:'flex', alignItems:'flex-start', gap:8 }}>
      <span style={{ padding:'2px 8px', borderRadius:100, fontSize:9, fontWeight:800, background:'rgba(30,158,90,.1)', color:'#1E9E5A', border:'1px solid rgba(30,158,90,.2)', whiteSpace:'nowrap' }}>SUCCESS</span>
      <span style={{ fontSize:11, fontWeight:600, color:'var(--text)', minWidth:140, fontFamily:"'JetBrains Mono',monospace" }}>{l.sync_type}</span>
      <span style={{ fontSize:11, color:'var(--text-muted)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Synced successfully from Tally ERP Prime</span>
      <span style={{ fontSize:9.5, color:'var(--text-dim)', whiteSpace:'nowrap' }}>{new Date(l.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
    </div>
  );
}

/* 
   MAIN DASHBOARD
 */
export default function TallySyncDashboard() {
  const [loading,    setLoading]    = useState({});
  const [errors,     setErrors]     = useState([]);
  const [counts,     setCounts]     = useState({ stock:0, purchases:0, job_bills:0, customers:0, suppliers:0, agents:0, outstanding:0 });
  const [logItems,   setLogItems]   = useState([]);
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const [infra, setInfra] = useState({
    frps:'checking', frpc:'checking', tally:'checking',
    nginx:'checking', n8n:'checking', domain:'checking',
    lastChecked:null, tallyCompany:'', stockItems:0,
  });

  /*  infra health  */
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
      setInfra({
        frps:  json.frps||'offline',
        frpc:  json.frpc||'offline',
        nginx: json.nginx||'offline',
        tally: json.tally||'offline',
        domain:json.domain||'offline',
        n8n:   n8nOk?'online':'offline',
        lastChecked: new Date(),
        tallyCompany: json.tallyCompany||'',
        stockItems: json.stockItems||0
      });
    } catch {
      setInfra(p => ({ ...p, frps:'offline', frpc:'offline', nginx:'offline', tally:'offline', domain:'offline', lastChecked:new Date() }));
    }
  }

  useEffect(() => { checkInfrastructure(); const iv = setInterval(checkInfrastructure, 60000); return () => clearInterval(iv); }, []);

  /*  data load  */
  useEffect(() => { loadData(); loadPendingCount(); }, []);
  async function loadData() {
    const today = new Date().toISOString().split('T')[0];
    const [
      { count: sc }, { count: pc }, { count: jc },
      { count: cc }, { count: supc }, { count: ac }, { count: oc },
      { data: errData }, { data: logData }
    ] = await Promise.all([
      supabase.from('products').select('*',{count:'exact',head:true}),
      supabase.from('purchase_bills').select('*',{count:'exact',head:true}).gte('bill_date', new Date(Date.now()-30*86400000).toISOString().split('T')[0]),
      supabase.from('process_issues').select('*',{count:'exact',head:true}).gte('issue_date', new Date(Date.now()-30*86400000).toISOString().split('T')[0]),
      supabase.from('customers').select('*',{count:'exact',head:true}),
      supabase.from('suppliers').select('*',{count:'exact',head:true}),
      supabase.from('agents').select('*',{count:'exact',head:true}),
      supabase.from('tally_ledgers').select('*',{count:'exact',head:true}).gt('bill_outstanding', 0),
      supabase.from('tally_sync_errors').select('*').order('created_at',{ascending:false}).limit(5),
      supabase.from('tally_sync_log').select('*').order('created_at',{ascending:false}).limit(20),
    ]);
    setCounts({ stock:sc||0, purchases:pc||0, job_bills:jc||0, customers:cc||0, suppliers:supc||0, agents:ac||0, outstanding:oc||0 });
    setErrors(errData||[]);
    setLogItems(logData||[]);
  }

  /*  sync handlers  */
  async function handleSync(key) {
    setLoading(p => ({ ...p, [key]:true }));
    try {
      const fns = {
        stock:       () => pullStockFromTally(),
        purchases:   () => pullPurchasesFromTally(),
        job_bills:   () => pullJobBillsFromTally(),
        customers:   () => syncCustomersFromTally(),
        suppliers:   () => syncSuppliersFromTally(),
        agents:      () => syncAgentsFromTally(),
        outstanding: () => syncOutstandingFromTally(),
      };
      await fns[key]?.();
      toast({ title:' Sync Complete', description:`${key} synced from Tally Prime.` });
      await loadData();
    } catch(e) {
      toast({ title:' Sync Failed', description:e.message, variant:'destructive' });
    } finally {
      setLoading(p => ({ ...p, [key]:false }));
    }
  }

  /* SYNC ALL — unified one-click sync */
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState([]);
  const [pendingPushCount, setPendingPushCount] = useState(0);
  const [pushing, setPushing] = useState(false);

  async function handleSyncAll() {
    setSyncingAll(true);
    setSyncProgress([]);
    try {
      const result = await syncAllFromTally('', (progress) => {
        setSyncProgress(prev => {
          const existing = prev.findIndex(p => p.step === progress.step);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = progress;
            return updated;
          }
          return [...prev, progress];
        });
      });
      toast({ title: ' Sync All Complete', description: result.summary });
      await loadData();
    } catch(e) {
      toast({ title: ' Sync All Failed', description: e.message, variant: 'destructive' });
    } finally {
      setSyncingAll(false);
    }
  }

  /* Load pending push count */
  async function loadPendingCount() {
    const [{ count: s }, { count: p }, { count: j }] = await Promise.all([
      supabase.from('sales_bills').select('*', { count:'exact', head:true }).eq('tally_sync_status','pending').eq('status','pending_push'),
      supabase.from('purchase_bills').select('*', { count:'exact', head:true }).eq('tally_sync_status','pending').eq('status','pending_push'),
      supabase.from('job_work_bills').select('*', { count:'exact', head:true }).eq('tally_sync_status','pending').eq('status','pending_push'),
    ]);
    setPendingPushCount((s||0) + (p||0) + (j||0));
  }

  /* PUSH TO TALLY — send web-created vouchers to Tally server */
  async function handlePushToTally() {
    if (pendingPushCount === 0) { toast({ title: 'Nothing to Push', description: 'No bills are queued for Tally push yet.' }); return; }
    setPushing(true);
    try {
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tally-push-vouchers`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000)
      });
      const j = await r.json();
      if (j.success) {
        toast({ title: '✅ Pushed to Tally!', description: `${j.pushed} voucher(s) sent to Tally Prime. ${j.failed > 0 ? j.failed + ' failed.' : ''}` });
      } else {
        toast({ title: '❌ Push Failed', description: j.error || 'Check Tally server connection.', variant: 'destructive' });
      }
    } catch(e) {
      toast({ title: '❌ Push Error', description: e.message, variant: 'destructive' });
    } finally {
      setPushing(false);
      await loadPendingCount();
      await loadData();
    }
  }

  const statsMini = [
    { num:logItems.length+errors.length, lbl:'Total Syncs',    c:'var(--teal-light,#1D8A7C)' },
    { num:logItems.filter(l=>l.status==='success').length, lbl:'Successful', c:'#1E9E5A' },
    { num:errors.length,                lbl:'Errors',          c:'#D93A3A' },
    { num:(counts.suppliers||0).toLocaleString(), lbl:'Suppliers Live', c:'#E8A800' },
  ];

  return (
    <div style={{ padding:'20px 0', maxWidth:1200, margin:'0 auto' }}>

      {/* Page Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text,#0D2E2B)', margin:0, fontFamily:"'Playfair Display',serif", letterSpacing:'-.5px' }}>
            Tally Prime Sync
          </h1>
          <p style={{ fontSize:12, color:'var(--text-dim,#8AAEAA)', margin:'4px 0 0', fontFamily:"'DM Sans',sans-serif" }}>
            BizAnalyst  Real-time ERP data sync for Shreerang Trendz Pvt. Ltd.
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => { setRefreshing(true); checkInfrastructure().finally(()=>setRefreshing(false)); loadData(); }} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(29,138,124,.15)', color:'#1D8A7C', border:'1px solid rgba(29,138,124,.3)', borderRadius:8, padding:'8px 14px', fontSize:11, fontWeight:700, cursor:'pointer', letterSpacing:'.4px' }}>
            <RefreshCcw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh Status
          </button>
          <button onClick={handleSyncAll} disabled={syncingAll} style={{ display:'flex', alignItems:'center', gap:6, background: syncingAll ? 'rgba(232,168,0,.15)' : '#1D8A7C', color: syncingAll ? '#D4920A' : '#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:11, fontWeight:800, cursor: syncingAll ? 'not-allowed' : 'pointer', letterSpacing:'.4px' }}>
            <RefreshCcw size={13} style={{ animation: syncingAll ? 'spin 1s linear infinite' : 'none' }} />
            {syncingAll ? '⏳ Syncing...' : '↓ Sync All From Tally'}
          </button>
          <button onClick={handlePushToTally} disabled={pushing || pendingPushCount === 0} title={`${pendingPushCount} bills staged for Tally push`} style={{ display:'flex', alignItems:'center', gap:6, position:'relative', background: pushing ? 'rgba(232,168,0,.15)' : pendingPushCount > 0 ? 'linear-gradient(135deg,#C86020,#E87040)' : 'rgba(200,96,32,.12)', color: pushing ? '#D4920A' : pendingPushCount > 0 ? '#fff' : '#C86020', border: pendingPushCount > 0 ? 'none' : '1px solid rgba(200,96,32,.3)', borderRadius:8, padding:'8px 18px', fontSize:11, fontWeight:800, cursor: pushing || pendingPushCount === 0 ? 'not-allowed' : 'pointer', letterSpacing:'.4px', opacity: pendingPushCount === 0 ? 0.5 : 1 }}>
            {pushing ? '⏳ Pushing...' : '↑ Push to Tally'}
            {pendingPushCount > 0 && !pushing && (
              <span style={{ position:'absolute', top:-6, right:-6, background:'#ef4444', color:'#fff', fontSize:9, fontWeight:900, borderRadius:100, minWidth:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 4px', border:'2px solid #fff' }}>{pendingPushCount}</span>
            )}
          </button>
        </div>
      </div>

      {/*  INFRASTRUCTURE STATUS  */}
      <InfraPanel infra={infra} onRefresh={() => { setRefreshing(true); checkInfrastructure().finally(()=>setRefreshing(false)); }} refreshing={refreshing} />

      {/* SYNC ALL PROGRESS */}
      {syncProgress.length > 0 && (
        <div style={{ background:'rgba(29,138,124,.06)', border:'1px solid rgba(29,138,124,.15)', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#1D8A7C', marginBottom:12 }}> Sync Progress</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
            {syncProgress.map((p, i) => (
              <div key={i} style={{ background:'rgba(0,0,0,.04)', borderRadius:8, padding:'8px 12px', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:16 }}>{p.status==='done'?'✅':p.status==='error'?'❌':'⏳'}</span>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--color-text-primary)' }}>{p.label}</div>
                  <div style={{ fontSize:10, color:'var(--color-text-secondary)' }}>
                    {p.status==='done'? (p.count ? p.count+' records' : 'Done') : p.status==='error'? (p.error||'Error').slice(0,40) : p.chunk || 'Running...'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/*  SYNC CARDS GRID  */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {CARDS.map(card => (
          <SyncCard key={card.key} card={card} count={counts[card.key]} loading={!!loading[card.key]} onSync={() => handleSync(card.key)} />
        ))}
      </div>

      {/*  BOTTOM ROW: Logs + Errors  */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Sync Log */}
        <div style={{ background:'#fff', border:'1px solid rgba(43,168,152,.15)', borderRadius:12, padding:'16px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <h3 style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}> Sync Activity Log</h3>
            <span style={{ fontSize:10, color:'var(--text-dim)' }}>{logItems.length} entries</span>
          </div>
          <div style={{ maxHeight:280, overflowY:'auto' }}>
            {logItems.length === 0 ? (
              <div style={{ textAlign:'center', padding:'30px 0', color:'var(--text-dim)', fontSize:12 }}>No sync activity yet</div>
            ) : logItems.map((l,i) => <LogEntry key={i} l={l} />)}
          </div>
          {/* Stats footer */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, background:'var(--surface2,#EEF8F6)', borderRadius:9, padding:'13px 14px', marginTop:12 }}>
            {statsMini.map((s,i) => (
              <div key={i} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:21, fontWeight:700, color:s.c, lineHeight:1 }}>{s.num}</div>
                <div style={{ fontSize:9.5, color:'var(--text-dim,#8AAEAA)', marginTop:2, fontWeight:500 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Error Log + Infra Details */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Tally Connection Card */}
          <div style={{ background: infra.tally==='online' ? 'linear-gradient(135deg,#0B2E20,#0D3A28)' : 'linear-gradient(135deg,#2E1010,#3A1515)', border: `1px solid ${infra.tally==='online'?'#1E5E3A':'#5E1E1E'}`, borderRadius:12, padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background: infra.tally==='online'?'#22c55e':'#ef4444', boxShadow:`0 0 6px ${infra.tally==='online'?'#22c55e':'#ef4444'}` }} />
              <h3 style={{ fontSize:13, fontWeight:700, color:'#fff', margin:0 }}>Tally Prime Connection</h3>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { lbl:'Tunnel URL', val:'tally.shreerangtrendz.com' },
                { lbl:'Local Port', val:'19000 (Tally Prime)' },
                { lbl:'VPS IP', val:'72.61.249.86' },
                { lbl:'FRP Port', val:'7000 (control) / 8080 (web)' },
              ].map((r,i) => (
                <div key={i} style={{ background:'rgba(255,255,255,.04)', borderRadius:7, padding:'7px 10px' }}>
                  <div style={{ fontSize:9, color:'#6b7280', marginBottom:2 }}>{r.lbl}</div>
                  <div style={{ fontSize:10, color:'#e5e7eb', fontFamily:"'JetBrains Mono',monospace", fontWeight:600 }}>{r.val}</div>
                </div>
              ))}
            </div>
            {infra.tallyCompany && (
              <div style={{ marginTop:8, background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.15)', borderRadius:7, padding:'6px 10px', fontSize:11, color:'#6ee7b7' }}>
                 Active Company: <strong>{infra.tallyCompany}</strong>
              </div>
            )}
          </div>

          {/* Errors */}
          <div style={{ background:'#fff', border:'1px solid rgba(217,58,58,.15)', borderRadius:12, padding:'16px 18px', flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <h3 style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}> Sync Errors</h3>
              {errors.length > 0 && <span style={{ background:'rgba(217,58,58,.1)', color:'#D93A3A', border:'1px solid rgba(217,58,58,.2)', borderRadius:100, padding:'1px 8px', fontSize:9, fontWeight:800 }}>{errors.length} recent</span>}
            </div>
            <div style={{ maxHeight:160, overflowY:'auto' }}>
              {errors.length === 0 ? (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#22c55e', fontSize:12 }}> No errors  all syncs clean</div>
              ) : errors.map((e,i) => (
                <div key={i} style={{ padding:'6px 0', borderBottom:'1px solid rgba(217,58,58,.08)', fontSize:10, color:'#D93A3A', fontFamily:"'JetBrains Mono',monospace" }}>
                   {e.message||e.error_message||'Unknown error'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
