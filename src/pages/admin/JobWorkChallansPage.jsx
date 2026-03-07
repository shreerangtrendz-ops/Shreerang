import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
const today = () => new Date().toISOString().split('T')[0];
const fmt = n => '₹' + Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

const PROCESS_TYPES = ['Embroidery','Screen Print','Digital Print','Dyeing','Washing','Cutting','Sequin Work','Hand Work','Laser Cut','Knitting'];
const STATUS = { open:{bg:'rgba(43,168,152,.12)',c:'#2BA898'}, in_transit:{bg:'rgba(36,104,200,.1)',c:'#2468C8'}, received:{bg:'rgba(30,158,90,.1)',c:'#1E9E5A'}, partial:{bg:'rgba(212,146,10,.1)',c:'#D4920A'}, cancelled:{bg:'#f1f5f9',c:'#94a3b8'} };
const emptyForm = () => ({ challan_number:'', date:today(), party_name:'', job_worker_id:'', process_type:'', fabric_description:'', quantity_sent:'', unit:'meters', fabric_rate:'', base_fabric_id:'', status:'open', expected_return_date:'', notes:'' });

export default function JobWorkChallansPage() {
  const [challans, setChallans] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ total:0, open:0, valueAtMill:0, received:0 });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: ch }, { data: wk }, { data: fb }] = await Promise.all([
      supabase.from('challans').select('*').order('date',{ascending:false}).limit(200),
      supabase.from('job_workers').select('id,worker_name,process_type,specialization,manufacturing_entry_required,status').eq('status','active').order('worker_name'),
      supabase.from('base_fabrics').select('id,fabric_name,base_fabric_name,supplier_cost').eq('status','active').order('fabric_name').limit(100),
    ]);
    const chArr = ch || [];
    setChallans(chArr);
    setWorkers(wk || []);
    setFabrics(fb || []);
    const open = chArr.filter(c=>c.status==='open'||c.status==='in_transit');
    const valueAtMill = open.reduce((s,c)=>s+Number(c.fabric_value||0),0);
    setStats({ total:chArr.length, open:open.length, valueAtMill, received:chArr.filter(c=>c.status==='received').length });
    setLoading(false);
  }

  async function generateChallanNumber() {
    const year = new Date().getFullYear();
    const { count } = await supabase.from('challans').select('*',{count:'exact',head:true}).gte('date',`${year}-01-01`);
    return `CH-${year}-${String((count||0)+1).padStart(4,'0')}`;
  }

  async function openAdd() {
    const num = await generateChallanNumber();
    setForm({...emptyForm(), challan_number:num});
    setEditId(null); setShowForm(true);
  }

  function openEdit(c) { setForm({...c}); setEditId(c.id); setShowForm(true); }

  function selectWorker(id) {
    const w = workers.find(w=>w.id===id);
    setForm(p=>({ ...p, job_worker_id:id, party_name:w?.worker_name||p.party_name, process_type:w?.process_type||w?.specialization||p.process_type }));
  }

  function selectFabric(id) {
    const f = fabrics.find(f=>f.id===id);
    setForm(p=>({ ...p, base_fabric_id:id, fabric_description:f?.fabric_name||f?.base_fabric_name||p.fabric_description, fabric_rate:f?.supplier_cost||p.fabric_rate }));
  }

  async function saveChallan() {
    if (!form.challan_number||!form.party_name||!form.date) { alert('Challan Number, Date and Party Name are required'); return; }
    setSaving(true);
    const row = { ...form, quantity_sent:parseFloat(form.quantity_sent)||0, fabric_rate:parseFloat(form.fabric_rate)||0 };
    const { error } = editId
      ? await supabase.from('challans').update(row).eq('id',editId)
      : await supabase.from('challans').insert(row);
    if (error) { alert(error.message); setSaving(false); return; }
    setShowForm(false); loadAll(); setSaving(false);
  }

  async function updateStatus(id, status) {
    const updates = { status };
    if (status==='received') updates.actual_return_date = today();
    await supabase.from('challans').update(updates).eq('id',id);
    loadAll();
  }

  const filtered = challans.filter(c => {
    const txt = `${c.challan_number} ${c.party_name} ${c.process_type||''} ${c.fabric_description||''}`.toLowerCase();
    const matchSearch = txt.includes(search.toLowerCase());
    const matchStatus = statusFilter==='all' || c.status===statusFilter;
    return matchSearch && matchStatus;
  });

  const BTN = e => ({ padding:'8px 16px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", ...e });
  const CARD = { background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 2px 10px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.12)' };
  const INP = { padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, width:'100%', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" };
  const LBL = { fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 };

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'var(--bg,#F4FBFA)', minHeight:'100vh' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
            <span>📦</span> Job Work Challans
          </div>
          <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>Issue fabric to mills & job workers · Track returns</p>
        </div>
        <button onClick={openAdd} style={BTN({ background:'linear-gradient(135deg,#E8A800,#D4920A)', color:'#fff' })}>+ Issue Challan</button>
      </div>

      <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
        {/* KPI Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {[
            { label:'Total Challans', value:stats.total, icon:'📋', color:'#2468C8' },
            { label:'Open / In Transit', value:stats.open, icon:'🏭', color:'#D4920A' },
            { label:'Value at Mill', value:fmt(stats.valueAtMill), icon:'💰', color:'#C9106E' },
            { label:'Received Back', value:stats.received, icon:'✅', color:'#1E9E5A' },
          ].map((c,i)=>(
            <div key={i} style={CARD}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:18 }}>{c.icon}</span>
                <div style={{ fontSize:10, fontWeight:700, color:'#6A9B95', textTransform:'uppercase', letterSpacing:'0.8px' }}>{c.label}</div>
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Workers requiring manufacturing entry */}
        {workers.filter(w=>w.manufacturing_entry_required).length > 0 && (
          <div style={{ background:'#FFF8E8', border:'1px solid rgba(212,146,10,.25)', borderRadius:10, padding:'10px 16px', fontSize:12, color:'#92754A', display:'flex', gap:8, alignItems:'center' }}>
            <span>⚡</span>
            <div>
              <strong>Manufacturing Entry Required</strong> for: {workers.filter(w=>w.manufacturing_entry_required).map(w=>w.worker_name).join(', ')} — without it, design values won't reflect in dashboard.
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search challan, party, process…"
            style={{ flex:1, maxWidth:300, ...INP }} />
          {['all','open','in_transit','received','partial'].map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)} style={{ padding:'6px 12px', borderRadius:20, border:'none', fontSize:11, fontWeight:600, cursor:'pointer',
              background:statusFilter===s?'#0B2E2B':'#fff', color:statusFilter===s?'#3DBFAE':'#6A9B95',
              boxShadow:statusFilter===s?'0 2px 8px rgba(0,0,0,.15)':'0 1px 4px rgba(0,0,0,.07)' }}>
              {s==='all'?'All':s.replace('_',' ').replace(/\w/g,c=>c.toUpperCase())}
            </button>
          ))}
          <span style={{ fontSize:11, color:'#94a3b8', marginLeft:'auto' }}>{filtered.length} challans</span>
        </div>

        {/* Table */}
        <div style={{ ...CARD, padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#F4FBFA' }}>
                {['Challan No','Date','Mill / Party','Process','Fabric','Qty Sent','Fabric Value','Expected Return','Status','Actions'].map(h=>(
                  <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:700, color:'#0B2E2B', borderBottom:'1px solid rgba(43,168,152,.15)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>Loading challans…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ padding:30, textAlign:'center', color:'#94a3b8' }}>
                  No challans found. Click "Issue Challan" to create one.
                </td></tr>
              ) : filtered.map(c => {
                const st = STATUS[c.status] || { bg:'#f1f5f9', c:'#64748b' };
                const overdue = c.status!=='received' && c.expected_return_date && new Date(c.expected_return_date) < new Date();
                return (
                  <tr key={c.id} style={{ borderBottom:'1px solid rgba(43,168,152,.07)', background: overdue?'rgba(239,68,68,.03)':'transparent' }}>
                    <td style={{ padding:'9px 12px', fontWeight:700, color:'#2468C8' }}>
                      {c.challan_number}
                      {overdue && <span style={{ marginLeft:4, fontSize:10, color:'#ef4444' }}>⚠ OVERDUE</span>}
                    </td>
                    <td style={{ padding:'9px 12px', color:'#4A7A74' }}>{fmtDate(c.date)}</td>
                    <td style={{ padding:'9px 12px', fontWeight:500 }}>{c.party_name}</td>
                    <td style={{ padding:'9px 12px', color:'#6E44C8' }}>{c.process_type||'—'}</td>
                    <td style={{ padding:'9px 12px', fontSize:11, color:'#6A9B95', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.fabric_description||'—'}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:600 }}>{c.quantity_sent||0} {c.unit||'m'}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:600, color:'#C9106E' }}>{fmt(c.fabric_value)}</td>
                    <td style={{ padding:'9px 12px', color: overdue?'#ef4444':'#4A7A74', fontWeight: overdue?700:400 }}>{fmtDate(c.expected_return_date)}</td>
                    <td style={{ padding:'9px 12px' }}>
                      <span style={{ padding:'3px 10px', borderRadius:100, fontSize:10, fontWeight:700, background:st.bg, color:st.c }}>
                        {c.status?.replace('_',' ')?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding:'9px 12px' }}>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        <button onClick={()=>openEdit(c)} style={BTN({ background:'#EEF6FF', color:'#2468C8', padding:'3px 8px', fontSize:10 })}>Edit</button>
                        {c.status==='open' && <button onClick={()=>updateStatus(c.id,'in_transit')} style={BTN({ background:'rgba(36,104,200,.1)', color:'#2468C8', padding:'3px 8px', fontSize:10 })}>Dispatch</button>}
                        {(c.status==='open'||c.status==='in_transit') && <button onClick={()=>updateStatus(c.id,'received')} style={BTN({ background:'rgba(30,158,90,.1)', color:'#1E9E5A', padding:'3px 8px', fontSize:10 })}>Received</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:24, width:640, maxHeight:'92vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:'#0B2E2B' }}>
                {editId ? '✏️ Edit Challan' : '📦 Issue New Challan'}
              </div>
              <button onClick={()=>setShowForm(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#94a3b8' }}>×</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <label style={LBL}>Challan Number *</label>
                <input value={form.challan_number} onChange={e=>setForm(p=>({...p,challan_number:e.target.value}))} style={INP} />
              </div>
              <div>
                <label style={LBL}>Date *</label>
                <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={INP} />
              </div>

              {/* Job Worker Selector */}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={LBL}>Job Worker / Mill *</label>
                <select value={form.job_worker_id||''} onChange={e=>selectWorker(e.target.value)}
                  style={{ ...INP, color: form.job_worker_id?'#0D2E2B':'#94a3b8' }}>
                  <option value="">— Select Job Worker —</option>
                  {workers.map(w=>(
                    <option key={w.id} value={w.id}>
                      {w.worker_name}{w.manufacturing_entry_required?' ⚡':''} — {w.process_type||w.specialization||'General'}
                    </option>
                  ))}
                </select>
                {form.job_worker_id && (() => {
                  const w = workers.find(w=>w.id===form.job_worker_id);
                  return w?.manufacturing_entry_required ? (
                    <div style={{ fontSize:11, color:'#D4920A', marginTop:4, fontWeight:600 }}>⚡ Manufacturing Entry is REQUIRED for this worker</div>
                  ) : null;
                })()}
              </div>

              <div>
                <label style={LBL}>Process Type</label>
                <select value={form.process_type||''} onChange={e=>setForm(p=>({...p,process_type:e.target.value}))} style={INP}>
                  <option value="">— Select Process —</option>
                  {PROCESS_TYPES.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={LBL}>Expected Return Date</label>
                <input type="date" value={form.expected_return_date||''} onChange={e=>setForm(p=>({...p,expected_return_date:e.target.value}))} style={INP} />
              </div>

              {/* Base Fabric Selector */}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={LBL}>Fabric (from Base Fabrics)</label>
                <select value={form.base_fabric_id||''} onChange={e=>selectFabric(e.target.value)} style={INP}>
                  <option value="">— Select Fabric —</option>
                  {fabrics.map(f=><option key={f.id} value={f.id}>{f.fabric_name||f.base_fabric_name} {f.supplier_cost?`(₹${f.supplier_cost}/m)`:''}</option>)}
                </select>
              </div>

              <div>
                <label style={LBL}>Fabric Description</label>
                <input value={form.fabric_description||''} onChange={e=>setForm(p=>({...p,fabric_description:e.target.value}))} style={INP} placeholder="e.g. Georgette 60 GSM" />
              </div>
              <div>
                <label style={LBL}>Unit</label>
                <select value={form.unit||'meters'} onChange={e=>setForm(p=>({...p,unit:e.target.value}))} style={INP}>
                  {['meters','pieces','kg','rolls'].map(u=><option key={u}>{u}</option>)}
                </select>
              </div>

              <div>
                <label style={LBL}>Quantity Sent</label>
                <input type="number" value={form.quantity_sent||''} onChange={e=>setForm(p=>({...p,quantity_sent:e.target.value}))} style={INP} placeholder="0" />
              </div>
              <div>
                <label style={LBL}>Fabric Rate (₹/meter)</label>
                <input type="number" value={form.fabric_rate||''} onChange={e=>setForm(p=>({...p,fabric_rate:e.target.value}))} style={INP} placeholder="0.00" />
                {form.quantity_sent && form.fabric_rate && (
                  <div style={{ fontSize:11, color:'#2BA898', marginTop:3, fontWeight:600 }}>
                    Fabric Value: ₹{(parseFloat(form.quantity_sent)*parseFloat(form.fabric_rate)).toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              <div>
                <label style={LBL}>Status</label>
                <select value={form.status||'open'} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={INP}>
                  <option value="open">Open</option>
                  <option value="in_transit">In Transit</option>
                  <option value="received">Received</option>
                  <option value="partial">Partial Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label style={LBL}>Notes</label>
                <input value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} style={INP} placeholder="Any remarks…" />
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={saveChallan} disabled={saving} style={BTN({ background:'linear-gradient(135deg,#3DBFAE,#2BA898)', color:'#fff', flex:1, padding:'11px' })}>
                {saving ? 'Saving…' : editId ? 'Update Challan' : '📦 Issue Challan'}
              </button>
              <button onClick={()=>setShowForm(false)} style={BTN({ background:'#f1f5f9', color:'#4A7A74' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
