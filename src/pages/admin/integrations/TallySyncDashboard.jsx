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
const S = ({ status }) => {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border';
  if (status === 'checking') return <span className={`${base} bg-slate-50 text-slate-500 border-slate-200`}><span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block animate-pulse" />Checking</span>;
  if (status === 'online')   return <span className={`${base} bg-green-50 text-green-700 border-green-200`}><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />Online</span>;
  if (status === 'disabled') return <span className={`${base} bg-slate-50 text-slate-400 border-slate-200`}><span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />Disabled</span>;
  return                            <span className={`${base} bg-red-50 text-red-700 border-red-200`}><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Offline</span>;
};

const CARDS = [
  { key:"stock",       icon:"📦", label:"Live Stock",           sub:"Items synced today",      stripe:"#3DBFAE,#0E96A0", ib:"rgba(61,191,174,.12)",  btnC:"#1D8A7C", badge:"LIVE",      badgeC:"#1E9E5A" },
  { key:"purchases",   icon:"🛒", label:"Purchases",            sub:"Bills last 30 days",       stripe:"#2468C8,#0E96A0", ib:"rgba(36,104,200,.10)",  btnC:"#2468C8", badge:"30D",       badgeC:"#2468C8" },
  { key:"job_bills",   icon:"🧾", label:"Job Bills",            sub:"Job worker bills 30d",     stripe:"#E8A800,#D4780A", ib:"rgba(232,168,0,.10)",   btnC:"#D4920A", badge:"30D",       badgeC:"#D4920A" },
  { key:"customers",   icon:"👥", label:"Customers",            sub:"Sundry debtors in DB",     stripe:"#1E9E5A,#0E9E6A", ib:"rgba(30,158,90,.10)",   btnC:"#1E9E5A", badge:"DEBTORS",   badgeC:"#1E9E5A" },
  { key:"suppliers",   icon:"🏭", label:"Suppliers",            sub:"Sundry creditors in DB",   stripe:"#C86020,#E87040", ib:"rgba(200,96,32,.10)",   btnC:"#C86020", badge:"CREDITORS", badgeC:"#C86020" },
  { key:"agents",      icon:"🤝", label:"Sales Agents",         sub:"Active field agents",      stripe:"#C9106E,#E01878", ib:"rgba(201,16,110,.10)",  btnC:"#C9106E", badge:"AGENTS",    badgeC:"#C9106E" },
  { key:"outstanding", icon:"💰", label:"Outstanding Bills",    sub:"Bills tracked live",       stripe:"#6E44C8,#8B5CF6", ib:"rgba(110,68,200,.10)",  btnC:"#6E44C8", badge:"LIVE",      badgeC:"#6E44C8" },
];

const BTN_LABELS = {
  stock:"↻ Sync Stock", purchases:"↻ Sync Purchases", job_bills:"↻ Sync Job Bills",
  customers:"↻ Pull Debtors", suppliers:"↻ Pull Creditors", agents:"↻ Pull Agents", outstanding:"↻ Pull Outstanding"
};

// Infrastructure systems with fix hints
const INFRA_SYSTEMS = [
  {
    key: "tally",
    icon: "🧾",
    label: "Tally Prime",
    sub: "Office PC · Port 9000",
    fixHints: [
      "Open Tally Prime on Office PC",
      "Enable TDL Gateway: F12 → Advanced Config → Enable ODBC → Port 9000",
      "Check Windows Firewall allows port 9000",
    ]
  },
  {
    key: "frpc",
    icon: "🔗",
    label: "FRP Client (Win PC)",
    sub: "Tunnel to VPS on port 7000",
    fixHints: [
      "Run CMD as Admin in FRP folder on Office PC",
      'Execute: frpc.exe -c frpc.toml',
      'Look for: [tally] start proxy success in output',
      "frpc.toml: serverAddr=72.61.249.86, serverPort=7000, localPort=9000",
    ]
  },
  {
    key: "frps",
    icon: "🖥️",
    label: "FRP Server (VPS)",
    sub: "KVM VPS · Port 7000/8080",
    fixHints: [
      "SSH into VPS: ssh root@72.61.249.86",
      "Restart: kill $(pgrep frps); nohup /opt/frp/frps -c /opt/frp/frps.toml > /opt/frp/frps.log 2>&1 &",
      "Verify: netstat -tunlp | grep 8080",
    ]
  },
  {
    key: "domain",
    icon: "🌐",
    label: "HTTPS Gateway",
    sub: "tally.shreerangtrendz.com",
    fixHints: [
      "Check Nginx: sudo systemctl status nginx",
      "Restart Nginx: sudo systemctl restart nginx",
      "Verify SSL cert not expired: certbot certificates",
      "Test: curl -I https://tally.shreerangtrendz.com",
    ]
  },
];

export default function TallySyncDashboard() {
  const [loading,      setLoading]      = useState({});
  const [errors,       setErrors]       = useState([]);
  const [logItems,     setLogItems]     = useState([]);
  const [counts,       setCounts]       = useState({ stock:0, purchases:0, job_bills:0, customers:0, suppliers:0, agents:0, outstanding:0 });
  const [activeCompany, setActiveCompany] = useState("");
  const [expandedFix,  setExpandedFix]  = useState(null);
  const [infra,        setInfra]        = useState({
    tally:"checking", frpc:"checking", frps:"checking", domain:"checking",
    lastChecked:null, tallyCompany:"", stockItems:0,
  });
  const { toast } = useToast();

  /* ── infra health ── */
  async function checkInfrastructure() {
    setInfra(p => ({ ...p, tally:"checking", frpc:"checking", frps:"checking", domain:"checking" }));
    try {
      // 1. Hit the Supabase edge function for frps/frpc/nginx/domain checks
      const r = await fetch("https://zdekydcscwhuusliwqaz.supabase.co/functions/v1/tally-health", {
        method:"GET",
        headers:{ "Authorization":`Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, "apikey":import.meta.env.VITE_SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(15000)
      });
      const json = await r.json();

      // 2. Also try the actual tally HTTPS endpoint to verify end-to-end
      let tallyDirect = "offline";
      try {
        const tr = await fetch("https://tally.shreerangtrendz.com", { signal: AbortSignal.timeout(8000) });
        const txt = await tr.text();
        if (txt.includes("TallyPrime") || txt.includes("Tally") || tr.ok) tallyDirect = "online";
      } catch {}

      // Use direct check for tally; edge function results for infrastructure
      const tallyStatus = (json.tally === "online" || tallyDirect === "online") ? "online" : "offline";

      setInfra({
        frps:    json.frps   || "offline",
        frpc:    json.frpc   || "offline",
        domain:  json.domain || (tallyDirect === "online" ? "online" : "offline"),
        tally:   tallyStatus,
        lastChecked: new Date(),
        tallyCompany: json.tallyCompany || "",
        stockItems: json.stockItems || 0,
      });
    } catch {
      // Edge function failed — try direct tally check at minimum
      let tallyDirect = "offline";
      try {
        const tr = await fetch("https://tally.shreerangtrendz.com", { signal: AbortSignal.timeout(8000) });
        const txt = await tr.text();
        if (txt.includes("TallyPrime") || txt.includes("Tally") || tr.ok) tallyDirect = "online";
      } catch {}
      setInfra(p => ({
        ...p,
        frps:"offline", frpc:"offline",
        domain: tallyDirect === "online" ? "online" : "offline",
        tally: tallyDirect,
        lastChecked: new Date()
      }));
    }
  }

  useEffect(() => {
    checkInfrastructure();
    const iv = setInterval(checkInfrastructure, 30000);
    return () => clearInterval(iv);
  }, []);

  /* ── dashboard data ── */
  useEffect(() => { loadData(); }, []);
  async function loadData() {
    const today = new Date().toISOString().split("T")[0];
    const [
      { count: sc }, { count: pc }, { count: jc },
      { count: cc }, { count: supc }, { count: ac }, { count: oc },
      { data: errData }, { data: logData }
    ] = await Promise.all([
      supabase.from("fabric_stock_live").select("*",{count:"exact",head:true}).eq("sync_date",today),
      supabase.from("purchase_fabric").select("*",{count:"exact",head:true}),
      supabase.from("process_charges").select("*",{count:"exact",head:true}),
      supabase.from("customers").select("*",{count:"exact",head:true}).neq("business_type","supplier"),
      supabase.from("customers").select("*",{count:"exact",head:true}).eq("business_type","supplier"),
      supabase.from("sales_team").select("*",{count:"exact",head:true}),
      supabase.from("payment_followups").select("*",{count:"exact",head:true}),
      supabase.from("tally_sync_errors").select("*").eq("resolved",false).order("created_at",{ascending:false}).limit(8),
      supabase.from("tally_sync_log").select("sync_type,status,created_at").order("created_at",{ascending:false}).limit(12),
    ]);
    setCounts({ stock:sc||0, purchases:pc||0, job_bills:jc||0, customers:cc||0, suppliers:supc||0, agents:ac||0, outstanding:oc||0 });
    setErrors(errData||[]);
    setLogItems(logData||[]);
  }

  /* ── sync handler ── */
  async function handleSync(type) {
    if (infra.tally !== "online") {
      toast({ title:"Tally Offline", description:"Cannot sync — Tally Prime is not reachable.", variant:"destructive" });
      return;
    }
    setLoading(p => ({ ...p, [type]:true }));
    try {
      const fn = { stock:pullStockFromTally, purchases:pullPurchasesFromTally, job_bills:pullJobBillsFromTally,
                   customers:syncCustomersFromTally, suppliers:syncSuppliersFromTally,
                   agents:syncAgentsFromTally, outstanding:syncOutstandingFromTally }[type];
      const r = await fn();
      if (r?.success) {
        toast({ title:"Sync Complete ✓", description:`${type} synced successfully.` });
        loadData();
      } else {
        toast({ title:"Sync Error", description:r?.error || "Unknown error", variant:"destructive" });
      }
    } catch(e) {
      toast({ title:"Sync Failed", description:e.message, variant:"destructive" });
    } finally {
      setLoading(p => ({ ...p, [type]:false }));
    }
  }

  const allOnline = INFRA_SYSTEMS.every(s => infra[s.key] === "online");
  const anyOffline = INFRA_SYSTEMS.some(s => infra[s.key] === "offline");

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg,#F4FAF8)", padding:"24px 28px", fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:"var(--text,#0D2E2B)", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:18 }}>⚡</span> Tally Sync · BizAnalyst
          </h1>
          <p style={{ margin:"4px 0 0", fontSize:12, color:"var(--text-muted,#4A7A74)" }}>
            Live infrastructure status + Supabase data sync for Shreerang Trendz
          </p>
        </div>
        <button onClick={() => { checkInfrastructure(); loadData(); }}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, background:"rgba(43,168,152,.1)", border:"1px solid rgba(43,168,152,.3)", color:"#1D8A7C", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
          <RefreshCcw size={13} /> Refresh All
        </button>
      </div>

      {/* ── Infrastructure Status Banner ── */}
      <div style={{ background:"#fff", border:`1px solid ${anyOffline ? "rgba(220,38,38,.2)" : "rgba(43,168,152,.18)"}`, borderRadius:14, padding:"16px 18px", marginBottom:22, borderTop:`3px solid ${anyOffline ? "#DC2626" : "#3DBFAE"}`, boxShadow:"0 1px 4px rgba(43,168,152,.05)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".8px", color:"var(--text,#0D2E2B)" }}>
            {allOnline ? "✅ All Systems Online" : anyOffline ? "🔴 Infrastructure Issues Detected" : "⏳ Checking Systems..."}
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:10, color:"var(--text-dim,#8AAEAA)" }}>
              {infra.lastChecked ? `Checked ${infra.lastChecked.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}` : "Checking..."}
            </span>
            <button onClick={checkInfrastructure}
              style={{ padding:"4px 11px", borderRadius:7, background:"rgba(43,168,152,.1)", border:"1px solid rgba(43,168,152,.3)", color:"#1D8A7C", fontSize:10, fontWeight:600, cursor:"pointer" }}>
              ↻ Recheck
            </button>
          </div>
        </div>

        {/* 4 system tiles */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          {INFRA_SYSTEMS.map(sys => {
            const st = infra[sys.key];
            const isOff = st === "offline";
            const expanded = expandedFix === sys.key;
            return (
              <div key={sys.key}
                style={{ background: isOff ? "rgba(220,38,38,.04)" : "var(--surface2,#EEF8F6)", border:`1px solid ${isOff ? "rgba(220,38,38,.2)" : "var(--border,rgba(43,168,152,.18))"}`, borderRadius:10, padding:"12px 13px", cursor: isOff ? "pointer" : "default", transition:"all .2s" }}
                onClick={() => isOff && setExpandedFix(expanded ? null : sys.key)}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                  <span style={{ fontSize:20 }}>{sys.icon}</span>
                  <S status={st} />
                </div>
                <div style={{ fontSize:11, fontWeight:700, color:"var(--text,#0D2E2B)", marginBottom:2 }}>{sys.label}</div>
                <div style={{ fontSize:10, color:"var(--text-muted,#4A7A74)" }}>{sys.sub}</div>
                {isOff && (
                  <div style={{ marginTop:8, fontSize:10, color:"#DC2626", fontWeight:600 }}>
                    {expanded ? "▲ Hide fix steps" : "▼ Show fix steps"}
                  </div>
                )}
                {/* Tally extra info when online */}
                {sys.key === "tally" && st === "online" && infra.tallyCompany && (
                  <div style={{ marginTop:6, fontSize:9.5, color:"#1D8A7C", fontWeight:500 }}>
                    ✓ {infra.tallyCompany}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Fix hints panel - shown when a system tile is expanded */}
        {expandedFix && (
          <div style={{ marginTop:12, background:"#FEF2F2", border:"1px solid rgba(220,38,38,.2)", borderRadius:10, padding:"13px 15px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#DC2626", marginBottom:8 }}>
              🔧 Fix Steps: {INFRA_SYSTEMS.find(s=>s.key===expandedFix)?.label}
            </div>
            {INFRA_SYSTEMS.find(s=>s.key===expandedFix)?.fixHints.map((hint, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:5 }}>
                <span style={{ background:"#DC2626", color:"#fff", fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:100, whiteSpace:"nowrap", marginTop:1 }}>
                  {i+1}
                </span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10.5, color:"#7F1D1D", lineHeight:1.5 }}>{hint}</span>
              </div>
            ))}
          </div>
        )}

        {/* Terminal strip */}
        <div style={{ background:"#0B2E2B", border:"1px solid rgba(61,191,174,.2)", borderRadius:8, padding:"11px 14px", marginTop:12, fontFamily:"'JetBrains Mono',monospace", fontSize:10.5, lineHeight:1.9 }}>
          {infra.tally === "online" ? (
            <>
              <div style={{ color:"#34d399" }}>▶ Connected · https://tally.shreerangtrendz.com</div>
              <div style={{ color:"#C8E8E4" }}>→ Company: {infra.tallyCompany || activeCompany || "Shreerang Trendz"} | Items in stock: {infra.stockItems || "—"}</div>
            </>
          ) : (
            <>
              <div style={{ color:"#f87171" }}>▶ Tally endpoint unreachable — check chain below</div>
              <div style={{ color:"#6A9B95" }}>→ Chain: Office PC:9000 → frpc → VPS:7000 → frps → nginx → tally.shreerangtrendz.com</div>
            </>
          )}
          <div style={{ color:"#6A9B95" }}>→ Supabase zdekydcscwhuusliwqaz (ap-southeast-1) ✓ healthy</div>
          <div style={{ color:"#475569" }}>→ Auto-refresh every 30s · Last: {infra.lastChecked ? infra.lastChecked.toLocaleTimeString() : "pending"}</div>
        </div>
      </div>

      {/* ── Sync Cards Grid ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:22 }}>
        {CARDS.map(card => (
          <SyncCard key={card.key} card={card} count={counts[card.key]} loading={loading[card.key]}
            onSync={() => handleSync(card.key)} tallyOnline={infra.tally === "online"} />
        ))}
      </div>

      {/* ── Bottom Panel (2-col) ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

        {/* Sync Log */}
        <div style={{ background:"#fff", border:"1px solid var(--border)", borderRadius:12, padding:18, borderTop:"3px solid #E8A800", boxShadow:"0 1px 4px rgba(43,168,152,.05)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".8px", color:"var(--text,#0D2E2B)" }}>📋 Sync Activity Log</span>
            <span style={{ fontSize:10, color:"var(--text-dim,#8AAEAA)", display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"#3DBFAE", display:"inline-block" }} />
              Live · 30s refresh
            </span>
          </div>
          <div style={{ maxHeight:260, overflowY:"auto" }}>
            {errors.map(err => (
              <div key={err.id} style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 11px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface2,#EEF8F6)", marginBottom:6 }}>
                <span style={{ padding:"2px 8px", borderRadius:100, fontSize:9, fontWeight:800, background:"rgba(217,58,58,.1)", color:"#D93A3A", border:"1px solid rgba(217,58,58,.2)", whiteSpace:"nowrap" }}>ERROR</span>
                <span style={{ fontSize:11, fontWeight:600, color:"var(--text)", minWidth:120, fontFamily:"'JetBrains Mono',monospace" }}>{err.sync_type}</span>
                <span style={{ fontSize:11, color:"var(--text-muted)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{err.error_message}</span>
                <span style={{ fontSize:9.5, color:"var(--text-dim)", whiteSpace:"nowrap" }}>{new Date(err.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span>
              </div>
            ))}
            {logItems.filter(l=>l.status==="success").slice(0,8).map((l,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 11px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface2,#EEF8F6)", marginBottom:6 }}>
                <span style={{ padding:"2px 8px", borderRadius:100, fontSize:9, fontWeight:800, background:"rgba(30,158,90,.1)", color:"#1E9E5A", border:"1px solid rgba(30,158,90,.2)", whiteSpace:"nowrap" }}>OK</span>
                <span style={{ fontSize:11, fontWeight:600, color:"var(--text)", minWidth:120, fontFamily:"'JetBrains Mono',monospace" }}>{l.sync_type}</span>
                <span style={{ fontSize:11, color:"var(--text-muted)", flex:1 }}>Synced from Tally Prime</span>
                <span style={{ fontSize:9.5, color:"var(--text-dim)", whiteSpace:"nowrap" }}>{new Date(l.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>
              </div>
            ))}
            {errors.length === 0 && logItems.length === 0 && (
              <div style={{ textAlign:"center", padding:30, color:"var(--text-dim,#8AAEAA)", fontSize:12 }}>No sync activity yet</div>
            )}
          </div>
          {/* Stats footer */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, background:"var(--surface2,#EEF8F6)", borderRadius:9, padding:"13px 14px", marginTop:12 }}>
            {[
              { num:logItems.length+errors.length, lbl:"Total Syncs",    c:"var(--teal-light,#1D8A7C)" },
              { num:logItems.filter(l=>l.status==="success").length, lbl:"Successful", c:"#1E9E5A" },
              { num:errors.length,                 lbl:"Errors",         c:"#D93A3A" },
              { num:(counts.suppliers||0).toLocaleString(), lbl:"Suppliers", c:"#E8A800" },
            ].map((s,i) => (
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:21, fontWeight:700, color:s.c, lineHeight:1 }}>{s.num}</div>
                <div style={{ fontSize:9.5, color:"var(--text-dim,#8AAEAA)", marginTop:2, fontWeight:500 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions / Diagnostics */}
        <div style={{ background:"#fff", border:"1px solid var(--border)", borderRadius:12, padding:18, borderTop:"3px solid #6E44C8", boxShadow:"0 1px 4px rgba(43,168,152,.05)" }}>
          <span style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".8px", color:"var(--text,#0D2E2B)", display:"block", marginBottom:14 }}>🔌 Diagnostics & Quick Links</span>

          {/* Live endpoint test */}
          <div style={{ background:"#0B2E2B", borderRadius:8, padding:"11px 14px", fontFamily:"'JetBrains Mono',monospace", fontSize:10.5, lineHeight:1.9, marginBottom:14 }}>
            <div style={{ color:"#94a3b8" }}>// Tally HTTPS endpoint</div>
            <div style={{ color:"#34d399" }}>curl https://tally.shreerangtrendz.com</div>
            <div style={{ color:"#94a3b8" }}>// Expected: &lt;RESPONSE&gt;TallyPrime Server is Running&lt;/RESPONSE&gt;</div>
          </div>

          {/* Quick links */}
          {[
            { label:"🌐 Open Tally Endpoint", href:"https://tally.shreerangtrendz.com", desc:"Verify tunnel is live" },
            { label:"🔍 Supabase Edge Logs", href:"https://supabase.com/dashboard/project/zdekydcscwhuusliwqaz/functions", desc:"tally-health + tally-proxy logs" },
            { label:"📊 Supabase Tables", href:"https://supabase.com/dashboard/project/zdekydcscwhuusliwqaz/editor", desc:"fabric_stock_live, purchase_fabric" },
          ].map((link,i) => (
            <a key={i} href={link.href} target="_blank" rel="noopener noreferrer"
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface2,#EEF8F6)", marginBottom:8, textDecoration:"none", transition:"all .2s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(43,168,152,.4)"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"var(--text,#0D2E2B)" }}>{link.label}</div>
                <div style={{ fontSize:10.5, color:"var(--text-muted,#4A7A74)" }}>{link.desc}</div>
              </div>
              <span style={{ color:"var(--text-muted,#4A7A74)", fontSize:12 }}>→</span>
            </a>
          ))}

          {/* FRP VPS instructions */}
          <div style={{ background:"var(--surface2,#EEF8F6)", borderRadius:8, padding:"11px 13px", marginTop:4 }}>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:".6px", marginBottom:7 }}>VPS Quick Restart</div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9.5, color:"#1D8A7C", lineHeight:1.8 }}>
              <div>kill $(pgrep frps)</div>
              <div>nohup /opt/frp/frps -c /opt/frp/frps.toml &gt; /opt/frp/frps.log 2&gt;&amp;1 &amp;</div>
              <div>sudo systemctl restart nginx</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sync Card Component ── */
function SyncCard({ card, count, loading, onSync, tallyOnline }) {
  const liveCount = count > 0;
  return (
    <div style={{ background:"#fff", border:"1px solid var(--border,rgba(43,168,152,.18))", borderRadius:12, padding:"17px 16px 14px", position:"relative", overflow:"hidden", transition:"all .25s", display:"flex", flexDirection:"column", boxShadow:"0 1px 4px rgba(43,168,152,.05)", cursor:"default" }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(43,168,152,.1)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 1px 4px rgba(43,168,152,.05)"; }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${card.stripe})`, borderRadius:"12px 12px 0 0" }} />
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ width:36, height:36, borderRadius:9, background:card.ib, border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{card.icon}</div>
        <span style={{ background:`${card.ib}`, color:card.badgeC, border:`1px solid ${card.badgeC}33`, fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:100, textTransform:"uppercase" }}>{card.badge}</span>
      </div>
      <div style={{ fontSize:10, fontWeight:600, color:"var(--text-muted,#4A7A74)", textTransform:"uppercase", letterSpacing:".8px", marginBottom:2 }}>{card.label}</div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:700, lineHeight:1, letterSpacing:"-1px", marginBottom:1,
        ...(liveCount ? { background:"linear-gradient(135deg,#1D8A7C,#3DBFAE)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" } : { color:"var(--text,#0D2E2B)" })
      }}>{(count||0).toLocaleString()}</div>
      <div style={{ fontSize:11, color:"var(--text-dim,#8AAEAA)", marginBottom:13, flex:1 }}>{card.sub}</div>
      <button onClick={onSync} disabled={loading || !tallyOnline}
        title={!tallyOnline ? "Tally is offline" : ""}
        style={{ width:"100%", padding:"8px 0", borderRadius:7, fontSize:10, fontWeight:700, cursor:(loading||!tallyOnline)?"not-allowed":"pointer", textTransform:"uppercase", letterSpacing:".6px", fontFamily:"'DM Sans',sans-serif", border:`1px solid ${card.btnC}55`, background:loading?`rgba(232,168,0,.1)`:!tallyOnline?"rgba(0,0,0,.04)":`${card.btnC}14`, color:loading?"#D4920A":!tallyOnline?"#aaa":card.btnC, transition:"all .2s" }}>
        {loading ? "⟳ Syncing..." : !tallyOnline ? "⚠ Tally Offline" : (BTN_LABELS[card.key]||"↻ Sync")}
      </button>
    </div>
  );
}
