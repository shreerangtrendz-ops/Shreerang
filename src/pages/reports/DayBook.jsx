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

const TYPE_META = {
  'Sales':{'bg':'#DBEAFE','col':'#1D4ED8','icon':'📤','credit':true},
  'Purchase':{'bg':'#FEE2E2','col':'#991B1B','icon':'📥','credit':false},
  'Grey Purchase':{'bg':'#EDE9FE','col':'#5B21B6','icon':'🧵','credit':false},
  'Receipt':{'bg':'#D1FAE5','col':'#065F46','icon':'💚','credit':true},
  'Payment':{'bg':'#FEF3C7','col':'#92400E','icon':'💸','credit':false},
  'Contra':{'bg':'#DBEAFE','col':'#1D4ED8','icon':'🔄','credit':null},
  'Journal':{'bg':'#F3F4F6','col':'#374151','icon':'📒','credit':null},
  'Credit Note':{'bg':'#FCE7F3','col':'#9D174D','icon':'📋','credit':false},
  'Debit Note':{'bg':'#FFF7ED','col':'#C2410C','icon':'📝','credit':true},
  'Jobwork':{'bg':'#FEF3C7','col':'#B45309','icon':'🧾','credit':false},
  'Expenses':{'bg':'#FEF3C7','col':'#B45309','icon':'🧾','credit':false},
  'Issue to Mill':{'bg':'#FFF7ED','col':'#C2410C','icon':'🏭','credit':null},
  'REC from Mill':{'bg':'#F0FDF4','col':'#15803D','icon':'🏗','credit':null},
  'Stock Journal':{'bg':'#F3F4F6','col':'#374151','icon':'📒','credit':null},
};

function TypeChip({ type }) {
  const m = TYPE_META[type] || {bg:'#F3F4F6',col:'#374151',icon:'📄'};
  return (
    <span style={{background:m.bg,color:m.col,padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:700,whiteSpace:'nowrap'}}>
      {m.icon} {type}
    </span>
  );
}

function todayISO() { return new Date().toISOString().slice(0,10); }

export default function DayBook() {
  const [entries, setEntries]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom]     = useState(todayISO());
  const [dateTo, setDateTo]         = useState(todayISO());
  const [expanded, setExpanded]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const df = dateFrom, dt = dateTo;
    const [salesR,purchR,greyR,acctR,jwR,cnR,dnR,issR,recR,sjR] = await Promise.all([
      supabase.from('sales_bills').select('bill_number,bill_date,customer_name,total_amount,broker_name,comm_amount,design_no,fabric_name,quantity_mtrs,irn,entered_by,tally_voucher_no,narration,igst_amount,cgst_amount,sgst_amount').gte('bill_date',df).lte('bill_date',dt).order('bill_date',{ascending:false}),
      supabase.from('purchase_bills').select('bill_number,bill_date,supplier_name,total_amount,broker_name,entered_by,tally_voucher_no,narration,igst_amount,cgst_amount,sgst_amount').gte('bill_date',df).lte('bill_date',dt).order('bill_date',{ascending:false}),
      supabase.from('grey_purchase').select('supplier_invoice_no,voucher_date,supplier_name,total_amount,item_name,actual_qty_mtrs,rate,lot_no,broker_name,tally_voucher_no,narration').gte('voucher_date',df).lte('voucher_date',dt).order('voucher_date',{ascending:false}),
      supabase.from('accounting_vouchers').select('voucher_number,voucher_type,voucher_date,party_name,total_amount,bank_ledger,instrument_no,payment_mode,urn,entered_by,narration').gte('voucher_date',df).lte('voucher_date',dt).order('voucher_date',{ascending:false}),
      supabase.from('jobwork_expenses').select('voucher_number,voucher_type,voucher_date,party_name,total_amount,expense_ledger,expense_amount,entered_by,narration,supplier_invoice_no').gte('voucher_date',df).lte('voucher_date',dt).order('voucher_date',{ascending:false}),
      supabase.from('credit_note').select('tally_voucher_no,voucher_date,party_name,party_amount,original_voucher_no,entered_by,narration').gte('voucher_date',df).lte('voucher_date',dt).order('voucher_date',{ascending:false}),
      supabase.from('debit_note').select('tally_voucher_no,voucher_date,party_name,party_amount,original_bill_ref,entered_by,narration,expense_ledger,expense_amount').gte('voucher_date',df).lte('voucher_date',dt).order('voucher_date',{ascending:false}),
      supabase.from('issue_to_mill').select('tally_voucher_no,voucher_date,mill_name,amount,item_name,qty_mtrs,lot_no,narration').gte('voucher_date',df).lte('voucher_date',dt).order('voucher_date',{ascending:false}),
      supabase.from('rec_from_mill').select('tally_voucher_no,voucher_date,mill_name,gross_amount,finish_item_name,finish_qty_mtrs,design_no,lot_no,shortage_pct,narration').gte('voucher_date',df).lte('voucher_date',dt).order('voucher_date',{ascending:false}),
      supabase.from('stock_journal').select('tally_voucher_no,voucher_date,grey_item_name,grey_qty_mtrs,finished_qty_mtrs,design_no,lot_no,narration').gte('voucher_date',df).lte('voucher_date',dt).order('voucher_date',{ascending:false}),
    ]);
    const all = [];
    (salesR.data||[]).forEach(r=>all.push({date:r.bill_date,type:'Sales',ref:r.bill_number,party:r.customer_name,amount:r.total_amount,broker:r.broker_name,design:r.design_no,entered_by:r.entered_by,tally_vch:r.tally_voucher_no,narration:r.narration||r.fabric_name,detail:r,sub:`${r.quantity_mtrs||0}m · IGST:${fmt(r.igst_amount||0)} CGST:${fmt(r.cgst_amount||0)}`}));
    (purchR.data||[]).forEach(r=>all.push({date:r.bill_date,type:'Purchase',ref:r.bill_number,party:r.supplier_name,amount:r.total_amount,broker:r.broker_name,entered_by:r.entered_by,tally_vch:r.tally_voucher_no,narration:r.narration,detail:r,sub:`IGST:${fmt(r.igst_amount||0)} CGST:${fmt(r.cgst_amount||0)} SGST:${fmt(r.sgst_amount||0)}`}));
    (greyR.data||[]).forEach(r=>all.push({date:r.voucher_date,type:'Grey Purchase',ref:r.supplier_invoice_no,party:r.supplier_name,amount:r.total_amount,broker:r.broker_name,tally_vch:r.tally_voucher_no,narration:r.narration||r.item_name,detail:r,sub:`Lot:${r.lot_no||'—'} · ${r.actual_qty_mtrs||0}m @₹${r.rate||0}/m`}));
    (acctR.data||[]).forEach(r=>all.push({date:r.voucher_date,type:r.voucher_type,ref:r.voucher_number,party:r.party_name,amount:r.total_amount,entered_by:r.entered_by,tally_vch:r.voucher_number,narration:r.narration,detail:r,sub:`Bank:${r.bank_ledger||'—'} · ${r.payment_mode||'—'} · Instr:${r.instrument_no||'—'}`}));
    (jwR.data||[]).forEach(r=>all.push({date:r.voucher_date,type:r.voucher_type||'Jobwork',ref:r.voucher_number,party:r.party_name,amount:r.total_amount,entered_by:r.entered_by,tally_vch:r.voucher_number,narration:r.narration||r.expense_ledger,detail:r,sub:`Inv:${r.supplier_invoice_no||'—'} · ${r.expense_ledger||'—'}:${fmt(r.expense_amount||0)}`}));
    (cnR.data||[]).forEach(r=>all.push({date:r.voucher_date,type:'Credit Note',ref:r.tally_voucher_no,party:r.party_name,amount:r.party_amount,entered_by:r.entered_by,tally_vch:r.tally_voucher_no,narration:r.narration,detail:r,sub:`Against:${r.original_voucher_no||'—'}`}));
    (dnR.data||[]).forEach(r=>all.push({date:r.voucher_date,type:'Debit Note',ref:r.tally_voucher_no,party:r.party_name,amount:r.party_amount,entered_by:r.entered_by,tally_vch:r.tally_voucher_no,narration:r.narration,detail:r,sub:`Against:${r.original_bill_ref||'—'} · ${r.expense_ledger||'—'}`}));
    (issR.data||[]).forEach(r=>all.push({date:r.voucher_date,type:'Issue to Mill',ref:r.tally_voucher_no||r.lot_no,party:r.mill_name,amount:r.amount,tally_vch:r.tally_voucher_no,narration:r.narration,detail:r,sub:`Lot:${r.lot_no||'—'} · ${r.item_name||'—'} · ${r.qty_mtrs||0}m`}));
    (recR.data||[]).forEach(r=>all.push({date:r.voucher_date,type:'REC from Mill',ref:r.tally_voucher_no,party:r.mill_name,amount:r.gross_amount,tally_vch:r.tally_voucher_no,narration:r.narration,detail:r,sub:`D No-${r.design_no||'?'} · ${r.finish_qty_mtrs||0}m · Short:${r.shortage_pct||0}%`}));
    (sjR.data||[]).forEach(r=>all.push({date:r.voucher_date,type:'Stock Journal',ref:r.tally_voucher_no,party:'—',amount:0,tally_vch:r.tally_voucher_no,narration:r.narration,detail:r,sub:`D No-${r.design_no||'?'} · ${r.grey_qty_mtrs||0}m→${r.finished_qty_mtrs||0}m`}));
    all.sort((a,b)=>((b.date||'')>(a.date||''))?1:-1);
    setEntries(all);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(()=>{ load(); },[load]);

  const filtered = entries.filter(e=>{
    if (typeFilter && e.type!==typeFilter) return false;
    if (search && !e.party?.toLowerCase().includes(search.toLowerCase()) && !e.ref?.toLowerCase().includes(search.toLowerCase()) && !String(e.design||'').includes(search) && !e.narration?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const typeGroups = {};
  entries.forEach(e=>{typeGroups[e.type]=(typeGroups[e.type]||0)+1;});

  const totalSales    = filtered.filter(e=>e.type==='Sales').reduce((s,e)=>s+Number(e.amount||0),0);
  const totalReceipts = filtered.filter(e=>e.type==='Receipt').reduce((s,e)=>s+Number(e.amount||0),0);
  const totalPayments = filtered.filter(e=>['Payment','Jobwork','Expenses'].includes(e.type)).reduce((s,e)=>s+Number(e.amount||0),0);
  const totalPurchase = filtered.filter(e=>['Purchase','Grey Purchase'].includes(e.type)).reduce((s,e)=>s+Number(e.amount||0),0);

  const exportCSV = () => {
    const rows = ['Date,Type,Reference,Party,Amount,Broker,Design,Narration',
      ...filtered.map(e=>[e.date,e.type,e.ref,`"${e.party||''}"`,e.amount||0,e.broker||'',e.design||'',`"${(e.narration||'').replace(/"/g,"'")}"`].join(','))
    ].join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows],{type:'text/csv'}));a.download=`DayBook_${dateFrom}_${dateTo}.csv`;a.click();
  };

  const today = todayISO();

  return (
    <div style={{minHeight:'100vh',background:T.bg,padding:'20px 24px',fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:T.navy,margin:0}}>📅 Day Book</h1>
          <p style={{fontSize:12,color:T.muted,margin:'4px 0 0'}}>All 11 voucher types · Sales · Purchase · Receipts · Payments · Journal · Process</p>
        </div>
        <button onClick={exportCSV} style={{padding:'8px 16px',background:T.green,border:'none',borderRadius:8,color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer'}}>📥 Export CSV</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
        {[['Sales',fmt(totalSales),T.green,'📤'],[`Receipts`,fmt(totalReceipts),T.teal,'💚'],['Payments',fmt(totalPayments),T.orange,'💸'],['Purchases',fmt(totalPurchase),T.blue,'📥']].map(([l,v,c,ic])=>(
          <div key={l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'10px 14px',borderTop:`3px solid ${c}`}}>
            <div style={{fontSize:16}}>{ic}</div><div style={{fontSize:16,fontWeight:800,color:T.navy}}>{v}</div><div style={{fontSize:11,color:T.text}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 16px',marginBottom:12}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',marginBottom:8}}>
          {[{l:'Today',f:today,t:today},{l:'Yesterday',f:(()=>{const d=new Date();d.setDate(d.getDate()-1);return d.toISOString().slice(0,10);})(),t:(()=>{const d=new Date();d.setDate(d.getDate()-1);return d.toISOString().slice(0,10);})()},{l:'This Wk',f:(()=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+1);return d.toISOString().slice(0,10);})(),t:today},{l:'This Mo',f:today.slice(0,8)+'01',t:today},{l:'FY 25-26',f:'2025-04-01',t:'2026-03-31'}].map(r=>(
            <button key={r.l} onClick={()=>{setDateFrom(r.f);setDateTo(r.t);}} style={{padding:'4px 9px',borderRadius:6,border:`1px solid ${T.border}`,background:T.bg,color:T.text,fontSize:11,cursor:'pointer'}}>{r.l}</button>
          ))}
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{padding:'5px 8px',border:`1px solid ${T.border}`,borderRadius:6,fontSize:12}} />
          <span style={{color:T.muted}}>→</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{padding:'5px 8px',border:`1px solid ${T.border}`,borderRadius:6,fontSize:12}} />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search party, ref, narration…" style={{flex:'1 1 160px',minWidth:0,padding:'6px 10px',border:`1px solid ${T.border}`,borderRadius:6,fontSize:12}} />
          <button onClick={load} style={{padding:'6px 12px',background:T.teal,border:'none',borderRadius:6,color:'#fff',fontWeight:700,fontSize:11,cursor:'pointer'}}>{loading?'…':'⟳'}</button>
        </div>
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          <button onClick={()=>setTypeFilter('')} style={{padding:'2px 9px',borderRadius:12,border:`1px solid ${T.border}`,background:typeFilter===''?T.teal:T.bg,color:typeFilter===''?'#fff':T.text,fontSize:9,fontWeight:600,cursor:'pointer'}}>All ({entries.length})</button>
          {Object.keys(typeGroups).sort().map(type=>{const m=TYPE_META[type]||{bg:'#F3F4F6',col:'#374151'};return(
            <button key={type} onClick={()=>setTypeFilter(typeFilter===type?'':type)} style={{padding:'2px 9px',borderRadius:12,border:`1px solid ${m.col}30`,background:typeFilter===type?m.col:m.bg,color:typeFilter===type?'#fff':m.col,fontSize:9,fontWeight:600,cursor:'pointer'}}>{type} ({typeGroups[type]})</button>
          );})}
        </div>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60,color:T.muted}}>Loading all vouchers…</div>
      ) : filtered.length===0 ? (
        <div style={{textAlign:'center',padding:60,background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,color:T.muted}}>No entries found.</div>
      ) : (
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr style={{background:T.navy}}>
                {['Date','Type','Reference','Party','Amount','Broker','Details','↓'].map(h=>(
                  <th key={h} style={{padding:'9px 10px',color:'rgba(255,255,255,.8)',textAlign:h==='Amount'?'right':'left',fontSize:9,textTransform:'uppercase',letterSpacing:'.5px',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e,i)=>{
                const m=TYPE_META[e.type]||{credit:null};
                const amtColor=m.credit===true?T.green:m.credit===false?T.red:T.text;
                const isExp=expanded===i;
                return (<>
                  <tr key={String(e.ref||'')+i} onClick={()=>setExpanded(isExp?null:i)} style={{background:isExp?T.tealLight:i%2===0?'#fff':'#FAFFFE',borderBottom:`1px solid ${T.border}`,cursor:'pointer'}}>
                    <td style={{padding:'7px 10px',color:T.muted,whiteSpace:'nowrap'}}>{fmtD(e.date)}</td>
                    <td style={{padding:'7px 10px'}}><TypeChip type={e.type}/></td>
                    <td style={{padding:'7px 10px',fontWeight:700,color:T.blue}}>{e.ref||'—'}</td>
                    <td style={{padding:'7px 10px',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.party||'—'}</td>
                    <td style={{padding:'7px 10px',textAlign:'right',fontWeight:700,color:amtColor}}>{fmt(e.amount)}</td>
                    <td style={{padding:'7px 10px',fontSize:10,color:T.orange}}>{e.broker||'—'}</td>
                    <td style={{padding:'7px 10px',fontSize:10,color:T.muted,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.sub||e.narration||'—'}</td>
                    <td style={{padding:'7px 10px',textAlign:'center',color:T.muted,fontSize:11}}>{isExp?'▲':'▼'}</td>
                  </tr>
                  {isExp&&(
                    <tr><td colSpan={8} style={{padding:'0 10px 10px',background:'#FAFFFE'}}>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5,paddingTop:7}}>
                        {Object.entries(e.detail||{}).filter(([k,v])=>v!=null&&v!==''&&v!==0&&k!=='id').map(([k,v])=>(
                          <div key={k} style={{background:T.surface,borderRadius:4,padding:'4px 7px',border:`1px solid ${T.border}`}}>
                            <div style={{fontSize:8,color:T.muted,textTransform:'uppercase'}}>{k.replace(/_/g,' ')}</div>
                            <div style={{fontSize:10,color:T.text,marginTop:1,wordBreak:'break-word',maxHeight:36,overflow:'hidden'}}>{typeof v==='object'?JSON.stringify(v).slice(0,50):String(v).slice(0,70)}</div>
                          </div>
                        ))}
                      </div>
                    </td></tr>
                  )}
                </>);
              })}
            </tbody>
          </table>
          <div style={{background:T.tealLight,padding:'9px 14px',borderTop:`2px solid ${T.teal}`,display:'flex',gap:20,flexWrap:'wrap'}}>
            <div><div style={{fontSize:9,color:T.muted,textTransform:'uppercase'}}>Entries</div><div style={{fontSize:13,fontWeight:700,color:T.navy}}>{filtered.length}</div></div>
            <div><div style={{fontSize:9,color:T.muted,textTransform:'uppercase'}}>Sales</div><div style={{fontSize:13,fontWeight:700,color:T.green}}>{fmt(totalSales)}</div></div>
            <div><div style={{fontSize:9,color:T.muted,textTransform:'uppercase'}}>Receipts</div><div style={{fontSize:13,fontWeight:700,color:T.teal}}>{fmt(totalReceipts)}</div></div>
            <div><div style={{fontSize:9,color:T.muted,textTransform:'uppercase'}}>Purchases</div><div style={{fontSize:13,fontWeight:700,color:T.red}}>{fmt(totalPurchase)}</div></div>
            <div><div style={{fontSize:9,color:T.muted,textTransform:'uppercase'}}>Payments</div><div style={{fontSize:13,fontWeight:700,color:T.orange}}>{fmt(totalPayments)}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
