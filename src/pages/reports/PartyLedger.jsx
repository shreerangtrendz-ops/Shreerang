import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

const T = { teal:'#2BA898', navy:'#0B2E2B', green:'#1E9E5A', red:'#E74C3C', gold:'#E8A800',
            blue:'#2468C8', bg:'#F0F9F7', surface:'#fff', border:'#D0EDE8', text:'#0B2E2B', muted:'#6A9B95' };
const fmt = n => '\u20B9' + Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0});
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'2-digit'}) : '-';

export default function PartyLedgerPage() {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [ledger, setLedger] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [summary, setSummary] = useState({debit:0, credit:0, balance:0, count:0});

  useEffect(() => {
    supabase.from('customers').select('id,name,tally_ledger_name,phone,city,state').order('name').limit(500)
      .then(({data}) => setCustomers(data||[]));
  }, []);

  const loadLedger = useCallback(async (party) => {
    if (!party) return;
    setLoading(true);

    // Get sales bills for this party
    const { data: sales } = await supabase.from('sales_bills')
      .select('*').ilike('customer_name', `%${party}%`)
      .order('bill_date', {ascending:true});

    // Get purchase bills for this party (if supplier)
    const { data: purchases } = await supabase.from('purchase_bills')
      .select('*').ilike('supplier_name', `%${party}%`)
      .order('bill_date', {ascending:true});

    // Get vouchers (receipts/payments)
    const { data: vouchers } = await supabase.from('tally_vouchers')
      .select('*').ilike('party_name', `%${party}%`)
      .order('voucher_date', {ascending:true});

    // Build unified ledger
    const entries = [];
    (sales||[]).forEach(b => entries.push({
      date: b.bill_date, type:'Sales', ref: b.bill_number, debit: b.total_amount||0, credit:0, narration: b.notes||'Sales Bill'
    }));
    (purchases||[]).forEach(b => entries.push({
      date: b.bill_date, type:'Purchase', ref: b.bill_number, debit:0, credit: b.total_amount||0, narration: b.notes||'Purchase Bill'
    }));
    (vouchers||[]).forEach(v => {
      const isReceipt = v.voucher_type?.toLowerCase() === 'receipt';
      entries.push({
        date: v.voucher_date, type: v.voucher_type, ref: v.voucher_number||'-',
        debit: isReceipt ? v.amount||0 : 0,
        credit: !isReceipt ? v.amount||0 : 0,
        narration: v.narration||v.voucher_type
      });
    });

    // Sort by date
    entries.sort((a,b) => (a.date||'').localeCompare(b.date||''));

    // Calculate running balance
    let balance = 0;
    const withBalance = entries.map(e => {
      balance += (e.debit - e.credit);
      return {...e, balance};
    });

    setLedger(withBalance);
    const totalDebit = entries.reduce((s,e) => s+e.debit, 0);
    const totalCredit = entries.reduce((s,e) => s+e.credit, 0);
    setSummary({debit:totalDebit, credit:totalCredit, balance:totalDebit-totalCredit, count:entries.length});
    setLoading(false);
  }, []);

  useEffect(() => { if (selectedParty) loadLedger(selectedParty); }, [selectedParty, loadLedger]);

  const filteredCustomers = customers.filter(c => 
    !partySearch || (c.name||'').toLowerCase().includes(partySearch.toLowerCase())
  );

  const filteredLedger = ledger.filter(e => {
    const matchDate = (!dateFrom || (e.date||'') >= dateFrom) && (!dateTo || (e.date||'') <= dateTo);
    const matchSearch = !search || (e.ref||'').toLowerCase().includes(search.toLowerCase()) || (e.narration||'').toLowerCase().includes(search.toLowerCase());
    return matchDate && matchSearch;
  });

  const handleExport = () => {
    const csv = ['Date,Type,Reference,Debit,Credit,Balance,Narration',
      ...filteredLedger.map(e => `${e.date},${e.type},${e.ref},${e.debit},${e.credit},${e.balance},"${e.narration}"`)
    ].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`Ledger_${selectedParty}_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <div style={{background:T.bg,minHeight:'100vh',padding:24}}>
      <Helmet><title>Party Ledger — Shreerang</title></Helmet>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:T.navy,margin:0}}>📒 Party Ledger</h1>
          <p style={{color:T.muted,fontSize:13,margin:'4px 0 0'}}>Full transaction statement for any customer or supplier</p>
        </div>
        {selectedParty && (
          <button onClick={handleExport} style={{padding:'8px 16px',background:T.green,color:'#fff',border:'none',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer'}}>
            📥 Export CSV
          </button>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:16}}>
        {/* Party List */}
        <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden',height:'fit-content',maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
          <div style={{padding:12,borderBottom:`1px solid ${T.border}`}}>
            <input placeholder="Search customer..." value={partySearch} onChange={e=>setPartySearch(e.target.value)}
              style={{padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,width:'100%',boxSizing:'border-box',outline:'none'}}/>
          </div>
          <div style={{overflow:'auto',flex:1}}>
            {filteredCustomers.map(c=>(
              <div key={c.id} onClick={()=>setSelectedParty(c.name||c.tally_ledger_name)}
                style={{padding:'10px 14px',cursor:'pointer',borderBottom:`1px solid ${T.border}`,background:selectedParty===(c.name||c.tally_ledger_name)?T.teal+'15':'transparent',borderLeft:selectedParty===(c.name||c.tally_ledger_name)?`3px solid ${T.teal}`:'3px solid transparent'}}
                onMouseEnter={e=>e.currentTarget.style.background=T.teal+'10'}
                onMouseLeave={e=>e.currentTarget.style.background=selectedParty===(c.name||c.tally_ledger_name)?T.teal+'15':'transparent'}>
                <div style={{fontSize:13,fontWeight:600,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name||c.tally_ledger_name}</div>
                <div style={{fontSize:11,color:T.muted}}>{c.city||''} {c.state||''}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ledger */}
        <div>
          {!selectedParty ? (
            <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,padding:40,textAlign:'center',color:T.muted}}>
              <div style={{fontSize:48,marginBottom:12}}>📒</div>
              <div style={{fontSize:16,fontWeight:600}}>Select a customer</div>
              <div style={{fontSize:13,marginTop:4}}>Choose from the list to view their full ledger</div>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div style={{display:'flex',gap:12,marginBottom:16}}>
                {[
                  {label:'Total Debit',value:fmt(summary.debit),color:T.red},
                  {label:'Total Credit',value:fmt(summary.credit),color:T.green},
                  {label:'Balance',value:fmt(Math.abs(summary.balance)),color:summary.balance>0?T.red:T.green,sub:summary.balance>0?'Receivable':'Payable'},
                  {label:'Entries',value:summary.count,color:T.teal},
                ].map(s=>(
                  <div key={s.label} style={{background:T.surface,borderRadius:10,padding:'12px 16px',border:`1px solid ${T.border}`,flex:1}}>
                    <div style={{fontSize:11,color:T.muted,fontWeight:600}}>{s.label}</div>
                    <div style={{fontSize:18,fontWeight:800,color:s.color}}>{s.value}</div>
                    {s.sub && <div style={{fontSize:10,color:T.muted}}>{s.sub}</div>}
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{background:T.surface,borderRadius:10,padding:12,border:`1px solid ${T.border}`,marginBottom:12,display:'flex',gap:10,alignItems:'center'}}>
                <input placeholder="Search ref / narration..." value={search} onChange={e=>setSearch(e.target.value)}
                  style={{padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,flex:1,outline:'none'}}/>
                <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
                  style={{padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:'none'}}/>
                <span style={{color:T.muted}}>to</span>
                <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
                  style={{padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:'none'}}/>
              </div>

              {/* Ledger Table */}
              <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden'}}>
                {loading ? (
                  <div style={{padding:40,textAlign:'center',color:T.muted}}>Loading ledger...</div>
                ) : filteredLedger.length === 0 ? (
                  <div style={{padding:40,textAlign:'center',color:T.muted}}>No transactions found for {selectedParty}</div>
                ) : (
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:T.bg}}>
                        {['Date','Type','Reference','Debit','Credit','Balance','Narration'].map(h=>(
                          <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',borderBottom:`1px solid ${T.border}`}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLedger.map((e,i)=>(
                        <tr key={i} style={{background:i%2===0?T.surface:T.bg}}>
                          <td style={{padding:'8px 12px',fontSize:12,whiteSpace:'nowrap'}}>{fmtDate(e.date)}</td>
                          <td style={{padding:'8px 12px'}}>
                            <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:20,background:e.type==='Sales'?'#DBEAFE':e.type==='Purchase'?'#FEE2E2':'#D1FAE5',color:e.type==='Sales'?T.blue:e.type==='Purchase'?T.red:T.green}}>
                              {e.type}
                            </span>
                          </td>
                          <td style={{padding:'8px 12px',fontSize:12,fontWeight:600,color:T.teal}}>{e.ref}</td>
                          <td style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:T.red}}>{e.debit>0?fmt(e.debit):'-'}</td>
                          <td style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:T.green}}>{e.credit>0?fmt(e.credit):'-'}</td>
                          <td style={{padding:'8px 12px',fontSize:12,fontWeight:800,color:e.balance>0?T.red:T.green}}>{fmt(Math.abs(e.balance))}</td>
                          <td style={{padding:'8px 12px',fontSize:11,color:T.muted,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.narration}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{background:T.navy}}>
                        <td colSpan={3} style={{padding:'10px 12px',fontSize:12,fontWeight:700,color:'#fff'}}>TOTAL</td>
                        <td style={{padding:'10px 12px',fontSize:13,fontWeight:800,color:'#FECACA'}}>{fmt(filteredLedger.reduce((s,e)=>s+e.debit,0))}</td>
                        <td style={{padding:'10px 12px',fontSize:13,fontWeight:800,color:'#BBF7D0'}}>{fmt(filteredLedger.reduce((s,e)=>s+e.credit,0))}</td>
                        <td colSpan={2} style={{padding:'10px 12px',fontSize:13,fontWeight:800,color:'#fff'}}>{fmt(Math.abs(summary.balance))} {summary.balance>0?'(Dr)':'(Cr)'}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
