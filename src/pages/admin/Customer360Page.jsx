import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

const T = { teal:'#2BA898', navy:'#0B2E2B', green:'#1E9E5A', red:'#E74C3C', gold:'#E8A800',
            blue:'#2468C8', bg:'#F0F9F7', surface:'#fff', border:'#D0EDE8', text:'#0B2E2B', muted:'#6A9B95' };
const fmt = n => '\u20B9' + Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:0});
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : '-';

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{padding:'8px 18px',borderRadius:8,border:`1px solid ${T.border}`,background:active?T.teal:T.surface,color:active?'#fff':T.text,fontWeight:600,fontSize:13,cursor:'pointer'}}>
      {children}
    </button>
  );
}

export default function Customer360Page() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState(searchParams.get('search')||'');
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('overview');
  const [bills, setBills] = useState([]);
  const [waMsgs, setWaMsgs] = useState([]);

  useEffect(() => {
    supabase.from('customers').select('*').eq('business_type', 'customer').order('name').limit(1000)
      .then(({data}) => setCustomers(data||[]));
  }, []);

  const loadCustomerData = useCallback(async (customer) => {
    if (!customer) return;
    setLoading(true);
    const name = customer.name || customer.tally_ledger_name;

    const [billsRes, waRes] = await Promise.all([
      supabase.from('sales_bills').select('*').ilike('customer_name', `%${name}%`).order('bill_date', {ascending:false}).limit(100),
      supabase.from('whatsapp_conversations').select('*').or(`phone_number.eq.${customer.phone||''},customer_name.ilike.%${name}%`).limit(1)
    ]);
    setBills(billsRes.data || []);
    setWaMsgs(waRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (selected) loadCustomerData(selected); }, [selected, loadCustomerData]);

  const filteredCustomers = customers.filter(c =>
    !search || (c.name||'').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone||'').includes(search) || (c.city||'').toLowerCase().includes(search.toLowerCase())
  );

  const totalSales = bills.reduce((s,b) => s+(b.total_amount||0), 0);
  const lastOrder = bills[0]?.bill_date;
  const daysSinceOrder = lastOrder ? Math.floor((Date.now()-new Date(lastOrder).getTime())/86400000) : null;

  return (
    <div style={{background:T.bg,minHeight:'100vh',padding:24}}>
      <Helmet><title>Customer 360 — Shreerang</title></Helmet>

      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:24,fontWeight:800,color:T.navy,margin:0}}>👥 Customer 360°</h1>
        <p style={{color:T.muted,fontSize:13,margin:'4px 0 0'}}>Full customer profile — orders, balance, WhatsApp, history</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:16}}>
        {/* Customer List */}
        <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:'85vh'}}>
          <div style={{padding:12,borderBottom:`1px solid ${T.border}`}}>
            <input placeholder="Search by name, phone, city..." value={search} onChange={e=>setSearch(e.target.value)}
              style={{padding:'8px 12px',border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,width:'100%',boxSizing:'border-box',outline:'none'}}/>
            <div style={{fontSize:11,color:T.muted,marginTop:6}}>{filteredCustomers.length} customers</div>
          </div>
          <div style={{overflow:'auto',flex:1}}>
            {filteredCustomers.slice(0,200).map(c=>(
              <div key={c.id} onClick={()=>setSelected(c)}
                style={{padding:'10px 14px',cursor:'pointer',borderBottom:`1px solid ${T.border}`,background:selected?.id===c.id?T.teal+'15':'transparent',borderLeft:selected?.id===c.id?`3px solid ${T.teal}`:'3px solid transparent'}}
                onMouseEnter={e=>e.currentTarget.style.background=T.teal+'08'}
                onMouseLeave={e=>e.currentTarget.style.background=selected?.id===c.id?T.teal+'15':'transparent'}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:T.teal+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:T.teal,flexShrink:0}}>
                    {(c.name||'?').substring(0,2).toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name||c.tally_ledger_name}</div>
                    <div style={{fontSize:11,color:T.muted}}>{c.phone||'—'} • {c.city||c.state||'—'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Detail */}
        {!selected ? (
          <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,padding:60,textAlign:'center',color:T.muted}}>
            <div style={{fontSize:56,marginBottom:12}}>👥</div>
            <div style={{fontSize:16,fontWeight:600}}>Select a customer</div>
            <div style={{fontSize:13,marginTop:6}}>Search from {customers.length.toLocaleString()} customers</div>
          </div>
        ) : (
          <div>
            {/* Customer Header */}
            <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,padding:20,marginBottom:16}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
                <div style={{width:56,height:56,borderRadius:'50%',background:T.teal+'25',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:800,color:T.teal,flexShrink:0}}>
                  {(selected.name||'?').substring(0,2).toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <h2 style={{fontSize:20,fontWeight:800,color:T.navy,margin:'0 0 4px'}}>{selected.name||selected.tally_ledger_name}</h2>
                  <div style={{display:'flex',gap:12,flexWrap:'wrap',fontSize:13,color:T.muted}}>
                    {selected.phone && <span>📱 {selected.phone}</span>}
                    {selected.email && <span>✉️ {selected.email}</span>}
                    {selected.city && <span>📍 {selected.city}{selected.state?', '+selected.state:''}</span>}
                    {selected.gst_number && <span>🔢 {selected.gst_number}</span>}
                  </div>
                  {selected.credit_limit > 0 && (
                    <div style={{marginTop:8,display:'flex',gap:12}}>
                      <span style={{fontSize:12,background:'#DBEAFE',color:T.blue,padding:'2px 10px',borderRadius:20,fontWeight:600}}>Credit Limit: {fmt(selected.credit_limit)}</span>
                      {selected.credit_days > 0 && <span style={{fontSize:12,background:'#FEF3C7',color:'#92400E',padding:'2px 10px',borderRadius:20,fontWeight:600}}>Credit Days: {selected.credit_days}d</span>}
                    </div>
                  )}
                </div>
                {selected.phone && (
                  <a href={`/admin/whatsapp-inbox?phone=${selected.phone}`}
                    style={{padding:'8px 14px',background:'#25D366',color:'#fff',borderRadius:8,fontSize:12,fontWeight:600,textDecoration:'none',display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                    💬 WhatsApp
                  </a>
                )}
              </div>
            </div>

            {/* KPI Row */}
            <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'}}>
              {[
                {label:'Total Sales',value:fmt(totalSales),color:T.teal,icon:'💰'},
                {label:'Orders',value:bills.length,color:T.blue,icon:'📋'},
                {label:'Last Order',value:lastOrder?fmtDate(lastOrder):'Never',color:T.navy,icon:'📅'},
                {label:'Days Since',value:daysSinceOrder!=null?daysSinceOrder+'d':'—',color:daysSinceOrder>90?T.red:daysSinceOrder>30?T.gold:T.green,icon:'⏱️'},
              ].map(s=>(
                <div key={s.label} style={{background:T.surface,borderRadius:10,padding:'12px 16px',border:`1px solid ${T.border}`,flex:1,minWidth:100}}>
                  <div style={{fontSize:16,marginBottom:3}}>{s.icon}</div>
                  <div style={{fontSize:11,color:T.muted,fontWeight:600}}>{s.label}</div>
                  <div style={{fontSize:16,fontWeight:800,color:s.color}}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{display:'flex',gap:8,marginBottom:16}}>
              <TabBtn active={tab==='overview'} onClick={()=>setTab('overview')}>📊 Overview</TabBtn>
              <TabBtn active={tab==='orders'} onClick={()=>setTab('orders')}>📋 Orders ({bills.length})</TabBtn>
              <TabBtn active={tab==='whatsapp'} onClick={()=>setTab('whatsapp')}>💬 WhatsApp</TabBtn>
            </div>

            {/* Tab Content */}
            {tab === 'overview' && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,padding:20}}>
                  <h3 style={{fontSize:14,fontWeight:700,color:T.navy,margin:'0 0 12px'}}>📋 Order History</h3>
                  {bills.slice(0,5).map(b=>(
                    <div key={b.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${T.border}`}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:600,color:T.teal}}>{b.bill_number}</div>
                        <div style={{fontSize:11,color:T.muted}}>{fmtDate(b.bill_date)}</div>
                      </div>
                      <div style={{fontSize:13,fontWeight:800,color:T.green}}>{fmt(b.total_amount)}</div>
                    </div>
                  ))}
                  {bills.length > 5 && <div style={{fontSize:12,color:T.muted,marginTop:8,textAlign:'center'}}>+{bills.length-5} more orders</div>}
                </div>
                <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,padding:20}}>
                  <h3 style={{fontSize:14,fontWeight:700,color:T.navy,margin:'0 0 12px'}}>📝 Details</h3>
                  {[
                    ['Tally Ledger', selected.tally_ledger_name],
                    ['Business Type', selected.business_type||selected.customer_type],
                    ['Area', selected.area],
                    ['Address', selected.address],
                    ['Notes', selected.notes],
                  ].filter(f=>f[1]).map(([k,v])=>(
                    <div key={k} style={{display:'flex',gap:8,marginBottom:8}}>
                      <span style={{fontSize:11,color:T.muted,fontWeight:600,minWidth:100}}>{k}</span>
                      <span style={{fontSize:12,color:T.text}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'orders' && (
              <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:'hidden'}}>
                {loading ? <div style={{padding:40,textAlign:'center',color:T.muted}}>Loading...</div> :
                bills.length === 0 ? <div style={{padding:40,textAlign:'center',color:T.muted}}>No orders found. Sync from Tally to import.</div> : (
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr style={{background:T.bg}}>
                        {['Bill #','Date','Amount','Status'].map(h=>(
                          <th key={h} style={{padding:'10px 14px',textAlign:'left',fontSize:11,fontWeight:700,color:T.muted,textTransform:'uppercase',borderBottom:`1px solid ${T.border}`}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((b,i)=>(
                        <tr key={b.id} style={{background:i%2===0?T.surface:T.bg}}>
                          <td style={{padding:'10px 14px',fontSize:13,fontWeight:700,color:T.teal}}>{b.bill_number}</td>
                          <td style={{padding:'10px 14px',fontSize:13}}>{fmtDate(b.bill_date)}</td>
                          <td style={{padding:'10px 14px',fontSize:14,fontWeight:800,color:T.green}}>{fmt(b.total_amount)}</td>
                          <td style={{padding:'10px 14px'}}>
                            <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:'#D1FAE5',color:'#065F46'}}>{b.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === 'whatsapp' && (
              <div style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,padding:20}}>
                <h3 style={{fontSize:14,fontWeight:700,color:T.navy,margin:'0 0 12px'}}>💬 WhatsApp</h3>
                {selected.phone ? (
                  <div>
                    <div style={{background:T.bg,borderRadius:8,padding:14,marginBottom:14}}>
                      <div style={{fontSize:13,color:T.text}}>Phone: <strong>{selected.phone}</strong></div>
                      {waMsgs.length > 0 ? (
                        <div style={{marginTop:8}}>
                          <div style={{fontSize:12,color:T.muted}}>Last conversation: {fmtDate(waMsgs[0].last_message_at)}</div>
                          <div style={{fontSize:12,color:T.muted}}>Language: {waMsgs[0].language||'Unknown'}</div>
                        </div>
                      ) : <div style={{fontSize:12,color:T.muted,marginTop:6}}>No WhatsApp conversation yet</div>}
                    </div>
                    <a href={`/admin/whatsapp-inbox`}
                      style={{padding:'8px 16px',background:'#25D366',color:'#fff',borderRadius:8,fontSize:13,fontWeight:600,textDecoration:'none',display:'inline-block'}}>
                      Open WhatsApp Inbox
                    </a>
                  </div>
                ) : (
                  <div style={{color:T.muted,fontSize:13}}>No phone number on record for this customer.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
