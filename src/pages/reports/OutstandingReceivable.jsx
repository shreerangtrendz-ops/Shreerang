import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../../lib/supabase';

const T = { navy:'#0B2E2B', teal:'#2BA898', gold:'#E8A800', red:'#ef4444', bg:'#F4FBFA' };
const fmt = n => '₹'+Math.abs(Number(n||0)).toLocaleString('en-IN',{maximumFractionDigits:0});

export default function OutstandingReceivable() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState('');

  useEffect(() => { loadOutstanding(); }, []);

  async function loadOutstanding() {
    setLoading(true);
    // Get all sales bills
    const { data: sales } = await supabase
      .from('sales_bills')
      .select('bill_number,bill_date,customer_name,total_amount,credit_days,broker_name')
      .order('bill_date', { ascending: false });

    // Get all receipts to deduct
    const { data: receipts } = await supabase
      .from('receipt_payments')
      .select('party_name,amount,voucher_type,bill_ref')
      .in('voucher_type', ['Receipt','Credit Note']);

    // Build receipt totals by party
    const receiptByParty = {};
    (receipts||[]).forEach(r => {
      const party = (r.party_name||'').trim();
      if (!receiptByParty[party]) receiptByParty[party] = 0;
      receiptByParty[party] += Number(r.amount||0);
    });

    // Group sales by customer and calculate aging
    const today = new Date();
    const custMap = {};
    (sales||[]).forEach(s => {
      const name = (s.customer_name||'Unknown').trim();
      if (!custMap[name]) custMap[name] = { name, total_sales: 0, bills: [], broker: s.broker_name };
      const billDate = new Date(s.bill_date);
      const daysOld = Math.floor((today - billDate) / 86400000);
      const amt = Number(s.total_amount||0);
      custMap[name].total_sales += amt;
      custMap[name].bills.push({ ...s, days_old: daysOld, amount: amt });
    });

    // Calculate outstanding = sales - receipts
    const result = Object.values(custMap).map(c => {
      const received = receiptByParty[c.name] || 0;
      const outstanding = c.total_sales - received;
      if (outstanding <= 0) return null; // Fully paid
      
      // Aging buckets
      let b0_30=0, b31_60=0, b61_90=0, b90plus=0;
      // Distribute outstanding across bills (oldest first)
      let remaining = outstanding;
      const sortedBills = [...c.bills].sort((a,b) => b.days_old - a.days_old);
      sortedBills.forEach(bill => {
        if (remaining <= 0) return;
        const allocate = Math.min(remaining, bill.amount);
        if (bill.days_old > 90) b90plus += allocate;
        else if (bill.days_old > 60) b61_90 += allocate;
        else if (bill.days_old > 30) b31_60 += allocate;
        else b0_30 += allocate;
        remaining -= allocate;
      });

      return { ...c, outstanding, received, b0_30, b31_60, b61_90, b90plus, bill_count: c.bills.length };
    }).filter(Boolean).sort((a,b) => b.outstanding - a.outstanding);

    setCustomers(result);
    setLoading(false);
  }

  const filtered = customers.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (ageFilter === '0-30') return c.b0_30 > 0;
    if (ageFilter === '31-60') return c.b31_60 > 0;
    if (ageFilter === '61-90') return c.b61_90 > 0;
    if (ageFilter === '90+') return c.b90plus > 0;
    return true;
  });

  const stats = {
    total: customers.reduce((s,c) => s+c.outstanding, 0),
    count: customers.length,
    b0_30: customers.reduce((s,c) => s+c.b0_30, 0),
    b31_60: customers.reduce((s,c) => s+c.b31_60, 0),
    b61_90: customers.reduce((s,c) => s+c.b61_90, 0),
    b90plus: customers.reduce((s,c) => s+c.b90plus, 0),
  };

  const CARD = { background:'#fff', borderRadius:12, padding:'14px 18px', boxShadow:'0 1px 6px rgba(0,0,0,.06)', border:'1px solid rgba(43,168,152,.1)' };

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh'}}>
      <Helmet><title>Outstanding Receivable — Shreerang</title></Helmet>
      <div style={{background:'linear-gradient(135deg,#0B2E2B,#143F3C)',padding:'16px 24px'}}>
        <h1 style={{fontSize:20,fontWeight:700,color:'#fff',margin:0}}>📊 Outstanding Receivable</h1>
        <p style={{fontSize:11,color:'#6A9B95',margin:0}}>Debtors aging analysis — all pending sales bills</p>
      </div>

      <div style={{padding:'16px 24px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
          {[
            {label:'Total Outstanding',value:fmt(stats.total),color:T.red,sub:stats.count+' parties'},
            {label:'0-30 Days',value:fmt(stats.b0_30),color:'#1E9E5A',sub:'Current'},
            {label:'31-60 Days',value:fmt(stats.b31_60),color:T.gold,sub:'Watch'},
            {label:'61-90 Days',value:fmt(stats.b61_90),color:'#f97316',sub:'Overdue'},
            {label:'90+ Days',value:fmt(stats.b90plus),color:T.red,sub:'Critical'},
          ].map((c,i)=>(
            <div key={i} style={CARD}>
              <div style={{fontSize:11,color:'#6A9B95'}}>{c.label}</div>
              <div style={{fontSize:18,fontWeight:800,color:c.color}}>{c.value}</div>
              <div style={{fontSize:10,color:'#999'}}>{c.sub}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer..." style={{padding:'8px 12px',borderRadius:8,border:'1px solid rgba(43,168,152,.3)',fontSize:13,flex:1,maxWidth:350}} />
          {['','0-30','31-60','61-90','90+'].map(f=>(
            <button key={f} onClick={()=>setAgeFilter(f)} style={{padding:'6px 14px',borderRadius:20,border:'1px solid '+(ageFilter===f?T.teal:'#d0d0d0'),background:ageFilter===f?T.teal:'#fff',color:ageFilter===f?'#fff':T.navy,fontSize:11,fontWeight:600,cursor:'pointer'}}>{f||'All Ages'}</button>
          ))}
        </div>

        <div style={{fontSize:12,color:'#6A9B95'}}>{filtered.length} customers · {fmt(filtered.reduce((s,c)=>s+c.outstanding,0))} total</div>

        {loading ? <div style={{textAlign:'center',padding:40,color:'#6A9B95'}}>Loading...</div> :
        filtered.length === 0 ? <div style={{textAlign:'center',padding:40,color:'#6A9B95'}}>No outstanding receivables found</div> :
        <div style={{...CARD,padding:0,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr style={{background:'#F4FBFA'}}>
              {['Customer','Bills','Total Sales','Received','Outstanding','0-30','31-60','61-90','90+'].map(h=>(
                <th key={h} style={{padding:'8px 12px',textAlign:['Customer','Bills'].includes(h)?'left':'right',fontWeight:700,color:T.navy,borderBottom:'1px solid rgba(43,168,152,.15)',whiteSpace:'nowrap',fontSize:11}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map((c,i)=>(
              <tr key={i} style={{borderBottom:'1px solid rgba(43,168,152,.06)'}}>
                <td style={{padding:'8px 12px',fontWeight:600,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</td>
                <td style={{padding:'8px 12px',textAlign:'right',color:'#6A9B95'}}>{c.bill_count}</td>
                <td style={{padding:'8px 12px',textAlign:'right'}}>{fmt(c.total_sales)}</td>
                <td style={{padding:'8px 12px',textAlign:'right',color:'#1E9E5A'}}>{fmt(c.received)}</td>
                <td style={{padding:'8px 12px',textAlign:'right',fontWeight:700,color:T.red}}>{fmt(c.outstanding)}</td>
                <td style={{padding:'8px 12px',textAlign:'right',color:'#1E9E5A'}}>{c.b0_30>0?fmt(c.b0_30):'—'}</td>
                <td style={{padding:'8px 12px',textAlign:'right',color:T.gold}}>{c.b31_60>0?fmt(c.b31_60):'—'}</td>
                <td style={{padding:'8px 12px',textAlign:'right',color:'#f97316'}}>{c.b61_90>0?fmt(c.b61_90):'—'}</td>
                <td style={{padding:'8px 12px',textAlign:'right',color:T.red,fontWeight:c.b90plus>0?700:400}}>{c.b90plus>0?fmt(c.b90plus):'—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
      </div>
    </div>
  );
}
