import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || '';
const T = { teal:'#2BA898', gold:'#E8A800', navy:'#0B2E2B', red:'#E74C3C', green:'#1E9E5A', blue:'#2468C8', orange:'#E67E22', border:'#D0EDE8', bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B', muted:'#6A9B95' };

async function askClaude(prompt) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'Content-Type':'application/json','x-api-key':ANTHROPIC_KEY,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:500, messages:[{role:'user',content:prompt}] })
  });
  const d = await resp.json();
  return d.content?.[0]?.text || '';
}

export default function AIStockDesignPage() {
  const [stock, setStock] = useState([]);
  const [process, setProcess] = useState([]);
  const [purchase, setPurchase] = useState([]);
  const [aiReorder, setAiReorder] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stock');
  const [searchStock, setSearchStock] = useState('');
  const [lifecycle, setLifecycle] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [stockRes, processRes, purchRes] = await Promise.all([
      supabase.from('fabric_stock_live').select('*').order('closing_qty_mtrs', { ascending: true }).limit(200),
      supabase.from('process_issues').select('*').order('issue_date', { ascending: false }).limit(300),
      supabase.from('purchase_bills').select('*').order('bill_date', { ascending: false }).limit(200),
    ]);

    const stockData = stockRes.data || [];
    const processData = processRes.data || [];
    const purchData = purchRes.data || [];

    setStock(stockData);
    setProcess(processData);
    setPurchase(purchData);

    // Build design lifecycle — link purchase → process → (eventual sales)
    const designMap = {};
    processData.forEach(p => {
      const key = p.lot_no || p.challan_no;
      if (!designMap[key]) designMap[key] = { id: key, issues: [], receives: [] };
      if (p.status === 'pending' || p.status === 'issued') designMap[key].issues.push(p);
      else designMap[key].receives.push(p);
    });
    setLifecycle(Object.values(designMap).slice(0,20));

    // AI reorder recommendation
    const critical = stockData.filter(s => s.closing_qty_mtrs < 200).slice(0,8);
    if (critical.length > 0) {
      const rec = await askClaude(`You are an inventory manager for Shreerang Trendz textile company. Based on these low/critical stock items, give 4 bullet points on what to reorder urgently and any pattern you notice. Use Hinglish.

Critical stock: ${critical.map(s=>s.fabric_name+': '+Math.round(s.closing_qty_mtrs)+'mtrs').join(', ')}`);
      setAiReorder(rec);
    }
    setLoading(false);
  };

  const fmt = n => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${Math.round(n/1000)}K`;
  const statusColor = { critical:T.red, low:T.orange, normal:T.green };

  const getStockStatus = (qty) => qty < 100 ? 'critical' : qty < 300 ? 'low' : 'normal';

  const filteredStock = stock.filter(s => !searchStock || s.fabric_name?.toLowerCase().includes(searchStock.toLowerCase()));
  const criticalStock = stock.filter(s => s.closing_qty_mtrs < 100).length;
  const lowStock = stock.filter(s => s.closing_qty_mtrs >= 100 && s.closing_qty_mtrs < 300).length;
  const totalVal = stock.reduce((a,s)=>a+(s.total_value||0),0);

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300,color:T.muted}}>Loading stock from Tally...</div>;

  return (
    <div style={{ fontFamily:'system-ui,sans-serif', background:T.bg, minHeight:'100vh', padding:20 }}>
      <div style={{ background:T.navy, borderRadius:12, padding:'14px 20px', marginBottom:16 }}>
        <div style={{ color:'#fff', fontSize:18, fontWeight:700 }}>📦 AI Stock & Design Lifecycle</div>
        <div style={{ color:'rgba(255,255,255,0.6)', fontSize:12, marginTop:2 }}>Live Tally stock · Issue-to-Mill tracking · AI reorder intelligence</div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
        {[
          { label:'Total Fabrics', val: stock.length, color:T.text },
          { label:'Critical (<100m)', val: criticalStock, color:T.red },
          { label:'Low Stock (<300m)', val: lowStock, color:T.orange },
          { label:'Total Stock Value', val: fmt(totalVal), color:T.green },
        ].map((k,i) => (
          <div key={i} style={{ background:T.surface, borderRadius:10, padding:12, border:`1px solid ${T.border}`, textAlign:'center' }}>
            <div style={{ color:T.muted, fontSize:11, textTransform:'uppercase', marginBottom:4 }}>{k.label}</div>
            <div style={{ color:k.color, fontSize:20, fontWeight:700 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* AI Reorder Suggestion */}
      {aiReorder && (
        <div style={{ background:'#0B2E2B', borderRadius:10, padding:14, marginBottom:14 }}>
          <div style={{ color:T.gold, fontWeight:600, fontSize:12, marginBottom:6 }}>🤖 CLAUDE AI — REORDER RECOMMENDATIONS</div>
          <div style={{ color:'rgba(255,255,255,0.9)', fontSize:13, lineHeight:1.6, whiteSpace:'pre-line' }}>{aiReorder}</div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:14 }}>
        {['stock','lifecycle','mill-issues'].map(t => (
          <button key={t} onClick={()=>setActiveTab(t)} style={{ padding:'7px 16px', borderRadius:20, fontSize:12, fontWeight:500, border:'none', cursor:'pointer', background:activeTab===t?T.teal:T.surface, color:activeTab===t?'#fff':T.muted }}>
            {t==='stock'?'📦 Stock':t==='lifecycle'?'🔄 Design Lifecycle':'🏭 Mill Issues'}
          </button>
        ))}
      </div>

      {activeTab === 'stock' && (
        <div>
          <input value={searchStock} onChange={e=>setSearchStock(e.target.value)} placeholder="Search fabric..."
            style={{ width:'100%', padding:'8px 14px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, marginBottom:12, outline:'none' }} />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {filteredStock.map((s,i) => {
              const status = getStockStatus(s.closing_qty_mtrs||0);
              return (
                <div key={i} style={{ background:T.surface, borderRadius:10, padding:12, border:`2px solid ${status==='critical'?T.red:status==='low'?T.orange:T.border}` }}>
                  <div style={{ color:T.text, fontSize:12, fontWeight:500, marginBottom:6, lineHeight:1.3 }}>{s.fabric_name}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight:700, color:statusColor[status], fontSize:16 }}>{Math.round(s.closing_qty_mtrs||0)} m</div>
                      {s.total_value > 0 && <div style={{ color:T.muted, fontSize:10 }}>{fmt(s.total_value)}</div>}
                    </div>
                    {status !== 'normal' && (
                      <span style={{ background: status==='critical'?'#FEE2E2':'#FFF0E6', color:statusColor[status], fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20 }}>
                        {status.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {s.sync_date && <div style={{ color:T.muted, fontSize:9, marginTop:4 }}>Synced: {s.sync_date}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'lifecycle' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {process.slice(0,20).map((p,i) => (
            <div key={i} style={{ background:T.surface, borderRadius:10, border:`1px solid ${T.border}`, overflow:'hidden' }}>
              <div style={{ padding:'10px 14px', background: p.shortage_pct > 15 ? '#FEE2E2' : p.shortage_pct > 0 ? '#FFF0E6' : T.bg, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <span style={{ fontWeight:600, color:T.text, fontSize:13 }}>Challan: {p.challan_no}</span>
                  <span style={{ marginLeft:10, color:T.muted, fontSize:11 }}>{p.issue_date} · {p.job_worker_name?.substring(0,20)}</span>
                </div>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  {p.shortage_pct && <span style={{ color: p.shortage_pct>15?T.red:T.orange, fontWeight:600, fontSize:12 }}>{p.shortage_pct.toFixed(1)}% shrinkage</span>}
                  <span style={{ background: p.status==='pending'?'#FFF0E6':p.status==='received'?'#F0FFF4':'#EEF8F6', color: p.status==='pending'?T.orange:p.status==='received'?T.green:T.teal, fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20 }}>
                    {(p.status||'issued').toUpperCase()}
                  </span>
                </div>
              </div>
              <div style={{ padding:'8px 14px', display:'flex', gap:20, fontSize:12 }}>
                <span style={{ color:T.muted }}>Issued: <b style={{color:T.text}}>{p.metres_issued ? Math.round(p.metres_issued)+' m' : '-'}</b></span>
                {p.shortage_mtrs && <span style={{ color:T.muted }}>Short: <b style={{color:T.red}}>{Math.round(p.shortage_mtrs)} m</b></span>}
                {p.lot_no && <span style={{ color:T.muted }}>Lot: <b style={{color:T.text}}>{p.lot_no}</b></span>}
                {p.narration && <span style={{ color:T.muted }}>Note: <b style={{color:T.text}}>{p.narration?.substring(0,30)}</b></span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'mill-issues' && (
        <div>
          {/* Group by job worker */}
          {Object.entries(process.reduce((acc, p) => {
            const n = p.job_worker_name || 'Unknown';
            if (!acc[n]) acc[n] = [];
            acc[n].push(p);
            return acc;
          }, {})).map(([mill, batches], i) => {
            const withShrink = batches.filter(b=>b.shortage_pct);
            const avgShrink = withShrink.length > 0 ? withShrink.reduce((a,b)=>a+(b.shortage_pct||0),0)/withShrink.length : null;
            return (
              <div key={i} style={{ background:T.surface, borderRadius:10, padding:14, marginBottom:10, border:`2px solid ${avgShrink>15?T.red:avgShrink>10?T.orange:T.border}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontWeight:600, color:T.text, fontSize:14 }}>{mill}</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <span style={{ color:T.muted, fontSize:12 }}>{batches.length} batches</span>
                    {avgShrink && <span style={{ fontWeight:700, color:avgShrink>15?T.red:avgShrink>10?T.orange:T.green, fontSize:14 }}>{avgShrink.toFixed(1)}% avg shrink</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {batches.slice(0,5).map((b,j) => (
                    <div key={j} style={{ background:T.bg, borderRadius:6, padding:'5px 10px', fontSize:11 }}>
                      <span style={{ color:T.muted }}>{b.challan_no}</span>
                      {b.shortage_pct && <span style={{ color:b.shortage_pct>15?T.red:T.orange, fontWeight:600, marginLeft:4 }}>{b.shortage_pct.toFixed(0)}%</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
