import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';
import { syncVouchersFromTally } from '@/services/TallySyncService';

const T = { teal:'#2BA898', navy:'#0B2E2B', green:'#1E9E5A', red:'#E74C3C', gold:'#E8A800', blue:'#2468C8', bg:'#F0F9F7', surface:'#fff', border:'#D0EDE8', text:'#0B2E2B', muted:'#6A9B95' };
const fmt = (n) => '\u20B9' + Number(n||0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '-';

function BillDetailModal({ bill, onClose }) {
  if (!bill) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:14, padding:28, maxWidth:540, width:'90%', maxHeight:'85vh', overflow:'auto' }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:800, color:T.navy, margin:0 }}>Purchase Bill Detail</h2>
            <div style={{ fontSize:13, color:T.muted }}>{bill.bill_number}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:T.muted }}>×</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {[
            { label:'Bill Number', value: bill.bill_number },
            { label:'Date', value: fmtDate(bill.bill_date) },
            { label:'Supplier', value: bill.supplier_name || bill.party_name },
            { label:'Total Amount', value: fmt(bill.total_amount), highlight:true },
            { label:'Status', value: bill.status },
            { label:'Notes', value: bill.notes || '-' },
            { label:'Ref', value: bill.ref_number || bill.reference || '-' },
            { label:'Synced', value: fmtDate(bill.created_at) },
          ].map(f => (
            <div key={f.label} style={{ background:T.bg, borderRadius:8, padding:'10px 14px', border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:700, textTransform:'uppercase' }}>{f.label}</div>
              <div style={{ fontSize:14, fontWeight: f.highlight ? 800 : 600, color: f.highlight ? T.red : T.text, marginTop:2 }}>{f.value}</div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ marginTop:16, padding:'8px 16px', background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, cursor:'pointer' }}>Close</button>
      </div>
    </div>
  );
}

const PurchaseBillDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [stats, setStats] = useState({ total:0, count:0 });

  const loadBills = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('purchase_bills').select('*').order('bill_date', { ascending:false }).limit(200);
    setBills(data||[]);
    setStats({ count:(data||[]).length, total:(data||[]).reduce((s,b)=>s+(b.total_amount||0),0) });
    setLoading(false);
  }, []);

  useEffect(() => { loadBills(); }, [loadBills]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncVouchersFromTally();
      await loadBills();
      alert(`Sync complete! Purchase: ${result.purchase}`);
    } catch(e) { alert('Sync failed: ' + e.message); }
    setSyncing(false);
  };

  const filtered = bills.filter(b =>
    !search ||
    (b.bill_number||''). toLowerCase().includes(search.toLowerCase()) ||
    (b.supplier_name||''). toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background:T.bg, minHeight:'100vh', padding:24 }}>
      <Helmet><title>Purchase Bills — Shreerang</title></Helmet>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:T.navy, margin:0 }}>📥 Purchase Bills</h1>
          <p style={{ color:T.muted, fontSize:13, margin:'4px 0 0' }}>Tally Prime purchase vouchers</p>
        </div>
        <button onClick={handleSync} disabled={syncing}
          style={{ padding:'8px 18px', background:T.teal, color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
          {syncing ? '⏳ Syncing...' : '🔄 Sync from Tally'}
        </button>
      </div>
      <div style={{ display:'flex', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Bills', value: stats.count, icon:'📋', color:T.teal },
          { label:'Total Value', value: fmt(stats.total), icon:'💰', color:T.red },
        ].map(s => (
          <div key={s.label} style={{ background:T.surface, borderRadius:12, padding:'14px 18px', border:`1px solid ${T.border}`, flex:1 }}>
            <div style={{ fontSize:20 }}>{s.icon}</div>
            <div style={{ fontSize:11, color:T.muted, fontWeight:600 }}>{s.label}</div>
            <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ background:T.surface, borderRadius:12, border:`1px solid ${T.border}`, marginBottom:16, padding:12 }}>
        <input placeholder="Search bill # or supplier..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ padding:'8px 12px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, width:'100%', outline:'none' }}/>
      </div>
      <div style={{ background:T.surface, borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:T.muted }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:T.muted }}>
            <div style={{ fontSize:32 }}>📥</div>
            <div>No purchase bills. Click "Sync from Tally" to import.</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:T.bg }}>
                {['Bill #','Date','Supplier','Amount','Status','Action'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:T.muted, textTransform:'uppercase', borderBottom:`1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((bill, idx) => (
                <tr key={bill.id} style={{ background: idx%2===0 ? T.surface : T.bg, cursor:'pointer' }}
                    onClick={() => setSelectedBill(bill)}>
                  <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:T.teal }}>{bill.bill_number}</td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{fmtDate(bill.bill_date)}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{bill.supplier_name}</td>
                  <td style={{ padding:'10px 14px', fontSize:14, fontWeight:800, color:T.red }}>{fmt(bill.total_amount)}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ fontSize:10, background:'#D1FAE5', color:'#065F46', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>{bill.status||'pending'}</span>
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <button onClick={e=>{e.stopPropagation();setSelectedBill(bill);}}
                      style={{ fontSize:11, background:T.teal+'15', color:T.teal, border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontWeight:600 }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <BillDetailModal bill={selectedBill} onClose={()=>setSelectedBill(null)} />
    </div>
  );
};
export default PurchaseBillDashboard;
