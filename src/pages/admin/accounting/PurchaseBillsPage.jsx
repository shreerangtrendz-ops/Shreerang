import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

export default function PurchaseBillsPage() {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bill_number:'', bill_date:'', supplier_name:'', item_name:'', quantity:'', rate:'', total_amount:'', hsn_code:'', fabric_type:'', notes:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBills(); }, []);

  async function fetchBills() {
    setLoading(true);
    let q = supabase.from('purchase_bills').select('*').order('bill_date', { ascending: false });
    if (dateFrom) q = q.gte('bill_date', dateFrom);
    if (dateTo)   q = q.lte('bill_date', dateTo);
    const { data, error } = await q;
    if (!error) setBills(data || []);
    setLoading(false);
  }

  async function syncFromTally() {
    setSyncing(true);
    try {
      const r = await fetch('/api/tally-sync', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
      const j = await r.json();
      if (j.success || j.synced?.purchase > 0) {
        alert(`✅ Synced ${j.synced?.purchase || 0} purchase bills from Tally`);
        fetchBills();
      } else {
        alert('Tally offline or no data: ' + (j.errors?.join(', ') || 'Check FRP tunnel'));
      }
    } catch(e) { alert('Error: ' + e.message); }
    finally { setSyncing(false); }
  }

  async function saveBill() {
    if (!form.bill_number || !form.bill_date || !form.supplier_name) { alert('Bill No, Date, Supplier required'); return; }
    setSaving(true);
    const row = { ...form, quantity: parseFloat(form.quantity)||0, rate: parseFloat(form.rate)||0, total_amount: parseFloat(form.total_amount)||0, status: 'manual' };
    const { error } = await supabase.from('purchase_bills').upsert(row, { onConflict: 'bill_number' });
    if (error) alert('Error: ' + error.message);
    else { setShowForm(false); setForm({ bill_number:'', bill_date:'', supplier_name:'', item_name:'', quantity:'', rate:'', total_amount:'', hsn_code:'', fabric_type:'', notes:'' }); fetchBills(); }
    setSaving(false);
  }

  const filtered = bills.filter(b =>
    b.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.bill_number?.toLowerCase().includes(search.toLowerCase()) ||
    b.item_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmt = filtered.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const fmt = n => '₹' + Number(n||0).toLocaleString('en-IN', { maximumFractionDigits:0 });

  const ST = { fontFamily:"'DM Sans',sans-serif", background:'var(--bg,#F4FBFA)', minHeight:'100vh' };
  const CARD = { background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 2px 10px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.12)' };
  const BTN = (extra={}) => ({ padding:'8px 16px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", ...extra });

  return (
    <div style={ST}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:20 }}>🛒</span> Purchase Bills
          </div>
          <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>Tally purchase vouchers · Supabase synced</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setShowForm(true)} style={BTN({ background:'#E8A800', color:'#fff' })}>+ Add Manual Bill</button>
          <button onClick={syncFromTally} disabled={syncing} style={BTN({ background: syncing?'#555':'linear-gradient(135deg,#3DBFAE,#2BA898)', color:'#fff', opacity: syncing?0.7:1 })}>
            {syncing ? '⏳ Syncing…' : '↻ Sync from Tally'}
          </button>
        </div>
      </div>

      <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { label:'Total Bills', value: filtered.length, color:'#2468C8' },
            { label:'Total Amount', value: fmt(totalAmt), color:'#1E9E5A' },
            { label:'This Month', value: fmt(filtered.filter(b => b.bill_date?.startsWith(new Date().toISOString().slice(0,7))).reduce((s,b)=>s+Number(b.total_amount||0),0)), color:'#D4920A' },
          ].map((c,i) => (
            <div key={i} style={CARD}>
              <div style={{ fontSize:11, color:'#6A9B95', marginBottom:4 }}>{c.label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search supplier, bill no…"
            style={{ flex:1, minWidth:200, padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13 }} />
          <input type="date" value={dateFrom} onChange={e=>{ setDateFrom(e.target.value); }} style={{ padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13 }} />
          <input type="date" value={dateTo} onChange={e=>{ setDateTo(e.target.value); }} style={{ padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13 }} />
          <button onClick={fetchBills} style={BTN({ background:'#3DBFAE', color:'#fff' })}>Filter</button>
        </div>

        {/* Table */}
        <div style={{ ...CARD, padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#F4FBFA' }}>
                {['Bill No','Date','Supplier','Item','Qty','Rate','Total','Status','Source'].map(h=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#0B2E2B', borderBottom:'1px solid rgba(43,168,152,.15)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>
                  No bills found. {bills.length === 0 ? 'Click "Sync from Tally" to import bills.' : 'Try adjusting filters.'}
                </td></tr>
              ) : filtered.map(b => (
                <tr key={b.id} style={{ borderBottom:'1px solid rgba(43,168,152,.08)' }}>
                  <td style={{ padding:'9px 14px', fontWeight:600, color:'#0B2E2B' }}>{b.bill_number}</td>
                  <td style={{ padding:'9px 14px', color:'#4A7A74' }}>{b.bill_date}</td>
                  <td style={{ padding:'9px 14px', fontWeight:500 }}>{b.supplier_name}</td>
                  <td style={{ padding:'9px 14px', color:'#4A7A74', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.item_name||'—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.quantity||'—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right' }}>{b.rate ? fmt(b.rate) : '—'}</td>
                  <td style={{ padding:'9px 14px', textAlign:'right', fontWeight:700, color:'#1E9E5A' }}>{fmt(b.total_amount)}</td>
                  <td style={{ padding:'9px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700,
                      background: b.status==='synced'?'#E8FFF4':b.status==='manual'?'#FFF8E8':'#F0F4FF',
                      color: b.status==='synced'?'#1E9E5A':b.status==='manual'?'#D4920A':'#2468C8' }}>
                      {b.status||'pending'}
                    </span>
                  </td>
                  <td style={{ padding:'9px 14px', color:'#6A9B95', fontSize:11 }}>{b.status==='synced'?'Tally':'Manual'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, width:520, maxHeight:'80vh', overflowY:'auto' }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, marginBottom:16, display:'flex', justifyContent:'space-between' }}>
              Add Purchase Bill <button onClick={()=>setShowForm(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#6A9B95' }}>×</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[
                ['bill_number','Bill Number *'],['bill_date','Bill Date *'],
                ['supplier_name','Supplier Name *'],['fabric_type','Fabric Type'],
                ['item_name','Item Name'],['hsn_code','HSN Code'],
                ['quantity','Quantity'],['rate','Rate per Metre'],
                ['total_amount','Total Amount *'],
              ].map(([key,label]) => (
                <div key={key} style={{ gridColumn: key==='notes'?'1/-1':'auto' }}>
                  <label style={{ fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 }}>{label}</label>
                  <input type={['quantity','rate','total_amount'].includes(key)?'number':key==='bill_date'?'date':'text'}
                    value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                    style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={{ fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 }}>Notes</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, boxSizing:'border-box', minHeight:60 }} />
              </div>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:16 }}>
              <button onClick={saveBill} disabled={saving} style={BTN({ background:'linear-gradient(135deg,#3DBFAE,#2BA898)', color:'#fff', flex:1, padding:'10px' })}>
                {saving ? 'Saving…' : 'Save Bill'}
              </button>
              <button onClick={()=>setShowForm(false)} style={BTN({ background:'#f1f5f9', color:'#4A7A74' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
