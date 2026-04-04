import { useState, useEffect, useCallback } from 'react';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

/* Cash & Bank — reads from accounting_vouchers (Receipt/Payment/Contra)
   Shows bank account balances, transaction detail, monthly summary */

const T = {
  navy:'#0B2E2B', teal:'#2BA898', tealLight:'#EEF8F6',
  green:'#1E9E5A', red:'#E74C3C', orange:'#E67E22',
  blue:'#2468C8', gold:'#E8A800', border:'#D0EDE8',
  bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B', muted:'#6A9B95',
};
const fmt  = n => '₹' + Math.round(Number(n||0)).toLocaleString('en-IN');
const fmtL = n => { const v=Number(n||0); return v>=10000000?`₹${(v/10000000).toFixed(2)}Cr`:v>=100000?`₹${(v/100000).toFixed(1)}L`:fmt(v); };
const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';

const TYPE_META = {
  Receipt: {col:'#065F46',bg:'#D1FAE5',icon:'💚'},
  Payment: {col:'#92400E',bg:'#FEF3C7',icon:'💸'},
  Contra:  {col:'#1D4ED8',bg:'#DBEAFE',icon:'🔄'},
  Journal: {col:'#374151',bg:'#F3F4F6',icon:'📒'},
};

function todayISO() { return new Date().toISOString().slice(0,10); }

export default function CashBankBalance() {
  const [txns, setTxns]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('2025-04-01');
  const [dateTo, setDateTo]     = useState(todayISO());
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const {data} = await supabase.from('accounting_vouchers')
      .select('voucher_number,voucher_type,voucher_date,party_name,total_amount,dr_amount,cr_amount,bank_ledger,payment_mode,instrument_no,instrument_date,urn,payment_favouring,transfer_mode,narration,entered_by,bill_allocations')
      .in('voucher_type',['Receipt','Payment','Contra','Journal'])
      .gte('voucher_date', dateFrom)
      .lte('voucher_date', dateTo)
      .order('voucher_date', {ascending:false})
      .limit(2000);
    setTxns(data||[]);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(()=>{ load(); }, [load]);

  const filtered = txns.filter(t=>{
    if (typeFilter && t.voucher_type!==typeFilter) return false;
    if (bankFilter && t.bank_ledger!==bankFilter) return false;
    if (search && !t.party_name?.toLowerCase().includes(search.toLowerCase())
      && !t.voucher_number?.toLowerCase().includes(search.toLowerCase())
      && !t.instrument_no?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Bank account summary
  const bankMap = {};
  txns.forEach(t=>{
    const bank = t.bank_ledger||'Unspecified';
    if (!bankMap[bank]) bankMap[bank]={name:bank,receipts:0,payments:0,contra:0,count:0};
    bankMap[bank].count++;
    const amt = Number(t.total_amount||t.dr_amount||0);
    if (t.voucher_type==='Receipt')  bankMap[bank].receipts+=amt;
    if (t.voucher_type==='Payment')  bankMap[bank].payments+=amt;
    if (t.voucher_type==='Contra')   bankMap[bank].contra+=amt;
  });
  const bankAccounts = Object.values(bankMap).sort((a,b)=>(b.receipts-b.payments)-(a.receipts-a.payments));
  const banks = [...new Set(txns.map(t=>t.bank_ledger).filter(Boolean))].sort();

  // Monthly summary
  const monthMap = {};
  txns.forEach(t=>{
    const m=(t.voucher_date||'').slice(0,7);
    if (!m) return;
    if (!monthMap[m]) monthMap[m]={month:m,receipts:0,payments:0,contra:0,count:0};
    monthMap[m].count++;
    const amt=Number(t.total_amount||t.dr_amount||0);
    if (t.voucher_type==='Receipt') monthMap[m].receipts+=amt;
    if (t.voucher_type==='Payment') monthMap[m].payments+=amt;
    if (t.voucher_type==='Contra')  monthMap[m].contra+=amt;
  });
  const months = Object.values(monthMap).sort((a,b)=>b.month.localeCompare(a.month));

  const totalR = filtered.filter(t=>t.voucher_type==='Receipt').reduce((s,t)=>s+Number(t.total_amount||0),0);
  const totalP = filtered.filter(t=>t.voucher_type==='Payment').reduce((s,t)=>s+Number(t.total_amount||0),0);
  const totalC = filtered.filter(t=>t.voucher_type==='Contra').reduce((s,t)=>s+Number(t.total_amount||0),0);

  const exportCSV = () => {
    const rows = ['Date,Type,Voucher,Party,Bank,Mode,Instrument,Amount,Narration',
      ...filtered.map(t=>[t.voucher_date,t.voucher_type,t.voucher_number,`"${t.party_name||''}"`,t.bank_ledger||'',t.payment_mode||'',t.instrument_no||'',t.total_amount||0,`"${(t.narration||'').replace(/"/g,"'")}"`].join(','))
    ].join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows],{type:'text/csv'}));a.download=`CashBank_${dateFrom}_${dateTo}.csv`;a.click();
  };

  return (
    <div style={{minHeight:'100vh',background:T.bg,padding:'20px 24px',fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:T.navy,margin:0}}>🏦 Cash & Bank</h1>
          <p style={{fontSize:12,color:T.muted,margin:'4px 0 0'}}>Receipt · Payment · Contra · from accounting_vouchers</p>
        </div>
        <button onClick={exportCSV} style={{padding:'8px 16px',background:T.green,border:'none',borderRadius:8,color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>📥 Export CSV</button>
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {[
          {l:'Total Receipts',v:fmtL(totalR),c:T.green,ic:'💚',sub:`${filtered.filter(t=>t.voucher_type==='Receipt').length} vch`},
          {l:'Total Payments',v:fmtL(totalP),c:T.red,ic:'💸',sub:`${filtered.filter(t=>t.voucher_type==='Payment').length} vch`},
          {l:'Contra Transfers',v:fmtL(totalC),c:T.blue,ic:'🔄',sub:`${filtered.filter(t=>t.voucher_type==='Contra').length} vch`},
          {l:'Net Cash Flow',v:fmtL(totalR-totalP),c:(totalR-totalP)>=0?T.green:T.red,ic:(totalR-totalP)>=0?'📈':'📉',sub:'Receipts − Payments'},
        ].map(k=>(
          <div key={k.l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 16px',borderTop:`3px solid ${k.c}`}}>
            <div style={{fontSize:18}}>{k.ic}</div>
            <div style={{fontSize:18,fontWeight:800,color:T.navy}}>{k.v}</div>
            <div style={{fontSize:11,fontWeight:600,color:T.text}}>{k.l}</div>
            <div style={{fontSize:10,color:T.muted}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Bank account cards */}
      {bankAccounts.filter(a=>a.name!=='Unspecified').length > 0 && (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:T.navy,marginBottom:8}}>🏦 Account Summary</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8}}>
            {bankAccounts.filter(a=>a.name!=='Unspecified').map((a,i)=>{
              const net=a.receipts-a.payments;
              const isBank=!a.name.toUpperCase().includes('CASH');
              return (
                <button key={i} onClick={()=>setBankFilter(bankFilter===a.name?'':a.name)}
                  style={{background:bankFilter===a.name?T.navy:T.surface,border:`1px solid ${bankFilter===a.name?T.navy:T.border}`,borderRadius:10,padding:'12px 14px',cursor:'pointer',textAlign:'left',transition:'all .15s'}}>
                  <div style={{fontSize:9,color:bankFilter===a.name?'rgba(255,255,255,.6)':T.muted,textTransform:'uppercase',fontWeight:700}}>{isBank?'BANK':'CASH'}</div>
                  <div style={{fontSize:12,fontWeight:700,color:bankFilter===a.name?'#fff':T.navy,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name}</div>
                  <div style={{fontSize:16,fontWeight:800,color:bankFilter===a.name?'#fff':net>=0?T.green:T.red,marginTop:4}}>{fmtL(Math.abs(net))}{net<0?' (Dr)':''}</div>
                  <div style={{fontSize:9,color:bankFilter===a.name?'rgba(255,255,255,.5)':T.muted,marginTop:2}}>{a.count} txns</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 14px',marginBottom:12,display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search party, voucher, instrument…"
          style={{flex:'1 1 160px',minWidth:0,padding:'6px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12}} />
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
          style={{padding:'6px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,background:T.surface}}>
          <option value="">All Types</option>
          {['Receipt','Payment','Contra','Journal'].map(t=><option key={t}>{t}</option>)}
        </select>
        {banks.length > 0 && (
          <select value={bankFilter} onChange={e=>setBankFilter(e.target.value)}
            style={{padding:'6px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,background:T.surface}}>
            <option value="">All Banks</option>
            {banks.map(b=><option key={b}>{b}</option>)}
          </select>
        )}
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{padding:'5px 8px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12}} />
        <span style={{color:T.muted}}>→</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{padding:'5px 8px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12}} />
        <button onClick={load} style={{padding:'6px 12px',background:T.teal,border:'none',borderRadius:7,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>{loading?'…':'⟳'}</button>
        <span style={{fontSize:11,color:T.muted,padding:'4px 0'}}>{filtered.length} records</span>
      </div>

      {/* Monthly Summary */}
      {months.length > 0 && (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 16px',marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:T.navy,marginBottom:8}}>📅 Monthly Summary</div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{borderBottom:`2px solid ${T.border}`}}>
                  {['Month','Receipts','Payments','Net','Contra','Txns'].map(h=>(
                    <th key={h} style={{padding:'6px 10px',textAlign:h==='Month'?'left':'right',color:T.muted,fontSize:9,textTransform:'uppercase',letterSpacing:'.5px',fontWeight:700}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {months.map(m=>(
                  <tr key={m.month} style={{borderBottom:`1px solid ${T.border}`}}>
                    <td style={{padding:'6px 10px',fontWeight:600,color:T.navy}}>{m.month}</td>
                    <td style={{padding:'6px 10px',textAlign:'right',color:T.green}}>{fmt(m.receipts)}</td>
                    <td style={{padding:'6px 10px',textAlign:'right',color:T.red}}>{fmt(m.payments)}</td>
                    <td style={{padding:'6px 10px',textAlign:'right',fontWeight:700,color:(m.receipts-m.payments)>=0?T.green:T.red}}>{fmt(m.receipts-m.payments)}</td>
                    <td style={{padding:'6px 10px',textAlign:'right',color:T.blue}}>{fmt(m.contra)}</td>
                    <td style={{padding:'6px 10px',textAlign:'right',color:T.muted}}>{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions table */}
      {loading ? (
        <div style={{textAlign:'center',padding:60,color:T.muted}}>Loading transactions…</div>
      ) : filtered.length===0 ? (
        <div style={{textAlign:'center',padding:60,background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,color:T.muted}}>No transactions found.</div>
      ) : (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:T.navy}}>
                {['Date','Type','Voucher','Party','Bank/Cash','Mode','Instrument','Amount','↓'].map(h=>(
                  <th key={h} style={{padding:'9px 10px',color:'rgba(255,255,255,.8)',textAlign:h==='Amount'||h==='↓'?'right':'left',fontSize:9,textTransform:'uppercase',letterSpacing:'.5px',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t,i)=>{
                const m=TYPE_META[t.voucher_type]||{col:T.muted,bg:'#F3F4F6',icon:'📄'};
                const isExp=expanded===i;
                return (<>
                  <tr key={t.voucher_number+i} onClick={()=>setExpanded(isExp?null:i)} style={{background:isExp?T.tealLight:i%2===0?'#fff':'#FAFFFE',borderBottom:`1px solid ${T.border}`,cursor:'pointer'}}>
                    <td style={{padding:'7px 10px',color:T.muted,whiteSpace:'nowrap'}}>{fmtD(t.voucher_date)}</td>
                    <td style={{padding:'7px 10px'}}>
                      <span style={{background:m.bg,color:m.col,padding:'2px 7px',borderRadius:10,fontSize:10,fontWeight:700}}>{m.icon} {t.voucher_type}</span>
                    </td>
                    <td style={{padding:'7px 10px',fontWeight:700,color:T.blue}}>{t.voucher_number}</td>
                    <td style={{padding:'7px 10px',maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:500}}>{t.party_name||'—'}</td>
                    <td style={{padding:'7px 10px',fontSize:10,color:T.muted,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.bank_ledger||'—'}</td>
                    <td style={{padding:'7px 10px',fontSize:10,color:T.muted}}>{t.payment_mode||'—'}</td>
                    <td style={{padding:'7px 10px',fontSize:10,fontWeight:600,color:T.blue}}>{t.instrument_no||'—'}</td>
                    <td style={{padding:'7px 10px',textAlign:'right',fontWeight:700,color:t.voucher_type==='Receipt'?T.green:t.voucher_type==='Payment'?T.red:T.blue}}>{t.total_amount>0?fmt(t.total_amount):'—'}</td>
                    <td style={{padding:'7px 10px',textAlign:'center',color:T.muted,fontSize:11}}>{isExp?'▲':'▼'}</td>
                  </tr>
                  {isExp&&(
                    <tr><td colSpan={9} style={{padding:'0 10px 10px',background:'#FAFFFE'}}>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,paddingTop:7}}>
                        {[
                          ['Payment Favouring', t.payment_favouring||'—'],
                          ['Transfer Mode', t.transfer_mode||'—'],
                          ['Instrument Date', fmtD(t.instrument_date)],
                          ['URN', t.urn||'—'],
                          ['Entered By', t.entered_by||'—'],
                          ['Narration', t.narration||'—'],
                          ['DR Amount', t.dr_amount>0?fmt(t.dr_amount):'—'],
                          ['CR Amount', t.cr_amount>0?fmt(t.cr_amount):'—'],
                        ].map(([k,v])=>(
                          <div key={k} style={{background:T.surface,borderRadius:4,padding:'4px 8px',border:`1px solid ${T.border}`}}>
                            <div style={{fontSize:8,color:T.muted,textTransform:'uppercase'}}>{k}</div>
                            <div style={{fontSize:10,color:T.text,marginTop:1,wordBreak:'break-all'}}>{v}</div>
                          </div>
                        ))}
                        {t.bill_allocations && (
                          <div style={{gridColumn:'span 4',background:T.surface,borderRadius:4,padding:'4px 8px',border:`1px solid ${T.border}`}}>
                            <div style={{fontSize:8,color:T.muted,textTransform:'uppercase',marginBottom:3}}>Bill Allocations</div>
                            <div style={{fontSize:10,color:T.text}}>
                              {(() => {
                                try {
                                  const allocs = typeof t.bill_allocations==='string' ? JSON.parse(t.bill_allocations) : t.bill_allocations;
                                  return (Array.isArray(allocs)?allocs:[]).map((a,ai)=>(
                                    <span key={ai} style={{display:'inline-block',background:T.tealLight,border:`1px solid ${T.border}`,borderRadius:4,padding:'2px 6px',margin:'2px',fontSize:9}}>
                                      {a.name} · {fmt(Math.abs(a.amount||0))}
                                      {a.broker_name && <span style={{color:T.orange}}> · {a.broker_name}</span>}
                                    </span>
                                  ));
                                } catch { return '—'; }
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </td></tr>
                  )}
                </>);
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
