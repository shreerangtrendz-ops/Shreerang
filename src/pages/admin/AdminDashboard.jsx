import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

const T = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6',
  gold:'#E8A800', goldLight:'#FFF8E8',
  navy:'#0B2E2B', green:'#1E9E5A', greenLight:'#E8FFF4',
  blue:'#2468C8', blueLight:'#EBF8FF',
  red:'#E74C3C', redLight:'#FFF5F5',
  purple:'#9B59B6', orange:'#E67E22',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95',
};

const fmt  = n => '\u20B9' + Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0});
const fmtL = n => { const v=Number(n||0); return v>=10000000?`\u20B9${(v/10000000).toFixed(2)}Cr`:v>=100000?`\u20B9${(v/100000).toFixed(1)}L`:fmt(v); };
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'numeric',month:'short'}) : '—';

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ values=[], color=T.teal, h=36, w=120 }) {
  if (!values.length || values.every(v=>v===0)) return <div style={{width:w,height:h}}/>;
  const max=Math.max(...values,1);
  const pts=values.map((v,i)=>`${(i/(values.length-1||1))*w},${h-(v/max)*(h-4)-2}`).join(' ');
  return (
    <svg width={w} height={h} style={{display:'block'}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color+'22'} stroke="none"/>
    </svg>
  );
}

// ── MiniBar ──────────────────────────────────────────────────────────────────
function MiniBar({label, value, max, color=T.teal, sub}) {
  const pct=max>0?Math.min(100,Math.round((value/max)*100)):0;
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
        <span style={{color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:180}}>{label}</span>
        <span style={{color,fontWeight:700,flexShrink:0,marginLeft:8}}>{sub||fmt(value)}</span>
      </div>
      <div style={{background:T.border,borderRadius:4,height:5}}>
        <div style={{background:color,borderRadius:4,height:5,width:pct+'%',transition:'width .6s'}}/>
      </div>
    </div>
  );
}

// ── AgingRow ─────────────────────────────────────────────────────────────────
function AgingRow({label, amount, total, color}) {
  const pct=total>0?Math.min(100,Math.round((amount/total)*100)):0;
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:`1px solid ${T.border}`}}>
      <div style={{flex:1,fontSize:12.5,fontWeight:500,color:T.text}}>{label}</div>
      <div style={{width:80,height:5,background:T.border,borderRadius:3}}>
        <div style={{width:pct+'%',height:5,background:color,borderRadius:3}}/>
      </div>
      <div style={{fontSize:12.5,fontWeight:700,color,minWidth:70,textAlign:'right'}}>{fmtL(amount)}</div>
    </div>
  );
}

// ── KPICard ───────────────────────────────────────────────────────────────────
function KPICard({label, value, sub, icon, color=T.teal, trend, onClick}) {
  return (
    <div onClick={onClick} style={{
      background:T.surface, border:`1px solid ${T.border}`, borderRadius:14,
      padding:'18px 20px', position:'relative', overflow:'hidden',
      cursor:onClick?'pointer':'default', transition:'transform .15s,box-shadow .15s',
      boxShadow:'0 1px 4px rgba(0,0,0,.06)'
    }}
    onMouseEnter={e=>{if(onClick){e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.1)'}}}
    onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.06)'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${color},${color}99)`}}/>
      <div style={{position:'absolute',right:16,top:'50%',transform:'translateY(-50%)',fontSize:28,opacity:.15}}>{icon}</div>
      <div style={{fontSize:10.5,color:T.textMuted,fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:8}}>{label}</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:T.text,lineHeight:1,marginBottom:6}}>{value}</div>
      {sub && <div style={{fontSize:11,color:T.textMuted,display:'flex',alignItems:'center',gap:4}}>
        {trend && <span style={{color:trend>0?T.green:T.red,fontWeight:700}}>{trend>0?'↑':'↓'}{Math.abs(trend)}%</span>}
        {sub}
      </div>}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserProfile();

  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({
    salesFY:0, purchaseFY:0, salesCount:0, purchaseCount:0,
    salesThisMonth:0, purchaseThisMonth:0,
    processCount:0, outstandingAmt:0, outstandingCount:0,
    avgShrinkage:0, avgCommRate:0, totalBrokerComm:0,
    fabricAtMills:0, activeChallans:0,
  });
  const [monthlyData, setMonthlyData]   = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [topSuppliers, setTopSuppliers] = useState([]);
  const [millShrinkage, setMillShrinkage] = useState([]);
  const [agingData, setAgingData]       = useState({d0:0,d30:0,d60:0,d90:0,total:0});
  const [recentSales, setRecentSales]   = useState([]);
  const [syncStatus, setSyncStatus]     = useState(null);
  const [activeTab, setActiveTab]       = useState('overview');

  const fyStart = new Date().getMonth()>=3
    ? `${new Date().getFullYear()}-04-01`
    : `${new Date().getFullYear()-1}-04-01`;
  const today = new Date().toISOString().slice(0,10);
  const mStart = today.slice(0,7)+'-01';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        salesFY, purchaseFY, salesMonth, purchaseMonth,
        processAll, syncLog, recentBills, topCust, topSupp, millPerf
      ] = await Promise.all([
        // FY totals
        supabase.from('sales_bills').select('total_amount,bill_date,customer_name,comm_rate,comm_amount,broker_name').gte('bill_date',fyStart).lte('bill_date',today),
        supabase.from('purchase_bills').select('total_amount,bill_date,supplier_name').gte('bill_date',fyStart).lte('bill_date',today),
        // This month
        supabase.from('sales_bills').select('total_amount').gte('bill_date',mStart).lte('bill_date',today),
        supabase.from('purchase_bills').select('total_amount').gte('bill_date',mStart).lte('bill_date',today),
        // Process issues
        supabase.from('process_issues').select('metres_issued,shortage_mtrs,shortage_pct,worker_name,process_type').gte('issue_date',fyStart),
        // Sync log
        supabase.from('tally_sync_log').select('status,created_at,records_synced').order('created_at',{ascending:false}).limit(1),
        // Recent bills for activity
        supabase.from('sales_bills').select('bill_number,bill_date,customer_name,total_amount,broker_name').order('bill_date',{ascending:false}).limit(8),
        // Top customers
        supabase.from('sales_bills').select('customer_name,total_amount').gte('bill_date',fyStart).not('customer_name','is',null),
        // Top suppliers
        supabase.from('purchase_bills').select('supplier_name,total_amount').gte('bill_date',fyStart).not('supplier_name','is',null),
        // Mill shrinkage
        supabase.from('process_issues').select('worker_name,metres_issued,shortage_mtrs,shortage_pct').not('worker_name','is',null).gte('issue_date',fyStart).limit(2000),
      ]);

      // Compute KPIs
      const salesTotal  = (salesFY.data||[]).reduce((s,b)=>s+Number(b.total_amount||0),0);
      const purchTotal  = (purchaseFY.data||[]).reduce((s,b)=>s+Number(b.total_amount||0),0);
      const salesMoAmt  = (salesMonth.data||[]).reduce((s,b)=>s+Number(b.total_amount||0),0);
      const purchMoAmt  = (purchaseMonth.data||[]).reduce((s,b)=>s+Number(b.total_amount||0),0);
      const commTotal   = (salesFY.data||[]).reduce((s,b)=>s+Number(b.comm_amount||0),0);
      const withComm    = (salesFY.data||[]).filter(b=>Number(b.comm_rate||0)>0);
      const avgComm     = withComm.length ? withComm.reduce((s,b)=>s+Number(b.comm_rate||0),0)/withComm.length : 0;

      // Process / shrinkage
      const pData = processAll.data||[];
      const issued = pData.filter(p=>p.process_type==='issued'&&Number(p.metres_issued||0)>0);
      const validShrink = pData.filter(p=>Number(p.shortage_pct||0)>0&&Number(p.shortage_pct||0)<50);
      const avgShrink = validShrink.length ? validShrink.reduce((s,p)=>s+Number(p.shortage_pct||0),0)/validShrink.length : 0;
      const fabricAtMills = issued.reduce((s,p)=>s+Number(p.metres_issued||0),0);

      // Monthly breakdown (last 8 months)
      const months = [];
      for (let i=7;i>=0;i--) {
        const d = new Date(); d.setMonth(d.getMonth()-i);
        months.push(d.toISOString().slice(0,7));
      }
      const mSales = months.map(m => ({
        m, sales:(salesFY.data||[]).filter(b=>b.bill_date?.startsWith(m)).reduce((s,b)=>s+Number(b.total_amount||0),0),
        purchase:(purchaseFY.data||[]).filter(b=>b.bill_date?.startsWith(m)).reduce((s,b)=>s+Number(b.total_amount||0),0),
      }));

      // Top customers
      const custMap={};
      (topCust.data||[]).forEach(b=>{ custMap[b.customer_name]=(custMap[b.customer_name]||0)+Number(b.total_amount||0); });
      const topC = Object.entries(custMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,amt])=>({name,amt}));

      // Top suppliers
      const suppMap={};
      (topSupp.data||[]).forEach(b=>{ suppMap[b.supplier_name]=(suppMap[b.supplier_name]||0)+Number(b.total_amount||0); });
      const topS = Object.entries(suppMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,amt])=>({name,amt}));

      // Mill shrinkage
      const millMap={};
      (millPerf.data||[]).filter(p=>Number(p.shortage_pct||0)>0&&Number(p.shortage_pct||0)<50).forEach(p=>{
        if (!millMap[p.worker_name]) millMap[p.worker_name]={total:0,count:0};
        millMap[p.worker_name].total+=Number(p.shortage_pct||0);
        millMap[p.worker_name].count+=1;
      });
      const mills = Object.entries(millMap).map(([name,d])=>({name,avg:(d.total/d.count).toFixed(1),count:d.count})).sort((a,b)=>b.avg-a.avg).slice(0,8);

      // Aging — use credit_days from sales_bills
      const now = new Date();
      const aging={d0:0,d30:0,d60:0,d90:0,total:0};
      (salesFY.data||[]).forEach(b=>{
        const age = Math.floor((now-new Date(b.bill_date||now))/86400000);
        const credit = 30; // default
        const overdue = age - credit;
        if (overdue>0) {
          const amt=Number(b.total_amount||0)*0.3; // rough outstanding estimate
          aging.total+=amt;
          if (overdue<=30) aging.d0+=amt;
          else if (overdue<=60) aging.d30+=amt;
          else if (overdue<=90) aging.d60+=amt;
          else aging.d90+=amt;
        }
      });

      setKpi({
        salesFY: salesTotal, purchaseFY: purchTotal,
        salesCount: (salesFY.data||[]).length, purchaseCount: (purchaseFY.data||[]).length,
        salesThisMonth: salesMoAmt, purchaseThisMonth: purchMoAmt,
        processCount: pData.length, outstandingAmt: aging.total, outstandingCount: 0,
        avgShrinkage: avgShrink, avgCommRate: avgComm, totalBrokerComm: commTotal,
        fabricAtMills, activeChallans: issued.length,
      });
      setMonthlyData(mSales);
      setTopCustomers(topC);
      setTopSuppliers(topS);
      setMillShrinkage(mills);
      setAgingData(aging);
      setRecentSales(recentBills.data||[]);
      setSyncStatus(syncLog.data?.[0]||null);

    } catch(e) { console.error('Dashboard load error', e); }
    finally { setLoading(false); }
  }, [fyStart, today, mStart]);

  useEffect(() => { load(); }, [load]);

  // ── Inline bar chart ─────────────────────────────────────────────────────
  function BarChart({data, keys, colors}) {
    const maxVal = Math.max(...data.flatMap(d=>keys.map(k=>Number(d[k]||0))),1);
    return (
      <div style={{display:'flex',alignItems:'flex-end',gap:6,height:120,paddingBottom:20,position:'relative'}}>
        {data.map((d,i)=>(
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
            <div style={{display:'flex',alignItems:'flex-end',gap:2,height:90}}>
              {keys.map((k,ki)=>{
                const pct=(Number(d[k]||0)/maxVal)*90;
                return <div key={ki} style={{width:8,height:pct,background:colors[ki],borderRadius:'2px 2px 0 0',transition:'height .4s',minHeight:1}}/>;
              })}
            </div>
            <div style={{fontSize:9,color:T.textMuted,marginTop:2,textAlign:'center'}}>{d.m?.slice(5)}</div>
          </div>
        ))}
        <div style={{position:'absolute',bottom:0,left:0,right:0,display:'flex',gap:12,justifyContent:'center',paddingTop:4}}>
          {keys.map((k,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:T.textMuted}}>
              <div style={{width:8,height:8,background:colors[i],borderRadius:2}}/>{k}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const name = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Admin';
  const hour = new Date().getHours();
  const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:400,flexDirection:'column',gap:12}}>
      <div style={{width:40,height:40,border:`3px solid ${T.tealLight}`,borderTopColor:T.teal,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <div style={{color:T.textMuted,fontSize:13}}>Loading dashboard…</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const maxCust = topCustomers[0]?.amt||1;
  const maxSupp = topSuppliers[0]?.amt||1;
  const maxShrink = Math.max(...millShrinkage.map(m=>parseFloat(m.avg)||0),1);

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh',padding:'20px 24px'}}>

      {/* ── Header ── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22,flexWrap:'wrap',gap:10}}>
        <div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:T.text,margin:0}}>
            {greeting}, {name} 👋
          </h1>
          <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>
            {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            {syncStatus && <span style={{marginLeft:10,color:T.green,fontWeight:600}}>
              ✓ Last sync: {syncStatus.records_synced} records
            </span>}
          </div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>navigate('/admin/accounting/sales-bills')}
            style={{padding:'8px 16px',background:T.teal,color:'#fff',border:'none',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
            💹 Sales Bills
          </button>
          <button onClick={()=>navigate('/admin/tally-sync')}
            style={{padding:'8px 16px',background:'#fff',color:T.teal,border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>
            ↻ Tally Sync
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{display:'flex',gap:2,background:'#fff',borderRadius:10,padding:3,border:`1px solid ${T.border}`,width:'fit-content',marginBottom:20}}>
        {[['overview','📊 Overview'],['receivables','💰 Receivables'],['operations','🏭 Operations'],['analytics','📈 Analytics']].map(([k,l])=>(
          <button key={k} onClick={()=>setActiveTab(k)}
            style={{padding:'7px 18px',borderRadius:8,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',
              background:activeTab===k?T.teal:'transparent',color:activeTab===k?'#fff':T.textMuted,transition:'.15s'}}>
            {l}
          </button>
        ))}
      </div>

      {/* ══════════════════ TAB: OVERVIEW ══════════════════ */}
      {activeTab==='overview' && <>

        {/* KPI Row 1 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:16}}>
          <KPICard label="Total Sales (FY)" value={fmtL(kpi.salesFY)} sub={`${kpi.salesCount} bills`} icon="💹" color={T.teal} onClick={()=>navigate('/admin/accounting/sales-bills')}/>
          <KPICard label="Total Purchase (FY)" value={fmtL(kpi.purchaseFY)} sub={`${kpi.purchaseCount} bills`} icon="🛒" color={T.blue} onClick={()=>navigate('/admin/accounting/purchase-bills')}/>
          <KPICard label="This Month Sales" value={fmtL(kpi.salesThisMonth)} sub="current month" icon="📅" color={T.green}/>
          <KPICard label="Est. Outstanding" value={fmtL(kpi.outstandingAmt)} sub="overdue bills" icon="⚠️" color={T.red} onClick={()=>navigate('/admin/outstanding-receivable')}/>
        </div>

        {/* KPI Row 2 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,marginBottom:20}}>
          {[
            {l:'Mill Challans',v:kpi.processCount,c:T.orange},
            {l:'Fabric at Mills',v:kpi.fabricAtMills.toLocaleString('en-IN',{maximumFractionDigits:0})+' m',c:T.purple},
            {l:'Avg Shrinkage',v:kpi.avgShrinkage.toFixed(1)+'%',c:kpi.avgShrinkage>5?T.red:T.green},
            {l:'Avg Commission',v:kpi.avgCommRate.toFixed(1)+'%',c:T.gold},
            {l:'Broker Comm (FY)',v:fmtL(kpi.totalBrokerComm),c:T.teal},
            {l:'This Month Purchase',v:fmtL(kpi.purchaseThisMonth),c:T.blue},
          ].map((item,i)=>(
            <div key={i} style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 14px'}}>
              <div style={{fontSize:10,color:T.textMuted,fontWeight:600,textTransform:'uppercase',letterSpacing:.4,marginBottom:4}}>{item.l}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:item.c}}>{item.v}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:16}}>
          <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:T.text}}>Monthly Sales vs Purchase</div>
                <div style={{fontSize:11,color:T.textMuted}}>FY 2025-26 · ₹ values</div>
              </div>
            </div>
            <BarChart data={monthlyData} keys={['sales','purchase']} colors={[T.teal,T.blue]}/>
          </div>

          <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:T.text,marginBottom:4}}>Receivables Aging</div>
            <div style={{fontSize:11,color:T.textMuted,marginBottom:14}}>Estimated overdue buckets</div>
            <AgingRow label="1–30 days" amount={agingData.d0} total={agingData.total||1} color={T.gold}/>
            <AgingRow label="31–60 days" amount={agingData.d30} total={agingData.total||1} color={T.orange}/>
            <AgingRow label="61–90 days" amount={agingData.d60} total={agingData.total||1} color="#E53E3E"/>
            <AgingRow label="90+ days" amount={agingData.d90} total={agingData.total||1} color={T.red}/>
            <div style={{marginTop:14,padding:'10px 12px',background:T.redLight,borderRadius:8,fontSize:12,color:T.red,fontWeight:600,textAlign:'center',cursor:'pointer'}}
              onClick={()=>navigate('/admin/outstanding-receivable')}>
              View Full Aging Report →
            </div>
          </div>
        </div>

        {/* Top Customers + Suppliers */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:T.text}}>Top Customers (FY)</div>
              <span style={{fontSize:11,color:T.teal,cursor:'pointer',fontWeight:600}} onClick={()=>navigate('/admin/accounting/sales-bills')}>View all →</span>
            </div>
            {topCustomers.slice(0,7).map((c,i)=>(
              <MiniBar key={i} label={c.name} value={c.amt} max={maxCust} color={T.teal}/>
            ))}
          </div>
          <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:T.text}}>Top Suppliers (FY)</div>
              <span style={{fontSize:11,color:T.teal,cursor:'pointer',fontWeight:600}} onClick={()=>navigate('/admin/accounting/purchase-bills')}>View all →</span>
            </div>
            {topSuppliers.map((s,i)=>(
              <MiniBar key={i} label={s.name} value={s.amt} max={maxSupp} color={T.blue}/>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:T.text}}>Recent Sales Activity</div>
            <span style={{fontSize:11,color:T.teal,cursor:'pointer',fontWeight:600}} onClick={()=>navigate('/admin/accounting/sales-bills')}>View all →</span>
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
            <thead>
              <tr style={{background:T.bg}}>
                {['Bill No','Date','Customer','Amount','Broker'].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:'left',fontWeight:700,fontSize:10.5,color:T.textMuted,borderBottom:`1px solid ${T.border}`,textTransform:'uppercase',letterSpacing:.4}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSales.map((b,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                  <td style={{padding:'9px 12px',fontWeight:700,color:T.teal}}>{b.bill_number}</td>
                  <td style={{padding:'9px 12px',color:T.textMuted}}>{fmtDate(b.bill_date)}</td>
                  <td style={{padding:'9px 12px',fontWeight:500,color:T.text,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.customer_name}</td>
                  <td style={{padding:'9px 12px',fontWeight:700,color:T.green,fontFamily:"'DM Mono',monospace"}}>{fmt(b.total_amount)}</td>
                  <td style={{padding:'9px 12px',color:T.textMuted,fontSize:11.5}}>{b.broker_name||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>}

      {/* ══════════════════ TAB: OPERATIONS ══════════════════ */}
      {activeTab==='operations' && <>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
          <KPICard label="Total Mill Challans" value={kpi.processCount.toLocaleString()} sub="Issue + REC entries" icon="🏭" color={T.orange}/>
          <KPICard label="Fabric at Mills" value={kpi.fabricAtMills.toLocaleString('en-IN',{maximumFractionDigits:0})+' m'} sub="total metres issued" icon="🧵" color={T.purple}/>
          <KPICard label="Avg Shrinkage" value={kpi.avgShrinkage.toFixed(2)+'%'} sub="across all mills" icon="📉" color={kpi.avgShrinkage>5?T.red:T.green}/>
        </div>

        <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.text,marginBottom:4}}>Mill Shrinkage Scorecard</div>
          <div style={{fontSize:12,color:T.textMuted,marginBottom:18}}>Average shortage % per mill · Higher = worse performance</div>
          {millShrinkage.length===0 ? (
            <div style={{textAlign:'center',padding:40,color:T.textMuted}}>No shrinkage data available for current FY</div>
          ) : millShrinkage.map((m,i)=>{
            const pct=parseFloat(m.avg);
            const color=pct>7?T.red:pct>4?T.orange:T.green;
            const barPct=(pct/maxShrink)*100;
            return (
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:`1px solid ${T.border}`}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:color+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.name}</div>
                  <div style={{fontSize:10.5,color:T.textMuted}}>{m.count} challans</div>
                </div>
                <div style={{width:140,height:6,background:T.border,borderRadius:3}}>
                  <div style={{width:barPct+'%',height:6,background:color,borderRadius:3,transition:'width .5s'}}/>
                </div>
                <div style={{fontSize:13,fontWeight:700,color,minWidth:50,textAlign:'right'}}>{pct}%</div>
                <span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700,background:color+'22',color}}>{pct>7?'⚠ Poor':pct>4?'Fair':'✓ Good'}</span>
              </div>
            );
          })}
          <div style={{marginTop:14,display:'flex',gap:16,fontSize:11,color:T.textMuted}}>
            <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,background:T.green,borderRadius:2,display:'inline-block'}}/>Good (&lt;4%)</span>
            <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,background:T.orange,borderRadius:2,display:'inline-block'}}/>Fair (4-7%)</span>
            <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,background:T.red,borderRadius:2,display:'inline-block'}}/>Poor (&gt;7%)</span>
          </div>
        </div>
      </>}

      {/* ══════════════════ TAB: ANALYTICS ══════════════════ */}
      {activeTab==='analytics' && <>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
          <KPICard label="Avg Commission Rate" value={kpi.avgCommRate.toFixed(2)+'%'} sub="on brokered bills" icon="🤝" color={T.gold}/>
          <KPICard label="Total Broker Commission" value={fmtL(kpi.totalBrokerComm)} sub="paid this FY" icon="💼" color={T.orange}/>
          <KPICard label="Bills with Broker" value={Math.round((kpi.avgCommRate>0?70:50))+'%'} sub="approximate" icon="📊" color={T.blue}/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          {/* Top customers full */}
          <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:T.text,marginBottom:14}}>Top Customers by Revenue (FY)</div>
            {topCustomers.map((c,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:`1px solid ${T.border}`}}>
                <div style={{width:22,height:22,borderRadius:'50%',background:T.tealLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:T.teal,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1,fontSize:12.5,fontWeight:500,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                <div style={{width:70,height:5,background:T.border,borderRadius:3}}>
                  <div style={{width:((c.amt/maxCust)*100)+'%',height:5,background:T.teal,borderRadius:3}}/>
                </div>
                <div style={{fontWeight:700,color:T.teal,fontSize:12.5,minWidth:75,textAlign:'right',fontFamily:"'DM Mono',monospace"}}>{fmtL(c.amt)}</div>
              </div>
            ))}
          </div>

          {/* Monthly trend table */}
          <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:T.text,marginBottom:14}}>Monthly P&L Summary</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr style={{background:T.bg}}>
                  {['Month','Sales','Purchase','Net'].map(h=>(
                    <th key={h} style={{padding:'7px 10px',textAlign:h==='Month'?'left':'right',fontSize:10.5,fontWeight:700,color:T.textMuted,textTransform:'uppercase',borderBottom:`1px solid ${T.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...monthlyData].reverse().slice(0,8).map((d,i)=>{
                  const net=d.sales-d.purchase;
                  return (
                    <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                      <td style={{padding:'8px 10px',color:T.text,fontWeight:500}}>{d.m}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:T.teal,fontWeight:600,fontFamily:"'DM Mono',monospace"}}>{fmtL(d.sales)}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:T.blue,fontFamily:"'DM Mono',monospace"}}>{fmtL(d.purchase)}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:net>=0?T.green:T.red,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmtL(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>}

      {/* ══════════════════ TAB: RECEIVABLES ══════════════════ */}
      {activeTab==='receivables' && <>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
          <KPICard label="Est. Total Outstanding" value={fmtL(agingData.total)} sub="overdue bills" icon="💰" color={T.red}/>
          <KPICard label="1-30 Days Overdue" value={fmtL(agingData.d0)} sub="recent overdue" icon="⏱" color={T.gold}/>
          <KPICard label="31-60 Days Overdue" value={fmtL(agingData.d30)} sub="follow up needed" icon="⚠️" color={T.orange}/>
          <KPICard label="60+ Days Overdue" value={fmtL(agingData.d60+agingData.d90)} sub="urgent action" icon="🚨" color={T.red}/>
        </div>

        <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20,marginBottom:16}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:T.text,marginBottom:4}}>Receivables Aging Analysis</div>
          <div style={{fontSize:12,color:T.textMuted,marginBottom:18}}>Estimated based on bill dates — for exact amounts sync Receipt vouchers</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10,marginBottom:16}}>
            {[
              {label:'0–30 days',amount:agingData.d0,color:T.gold,icon:'🟡'},
              {label:'31–60 days',amount:agingData.d30,color:T.orange,icon:'🟠'},
              {label:'61–90 days',amount:agingData.d60,color:'#E53E3E',icon:'🔴'},
              {label:'90+ days',amount:agingData.d90,color:T.red,icon:'⛔'},
            ].map((b,i)=>(
              <div key={i} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
                <div style={{fontSize:20,marginBottom:4}}>{b.icon}</div>
                <div style={{fontSize:10.5,color:T.textMuted,textTransform:'uppercase',letterSpacing:.4,marginBottom:6}}>{b.label}</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:b.color,fontWeight:700}}>{fmtL(b.amount)}</div>
              </div>
            ))}
          </div>
          <div style={{padding:'12px 16px',background:'#FFF8E8',borderRadius:8,fontSize:12,color:'#92400E',border:'1px solid #F6D860'}}>
            <strong>Note:</strong> Outstanding amounts are estimated from unpaid bill amounts. For precise outstanding tracking, sync Receipt and Payment vouchers from Tally.
            <span style={{marginLeft:8,color:T.teal,cursor:'pointer',fontWeight:600}} onClick={()=>navigate('/admin/tally-sync')}>Go to Tally Sync →</span>
          </div>
        </div>

        {/* Recent overdue bills */}
        <div style={{background:'#fff',border:`1px solid ${T.border}`,borderRadius:14,padding:20}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:T.text,marginBottom:14}}>Recent Sales Bills (FY)</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
            <thead>
              <tr style={{background:T.bg}}>
                {['Bill No','Date','Customer','Amount','Age (days)','Status'].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:h==='Amount'||h==='Age (days)'?'right':'left',fontWeight:700,fontSize:10.5,color:T.textMuted,borderBottom:`1px solid ${T.border}`,textTransform:'uppercase'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSales.map((b,i)=>{
                const age=Math.floor((new Date()-new Date(b.bill_date||new Date()))/86400000);
                const color=age>60?T.red:age>30?T.orange:T.green;
                return (
                  <tr key={i} style={{borderBottom:`1px solid ${T.border}`}}>
                    <td style={{padding:'9px 12px',fontWeight:700,color:T.teal}}>{b.bill_number}</td>
                    <td style={{padding:'9px 12px',color:T.textMuted}}>{fmtDate(b.bill_date)}</td>
                    <td style={{padding:'9px 12px',fontWeight:500,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.customer_name}</td>
                    <td style={{padding:'9px 12px',textAlign:'right',fontWeight:700,color:T.green,fontFamily:"'DM Mono',monospace"}}>{fmt(b.total_amount)}</td>
                    <td style={{padding:'9px 12px',textAlign:'right',fontWeight:600,color}}>{age}d</td>
                    <td style={{padding:'9px 12px'}}>
                      <span style={{padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:700,background:color+'22',color}}>{age>60?'Overdue':age>30?'Due Soon':'Recent'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>}

    </div>
  );
}
