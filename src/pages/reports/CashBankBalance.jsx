import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../../lib/supabase';

const T = { navy:'#0B2E2B', teal:'#2BA898', gold:'#E8A800', bg:'#F4FBFA' };
const fmt = n => '₹'+Math.abs(Number(n||0)).toLocaleString('en-IN',{maximumFractionDigits:0});

export default function CashBankBalance() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tab, setTab] = useState('transactions');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('receipt_payments')
      .select('*')
      .order('voucher_date', { ascending: false })
      .limit(2000);
    if (error) console.error('receipt_payments error:', error);
    setTransactions(data || []);
    setLoading(false);
  }

  const filtered = transactions.filter(t => {
    if (typeFilter && t.voucher_type !== typeFilter) return false;
    if (dateFrom && t.voucher_date < dateFrom) return false;
    if (dateTo && t.voucher_date > dateTo) return false;
    if (search) {
      const s = search.toLowerCase();
      return (t.party_name||'').toLowerCase().includes(s) ||
        (t.voucher_number||'').toLowerCase().includes(s) ||
        (t.bank_ledger||'').toLowerCase().includes(s) ||
        (t.narration||'').toLowerCase().includes(s);
    }
    return true;
  });

  const receipts = filtered.filter(t => t.voucher_type === 'Receipt');
  const payments = filtered.filter(t => t.voucher_type === 'Payment');
  const totalReceipts = receipts.reduce((s,t) => s + Number(t.amount||0), 0);
  const totalPayments = payments.reduce((s,t) => s + Number(t.amount||0), 0);
  const netCashFlow = totalReceipts - totalPayments;

  // Group by bank_ledger for account balances
  const bankMap = {};
  transactions.forEach(t => {
    const bank = t.bank_ledger || 'Unknown';
    if (!bankMap[bank]) bankMap[bank] = { name: bank, receipts: 0, payments: 0, count: 0 };
    bankMap[bank].count++;
    if (t.voucher_type === 'Receipt') bankMap[bank].receipts += Number(t.amount||0);
    else if (t.voucher_type === 'Payment') bankMap[bank].payments += Number(t.amount||0);
  });
  const accounts = Object.values(bankMap).sort((a,b) => (b.receipts-b.payments) - (a.receipts-a.payments));

  const CARD = { background:'#fff', borderRadius:12, padding:'14px 18px', boxShadow:'0 1px 6px rgba(0,0,0,.06)', border:'1px solid rgba(43,168,152,.1)' };

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:T.bg,minHeight:'100vh'}}>
      <Helmet><title>Cash & Bank — Shreerang</title></Helmet>
      <div style={{background:'linear-gradient(135deg,#0B2E2B,#143F3C)',padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:700,color:'#fff',margin:0}}>🏦 Cash & Bank</h1>
          <p style={{fontSize:11,color:'#6A9B95',margin:0}}>Receipts, payments and account balances from Tally</p>
        </div>
        <button onClick={loadData} style={{padding:'8px 16px',borderRadius:8,border:'none',background:T.teal,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>🔄 Refresh</button>
      </div>

      <div style={{padding:'16px 24px',display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
          {[
            {label:'Total Receipts',value:fmt(totalReceipts),icon:'🟢',color:'#1E9E5A'},
            {label:'Total Payments',value:fmt(totalPayments),icon:'🔴',color:T.red||'#ef4444'},
            {label:'Net Cash Flow',value:fmt(netCashFlow),icon:'💰',color:netCashFlow>=0?'#1E9E5A':'#ef4444'},
            {label:'Transactions',value:filtered.length,icon:'📝',color:T.teal},
          ].map((c,i)=>(
            <div key={i} style={CARD}>
              <div style={{fontSize:22,marginBottom:4}}>{c.icon}</div>
              <div style={{fontSize:11,color:'#6A9B95'}}>{c.label}</div>
              <div style={{fontSize:20,fontWeight:800,color:c.color}}>{c.value}</div>
            </div>
          ))}
        </div>

        {accounts.length > 0 && (
          <div>
            <h3 style={{fontSize:14,fontWeight:700,color:T.navy,margin:'8px 0'}}>🏦 Account Balances</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
              {accounts.filter(a=>a.name!=='Unknown').map((a,i)=>(
                <div key={i} style={CARD}>
                  <div style={{fontSize:10,color:'#6A9B95',textTransform:'uppercase'}}>{a.name.includes('Cash')||a.name.includes('CASH')?'CASH':'BANK'}</div>
                  <div style={{fontSize:13,fontWeight:700,color:T.navy}}>{a.name}</div>
                  <div style={{fontSize:16,fontWeight:800,color:a.receipts-a.payments>=0?'#1E9E5A':'#ef4444'}}>{fmt(a.receipts-a.payments)}</div>
                  <div style={{fontSize:10,color:'#999'}}>{a.count} txns</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:8,borderBottom:'2px solid #e0e0e0',paddingBottom:0}}>
          {['transactions','summary'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:'8px 20px',border:'none',borderBottom:tab===t?'3px solid '+T.teal:'3px solid transparent',background:'none',color:tab===t?T.teal:T.navy,fontWeight:tab===t?700:400,fontSize:13,cursor:'pointer',textTransform:'capitalize'}}>{t}</button>
          ))}
        </div>

        {tab === 'transactions' && (
          <>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search party / voucher..." style={{padding:'8px 12px',borderRadius:8,border:'1px solid rgba(43,168,152,.3)',fontSize:13,flex:1,maxWidth:300}} />
              {['','Receipt','Payment','Journal','Credit Note','Contra'].map(f=>(
                <button key={f} onClick={()=>setTypeFilter(f)} style={{padding:'5px 12px',borderRadius:16,border:'1px solid '+(typeFilter===f?T.teal:'#d0d0d0'),background:typeFilter===f?T.teal:'#fff',color:typeFilter===f?'#fff':T.navy,fontSize:11,fontWeight:600,cursor:'pointer'}}>{f||'All'}</button>
              ))}
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{padding:'6px 10px',borderRadius:8,border:'1px solid #ccc',fontSize:12}} />
              <span style={{color:'#999'}}>to</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{padding:'6px 10px',borderRadius:8,border:'1px solid #ccc',fontSize:12}} />
            </div>

            <div style={{fontSize:12,color:'#6A9B95'}}>{filtered.length} transactions</div>

            {loading ? <div style={{textAlign:'center',padding:40,color:'#6A9B95'}}>Loading...</div> :
            filtered.length === 0 ? <div style={{textAlign:'center',padding:40,color:'#6A9B95'}}>No transactions found. Sync from Tally Sync page to import receipts & payments.</div> :
            <div style={{...CARD,padding:0,overflow:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{background:'#F4FBFA'}}>
                  {['Date','Voucher No','Type','Party','Bank/Cash','Amount','Narration'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:h==='Amount'?'right':'left',fontWeight:700,color:T.navy,borderBottom:'1px solid rgba(43,168,152,.15)',whiteSpace:'nowrap',fontSize:11}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{filtered.slice(0,200).map((t,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid rgba(43,168,152,.06)'}}>
                    <td style={{padding:'7px 12px',color:'#4A7A74'}}>{t.voucher_date}</td>
                    <td style={{padding:'7px 12px',fontWeight:600}}>{t.voucher_number}</td>
                    <td style={{padding:'7px 12px'}}>
                      <span style={{padding:'2px 8px',borderRadius:10,fontSize:10,fontWeight:700,
                        background:t.voucher_type==='Receipt'?'#E8FFF4':t.voucher_type==='Payment'?'#FEE2E2':'#F0F4FF',
                        color:t.voucher_type==='Receipt'?'#1E9E5A':t.voucher_type==='Payment'?'#ef4444':'#2468C8'
                      }}>{t.voucher_type}</span>
                    </td>
                    <td style={{padding:'7px 12px',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.party_name||'—'}</td>
                    <td style={{padding:'7px 12px',color:'#6A9B95',fontSize:11}}>{t.bank_ledger||'—'}</td>
                    <td style={{padding:'7px 12px',textAlign:'right',fontWeight:700,color:t.voucher_type==='Receipt'?'#1E9E5A':'#ef4444'}}>{t.amount?fmt(t.amount):'—'}</td>
                    <td style={{padding:'7px 12px',color:'#999',fontSize:11,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.narration||'—'}</td>
                  </tr>
                ))}</tbody>
              </table>
              {filtered.length > 200 && <div style={{padding:8,textAlign:'center',fontSize:11,color:'#6A9B95'}}>Showing 200 of {filtered.length}</div>}
            </div>}
          </>
        )}

        {tab === 'summary' && (
          <div style={{...CARD}}>
            <h3 style={{fontSize:14,fontWeight:700,color:T.navy,margin:'0 0 12px'}}>Monthly Summary</h3>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{background:'#F4FBFA'}}>
                {['Month','Receipts','Payments','Net Flow','Txn Count'].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:h==='Month'?'left':'right',fontWeight:700,color:T.navy,borderBottom:'1px solid rgba(43,168,152,.15)'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{
                Object.entries(transactions.reduce((acc,t) => {
                  const m = (t.voucher_date||'').slice(0,7);
                  if (!m) return acc;
                  if (!acc[m]) acc[m] = { month:m, receipts:0, payments:0, count:0 };
                  acc[m].count++;
                  if (t.voucher_type==='Receipt') acc[m].receipts += Number(t.amount||0);
                  else if (t.voucher_type==='Payment') acc[m].payments += Number(t.amount||0);
                  return acc;
                }, {})).sort(([a],[b]) => b.localeCompare(a)).map(([k,v])=>(
                  <tr key={k} style={{borderBottom:'1px solid rgba(43,168,152,.06)'}}>
                    <td style={{padding:'7px 12px',fontWeight:600}}>{v.month}</td>
                    <td style={{padding:'7px 12px',textAlign:'right',color:'#1E9E5A'}}>{fmt(v.receipts)}</td>
                    <td style={{padding:'7px 12px',textAlign:'right',color:'#ef4444'}}>{fmt(v.payments)}</td>
                    <td style={{padding:'7px 12px',textAlign:'right',fontWeight:700,color:v.receipts-v.payments>=0?'#1E9E5A':'#ef4444'}}>{fmt(v.receipts-v.payments)}</td>
                    <td style={{padding:'7px 12px',textAlign:'right',color:'#6A9B95'}}>{v.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
