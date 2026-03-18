import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Plus, RefreshCw, ChevronRight } from 'lucide-react';

const C = { teal:'#2BA898',tealDark:'#0B2E2B',gold:'#D4920A',border:'#D6EEE9',text:'#0D2E2B',muted:'#4A7A74',surface:'#fff',surface2:'#F8FBFA' };

const STAGES = [
  { id:'grey_in',      label:'Grey In',       icon:'📦', color:'#64748b' },
  { id:'printing',     label:'Printing',      icon:'🖨️', color:'#d97706' },
  { id:'embroidery',   label:'Embroidery',    icon:'🧵', color:'#7c3aed' },
  { id:'finishing',    label:'Finishing',     icon:'✨', color:'#0891b2' },
  { id:'quality',      label:'Quality Check', icon:'🔍', color:'#dc2626' },
  { id:'ready',        label:'Ready',         icon:'✅', color:'#16a34a' },
  { id:'dispatched',   label:'Dispatched',    icon:'🚚', color:'#2BA898' },
];

export default function ProductionTracker() {
  const { toast } = useToast();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [moving, setMoving] = useState(null);
  const [form, setForm] = useState({ fabric_name:'', total_metres:'', current_job_worker:'', notes:'' });
  const up = (f,v) => setForm(p=>({...p,[f]:v}));

  useEffect(() => { fetchBatches(); }, []);

  async function fetchBatches() {
    setLoading(true);
    const { data } = await supabase.from('production_batches').select('*,sales_orders(order_no,party_name)').order('created_at',{ascending:false});
    setBatches(data||[]);
    setLoading(false);
  }

  async function addBatch() {
    if (!form.fabric_name.trim()) { toast({variant:'destructive',description:'Fabric name required'}); return; }
    const { error } = await supabase.from('production_batches').insert({
      fabric_name: form.fabric_name.trim(),
      total_metres: parseFloat(form.total_metres)||0,
      current_job_worker: form.current_job_worker||null,
      notes: form.notes||null,
      stage: 'grey_in'
    });
    if (error) { toast({variant:'destructive',description:error.message}); return; }
    toast({description:'✅ Batch added to tracker'});
    setShowForm(false);
    setForm({fabric_name:'',total_metres:'',current_job_worker:'',notes:''});
    fetchBatches();
  }

  async function moveStage(batch, direction) {
    const idx = STAGES.findIndex(s=>s.id===batch.stage);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= STAGES.length) return;
    setMoving(batch.id);
    await supabase.from('production_batches').update({ stage: STAGES[newIdx].id, updated_at: new Date().toISOString() }).eq('id',batch.id);
    setMoving(null);
    fetchBatches();
  }

  const batchesByStage = (stageId) => batches.filter(b => b.stage === stageId);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#f4f9f8', minHeight:'100vh', color:C.text }}>
      <div style={{ background:`linear-gradient(135deg,${C.tealDark} 0%,#1a4a44 100%)`, padding:'16px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 12px rgba(0,0,0,0.15)' }}>
        <div>
          <div style={{ color:'#fff', fontWeight:700, fontSize:18 }}>🏭 Production Tracker</div>
          <div style={{ color:'#81c5bc', fontSize:12 }}>Track every batch from Grey In → Dispatch · {batches.length} active batches</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={fetchBatches} style={{ padding:'8px 14px', background:'rgba(255,255,255,0.12)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)', borderRadius:8, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
            <RefreshCw size={14}/> Refresh
          </button>
          <button onClick={()=>setShowForm(true)} style={{ padding:'9px 18px', background:C.teal, color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            <Plus size={16}/> Add Batch
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display:'flex', gap:12, padding:'14px 20px', overflowX:'auto' }}>
        {STAGES.map(s => {
          const count = batchesByStage(s.id).length;
          const metres = batchesByStage(s.id).reduce((a,b)=>a+(b.total_metres||0),0);
          return (
            <div key={s.id} style={{ background:C.surface, borderRadius:10, padding:'10px 16px', border:`1.5px solid ${count>0?s.color:C.border}`, minWidth:120, flexShrink:0 }}>
              <div style={{ fontSize:18, marginBottom:2 }}>{s.icon}</div>
              <div style={{ fontWeight:700, fontSize:18, color:s.color }}>{count}</div>
              <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>{s.label}</div>
              {metres>0&&<div style={{ fontSize:10, color:C.gold }}>{metres.toFixed(0)}m</div>}
            </div>
          );
        })}
      </div>

      {/* Kanban Board */}
      {loading ? <div style={{textAlign:'center',padding:60,color:C.muted}}>Loading…</div> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:10, padding:'0 20px 20px', minWidth:1100, overflowX:'auto' }}>
          {STAGES.map(stage => (
            <div key={stage.id} style={{ background:C.surface2, borderRadius:12, border:`1.5px solid ${C.border}` }}>
              <div style={{ padding:'10px 12px', borderBottom:`2px solid ${stage.color}`, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:16 }}>{stage.icon}</span>
                <span style={{ fontWeight:700, fontSize:12, color:stage.color }}>{stage.label}</span>
                <span style={{ marginLeft:'auto', fontSize:11, background:stage.color, color:'#fff', borderRadius:10, padding:'1px 7px', fontWeight:700 }}>
                  {batchesByStage(stage.id).length}
                </span>
              </div>
              <div style={{ padding:8, minHeight:200, display:'flex', flexDirection:'column', gap:8 }}>
                {batchesByStage(stage.id).map(batch => (
                  <div key={batch.id} style={{ background:C.surface, borderRadius:9, padding:'10px 11px', border:`1px solid ${C.border}`, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontWeight:700, fontSize:12, color:C.tealDark, marginBottom:4 }}>{batch.fabric_name}</div>
                    <div style={{ fontSize:11, color:C.muted, marginBottom:2 }}>{batch.batch_no}</div>
                    {batch.total_metres>0&&<div style={{ fontSize:11, color:C.gold, fontWeight:600 }}>{batch.total_metres}m</div>}
                    {batch.current_job_worker&&<div style={{ fontSize:10, color:C.muted, marginTop:3 }}>👷 {batch.current_job_worker}</div>}
                    {batch.sales_orders&&<div style={{ fontSize:10, color:C.teal, marginTop:2 }}>📋 {batch.sales_orders.order_no}</div>}
                    {batch.notes&&<div style={{ fontSize:10, color:C.muted, fontStyle:'italic', marginTop:3 }}>{batch.notes}</div>}
                    <div style={{ display:'flex', gap:4, marginTop:8 }}>
                      {stage.id !== 'grey_in' && (
                        <button onClick={()=>moveStage(batch,-1)} disabled={moving===batch.id}
                          style={{ flex:1, padding:'4px', fontSize:10, border:`1px solid ${C.border}`, borderRadius:5, background:'#fff', cursor:'pointer', color:C.muted }}>
                          ← Back
                        </button>
                      )}
                      {stage.id !== 'dispatched' && (
                        <button onClick={()=>moveStage(batch,1)} disabled={moving===batch.id}
                          style={{ flex:1, padding:'4px', fontSize:10, border:'none', borderRadius:5, background:stage.color, color:'#fff', cursor:'pointer', fontWeight:600 }}>
                          Next →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {batchesByStage(stage.id).length === 0 && (
                  <div style={{ textAlign:'center', color:C.muted, fontSize:11, padding:20, opacity:0.5 }}>Empty</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Batch Modal */}
      {showForm && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
          <div style={{ background:'#fff',borderRadius:14,padding:28,width:'100%',maxWidth:400 }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20 }}>
              <div style={{ fontWeight:700,fontSize:16,color:C.tealDark }}>📦 New Production Batch</div>
              <button onClick={()=>setShowForm(false)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:20,color:C.muted }}>×</button>
            </div>
            {[
              {label:'Fabric Name *',field:'fabric_name',placeholder:'e.g. Digital Floral 44"'},
              {label:'Total Metres',field:'total_metres',placeholder:'1000',type:'number'},
              {label:'Job Worker / Mill',field:'current_job_worker',placeholder:'e.g. Rajesh Printing'},
              {label:'Notes',field:'notes',placeholder:'Any notes...'},
            ].map(({label,field,placeholder,type})=>(
              <div key={field} style={{marginBottom:12}}>
                <label style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.8,display:'block',marginBottom:4}}>{label}</label>
                <input type={type||'text'} value={form[field]} onChange={e=>up(field,e.target.value)} placeholder={placeholder}
                  style={{width:'100%',padding:'8px 11px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.text,outline:'none',boxSizing:'border-box'}}/>
              </div>
            ))}
            <button onClick={addBatch} style={{width:'100%',padding:11,background:C.teal,color:'#fff',border:'none',borderRadius:9,fontWeight:700,fontSize:14,cursor:'pointer',marginTop:4}}>
              ✅ Add to Production
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
