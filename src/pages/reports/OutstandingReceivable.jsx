import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

const T = { teal:'#2BA898', navy:'#0B2E2B', green:'#1E9E5A', red:'#E74C3C', gold:'#E8A800', 
            blue:'#2468C8', orange:'#E67E22', bg:'#F0F9F7', surface:'#fff', border:'#D0EDE8', 
            text:'#0B2E2B', muted:'#6A9B95' };
const fmt = (n) => '\u20B9' + Number(n||0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '-';

function AgingBadge({ days }) {
  const c = days <= 30 ? {bg:'#D1FAE5',col:'#065F46'} : days <= 60 ? {bg:'#FEF3C7',col:'#92400E'} : days <= 90 ? {bg:'#FEE2E2',col:'#991B1B'} : {bg:'#7F1D1D',col:'#FEF2F2'};
  const label = days <= 30 ? '0-30d' : days <= 60 ? '31-60d' : days <= 90 ? '61-90d' : '90d+';
  return <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:c.bg,color:c.col}}>{label}</span>;
}

function CustomerDetailModal({ customer, bills, onClose }) {
  if (!customer) return null;
  const total = bills.reduce((s,b) => s + (b.total_amount||0), 0);
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onClose}>
      <div style={{background:T.surface,borderRadius:14,padding:24,maxWidth:620,width:'92%',maxHeight:'85vh',overflow:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <h2 style={{fontSize:18,fontWeight:800,color:T.navy,margin:0}}>{customer}</h2>
            <div style={{fontSize:13,color:T.muted}}>Customer Ledger</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:T.muted}}>×</button>
        </div>
        <div style={{background:T.bg,borderRadius:8,padding:14,marginBottom:16,display:'flex',gap:20}}>
          <div><div style={{fontSize:11,color:T.muted}}>TOTAL DUE</div><div style={{fontSize:22,fontWeight:800,color:T.red}}>{fmt(total)}</div></div>
          <div><div style={{fontSize:11,color:T.muted}}>BILLS</div><div style={{fontSize:22,fontWeight:800,color:T.navy}}>{bills.length}</div></div>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:T.bg}}>
              {['Bill #','Date','Amount','Days','Age'].map(h=>(
                <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',borderBottom:`1px solid ${T.border}`}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bills.map((b,i) => {
              const days = Math.floor((Date.now() - new Date(b.bill_date).getTime()) / 86400000);
              return (
                <tr key={b.id} style={{background:i%2===0?T.surface:T.bg}}>
                  <td style={{padding:'8px 12px',fontSize:13,fontWeight:600,color:T.teal}}>{b.bill_number}</td>
                  <td style={{padding:'8px 12px',fontSize:13}}>{fmtDate(b.bill_date)}</td>
                  <td style={{padding:'8px 12px',fontSize:13,fontWeight:700,color:T.red}}>{fmt(b.total_amount)}</td>
                  <td style={{padding:'8px 12px',fontSize:13}}>{days}d</td>
                  <td style={{padding:'8px 12px'}}><AgingBadge days={days}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{marginTop:16,display:'flex',gap:10}}>
          <a href={`/admin/whatsapp-inbox?phone=`} style={{padding:'8px 14px',background:T.teal+'15',color:T.teal,borderRadius:8,fontSize:13,fontWeight:600,textDecoration:'none'}}>
            💬 Send Reminder
          </a>
          <button onClick={onClose} style={{padding:'8px 14px',background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,cursor:'pointer'}}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function OutstandingReceivable() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState('');
  const [agingFilter, setAgingFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBills, setCustomerBills] = useState([]);
  const [stats, setStats] = useState({total:0, count:0, aged30:0, aged60:0, aged90:0, agedOver90:0});

  const loadData = useCallback(async () => {
    setLoading(true);
    // Get all synced sales bills (outstanding = not paid)
    const { data } = await supabase
      .from('sales_bills')
      .select('*')
      .eq('status','synced')
      .order('bill_date', {ascending:true});

    const all = data || [];
    const now = Date.now();

    // Group by customer with aging
    const customerMap = {};
    all.forEach(b => {
      const days = Math.floor((now - new Date(b.bill_date).getTime()) / 86400000);
      const key = b.customer_name || 'Unknown';
      if (!customerMap[key]) customerMap[key] = { name:key, bills:[], total:0, maxDays:0 };
      customerMap[key].bills.push({...b, days});
      customerMap[key].total += (b.total_amount||0);
      customerMap[key].maxDays = Math.max(customerMap[key].maxDays, days);
    });

    const rows = Object.values(customerMap);
    setBills(rows);

    const totalAmt = rows.reduce((s,r) => s+r.total, 0);
    setStats({
      total: totalAmt,
      count: rows.length,
      aged30: rows.filter(r=>r.maxDays<=30).reduce((s,r)=>s+r.total,0),
      aged60: rows.filter(r=>r.maxDays>30&&r.maxDays<=60).reduce((s,r)=>s+r.total,0),
      aged90: rows.filter(r=>r.maxDays>60&&r.maxDays<=90).reduce((s,r)=>s+r.total,0),
      agedOver90: rows.filter(r=>r.maxDays>90).reduce((s,r)=>s+r.total,0),
    });
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = bills.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase());
    const matchAging = agingFilter === 'all' || 
      (agingFilter === '0-30' && r.maxDays <= 30) ||
      (agingFilter === '31-60' && r.maxDays > 30 && r.maxDays <= 60) ||
      (agingFilter === '61-90' && r.maxDays > 60 && r.maxDays <= 90) ||
      (agingFilter === '90+' && r.maxDays > 90);
    return matchSearch && matchAging;
  }).sort((a,b) => b.total - a.total);

  return (
    <div style={{background:T.bg,minHeight:'100vh',padding:24}}>
      <Helmet><title>Outstanding Receivable — Shreerang</title></Helmet>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:T.navy,margin:0}}>📈 Outstanding Receivable</h1>
          <p style={{color:T.muted,fontSize:13,margin:'4px 0 0'}}>Debtors aging analysis — all pending sales bills</p>
        </div>
        <button onClick={loadData} style={{padding:'8px 16px',background:T.teal,color:'#fff',border:'none',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer'}}>
          🔄 Refresh
        </button>
      </div>

      {/* Aging Cards */}
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        {[
          {label:'Total Outstanding',value:fmt(stats.total),color:T.red,bg:'#FEE2E2',count:stats.count+' parties'},
          {label:'0-30 Days',value:fmt(stats.aged30),color:T.green,bg:'#D1FAE5',count:'Current'},
          {label:'31-60 Days',value:fmt(stats.aged60),color:T.gold,bg:'#FEF3C7',count:'Watch'},
          {label:'61-90 Days',value:fmt(stats.orange||T.orange),color:T.orange,bg:'#FED7AA',count:'Overdue'},
          {label:'90+ Days',value:fmt(stats.agedOver90),color:'#991B1B',bg:'#FEE2E2',count:'Critical'},
        ].map(s=>(
          <div key={s.label} style={{background:T.surface,borderRadius:12,padding:'14px 18px',border:`1px solid ${T.border}`,flex:1,minWidth:130}}>
            <div style={{fontSize:11,color:T.muted,fontWeight:600,marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:20,fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:2}}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{background:T.surface,borderRadius:10,padding:14,border:`1px solid ${T.border}`,marginBottom:16,display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <input placeholder="Search customer..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,flex:1,minWidth:180,outline:'none'}}/>
        {['all','0-30','31-60','61-90','90+'].map(f=>(
          <button key={f} onClick={()=>setAgingFilter(f)}
            style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${T.border}`,background:agingFilter===f?T.teal:T.surface,color:agingFilter===f?'#fff':T.text,fontWeight:600,fontSize:12,cursor:'pointer'}}>
            {f==='all'?'All Ages':f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,fontSize:12,color:T.muted,fontWeight:600}}>
          {filtered.length} customers • {fmt(filtered.reduce((s,r)=>s+r.total,0))} total
        </div>
        {loading ? (
          <div style={{padding:40,textAlign:'center',color:T.muted}}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{padding:40,textAlign:'center',color:T.muted}}>
            <div style={{fontSize:32,marginBottom:8}}>📈</div>
            <div>No outstanding receivables found</div>
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:T.bg}}>
                {['Customer','Bills','Total Due','Oldest Bill','Aging','Action'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:`1px solid ${T.border}`}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row,i)=>(
                <tr key={row.name} style={{background:i%2===0?T.surface:T.bg,cursor:'pointer'}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.teal+'12'}
                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?T.surface:T.bg}
                    onClick={()=>{setSelectedCustomer(row.name);setCustomerBills(row.bills);}}>
                  <td style={{padding:'10px 14px',fontSize:13,fontWeight:600,color:T.text,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.name}</td>
                  <td style={{padding:'10px 14px',fontSize:13,textAlign:'center'}}>{row.bills.length}</td>
                  <td style={{padding:'10px 14px',fontSize:14,fontWeight:800,color:row.maxDays>90?T.red:row.maxDays>60?T.orange:T.text}}>{fmt(row.total)}</td>
                  <td style={{padding:'10px 14px',fontSize:13,color:T.muted}}>{fmtDate(row.bills[0]?.bill_date)}</td>
                  <td style={{padding:'10px 14px'}}><AgingBadge days={row.maxDays}/></td>
                  <td style={{padding:'10px 14px'}}>
                    <button onClick={e=>{e.stopPropagation();setSelectedCustomer(row.name);setCustomerBills(row.bills);}}
                      style={{fontSize:11,background:T.teal+'15',color:T.teal,border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontWeight:600}}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CustomerDetailModal customer={selectedCustomer} bills={customerBills} onClose={()=>setSelectedCustomer(null)}/>
    </div>
  );
}
