import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────
const T = {
  teal:'#2BA898', tealDark:'#071E1C', tealLight:'#EEF8F6',
  gold:'#E8A800', navy:'#0B2E2B', green:'#1E9E5A', blue:'#2468C8',
  red:'#E74C3C', purple:'#9B59B6', orange:'#E67E22',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95', textDim:'#94a3b8',
};

const ROLE_META = {
  admin:            { icon:'🔐', label:'Admin',            color:'#E74C3C', desc:'Full system access' },
  manager:          { icon:'📊', label:'Manager',          color:'#2468C8', desc:'All operations & analytics' },
  sales_executive:  { icon:'💼', label:'Sales Executive',  color:'#1E9E5A', desc:'Orders, quotes & customers' },
  sales:            { icon:'💼', label:'Sales',            color:'#1E9E5A', desc:'Orders & customers' },
  production_staff: { icon:'🏭', label:'Production',       color:'#E8A800', desc:'Production floor & challans' },
  operations:       { icon:'⚙️', label:'Operations',       color:'#9B59B6', desc:'Production, MTO & stock' },
  accounts:         { icon:'💰', label:'Accounts',         color:'#1ABC9C', desc:'Billing, ledgers & reports' },
  payment_recovery: { icon:'💰', label:'Recovery',         color:'#E74C3C', desc:'Outstanding & reminders' },
  office_team:      { icon:'🏛', label:'Office Team',      color:'#2468C8', desc:'Office operations' },
  viewer:           { icon:'👁️', label:'Viewer',           color:'#94a3b8', desc:'Read-only access' },
};

const ALL_QUICK_ACTIONS = [
  { icon:'📋', label:'Sales Orders',      sub:'Create & manage',     to:'/admin/orders',                       color:T.green,  roles:['admin','manager','sales_executive','sales','office_team'] },
  { icon:'📝', label:'Quotations',        sub:'Create quotes',       to:'/admin/accounting/quotations',        color:T.blue,   roles:['admin','manager','sales_executive','sales','office_team'] },
  { icon:'👥', label:'Customers',         sub:'Customer database',   to:'/admin/customers',                    color:T.teal,   roles:['admin','manager','sales_executive','sales','accounts','office_team'] },
  { icon:'🏭', label:'Production Floor',  sub:'Challans & dispatch', to:'/admin/production-floor',             color:'#2468C8',roles:['admin','manager','operations','production_staff'] },
  { icon:'🤝', label:'Agent Commission',  sub:'Monthly payouts',     to:'/admin/agent-commission',             color:'#9B59B6',roles:['admin','manager'] },
  { icon:'🧾', label:'Job Work Challans', sub:'Track fabric jobs',   to:'/admin/challans',                     color:T.gold,   roles:['admin','manager','operations','production_staff'] },
  { icon:'⚙️', label:'MTO Pipeline',      sub:'Make-to-order',       to:'/admin/mto-orders',                   color:'#E67E22',roles:['admin','manager','operations'] },
  { icon:'📊', label:'Analytics',         sub:'Revenue & metrics',   to:'/admin/analytics',                    color:T.navy,   roles:['admin','manager'] },
  { icon:'💬', label:'WhatsApp Inbox',    sub:'Business messaging',  to:'/admin/whatsapp-inbox',               color:'#25D366',roles:['admin','manager','sales_executive','sales','office_team'] },
  { icon:'📣', label:'Broadcast',         sub:'Mass messaging',      to:'/admin/whatsapp-broadcast',           color:'#128C7E',roles:['admin','manager'] },
  { icon:'💰', label:'Outstanding',       sub:'Receivables & aging', to:'/admin/outstanding-receivable',       color:T.red,    roles:['admin','manager','accounts','payment_recovery','office_team'] },
  { icon:'🔔', label:'Reminders',         sub:'Payment alerts',      to:'/admin/payment-reminders',            color:T.red,    roles:['admin','manager','accounts','payment_recovery','office_team'] },
  { icon:'🗂️', label:'Catalogue',         sub:'Design & fabric',     to:'/admin/design-velocity',              color:'#9B59B6',roles:['admin','manager','office_team'] },
  { icon:'📦', label:'Stock',             sub:'Live inventory',      to:'/admin/stock',                        color:'#8E44AD',roles:['admin','manager','operations','office_team'] },
  { icon:'🧾', label:'Purchase Bills',    sub:'Tally purchases',     to:'/admin/accounting/purchase-bills',    color:T.blue,   roles:['admin','manager','accounts','office_team'] },
  { icon:'💹', label:'Sales Bills',       sub:'Tally sales',         to:'/admin/accounting/sales-bills',       color:T.green,  roles:['admin','manager','accounts','office_team'] },
  { icon:'📒', label:'Party Ledger',      sub:'Account statements',  to:'/admin/reports/party-ledger',         color:'#1ABC9C',roles:['admin','manager','accounts'] },
  { icon:'🔄', label:'Tally Sync',        sub:'Sync with Tally',     to:'/admin/tally-sync',                   color:'#1ABC9C',roles:['admin','manager'] },
  { icon:'🔐', label:'Access Control',    sub:'Roles & permissions', to:'/admin/access-control',               color:T.red,    roles:['admin'] },
];

function Sparkline({ values=[], color=T.teal, height=36, width=120 }) {
  if (!values.length || values.every(v=>v===0)) return null;
  const max = Math.max(...values,1);
  const pts = values.map((v,i) => {
    const x=(i/(values.length-1))*width;
    const y=height-(v/max)*(height-4)-2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ display:'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={`0,${height} ${pts} ${width},${height}`} fill={color+'22'} stroke="none" />
    </svg>
  );
}

function MiniBar({ data=[], color=T.teal, height=60 }) {
  const max=Math.max(...data.map(d=>d.value),1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height }}>
      {data.map((d,i)=>(
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
          <div style={{ width:'100%', background:i===data.length-1?color:color+'60', borderRadius:'2px 2px 0 0', height:Math.max((d.value/max)*(height-14),2) }} title={`${d.label}: ₹${(d.value||0).toLocaleString('en-IN')}`} />
          <div style={{ fontSize:8, color:T.textDim, whiteSpace:'nowrap' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color=T.teal, onClick, sparkValues }) {
  return (
    <div onClick={onClick} style={{ background:T.surface, borderRadius:14, padding:'16px 18px', boxShadow:'0 2px 12px rgba(0,0,0,.06)', border:`1px solid ${T.border}`, cursor:onClick?'pointer':'default', transition:'box-shadow .2s, transform .1s' }}
      onMouseEnter={e=>onClick&&(e.currentTarget.style.boxShadow='0 6px 24px rgba(43,168,152,.18)',e.currentTarget.style.transform='translateY(-1px)')}
      onMouseLeave={e=>onClick&&(e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.06)',e.currentTarget.style.transform='translateY(0)')}
    >
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
        <div style={{ width:34, height:34, background:color+'20', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{icon}</div>
        <div style={{ flex:1, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:'uppercase', letterSpacing:'0.8px' }}>{label}</div>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:24, fontWeight:800, color, lineHeight:1 }}>{value??'—'}</div>
          {sub && <div style={{ fontSize:11, color:T.textDim, marginTop:4 }}>{sub}</div>}
        </div>
        {sparkValues && sparkValues.length>0 && <Sparkline values={sparkValues} color={color} />}
      </div>
    </div>
  );
}

function AgingBar({ label, amount, total, color }) {
  const pct=total>0?(amount/total)*100:0;
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:11, color:T.textMuted }}>{label}</span>
        <span style={{ fontSize:11, fontWeight:700, color }}>₹{Number(amount||0).toLocaleString('en-IN',{maximumFractionDigits:0})}</span>
      </div>
      <div style={{ background:T.bg, borderRadius:4, height:6 }}>
        <div style={{ height:'100%', background:color, borderRadius:4, width:pct+'%', transition:'width 0.5s' }} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { profile } = useUserProfile();

  // Get role from profile (DB) first, fallback to user_metadata
  const userRole = profile?.role || user?.user_metadata?.role || user?.user_metadata?.user_role || 'viewer';
  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  const [loading,  setLoading]  = useState(true);
  const [kpi, setKpi] = useState({ salesThisMonth:0, purchaseThisMonth:0, outstandingTotal:0, outstandingCount:0, totalCustomers:0, totalAgents:0, totalStock:0, pendingOrders:0, pendingChallans:0, pendingQuotes:0, totalSalesBills:0, totalPurchaseBills:0 });
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [agingBuckets,   setAgingBuckets]   = useState({ current:0, days30:0, days60:0, days90plus:0 });
  const [topAgents,      setTopAgents]      = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [myOrders,       setMyOrders]       = useState([]);
  const [syncStatus,     setSyncStatus]     = useState({ last:null, status:'unknown' });
  const [whatsappCount,  setWhatsappCount]  = useState(0);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const now   = new Date();
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
      const today  = now.toISOString().slice(0,10);
      const months6 = [];
      for (let i=5; i>=0; i--) {
        const d=new Date(now.getFullYear(),now.getMonth()-i,1);
        months6.push({ label:d.toLocaleString('en-IN',{month:'short'}), key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, value:0 });
      }

      const [
        { count: customers }, { count: agents }, { count: stock },
        { count: pendingOrders }, { count: pendingChallans }, { count: pendingQuotes },
        { count: totalSalesBills }, { count: totalPurchaseBills },
        { data: salesBillsMonth }, { data: purchaseBillsMonth },
        { data: outstanding }, { data: salesBills6M },
        { data: activity }, { data: syncLog },
      ] = await Promise.all([
        supabase.from('customers').select('*',{count:'exact',head:true}),
        supabase.from('sales_team').select('*',{count:'exact',head:true}),
        supabase.from('fabric_stock_live').select('*',{count:'exact',head:true}),
        supabase.from('sales_orders').select('*',{count:'exact',head:true}).eq('status','confirmed'),
        supabase.from('job_work_challans').select('*',{count:'exact',head:true}).eq('status','pending'),
        supabase.from('quotations').select('*',{count:'exact',head:true}).eq('status','pending'),
        supabase.from('sales_bills').select('*',{count:'exact',head:true}),
        supabase.from('purchase_bills').select('*',{count:'exact',head:true}),
        supabase.from('sales_bills').select('total_amount').gte('bill_date',mStart).lte('bill_date',today),
        supabase.from('purchase_bills').select('total_amount').gte('bill_date',mStart).lte('bill_date',today),
        supabase.from('outstanding_receivable').select('outstanding_amount'),
        supabase.from('sales_bills').select('total_amount,bill_date').gte('bill_date',months6[0].key+'-01').order('bill_date',{ascending:true}),
        Promise.resolve({ data: [], error: null }),
        supabase.from('tally_sync_log').select('status,synced_at').order('synced_at',{ascending:false}).limit(1),
      ]);

      const rev = [...months6];
      (salesBills6M||[]).forEach(b=>{ const key=(b.bill_date||'').slice(0,7); const m=rev.find(m=>m.key===key); if(m) m.value+=Number(b.total_amount||0); });
      setMonthlyRevenue(rev);

      const salesMth = (salesBillsMonth||[]).reduce((s,r)=>s+Number(r.total_amount||0),0);
      const purchMth = (purchaseBillsMonth||[]).reduce((s,r)=>s+Number(r.total_amount||0),0);
      const outTotal = (outstanding||[]).reduce((s,r)=>s+Number(r.outstanding_amount||0),0);
      const outCount = (outstanding||[]).filter(r=>Number(r.outstanding_amount||0)>0).length;

      setKpi({ salesThisMonth:salesMth, purchaseThisMonth:purchMth, outstandingTotal:outTotal, outstandingCount:outCount, totalCustomers:customers||0, totalAgents:agents||0, totalStock:stock||0, pendingOrders:pendingOrders||0, pendingChallans:pendingChallans||0, pendingQuotes:pendingQuotes||0, totalSalesBills:totalSalesBills||0, totalPurchaseBills:totalPurchaseBills||0 });

      const today_d=new Date(today);
      const b30=new Date(today); b30.setDate(b30.getDate()-30);
      const b60=new Date(today); b60.setDate(b60.getDate()-60);
      const b90=new Date(today); b90.setDate(b90.getDate()-90);
      let aCurr=0,a30=0,a60=0,a90p=0;
      (outstanding||[]).forEach(o=>{
        const amt=Number(o.outstanding_amount||0); if(amt<=0) return;
        const d=o.bill_date?new Date(o.bill_date):null;
        if (!d||d>=b30) aCurr+=amt; else if(d>=b60) a30+=amt; else if(d>=b90) a60+=amt; else a90p+=amt;
      });
      setAgingBuckets({ current:aCurr, days30:a30, days60:a60, days90plus:a90p });

      const { data: agentOrders } = await supabase.from('sales_orders').select('agent_id,total_amount').not('agent_id','is',null).limit(1000);
      const agMap={};
      (agentOrders||[]).forEach(o=>{ const nm=o.agent_id||'Unknown'; if(!agMap[nm]) agMap[nm]={name:nm,revenue:0,orders:0}; agMap[nm].revenue+=Number(o.total_amount||0); agMap[nm].orders++; });
      setTopAgents(Object.values(agMap).sort((a,b)=>b.revenue-a.revenue).slice(0,5));
      setRecentActivity(activity||[]);
      setSyncStatus({ last:syncLog?.[0]?.synced_at, status:syncLog?.[0]?.status||'unknown' });

      try {
        const { count: waCount } = await supabase.from('whatsapp_messages').select('*',{count:'exact',head:true}).eq('direction','inbound').eq('is_read',false);
        setWhatsappCount(waCount||0);
      } catch {}

      const { data: myOrd } = await supabase.from('sales_orders').select('id,order_no,party_details,total_amount,status,created_at').order('created_at',{ascending:false}).limit(6);
      setMyOrders(myOrd||[]);

    } catch(err) { console.error('Dashboard:', err); }
    setLoading(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const roleMeta     = ROLE_META[userRole] || ROLE_META.viewer;
  const isAdmin      = userRole === 'admin';
  const isManager    = ['admin','manager'].includes(userRole);
  const isSalesRole  = ['admin','manager','sales_executive','sales','office_team'].includes(userRole);
  const isAccounts   = ['admin','manager','accounts','office_team'].includes(userRole);
  const isOps        = ['admin','manager','operations','production_staff'].includes(userRole);
  const isPayment    = ['admin','manager','payment_recovery','accounts'].includes(userRole);
  const visibleActions = ALL_QUICK_ACTIONS.filter(a => isAdmin || a.roles.includes(userRole));

  const fmt  = n => Number(n||0).toLocaleString('en-IN');
  const fmtC = n => '₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});
  const fmtL = n => n>=10000000?(n/10000000).toFixed(2)+'Cr':n>=100000?(n/100000).toFixed(2)+'L':fmtC(n);
  const spkValues = monthlyRevenue.map(m=>m.value);

  const statusBadge = (status) => {
    const sc={ pending:['#FFF8E8','#D4920A'], confirmed:['#E8FFF4','#1E9E5A'], approved:['#E8FFF4','#1E9E5A'], dispatched:['#EEF6FF','#2468C8'], delivered:['#E8FFF4','#1E9E5A'], cancelled:['#FFF3F3','#ef4444'], draft:['#f1f5f9','#64748b'] };
    const [bg,tc]=sc[status]||['#f1f5f9','#64748b'];
    return <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700, background:bg, color:tc }}>{status}</span>;
  };

  return (
    <div style={{ fontFamily:"'DM Sans', sans-serif", background:T.bg, minHeight:'100vh' }}>

      {/* HEADER */}
      <div style={{ background:`linear-gradient(135deg,${T.tealDark},#143F3C)`, padding:'18px 26px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, background:'linear-gradient(135deg,#3DBFAE,#E8A800)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>{roleMeta.icon}</div>
            {isAdmin?'Admin Command Center':isManager?'Manager Dashboard':isSalesRole?'Sales Dashboard':isOps?'Operations Dashboard':isAccounts?'Accounts Dashboard':'Dashboard'}
          </div>
          <div style={{ fontSize:12, color:'#6A9B95', marginTop:3 }}>Shreerang Trendz Pvt Ltd Â· {userName}</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {syncStatus.status==='success' && (
            <span style={{ background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)', color:'#22C55E', borderRadius:20, padding:'4px 10px', fontSize:11, fontWeight:600 }}>
              ✅ Tally {syncStatus.last?new Date(syncStatus.last).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):''}
            </span>
          )}
          {whatsappCount>0 && (
            <button onClick={()=>navigate('/admin/whatsapp-inbox')} style={{ background:'rgba(37,211,102,0.15)', border:'1px solid rgba(37,211,102,0.3)', color:'#25D366', borderRadius:20, padding:'4px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>
              💬 {whatsappCount} unread
            </button>
          )}
          <span style={{ background:roleMeta.color+'25', border:`1px solid ${roleMeta.color}50`, color:roleMeta.color, borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>
            {roleMeta.icon} {roleMeta.label}
          </span>
          <button onClick={loadDashboard} style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:600 }}>â» Refresh</button>
        </div>
      </div>

      <div style={{ padding:'20px 26px', display:'flex', flexDirection:'column', gap:18 }}>

        {/* KPI ROW - Manager/Admin + Office Team */}
        {(isManager || isSalesRole) && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px,1fr))', gap:12 }}>
            <StatCard icon="💹" label="Sales This Month"  value={fmtL(kpi.salesThisMonth)}    sub={`${fmt(kpi.totalSalesBills)} total bills`}    color={T.green}  sparkValues={spkValues} onClick={()=>navigate('/admin/accounting/sales-bills')} />
            <StatCard icon="🛒" label="Purchase This Month" value={fmtL(kpi.purchaseThisMonth)} sub={`${fmt(kpi.totalPurchaseBills)} bills`}        color={T.blue}   onClick={()=>navigate('/admin/accounting/purchase-bills')} />
            <StatCard icon="⚠️" label="Outstanding Recv"  value={fmtL(kpi.outstandingTotal)}  sub={`${fmt(kpi.outstandingCount)} parties`}          color={T.red}    onClick={()=>navigate('/admin/outstanding-receivable')} />
            <StatCard icon="👥" label="Customers"         value={fmt(kpi.totalCustomers)}      sub="Tally + CRM combined"                              color={T.teal}   onClick={()=>navigate('/admin/customers')} />
            {isManager && <StatCard icon="🤝" label="Agents"  value={fmt(kpi.totalAgents)}  sub="Active team"      color={T.gold}   onClick={()=>navigate('/admin/agent-commission')} />}
            {isManager && <StatCard icon="📦" label="Stock"   value={fmt(kpi.totalStock)}   sub="Live inventory"   color={T.purple} onClick={()=>navigate('/admin/stock')} />}
          </div>
        )}

        {/* STATUS ROW */}
        {isManager && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
            {[
              { icon:'⏳', label:'Pending Orders',   value:kpi.pendingOrders,   color:'#E67E22', to:'/admin/orders' },
              { icon:'🚚', label:'Pending Challans', value:kpi.pendingChallans, color:T.purple,  to:'/admin/challans' },
              { icon:'📝', label:'Pending Quotes',   value:kpi.pendingQuotes,   color:T.blue,    to:'/admin/accounting/quotations' },
            ].map(item => (
              <div key={item.to} onClick={()=>navigate(item.to)} style={{ background:T.surface, borderRadius:12, padding:'14px 18px', border:`1px solid ${T.border}`, cursor:'pointer', display:'flex', alignItems:'center', gap:12, boxShadow:'0 2px 8px rgba(0,0,0,.05)', transition:'box-shadow .15s' }}
                onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 4px 16px ${item.color}30`}
                onMouseLeave={e=>e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.05)'}
              >
                <div style={{ width:40, height:40, background:item.color+'20', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{item.icon}</div>
                <div><div style={{ fontSize:22, fontWeight:800, color:item.color }}>{item.value}</div><div style={{ fontSize:11, color:T.textMuted }}>{item.label}</div></div>
              </div>
            ))}
          </div>
        )}

        {/* CHARTS ROW */}
        {isManager && (
          <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr', gap:16 }}>
            <div style={{ background:T.surface, borderRadius:14, padding:'18px 20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:15, fontWeight:700, color:T.navy }}>📈 6-Month Sales</div>
                <button onClick={()=>navigate('/admin/analytics')} style={{ background:T.tealLight, border:`1px solid ${T.border}`, color:T.teal, borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:600 }}>Analytics â</button>
              </div>
              {loading ? <div style={{ color:T.textDim }}>Loading...</div> : (
                <>
                  <MiniBar data={monthlyRevenue} color={T.teal} height={80} />
                  <div style={{ marginTop:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <div style={{ background:T.bg, borderRadius:8, padding:'8px 12px', textAlign:'center' }}>
                      <div style={{ fontSize:13, fontWeight:800, color:T.teal }}>{fmtL(spkValues.reduce((s,v)=>s+v,0))}</div>
                      <div style={{ fontSize:10, color:T.textDim }}>6M Total</div>
                    </div>
                    <div style={{ background:T.bg, borderRadius:8, padding:'8px 12px', textAlign:'center' }}>
                      <div style={{ fontSize:13, fontWeight:800, color:T.green }}>{fmtL(spkValues.reduce((s,v)=>s+v,0)/6)}</div>
                      <div style={{ fontSize:10, color:T.textDim }}>Avg/Month</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ background:T.surface, borderRadius:14, padding:'18px 20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:15, fontWeight:700, color:T.navy }}>⚖️ Aging</div>
                <button onClick={()=>navigate('/admin/outstanding-receivable')} style={{ background:'#FFF3F3', border:'1px solid rgba(231,76,60,.2)', color:T.red, borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:600 }}>View â</button>
              </div>
              {loading ? <div style={{ color:T.textDim }}>Loading...</div> : (
                <>
                  <AgingBar label="0-30 Days"  amount={agingBuckets.current}    total={kpi.outstandingTotal} color={T.green} />
                  <AgingBar label="31-60 Days" amount={agingBuckets.days30}     total={kpi.outstandingTotal} color={T.gold} />
                  <AgingBar label="61-90 Days" amount={agingBuckets.days60}     total={kpi.outstandingTotal} color={T.orange} />
                  <AgingBar label="90+ Days"   amount={agingBuckets.days90plus} total={kpi.outstandingTotal} color={T.red} />
                  <div style={{ marginTop:10, fontWeight:800, color:T.red, fontSize:14 }}>Total: {fmtL(kpi.outstandingTotal)}</div>
                </>
              )}
            </div>

            <div style={{ background:T.surface, borderRadius:14, padding:'18px 20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div style={{ fontFamily:"'Playfair Display', serif", fontSize:15, fontWeight:700, color:T.navy }}>🏆 Top Agents</div>
                <button onClick={()=>navigate('/admin/agent-commission')} style={{ background:'#F3E8FF', border:'1px solid rgba(155,89,182,.2)', color:T.purple, borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:600 }}>All â</button>
              </div>
              {loading ? <div style={{ color:T.textDim }}>Loading...</div> : topAgents.length===0 ? (
                <div style={{ color:T.textDim, fontSize:12, textAlign:'center', paddingTop:20 }}>No agent data yet</div>
              ) : topAgents.map((a,i)=>{
                const medals=['🥇','🥈','🥉','4️⃣','5️⃣'];
                const pct=topAgents[0].revenue>0?(a.revenue/topAgents[0].revenue)*100:0;
                return (
                  <div key={a.name} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                      <span style={{ fontSize:11, color:T.text }}>{medals[i]} {a.name.length>14?a.name.slice(0,14)+'â¦':a.name}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:T.green }}>{fmtL(a.revenue)}</span>
                    </div>
                    <div style={{ background:T.bg, borderRadius:3, height:5 }}>
                      <div style={{ height:'100%', background:i===0?T.gold:i===1?'#94a3b8':i===2?'#CD7F32':T.teal, borderRadius:3, width:pct+'%', transition:'width 0.5s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RECENT ORDERS (all roles see this) */}
        <div style={{ background:T.surface, borderRadius:14, padding:'18px 20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize:15, fontWeight:700, color:T.navy }}>📋 Recent Orders</div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>navigate('/admin/orders/new')} style={{ background:T.green, color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:700 }}>+ New Order</button>
              <button onClick={()=>navigate('/admin/orders')} style={{ background:T.tealLight, border:`1px solid ${T.border}`, color:T.teal, borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:600 }}>View All â</button>
            </div>
          </div>
          {loading ? <div style={{ color:T.textDim, fontSize:13 }}>Loading...</div>
            : myOrders.length===0 ? <div style={{ color:T.textDim, textAlign:'center', padding:'20px 0', fontSize:13 }}>No orders yet. Create your first order!</div>
            : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead><tr>
                  {['Order #','Customer','Amount','Status','Date'].map(h=>(
                    <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:11, fontWeight:700, color:T.textMuted, borderBottom:`1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {myOrders.map(o=>(
                    <tr key={o.id} style={{ borderBottom:`1px solid ${T.border}60`, cursor:'pointer' }} onClick={()=>navigate(`/admin/orders/${o.id}`)}>
                      <td style={{ padding:'9px 10px', fontWeight:600, color:T.blue }}>{o.order_no||'—'}</td>
                      <td style={{ padding:'9px 10px' }}>{o.party_name||o.party_details?.name||'—'}</td>
                      <td style={{ padding:'9px 10px', fontWeight:700, color:T.green }}>{fmtC(o.total_amount)}</td>
                      <td style={{ padding:'9px 10px' }}>{statusBadge(o.status)}</td>
                      <td style={{ padding:'9px 10px', color:T.textDim, fontSize:11 }}>{o.created_at?new Date(o.created_at).toLocaleDateString('en-IN'):'-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>

        {/* OPS ROLE: Production + MTO */}
        {isOps && !isManager && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div onClick={()=>navigate('/admin/production-floor')} style={{ background:'linear-gradient(135deg,#EEF6FF,#E8FFF4)', border:'1px solid rgba(36,104,200,.2)', borderRadius:14, padding:'20px 24px', cursor:'pointer' }}>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700, color:T.navy }}>🏭 Production Floor</div>
              <div style={{ fontSize:13, color:T.textMuted, marginTop:4 }}>Challans, dispatch & QC</div>
              <span style={{ marginTop:12, display:'inline-block', background:'#2468C820', color:T.blue, padding:'4px 14px', borderRadius:20, fontSize:12, fontWeight:700 }}>Open â</span>
            </div>
            <div onClick={()=>navigate('/admin/mto-orders')} style={{ background:'linear-gradient(135deg,#FFF7ED,#FFFAEE)', border:'1px solid rgba(230,126,34,.2)', borderRadius:14, padding:'20px 24px', cursor:'pointer' }}>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700, color:T.navy }}>âï¸ MTO Pipeline</div>
              <div style={{ fontSize:13, color:T.textMuted, marginTop:4 }}>Make-to-order Kanban</div>
              <span style={{ marginTop:12, display:'inline-block', background:'#E67E2220', color:T.orange, padding:'4px 14px', borderRadius:20, fontSize:12, fontWeight:700 }}>Open â</span>
            </div>
          </div>
        )}

        {/* PAYMENT RECOVERY */}
        {isPayment && !isManager && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div onClick={()=>navigate('/admin/outstanding-receivable')} style={{ background:'linear-gradient(135deg,#FFF3F3,#FFF8E8)', border:'1px solid rgba(231,76,60,.2)', borderRadius:14, padding:'20px 24px', cursor:'pointer' }}>
              <div style={{ fontSize:28 }}>💰</div>
              <div style={{ fontWeight:700, color:T.red, fontSize:16, marginTop:8 }}>Outstanding: {fmtL(kpi.outstandingTotal)}</div>
              <div style={{ fontSize:12, color:T.textMuted }}>{fmt(kpi.outstandingCount)} parties pending</div>
            </div>
            <div onClick={()=>navigate('/admin/payment-reminders')} style={{ background:'linear-gradient(135deg,#FFF8E8,#FFFAEE)', border:'1px solid rgba(212,146,10,.2)', borderRadius:14, padding:'20px 24px', cursor:'pointer' }}>
              <div style={{ fontSize:28 }}>🔔</div>
              <div style={{ fontWeight:700, color:'#D4920A', fontSize:16, marginTop:8 }}>Send Reminders</div>
              <div style={{ fontSize:12, color:T.textMuted }}>WhatsApp payment reminders</div>
            </div>
          </div>
        )}

        {/* QUICK ACTIONS GRID */}
        <div style={{ background:T.surface, borderRadius:14, padding:'18px 20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
          <div style={{ fontFamily:"'Playfair Display', serif", fontSize:16, fontWeight:700, color:T.navy, marginBottom:14 }}>â¡ Quick Actions <span style={{ fontSize:12, fontWeight:400, color:T.textDim }}>({visibleActions.length} available)</span></div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(144px,1fr))', gap:10 }}>
            {visibleActions.map(action=>(
              <button key={action.to} onClick={()=>navigate(action.to)}
                style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 14px', cursor:'pointer', textAlign:'left', transition:'all .15s', fontFamily:"'DM Sans', sans-serif" }}
                onMouseEnter={e=>{ e.currentTarget.style.background=action.color+'12'; e.currentTarget.style.borderColor=action.color+'60'; e.currentTarget.style.transform='translateY(-1px)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.background=T.bg; e.currentTarget.style.borderColor=T.border; e.currentTarget.style.transform='translateY(0)'; }}
              >
                <div style={{ fontSize:22, marginBottom:6 }}>{action.icon}</div>
                <div style={{ fontWeight:700, fontSize:12, color:T.text }}>{action.label}</div>
                <div style={{ fontSize:10, color:T.textMuted, marginTop:2 }}>{action.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ACTIVITY FEED */}
        {isManager && recentActivity.length>0 && (
          <div style={{ background:T.surface, borderRadius:14, padding:'18px 20px', border:`1px solid ${T.border}`, boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
            <div style={{ fontFamily:"'Playfair Display', serif", fontSize:15, fontWeight:700, color:T.navy, marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              🕐 Recent Activity
              <button onClick={()=>navigate('/admin/activity-logs')} style={{ background:T.tealLight, border:`1px solid ${T.border}`, color:T.teal, borderRadius:7, padding:'4px 10px', cursor:'pointer', fontSize:11, fontWeight:600 }}>View All â</button>
            </div>
            {recentActivity.map(act=>(
              <div key={act.id} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:`1px solid ${T.border}60` }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:T.teal, marginTop:5, flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:12, color:T.text, fontWeight:500 }}>{act.action||'Activity'}</div>
                  <div style={{ fontSize:10, color:T.textDim }}>{act.entity_type} Â· {act.user_name||'System'} Â· {act.created_at?new Date(act.created_at).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'}):'—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ROLE FOOTER */}
        <div style={{ background:roleMeta.color+'10', border:`1px solid ${roleMeta.color}30`, borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:22 }}>{roleMeta.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, color:roleMeta.color, fontSize:13 }}>{roleMeta.label} Â· {userName}</div>
            <div style={{ fontSize:11, color:T.textMuted }}>{roleMeta.desc} Â· {visibleActions.length} actions available</div>
          </div>
          {isManager && (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>navigate('/admin/tally-sync')} style={{ background:'rgba(26,188,156,.15)', border:'1px solid rgba(26,188,156,.3)', color:'#1ABC9C', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:11, fontWeight:600 }}>ð Tally</button>
              <button onClick={()=>navigate('/admin/analytics')} style={{ background:'rgba(36,104,200,.12)', border:'1px solid rgba(36,104,200,.25)', color:T.blue, borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:11, fontWeight:600 }}>ð Analytics</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
      }
