import { useState, useEffect, useCallback } from 'react';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

/* ══════════════════════════════════════════════════════════════════
   PAYMENT REMINDERS — Powered by outstanding_receivable_v2
   Shows all overdue bills with 1-click WhatsApp reminder
   ══════════════════════════════════════════════════════════════════ */

const T = {
  navy:'#0B2E2B', teal:'#2BA898', tealLight:'#EEF8F6',
  green:'#1E9E5A', red:'#E74C3C', orange:'#E67E22',
  gold:'#E8A800', blue:'#2468C8', border:'#D0EDE8',
  bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B', muted:'#6A9B95',
};
const fmt  = n => '₹' + Math.round(Number(n||0)).toLocaleString('en-IN');
const fmtL = n => { const v=Number(n||0); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:fmt(v); };
const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';

const AGING = [
  {key:'1-30 overdue',  label:'1–30 Days',  color:'#F59E0B', bg:'#FEF3C7', priority:1},
  {key:'31-60 days',    label:'31–60 Days', color:'#F97316', bg:'#FED7AA', priority:2},
  {key:'61-90 days',    label:'61–90 Days', color:'#EF4444', bg:'#FEE2E2', priority:3},
  {key:'90+ days',      label:'90+ Days',   color:'#991B1B', bg:'#FEE2E2', priority:4},
];

function buildWAMessage(bill, customMsg) {
  if (customMsg) return customMsg;
  const overdue = Number(bill.days_overdue||0);
  const urgency = overdue > 90 ? 'URGENT: ' : overdue > 60 ? 'Important: ' : '';
  return `${urgency}Dear ${bill.customer_name},\n\nWe would like to bring to your attention the following outstanding payment:\n\nInvoice: ${bill.bill_number}\nDate: ${fmtD(bill.bill_date)}\nAmount Due: ${fmt(bill.outstanding_amount)}\nDays Overdue: ${overdue}\n\nKindly arrange payment at your earliest convenience.\n\nBest regards,\nShreerang Trendz Pvt. Ltd.\nSurat — +91 7874200033`;
}

export default function PaymentRemindersPage() {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [agingFilter, setAgingFilter] = useState('');
  const [sortBy, setSortBy]       = useState('outstanding_amount');
  const [selected, setSelected]   = useState(new Set());
  const [customMsg, setCustomMsg] = useState('');
  const [showMsgEditor, setShowMsgEditor] = useState(false);
  const [sent, setSent]           = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('outstanding_receivable_v2')
      .select('*')
      .in('aging_bucket', ['1-30 overdue','31-60 days','61-90 days','90+ days'])
      .order(sortBy, {ascending:false})
      .limit(1000);
    if (agingFilter) q = q.eq('aging_bucket', agingFilter);
    const {data} = await q;
    setRows(data||[]);
    setLoading(false);
  }, [sortBy, agingFilter]);

  useEffect(()=>{ load(); }, [load]);

  const filtered = rows.filter(r =>
    !search || r.customer_name?.toLowerCase().includes(search.toLowerCase())
      || r.bill_number?.toLowerCase().includes(search.toLowerCase())
  );

  // Aggregates
  const totalOutstanding = filtered.reduce((s,r)=>s+Number(r.outstanding_amount||0),0);
  const agingTotals = AGING.reduce((a,ag)=>({
    ...a, [ag.key]: filtered.filter(r=>r.aging_bucket===ag.key).reduce((s,r)=>s+Number(r.outstanding_amount||0),0)
  }),{});

  // Customer rollup for bulk send
  const custMap = {};
  filtered.forEach(r=>{
    if (!custMap[r.customer_name]) custMap[r.customer_name]={name:r.customer_name, bills:[], total:0};
    custMap[r.customer_name].bills.push(r);
    custMap[r.customer_name].total += Number(r.outstanding_amount||0);
  });
  const customers = Object.values(custMap).sort((a,b)=>b.total-a.total);

  const sendWA = (bill) => {
    const msg = buildWAMessage(bill, customMsg);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    setSent(prev => new Set([...prev, bill.bill_number]));
  };

  const sendBulkWA = (custBills) => {
    const totalAmt = custBills.reduce((s,b)=>s+Number(b.outstanding_amount||0),0);
    const billList = custBills.map(b=>`  • ${b.bill_number} (${fmtD(b.bill_date)}): ${fmt(b.outstanding_amount)}`).join('\n');
    const msg = `Dear ${custBills[0].customer_name},\n\nThis is a reminder for the following outstanding invoices:\n\n${billList}\n\nTotal Outstanding: ${fmt(totalAmt)}\n\nKindly arrange payment at your earliest convenience.\n\nBest regards,\nShreerang Trendz Pvt. Ltd.\nSurat — +91 7874200033`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    custBills.forEach(b => setSent(prev=>new Set([...prev, b.bill_number])));
  };

  const toggleSelect = (billNo) => setSelected(prev=>{
    const n=new Set(prev);
    n.has(billNo)?n.delete(billNo):n.add(billNo);
    return n;
  });

  const selectedRows = filtered.filter(r=>selected.has(r.bill_number));
  const selectedTotal = selectedRows.reduce((s,r)=>s+Number(r.outstanding_amount||0),0);

  return (
    <div style={{minHeight:'100vh',background:T.bg,padding:'20px 24px',fontFamily:"'DM Sans',sans-serif"}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:800,color:T.navy,margin:0}}>💬 Payment Reminders</h1>
        <p style={{fontSize:12,color:T.muted,margin:'4px 0 0'}}>
          Overdue bills from outstanding_receivable_v2 · 1-click WhatsApp reminders
        </p>
      </div>

      {/* KPI Strip */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
        <div style={{background:T.red,borderRadius:12,padding:'14px 18px',color:'#fff'}}>
          <div style={{fontSize:10,fontWeight:700,opacity:.8,textTransform:'uppercase',letterSpacing:'.5px'}}>Total Overdue</div>
          <div style={{fontSize:22,fontWeight:800,marginTop:2}}>{fmtL(totalOutstanding)}</div>
          <div style={{fontSize:11,opacity:.8,marginTop:2}}>{filtered.length} bills</div>
        </div>
        {AGING.map(ag=>(
          <button key={ag.key} onClick={()=>setAgingFilter(agingFilter===ag.key?'':ag.key)}
            style={{background:agingFilter===ag.key?ag.color:T.surface,border:`2px solid ${ag.color}`,borderRadius:12,padding:'12px 16px',
              color:agingFilter===ag.key?'#fff':ag.color,cursor:'pointer',textAlign:'left',transition:'all .15s'}}>
            <div style={{fontSize:10,fontWeight:700,opacity:.8,textTransform:'uppercase',letterSpacing:'.4px'}}>{ag.label}</div>
            <div style={{fontSize:18,fontWeight:800,marginTop:2}}>{fmtL(agingTotals[ag.key]||0)}</div>
            <div style={{fontSize:10,opacity:.8,marginTop:2}}>{filtered.filter(r=>r.aging_bucket===ag.key).length} bills</div>
          </button>
        ))}
      </div>

      {/* Custom message editor */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,marginBottom:14,overflow:'hidden'}}>
        <button onClick={()=>setShowMsgEditor(!showMsgEditor)}
          style={{width:'100%',padding:'10px 16px',background:T.tealLight,border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',fontWeight:700,fontSize:12,color:T.navy}}>
          <span>✏️ Customise WhatsApp Message Template</span>
          <span>{showMsgEditor?'▲':'▼'}</span>
        </button>
        {showMsgEditor && (
          <div style={{padding:14}}>
            <div style={{fontSize:11,color:T.muted,marginBottom:6}}>Leave blank to use the auto-generated message per bill. Or type a custom template (applies to all sends):</div>
            <textarea value={customMsg} onChange={e=>setCustomMsg(e.target.value)} rows={4}
              placeholder="Dear {customer_name}, your payment of {amount} for bill {bill_number} is overdue. Please arrange payment."
              style={{width:'100%',padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,resize:'vertical',boxSizing:'border-box'}} />
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button onClick={()=>setCustomMsg('')} style={{padding:'5px 14px',background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,fontSize:11,cursor:'pointer',color:T.text}}>Reset to Auto</button>
              {customMsg && <span style={{fontSize:11,color:T.green,padding:'5px 0'}}>✓ Custom message active</span>}
            </div>
          </div>
        )}
      </div>

      {/* Filters + Bulk Actions */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search customer / bill number…"
          style={{flex:'1 1 200px',minWidth:0,padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}} />
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{padding:'8px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,background:T.surface}}>
          <option value="outstanding_amount">Sort: Amount ↓</option>
          <option value="days_overdue">Sort: Most Overdue ↓</option>
          <option value="bill_date">Sort: Oldest Bill ↓</option>
        </select>
        {selected.size > 0 && (
          <div style={{display:'flex',gap:6,alignItems:'center',background:'#FEF3C7',padding:'6px 12px',borderRadius:8,border:'1px solid #F59E0B'}}>
            <span style={{fontSize:11,fontWeight:700,color:'#B45309'}}>{selected.size} selected · {fmt(selectedTotal)}</span>
            <button onClick={()=>setSelected(new Set())} style={{fontSize:10,color:T.red,background:'none',border:'none',cursor:'pointer'}}>✕ Clear</button>
          </div>
        )}
        <button onClick={load} style={{padding:'8px 14px',background:T.teal,border:'none',borderRadius:8,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>⟳ Refresh</button>
      </div>

      {/* Customer cards — each with all their bills and bulk WA button */}
      {loading ? (
        <div style={{textAlign:'center',padding:60,color:T.muted}}>Loading overdue bills…</div>
      ) : customers.length === 0 ? (
        <div style={{textAlign:'center',padding:60,background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,color:T.muted}}>
          🎉 No overdue bills found! All payments are up to date.
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {customers.map((c,ci)=>{
            const worstBucket = c.bills.reduce((w,b)=>{
              const ag=AGING.find(a=>a.key===b.aging_bucket);
              const wp=ag?.priority||0;
              return wp>w.p?{color:ag?.color||T.red,p:wp}:w;
            },{color:T.gold,p:0});
            const allSent = c.bills.every(b=>sent.has(b.bill_number));
            return (
              <div key={c.name} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden',borderLeft:`4px solid ${worstBucket.color}`}}>
                {/* Customer header */}
                <div style={{padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',borderBottom:`1px solid ${T.border}`}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0}}>
                    <div style={{width:36,height:36,borderRadius:'50%',background:worstBucket.color,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:14,flexShrink:0}}>
                      {c.name.charAt(0)}
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:700,color:T.navy,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</div>
                      <div style={{fontSize:10,color:T.muted}}>{c.bills.length} bills · Broker: {c.bills[0]?.broker_name||'—'}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:20,fontWeight:800,color:worstBucket.color}}>{fmt(c.total)}</div>
                      <div style={{fontSize:9,color:T.muted}}>total outstanding</div>
                    </div>
                    <button onClick={()=>sendBulkWA(c.bills)}
                      style={{background:allSent?'#22C55E':'#25D366',border:'none',borderRadius:8,padding:'8px 14px',color:'#fff',fontSize:12,cursor:'pointer',fontWeight:700,display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap'}}>
                      {allSent ? '✓ Sent' : '💬 Send All'}
                    </button>
                  </div>
                </div>
                {/* Bills list */}
                <div style={{padding:'0 12px 10px'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11,marginTop:8}}>
                    <tbody>
                      {c.bills.sort((a,b)=>Number(b.outstanding_amount)-Number(a.outstanding_amount)).map(r=>{
                        const ag=AGING.find(a=>a.key===r.aging_bucket);
                        const isSent = sent.has(r.bill_number);
                        return (
                          <tr key={r.bill_number} style={{borderBottom:`1px solid ${T.border}`}}>
                            <td style={{padding:'5px 8px',width:20}}>
                              <input type="checkbox" checked={selected.has(r.bill_number)} onChange={()=>toggleSelect(r.bill_number)} />
                            </td>
                            <td style={{padding:'5px 8px',fontWeight:700,color:T.blue,whiteSpace:'nowrap'}}>{r.bill_number}</td>
                            <td style={{padding:'5px 8px',color:T.muted,whiteSpace:'nowrap'}}>{fmtD(r.bill_date)}</td>
                            <td style={{padding:'5px 8px',textAlign:'right',fontWeight:700,color:ag?.color||T.red}}>{fmt(r.outstanding_amount)}</td>
                            <td style={{padding:'5px 8px',textAlign:'center'}}>
                              <span style={{background:ag?.bg||'#FEE2E2',color:ag?.color||T.red,padding:'2px 6px',borderRadius:8,fontSize:9,fontWeight:700}}>
                                {r.days_overdue}d
                              </span>
                            </td>
                            <td style={{padding:'5px 8px',color:T.muted,fontSize:10,maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.design_no?`D No-${r.design_no}`:r.fabric_name||'—'}</td>
                            <td style={{padding:'5px 8px'}}>
                              <button onClick={()=>sendWA(r)}
                                style={{background:isSent?'#22C55E':'#25D366',border:'none',borderRadius:5,padding:'3px 8px',color:'#fff',fontSize:10,cursor:'pointer',fontWeight:700,whiteSpace:'nowrap'}}>
                                {isSent?'✓':'💬 WA'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
