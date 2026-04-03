import { useState, useEffect, useCallback } from 'react';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

const T = {
  navy:'#0B2E2B', teal:'#2BA898', tealLight:'#EEF8F6',
  green:'#1E9E5A', red:'#E74C3C', orange:'#E67E22',
  blue:'#2468C8', gold:'#E8A800', border:'#D0EDE8',
  bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B', muted:'#6A9B95',
};
const fmt  = n => '₹' + Math.round(Number(n||0)).toLocaleString('en-IN');
const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';

const AGING_CONFIG = [
  { key:'0-30 days',  label:'0-30 Days',  color:'#22C55E', bg:'#DCFCE7' },
  { key:'31-60 days', label:'31-60 Days', color:'#F97316', bg:'#FED7AA' },
  { key:'61-90 days', label:'61-90 Days', color:'#EF4444', bg:'#FEE2E2' },
  { key:'90+ days',   label:'90+ Days',   color:'#991B1B', bg:'#FEE2E2' },
];

export default function OutstandingPayableV2() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [agingFilter, setAgingFilter] = useState('');
  const [sortBy, setSortBy]   = useState('outstanding_amount');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('outstanding_payable_v2')
      .select('*').order(sortBy,{ascending:false}).limit(500);
    if (agingFilter) q = q.eq('aging_bucket', agingFilter);
    const { data, error } = await q;
    if (!error) setRows(data||[]);
    setLoading(false);
  }, [sortBy, agingFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r =>
    !search || r.party_name?.toLowerCase().includes(search.toLowerCase())
      || r.bill_number?.toLowerCase().includes(search.toLowerCase())
  );

  const total     = filtered.reduce((s,r)=>s+Number(r.outstanding_amount||0),0);
  const totalBill = filtered.reduce((s,r)=>s+Number(r.billed_amount||0),0);
  const totalPaid = filtered.reduce((s,r)=>s+Number(r.paid_amount||0),0);
  const agingTotals = AGING_CONFIG.reduce((a,ag)=>({
    ...a,[ag.key]:filtered.filter(r=>r.aging_bucket===ag.key).reduce((s,r)=>s+Number(r.outstanding_amount||0),0)
  }),{});

  return (
    <div style={{minHeight:'100vh',background:T.bg,padding:'20px 24px',fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:800,color:T.navy,margin:0}}>📉 Outstanding Payable</h1>
        <p style={{fontSize:12,color:T.muted,margin:'4px 0 0'}}>Bill-level accuracy · Grey purchase + Jobwork · v2</p>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
        {[
          {label:'Total Payable',value:fmt(total),color:T.red,icon:'💸',sub:`${filtered.length} bills`},
          {label:'Total Billed',value:fmt(totalBill),color:T.blue,icon:'📋'},
          {label:'Paid',value:fmt(totalPaid),color:T.green,icon:'✅',sub:`${totalBill>0?(totalPaid/totalBill*100).toFixed(1):0}% cleared`},
          {label:'90+ Days',value:fmt(agingTotals['90+ days']||0),color:'#991B1B',icon:'🔴',sub:'Critical'},
        ].map(k=>(
          <div key={k.label} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:'14px 18px',borderTop:`3px solid ${k.color}`}}>
            <div style={{fontSize:20,marginBottom:2}}>{k.icon}</div>
            <div style={{fontSize:20,fontWeight:800,color:T.navy}}>{k.value}</div>
            <div style={{fontSize:12,fontWeight:600,color:T.text}}>{k.label}</div>
            {k.sub && <div style={{fontSize:10,color:T.muted,marginTop:2}}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Aging */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 16px',marginBottom:14,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        <span style={{fontSize:11,fontWeight:700,color:T.navy,marginRight:4}}>Aging:</span>
        {AGING_CONFIG.map(ag=>{
          const amt=agingTotals[ag.key]||0;
          return (
            <button key={ag.key} onClick={()=>setAgingFilter(agingFilter===ag.key?'':ag.key)}
              style={{background:agingFilter===ag.key?ag.color:ag.bg,color:agingFilter===ag.key?'#fff':ag.color,
                border:`1px solid ${ag.color}`,borderRadius:7,padding:'5px 12px',cursor:'pointer',fontSize:11,fontWeight:600}}>
              {ag.label}: {fmt(amt)}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search party / bill…"
          style={{flex:'1 1 200px',minWidth:0,padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12}} />
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{padding:'8px 10px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,background:T.surface}}>
          <option value="outstanding_amount">Sort: Outstanding ↓</option>
          <option value="days_since_bill">Sort: Oldest ↓</option>
          <option value="billed_amount">Sort: Billed ↓</option>
        </select>
        <button onClick={load}
          style={{padding:'8px 14px',background:T.teal,border:'none',borderRadius:8,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
          ⟳ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60,color:T.muted}}>Loading payable data…</div>
      ) : (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:T.navy}}>
                {['Bill No','Date','Party','Billed','Paid','Debit Note','Outstanding','Days','Aging'].map(h=>(
                  <th key={h} style={{padding:'9px 10px',color:'rgba(255,255,255,.8)',textAlign:'left',fontSize:9,textTransform:'uppercase',letterSpacing:'.5px',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r,i)=>(
                <>
                  <tr key={r.bill_number+i} onClick={()=>setExpanded(expanded===i?null:i)}
                    style={{background:expanded===i?T.tealLight:i%2===0?'#fff':'#FAFFFE',
                      borderBottom:`1px solid ${T.border}`,cursor:'pointer'}}>
                    <td style={{padding:'8px 10px',fontWeight:700,color:T.blue}}>{r.bill_number}</td>
                    <td style={{padding:'8px 10px',color:T.muted,whiteSpace:'nowrap'}}>{fmtD(r.bill_date)}</td>
                    <td style={{padding:'8px 10px',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:600}}>{r.party_name}</td>
                    <td style={{padding:'8px 10px',textAlign:'right'}}>{fmt(r.billed_amount)}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',color:T.green}}>{fmt(r.paid_amount)}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',color:T.orange}}>{fmt(r.debit_note_amount||0)}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:T.red}}>{fmt(r.outstanding_amount)}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',color:Number(r.days_since_bill)>60?T.red:T.muted}}>{r.days_since_bill||0}d</td>
                    <td style={{padding:'8px 10px'}}>
                      {(() => {
                        const cfg=AGING_CONFIG.find(a=>a.key===r.aging_bucket)||{color:T.muted,bg:'#F3F4F6'};
                        return <span style={{background:cfg.bg,color:cfg.color,padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700}}>{r.aging_bucket}</span>;
                      })()}
                    </td>
                  </tr>
                  {expanded===i && (
                    <tr><td colSpan={9} style={{padding:'0 10px 10px',background:'#FAFFFE'}}>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,paddingTop:8}}>
                        {[
                          ['Tally Voucher', r.tally_voucher_no||'—'],
                          ['Days Since Bill', String(r.days_since_bill||0)+' days'],
                          ['Paid Amount', fmt(r.paid_amount)],
                          ['Debit Note Adj', fmt(r.debit_note_amount||0)],
                        ].map(([k,v])=>(
                          <div key={k} style={{background:T.surface,borderRadius:4,padding:'5px 8px',border:`1px solid ${T.border}`}}>
                            <div style={{fontSize:9,color:T.muted,textTransform:'uppercase'}}>{k}</div>
                            <div style={{fontSize:11,color:T.text,marginTop:1}}>{v}</div>
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
                <td colSpan={3} style={{padding:'9px 10px',fontWeight:700,color:T.navy}}>TOTAL ({filtered.length} bills)</td>
                <td style={{padding:'9px 10px',textAlign:'right',fontWeight:700}}>{fmt(totalBill)}</td>
                <td style={{padding:'9px 10px',textAlign:'right',fontWeight:700,color:T.green}}>{fmt(totalPaid)}</td>
                <td style={{padding:'9px 10px',textAlign:'right'}}></td>
                <td style={{padding:'9px 10px',textAlign:'right',fontWeight:800,color:T.red,fontSize:14}}>{fmt(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
