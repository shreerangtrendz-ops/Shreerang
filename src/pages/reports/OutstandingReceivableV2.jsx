import { useState, useEffect, useCallback } from 'react';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

/* ══════════════════════════════════════════════════════════════════
   OUTSTANDING RECEIVABLE v2
   Uses outstanding_receivable_v2 view (bill-level, receipt_payment_lines matched)
   Features: aging buckets, broker breakdown, WhatsApp collect, drill-down
   ══════════════════════════════════════════════════════════════════ */

const T = {
  navy:'#0B2E2B', teal:'#2BA898', tealLight:'#EEF8F6',
  green:'#1E9E5A', red:'#E74C3C', orange:'#E67E22',
  blue:'#2468C8', gold:'#E8A800', purple:'#9B59B6',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', muted:'#6A9B95',
};
const fmt  = n => '₹' + Math.round(Number(n||0)).toLocaleString('en-IN');
const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
const fmtN = n => Number(n||0).toFixed(1);

const AGING_CONFIG = [
  { key:'not due',    label:'Not Due',     color:'#22C55E', bg:'#DCFCE7' },
  { key:'1-30 overdue', label:'1-30 Days', color:'#F59E0B', bg:'#FEF3C7' },
  { key:'31-60 days', label:'31-60 Days',  color:'#F97316', bg:'#FED7AA' },
  { key:'61-90 days', label:'61-90 Days',  color:'#EF4444', bg:'#FEE2E2' },
  { key:'90+ days',   label:'90+ Days',    color:'#991B1B', bg:'#FEE2E2' },
];

function AgingChip({ bucket }) {
  const cfg = AGING_CONFIG.find(a=>a.key===bucket) || {color:T.muted,bg:'#F3F4F6',label:bucket};
  return (
    <span style={{background:cfg.bg,color:cfg.color,padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,whiteSpace:'nowrap'}}>
      {cfg.label}
    </span>
  );
}

function KPICard({ label, value, sub, color, icon }) {
  return (
    <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 18px',borderTop:`3px solid ${color}`}}>
      <div style={{fontSize:20,marginBottom:2}}>{icon}</div>
      <div style={{fontSize:20,fontWeight:800,color:T.navy}}>{value}</div>
      <div style={{fontSize:12,fontWeight:600,color:T.text}}>{label}</div>
      {sub && <div style={{fontSize:10,color:T.muted,marginTop:2}}>{sub}</div>}
    </div>
  );
}

export default function OutstandingReceivableV2() {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [agingFilter, setAgingFilter] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [sortBy, setSortBy]       = useState('outstanding_amount');
  const [expanded, setExpanded]   = useState(null);
  const [view, setView]           = useState('bills');   // bills | customers
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('outstanding_receivable_v2')
      .select('*')
      .order(sortBy, {ascending:false})
      .limit(500);
    if (agingFilter) q = q.eq('aging_bucket', agingFilter);
    if (dateFrom)    q = q.gte('bill_date', dateFrom);
    if (dateTo)      q = q.lte('bill_date', dateTo);
    const { data, error } = await q;
    if (!error) setRows(data||[]);
    setLoading(false);
  }, [sortBy, agingFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // Filter
  const filtered = rows.filter(r => {
    if (search && !r.customer_name?.toLowerCase().includes(search.toLowerCase())
      && !r.bill_number?.toLowerCase().includes(search.toLowerCase())) return false;
    if (brokerFilter && r.broker_name !== brokerFilter) return false;
    return true;
  });

  // Aggregates
  const total     = filtered.reduce((s,r)=>s+Number(r.outstanding_amount||0),0);
  const totalBill = filtered.reduce((s,r)=>s+Number(r.billed_amount||0),0);
  const totalPaid = filtered.reduce((s,r)=>s+Number(r.paid_amount||0),0);
  const totalComm = filtered.reduce((s,r)=>s+Number(r.comm_amount||0),0);

  // Aging breakdown
  const agingTotals = AGING_CONFIG.reduce((a,ag)=>({
    ...a, [ag.key]: filtered.filter(r=>r.aging_bucket===ag.key).reduce((s,r)=>s+Number(r.outstanding_amount||0),0)
  }),{});

  // Customer rollup for customer view
  const customerMap = {};
  filtered.forEach(r => {
    const k = r.customer_name||'Unknown';
    if (!customerMap[k]) customerMap[k] = {name:k,bills:[],total:0,state:r.customer_state,broker:r.broker_name};
    customerMap[k].bills.push(r);
    customerMap[k].total += Number(r.outstanding_amount||0);
  });
  const customers = Object.values(customerMap).sort((a,b)=>b.total-a.total);

  // Unique brokers
  const brokers = [...new Set(rows.map(r=>r.broker_name).filter(Boolean))].sort();

  // WhatsApp collect message
  const waCollect = (r) => {
    const msg = encodeURIComponent(
      `Dear ${r.customer_name},\n\nThis is a reminder for outstanding payment:\n` +
      `Bill: ${r.bill_number} | Date: ${fmtD(r.bill_date)}\n` +
      `Amount: ${fmt(r.outstanding_amount)}\n` +
      (r.days_overdue > 0 ? `Overdue by: ${r.days_overdue} days\n` : '') +
      `\nKindly arrange payment at the earliest.\n\nRegards,\nShreerang Trendz`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div style={{minHeight:'100vh',background:T.bg,padding:'20px 24px',fontFamily:"'DM Sans',sans-serif"}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:800,color:T.navy,margin:0}}>📈 Outstanding Receivable</h1>
        <p style={{fontSize:12,color:T.muted,margin:'4px 0 0'}}>Bill-level accuracy · Broker breakdown · Aging analysis · v2</p>
      </div>

      {/* KPI Row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
        <KPICard label="Total Outstanding" value={fmt(total)} sub={`${filtered.length} bills`} color={T.red} icon="💰" />
        <KPICard label="Total Billed" value={fmt(totalBill)} sub="Gross invoiced" color={T.blue} icon="📤" />
        <KPICard label="Collected" value={fmt(totalPaid)} sub={`${totalBill>0?(totalPaid/totalBill*100).toFixed(1):0}% of billed`} color={T.green} icon="✅" />
        <KPICard label="Broker Commission" value={fmt(totalComm)} sub="On collected amount" color={T.orange} icon="🤝" />
        <KPICard label="90+ Days" value={fmt(agingTotals['90+ days']||0)} sub="Critical overdue" color={T.red} icon="⚠️" />
      </div>

      {/* Aging bar */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 18px',marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:T.navy,marginBottom:10}}>Aging Distribution</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {AGING_CONFIG.map(ag=>{
            const amt = agingTotals[ag.key]||0;
            const pct = total>0?(amt/total*100).toFixed(0):0;
            return (
              <button key={ag.key} onClick={()=>setAgingFilter(agingFilter===ag.key?'':ag.key)}
                style={{background:agingFilter===ag.key?ag.color:ag.bg,color:agingFilter===ag.key?'#fff':ag.color,
                  border:`2px solid ${ag.color}`,borderRadius:8,padding:'8px 14px',cursor:'pointer',textAlign:'left',
                  minWidth:120,transition:'all .15s'}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:'.5px'}}>{ag.label}</div>
                <div style={{fontSize:16,fontWeight:800,marginTop:2}}>{fmt(amt)}</div>
                <div style={{fontSize:9,opacity:.8}}>{pct}% of total</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search customer / bill number…"
          style={{flex:'1 1 200px',minWidth:0,padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,color:T.text}} />
        <select value={brokerFilter} onChange={e=>setBrokerFilter(e.target.value)}
          style={{padding:'8px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,color:T.text,background:T.surface}}>
          <option value="">All Brokers</option>
          {brokers.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
          style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}} />
        <span style={{fontSize:11,color:T.muted}}>to</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
          style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}} />
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{padding:'8px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,color:T.text,background:T.surface}}>
          <option value="outstanding_amount">Sort: Outstanding ↓</option>
          <option value="days_overdue">Sort: Overdue ↓</option>
          <option value="bill_date">Sort: Date ↓</option>
          <option value="billed_amount">Sort: Billed ↓</option>
        </select>
        {/* View toggle */}
        <div style={{display:'flex',gap:0,border:`1px solid ${T.border}`,borderRadius:8,overflow:'hidden'}}>
          {['bills','customers'].map(v=>(
            <button key={v} onClick={()=>setView(v)}
              style={{padding:'7px 14px',border:'none',background:view===v?T.teal:T.surface,color:view===v?'#fff':T.text,
                fontSize:11,fontWeight:view===v?700:400,cursor:'pointer'}}>
              {v==='bills'?'📋 Bills':'👥 By Customer'}
            </button>
          ))}
        </div>
        <button onClick={load}
          style={{padding:'8px 14px',background:T.teal,border:'none',borderRadius:8,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
          ⟳ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60,color:T.muted,fontSize:14}}>Loading outstanding data…</div>
      ) : view === 'bills' ? (
        /* ── BILL VIEW ── */
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:T.navy}}>
                {['Bill No','Date','Customer','State','Broker','Billed','Paid','Outstanding','Due Date','Aging','Actions'].map(h=>(
                  <th key={h} style={{padding:'9px 10px',color:'rgba(255,255,255,.8)',textAlign:'left',fontSize:9,textTransform:'uppercase',letterSpacing:'.5px',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r,i)=>(
                <>
                  <tr key={r.bill_number+i}
                    onClick={()=>setExpanded(expanded===i?null:i)}
                    style={{background:expanded===i?T.tealLight:i%2===0?'#fff':'#FAFFFE',
                      borderBottom:`1px solid ${T.border}`,cursor:'pointer',
                      transition:'background .1s'}}>
                    <td style={{padding:'8px 10px',fontWeight:700,color:T.blue}}>{r.bill_number}</td>
                    <td style={{padding:'8px 10px',color:T.muted,whiteSpace:'nowrap'}}>{fmtD(r.bill_date)}</td>
                    <td style={{padding:'8px 10px',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:600,color:T.text}}>{r.customer_name}</td>
                    <td style={{padding:'8px 10px',fontSize:10,color:T.muted}}>{r.customer_state||'—'}</td>
                    <td style={{padding:'8px 10px',fontSize:10,color:T.orange}}>{r.broker_name||'—'}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',color:T.text}}>{fmt(r.billed_amount)}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',color:T.green}}>{fmt(r.paid_amount)}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:T.red}}>{fmt(r.outstanding_amount)}</td>
                    <td style={{padding:'8px 10px',whiteSpace:'nowrap',color:Number(r.days_overdue)>0?T.red:T.muted}}>{fmtD(r.due_date)}</td>
                    <td style={{padding:'8px 10px'}}><AgingChip bucket={r.aging_bucket} /></td>
                    <td style={{padding:'8px 10px'}}>
                      <button onClick={e=>{e.stopPropagation();waCollect(r);}}
                        title="Send WhatsApp reminder"
                        style={{background:'#25D366',border:'none',borderRadius:6,padding:'4px 8px',color:'#fff',fontSize:11,cursor:'pointer',fontWeight:700}}>
                        💬
                      </button>
                    </td>
                  </tr>
                  {expanded===i && (
                    <tr><td colSpan={11} style={{padding:'0 10px 12px',background:'#FAFFFE'}}>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,paddingTop:8}}>
                        {[
                          ['Fabric',          r.fabric_name||'—',         T.text],
                          ['Design No',       r.design_no?`D No-${r.design_no}`:'—', T.blue],
                          ['Qty (mtrs)',       Number(r.quantity_mtrs||0).toFixed(2)+' m', T.text],
                          ['Place of Supply',  r.place_of_supply||'—',     T.muted],
                          ['Credit Days',      r.credit_days||'—',         T.muted],
                          ['Days Overdue',     String(r.days_overdue||0)+' days', Number(r.days_overdue)>0?T.red:T.green],
                          ['Credit Note Adj',  fmt(r.credit_note_amount||0), T.purple],
                          ['Broker Comm Rate', r.comm_rate?fmtN(r.comm_rate)+'%':'—', T.orange],
                          ['Broker Comm Amt',  fmt(r.comm_amount||0),      T.orange],
                          ['IGST',             fmt(r.igst_amount||0),      T.muted],
                          ['CGST',             fmt(r.cgst_amount||0),      T.muted],
                          ['SGST',             fmt(r.sgst_amount||0),      T.muted],
                          ['Entered By',       r.entered_by||'—',          T.muted],
                          ['Tally Voucher',    r.tally_voucher_no||'—',    T.muted],
                        ].map(([lbl,val,col])=>(
                          <div key={lbl} style={{background:T.surface,borderRadius:6,padding:'6px 10px',border:`1px solid ${T.border}`}}>
                            <div style={{fontSize:9,color:T.muted,textTransform:'uppercase',letterSpacing:'.4px'}}>{lbl}</div>
                            <div style={{fontSize:11,fontWeight:500,color:col,marginTop:1}}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </td></tr>
                  )}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr style={{background:T.tealLight,borderTop:`2px solid ${T.teal}`}}>
                <td colSpan={5} style={{padding:'9px 10px',fontWeight:700,color:T.navy,fontSize:12}}>
                  TOTAL ({filtered.length} bills)
                </td>
                <td style={{padding:'9px 10px',textAlign:'right',fontWeight:700,color:T.text}}>{fmt(totalBill)}</td>
                <td style={{padding:'9px 10px',textAlign:'right',fontWeight:700,color:T.green}}>{fmt(totalPaid)}</td>
                <td style={{padding:'9px 10px',textAlign:'right',fontWeight:800,color:T.red,fontSize:14}}>{fmt(total)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        /* ── CUSTOMER VIEW ── */
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {customers.map((c,i)=>(
            <div key={c.name} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,overflow:'hidden'}}>
              <div onClick={()=>setExpanded(expanded===i?null:i)}
                style={{padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',
                  background:expanded===i?T.tealLight:'#fff',gap:12,flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:T.teal,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:13,flexShrink:0}}>
                    {c.name.charAt(0)}
                  </div>
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:700,color:T.navy,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                    <div style={{fontSize:10,color:T.muted}}>{c.state||'—'} · {c.bills.length} bills · Broker: {c.broker||'—'}</div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:16}}>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:18,fontWeight:800,color:T.red}}>{fmt(c.total)}</div>
                    <div style={{fontSize:9,color:T.muted}}>outstanding</div>
                  </div>
                  {/* aging mini-bar */}
                  <div style={{display:'flex',gap:3}}>
                    {AGING_CONFIG.map(ag=>{
                      const amt = c.bills.filter(b=>b.aging_bucket===ag.key).reduce((s,b)=>s+Number(b.outstanding_amount||0),0);
                      if (amt===0) return null;
                      return <div key={ag.key} title={`${ag.label}: ${fmt(amt)}`} style={{width:8,height:32,background:ag.color,borderRadius:2,opacity:.8}} />;
                    })}
                  </div>
                  <span style={{fontSize:16,color:T.muted}}>{expanded===i?'▲':'▼'}</span>
                </div>
              </div>
              {expanded===i && (
                <div style={{padding:'0 12px 12px'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,marginTop:8}}>
                    <thead>
                      <tr style={{borderBottom:`1px solid ${T.border}`}}>
                        {['Bill','Date','Billed','Paid','Outstanding','Aging','⚡'].map(h=>(
                          <th key={h} style={{padding:'5px 8px',color:T.muted,textAlign:h==='Bill'||h==='Date'||h==='⚡'?'left':'right',fontSize:9,fontWeight:700,textTransform:'uppercase'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {c.bills.sort((a,b)=>Number(b.outstanding_amount)-Number(a.outstanding_amount)).map(r=>(
                        <tr key={r.bill_number} style={{borderBottom:`1px solid ${T.border}`}}>
                          <td style={{padding:'5px 8px',color:T.blue,fontWeight:600}}>{r.bill_number}</td>
                          <td style={{padding:'5px 8px',color:T.muted}}>{fmtD(r.bill_date)}</td>
                          <td style={{padding:'5px 8px',textAlign:'right'}}>{fmt(r.billed_amount)}</td>
                          <td style={{padding:'5px 8px',textAlign:'right',color:T.green}}>{fmt(r.paid_amount)}</td>
                          <td style={{padding:'5px 8px',textAlign:'right',fontWeight:700,color:T.red}}>{fmt(r.outstanding_amount)}</td>
                          <td style={{padding:'5px 8px'}}><AgingChip bucket={r.aging_bucket} /></td>
                          <td style={{padding:'5px 8px'}}>
                            <button onClick={()=>waCollect(r)}
                              style={{background:'#25D366',border:'none',borderRadius:4,padding:'3px 7px',color:'#fff',fontSize:10,cursor:'pointer',fontWeight:700}}>
                              💬 WA
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
