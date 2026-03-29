import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

const T = {
  teal:'#2BA898', tealLight:'#EEF8F6', navy:'#0B2E2B',
  green:'#1E9E5A', greenLight:'#E8FFF4',
  red:'#E74C3C', redLight:'#FFF5F5',
  orange:'#E67E22', amberLight:'#FFFBEB',
  blue:'#2468C8', blueLight:'#EBF8FF',
  gold:'#E8A800', goldLight:'#FFF8E8',
  purple:'#9B59B6',
  border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF',
  text:'#0B2E2B', textMuted:'#6A9B95',
};

const fmtAmt = n => { const v=Number(n||0); return v>=10000000?`\u20B9${(v/10000000).toFixed(2)}Cr`:v>=100000?`\u20B9${(v/100000).toFixed(1)}L`:`\u20B9${Math.round(v).toLocaleString('en-IN')}`; };
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '—';
const daysSince = d => d ? Math.floor((Date.now()-new Date(d))/86400000) : 0;

function AgingBadge({days}) {
  const cfg = days > 90 ? {bg:T.redLight,color:T.red,label:`${days}d CRITICAL`}
    : days > 60 ? {bg:'#FFF0E6',color:T.orange,label:`${days}d HIGH`}
    : days > 30 ? {bg:T.amberLight,color:T.gold,label:`${days}d MEDIUM`}
    : {bg:T.greenLight,color:T.green,label:`${days}d OK`};
  return <span style={{background:cfg.bg,color:cfg.color,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20}}>{cfg.label}</span>;
}

export default function BrokerOutstandingPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [brokers, setBrokers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('outstanding');
  const [viewMode, setViewMode] = useState('broker'); // broker | customer
  const [selected, setSelected] = useState(null);
  const [fyFilter, setFyFilter] = useState('all');

  useEffect(() => { loadData(); }, []);

  const getFY = () => {
    const now = new Date();
    return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear()-1;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: sales } = await supabase
      .from('sales_bills')
      .select('bill_number,bill_date,customer_name,total_amount,quantity_mtrs,broker_name,comm_amount,comm_rate,narration,sales_ledger')
      .order('bill_date', { ascending: false })
      .limit(5000);

    // Get distinct customers from tally_ledgers if available
    const { data: ledgers } = await supabase
      .from('tally_ledgers')
      .select('ledger_name,phone,email,gst_number,address,closing_balance')
      .limit(2000);

    const ledgerMap = {};
    (ledgers||[]).forEach(l => { ledgerMap[l.ledger_name] = l; });

    // Build customer outstanding (bills not yet paid = estimate using aging)
    const custMap = {};
    (sales||[]).forEach(s => {
      const cname = s.customer_name;
      if (!cname) return;
      const age = daysSince(s.bill_date);

      if (!custMap[cname]) {
        custMap[cname] = {
          customer: cname,
          broker: s.broker_name || 'Direct',
          bills: [],
          total_sales: 0,
          outstanding_estimate: 0, // bills > 30 days as estimate
          latest_bill: s.bill_date,
          oldest_unpaid: s.bill_date,
          ledger: ledgerMap[cname] || null,
        };
      }
      const c = custMap[cname];
      c.bills.push({ ...s, age });
      c.total_sales += s.total_amount || 0;
      // Outstanding estimate: bills older than 30 days
      if (age > 30) {
        c.outstanding_estimate += s.total_amount || 0;
      }
      if (s.bill_date > c.latest_bill) c.latest_bill = s.bill_date;
      if (age > daysSince(c.oldest_unpaid)) c.oldest_unpaid = s.bill_date;
    });

    // Build broker summary
    const brokerMap = {};
    Object.values(custMap).forEach(c => {
      const broker = c.broker;
      if (!brokerMap[broker]) {
        brokerMap[broker] = {
          broker, customers: [], total_sales: 0, total_outstanding: 0,
          total_commission: 0, customer_count: 0,
        };
      }
      const b = brokerMap[broker];
      b.customers.push(c);
      b.total_sales += c.total_sales;
      b.total_outstanding += c.outstanding_estimate;
      b.customer_count++;
      // Sum commission from all bills
      c.bills.forEach(bill => { b.total_commission += bill.comm_amount || 0; });
    });

    const brokerList = Object.values(brokerMap).sort((a,b) => b.total_outstanding - a.total_outstanding);
    const customerList = Object.values(custMap).sort((a,b) => b.outstanding_estimate - a.outstanding_estimate);

    setBrokers(brokerList);
    setCustomers(customerList);
    setLoading(false);
  }, []);

  const totalOutstanding = customers.reduce((a,c) => a+c.outstanding_estimate, 0);
  const totalSales = customers.reduce((a,c) => a+c.total_sales, 0);

  const filteredCustomers = customers.filter(c => {
    if (search) {
      const s = search.toLowerCase();
      return c.customer.toLowerCase().includes(s) || c.broker.toLowerCase().includes(s);
    }
    return true;
  }).slice(0,100);

  const filteredBrokers = brokers.filter(b => {
    if (search) return b.broker.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  return (
    <div style={{fontFamily:'system-ui,sans-serif',background:T.bg,minHeight:'100vh'}}>
      {/* Header */}
      <div style={{background:T.navy,padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>nav(-1)} style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',borderRadius:8,padding:'6px 12px',cursor:'pointer',fontSize:13}}>← Back</button>
          <div>
            <div style={{color:'#fff',fontSize:18,fontWeight:700}}>💰 Broker-wise Outstanding</div>
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:12,marginTop:2}}>From Tally sales data · {customers.length} customers · {brokers.length} brokers</div>
          </div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer or broker..."
          style={{padding:'7px 14px',borderRadius:8,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.1)',color:'#fff',fontSize:13,width:220,outline:'none'}} />
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,padding:16}}>
        {[
          {label:'Total Receivable (est.)', val:fmtAmt(totalOutstanding), color:T.red},
          {label:'Total Sales Revenue', val:fmtAmt(totalSales), color:T.green},
          {label:'Total Customers', val:customers.length, color:T.teal},
          {label:'Active Brokers', val:brokers.filter(b=>b.broker!=='Direct').length, color:T.gold},
        ].map((k,i) => (
          <div key={i} style={{background:T.surface,borderRadius:10,padding:14,border:`1px solid ${T.border}`,textAlign:'center'}}>
            <div style={{color:T.textMuted,fontSize:11,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>{k.label}</div>
            <div style={{color:k.color,fontSize:20,fontWeight:700}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div style={{padding:'0 16px 12px',display:'flex',gap:8}}>
        {['broker','customer'].map(v => (
          <button key={v} onClick={()=>setViewMode(v)} style={{
            padding:'7px 18px',borderRadius:20,fontSize:12,fontWeight:600,
            border:'none',cursor:'pointer',textTransform:'capitalize',
            background:viewMode===v?T.teal:T.surface,
            color:viewMode===v?'#fff':T.textMuted
          }}>{v==='broker'?'🤝 By Broker':'👥 By Customer'}</button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60,color:T.textMuted}}>Loading outstanding data from Tally...</div>
      ) : viewMode === 'broker' ? (
        /* BROKER VIEW */
        <div style={{padding:'0 16px 16px',display:'flex',flexDirection:'column',gap:10}}>
          {filteredBrokers.map((b,i) => (
            <div key={i} style={{background:T.surface,borderRadius:10,border:`1px solid ${T.border}`,overflow:'hidden'}}>
              {/* Broker header */}
              <div style={{background: b.broker==='Direct'?T.bg:T.goldLight,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}}
                onClick={()=>setSelected(selected===b.broker?null:b.broker)}>
                <div>
                  <div style={{fontWeight:700,color:T.navy,fontSize:14}}>{b.broker}</div>
                  <div style={{color:T.textMuted,fontSize:11,marginTop:2}}>{b.customer_count} customers · Commission: {fmtAmt(b.total_commission)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:700,color:T.red,fontSize:16}}>{fmtAmt(b.total_outstanding)}</div>
                  <div style={{color:T.textMuted,fontSize:11}}>Total sales: {fmtAmt(b.total_sales)}</div>
                </div>
              </div>

              {/* Customer list under broker */}
              {selected === b.broker && (
                <div style={{borderTop:`1px solid ${T.border}`}}>
                  {b.customers.map((c,j) => (
                    <div key={j} style={{padding:'10px 16px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13,color:T.text}}>{c.customer}</div>
                        <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>
                          {c.bills.length} bills · Latest: {fmtDate(c.latest_bill)}
                          {c.ledger?.phone && <span style={{color:T.blue,marginLeft:8}}>📞 {c.ledger.phone}</span>}
                        </div>
                      </div>
                      <div style={{textAlign:'right',marginLeft:12}}>
                        <div style={{fontWeight:700,color:c.outstanding_estimate>100000?T.red:T.orange,fontSize:13}}>{fmtAmt(c.outstanding_estimate)}</div>
                        <div style={{marginTop:3}}><AgingBadge days={daysSince(c.oldest_unpaid)} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* CUSTOMER VIEW */
        <div style={{padding:'0 16px 16px'}}>
          <div style={{background:T.surface,borderRadius:10,border:`1px solid ${T.border}`,overflow:'hidden'}}>
            <div style={{padding:'10px 16px',borderBottom:`1px solid ${T.border}`,display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:8,fontSize:11,fontWeight:600,color:T.textMuted,textTransform:'uppercase'}}>
              <div>Customer</div><div>Broker</div><div style={{textAlign:'right'}}>Outstanding</div><div style={{textAlign:'right'}}>Total Sales</div><div style={{textAlign:'right'}}>Age</div>
            </div>
            {filteredCustomers.map((c,i) => (
              <div key={i} style={{padding:'10px 16px',borderBottom:`1px solid ${T.border}`,display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr',gap:8,alignItems:'center',background:i%2===0?T.surface:T.bg}}>
                <div>
                  <div style={{fontWeight:600,fontSize:12,color:T.text}}>{c.customer.substring(0,28)}</div>
                  {c.ledger?.phone && <div style={{fontSize:10,color:T.blue}}>📞 {c.ledger.phone}</div>}
                </div>
                <div style={{fontSize:11,color:T.textMuted}}>{c.broker.substring(0,20)}</div>
                <div style={{textAlign:'right',fontWeight:700,color:c.outstanding_estimate>500000?T.red:c.outstanding_estimate>100000?T.orange:T.text,fontSize:12}}>{fmtAmt(c.outstanding_estimate)}</div>
                <div style={{textAlign:'right',fontSize:11,color:T.textMuted}}>{fmtAmt(c.total_sales)}</div>
                <div style={{textAlign:'right'}}><AgingBadge days={daysSince(c.oldest_unpaid)} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
