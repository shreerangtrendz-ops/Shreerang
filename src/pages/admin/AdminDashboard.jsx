import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

const C = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6',
  gold:'#D4920A', goldLight:'#FEF9EC', border:'#D6EEE9',
  text:'#0D2E2B', muted:'#4A7A74', error:'#D93A3A',
  green:'#1E9E5A', purple:'#7C3AED', orange:'#C86020',
  blue:'#2563EB', surface:'#fff',
};

function StatCard({ icon, label, value, sub, color, to, badge }) {
  const nav = useNavigate();
  return (
    <div onClick={() => to && nav(to)} style={{
      background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:12,
      padding:'16px 18px', position:'relative', overflow:'hidden',
      cursor:to?'pointer':'default', transition:'all 0.2s',
      borderTop:`3px solid ${color||C.teal}`,
      boxShadow:'0 1px 4px rgba(43,168,152,.05)',
    }}
      onMouseEnter={e=>{if(to){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(43,168,152,.12)';}}}
      onMouseLeave={e=>{if(to){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 1px 4px rgba(43,168,152,.05)';}}}
    >
      {badge && <div style={{ position:'absolute', top:10, right:12, padding:'2px 8px', borderRadius:20, background:`${color||C.teal}22`, color:color||C.teal, fontSize:9, fontWeight:800 }}>{badge}</div>}
      <div style={{ fontSize:24, marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.8 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:800, color:C.tealDark, lineHeight:1.1, marginTop:2, fontFamily:'DM Sans,sans-serif' }}>
        {value === null ? <span style={{ fontSize:16, color:C.muted }}>Loading…</span> : value}
      </div>
      {sub && <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function QuickAction({ icon, label, to, color }) {
  const nav = useNavigate();
  return (
    <button onClick={() => nav(to)} style={{
      display:'flex', alignItems:'center', gap:10, padding:'11px 16px',
      borderRadius:10, border:`1.5px solid ${color||C.border}`,
      background:'#fff', cursor:'pointer', transition:'all 0.15s',
      fontFamily:'inherit', width:'100%', textAlign:'left',
    }}
      onMouseEnter={e=>{e.currentTarget.style.background=`${color||C.teal}11`;e.currentTarget.style.borderColor=color||C.teal;}}
      onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.borderColor=color||C.border;}}
    >
      <span style={{ fontSize:20 }}>{icon}</span>
      <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{label}</span>
    </button>
  );
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState({
    finish_fabrics: null, base_fabrics: null, designs: null,
    purchase_bills: null, sales_bills: null, customers: null,
    suppliers: null, agents: null, orders: null, pending_tally: null,
    stock_today: null, outstanding: null,
  });
  const [tallyStatus, setTallyStatus] = useState('checking');
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadCounts();
    checkTally();
    loadActivity();
  }, []);

  async function loadCounts() {
    const today = new Date().toISOString().split('T')[0];
    const [
      { count: ff }, { count: bf }, { count: dd },
      { count: pb }, { count: sb }, { count: cust },
      { count: sup }, { count: ag }, { count: ord },
      { count: pt }, { count: st }, { count: out },
    ] = await Promise.all([
      supabase.from('finish_fabrics').select('*',{count:'exact',head:true}).eq('is_active',true),
      supabase.from('base_fabrics').select('*',{count:'exact',head:true}).not('status','eq','deleted'),
      supabase.from('finish_fabric_designs').select('*',{count:'exact',head:true}).eq('is_active',true),
      supabase.from('purchase_bills').select('*',{count:'exact',head:true}),
      supabase.from('sales_bills').select('*',{count:'exact',head:true}),
      supabase.from('customers').select('*',{count:'exact',head:true}).neq('business_type','supplier'),
      supabase.from('customers').select('*',{count:'exact',head:true}).eq('business_type','supplier'),
      supabase.from('sales_team').select('*',{count:'exact',head:true}),
      supabase.from('orders').select('*',{count:'exact',head:true}),
      supabase.from('tally_sync_errors').select('*',{count:'exact',head:true}).eq('resolved',false),
      supabase.from('fabric_stock_live').select('*',{count:'exact',head:true}).eq('sync_date',today),
      supabase.from('payment_followups').select('*',{count:'exact',head:true}),
    ]);
    setCounts({ finish_fabrics:ff||0, base_fabrics:bf||0, designs:dd||0, purchase_bills:pb||0, sales_bills:sb||0, customers:cust||0, suppliers:sup||0, agents:ag||0, orders:ord||0, pending_tally:pt||0, stock_today:st||0, outstanding:out||0 });
  }

  async function checkTally() {
    try {
      const r = await fetch(`https://zdekydcscwhuusliwqaz.supabase.co/functions/v1/tally-health`, {
        headers:{ 'Authorization':`Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        signal: AbortSignal.timeout(8000)
      });
      const j = await r.json();
      setTallyStatus(j.tally === 'online' ? 'online' : 'offline');
    } catch { setTallyStatus('offline'); }
  }

  async function loadActivity() {
    const [{ data: syncLog }, { data: fabrics }, { data: designs }, { data: bills }] = await Promise.all([
      supabase.from('tally_sync_log').select('sync_type,tally_ok,created_at').order('created_at',{ascending:false}).limit(5),
      supabase.from('finish_fabrics').select('item_name,created_at').order('created_at',{ascending:false}).limit(4),
      supabase.from('finish_fabric_designs').select('design_no,color_name,created_at').order('created_at',{ascending:false}).limit(4),
      supabase.from('purchase_bills').select('bill_number,supplier_name,created_at').order('created_at',{ascending:false}).limit(3),
    ]);
    const items = [
      ...(syncLog||[]).map(s => ({ icon:'🔄', text:`Tally sync: ${s.sync_type}`, time:s.created_at, ok:s.tally_ok })),
      ...(fabrics||[]).map(f => ({ icon:'🧵', text:`New fabric: ${f.item_name}`, time:f.created_at, ok:true })),
      ...(designs||[]).map(d => ({ icon:'🎨', text:`Design ${d.design_no} — ${d.color_name||''}`, time:d.created_at, ok:true })),
      ...(bills||[]).map(b => ({ icon:'📥', text:`Bill ${b.bill_number} from ${b.supplier_name}`, time:b.created_at, ok:true })),
    ].sort((a,b) => new Date(b.time) - new Date(a.time)).slice(0,12);
    setRecentActivity(items);

    // Pending items
    const [{ data: syncErrors }, { data: noDesigns }] = await Promise.all([
      supabase.from('tally_sync_errors').select('sync_type,error_message').eq('resolved',false).limit(5),
      supabase.from('finish_fabrics').select('id,item_name').eq('is_active',true).limit(100),
    ]);
    const pending = [];
    if (syncErrors?.length) pending.push({ icon:'⚠️', text:`${syncErrors.length} unresolved Tally sync errors`, to:'/admin/tally-sync', urgent:true });
    setPendingItems(pending);
  }

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  return (
    <div style={{ fontFamily:"'DM Sans',Inter,sans-serif", padding:'24px 28px', background:'#F4FBFA', minHeight:'100vh' }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:22, fontWeight:800, color:C.tealDark }}>{greeting}, Shrikumar 👋</div>
        <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>{dateStr} · Shreerang Trendz Pvt. Ltd.</div>
        <div style={{ display:'flex', gap:8, marginTop:10, alignItems:'center' }}>
          <div style={{ padding:'4px 12px', borderRadius:20, background:tallyStatus==='online'?'#d1fae5':'#fee2e2', color:tallyStatus==='online'?'#065f46':'#991b1b', fontSize:11, fontWeight:700 }}>
            {tallyStatus==='online'?'● Tally Prime Online':'○ Tally Offline'}
          </div>
          {counts.pending_tally > 0 && (
            <div style={{ padding:'4px 12px', borderRadius:20, background:'#fef3c7', color:'#92400e', fontSize:11, fontWeight:700 }} onClick={()=>navigate('/admin/tally-sync')} className="cursor-pointer">
              ⚠ {counts.pending_tally} sync errors
            </div>
          )}
        </div>
      </div>

      {/* Pending urgent items */}
      {pendingItems.length > 0 && (
        <div style={{ marginBottom:20 }}>
          {pendingItems.map((p,i) => (
            <div key={i} onClick={()=>p.to&&navigate(p.to)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background:'#fef3c7', borderRadius:10, marginBottom:6, cursor:'pointer', border:'1px solid #fbbf24' }}>
              <span style={{ fontSize:18 }}>{p.icon}</span>
              <span style={{ fontSize:13, fontWeight:600, color:'#92400e' }}>{p.text}</span>
              <span style={{ marginLeft:'auto', fontSize:11, color:'#b45309' }}>View →</span>
            </div>
          ))}
        </div>
      )}

      {/* CATALOGUE STATS */}
      <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.2, marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
        <span>📦 Catalogue Master</span>
        <span style={{ flex:1, height:1, background:C.border, display:'block' }} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        <StatCard icon="🧵" label="Finish Fabrics" value={counts.finish_fabrics} sub="Active fabric items" color={C.teal} to="/admin/fabric/finish" />
        <StatCard icon="🔩" label="Base Fabrics" value={counts.base_fabrics} sub="Grey fabric master" color={C.blue} to="/admin/fabric/base-fabric-form" />
        <StatCard icon="🎨" label="Design Numbers" value={counts.designs} sub="Across all fabrics" color={C.purple} to="/admin/design/upload" />
        <StatCard icon="📦" label="Live Stock" value={counts.stock_today} sub="Items synced today" color={C.green} to="/admin/tally-sync" badge={tallyStatus==='online'?'LIVE':null} />
      </div>

      {/* ACCOUNTS STATS */}
      <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1.2, marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
        <span>🧮 Accounts & Tally</span>
        <span style={{ flex:1, height:1, background:C.border, display:'block' }} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        <StatCard icon="📥" label="Purchase Bills" value={counts.purchase_bills} sub="Total in DB" color={C.blue} to="/admin/accounting/purchase-bills" />
        <StatCard icon="📤" label="Sales Bills" value={counts.sales_bills} sub="Total in DB" color={C.green} to="/admin/accounting/sales-bills" />
        <StatCard icon="👥" label="Customers" value={counts.customers} sub="Sundry debtors" color={C.teal} to="/admin/customers" />
        <StatCard icon="🏭" label="Suppliers" value={counts.suppliers} sub="Sundry creditors" color={C.orange} to="/admin/tally-sync" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
        <StatCard icon="🤝" label="Sales Agents" value={counts.agents} sub="Active field agents" color="#C9106E" to="/admin/tally-sync" />
        <StatCard icon="📋" label="Orders" value={counts.orders} sub="Total sales orders" color={C.gold} to="/admin/orders" />
        <StatCard icon="💰" label="Outstanding" value={counts.outstanding} sub="Bills being tracked" color={C.purple} to="/admin/outstanding-receivable" />
      </div>

      {/* BOTTOM: Quick Actions + Activity */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:20 }}>

        {/* Quick Actions */}
        <div style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:12, padding:18 }}>
          <div style={{ fontSize:12, fontWeight:800, color:C.tealDark, marginBottom:12 }}>⚡ Quick Actions</div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            <QuickAction icon="🧵" label="+ New Finish Fabric" to="/admin/fabric/finish-fabric-form" color={C.teal} />
            <QuickAction icon="🔩" label="+ New Base Fabric" to="/admin/fabric/base-fabric-form" color={C.blue} />
            <QuickAction icon="🎨" label="+ Upload Design" to="/admin/design/upload" color={C.purple} />
            <QuickAction icon="📋" label="+ New Sales Order" to="/admin/orders/new" color={C.gold} />
            <QuickAction icon="🔄" label="Sync Tally Now" to="/admin/tally-sync" color={C.green} />
            <QuickAction icon="🧮" label="Open Cost Engine" to="/admin/cost/cost-sheet" color={C.orange} />
            <QuickAction icon="🔖" label="Edit SKU Formula" to="/admin/settings/sku-formula" color={C.muted} />
          </div>
        </div>

        {/* Activity Feed */}
        <div style={{ background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:12, padding:18 }}>
          <div style={{ fontSize:12, fontWeight:800, color:C.tealDark, marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span>📋 Recent Activity</span>
            <span style={{ fontSize:10, color:C.muted, fontWeight:500 }}>Auto-refreshes</span>
          </div>
          {recentActivity.length === 0 ? (
            <div style={{ textAlign:'center', padding:'24px', color:C.muted, fontSize:13 }}>No recent activity</div>
          ) : (
            <div style={{ maxHeight:380, overflowY:'auto' }}>
              {recentActivity.map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8, marginBottom:5, background:'#f8fbfa', border:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>{item.icon}</span>
                  <span style={{ fontSize:12, color:C.text, flex:1 }}>{item.text}</span>
                  <span style={{ fontSize:10, color:C.muted, whiteSpace:'nowrap' }}>
                    {new Date(item.time).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                  </span>
                  {item.ok === false && <span style={{ width:8, height:8, borderRadius:'50%', background:C.error, flexShrink:0 }} />}
                  {item.ok === true && <span style={{ width:8, height:8, borderRadius:'50%', background:C.green, flexShrink:0 }} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
