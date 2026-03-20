import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';
import { syncVouchersFromTally } from '@/services/TallySyncService';

const T = { teal:'#2BA898', navy:'#0B2E2B', green:'#1E9E5A', red:'#E74C3C', gold:'#E8A800', blue:'#2468C8', bg:'#F0F9F7', surface:'#fff', border:'#D0EDE8', text:'#0B2E2B', muted:'#6A9B95' };
const fmt = (n) => '\u20B9' + Number(n||0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '-';

function BillDetailModal({ bill, onClose }) {
  if (!bill) return null;
  const fields = [
    { label: 'Bill Number', value: bill.bill_number },
    { label: 'Date', value: fmtDate(bill.bill_date) },
    { label: 'Customer', value: bill.customer_name },
    { label: 'Total Amount', value: fmt(bill.total_amount), highlight: true },
    { label: 'IGST', value: fmt(bill.igst_amount) },
    { label: 'CGST', value: fmt(bill.cgst_amount) },
    { label: 'SGST', value: fmt(bill.sgst_amount) },
    { label: 'HSN Code', value: bill.hsn_code || '-' },
    { label: 'Item', value: bill.item_name || 'Fabric' },
    { label: 'Quantity', value: bill.quantity ? bill.quantity + ' mtr' : '-' },
    { label: 'Rate', value: bill.rate ? fmt(bill.rate) + '/mtr' : '-' },
    { label: 'Voucher No', value: bill.tally_voucher_no || bill.bill_number },
    { label: 'Notes', value: bill.notes || '-' },
    { label: 'Status', value: bill.status },
    { label: 'Tally Sync', value: bill.tally_sync_status || 'synced' },
    { label: 'Created', value: fmtDate(bill.created_at) },
  ];
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center' }}
         onClick={onClose}>
      <div style={{ background:T.surface, borderRadius:14, padding:28, maxWidth:580, width:'90%', maxHeight:'85vh', overflow:'auto' }}
           onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:800, color:T.navy, margin:0 }}>Sales Bill Detail</h2>
            <div style={{ fontSize:13, color:T.muted, marginTop:2 }}>{bill.bill_number}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:T.muted }}>×</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {fields.map(f => (
            <div key={f.label} style={{ background:T.bg, borderRadius:8, padding:'10px 14px', border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:10, color:T.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>{f.label}</div>
              <div style={{ fontSize:14, fontWeight: f.highlight ? 800 : 600, color: f.highlight ? T.green : T.text, marginTop:2 }}>{f.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:16, display:'flex', gap:10 }}>
          <a href={`/admin/customers?search=${encodeURIComponent(bill.customer_name||'')}`}
             style={{ padding:'8px 16px', background:T.teal+'15', color:T.teal, borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>
            View Customer →
          </a>
          <button onClick={onClose} style={{ padding:'8px 16px', background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, cursor:'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const SalesBillDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stats, setStats] = useState({ total: 0, count: 0, today: 0, thisMonth: 0 });

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('sales_bills').select('*').order('bill_date', { ascending: false }).limit(200);
      if (dateFrom) q = q.gte('bill_date', dateFrom);
      if (dateTo) q = q.lte('bill_date', dateTo);
      const { data, error } = await q;
      if (error) throw error;
      setBills(data || []);

      // Stats
      const today = new Date().toISOString().slice(0,10);
      const monthStart = new Date().toISOString().slice(0,8) + '01';
      const todayBills = (data||[]).filter(b => b.bill_date === today);
      const monthBills = (data||[]).filter(b => b.bill_date >= monthStart);
      setStats({
        total: (data||[]).reduce((s,b) => s + (b.total_amount||0), 0),
        count: (data||[]).length,
        today: todayBills.reduce((s,b) => s + (b.total_amount||0), 0),
        thisMonth: monthBills.reduce((s,b) => s + (b.total_amount||0), 0),
      });
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { loadBills(); }, [loadBills]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncVouchersFromTally();
      await loadBills();
      alert(`Sync complete! Sales: ${result.sales}, Purchase: ${result.purchase}${result.errors?.length ? '\nErrors: ' + result.errors.join(', ') : ''}`);
    } catch(e) { alert('Sync failed: ' + e.message); }
    setSyncing(false);
  };

  const filtered = bills.filter(b =>
    !search ||
    (b.bill_number||'').toLowerCase().includes(search.toLowerCase()) ||
    (b.customer_name||'').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ background:T.bg, minHeight:'100vh', padding:24 }}>
      <Helmet><title>Sales Bills — Shreerang</title></Helmet>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, color:T.navy, margin:0 }}>📤 Sales Bills</h1>
          <p style={{ color:T.muted, fontSize:13, margin:'4px 0 0' }}>Tally Prime sales vouchers</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={handleSync} disabled={syncing}
            style={{ padding:'8px 18px', background:T.teal, color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer', opacity: syncing ? 0.7 : 1 }}>
            {syncing ? '⏳ Syncing...' : '🔄 Sync from Tally'}
          </button>
          <button onClick={() => navigate('/admin/accounting/sales-bills/new')}
            style={{ padding:'8px 18px', background:T.green, color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
            + New Bill
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        {[
          { label:'Total Bills', value: stats.count, icon:'📋', color:T.teal },
          { label:'Total Value', value: fmt(stats.total), icon:'💰', color:T.green },
          { label:'Today', value: fmt(stats.today), icon:'📅', color:T.blue },
          { label:'This Month', value: fmt(stats.thisMonth), icon:'📊', color:T.gold },
        ].map(s => (
          <div key={s.label} style={{ background:T.surface, borderRadius:12, padding:'14px 18px', border:`1px solid ${T.border}`, flex:1, minWidth:140 }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:11, color:T.muted, fontWeight:600 }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background:T.surface, borderRadius:12, padding:16, border:`1px solid ${T.border}`, marginBottom:16, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        <input placeholder="Search bill # or customer..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{ padding:'8px 12px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, flex:1, minWidth:200, outline:'none' }}/>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
          style={{ padding:'8px 12px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, outline:'none' }}/>
        <span style={{ color:T.muted, fontSize:13 }}>to</span>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
          style={{ padding:'8px 12px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, outline:'none' }}/>
        <button onClick={loadBills} style={{ padding:'8px 14px', background:T.teal, color:'#fff', border:'none', borderRadius:8, fontSize:13, cursor:'pointer' }}>Apply</button>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }}
            style={{ padding:'8px 14px', background:T.bg, border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, cursor:'pointer', color:T.muted }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div style={{ background:T.surface, borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, fontSize:12, color:T.muted, fontWeight:600 }}>
          {filtered.length} bills {search && `matching "${search}"`}
        </div>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', color:T.muted }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', color:T.muted }}>
            <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
            <div>No bills found. Click "Sync from Tally" to import.</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:T.bg }}>
                {['Bill #', 'Date', 'Customer', 'Amount', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:`1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((bill, idx) => (
                <tr key={bill.id} style={{ background: idx%2===0 ? T.surface : T.bg, cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = T.teal+'12'}
                    onMouseLeave={e => e.currentTarget.style.background = idx%2===0 ? T.surface : T.bg}
                    onClick={() => setSelectedBill(bill)}>
                  <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:T.teal }}>{bill.bill_number}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, color:T.text }}>{fmtDate(bill.bill_date)}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, color:T.text, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{bill.customer_name}</td>
                  <td style={{ padding:'10px 14px', fontSize:14, fontWeight:800, color:T.green }}>{fmt(bill.total_amount)}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ fontSize:10, background: bill.status==='synced' ? '#D1FAE5' : '#FEF3C7', color: bill.status==='synced' ? '#065F46' : '#92400E', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>
                      {bill.status || 'pending'}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <button onClick={e => { e.stopPropagation(); setSelectedBill(bill); }}
                      style={{ fontSize:11, background:T.teal+'15', color:T.teal, border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontWeight:600 }}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      <BillDetailModal bill={selectedBill} onClose={() => setSelectedBill(null)} />
    </div>
  );
};

export default SalesBillDashboard;
