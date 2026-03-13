import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import {
  PROCESS_STEPS, FINISH_WIDTHS, FABRIC_TAGS, TALLY_GROUPS,
  buildFinishFabricSKU, processPathLabel,
} from '@/services/FinishFabricService';

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const C = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6',
  gold:'#D4920A', goldLight:'#FEF9EC',
  border:'#D6EEE9', text:'#0D2E2B', muted:'#4A7A74',
  error:'#D93A3A', errorLight:'#FEF2F2',
  green:'#1E9E5A', greenLight:'#F0FDF4',
  surface:'#fff', surface2:'#F8FBFA',
  purple:'#7C3AED', purpleLight:'#FAF5FF',
  blue:'#2563EB', blueLight:'#EFF6FF',
  orange:'#C86020', orangeLight:'#FFF7ED',
};

const FABRIC_CATEGORIES = [
  { value:'mill_print',  label:'Mill Print',        color:'#f59e0b', icon:'🖨️' },
  { value:'digital',     label:'Digital Print',     color:'#06b6d4', icon:'💻' },
  { value:'embroidery',  label:'Embroidery',        color:'#ec4899', icon:'🧵' },
  { value:'schiffli',    label:'Schiffli / Hakoba', color:'#8b5cf6', icon:'🪡' },
  { value:'solid_dyed',  label:'Solid Dyed',        color:'#10b981', icon:'🎨' },
  { value:'fancy',       label:'Fancy Finish',      color:'#f97316', icon:'✨' },
];

const PRINT_TYPES = ['Screen Print','Digital Print','Discharge Print','Pigment Print','Reactive Print','Foil Print','Block Print','Acid Print','Laser Print'];
const DEFAULT_WIDTHS = ['44"','54"','56"','58"','60"'];

const lbl = { fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:5, display:'block' };
const inp = { width:'100%', padding:'8px 11px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, color:C.text, outline:'none', boxSizing:'border-box', background:'#fff' };
const card = { background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:14 };
const sectionTitle = { fontSize:13, fontWeight:800, color:C.tealDark, marginBottom:12, display:'flex', alignItems:'center', gap:8 };

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function computeSKU(design, fabricShortCode, processSteps, tag, skuFormula) {
  if (!skuFormula) return '';
  let parts;
  try { parts = JSON.parse(skuFormula).parts || ['width','short_code','process_path','design_no']; }
  catch { parts = ['width','short_code','process_path','design_no']; }
  const sep = (() => { try { return JSON.parse(skuFormula).separator || '-'; } catch { return '-'; } })();
  const upcase = (() => { try { return JSON.parse(skuFormula).uppercase !== false; } catch { return true; } })();
  const omitRegTag = (() => { try { return JSON.parse(skuFormula).omit_regular_tag !== false; } catch { return true; } })();

  const tagObj = FABRIC_TAGS.find(t => t.value === tag);
  const tagCode = (omitRegTag && tag === 'Regular') ? '' : (tagObj ? tag.replace(/\s+/g,'').slice(0,3).toUpperCase() : '');
  const vaObj = design.value_addition || '';
  const vaCodes = { 'Hakoba (Sch-Rl)':'HK','Embroidered':'EMB','Handwork':'HW','Foil/Gold/Glitter':'FOIL','Crush/Pleated':'CRH','Deca/Washing':'DEC','Washing':'WSH','Schiffli Cutwork':'SCH','Sequence Work':'SEQ','Gota Patti':'GP' };
  const vaCode = vaCodes[vaObj] || '';
  const pathCode = processPathLabel(processSteps);

  const map = {
    width:        (design.width || '44').replace(/[^0-9]/g,''),
    short_code:   (fabricShortCode || '').toUpperCase(),
    process_path: pathCode,
    tag:          tagCode,
    va_code:      vaCode,
    design_no:    (design.design_no || design.design_number || '').toUpperCase().replace(/\s+/g,''),
  };

  const result = parts.map(p => map[p] || '').filter(Boolean).join(sep);
  return upcase ? result.toUpperCase() : result;
}

// ─── STAGE BAR ────────────────────────────────────────────────────────────────
function StageBar({ stage, setStage, savedId }) {
  const stages = [
    { num:1, label:'Fabric Identity', sub:'Category · Base · Process · VA · Movement' },
    { num:2, label:'Designs & SKUs',  sub:'Design No · Costing · SKU auto-generate' },
  ];
  return (
    <div style={{ display:'flex', gap:4, background:'rgba(0,0,0,0.06)', borderRadius:12, padding:5, marginBottom:18 }}>
      {stages.map(s => {
        const active = stage===s.num, done = stage>s.num, locked = s.num===2 && !savedId;
        return (
          <div key={s.num} onClick={() => !locked && setStage(s.num)} style={{
            flex:1, padding:'8px 14px', borderRadius:9,
            cursor: locked ? 'not-allowed' : 'pointer',
            background: active ? C.teal : done ? C.tealLight : 'transparent',
            opacity: locked ? 0.4 : 1, transition:'all 0.18s',
          }}>
            <div style={{ fontSize:11, fontWeight:800, color: active ? '#fff' : C.muted }}>
              {done ? '✓ ' : `${s.num}. `}{s.label}
            </div>
            <div style={{ fontSize:10, color: active ? 'rgba(255,255,255,0.72)' : C.muted, marginTop:1 }}>{s.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── PROCESS PATH BUILDER ─────────────────────────────────────────────────────
function ProcessPathBuilder({ value, onChange }) {
  const toggle = (stepId) => {
    const has = value.find(s => s.id===stepId);
    if (has) onChange(value.filter(s => s.id!==stepId));
    else onChange([...value, { id:stepId }]);
  };
  const move = (idx, dir) => {
    const arr = [...value];
    const to = idx+dir;
    if (to<0||to>=arr.length) return;
    [arr[idx],arr[to]]=[arr[to],arr[idx]];
    onChange(arr);
  };
  return (
    <div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
        {PROCESS_STEPS.map(step => {
          const sel = value.find(s => s.id===step.id);
          return (
            <button key={step.id} onClick={() => toggle(step.id)} type="button" style={{
              padding:'4px 10px', borderRadius:20, border:`1.5px solid ${sel ? step.color : C.border}`,
              background: sel ? step.color : '#fff', color: sel ? '#fff' : C.text,
              fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.12s',
            }}>{step.label}</button>
          );
        })}
      </div>
      {value.length>0 && (
        <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap', padding:'8px 10px', background:C.tealLight, borderRadius:8 }}>
          <span style={{ fontSize:10, fontWeight:800, color:C.muted }}>PATH:</span>
          {value.map((s,i) => {
            const step = PROCESS_STEPS.find(p => p.id===s.id);
            if (!step) return null;
            return (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:3, padding:'3px 8px', background:step.color, borderRadius:5, color:'#fff', fontSize:11 }}>
                <span style={{ fontWeight:700 }}>{step.code}</span>
                <span style={{ opacity:0.8, fontSize:10 }}>{step.label}</span>
                <button type="button" onClick={()=>move(i,-1)} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.8)',cursor:'pointer',padding:'0 1px',fontSize:9 }}>▲</button>
                <button type="button" onClick={()=>move(i,1)} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.8)',cursor:'pointer',padding:'0 1px',fontSize:9 }}>▼</button>
                <button type="button" onClick={()=>toggle(s.id)} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.9)',cursor:'pointer',padding:'0 2px',fontSize:10,fontWeight:700 }}>✕</button>
              </div>
            );
          })}
          <span style={{ fontSize:11, color:C.muted, marginLeft:4 }}>Code: <strong>{processPathLabel(value)}</strong></span>
        </div>
      )}
    </div>
  );
}

// ─── BASE FABRIC SELECTOR ─────────────────────────────────────────────────────
function BaseFabricSelector({ value, onChange }) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const fetch = useCallback(async (query) => {
    setLoading(true);
    const qb = supabase.from('base_fabrics')
      .select('id, base_fabric_name, fabric_name, short_code, sku, construction, gsm, width, yarn_count, supplier_id')
      .not('status','eq','deleted')
      .order('base_fabric_name');
    if (query) qb.or(`base_fabric_name.ilike.%${query}%,fabric_name.ilike.%${query}%`);
    const { data } = await qb.limit(40);
    setOpts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (open) fetch(q); }, [open, q, fetch]);

  const display = value ? (value.base_fabric_name || value.fabric_name || '') : '';
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ ...inp, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          {display ? (
            <span style={{ fontWeight:600 }}>{display}</span>
          ) : (
            <span style={{ color:C.muted }}>Search base fabric (grey fabric)...</span>
          )}
          {value?.short_code && <span style={{ marginLeft:8, fontSize:11, color:C.muted }}>CODE: {value.short_code}</span>}
          {value?.gsm && <span style={{ marginLeft:6, fontSize:11, color:C.muted }}>{value.gsm} GSM</span>}
          {value?.width && <span style={{ marginLeft:6, fontSize:11, color:C.muted }}>{value.width}</span>}
        </div>
        <span style={{ fontSize:9, color:C.muted }}>▼</span>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:200, background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.14)', maxHeight:280, overflowY:'auto', marginTop:4 }}>
          <div style={{ padding:8, borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, background:'#fff' }}>
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Type to search..." style={{ ...inp, padding:'6px 10px', fontSize:12 }} />
          </div>
          <div onClick={()=>{onChange(null);setOpen(false);}} style={{ padding:'8px 12px', fontSize:12, color:C.error, cursor:'pointer', borderBottom:`1px solid ${C.border}` }}>✕ Clear</div>
          {loading ? (
            <div style={{ padding:12, textAlign:'center', fontSize:12, color:C.muted }}>Loading...</div>
          ) : opts.length===0 ? (
            <div style={{ padding:12, textAlign:'center', fontSize:12, color:C.muted }}>No fabrics found</div>
          ) : opts.map(opt => (
            <div key={opt.id} onClick={()=>{onChange(opt);setOpen(false);}} style={{ padding:'9px 12px', cursor:'pointer', borderBottom:`1px solid ${C.border}`, background: value?.id===opt.id ? C.tealLight : '#fff' }}>
              <div style={{ fontWeight:700, fontSize:13 }}>{opt.base_fabric_name || opt.fabric_name}</div>
              <div style={{ fontSize:11, color:C.muted, display:'flex', gap:10, marginTop:2 }}>
                {opt.short_code && <span>Code: <strong>{opt.short_code}</strong></span>}
                {opt.gsm && <span>{opt.gsm} GSM</span>}
                {opt.width && <span>{opt.width}</span>}
                {opt.construction && <span>{opt.construction}</span>}
                {opt.yarn_count && <span>{opt.yarn_count}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── VA SECTION ───────────────────────────────────────────────────────────────
function VASection({ va, onVaChange, vaOpts, conceptOpts, placementOpts }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
      <div>
        <label style={lbl}>Value Addition</label>
        <select value={va.value_addition||''} onChange={e=>onVaChange('value_addition',e.target.value)} style={inp}>
          <option value="">— none —</option>
          {vaOpts.map(v=><option key={v} value={v}>{v}</option>)}
        </select>
      </div>
      {va.value_addition && (
        <>
          <div>
            <label style={lbl}>VA Concept / Style</label>
            <select value={va.va_concept||''} onChange={e=>onVaChange('va_concept',e.target.value)} style={inp}>
              <option value="">— none —</option>
              {conceptOpts.map(v=><option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Placement</label>
            <select value={va.va_placement||''} onChange={e=>onVaChange('va_placement',e.target.value)} style={inp}>
              <option value="">— none —</option>
              {placementOpts.map(v=><option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </>
      )}
    </div>
  );
}

// ─── DESIGN ROW ───────────────────────────────────────────────────────────────
function DesignRow({ design, idx, onUpdate, onRemove, skuFormula, processSteps, tag, shortCode }) {
  const sku = design.sku_locked ? design.sku : computeSKU(design, shortCode, processSteps, tag, skuFormula);
  const vaCodes = { 'Hakoba (Sch-Rl)':'HK','Embroidered':'EMB','Handwork':'HW','Foil/Gold/Glitter':'FOIL','Crush/Pleated':'CRH','Deca/Washing':'DEC','Washing':'WSH','Schiffli Cutwork':'SCH','Sequence Work':'SEQ','Gota Patti':'GP' };

  return (
    <div style={{ background: idx%2===0 ? '#fafffe' : '#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:10 }}>
      <div style={{ display:'grid', gridTemplateColumns:'120px 1fr 1fr 1fr 90px 90px', gap:10, marginBottom:10 }}>
        <div>
          <label style={lbl}>Design No *</label>
          <input value={design.design_no||''} onChange={e=>onUpdate({...design,design_no:e.target.value})}
            placeholder="D001" style={{ ...inp, fontWeight:700, borderColor: design.design_no ? C.teal : C.border }} />
        </div>
        <div>
          <label style={lbl}>Color / Name</label>
          <input value={design.color_name||''} onChange={e=>onUpdate({...design,color_name:e.target.value})}
            placeholder="e.g. Red Floral" style={inp} />
        </div>
        <div>
          <label style={lbl}>Jobworker</label>
          <input value={design.jobworker_name||''} onChange={e=>onUpdate({...design,jobworker_name:e.target.value})}
            placeholder="Job worker name" style={inp} />
        </div>
        <div>
          <label style={lbl}>Print Type</label>
          <select value={design.print_type||''} onChange={e=>onUpdate({...design,print_type:e.target.value})} style={inp}>
            <option value="">— select —</option>
            {PRINT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Lump ₹/m</label>
          <input type="number" value={design.lump_price||''} onChange={e=>onUpdate({...design,lump_price:parseFloat(e.target.value)||null})}
            placeholder="0.00" style={inp} />
        </div>
        <div>
          <label style={lbl}>Cut Pack ₹</label>
          <input type="number" value={design.cut_pack_price||''} onChange={e=>onUpdate({...design,cut_pack_price:parseFloat(e.target.value)||null})}
            placeholder="0.00" style={inp} />
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'120px 1fr 1fr 1fr 1fr', gap:10, alignItems:'end' }}>
        <div>
          <label style={lbl}>Width</label>
          <select value={design.width||''} onChange={e=>onUpdate({...design,width:e.target.value})} style={inp}>
            <option value="">—</option>
            {DEFAULT_WIDTHS.map(w=><option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Value Addition</label>
          <select value={design.value_addition||''} onChange={e=>onUpdate({...design,value_addition:e.target.value})} style={inp}>
            <option value="">— none —</option>
            {Object.keys(vaCodes).map(v=><option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Jobworker Cost ₹/m</label>
          <input type="number" value={design.jobworker_cost||''} onChange={e=>onUpdate({...design,jobworker_cost:parseFloat(e.target.value)||null})}
            placeholder="0.00" style={inp} />
        </div>
        <div>
          <label style={lbl}>Notes</label>
          <input value={design.notes||''} onChange={e=>onUpdate({...design,notes:e.target.value})}
            placeholder="Optional" style={inp} />
        </div>
        <div>
          <label style={lbl}>Actions</label>
          <button onClick={onRemove} type="button" style={{ padding:'7px 12px', borderRadius:7, border:`1.5px solid ${C.error}`, background:'#fff', color:C.error, cursor:'pointer', fontSize:12, fontWeight:600 }}>Remove</button>
        </div>
      </div>
      {/* SKU preview */}
      <div style={{ marginTop:10, padding:'8px 12px', background: sku ? C.tealLight : C.surface2, borderRadius:8, display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>SKU:</span>
        {design.sku_locked ? (
          <input value={design.sku||''} onChange={e=>onUpdate({...design,sku:e.target.value})}
            style={{ ...inp, width:200, padding:'4px 8px', fontFamily:'monospace', fontWeight:700, fontSize:13, color:C.tealDark }} />
        ) : (
          <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:14, color: sku ? C.tealDark : C.muted }}>
            {sku || '— fill Design No to generate —'}
          </span>
        )}
        <button type="button" onClick={()=>onUpdate({...design, sku: sku, sku_locked: !design.sku_locked})} style={{
          padding:'3px 10px', borderRadius:6, border:`1.5px solid ${design.sku_locked ? C.orange : C.teal}`,
          background:'#fff', color: design.sku_locked ? C.orange : C.teal, fontSize:11, fontWeight:700, cursor:'pointer',
        }}>
          {design.sku_locked ? '🔒 Unlock' : '🔓 Lock SKU'}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FORM
// ═══════════════════════════════════════════════════════════════════════════════
export default function FinishFabricForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;

  const [stage, setStage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [pushingTally, setPushingTally] = useState(false);
  const [savedId, setSavedId] = useState(id||null);
  const [toast, setToast] = useState(null);

  // Settings from DB
  const [skuFormula, setSkuFormula] = useState(null);
  const [vaOpts, setVaOpts] = useState([]);
  const [conceptOpts, setConceptOpts] = useState([]);
  const [placementOpts, setPlacementOpts] = useState([]);
  const [movementOpts, setMovementOpts] = useState([]);

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── STAGE 1 FORM ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    item_name: '',
    fabric_category: searchParams.get('category') || 'mill_print',
    tag: 'Regular',
    base_fabric: null,
    process_path_steps: [],
    // fabric-level VA (applies to all designs by default)
    value_addition: '',
    va_concept: '',
    va_placement: '',
    // fabric movement (how grey moves through jobworkers)
    fabric_movement: '',
    // defaults for designs
    width: '44"',
    hsn_code: '5208',
    tally_group: 'Finish Fabrics',
    description: '',
    is_active: true,
    ecom_enabled: false,
    ecom_name_different: false,
    ecom_name: '',
  });

  // ─── STAGE 2 DESIGNS ───────────────────────────────────────────────────────
  const [designs, setDesigns] = useState([]);

  const setF = (k, v) => setForm(f => ({...f, [k]: v}));

  // Load settings from admin_settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('admin_settings')
        .select('key_name, key_value')
        .in('key_name', ['SKU_FORMULA','VA_OPTIONS','VA_CONCEPT_OPTIONS','VA_PLACEMENT_OPTIONS','FABRIC_MOVEMENT_OPTIONS']);
      if (!data) return;
      const map = Object.fromEntries(data.map(r => [r.key_name, r.key_value]));
      if (map.SKU_FORMULA) setSkuFormula(map.SKU_FORMULA);
      if (map.VA_OPTIONS) { try { setVaOpts(JSON.parse(map.VA_OPTIONS)); } catch {} }
      if (map.VA_CONCEPT_OPTIONS) { try { setConceptOpts(JSON.parse(map.VA_CONCEPT_OPTIONS)); } catch {} }
      if (map.VA_PLACEMENT_OPTIONS) { try { setPlacementOpts(JSON.parse(map.VA_PLACEMENT_OPTIONS)); } catch {} }
      if (map.FABRIC_MOVEMENT_OPTIONS) { try { setMovementOpts(JSON.parse(map.FABRIC_MOVEMENT_OPTIONS)); } catch {} }
    })();
  }, []);

  // Load existing record
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from('finish_fabrics').select('*').eq('id', id).single();
      if (data) {
        let steps = [];
        try { const raw = data.process_path; steps = typeof raw==='string' ? JSON.parse(raw) : (raw||[]); } catch {}
        setForm({
          item_name: data.item_name || data.tally_item_name || '',
          fabric_category: data.fabric_category || 'mill_print',
          tag: data.tag || 'Regular',
          base_fabric: data.base_fabric_id ? { id:data.base_fabric_id, base_fabric_name:data.base_fabric_name||'', short_code:data.short_code||'' } : null,
          process_path_steps: Array.isArray(steps) ? steps : [],
          value_addition: data.value_addition || '',
          va_concept: data.va_concept || '',
          va_placement: '',
          fabric_movement: data.fabric_movement || '',
          width: data.finish_width || '44"',
          hsn_code: data.hsn_code || '5208',
          tally_group: data.tally_group || 'Finish Fabrics',
          description: data.description || '',
          is_active: data.is_active !== false,
          ecom_enabled: !!(data.ecom_enabled||data.ecom_visible),
          ecom_name_different: !!(data.ecom_name),
          ecom_name: data.ecom_name || '',
        });
        setSavedId(id);
      }
      const { data: dd } = await supabase.from('finish_fabric_designs')
        .select('*').eq('finish_fabric_id', id)
        .order('created_at');
      if (dd) setDesigns(dd.map(d => ({...d, design_no: d.design_no || d.design_number || ''})));
    })();
  }, [id]);

  // ─── SAVE STAGE 1 ──────────────────────────────────────────────────────────
  const saveStage1 = async () => {
    if (!form.item_name.trim()) { showToast('Item name (Tally name) is required', 'error'); return; }
    setSaving(true);
    const payload = {
      item_name: form.item_name.trim(),
      tally_item_name: form.item_name.trim(),
      fabric_category: form.fabric_category,
      tag: form.tag,
      base_fabric_id: form.base_fabric?.id || null,
      base_fabric_name: form.base_fabric?.base_fabric_name || form.base_fabric?.fabric_name || null,
      short_code: form.base_fabric?.short_code || null,
      process_path: JSON.stringify(form.process_path_steps),
      process_steps: JSON.stringify(form.process_path_steps),
      value_addition: form.value_addition || null,
      va_concept: form.va_concept || null,
      fabric_movement: form.fabric_movement || null,
      finish_width: form.width,
      hsn_code: form.hsn_code,
      tally_group: form.tally_group,
      description: form.description || null,
      is_active: form.is_active,
      ecom_enabled: form.ecom_enabled,
      ecom_visible: form.ecom_enabled,
      ecom_name: form.ecom_name_different ? (form.ecom_name || null) : null,
      updated_at: new Date().toISOString(),
    };
    let res;
    if (savedId) {
      res = await supabase.from('finish_fabrics').update(payload).eq('id', savedId).select().single();
    } else {
      res = await supabase.from('finish_fabrics').insert({...payload, created_at: new Date().toISOString()}).select().single();
    }
    setSaving(false);
    if (res.error) { showToast(`Save failed: ${res.error.message}`, 'error'); return; }
    const nid = res.data.id;
    setSavedId(nid);
    showToast('Stage 1 saved ✓');
    setStage(2);
    if (!isEdit) navigate(`/admin/fabric/finish-fabric-form/${nid}`, { replace: true });
  };

  // ─── PUSH TO TALLY ─────────────────────────────────────────────────────────
  const pushToTally = async () => {
    if (!savedId || !form.item_name.trim()) { showToast('Save first', 'error'); return; }
    setPushingTally(true);
    try {
      const xml = `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>All Masters</REPORTNAME></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"><STOCKITEM NAME="${form.item_name.trim()}" RESERVEDNAME=""><CATEGORY>${form.tally_group}</CATEGORY><BASEUNITS>Mtr</BASEUNITS><HSNDETAILS><HSNDETAIL><HSNCODE>${form.hsn_code}</HSNCODE><TAXABILITY>Taxable</TAXABILITY><GSTRATE>5</GSTRATE></HSNDETAIL></HSNDETAILS></STOCKITEM></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
      const res = await fetch('https://tally-test.shreerangtrendz.com', {
        method:'POST', body:xml, headers:{'Content-Type':'text/xml'},
        signal: AbortSignal.timeout(10000),
      });
      const ok = res.ok;
      await supabase.from('finish_fabrics').update({ tally_synced_at: new Date().toISOString(), tally_sync_ok:ok, tally_synced:ok }).eq('id', savedId);
      await supabase.from('tally_sync_log').insert({ entity_type:'finish_fabric', entity_id:savedId, entity_name:form.item_name, action:'create', tally_ok:ok, synced_by:'manual' });
      showToast(ok ? 'Pushed to Tally ✓' : 'Tally offline (saved log)', ok ? 'success' : 'error');
    } catch {
      await supabase.from('finish_fabrics').update({ tally_sync_ok:false }).eq('id', savedId);
      showToast('Tally offline / tunnel down', 'error');
    }
    setPushingTally(false);
  };

  // ─── SAVE DESIGNS ──────────────────────────────────────────────────────────
  const saveDesigns = async () => {
    if (!savedId) return;
    setSaving(true);
    let ok = 0, fail = 0;
    for (const d of designs) {
      // Compute final SKU before saving
      const finalSku = d.sku_locked ? d.sku : computeSKU(d, form.base_fabric?.short_code, form.process_path_steps, form.tag, skuFormula);
      const payload = {
        finish_fabric_id: savedId,
        design_no: d.design_no || d.design_number || null,
        design_number: d.design_no || d.design_number || null,
        color_name: d.color_name || null,
        jobworker_name: d.jobworker_name || null,
        jobworker_cost: d.jobworker_cost || null,
        print_type: d.print_type || null,
        width: d.width || null,
        lump_price: d.lump_price || null,
        cut_pack_price: d.cut_pack_price || null,
        value_addition: d.value_addition || null,
        fabric_movement: d.fabric_movement || null,
        notes: d.notes || null,
        sku: finalSku || null,
        sku_locked: d.sku_locked || false,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      let r;
      if (d.id && !d._new) {
        r = await supabase.from('finish_fabric_designs').update(payload).eq('id', d.id);
      } else {
        r = await supabase.from('finish_fabric_designs').insert({...payload, created_at: new Date().toISOString()});
      }
      r.error ? fail++ : ok++;
    }
    setSaving(false);
    showToast(fail>0 ? `Saved ${ok}, failed ${fail}` : `${ok} design(s) saved ✓`, fail>0 ? 'error' : 'success');
  };

  const addDesign = () => setDesigns(d => [...d, {
    _new:true, _key:Date.now(),
    design_no:'', color_name:'', jobworker_name:'', print_type:'',
    width: form.width, value_addition: form.value_addition,
    lump_price:null, cut_pack_price:null, jobworker_cost:null, notes:'',
    sku:'', sku_locked:false,
  }]);
  const updateDesign = (i,v) => setDesigns(d => d.map((x,j)=>j===i?v:x));
  const removeDesign = (i) => setDesigns(d => d.filter((_,j)=>j!==i));

  const catObj = FABRIC_CATEGORIES.find(c=>c.value===form.fabric_category);
  const shortCode = form.base_fabric?.short_code || '';

  return (
    <div style={{ maxWidth:920, margin:'0 auto', padding:'20px 16px', fontFamily:'Inter,sans-serif', color:C.text }}>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'10px 18px', borderRadius:10,
          background: toast.type==='error' ? C.error : C.green, color:'#fff', fontSize:13, fontWeight:600,
          boxShadow:'0 4px 20px rgba(0,0,0,0.18)' }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <button onClick={()=>navigate(-1)} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:18, padding:0 }}>←</button>
          <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:C.tealDark }}>
            {isEdit ? 'Edit Finish Fabric' : 'New Finish Fabric'}
          </h1>
          {catObj && <span style={{ padding:'3px 10px', borderRadius:20, background:catObj.color, color:'#fff', fontSize:11, fontWeight:700 }}>{catObj.icon} {catObj.label}</span>}
          <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
            <button onClick={()=>navigate('/admin/settings/sku-formula')} style={{ padding:'5px 12px', borderRadius:7, border:`1.5px solid ${C.border}`, background:'#fff', color:C.muted, fontSize:11, fontWeight:600, cursor:'pointer' }}>⚙️ SKU Formula</button>
          </div>
        </div>
        <p style={{ margin:0, fontSize:12, color:C.muted }}>Item name = Tally stock item. One fabric → multiple designs each with auto SKU.</p>
      </div>

      <StageBar stage={stage} setStage={setStage} savedId={savedId} />

      {/* ══════ STAGE 1 ══════ */}
      {stage===1 && (
        <>
          {/* Category */}
          <div style={card}>
            <div style={sectionTitle}><span>📋</span> Fabric Category</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {FABRIC_CATEGORIES.map(cat => (
                <button key={cat.value} onClick={()=>setF('fabric_category',cat.value)} type="button" style={{
                  padding:'8px 16px', borderRadius:24, border:`2px solid ${form.fabric_category===cat.value ? cat.color : C.border}`,
                  background: form.fabric_category===cat.value ? cat.color : '#fff',
                  color: form.fabric_category===cat.value ? '#fff' : C.text,
                  fontWeight:700, fontSize:13, cursor:'pointer', transition:'all 0.12s',
                }}>{cat.icon} {cat.label}</button>
              ))}
            </div>
          </div>

          {/* Tally Name + Tag */}
          <div style={card}>
            <div style={sectionTitle}><span>🏷️</span> Item Name & Tag</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 160px', gap:12 }}>
              <div>
                <label style={lbl}>Item Name (Tally Stock Item Name) *</label>
                <input value={form.item_name}
                  onChange={e=>setF('item_name',e.target.value)}
                  placeholder="Exactly as it appears in Tally Prime..."
                  style={{ ...inp, fontSize:14, fontWeight:600, borderColor: form.item_name ? C.teal : C.border }} />
                <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>This exact name is used for all Tally vouchers and stock reports.</div>
              </div>
              <div>
                <label style={lbl}>Tag / Variant</label>
                <select value={form.tag} onChange={e=>setF('tag',e.target.value)} style={inp}>
                  {FABRIC_TAGS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop:12 }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'8px 12px', background:C.tealLight, borderRadius:8, width:'fit-content' }}>
                <input type="checkbox" checked={form.ecom_name_different} onChange={e=>setF('ecom_name_different',e.target.checked)} style={{ width:15, height:15 }} />
                <span style={{ fontSize:13, color:C.tealDark, fontWeight:600 }}>Different eCommerce display name</span>
              </label>
              {form.ecom_name_different && (
                <input value={form.ecom_name} onChange={e=>setF('ecom_name',e.target.value)}
                  placeholder="Customer-facing product name..." style={{ ...inp, marginTop:8 }} />
              )}
            </div>
          </div>

          {/* Base Fabric Mapping */}
          <div style={card}>
            <div style={sectionTitle}><span>🧶</span> Base Fabric Mapping <span style={{ fontSize:10, color:C.muted, fontWeight:500 }}>(optional — maps grey fabric to this finish fabric)</span></div>
            <BaseFabricSelector value={form.base_fabric} onChange={v=>setF('base_fabric',v)} />
            {form.base_fabric && (
              <div style={{ marginTop:8, padding:'8px 12px', background:C.tealLight, borderRadius:8, display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                {[
                  ['Short Code', form.base_fabric.short_code],
                  ['GSM', form.base_fabric.gsm],
                  ['Width', form.base_fabric.width],
                  ['Construction', form.base_fabric.construction],
                  ['Yarn', form.base_fabric.yarn_count],
                ].map(([k,v]) => v ? (
                  <div key={k} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:10, color:C.muted, fontWeight:700 }}>{k}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.tealDark }}>{v}</div>
                  </div>
                ) : null)}
              </div>
            )}
            <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>Short code from base fabric is used as part of the SKU formula.</div>
          </div>

          {/* Process Path */}
          <div style={card}>
            <div style={sectionTitle}><span>🔄</span> Process Path <span style={{ fontSize:10, color:C.muted, fontWeight:500 }}>(ordered journey of the fabric)</span></div>
            <ProcessPathBuilder value={form.process_path_steps} onChange={v=>setF('process_path_steps',v)} />
          </div>

          {/* Fabric Movement */}
          <div style={card}>
            <div style={sectionTitle}><span>🚚</span> Fabric Movement <span style={{ fontSize:10, color:C.muted, fontWeight:500 }}>(how the grey fabric moves through jobworkers)</span></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={lbl}>Movement Path</label>
                <select value={form.fabric_movement} onChange={e=>setF('fabric_movement',e.target.value)} style={inp}>
                  <option value="">— select movement path —</option>
                  {movementOpts.map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Tally Stock Group</label>
                <select value={form.tally_group} onChange={e=>setF('tally_group',e.target.value)} style={inp}>
                  {TALLY_GROUPS.map(g=><option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Value Addition (fabric-level default) */}
          <div style={card}>
            <div style={sectionTitle}><span>✨</span> Value Addition <span style={{ fontSize:10, color:C.muted, fontWeight:500 }}>(fabric-level default — can override per design)</span></div>
            <VASection
              va={{ value_addition:form.value_addition, va_concept:form.va_concept, va_placement:form.va_placement }}
              onVaChange={(k,v)=>setF(k,v)}
              vaOpts={vaOpts}
              conceptOpts={conceptOpts}
              placementOpts={placementOpts}
            />
          </div>

          {/* Specs */}
          <div style={card}>
            <div style={sectionTitle}><span>📐</span> Specs & Metadata</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <div>
                <label style={lbl}>Default Width</label>
                <select value={form.width} onChange={e=>setF('width',e.target.value)} style={inp}>
                  {DEFAULT_WIDTHS.map(w=><option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>HSN Code</label>
                <input value={form.hsn_code} onChange={e=>setF('hsn_code',e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>eCommerce</label>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginTop:8 }}>
                  <input type="checkbox" checked={form.ecom_enabled} onChange={e=>setF('ecom_enabled',e.target.checked)} style={{ width:15, height:15 }} />
                  <span style={{ fontSize:13 }}>Show on eCommerce</span>
                </label>
              </div>
            </div>
            <div style={{ marginTop:12 }}>
              <label style={lbl}>Description / Notes</label>
              <textarea value={form.description} onChange={e=>setF('description',e.target.value)}
                rows={2} placeholder="Internal notes..." style={{ ...inp, resize:'vertical' }} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={saveStage1} disabled={saving} style={{
              flex:1, padding:'12px 20px', borderRadius:10, border:'none',
              background: saving ? C.border : C.teal, color:'#fff', fontSize:14, fontWeight:700, cursor: saving ? 'default' : 'pointer',
            }}>{saving ? 'Saving...' : savedId ? 'Update → Go to Designs' : 'Save → Add Designs'}</button>
            {savedId && (
              <button onClick={pushToTally} disabled={pushingTally} style={{
                padding:'12px 20px', borderRadius:10, border:`2px solid ${C.gold}`,
                background:'#fff', color:C.gold, fontSize:13, fontWeight:700, cursor: pushingTally ? 'default' : 'pointer',
              }}>{pushingTally ? '...' : '⇄ Push to Tally'}</button>
            )}
          </div>
        </>
      )}

      {/* ══════ STAGE 2 ══════ */}
      {stage===2 && savedId && (
        <>
          {/* Fabric summary banner */}
          <div style={{ ...card, background:C.tealLight, borderColor:C.teal, padding:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <span style={{ fontWeight:800, fontSize:14, color:C.tealDark }}>{form.item_name}</span>
                {form.tag!=='Regular' && <span style={{ marginLeft:8, padding:'2px 8px', borderRadius:12, background:C.teal, color:'#fff', fontSize:11 }}>{form.tag}</span>}
                <span style={{ marginLeft:10, fontSize:12, color:C.muted }}>
                  {catObj?.icon} {catObj?.label}
                  {form.base_fabric && ` · Base: ${form.base_fabric.base_fabric_name||form.base_fabric.fabric_name}`}
                  {shortCode && ` · Code: ${shortCode}`}
                  {form.process_path_steps.length>0 && ` · Path: ${processPathLabel(form.process_path_steps)}`}
                  {form.fabric_movement && ` · ${form.fabric_movement}`}
                  {form.value_addition && ` · VA: ${form.value_addition}`}
                </span>
              </div>
              <button onClick={()=>setStage(1)} style={{ background:'none', border:'none', color:C.teal, cursor:'pointer', fontSize:12, fontWeight:700 }}>← Edit Stage 1</button>
            </div>
            {/* SKU formula preview */}
            {skuFormula && (() => {
              let parts;
              try { parts = JSON.parse(skuFormula).parts; } catch { parts = []; }
              return (
                <div style={{ marginTop:8, fontSize:11, color:C.muted }}>
                  SKU Formula: {parts?.join(' + ')} — e.g. <strong style={{ fontFamily:'monospace', color:C.tealDark }}>
                    {computeSKU({ design_no:'D001', width:form.width, value_addition:form.value_addition }, shortCode, form.process_path_steps, form.tag, skuFormula)}
                  </strong>
                  <button onClick={()=>navigate('/admin/settings/sku-formula')} style={{ marginLeft:10, padding:'1px 8px', borderRadius:5, border:`1px solid ${C.teal}`, background:'#fff', color:C.teal, fontSize:10, cursor:'pointer' }}>Edit Formula</button>
                </div>
              );
            })()}
          </div>

          {/* Designs panel */}
          <div style={card}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div>
                <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:C.tealDark }}>Design Variants ({designs.length})</h3>
                <p style={{ margin:'3px 0 0', fontSize:12, color:C.muted }}>Each design/color number gets its own SKU generated from the formula above.</p>
              </div>
              <button onClick={addDesign} type="button" style={{ padding:'9px 18px', borderRadius:8, border:'none', background:C.teal, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>+ Add Design</button>
            </div>

            {designs.length===0 ? (
              <div style={{ textAlign:'center', padding:'36px 0', color:C.muted }}>
                <div style={{ fontSize:36, marginBottom:8 }}>🎨</div>
                <div style={{ fontSize:13 }}>No designs yet. Click "+ Add Design" to add design variants.</div>
                <div style={{ fontSize:11, marginTop:6 }}>Each design number or color number will have its own SKU.</div>
              </div>
            ) : designs.map((d, i) => (
              <DesignRow
                key={d.id || d._key}
                design={d}
                idx={i}
                onUpdate={v => updateDesign(i, v)}
                onRemove={() => removeDesign(i)}
                skuFormula={skuFormula}
                processSteps={form.process_path_steps}
                tag={form.tag}
                shortCode={shortCode}
              />
            ))}
          </div>

          {/* Stage 2 actions */}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={saveDesigns} disabled={saving || designs.length===0} style={{
              flex:1, padding:'12px 20px', borderRadius:10, border:'none',
              background: (saving||designs.length===0) ? C.border : C.teal,
              color:'#fff', fontSize:14, fontWeight:700, cursor: saving ? 'default' : 'pointer',
            }}>{saving ? 'Saving...' : `Save ${designs.length} Design(s) ✓`}</button>
            <button onClick={pushToTally} disabled={pushingTally} style={{
              padding:'12px 20px', borderRadius:10, border:`2px solid ${C.gold}`,
              background:'#fff', color:C.gold, fontSize:13, fontWeight:700, cursor: pushingTally ? 'default' : 'pointer',
            }}>{pushingTally ? '...' : '⇄ Push to Tally'}</button>
            <button onClick={()=>navigate('/admin/fabric/finish-fabric-form')} style={{
              padding:'12px 16px', borderRadius:10, border:`2px solid ${C.border}`,
              background:'#fff', color:C.text, fontSize:13, fontWeight:700, cursor:'pointer',
            }}>+ New Fabric</button>
          </div>
        </>
      )}
    </div>
  );
}
