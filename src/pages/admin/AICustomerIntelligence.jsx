import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || '';
const T = { teal:'#2BA898', gold:'#E8A800', navy:'#0B2E2B', red:'#E74C3C', green:'#1E9E5A', blue:'#2468C8', orange:'#E67E22', border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B', muted:'#6A9B95' };

async function askClaude(prompt) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:600, messages:[{role:'user',content:prompt}] })
  });
  const d = await resp.json();
  return d.content?.[0]?.text || '';
}

export default function AICustomerIntelligence() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [custDetails, setCustDetails] = useState(null);
  const [aiProfile, setAiProfile] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('revenue');

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const { data: sales } = await supabase.from('sales_bills').select('customer_name,bill_date,total_amount,quantity_mtrs,broker_name,comm_amount,bill_number').order('bill_date', { ascending: false }).limit(1000);

    const map = {};
    (sales||[]).forEach(s => {
      const n = s.customer_name; if (!n) return;
      if (!map[n]) map[n] = { name:n, bills:[], revenue:0, qty:0, broker:new Set(), lastBill:s.bill_date };
      map[n].bills.push(s);
      map[n].revenue += s.total_amount||0;
      map[n].qty += s.quantity_mtrs||0;
      if (s.broker_name) map[n].broker.add(s.broker_name);
      if (s.bill_date > map[n].lastBill) map[n].lastBill = s.bill_date;
    });

    const today = new Date();
    const list = Object.values(map).map(c => {
      const daysSince = Math.floor((today - new Date(c.lastBill)) / 86400000);
      const avgOrder = c.revenue / c.bills.length;
      return { ...c, broker: [...c.broker], daysSince, avgOrder, score: c.revenue > 500000 ? 'premium' : c.revenue > 100000 ? 'regular' : 'small' };
    });

    const sorted = list.sort((a,b) => sortBy==='revenue' ? b.revenue-a.revenue : sortBy==='recent' ? a.daysSince-b.daysSince : b.bills.length-a.bills.length);
    setCustomers(sorted);
    setLoading(false);
  };

  const loadCustomerDetail = async (cust) => {
    setSelected(cust);
    setDetailLoading(true);
    setAiProfile('');

    const profile = await askClaude(`You are a business analyst for Shreerang Trendz textile company. Analyze this customer and give intelligence report in Hinglish.

Customer: ${cust.name}
Total Revenue: ₹${Math.round(cust.revenue/1000)}K
Total Bills: ${cust.bills.length}
Avg Order Size: ₹${Math.round(cust.avgOrder/1000)}K
Last Purchase: ${cust.daysSince} days ago
Total Metres: ${Math.round(cust.qty)} mtrs
Broker(s): ${cust.broker.join(', ') || 'Direct'}
Customer Tier: ${cust.score}

Give:
1. Customer health assessment (1 line)
2. Buying pattern insight (1 line)
3. What to do/offer next (1 line)
4. Risk level and why (1 line)`);

    setAiProfile(profile);
    setDetailLoading(false);
  };

  const fmt = n => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${Math.round(n/1000)}K`;
  const scoreColor = { premium:T.gold, regular:T.teal, small:T.muted };
  const scoreBg = { premium:'#FFF8E6', regular:'#EEF8F6', small:'#F5F5F5' };

  const filtered = customers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300,color:T.muted}}>Building customer intelligence from Tally...</div>;

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', background:T.bg, minHeight:'100vh', padding:20 }}>
      <div style={{ background:T.navy, borderRadius:12, padding:'14px 20px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ color:'#fff', fontSize:18, fontWeight:700 }}>👥 AI Customer Intelligence</div>
          <div style={{ color:'rgba(255,255,255,0.6)', fontSize:12, marginTop:2 }}>{customers.length} customers · {customers.filter(c=>c.score==='premium').length} premium · AI profiling powered by Claude</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer..."
            style={{ padding:'6px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:12, outline:'none' }} />
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:12 }}>
            <option value="revenue" style={{color:'#000'}}>By Revenue</option>
            <option value="recent" style={{color:'#000'}}>Most Recent</option>
            <option value="bills" style={{color:'#000'}}>Most Bills</option>
          </select>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 420px', gap:14 }}>
        {/* Customer list */}
        <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:'80vh', overflowY:'auto' }}>
          {filtered.map((c,i) => (
            <div key={i} onClick={()=>loadCustomerDetail(c)} style={{ background: selected?.name===c.name ? scoreBg[c.score] : T.surface, borderRadius:10, padding:'12px 14px', border:`2px solid ${selected?.name===c.name ? scoreColor[c.score] : T.border}`, cursor:'pointer', transition:'all 0.15s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:scoreColor[c.score], display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:14 }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight:600, color:T.text, fontSize:13 }}>{c.name.substring(0,28)}</div>
                    <div style={{ color:T.muted, fontSize:11, marginTop:1 }}>{c.bills.length} bills · Last: {c.daysSince}d ago {c.broker[0] ? `· ${c.broker[0]}` : ''}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700, color:T.green, fontSize:14 }}>{fmt(c.revenue)}</div>
                  <div style={{ background:scoreBg[c.score], color:scoreColor[c.score], fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:10, marginTop:2 }}>{c.score.toUpperCase()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Customer detail panel */}
        <div style={{ background:T.surface, borderRadius:10, border:`1px solid ${T.border}`, padding:16, height:'fit-content', position:'sticky', top:0 }}>
          {!selected ? (
            <div style={{ color:T.muted, textAlign:'center', padding:40 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>👆</div>
              <div>Select a customer to see AI intelligence profile</div>
            </div>
          ) : (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14, paddingBottom:14, borderBottom:`1px solid ${T.border}` }}>
                <div style={{ width:48, height:48, borderRadius:'50%', background:scoreColor[selected.score], display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:18 }}>
                  {selected.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight:700, color:T.text, fontSize:16 }}>{selected.name}</div>
                  <div style={{ color:scoreColor[selected.score], fontWeight:600, fontSize:12 }}>{selected.score.toUpperCase()} CUSTOMER</div>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {[
                  { label:'Total Revenue', val: fmt(selected.revenue), color:T.green },
                  { label:'Total Bills', val: selected.bills.length, color:T.text },
                  { label:'Avg Order', val: fmt(selected.avgOrder), color:T.blue },
                  { label:'Last Purchase', val: `${selected.daysSince}d ago`, color: selected.daysSince > 60 ? T.red : T.muted },
                  { label:'Total Metres', val: `${Math.round(selected.qty)} m`, color:T.teal },
                  { label:'Broker(s)', val: selected.broker[0]?.substring(0,12) || 'Direct', color:T.purple },
                ].map((k,i) => (
                  <div key={i} style={{ background:T.bg, borderRadius:8, padding:'8px 10px' }}>
                    <div style={{ color:T.muted, fontSize:10, textTransform:'uppercase', marginBottom:2 }}>{k.label}</div>
                    <div style={{ color:k.color, fontWeight:600, fontSize:14 }}>{k.val}</div>
                  </div>
                ))}
              </div>

              {/* Recent bills */}
              <div style={{ marginBottom:14 }}>
                <div style={{ color:T.muted, fontSize:11, fontWeight:600, marginBottom:6, textTransform:'uppercase' }}>Recent Bills</div>
                {selected.bills.slice(0,4).map((b,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`1px solid ${T.border}`, fontSize:12 }}>
                    <span style={{ color:T.blue }}>{b.bill_number}</span>
                    <span style={{ color:T.muted }}>{b.bill_date}</span>
                    <span style={{ fontWeight:500, color:T.green }}>{fmt(b.total_amount)}</span>
                  </div>
                ))}
              </div>

              {/* AI Profile */}
              <div style={{ background:'#0B2E2B', borderRadius:10, padding:12 }}>
                <div style={{ color:T.gold, fontWeight:600, fontSize:12, marginBottom:8 }}>🤖 CLAUDE AI INTELLIGENCE</div>
                {detailLoading ? (
                  <div style={{ color:'rgba(255,255,255,0.5)', fontSize:13 }}>⏳ Analyzing customer pattern...</div>
                ) : (
                  <div style={{ color:'rgba(255,255,255,0.9)', fontSize:13, lineHeight:1.6, whiteSpace:'pre-line' }}>{aiProfile || 'Click a customer to generate AI profile'}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
