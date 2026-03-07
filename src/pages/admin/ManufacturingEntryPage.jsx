import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) : '—';
const today = () => new Date().toISOString().split('T')[0];
const fmt = n => '₹' + Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0});

const STATUS_COLORS = {
  completed: { bg:'rgba(30,158,90,.1)', c:'#1E9E5A' },
  pending_qc: { bg:'rgba(212,146,10,.1)', c:'#D4920A' },
  rejected: { bg:'rgba(239,68,68,.1)', c:'#ef4444' },
};

const emptyForm = () => ({
  entry_date: today(), challan_id: '', challan_number: '',
  job_worker_id: '', job_worker_name: '', process_type: '',
  design_name: '', base_fabric_id: '', base_fabric_name: '',
  quantity_issued: '', quantity_received: '', process_rate: '',
  fabric_cost_per_mtr: '', quality_grade: 'A', status: 'completed', notes: ''
});

export default function ManufacturingEntryPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [challans, setChallans] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generatedDesignNo, setGeneratedDesignNo] = useState('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total:0, thisMonth:0, totalValue:0, pendingQc:0 });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const thisMonthStart = new Date(); thisMonthStart.setDate(1); const monthStr = thisMonthStart.toISOString().split('T')[0];
    const [{ data: ent }, { data: ch }, { data: wk }, { data: fb }] = await Promise.all([
      supabase.from('manufacturing_entries').select('*').order('entry_date',{ascending:false}).limit(200),
      supabase.from('challans').select('id,challan_number,date,party_name,process_type,fabric_description,quantity_sent,base_fabric_id,fabric_rate,status').in('status',['open','in_transit','partial']).order('date',{ascending:false}),
      supabase.from('job_workers').select('id,worker_name,process_type,specialization,manufacturing_entry_required').eq('status','active'),
      supabase.from('base_fabrics').select('id,fabric_name,base_fabric_name,supplier_cost').eq('status','active').limit(100),
    ]);
    const entArr = ent || [];
    setEntries(entArr);
    setChallans(ch || []);
    setWorkers(wk || []);
    setFabrics(fb || []);
    const thisMonth = entArr.filter(e=>e.entry_date >= monthStr);
    const totalValue = entArr.reduce((s,e)=>s+Number(e.total_value||0),0);
    setStats({ total:entArr.length, thisMonth:thisMonth.length, totalValue, pendingQc:entArr.filter(e=>e.status==='pending_qc').length });
    setLoading(false);
  }

  async function generateEntryNumber() {
    const year = new Date().getFullYear();
    const { count } = await supabase.from('manufacturing_entries').select('*',{count:'exact',head:true}).gte('entry_date',`${year}-01-01`);
    return `ME-${year}-${String((count||0)+1).padStart(4,'0')}`;
  }

  async function generateDesignNumber() {
    const year = String(new Date().getFullYear()).slice(-2);
    const { count } = await supabase.from('manufacturing_entries').select('*',{count:'exact',head:true}).gte('entry_date',`20${year}-01-01`);
    const newNum = `DS-${year}-${String((count||0)+1).padStart(4,'0')}`;
    setGeneratedDesignNo(newNum);
    return newNum;
  }

  async function openAdd() {
    const dsNum = await generateDesignNumber();
    setGeneratedDesignNo(dsNum);
    setForm(emptyForm()); setEditId(null); setShowForm(true);
  }

  function openEdit(e) {
    setForm({...e}); setEditId(e.id); setGeneratedDesignNo(e.design_number||'');
    setShowForm(true);
  }

  function selectChallan(id) {
    const ch = challans.find(c=>c.id===id);
    if (!ch) { setForm(p=>({...p,challan_id:'',challan_number:''})); return; }
    const w = workers.find(w=>w.worker_name===ch.party_name);
    setForm(p=>({
      ...p, challan_id:id, challan_number:ch.challan_number,
      job_worker_id:w?.id||p.job_worker_id, job_worker_name:ch.party_name,
      process_type:ch.process_type||p.process_type,
      quantity_issued:ch.quantity_sent||p.quantity_issued,
      quantity_received:ch.quantity_sent||p.quantity_received,
      base_fabric_id:ch.base_fabric_id||p.base_fabric_id,
      base_fabric_name:ch.fabric_description||p.base_fabric_name,
      fabric_cost_per_mtr:ch.fabric_rate||p.fabric_cost_per_mtr,
    }));
  }

  function selectWorker(id) {
    const w = workers.find(w=>w.id===id);
    setForm(p=>({ ...p, job_worker_id:id, job_worker_name:w?.worker_name||p.job_worker_name, process_type:w?.process_type||w?.specialization||p.process_type }));
  }

  async function saveEntry() {
    if (!form.job_worker_name||!form.entry_date||!form.quantity_received) {
      alert('Worker name, date and quantity received are required');
      return;
    }
    setSaving(true);
    const entryNum = await generateEntryNumber();
    const dsNum = editId ? form.design_number : generatedDesignNo;
    const row = {
      ...form,
      entry_number: editId ? form.entry_number : entryNum,
      design_number: dsNum,
      quantity_issued: parseFloat(form.quantity_issued)||0,
      quantity_received: parseFloat(form.quantity_received)||0,
      process_rate: parseFloat(form.process_rate)||0,
      fabric_cost_per_mtr: parseFloat(form.fabric_cost_per_mtr)||0,
    };
    const { error } = editId
      ? await supabase.from('manufacturing_entries').update(row).eq('id',editId)
      : await supabase.from('manufacturing_entries').insert(row);
    if (error) { alert(error.message); setSaving(false); return; }
    // Mark challan as received
    if (form.challan_id && !editId) {
      await supabase.from('challans').update({ status:'received', actual_return_date:form.entry_date }).eq('id',form.challan_id);
    }
    setShowForm(false); loadAll(); setSaving(false);
  }

  const filtered = entries.filter(e =>
    `${e.design_number||''} ${e.job_worker_name||''} ${e.process_type||''} ${e.base_fabric_name||''} ${e.challan_number||''}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const BTN = e => ({ padding:'8px 16px', borderRadius:8, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:"'DM Sans',sans-serif", ...e });
  const CARD = { background:'#fff', borderRadius:12, padding:'16px 20px', boxShadow:'0 2px 10px rgba(0,0,0,.07)', border:'1px solid rgba(43,168,152,.12)' };
  const INP = { padding:'8px 10px', borderRadius:7, border:'1px solid rgba(43,168,152,.3)', fontSize:13, width:'100%', boxSizing:'border-box', fontFamily:"'DM Sans',sans-serif" };
  const LBL = { fontSize:11, fontWeight:600, color:'#4A7A74', display:'block', marginBottom:4 };

  const processAmt = (parseFloat(form.quantity_received)||0) * (parseFloat(form.process_rate)||0);
  const fabricAmt = (parseFloat(form.quantity_received)||0) * (parseFloat(form.fabric_cost_per_mtr)||0);
  const totalVal = processAmt + fabricAmt;
  const shrinkage = (parseFloat(form.quantity_issued)||0) - (parseFloat(form.quantity_received)||0);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'var(--bg,#F4FBFA)', minHeight:'100vh' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
            <span>🏭</span> Manufacturing Entry
          </div>
          <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>Receive fabric from mill · Generate Design Numbers · Track value</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>navigate('/admin/challans')} style={BTN({ background:'rgba(255,255,255,.1)', color:'#fff', border:'1px solid rgba(255,255,255,.2)' })}>📦 Challans</button>
          <button onClick={openAdd} style={BTN({ background:'linear-gradient(135deg,#6E44C8,#8B5CF6)', color:'#fff' })}>+ Manufacturing Entry</button>
        </div>
      </div>

      <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
        {/* KPI Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
          {[
            { label:'Total Entries', value:stats.total, icon:'📋', color:'#2468C8' },
            { label:'This Month', value:stats.thisMonth, icon:'📅', color:'#1E9E5A' },
            { label:'Total Value Created', value:fmt(stats.totalValue), icon:'💎', color:'#6E44C8' },
            { label:'Pending QC', value:stats.pendingQc, icon:'⏳', color:'#D4920A' },
          ].map((c,i)=>(
            <div key={i} style={CARD}>
              <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:18 }}>{c.icon}</span>
                <div style={{ fontSize:10, fontWeight:700, color:'#6A9B95', textTransform:'uppercase' }}>{c.label}</div>
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Workers with required mfg entry that have open challans */}
        {challans.filter(c => {
          const w = workers.find(w=>w.worker_name===c.party_name);
          return w?.manufacturing_entry_required;
        }).length > 0 && (
          <div style={{ background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:'10px 16px' }}>
            <div style={{ fontWeight:700, color:'#ef4444', fontSize:13, marginBottom:6 }}>⚡ Pending Manufacturing Entries (Compulsory)</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {challans.filter(c => {
                const w = workers.find(w=>w.worker_name===c.party_name);
                return w?.manufacturing_entry_required;
              }).map(c=>(
                <div key={c.id} style={{ padding:'4px 10px', borderRadius:20, background:'rgba(239,68,68,.1)', color:'#ef4444', fontSize:11, fontWeight:600, cursor:'pointer' }}
                  onClick={()=>{ selectChallan(c.id); setShowForm(true); }}>
                  {c.challan_number} — {c.party_name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search + Table */}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search design number, worker, fabric…"
          style={{ maxWidth:360, ...INP }} />

        <div style={{ ...CARD, padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#F4FBFA' }}>
                {['Design No','Date','Challan','Worker','Process','Issued','Received','Shrinkage','Process Amt','Total Value','Grade','Status'].map(h=>(
                  <th key={h} style={{ padding:'9px 10px', textAlign:'left', fontSize:10, fontWeight:700, color:'#0B2E2B', borderBottom:'1px solid rgba(43,168,152,.15)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={12} style={{ padding:30, textAlign:'center', color:'#6A9B95' }}>Loading…</td></tr>
              : filtered.length===0 ? <tr><td colSpan={12} style={{ padding:30, textAlign:'center', color:'#94a3b8' }}>No manufacturing entries yet. Create one to generate design numbers.</td></tr>
              : filtered.map(e=>{
                const st = STATUS_COLORS[e.status]||{bg:'#f1f5f9',c:'#64748b'};
                return (
                  <tr key={e.id} style={{ borderBottom:'1px solid rgba(43,168,152,.07)' }}>
                    <td style={{ padding:'8px 10px', fontWeight:800, color:'#6E44C8', fontFamily:"'JetBrains Mono',monospace", fontSize:11 }}>
                      {e.design_number}
                    </td>
                    <td style={{ padding:'8px 10px', color:'#4A7A74' }}>{fmtDate(e.entry_date)}</td>
                    <td style={{ padding:'8px 10px', color:'#2468C8', fontSize:11 }}>{e.challan_number||'—'}</td>
                    <td style={{ padding:'8px 10px', fontWeight:500 }}>{e.job_worker_name}</td>
                    <td style={{ padding:'8px 10px', color:'#6E44C8' }}>{e.process_type||'—'}</td>
                    <td style={{ padding:'8px 10px', textAlign:'right' }}>{e.quantity_issued}</td>
                    <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:600, color:'#1E9E5A' }}>{e.quantity_received}</td>
                    <td style={{ padding:'8px 10px', textAlign:'right', color:Number(e.shrinkage_qty)>0?'#ef4444':'#94a3b8' }}>{e.shrinkage_qty||0}</td>
                    <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:600 }}>{fmt(e.process_amount)}</td>
                    <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:700, color:'#6E44C8' }}>{fmt(e.total_value)}</td>
                    <td style={{ padding:'8px 10px' }}>
                      <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700,
                        background:e.quality_grade==='A'?'#E8FFF4':e.quality_grade==='B'?'#FFF8E8':'#FFF3F3',
                        color:e.quality_grade==='A'?'#1E9E5A':e.quality_grade==='B'?'#D4920A':'#ef4444' }}>
                        {e.quality_grade||'A'}
                      </span>
                    </td>
                    <td style={{ padding:'8px 10px' }}>
                      <span style={{ padding:'2px 8px', borderRadius:100, fontSize:10, fontWeight:700, background:st.bg, color:st.c }}>
                        {e.status?.replace('_',' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:24, width:680, maxHeight:'92vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:'#0B2E2B' }}>
                🏭 {editId?'Edit':'New'} Manufacturing Entry
              </div>
              <button onClick={()=>setShowForm(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#94a3b8' }}>×</button>
            </div>

            {/* Design Number Banner */}
            <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', borderRadius:10, padding:'12px 18px', marginBottom:18, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:10, color:'#6A9B95', fontWeight:600, textTransform:'uppercase' }}>Design Number (Auto-Generated)</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:20, fontWeight:800, color:'#3DBFAE', letterSpacing:2 }}>
                  {editId ? form.design_number : generatedDesignNo}
                </div>
              </div>
              <span style={{ fontSize:30 }}>🎨</span>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <label style={LBL}>Entry Date *</label>
                <input type="date" value={form.entry_date} onChange={e=>setForm(p=>({...p,entry_date:e.target.value}))} style={INP} />
              </div>

              {/* Link to Challan */}
              <div>
                <label style={LBL}>Link to Challan (if any)</label>
                <select value={form.challan_id||''} onChange={e=>selectChallan(e.target.value)} style={INP}>
                  <option value="">— Select Challan (optional) —</option>
                  {challans.map(c=><option key={c.id} value={c.id}>{c.challan_number} — {c.party_name} ({c.quantity_sent}{c.unit||'m'})</option>)}
                </select>
              </div>

              {/* Job Worker */}
              <div style={{ gridColumn:'1/-1' }}>
                <label style={LBL}>Job Worker / Mill *</label>
                <select value={form.job_worker_id||''} onChange={e=>selectWorker(e.target.value)} style={{ ...INP, color:form.job_worker_id?'#0D2E2B':'#94a3b8' }}>
                  <option value="">— Select Job Worker —</option>
                  {workers.map(w=>(
                    <option key={w.id} value={w.id}>
                      {w.worker_name} {w.manufacturing_entry_required?'⚡':''} — {w.process_type||w.specialization||'General'}
                    </option>
                  ))}
                </select>
                {(() => {
                  const w = workers.find(w=>w.id===form.job_worker_id);
                  return w?.manufacturing_entry_required
                    ? <div style={{ fontSize:11, color:'#ef4444', fontWeight:600, marginTop:3 }}>⚡ Manufacturing Entry REQUIRED for this worker</div>
                    : null;
                })()}
              </div>

              <div>
                <label style={LBL}>Process Type</label>
                <input value={form.process_type||''} onChange={e=>setForm(p=>({...p,process_type:e.target.value}))} style={INP} placeholder="e.g. Embroidery" />
              </div>
              <div>
                <label style={LBL}>Design Name</label>
                <input value={form.design_name||''} onChange={e=>setForm(p=>({...p,design_name:e.target.value}))} style={INP} placeholder="e.g. Floral Georgette" />
              </div>

              <div>
                <label style={LBL}>Qty Issued (meters)</label>
                <input type="number" value={form.quantity_issued||''} onChange={e=>setForm(p=>({...p,quantity_issued:e.target.value}))} style={INP} placeholder="0" />
              </div>
              <div>
                <label style={LBL}>Qty Received Back *</label>
                <input type="number" value={form.quantity_received||''} onChange={e=>setForm(p=>({...p,quantity_received:e.target.value}))} style={INP} placeholder="0" />
              </div>

              {/* Live calculations */}
              {(form.quantity_issued || form.quantity_received) && (
                <div style={{ gridColumn:'1/-1', background:'#F4FBFA', borderRadius:8, padding:'10px 14px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  <div><div style={{ fontSize:10, color:'#6A9B95' }}>Shrinkage</div><div style={{ fontWeight:700, color: shrinkage>0?'#ef4444':'#1E9E5A' }}>{shrinkage.toFixed(2)} m ({shrinkage>0?((shrinkage/(parseFloat(form.quantity_issued)||1))*100).toFixed(1)+'%':'0%'})</div></div>
                  <div><div style={{ fontSize:10, color:'#6A9B95' }}>Process Amt</div><div style={{ fontWeight:700, color:'#2468C8' }}>{fmt(processAmt)}</div></div>
                  <div><div style={{ fontSize:10, color:'#6A9B95' }}>Total Value</div><div style={{ fontWeight:700, color:'#6E44C8' }}>{fmt(totalVal)}</div></div>
                </div>
              )}

              <div>
                <label style={LBL}>Process Rate (₹/meter)</label>
                <input type="number" value={form.process_rate||''} onChange={e=>setForm(p=>({...p,process_rate:e.target.value}))} style={INP} placeholder="0.00" />
              </div>
              <div>
                <label style={LBL}>Fabric Cost (₹/meter)</label>
                <input type="number" value={form.fabric_cost_per_mtr||''} onChange={e=>setForm(p=>({...p,fabric_cost_per_mtr:e.target.value}))} style={INP} placeholder="0.00" />
              </div>

              <div>
                <label style={LBL}>Quality Grade</label>
                <select value={form.quality_grade||'A'} onChange={e=>setForm(p=>({...p,quality_grade:e.target.value}))} style={INP}>
                  <option value="A">A — Good</option>
                  <option value="B">B — Average</option>
                  <option value="C">C — Below Standard</option>
                </select>
              </div>
              <div>
                <label style={LBL}>Status</label>
                <select value={form.status||'completed'} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={INP}>
                  <option value="completed">Completed</option>
                  <option value="pending_qc">Pending QC</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={LBL}>Notes</label>
                <textarea value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2}
                  style={{ ...INP, resize:'none' }} placeholder="Any remarks…" />
              </div>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:20 }}>
              <button onClick={saveEntry} disabled={saving} style={BTN({ background:'linear-gradient(135deg,#6E44C8,#8B5CF6)', color:'#fff', flex:1, padding:'11px' })}>
                {saving ? 'Saving…' : editId ? 'Update Entry' : '🏭 Create Entry & Generate DS No'}
              </button>
              <button onClick={()=>setShowForm(false)} style={BTN({ background:'#f1f5f9', color:'#4A7A74' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
