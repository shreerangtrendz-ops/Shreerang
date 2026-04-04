import { useState, useEffect, useCallback, useMemo } from 'react';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

/* ══════════════════════════════════════════════════════════════
   SMART OUTSTANDING — Area · City · State · Broker Analytics
   AI-powered payment collection with WhatsApp reminders
   ══════════════════════════════════════════════════════════════ */

const T = {
  navy:'#0B2E2B', teal:'#2BA898', tealLight:'#EEF8F6',
  green:'#1E9E5A', red:'#E74C3C', orange:'#E67E22',
  gold:'#E8A800', blue:'#2468C8', purple:'#9B59B6',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', muted:'#6A9B95',
};
const fmt  = n => '₹' + Math.round(Number(n||0)).toLocaleString('en-IN');
const fmtL = n => { const v=Number(n||0); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:fmt(v); };
const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';

const AGING = [
  {key:'not due',     label:'Not Due',    color:T.green,  bg:'#D1FAE5'},
  {key:'1-30 overdue',label:'1–30 Days',  color:T.gold,   bg:'#FEF3C7'},
  {key:'31-60 days',  label:'31–60 Days', color:T.orange, bg:'#FED7AA'},
  {key:'61-90 days',  label:'61–90 Days', color:'#EF4444',bg:'#FEE2E2'},
  {key:'90+ days',    label:'90+ Days',   color:'#991B1B',bg:'#FEE2E2'},
];

function AgingBar({ buckets, total }) {
  if (!total) return null;
  return (
    <div style={{display:'flex',height:6,borderRadius:4,overflow:'hidden',width:'100%'}}>
      {AGING.map(a => {
        const w = total > 0 ? (buckets[a.key]||0)/total*100 : 0;
        return w > 0 ? <div key={a.key} style={{width:w+'%',background:a.color,transition:'width .3s'}} title={`${a.label}: ${fmtL(buckets[a.key])}`} /> : null;
      })}
    </div>
  );
}

// AI Collection Strategy Generator
function getCollectionStrategy(record) {
  const overdue = record.maxOverdue || 0;
  const amt = record.outstanding;
  const bills = record.bills || 1;
  const broker = record.broker;

  if (overdue > 90) return {
    priority: 'CRITICAL', color: '#991B1B', bg: '#FEE2E2',
    action: 'Legal Notice',
    message: `Dear ${record.name}, your outstanding of ${fmtL(amt)} (${bills} bill${bills>1?'s':''}) is severely overdue (${overdue} days). Legal action will be initiated within 7 days if not settled. Please contact immediately.`,
    tip: `Send legal notice via registered post. Escalate to management. Consider involving ${broker||'agent'} for pressure.`
  };
  if (overdue > 60) return {
    priority: 'URGENT', color: T.red, bg: '#FEE2E2',
    action: 'Senior Follow-up',
    message: `Dear ${record.name}, ${fmtL(amt)} outstanding for ${overdue}+ days. Please arrange immediate payment to avoid supply hold. Contact: Shreerang Trendz +91 7874200033`,
    tip: `Call directly. Mention supply hold. Use ${broker||'agent'} leverage — broker commission held till payment.`
  };
  if (overdue > 30) return {
    priority: 'HIGH', color: T.orange, bg: '#FED7AA',
    action: 'Firm Reminder',
    message: `Dear ${record.name}, payment of ${fmtL(amt)} is overdue. Kindly arrange within 3 days. Fresh orders will be processed after clearance. — Shreerang Trendz`,
    tip: `WhatsApp + call. Offer PDC if needed. Check if broker ${broker||''} has collected and not deposited.`
  };
  if (overdue > 0) return {
    priority: 'MEDIUM', color: T.gold, bg: '#FEF3C7',
    action: 'Polite Reminder',
    message: `Dear ${record.name}, gentle reminder for payment of ${fmtL(amt)}. Bill date and credit period have elapsed. Kindly arrange at your earliest convenience. — Shreerang Trendz`,
    tip: `Soft WhatsApp reminder. Good customer? Offer 7-day extension. New design launch is a good reason to visit.`
  };
  return {
    priority: 'LOW', color: T.green, bg: '#D1FAE5',
    action: 'Monitor',
    message: `Dear ${record.name}, this is a courtesy reminder for ${fmtL(amt)} due on ${fmtD(record.dueDate)}. Kindly arrange payment by due date. — Shreerang Trendz`,
    tip: `Within credit period. No action needed yet. Flag for follow-up 7 days before due date.`
  };
}

const VIEW_MODES = ['city','state','broker','customer'];

export default function SmartOutstandingPage() {
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [viewMode, setViewMode]     = useState('city');
  const [agingFilter, setAgingFilter] = useState('');
  const [search, setSearch]         = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [expandedKey, setExpandedKey] = useState(null);
  const [sent, setSent]             = useState(new Set());
  const [showStrategy, setShowStrategy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('outstanding_receivable_v2')
      .select('bill_number,bill_date,customer_name,customer_state,place_of_supply,destination_city,outstanding_amount,billed_amount,credit_days,credit_days_int,due_date,days_overdue,aging_bucket,broker_name,comm_rate,gross_comm_rate,comm_amount,tds_amount,quantity_mtrs,fabric_name,design_no')
      .order('outstanding_amount', { ascending: false })
      .limit(5000);
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Apply filters
  const filtered = useMemo(() => rows.filter(r => {
    if (agingFilter && r.aging_bucket !== agingFilter) return false;
    if (stateFilter && r.customer_state !== stateFilter) return false;
    if (brokerFilter && r.broker_name !== brokerFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return r.customer_name?.toLowerCase().includes(s)
        || r.destination_city?.toLowerCase().includes(s)
        || r.broker_name?.toLowerCase().includes(s)
        || r.bill_number?.toLowerCase().includes(s);
    }
    return true;
  }), [rows, agingFilter, stateFilter, brokerFilter, search]);

  // Aggregate by current viewMode
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const key = viewMode === 'city'     ? (r.destination_city || r.customer_state || 'Unknown')
                : viewMode === 'state'    ? (r.customer_state || 'Unknown')
                : viewMode === 'broker'   ? (r.broker_name || 'No Broker / Direct')
                : r.customer_name;
      if (!map[key]) map[key] = {
        name: key, outstanding: 0, billed: 0, bills: 0, customers: new Set(),
        brokers: new Set(), cities: new Set(), states: new Set(),
        maxOverdue: 0, billList: [],
        buckets: {'not due':0,'1-30 overdue':0,'31-60 days':0,'61-90 days':0,'90+ days':0}
      };
      const g = map[key];
      g.outstanding += Number(r.outstanding_amount || 0);
      g.billed      += Number(r.billed_amount || 0);
      g.bills++;
      g.customers.add(r.customer_name);
      if (r.broker_name) g.brokers.add(r.broker_name);
      if (r.destination_city) g.cities.add(r.destination_city);
      if (r.customer_state) g.states.add(r.customer_state);
      g.maxOverdue = Math.max(g.maxOverdue, Number(r.days_overdue || 0));
      g.buckets[r.aging_bucket] = (g.buckets[r.aging_bucket]||0) + Number(r.outstanding_amount||0);
      g.billList.push(r);
    });
    // Attach collection strategy to each group
    return Object.values(map)
      .map(g => ({
        ...g, broker: [...g.brokers].join(', '),
        dueDate: g.billList[0]?.due_date,
        strategy: getCollectionStrategy(g)
      }))
      .sort((a,b) => b.outstanding - a.outstanding);
  }, [filtered, viewMode]);

  // Summary KPIs
  const totalOutstanding = filtered.reduce((s,r) => s+Number(r.outstanding_amount||0), 0);
  const totalBills       = filtered.length;
  const urgentAmt        = filtered.filter(r => ['61-90 days','90+ days'].includes(r.aging_bucket)).reduce((s,r)=>s+Number(r.outstanding_amount||0),0);
  const brokerComm       = filtered.reduce((s,r)=>s+Number(r.comm_amount||0),0);
  const tdsTotal         = filtered.reduce((s,r)=>s+Number(r.tds_amount||0),0);

  // Filter options
  const states  = [...new Set(rows.map(r=>r.customer_state).filter(Boolean))].sort();
  const brokers = [...new Set(rows.map(r=>r.broker_name).filter(Boolean))].sort();

  const sendWA = (group) => {
    const strategy = group.strategy;
    window.open(`https://wa.me/?text=${encodeURIComponent(strategy.message)}`, '_blank');
    setSent(prev => new Set([...prev, group.name]));
  };

  const totalAgingBuckets = filtered.reduce((acc, r) => {
    acc[r.aging_bucket] = (acc[r.aging_bucket]||0) + Number(r.outstanding_amount||0);
    return acc;
  }, {});

  return (
    <div style={{minHeight:'100vh',background:T.bg,padding:'20px 24px',fontFamily:"'DM Sans',sans-serif"}}>

      {/* Header */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:800,color:T.navy,margin:0}}>📍 Smart Outstanding</h1>
        <p style={{fontSize:12,color:T.muted,margin:'4px 0 0'}}>
          Area · City · State · Broker analysis · AI collection strategy · WhatsApp reminders
        </p>
      </div>

      {/* KPI Strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:14}}>
        {[
          {l:'Total Outstanding',v:fmtL(totalOutstanding),c:T.navy,ic:'💰',sub:`${totalBills} bills`},
          {l:'Urgent (60+ days)',v:fmtL(urgentAmt),c:T.red,ic:'🚨',sub:'needs action now'},
          {l:'Broker Commission',v:fmtL(brokerComm),c:T.orange,ic:'🤝',sub:'net (after TDS)'},
          {l:'TDS on Commission',v:fmtL(tdsTotal),c:T.purple,ic:'🧾',sub:'5% deducted'},
          {l:'Customers',v:String(new Set(filtered.map(r=>r.customer_name)).size),c:T.teal,ic:'👥',sub:'with outstanding'},
        ].map(k=>(
          <div key={k.l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 16px',borderTop:`3px solid ${k.c}`}}>
            <div style={{fontSize:18}}>{k.ic}</div>
            <div style={{fontSize:18,fontWeight:800,color:T.navy}}>{k.v}</div>
            <div style={{fontSize:11,fontWeight:600,color:T.text}}>{k.l}</div>
            <div style={{fontSize:10,color:T.muted}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Aging Summary Bar */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 16px',marginBottom:12}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8,alignItems:'center'}}>
          <span style={{fontSize:11,fontWeight:700,color:T.navy,marginRight:4}}>Aging:</span>
          {AGING.map(a => (
            <button key={a.key} onClick={()=>setAgingFilter(agingFilter===a.key?'':a.key)}
              style={{padding:'3px 10px',borderRadius:10,border:`1px solid ${a.color}40`,
                background:agingFilter===a.key?a.color:a.bg,
                color:agingFilter===a.key?'#fff':a.color,
                fontSize:10,fontWeight:600,cursor:'pointer'}}>
              {a.label} {totalAgingBuckets[a.key]?fmtL(totalAgingBuckets[a.key]):''}
            </button>
          ))}
        </div>
        <AgingBar buckets={totalAgingBuckets} total={totalOutstanding} />
      </div>

      {/* Filters Row */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'10px 14px',marginBottom:12,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        {/* View Mode */}
        <div style={{display:'flex',gap:2,background:T.bg,borderRadius:8,padding:3,border:`1px solid ${T.border}`}}>
          {VIEW_MODES.map(m=>(
            <button key={m} onClick={()=>setViewMode(m)}
              style={{padding:'4px 12px',borderRadius:6,border:'none',fontSize:11,fontWeight:600,cursor:'pointer',
                background:viewMode===m?T.teal:'transparent',
                color:viewMode===m?'#fff':T.muted,textTransform:'capitalize'}}>
              {m==='city'?'🏙 City':m==='state'?'🗺 State':m==='broker'?'🤝 Broker':'👤 Customer'}
            </button>
          ))}
        </div>
        <select value={stateFilter} onChange={e=>setStateFilter(e.target.value)}
          style={{padding:'6px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,background:T.surface}}>
          <option value="">All States</option>
          {states.map(s=><option key={s}>{s}</option>)}
        </select>
        <select value={brokerFilter} onChange={e=>setBrokerFilter(e.target.value)}
          style={{padding:'6px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,background:T.surface}}>
          <option value="">All Brokers</option>
          {brokers.map(b=><option key={b}>{b}</option>)}
        </select>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search city, customer, broker, bill…"
          style={{flex:'1 1 160px',minWidth:0,padding:'6px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12}} />
        <button onClick={load} style={{padding:'6px 12px',background:T.teal,border:'none',borderRadius:7,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>{loading?'…':'⟳'}</button>
        <span style={{fontSize:10,color:T.muted}}>{grouped.length} {viewMode}s · {filtered.length} bills</span>
      </div>

      {/* Main Cards */}
      {loading ? (
        <div style={{textAlign:'center',padding:60,color:T.muted}}>Loading outstanding data…</div>
      ) : grouped.length === 0 ? (
        <div style={{textAlign:'center',padding:60,background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,color:T.muted}}>
          🎉 No outstanding found for this filter!
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {grouped.map((g, gi) => {
            const strat = g.strategy;
            const isExpanded = expandedKey === g.name;
            const isSent = sent.has(g.name);
            const custList = [...g.customers].slice(0,3);

            return (
              <div key={g.name} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden',borderLeft:`4px solid ${strat.color}`}}>
                {/* Group Header */}
                <div style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                  {/* Priority badge */}
                  <div style={{background:strat.bg,color:strat.color,fontSize:9,fontWeight:800,padding:'3px 8px',borderRadius:6,whiteSpace:'nowrap',letterSpacing:'.5px'}}>
                    {strat.priority}
                  </div>

                  {/* Name + meta */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,color:T.navy,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {viewMode==='city'?'🏙':'viewMode'==='state'?'🗺':viewMode==='broker'?'🤝':'👤'} {g.name}
                    </div>
                    <div style={{fontSize:10,color:T.muted,marginTop:2}}>
                      {viewMode!=='customer' && (
                        <span>{g.customers.size} customer{g.customers.size>1?'s':''} · </span>
                      )}
                      {viewMode==='broker' && g.cities.size>0 && (
                        <span>{[...g.cities].slice(0,3).join(', ')} · </span>
                      )}
                      {viewMode==='city' && g.states.size>0 && (
                        <span>{[...g.states][0]} · </span>
                      )}
                      {g.bills} bill{g.bills>1?'s':''} · Max overdue: {g.maxOverdue}d
                      {g.brokers.size > 0 && viewMode!=='broker' && (
                        <span> · Agent: {[...g.brokers].slice(0,2).join(', ')}</span>
                      )}
                    </div>
                    {/* Aging bar for this group */}
                    <div style={{marginTop:6}}>
                      <AgingBar buckets={g.buckets} total={g.outstanding} />
                    </div>
                  </div>

                  {/* Amount */}
                  <div style={{textAlign:'right',minWidth:100}}>
                    <div style={{fontSize:20,fontWeight:800,color:strat.color}}>{fmtL(g.outstanding)}</div>
                    <div style={{fontSize:9,color:T.muted}}>outstanding</div>
                  </div>

                  {/* Actions */}
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    <button onClick={()=>setShowStrategy(showStrategy===g.name?null:g.name)}
                      style={{padding:'6px 10px',background:T.tealLight,border:`1px solid ${T.border}`,borderRadius:7,fontSize:10,cursor:'pointer',color:T.teal,fontWeight:600}}>
                      🤖 Strategy
                    </button>
                    <button onClick={()=>sendWA(g)}
                      style={{background:isSent?'#22C55E':'#25D366',border:'none',borderRadius:7,padding:'6px 12px',color:'#fff',fontSize:11,cursor:'pointer',fontWeight:700}}>
                      {isSent?'✓ Sent':'💬 WA'}
                    </button>
                    <button onClick={()=>setExpandedKey(isExpanded?null:g.name)}
                      style={{padding:'6px 10px',background:T.bg,border:`1px solid ${T.border}`,borderRadius:7,fontSize:11,cursor:'pointer',color:T.muted}}>
                      {isExpanded?'▲':'▼'}
                    </button>
                  </div>
                </div>

                {/* AI Strategy Panel */}
                {showStrategy === g.name && (
                  <div style={{padding:'12px 16px',background:strat.bg,borderTop:`1px solid ${strat.color}30`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,flexWrap:'wrap'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:800,color:strat.color,marginBottom:6}}>
                          🤖 AI COLLECTION STRATEGY — {strat.action}
                        </div>
                        <div style={{fontSize:11,color:T.text,marginBottom:8,lineHeight:1.5}}>
                          💡 <strong>Tip:</strong> {strat.tip}
                        </div>
                        <div style={{background:T.surface,borderRadius:8,padding:'10px 12px',border:`1px solid ${strat.color}30`}}>
                          <div style={{fontSize:10,color:T.muted,marginBottom:4,fontWeight:700}}>📱 WhatsApp Message:</div>
                          <div style={{fontSize:11,color:T.text,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{strat.message}</div>
                        </div>
                      </div>
                      {/* Quick Stats */}
                      <div style={{display:'flex',flexDirection:'column',gap:6,minWidth:160}}>
                        {AGING.map(a => g.buckets[a.key] > 0 && (
                          <div key={a.key} style={{display:'flex',justifyContent:'space-between',fontSize:10,padding:'3px 8px',background:a.bg,borderRadius:5,color:a.color,fontWeight:600}}>
                            <span>{a.label}</span>
                            <span>{fmtL(g.buckets[a.key])}</span>
                          </div>
                        ))}
                        {viewMode!=='broker' && g.brokers.size>0 && (
                          <div style={{fontSize:10,color:T.muted,padding:'3px 8px',background:T.surface,borderRadius:5,border:`1px solid ${T.border}`}}>
                            Agent: {[...g.brokers].join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bill List (expanded) */}
                {isExpanded && (
                  <div style={{borderTop:`1px solid ${T.border}`,maxHeight:300,overflow:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                      <thead>
                        <tr style={{background:T.bg,position:'sticky',top:0}}>
                          {['Bill No','Date','Customer','City','Outstanding','Age','Broker','Due'].map(h=>(
                            <th key={h} style={{padding:'6px 10px',textAlign:h==='Outstanding'?'right':'left',color:T.muted,fontSize:9,textTransform:'uppercase',letterSpacing:'.4px',fontWeight:700}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {g.billList.sort((a,b)=>Number(b.outstanding_amount)-Number(a.outstanding_amount)).map((r,i)=>{
                          const ag = AGING.find(a=>a.key===r.aging_bucket)||AGING[0];
                          return (
                            <tr key={r.bill_number+i} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?'#fff':'#FAFFFE'}}>
                              <td style={{padding:'5px 10px',fontWeight:700,color:T.blue,whiteSpace:'nowrap'}}>{r.bill_number}</td>
                              <td style={{padding:'5px 10px',color:T.muted,whiteSpace:'nowrap'}}>{fmtD(r.bill_date)}</td>
                              <td style={{padding:'5px 10px',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.customer_name}</td>
                              <td style={{padding:'5px 10px',color:T.muted,whiteSpace:'nowrap'}}>{r.destination_city||r.customer_state||'—'}</td>
                              <td style={{padding:'5px 10px',textAlign:'right',fontWeight:700,color:ag.color}}>{fmt(r.outstanding_amount)}</td>
                              <td style={{padding:'5px 10px',textAlign:'center'}}>
                                <span style={{background:ag.bg,color:ag.color,padding:'2px 6px',borderRadius:8,fontSize:9,fontWeight:700}}>
                                  {r.days_overdue>0?`${r.days_overdue}d`:'on time'}
                                </span>
                              </td>
                              <td style={{padding:'5px 10px',color:T.orange,fontSize:10}}>{r.broker_name||'—'}</td>
                              <td style={{padding:'5px 10px',color:T.muted,whiteSpace:'nowrap'}}>{fmtD(r.due_date)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Commission Note */}
      <div style={{marginTop:16,padding:'10px 14px',background:'#FFF8E8',border:'1px solid #F6D860',borderRadius:8,fontSize:11,color:'#92400E'}}>
        <strong>💡 Commission Note:</strong> Rates shown as stored in Tally (net after TDS). 
        Gross rate = net ÷ 0.95 (e.g. 1.9% stored → 2.0% gross, 0.1% TDS deducted). 
        TDS column shows 5% of commission amount (₹{fmt(tdsTotal)} total TDS in current view).
      </div>
    </div>
  );
}
