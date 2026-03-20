import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';
import { syncVouchersFromTally } from '@/services/TallySyncService';

const T = { teal:'#2BA898', navy:'#0B2E2B', green:'#1E9E5A', red:'#E74C3C', gold:'#E8A800',
            blue:'#2468C8', bg:'#F0F9F7', surface:'#fff', border:'#D0EDE8', text:'#0B2E2B', muted:'#6A9B95' };
const fmt = n => '\u20B9' + Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0});
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '-';

const TYPE_COLORS = {
  sales:       {bg:'#DBEAFE', col:'#1D4ED8'},
  purchase:    {bg:'#FEE2E2', col:'#991B1B'},
  receipt:     {bg:'#D1FAE5', col:'#065F46'},
  payment:     {bg:'#FEF3C7', col:'#92400E'},
  credit_note: {bg:'#EDE9FE', col:'#5B21B6'},
  debit_note:  {bg:'#FFF7ED', col:'#C2410C'},
  journal:     {bg:'#F3F4F6', col:'#374151'},
  contra:      {bg:'#F0FDF4', col:'#15803D'},
};

export default function DayBook() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [allVouchers, setAllVouchers] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0,10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0,10));
  const [stats, setStats] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    // Get from all voucher sources
    const [salesRes, purchaseRes, vouchersRes] = await Promise.all([
      supabase.from('sales_bills').select('bill_number,bill_date,customer_name,total_amount,status,notes').gte('bill_date', dateFrom).lte('bill_date', dateTo),
      supabase.from('purchase_bills').select('bill_number,bill_date,supplier_name,total_amount,status,notes').gte('bill_date', dateFrom).lte('bill_date', dateTo),
      supabase.from('tally_vouchers').select('*').gte('voucher_date', dateFrom).lte('voucher_date', dateTo)
    ]);

    const entries = [];
    (salesRes.data||[]).forEach(b => entries.push({
      date:b.bill_date, type:'sales', ref:b.bill_number,
      party:b.customer_name, amount:b.total_amount||0, narration:b.notes||'Sales'
    }));
    (purchaseRes.data||[]).forEach(b => entries.push({
      date:b.bill_date, type:'purchase', ref:b.bill_number,
      party:b.supplier_name, amount:b.total_amount||0, narration:b.notes||'Purchase'
    }));
    (vouchersRes.data||[]).forEach(v => entries.push({
      date:v.voucher_date, type:v.voucher_type?.toLowerCase()||'other',
      ref:v.voucher_number||'-', party:v.party_name||'-',
      amount:v.amount||0, narration:v.narration||v.voucher_type
    }));

    entries.sort((a,b) => (b.date||'').localeCompare(a.date||''));

    // Stats by type
    const typeStats = {};
    entries.forEach(e => {
      if (!typeStats[e.type]) typeStats[e.type] = {count:0, amount:0};
      typeStats[e.type].count++;
      typeStats[e.type].amount += e.amount;
    });

    setAllVouchers(entries);
    setStats(typeStats);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await syncVouchersFromTally();
      await loadData();
      alert(`Sync complete! Sales: ${r.sales}, Purchase: ${r.purchase}, Receipts: ${r.receipts}, Payments: ${r.payments}`);
    } catch(e) { alert('Sync failed: '+e.message); }
    setSyncing(false);
  };

  const filtered = allVouchers.filter(v => {
    const matchSearch = !search || (v.party||'').toLowerCase().includes(search.toLowerCase()) || (v.ref||'').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || v.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleExport = () => {
    const csv = ['Date,Type,Reference,Party,Amount,Narration',
      ...filtered.map(v => `${v.date},${v.type},${v.ref},"${v.party}",${v.amount},"${v.narration}"`)
    ].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`DayBook_${dateFrom}_to_${dateTo}.csv`; a.click();
  };

  return (
    <div style={{background:T.bg,minHeight:'100vh',padding:24}}>
      <Helmet><title>Day Book — Shreerang</title></Helmet>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,color:T.navy,margin:0}}>📅 Day Book</h1>
          <p style={{color:T.muted,fontSize:13,margin:'4px 0 0'}}>All vouchers — Sales, Purchase, Receipt, Payment, Journal</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={handleExport} style={{padding:'8px 14px',background:T.green,color:'#fff',border:'none',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer'}}>📥 Export</button>
          <button onClick={handleSync} disabled={syncing} style={{padding:'8px 14px',background:T.teal,color:'#fff',border:'none',borderRadius:8,fontWeight:600,fontSize:13,cursor:'pointer'}}>
            {syncing?'⏳...':'🔄 Sync Tally'}
          </button>
        </div>
      </div>

      {/* Date Range */}
      <div style={{background:T.surface,borderRadius:10,padding:14,border:`1px solid ${T.border}`,marginBottom:16,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
        <div>
          <div style={{fontSize:11,color:T.muted,fontWeight:600,marginBottom:4}}>FROM</div>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            style={{padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:'none'}}/>
        </div>
        <div>
          <div style={{fontSize:11,color:T.muted,fontWeight:600,marginBottom:4}}>TO</div>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            style={{padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:'none'}}/>
        </div>
        {/* Quick Ranges */}
        <div style={{display:'flex',gap:8}}>
          {[
            {label:'Today', action:()=>{ const t=new Date().toISOString().slice(0,10); setDateFrom(t); setDateTo(t); }},
            {label:'This Week', action:()=>{ const now=new Date(); const mon=new Date(now); mon.setDate(now.getDate()-now.getDay()+1); setDateFrom(mon.toISOString().slice(0,10)); setDateTo(now.toISOString().slice(0,10)); }},
            {label:'This Month', action:()=>{ const t=new Date().toISOString().slice(0,8)+'01'; setDateFrom(t); setDateTo(new Date().toISOString().slice(0,10)); }},
            {label:'Last 30d', action:()=>{ const d=new Date(); d.setDate(d.getDate()-30); setDateFrom(d.toISOString().slice(0,10)); setDateTo(new Date().toISOString().slice(0,10)); }},
          ].map(r=>(
            <button key={r.label} onClick={r.action}
              style={{padding:'6px 12px',borderRadius:8,border:`1px solid ${T.border}`,background:T.bg,color:T.text,fontSize:12,fontWeight:600,cursor:'pointer'}}>
              {r.label}
            </button>
          ))}
        </div>
        <input placeholder="Search party / ref..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{padding:'7px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,flex:1,minWidth:180,outline:'none'}}/>
      </div>

      {/* Type Summary */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        <button onClick={()=>setTypeFilter('all')}
          style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${T.border}`,background:typeFilter==='all'?T.teal:T.surface,color:typeFilter==='all'?'#fff':T.text,fontWeight:600,fontSize:12,cursor:'pointer'}}>
          All ({allVouchers.length})
        </button>
        {Object.entries(stats).map(([type, s])=>{
          const colors = TYPE_COLORS[type] || {bg:'#F3F4F6',col:'#374151'};
          return (
            <button key={type} onClick={()=>setTypeFilter(typeFilter===type?'all':type)}
              style={{padding:'6px 14px',borderRadius:8,border:`1px solid ${T.border}`,background:typeFilter===type?colors.col:colors.bg,color:typeFilter===type?'#fff':colors.col,fontWeight:600,fontSize:12,cursor:'pointer',textTransform:'capitalize'}}>
              {type} ({s.count}) • {fmt(s.amount)}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden'}}>
        <div style={{padding:'10px 14px',borderBottom:`1px solid ${T.border}`,display:'flex',justifyContent:'space-between'}}>
          <span style={{fontSize:12,color:T.muted,fontWeight:600}}>{filtered.length} entries</span>
          <span style={{fontSize:12,color:T.teal,fontWeight:700}}>{fmt(filtered.reduce((s,v)=>s+v.amount,0))} total</span>
        </div>
        {loading ? (
          <div style={{padding:40,textAlign:'center',color:T.muted}}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{padding:40,textAlign:'center',color:T.muted}}>
            <div style={{fontSize:32,marginBottom:8}}>📅</div>
            <div>No entries for this period. Click "Sync Tally" to fetch data.</div>
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:T.bg}}>
                {['Date','Type','Reference','Party','Amount','Narration'].map(h=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',borderBottom:`1px solid ${T.border}`}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v,i)=>{
                const colors = TYPE_COLORS[v.type] || {bg:'#F3F4F6',col:'#374151'};
                return (
                  <tr key={i} style={{background:i%2===0?T.surface:T.bg}}>
                    <td style={{padding:'9px 14px',fontSize:12,whiteSpace:'nowrap'}}>{fmtDate(v.date)}</td>
                    <td style={{padding:'9px 14px'}}>
                      <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:colors.bg,color:colors.col,textTransform:'capitalize'}}>{v.type}</span>
                    </td>
                    <td style={{padding:'9px 14px',fontSize:12,fontWeight:600,color:T.teal}}>{v.ref}</td>
                    <td style={{padding:'9px 14px',fontSize:12,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.party}</td>
                    <td style={{padding:'9px 14px',fontSize:13,fontWeight:800,color:v.type==='sales'||v.type==='receipt'?T.green:T.red}}>{fmt(v.amount)}</td>
                    <td style={{padding:'9px 14px',fontSize:11,color:T.muted,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.narration}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
