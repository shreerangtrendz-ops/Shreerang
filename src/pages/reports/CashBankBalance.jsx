import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

const T = { teal:'#2BA898', navy:'#0B2E2B', green:'#1E9E5A', red:'#E74C3C', gold:'#E8A800',
            blue:'#2468C8', bg:'#F0F9F7', surface:'#fff', border:'#D0EDE8', text:'#0B2E2B', muted:'#6A9B95' };
const fmt = n => '\u20B9' + Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0});
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '-';

export default function CashBankBalance() {
  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState([]);
  const [cashBank, setCashBank] = useState([]);
  const [tab, setTab] = useState('transactions');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stats, setStats] = useState({receipts:0, payments:0, netFlow:0, count:0});

  const loadData = useCallback(async () => {
    setLoading(true);

    // Get tally vouchers (receipts + payments)
    let q = supabase.from('tally_vouchers')
      .select('*')
      .in('voucher_type', ['receipt','payment','Receipt','Payment'])
      .order('voucher_date', {ascending:false})
      .limit(500);
    if (dateFrom) q = q.gte('voucher_date', dateFrom);
    if (dateTo) q = q.lte('voucher_date', dateTo);
    const { data: vData } = await q;

    // Also get cash_bank_ledger
    const { data: cbData } = await supabase.from('cash_bank_ledger').select('*').order('account_name');

    const vList = vData || [];
    const receipts = vList.filter(v => v.voucher_type?.toLowerCase() === 'receipt');
    const payments = vList.filter(v => v.voucher_type?.toLowerCase() === 'payment');

    setVouchers(vList);
    setCashBank(cbData || []);
    setStats({
      receipts: receipts.reduce((s,v)=>s+(v.amount||0),0),
      payments: payments.reduce((s,v)=>s+(v.amount||0),0),
      netFlow: receipts.reduce((s,v)=>s+(v.amount||0),0) - payments.reduce((s,v)=>s+(v.amount||0),0),
      count: vList.length
    });
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = vouchers.filter(v => {
    const matchSearch = !search || (v.party_name||'').toLowerCase().includes(search.toLowerCase()) || (v.voucher_number||'').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || v.voucher_type?.toLowerCase() === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div style={{background:T.bg,minHeight:'100vh',padding:24}}>
      <Helmet><title>Cash & Bank — Shreerang</title></Helmet>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:T.navy,margin:0}}>🏦 Cash & Bank</h1>
          <p style={{color:T.muted,fontSize:13,margin:'4px 0 0'}}>Receipts, payments and account balances from Tally</p>
        </div>
        <button onClick={loadData} style={{padding:'8px 16px',background:T.teal,color:'#fff',border:'none',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer'}}>🔄 Refresh</button>
      </div>

      {/* Stats */}
      <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
        {[
          {label:'Total Receipts',value:fmt(stats.receipts),color:T.green,icon:'📥'},
          {label:'Total Payments',value:fmt(stats.payments),color:T.red,icon:'📤'},
          {label:'Net Cash Flow',value:fmt(Math.abs(stats.netFlow)),color:stats.netFlow>=0?T.green:T.red,icon:stats.netFlow>=0?'📈':'📉'},
          {label:'Transactions',value:stats.count,color:T.teal,icon:'🔄'},
        ].map(s=>(
          <div key={s.label} style={{background:T.surface,borderRadius:12,padding:'14px 18px',border:`1px solid ${T.border}`,flex:1,minWidth:130}}>
            <div style={{fontSize:20,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:11,color:T.muted,fontWeight:600}}>{s.label}</div>
            <div style={{fontSize:20,fontWeight:800,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Account Balances */}
      {cashBank.length > 0 && (
        <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,padding:20,marginBottom:20}}>
          <h3 style={{fontSize:14,fontWeight:700,color:T.navy,margin:'0 0 14px'}}>🏦 Account Balances</h3>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            {cashBank.map(acc=>(
              <div key={acc.id} style={{background:T.bg,borderRadius:8,padding:'12px 16px',border:`1px solid ${T.border}`,minWidth:160}}>
                <div style={{fontSize:11,color:T.muted,fontWeight:600}}>{acc.account_type?.toUpperCase()}</div>
                <div style={{fontSize:14,fontWeight:700,color:T.text,marginTop:2}}>{acc.account_name}</div>
                <div style={{fontSize:18,fontWeight:800,color:T.green,marginTop:4}}>{fmt(acc.balance)}</div>
                {acc.tally_ledger_name && <div style={{fontSize:10,color:T.muted,marginTop:2}}>{acc.tally_ledger_name}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:'flex',gap:2,marginBottom:16}}>
        {['transactions','summary'].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:'8px 18px',borderRadius:8,border:`1px solid ${T.border}`,background:tab===t?T.teal:T.surface,color:tab===t?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer',textTransform:'capitalize'}}>
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{background:T.surface,borderRadius:10,padding:14,border:`1px solid ${T.border}`,marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <input placeholder="Search party / voucher..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,flex:1,minWidth:180,outline:'none'}}/>
        {['all','receipt','payment'].map(f=>(
          <button key={f} onClick={()=>setTypeFilter(f)}
            style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${T.border}`,background:typeFilter===f?T.teal:T.surface,color:typeFilter===f?'#fff':T.text,fontWeight:600,fontSize:12,cursor:'pointer',textTransform:'capitalize'}}>
            {f==='all'?'All':f}
          </button>
        ))}
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
          style={{padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:'none'}}/>
        <span style={{color:T.muted,fontSize:13}}>to</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
          style={{padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:'none'}}/>
      </div>

      {/* Transactions Table */}
      {tab === 'transactions' && (
        <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden'}}>
          <div style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,fontSize:12,color:T.muted,fontWeight:600}}>
            {filtered.length} transactions
          </div>
          {loading ? (
            <div style={{padding:40,textAlign:'center',color:T.muted}}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:T.muted}}>
              <div style={{fontSize:32,marginBottom:8}}>🏦</div>
              <div>No transactions found. Sync from Tally Sync page to import receipts & payments.</div>
            </div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:T.bg}}>
                  {['Voucher #','Date','Party','Type','Amount'].map(h=>(
                    <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',borderBottom:`1px solid ${T.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v,i)=>(
                  <tr key={v.id} style={{background:i%2===0?T.surface:T.bg}}>
                    <td style={{padding:'10px 14px',fontSize:13,fontWeight:600,color:T.teal}}>{v.voucher_number||'-'}</td>
                    <td style={{padding:'10px 14px',fontSize:13}}>{fmtDate(v.voucher_date)}</td>
                    <td style={{padding:'10px 14px',fontSize:13,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.party_name||'-'}</td>
                    <td style={{padding:'10px 14px'}}>
                      <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:v.voucher_type?.toLowerCase()==='receipt'?'#D1FAE5':'#FEE2E2',color:v.voucher_type?.toLowerCase()==='receipt'?'#065F46':'#991B1B'}}>
                        {v.voucher_type}
                      </span>
                    </td>
                    <td style={{padding:'10px 14px',fontSize:14,fontWeight:800,color:v.voucher_type?.toLowerCase()==='receipt'?T.green:T.red}}>{fmt(v.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Summary tab - daily */}
      {tab === 'summary' && (
        <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,padding:20}}>
          <h3 style={{fontSize:14,fontWeight:700,color:T.navy,margin:'0 0 14px'}}>Daily Summary</h3>
          {(() => {
            const dayMap = {};
            vouchers.forEach(v => {
              const day = v.voucher_date?.split('T')[0] || v.voucher_date;
              if (!day) return;
              if (!dayMap[day]) dayMap[day] = {receipts:0, payments:0};
              if (v.voucher_type?.toLowerCase()==='receipt') dayMap[day].receipts += v.amount||0;
              else dayMap[day].payments += v.amount||0;
            });
            return Object.entries(dayMap).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,30).map(([day,d])=>(
              <div key={day} style={{display:'flex',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${T.border}`,gap:16}}>
                <div style={{fontSize:13,fontWeight:600,color:T.text,width:120}}>{fmtDate(day)}</div>
                <div style={{fontSize:13,color:T.green,flex:1}}>In: {fmt(d.receipts)}</div>
                <div style={{fontSize:13,color:T.red,flex:1}}>Out: {fmt(d.payments)}</div>
                <div style={{fontSize:13,fontWeight:700,color:d.receipts-d.payments>=0?T.green:T.red}}>Net: {fmt(Math.abs(d.receipts-d.payments))}</div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
