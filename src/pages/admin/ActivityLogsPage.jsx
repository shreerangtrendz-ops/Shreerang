import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchLogs(); }, []);

  async function fetchLogs() {
    setLoading(true);
    // Pull recent activity from tally_sync_log + sales_orders + quotations
    const [{ data: syncLogs }, { data: orders }, { data: bills }, { data: quotes }] = await Promise.all([
      supabase.from('tally_sync_log').select('sync_type,status,records_synced,synced_at').order('synced_at',{ascending:false}).limit(20),
      supabase.from('sales_orders').select('order_number,customer_name,status,created_at').order('created_at',{ascending:false}).limit(10),
      supabase.from('purchase_bills').select('bill_number,supplier_name,total_amount,created_at').order('created_at',{ascending:false}).limit(10),
      supabase.from('quotations').select('quotation_number,party_name,status,created_at').order('created_at',{ascending:false}).limit(10),
    ]);
    const allLogs = [
      ...(syncLogs||[]).map(l=>({ type:'sync', icon:'🔄', title:`Tally Sync — ${l.sync_type}`, sub:`${l.records_synced} records · ${l.status}`, time:l.synced_at, status:l.status })),
      ...(orders||[]).map(o=>({ type:'order', icon:'📋', title:`Order ${o.order_number||'—'}`, sub:`${o.customer_name} · ${o.status}`, time:o.created_at, status:o.status })),
      ...(bills||[]).map(b=>({ type:'purchase', icon:'🛒', title:`Purchase Bill ${b.bill_number}`, sub:`${b.supplier_name} · ₹${Number(b.total_amount||0).toLocaleString('en-IN')}`, time:b.created_at, status:'success' })),
      ...(quotes||[]).map(q=>({ type:'quote', icon:'📋', title:`Quotation ${q.quotation_number}`, sub:`${q.party_name} · ${q.status}`, time:q.created_at, status:q.status })),
    ].sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,50);
    setLogs(allLogs);
    setLoading(false);
  }

  const filtered = logs.filter(l => {
    const m = l.title.toLowerCase().includes(search.toLowerCase()) || l.sub.toLowerCase().includes(search.toLowerCase());
    return filter==='all' ? m : m && l.type===filter;
  });

  const timeAgo = t => {
    if (!t) return '—';
    const diff = Date.now() - new Date(t);
    const m = Math.floor(diff/60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m/60);
    if (h < 24) return `${h}h ago`;
    return new Date(t).toLocaleDateString('en-IN');
  };

  const statusColor = s => ({ success: '#E8FFF4', error: '#FFF3F3', pending: '#FFF8E8' }[s] || '#f1f5f9');

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'var(--bg,#F4FBFA)', minHeight:'100vh' }}>
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', padding:'16px 24px' }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
          <span>📜</span> Activity Logs
        </div>
        <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>All system activity · Syncs, orders, bills, quotations</p>
      </div>

      <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search activity…"
            style={{ flex:1, maxWidth:320, padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13 }} />
          {['all','sync','order','purchase','quote'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{ padding:'6px 14px', borderRadius:20, border:'none', fontSize:12, fontWeight:600, cursor:'pointer',
              background: filter===f ? '#0B2E2B' : '#fff', color: filter===f ? '#3DBFAE' : '#6A9B95',
              boxShadow: filter===f ? '0 2px 8px rgba(0,0,0,.15)' : '0 1px 4px rgba(0,0,0,.07)' }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
          <button onClick={fetchLogs} style={{ marginLeft:'auto', padding:'7px 14px', borderRadius:8, border:'none', background:'#3DBFAE', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>↻ Refresh</button>
        </div>

        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 2px 10px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.12)', overflow:'hidden' }}>
          {loading ? <div style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>Loading activity…</div>
          : filtered.length===0 ? <div style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>No activity found yet. Activity will appear here as you use the system.</div>
          : filtered.map((log,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'12px 18px', borderBottom:'1px solid rgba(43,168,152,.07)' }}>
              <div style={{ width:34, height:34, borderRadius:9, background:'#F4FBFA', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{log.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:13, color:'#0B2E2B' }}>{log.title}</div>
                <div style={{ fontSize:12, color:'#6A9B95', marginTop:2 }}>{log.sub}</div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:11, color:'#94a3b8' }}>{timeAgo(log.time)}</div>
                <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700, marginTop:4, display:'inline-block',
                  background: log.status==='success'||log.status==='confirmed'?'#E8FFF4':log.status==='error'?'#FFF3F3':'#FFF8E8',
                  color: log.status==='success'||log.status==='confirmed'?'#1E9E5A':log.status==='error'?'#ef4444':'#D4920A' }}>
                  {log.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
