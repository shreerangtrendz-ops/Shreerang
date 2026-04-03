import { useState, useEffect, useCallback } from 'react';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

/* Party Ledger — reads all real tables for both customer and supplier accounts */

const T = {
  navy:'#0B2E2B', teal:'#2BA898', tealLight:'#EEF8F6',
  green:'#1E9E5A', red:'#E74C3C', orange:'#E67E22',
  blue:'#2468C8', gold:'#E8A800', border:'#D0EDE8',
  bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B', muted:'#6A9B95',
};
const fmt  = n => '₹' + Math.round(Number(n||0)).toLocaleString('en-IN');
const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';

export default function PartyLedger() {
  const [partyInput, setPartyInput]   = useState('');
  const [partyType, setPartyType]     = useState('customer'); // customer | supplier | both
  const [dateFrom, setDateFrom]       = useState('2025-04-01');
  const [dateTo, setDateTo]           = useState(new Date().toISOString().slice(0,10));
  const [entries, setEntries]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug]         = useState(false);

  // Auto-suggest parties
  useEffect(() => {
    if (!partyInput || partyInput.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      const [cust, supp] = await Promise.all([
        supabase.from('sales_bills').select('customer_name').ilike('customer_name',`%${partyInput}%`).limit(8),
        supabase.from('grey_purchase').select('supplier_name').ilike('supplier_name',`%${partyInput}%`).limit(5),
      ]);
      const names = [
        ...new Set([
          ...(cust.data||[]).map(r=>r.customer_name),
          ...(supp.data||[]).map(r=>r.supplier_name),
        ])
      ].filter(Boolean).slice(0,10);
      setSuggestions(names);
      setShowSug(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [partyInput]);

  const loadLedger = useCallback(async () => {
    if (!partyInput.trim()) return;
    setLoading(true);
    const p = partyInput.trim();
    const df = dateFrom, dt = dateTo;

    const [salesR, receiptR, cnR, purchR, payR, dnR, jwR] = await Promise.all([
      // Customer side
      supabase.from('sales_bills').select('bill_number,bill_date,total_amount,taxable_value,broker_name,comm_amount,design_no,quantity_mtrs,tally_voucher_no,narration,igst_amount,cgst_amount,sgst_amount').ilike('customer_name',`%${p}%`).gte('bill_date',df).lte('bill_date',dt).order('bill_date',{ascending:true}),
      supabase.from('accounting_vouchers').select('voucher_number,voucher_type,voucher_date,total_amount,bank_ledger,instrument_no,payment_mode,narration').ilike('party_name',`%${p}%`).in('voucher_type',['Receipt','Payment','Journal']).gte('voucher_date',df).lte('voucher_date',dt).order('voucher_date',{ascending:true}),
      supabase.from('credit_note').select('tally_voucher_no,voucher_date,party_amount,original_voucher_no,narration').ilike('party_name',`%${p}%`).gte('voucher_date',df).lte('voucher_date',dt).order('voucher_date',{ascending:true}),
      // Supplier side
      supabase.from('grey_purchase').select('supplier_invoice_no,voucher_date,total_amount,item_name,actual_qty_mtrs,lot_no,tally_voucher_no,narration').ilike('supplier_name',`%${p}%`).gte('voucher_date',df).lte('voucher_date',dt).order('voucher_date',{ascending:true}),
      supabase.from('accounting_vouchers').select('voucher_number,voucher_type,voucher_date,total_amount,bank_ledger,instrument_no,payment_mode,narration').ilike('party_name',`%${p}%`).eq('voucher_type','Payment').gte('voucher_date',df).lte('voucher_date',dt).order('voucher_date',{ascending:true}),
      supabase.from('debit_note').select('tally_voucher_no,voucher_date,party_amount,original_bill_ref,narration,expense_ledger').ilike('party_name',`%${p}%`).gte('voucher_date',df).lte('voucher_date',dt).order('voucher_date',{ascending:true}),
      supabase.from('jobwork_expenses').select('voucher_number,voucher_type,voucher_date,total_amount,supplier_invoice_no,expense_ledger,narration').ilike('party_name',`%${p}%`).gte('voucher_date',df).lte('voucher_date',dt).order('voucher_date',{ascending:true}),
    ]);

    const all = [];
    // Sales = Dr to customer (they owe us)
    (salesR.data||[]).forEach(r=>all.push({date:r.bill_date,type:'Sales Bill',ref:r.bill_number,dr:r.total_amount,cr:0,design:r.design_no,broker:r.broker_name,narration:r.narration,detail:r}));
    // Receipts from customer = Cr (they paid)
    (receiptR.data||[]).filter(r=>r.voucher_type==='Receipt').forEach(r=>all.push({date:r.voucher_date,type:'Receipt',ref:r.voucher_number,dr:0,cr:r.total_amount,narration:r.narration||r.payment_mode,detail:r}));
    // Credit Notes = Cr (we owe them back)
    (cnR.data||[]).forEach(r=>all.push({date:r.voucher_date,type:'Credit Note',ref:r.tally_voucher_no,dr:0,cr:r.party_amount,narration:r.narration||`Agst ${r.original_voucher_no}`,detail:r}));
    // Purchases = Cr from supplier (we owe them)
    (purchR.data||[]).forEach(r=>all.push({date:r.voucher_date,type:'Purchase',ref:r.supplier_invoice_no,dr:0,cr:r.total_amount,narration:r.narration||r.item_name,detail:r}));
    // Payments to supplier = Dr (we paid)
    (payR.data||[]).filter(r=>r.voucher_type==='Payment').forEach(r=>all.push({date:r.voucher_date,type:'Payment',ref:r.voucher_number,dr:r.total_amount,cr:0,narration:r.narration||r.payment_mode,detail:r}));
    // Debit Notes = Dr (they owe us reduction)
    (dnR.data||[]).forEach(r=>all.push({date:r.voucher_date,type:'Debit Note',ref:r.tally_voucher_no,dr:r.party_amount,cr:0,narration:r.narration||r.expense_ledger,detail:r}));
    // Jobwork bills = Cr (we owe mill)
    (jwR.data||[]).forEach(r=>all.push({date:r.voucher_date,type:'Jobwork',ref:r.supplier_invoice_no||r.voucher_number,dr:0,cr:r.total_amount,narration:r.narration||r.expense_ledger,detail:r}));

    all.sort((a,b)=>a.date>b.date?1:-1);

    // Running balance
    let bal = 0;
    all.forEach(e => { bal += e.dr - e.cr; e.balance = bal; });

    setEntries(all);
    setLoading(false);
  }, [partyInput, partyType, dateFrom, dateTo]);

  const totalDr  = entries.reduce((s,e)=>s+e.dr,0);
  const totalCr  = entries.reduce((s,e)=>s+e.cr,0);
  const balance  = totalDr - totalCr;

  const exportCSV = () => {
    const rows = ['Date,Type,Reference,Dr,Cr,Balance,Narration',
      ...entries.map(e=>[e.date,e.type,e.ref,e.dr||0,e.cr||0,e.balance||0,`"${(e.narration||'').replace(/"/g,"'")}"`].join(','))
    ].join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows],{type:'text/csv'}));a.download=`Ledger_${partyInput.replace(/ /g,'_')}_${dateFrom}_${dateTo}.csv`;a.click();
  };

  const TYPE_COLOR = {
    'Sales Bill':  {col:'#1D4ED8',bg:'#DBEAFE'},
    'Receipt':     {col:'#065F46',bg:'#D1FAE5'},
    'Credit Note': {col:'#9D174D',bg:'#FCE7F3'},
    'Purchase':    {col:'#991B1B',bg:'#FEE2E2'},
    'Payment':     {col:'#92400E',bg:'#FEF3C7'},
    'Debit Note':  {col:'#C2410C',bg:'#FFF7ED'},
    'Jobwork':     {col:'#B45309',bg:'#FEF3C7'},
  };

  return (
    <div style={{minHeight:'100vh',background:T.bg,padding:'20px 24px',fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:800,color:T.navy,margin:0}}>📒 Party Ledger</h1>
        <p style={{fontSize:12,color:T.muted,margin:'4px 0 0'}}>Running account for any customer or supplier · All transaction types</p>
      </div>

      {/* Search */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'14px 16px',marginBottom:16}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div style={{flex:'1 1 200px',minWidth:0,position:'relative'}}>
            <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>Party Name</div>
            <input value={partyInput} onChange={e=>{setPartyInput(e.target.value);setShowSug(true);}}
              onBlur={()=>setTimeout(()=>setShowSug(false),200)}
              placeholder="Type customer or supplier name…"
              style={{width:'100%',padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:13,boxSizing:'border-box'}} />
            {showSug && suggestions.length>0 && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,background:T.surface,border:`1px solid ${T.border}`,borderRadius:7,boxShadow:'0 4px 16px rgba(0,0,0,.1)',zIndex:100,maxHeight:200,overflow:'auto'}}>
                {suggestions.map(s=>(
                  <div key={s} onClick={()=>{setPartyInput(s);setShowSug(false);}}
                    style={{padding:'8px 12px',cursor:'pointer',fontSize:13,borderBottom:`1px solid ${T.border}`,color:T.text}}
                    onMouseEnter={e=>e.target.style.background=T.tealLight}
                    onMouseLeave={e=>e.target.style.background='transparent'}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>From</div>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12}} />
          </div>
          <div>
            <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4,textTransform:'uppercase'}}>To</div>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{padding:'7px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12}} />
          </div>
          <button onClick={loadLedger} disabled={loading||!partyInput.trim()}
            style={{padding:'8px 20px',background:partyInput.trim()?T.teal:'#ccc',border:'none',borderRadius:7,color:'#fff',fontWeight:700,fontSize:13,cursor:partyInput.trim()?'pointer':'not-allowed',alignSelf:'flex-end'}}>
            {loading?'Loading…':'📒 Load Ledger'}
          </button>
          {entries.length>0 && <button onClick={exportCSV} style={{padding:'8px 16px',background:T.green,border:'none',borderRadius:7,color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer',alignSelf:'flex-end'}}>📥 Export</button>}
        </div>
      </div>

      {/* Summary KPIs */}
      {entries.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
          {[
            {l:'Total Debit (Dr)',v:fmt(totalDr),c:T.blue,ic:'📤',sub:'Bills raised / payments made'},
            {l:'Total Credit (Cr)',v:fmt(totalCr),c:T.green,ic:'📥',sub:'Payments received / purchases'},
            {l:'Net Balance',v:fmt(Math.abs(balance)),c:balance>0?T.red:T.green,ic:balance>0?'🔴':'🟢',sub:balance>0?'Receivable (Dr balance)':'Payable (Cr balance)'},
            {l:'Transactions',v:String(entries.length),c:T.teal,ic:'📋',sub:`${partyInput}`},
          ].map(k=>(
            <div key={k.l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 16px',borderTop:`3px solid ${k.c}`}}>
              <div style={{fontSize:18}}>{k.ic}</div>
              <div style={{fontSize:18,fontWeight:800,color:T.navy}}>{k.v}</div>
              <div style={{fontSize:11,fontWeight:600,color:T.text}}>{k.l}</div>
              <div style={{fontSize:9,color:T.muted,marginTop:1}}>{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Ledger Table */}
      {entries.length > 0 && (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:T.navy}}>
                {['Date','Type','Reference','Design/Broker','Narration','Dr (₹)','Cr (₹)','Balance (₹)'].map((h,hi)=>(
                  <th key={h} style={{padding:'9px 10px',color:'rgba(255,255,255,.8)',textAlign:hi>=5?'right':'left',fontSize:9,textTransform:'uppercase',letterSpacing:'.5px',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e,i)=>{
                const m = TYPE_COLOR[e.type]||{col:T.muted,bg:'#F3F4F6'};
                const balColor = e.balance>0?T.red:e.balance<0?T.green:T.muted;
                return (
                  <tr key={e.ref+i} style={{background:i%2===0?'#fff':'#FAFFFE',borderBottom:`1px solid ${T.border}`}}>
                    <td style={{padding:'7px 10px',color:T.muted,whiteSpace:'nowrap'}}>{fmtD(e.date)}</td>
                    <td style={{padding:'7px 10px'}}>
                      <span style={{background:m.bg,color:m.col,padding:'2px 7px',borderRadius:10,fontSize:10,fontWeight:700}}>{e.type}</span>
                    </td>
                    <td style={{padding:'7px 10px',fontWeight:700,color:T.blue}}>{e.ref||'—'}</td>
                    <td style={{padding:'7px 10px',fontSize:10,color:T.orange}}>{e.design?`D No-${e.design}`:e.broker||'—'}</td>
                    <td style={{padding:'7px 10px',fontSize:10,color:T.muted,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.narration||'—'}</td>
                    <td style={{padding:'7px 10px',textAlign:'right',fontWeight:e.dr?700:400,color:e.dr?T.blue:T.muted}}>{e.dr?fmt(e.dr):'—'}</td>
                    <td style={{padding:'7px 10px',textAlign:'right',fontWeight:e.cr?700:400,color:e.cr?T.green:T.muted}}>{e.cr?fmt(e.cr):'—'}</td>
                    <td style={{padding:'7px 10px',textAlign:'right',fontWeight:700,color:balColor}}>{fmt(Math.abs(e.balance))} {e.balance>0?'Dr':e.balance<0?'Cr':''}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{background:T.tealLight,borderTop:`2px solid ${T.teal}`}}>
                <td colSpan={5} style={{padding:'9px 10px',fontWeight:700,color:T.navy}}>CLOSING BALANCE</td>
                <td style={{padding:'9px 10px',textAlign:'right',fontWeight:800,color:T.blue}}>{fmt(totalDr)}</td>
                <td style={{padding:'9px 10px',textAlign:'right',fontWeight:800,color:T.green}}>{fmt(totalCr)}</td>
                <td style={{padding:'9px 10px',textAlign:'right',fontWeight:800,color:balance>0?T.red:T.green,fontSize:14}}>{fmt(Math.abs(balance))} {balance>0?'Dr':'Cr'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {!loading && entries.length===0 && partyInput && (
        <div style={{textAlign:'center',padding:60,background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,color:T.muted}}>
          <div style={{fontSize:32,marginBottom:8}}>📒</div>
          <div>No transactions found for "{partyInput}" in this period.</div>
        </div>
      )}
    </div>
  );
}
