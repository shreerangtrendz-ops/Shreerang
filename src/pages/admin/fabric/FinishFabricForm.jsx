import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const C = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6',
  gold:'#D4920A', goldLight:'#FEF9EC',
  border:'#D6EEE9', text:'#0D2E2B', muted:'#4A7A74',
  error:'#D93A3A', green:'#1E9E5A', surface:'#fff',
  purple:'#7C3AED', orange:'#C86020',
  section1:'#2BA898', section2:'#7C3AED', section3:'#D4920A', section4:'#1E9E5A',
};
const lbl = { fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:4, display:'block' };
const inp = { width:'100%', padding:'8px 11px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, color:C.text, outline:'none', boxSizing:'border-box', background:'#fff', fontFamily:'inherit' };
const card = (accent) => ({ background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:14, borderTop:`3px solid ${accent||C.teal}` });
const row = (cols) => ({ display:'grid', gridTemplateColumns:cols||'1fr 1fr', gap:12, marginBottom:12 });

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
function SectionHead({ num, title, color, sub }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
      <div style={{ width:28, height:28, borderRadius:8, background:color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:800, flexShrink:0 }}>{num}</div>
      <div>
        <div style={{ fontSize:14, fontWeight:800, color:C.tealDark }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── DROPDOWN FIELD ──────────────────────────────────────────────────────────
function DropField({ label, value, onChange, options, placeholder, allowOther, hint }) {
  const [custom, setCustom] = useState(false);
  const isOther = allowOther && !options.find(o => o === value || o?.value === value) && value;
  useEffect(() => { if (isOther) setCustom(true); }, [isOther]);
  const vals = options.map(o => typeof o === 'string' ? { value:o, label:o } : o);
  return (
    <div>
      {label && <label style={lbl}>{label}</label>}
      {!custom ? (
        <select value={value||''} onChange={e => {
          if (e.target.value === '__other__') setCustom(true);
          else onChange(e.target.value);
        }} style={inp}>
          <option value="">{placeholder||'— select —'}</option>
          {vals.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          {allowOther && <option value="__other__">+ Add Custom…</option>}
        </select>
      ) : (
        <div style={{ display:'flex', gap:6 }}>
          <input value={value||''} onChange={e => onChange(e.target.value)} placeholder="Type value..." style={{ ...inp, flex:1 }} autoFocus />
          <button type="button" onClick={() => { setCustom(false); onChange(''); }} style={{ padding:'6px 10px', borderRadius:7, border:`1px solid ${C.border}`, background:'#fff', cursor:'pointer', fontSize:11, color:C.muted }}>✕</button>
        </div>
      )}
      {hint && <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>{hint}</div>}
    </div>
  );
}

// ─── PROCESS STEP CHIP ────────────────────────────────────────────────────────
const PROCESS_STEP_DEFS = [
  { id:'greige',    label:'Grey Fabric',       code:'GRI', color:'#94a3b8' },
  { id:'rfd',       label:'Scouring / RFD',    code:'RFD', color:'#60a5fa' },
  { id:'print_mill',label:'Mill / Screen Print',code:'MP', color:'#f59e0b' },
  { id:'print_tp',  label:'Table Print',        code:'TP', color:'#fbbf24' },
  { id:'print_bp',  label:'Block Print',        code:'BP', color:'#d97706' },
  { id:'print_odp', label:'ODP Print',          code:'ODP',color:'#b45309' },
  { id:'print_digital',label:'Digital Print',  code:'DP', color:'#06b6d4' },
  { id:'solid_dyed',label:'Solid Dyeing',       code:'SLD',color:'#a78bfa' },
  { id:'foil',      label:'Foil/Gold/Glitter',  code:'FOIL',color:'#f97316' },
  { id:'embroidery',label:'Embroidery',         code:'EMB',color:'#ec4899' },
  { id:'schiffli',  label:'Schiffli / Hakoba',  code:'HK', color:'#8b5cf6' },
  { id:'handwork',  label:'Handwork',           code:'HW', color:'#c026d3' },
  { id:'crush',     label:'Crush / Pleated',    code:'CRH',color:'#64748b' },
  { id:'deca',      label:'Deca / Washing',     code:'DEC',color:'#14b8a6' },
];

function ProcessBuilder({ steps, onChange }) {
  const toggle = (id) => {
    if (steps.find(s => s.id === id)) onChange(steps.filter(s => s.id !== id));
    else onChange([...steps, { id }]);
  };
  const move = (idx, dir) => {
    const arr = [...steps]; const to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]]; onChange(arr);
  };
  return (
    <div>
      <div style={{ fontSize:11, color:C.muted, marginBottom:8, fontWeight:600 }}>
        CLICK TO ADD PROCESS STEPS — SAME STEP CAN APPEAR MULTIPLE TIMES FOR MULTI-PASS
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:12 }}>
        {PROCESS_STEP_DEFS.map(step => {
          const sel = steps.find(s => s.id === step.id);
          return (
            <button key={step.id} type="button" onClick={() => toggle(step.id)} style={{
              padding:'5px 13px', borderRadius:20, border:`1.5px solid ${sel ? step.color : C.border}`,
              background: sel ? step.color : '#fff', color: sel ? '#fff' : C.text,
              fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.12s',
            }}>+ {step.label}</button>
          );
        })}
      </div>
      {steps.length > 0 && (
        <div style={{ background:C.tealLight, borderRadius:9, padding:'10px 14px' }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted, marginBottom:7 }}>
            PROCESS SEQUENCE — DRAG TO REORDER · SERIAL ORDER DRIVES COST CALCULATION
          </div>
          <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:5 }}>
            {steps.map((s, i) => {
              const def = PROCESS_STEP_DEFS.find(p => p.id === s.id);
              if (!def) return null;
              return (
                <div key={`${s.id}-${i}`} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', background:def.color, borderRadius:6, color:'#fff', fontSize:12 }}>
                  {i > 0 && <span style={{ opacity:0.6, fontSize:10 }}>→</span>}
                  <span style={{ fontWeight:700, fontSize:11 }}>{def.code}</span>
                  <span style={{ fontSize:10, opacity:0.85 }}>{def.label}</span>
                  <button type="button" onClick={() => move(i,-1)} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.8)',cursor:'pointer',padding:'0 1px',fontSize:9 }}>▲</button>
                  <button type="button" onClick={() => move(i,1)} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.8)',cursor:'pointer',padding:'0 1px',fontSize:9 }}>▼</button>
                  <button type="button" onClick={() => onChange(steps.filter((_,j) => j !== i))} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.9)',cursor:'pointer',padding:'0 2px',fontSize:10 }}>✕</button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:8, fontSize:11, color:C.muted }}>
            Path code: <strong style={{ fontFamily:'monospace', color:C.tealDark }}>
              {steps.map(s => PROCESS_STEP_DEFS.find(p => p.id === s.id)?.code||'').join('-')}
            </strong>
            <span style={{ marginLeft:12, fontSize:10, color:C.muted }}>
              💡 One fabric can pass through <strong>any number of paths</strong> in any sequence. The serial order above drives cost calculation. For Schiffli, cost depends on the sequence position.
            </span>
          </div>
        </div>
      )}
      {steps.length === 0 && (
        <div style={{ textAlign:'center', padding:'16px', border:`1.5px dashed ${C.border}`, borderRadius:9, color:C.muted, fontSize:12 }}>
          Click steps above to define the fabric's process journey
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
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const doSearch = useCallback(async (query) => {
    const qb = supabase.from('base_fabrics')
      .select('id, base_fabric_name, fabric_name, short_code, sku, construction, gsm, gsm_tolerance, weight, base_width, finish_width, transparency, handfeel, stretchability, yarn_type, yarn_count, hsn_code')
      .not('status','eq','deleted').order('base_fabric_name');
    if (query) qb.or(`base_fabric_name.ilike.%${query}%,fabric_name.ilike.%${query}%`);
    const { data } = await qb.limit(40);
    setOpts(data || []);
  }, []);

  useEffect(() => { if (open) doSearch(q); }, [open, q, doSearch]);

  const name = value ? (value.base_fabric_name || value.fabric_name || '') : '';
  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{ ...inp, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', minHeight:38 }}>
        {name ? (
          <div>
            <span style={{ fontWeight:600 }}>{name}</span>
            {value?.short_code && <span style={{ marginLeft:8, fontSize:11, color:C.muted, fontFamily:'monospace' }}>[{value.short_code}]</span>}
          </div>
        ) : (
          <span style={{ color:C.muted }}>Search base fabric (grey fabric)…</span>
        )}
        <span style={{ fontSize:9, color:C.muted }}>▼</span>
      </div>
      {value && (
        <div style={{ marginTop:6, padding:'8px 12px', background:C.tealLight, borderRadius:8, display:'flex', flexWrap:'wrap', gap:12 }}>
          {[['Short Code', value.short_code],['GSM', value.gsm],['Weight', value.weight ? `${value.weight}kg` : null],
            ['Width', value.finish_width||value.base_width],['Construction', value.construction],
            ['Stretch', value.stretchability],['Transparency', value.transparency],
            ['Handfeel', value.handfeel],['Yarn Type', value.yarn_type],
            ['Yarn Count', value.yarn_count],['HSN', value.hsn_code],
          ].map(([k,v]) => v ? (
            <div key={k} style={{ textAlign:'center', minWidth:60 }}>
              <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:'uppercase' }}>{k}</div>
              <div style={{ fontSize:12, fontWeight:700, color:C.tealDark }}>{v}</div>
            </div>
          ) : null)}
        </div>
      )}
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:200, background:'#fff', border:`1.5px solid ${C.border}`, borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.14)', maxHeight:300, overflowY:'auto', marginTop:4 }}>
          <div style={{ padding:8, borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, background:'#fff' }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Type to search…" style={{ ...inp, padding:'6px 10px', fontSize:12 }} />
          </div>
          <div onClick={() => { onChange(null); setOpen(false); }} style={{ padding:'7px 12px', fontSize:12, color:C.error, cursor:'pointer', borderBottom:`1px solid ${C.border}` }}>✕ Clear</div>
          {opts.length === 0
            ? <div style={{ padding:12, textAlign:'center', fontSize:12, color:C.muted }}>No base fabrics found</div>
            : opts.map(opt => (
              <div key={opt.id} onClick={() => { onChange(opt); setOpen(false); }} style={{ padding:'9px 12px', cursor:'pointer', borderBottom:`1px solid ${C.border}`, background:value?.id===opt.id?C.tealLight:'#fff' }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{opt.base_fabric_name||opt.fabric_name}</div>
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                  {[opt.short_code&&`[${opt.short_code}]`, opt.gsm&&`${opt.gsm} GSM`, opt.finish_width||opt.base_width, opt.construction].filter(Boolean).join(' · ')}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── DROPDOWN MANAGER INLINE ──────────────────────────────────────────────────
function ManageDropdown({ dropdownKey, title, onClose }) {
  const [items, setItems] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const [newCode, setNewCode] = useState('');

  useEffect(() => {
    supabase.from('fabric_dropdown_master').select('*').eq('dropdown_key', dropdownKey).eq('is_active', true).order('sort_order').then(({ data }) => setItems(data || []));
  }, [dropdownKey]);

  const add = async () => {
    if (!newLabel.trim()) return;
    await supabase.from('fabric_dropdown_master').insert({ dropdown_key: dropdownKey, label: newLabel.trim(), code: newCode.trim()||null, sort_order: items.length });
    setNewLabel(''); setNewCode('');
    const { data } = await supabase.from('fabric_dropdown_master').select('*').eq('dropdown_key', dropdownKey).eq('is_active', true).order('sort_order');
    setItems(data || []);
  };

  const remove = async (id) => {
    await supabase.from('fabric_dropdown_master').update({ is_active: false }).eq('id', id);
    setItems(items.filter(i => i.id !== id));
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:14, padding:24, width:480, maxHeight:'80vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:15, color:C.tealDark }}>Manage: {title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:C.muted }}>✕</button>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          <input value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key==='Enter'&&add()} placeholder="New option label..." style={{ ...inp, flex:1 }} />
          <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Code" style={{ ...inp, width:80 }} />
          <button onClick={add} style={{ padding:'8px 14px', borderRadius:7, border:'none', background:C.teal, color:'#fff', cursor:'pointer', fontWeight:700, whiteSpace:'nowrap' }}>+ Add</button>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {items.map(item => (
            <div key={item.id} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', background:C.tealLight, borderRadius:20, fontSize:12 }}>
              <span style={{ fontWeight:600 }}>{item.label}</span>
              {item.code && <span style={{ fontSize:10, color:C.muted, fontFamily:'monospace' }}>{item.code}</span>}
              <button onClick={() => remove(item.id)} style={{ background:'none', border:'none', color:C.error, cursor:'pointer', padding:0, fontSize:12, marginLeft:2 }}>✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AI SUGGEST BUTTON ────────────────────────────────────────────────────────
function AISuggest({ label, onSuggest, loading }) {
  return (
    <button type="button" onClick={onSuggest} disabled={loading} style={{
      padding:'3px 9px', borderRadius:12, border:`1px solid ${C.purple}`,
      background:'#faf5ff', color:C.purple, fontSize:10, fontWeight:700, cursor:loading?'default':'pointer',
      marginLeft:8, verticalAlign:'middle',
    }}>
      {loading ? '✦ Thinking…' : '✦ AI Suggest'}
    </button>
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

  const [saving, setSaving] = useState(false);
  const [pushingTally, setPushingTally] = useState(false);
  const [savedId, setSavedId] = useState(id || null);
  const [toast, setToast] = useState(null);
  const [aiLoading, setAiLoading] = useState({});
  const [managingDropdown, setManagingDropdown] = useState(null);

  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  // Dropdown data loaded from DB
  const [dropdowns, setDropdowns] = useState({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('fabric_dropdown_master').select('dropdown_key, label, code, sort_order').eq('is_active', true).order('sort_order');
      if (!data) return;
      const grouped = {};
      data.forEach(r => {
        if (!grouped[r.dropdown_key]) grouped[r.dropdown_key] = [];
        grouped[r.dropdown_key].push({ value: r.label, label: r.label, code: r.code });
      });
      setDropdowns(grouped);
    })();
  }, [managingDropdown]); // reload after managing

  // SKU formula
  const [skuFormula, setSkuFormula] = useState(null);
  useEffect(() => {
    supabase.from('admin_settings').select('key_value').eq('key_name','SKU_FORMULA').single().then(({ data }) => {
      if (data) setSkuFormula(data.key_value);
    });
  }, []);

  // ─── FORM STATE ────────────────────────────────────────────────────────────
  const empty = {
    // Section 1: Identity
    item_name: '', tally_group: 'Finish Fabrics', hsn_code: '5208', gst_rate: '5',
    ecom_enabled: false, ecom_name_different: false, ecom_name: '',
    // Section 2: Process
    process_steps: [],
    process_class: 'Regular', print_type: '', ink_type_name: '', finish_name: '', print_concept: '',
    finish_width: '44"',
    // Section 3: Value Addition
    value_addition: '', va_thread: '', va_concept: '', va_placement: '',
    fabric_movement: '',
    // Section 4: Base Fabric
    base_fabric: null,
  };
  const [form, setForm] = useState(empty);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ─── LOAD EXISTING ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from('finish_fabrics').select('*').eq('id', id).single();
      if (!data) return;
      let steps = [];
      try { steps = typeof data.process_path === 'string' ? JSON.parse(data.process_path) : (data.process_path||[]); } catch {}
      setForm({
        item_name: data.item_name || data.tally_item_name || data.finish_fabric_name || '',
        tally_group: data.tally_group || 'Finish Fabrics',
        hsn_code: data.hsn_code || '5208', gst_rate: String(data.gst_rate||5),
        ecom_enabled: !!(data.ecom_enabled||data.ecom_visible),
        ecom_name_different: !!(data.ecom_name), ecom_name: data.ecom_name||'',
        process_steps: Array.isArray(steps) ? steps : [],
        process_class: data.process_class || data.class || 'Regular',
        print_type: data.print_type || '', ink_type_name: data.ink_type||data.ink_type_name||'',
        finish_name: data.finish||data.finish_name||'', print_concept: data.design_concept||data.print_concept||'',
        finish_width: data.finish_width||'44"',
        value_addition: data.value_addition||'', va_thread: data.work_thread||data.va_thread||'',
        va_concept: data.va_concept||'', va_placement: data.va_placement||'',
        fabric_movement: data.fabric_movement||'',
        base_fabric: data.base_fabric_id ? { id:data.base_fabric_id, base_fabric_name:data.base_fabric_name||'', short_code:data.short_code||'' } : null,
      });
      setSavedId(id);
    })();
  }, [id]);

  // ─── AUTO-GENERATE NAME ────────────────────────────────────────────────────
  const pathCode = form.process_steps.map(s => PROCESS_STEP_DEFS.find(p => p.id===s.id)?.code||'').join('-');
  const hasVA = !!form.value_addition;
  const hasProcess = form.process_steps.length > 0;

  // ─── AI SUGGEST ────────────────────────────────────────────────────────────
  const aiSuggest = async (field) => {
    setAiLoading(l => ({...l, [field]:true}));
    const context = {
      base_fabric: form.base_fabric?.base_fabric_name,
      process: pathCode,
      print_type: form.print_type,
      process_class: form.process_class,
      value_addition: form.value_addition,
      finish_width: form.finish_width,
      existing_name: form.item_name,
    };
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:400,
          messages:[{ role:'user', content:
            `You are a textile naming expert for Shreerang Trendz, a fabric converter business in Surat, India.
Context: ${JSON.stringify(context)}
Field to suggest: ${field}

${field === 'item_name' ? `Suggest a Tally stock item name for finish fabric. Format: "[Width] [Base Fabric] [Class] [Process/VA] Fabrics". Examples: "44\" Rayon Premium Foil Printed Fabrics", "58\" Cotton Mul Hakoba Fabrics", "44\" Capsule Rayon Digital Print Fabrics". Just the name, no explanation.` : ''}
${field === 'print_concept' ? 'Suggest 3 print concept options for this fabric type. Just comma-separated values.' : ''}
${field === 'ecom_name' ? 'Suggest a customer-friendly eCommerce display name for this fabric. Short and appealing.' : ''}
Respond with ONLY the suggestion, no explanation.`
          }]
        })
      });
      const data = await resp.json();
      const text = data.content?.[0]?.text?.trim();
      if (text) setF(field, text.replace(/^["']|["']$/g,''));
    } catch(e) { console.error('AI suggest:', e); }
    setAiLoading(l => ({...l, [field]:false}));
  };

  // ─── SAVE ──────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!form.item_name.trim()) { showToast('Item name (Tally name) is required', 'error'); return; }
    setSaving(true);
    const payload = {
      item_name: form.item_name.trim(),
      tally_item_name: form.item_name.trim(),
      finish_fabric_name: form.item_name.trim(),
      tally_group: form.tally_group,
      hsn_code: form.hsn_code,
      gst_rate: parseFloat(form.gst_rate)||5,
      ecom_enabled: form.ecom_enabled,
      ecom_visible: form.ecom_enabled,
      ecom_name: form.ecom_name_different ? form.ecom_name||null : null,
      // Process
      process_path: JSON.stringify(form.process_steps),
      process_steps: JSON.stringify(form.process_steps),
      process_code: pathCode,
      process_class: form.process_class,
      class: form.process_class,
      print_type: form.print_type||null,
      ink_type: form.ink_type_name||null,
      ink_type_name: form.ink_type_name||null,
      finish: form.finish_name||null,
      finish_name: form.finish_name||null,
      design_concept: form.print_concept||null,
      print_concept: form.print_concept||null,
      finish_width: form.finish_width,
      // VA
      value_addition: form.value_addition||null,
      work_thread: form.va_thread||null,
      va_thread: form.va_thread||null,
      va_concept: form.va_concept||null,
      va_placement: form.va_placement||null,
      fabric_movement: form.fabric_movement||null,
      // Base fabric
      base_fabric_id: form.base_fabric?.id||null,
      base_fabric_name: form.base_fabric?.base_fabric_name||form.base_fabric?.fabric_name||null,
      short_code: form.base_fabric?.short_code||null,
      // Status
      status: 'active', is_active: true,
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
    showToast(savedId ? 'Updated ✓' : 'Saved ✓');
    if (!isEdit) navigate(`/admin/fabric/finish-fabric-form/${nid}`, { replace: true });
  };

  // ─── PUSH TO TALLY ─────────────────────────────────────────────────────────
  const pushToTally = async () => {
    if (!savedId || !form.item_name.trim()) { showToast('Save first', 'error'); return; }
    setPushingTally(true);
    try {
      const xml = `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>All Masters</REPORTNAME></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"><STOCKITEM NAME="${form.item_name.trim()}" RESERVEDNAME=""><CATEGORY>${form.tally_group}</CATEGORY><BASEUNITS>Mtr</BASEUNITS><HSNDETAILS><HSNDETAIL><HSNCODE>${form.hsn_code}</HSNCODE><TAXABILITY>Taxable</TAXABILITY><GSTRATE>${form.gst_rate}</GSTRATE></HSNDETAIL></HSNDETAILS></STOCKITEM></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
      const res = await fetch('https://tally-test.shreerangtrendz.com', { method:'POST', body:xml, headers:{'Content-Type':'text/xml'}, signal:AbortSignal.timeout(10000) });
      const ok = res.ok;
      await supabase.from('finish_fabrics').update({ tally_synced_at: new Date().toISOString(), tally_sync_ok:ok, tally_synced:ok }).eq('id', savedId);
      await supabase.from('tally_sync_log').insert({ entity_type:'finish_fabric', entity_id:savedId, entity_name:form.item_name, action:'push', tally_ok:ok, synced_by:'manual' });
      showToast(ok ? '✓ Pushed to Tally' : 'Tally offline (logged)', ok ? 'success' : 'error');
    } catch { showToast('Tally tunnel offline', 'error'); }
    setPushingTally(false);
  };

  const dl = dropdowns;
  const manageBtn = (key, title) => (
    <button type="button" onClick={() => setManagingDropdown({key, title})} style={{ marginLeft:6, padding:'2px 7px', borderRadius:10, border:`1px solid ${C.border}`, background:'#fff', color:C.muted, fontSize:10, cursor:'pointer' }}>⚙</button>
  );

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'20px 16px', fontFamily:'Inter,sans-serif', color:C.text }}>
      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'10px 18px', borderRadius:10, background:toast.type==='error'?C.error:C.green, color:'#fff', fontSize:13, fontWeight:600, boxShadow:'0 4px 20px rgba(0,0,0,0.2)' }}>{toast.msg}</div>
      )}
      {/* Dropdown Manager Modal */}
      {managingDropdown && <ManageDropdown dropdownKey={managingDropdown.key} title={managingDropdown.title} onClose={() => setManagingDropdown(null)} />}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:18 }}>←</button>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:C.tealDark }}>{isEdit ? 'Edit Finish Fabric' : 'New Finish Fabric'}</h1>
          <p style={{ margin:0, fontSize:11, color:C.muted }}>Item Name = Tally stock item name · Pricing & designs added after saving</p>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {savedId && (
            <button onClick={pushToTally} disabled={pushingTally} style={{ padding:'8px 16px', borderRadius:8, border:`2px solid ${C.gold}`, background:'#fff', color:C.gold, fontSize:12, fontWeight:700, cursor:pushingTally?'default':'pointer' }}>
              {pushingTally ? '…' : '⇄ Push to Tally'}
            </button>
          )}
          <button onClick={() => navigate('/admin/settings/sku-formula')} style={{ padding:'8px 12px', borderRadius:8, border:`1.5px solid ${C.border}`, background:'#fff', color:C.muted, fontSize:11, cursor:'pointer' }}>⚙ SKU Formula</button>
        </div>
      </div>

      {/* ── SECTION 1: IDENTITY ─────────────────────────────────────────────── */}
      <div style={card(C.section1)}>
        <SectionHead num="1" title="Fabric Identity & Tally Name" color={C.section1} sub="This is the Tally stock item name — used in all vouchers and purchase/sales bills" />
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', marginBottom:4 }}>
            <label style={{ ...lbl, marginBottom:0 }}>Item Name (Tally Stock Item Name) *</label>
            <AISuggest label="AI Suggest Name" onSuggest={() => aiSuggest('item_name')} loading={aiLoading.item_name} />
          </div>
          <input value={form.item_name} onChange={e => setF('item_name', e.target.value)}
            placeholder="e.g. 44\" Rayon Premium Foil Printed Fabrics"
            style={{ ...inp, fontSize:15, fontWeight:600, borderColor:form.item_name?C.teal:C.border }} />
          <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>
            Auto-generated from: Finish Width + Base Fabric + Class + Process + Tags · 
            <span style={{ color:C.teal, marginLeft:4, fontFamily:'monospace', fontSize:11 }}>{form.item_name || '—'}</span>
          </div>
        </div>

        <div style={row('1fr 1fr 1fr')}>
          <div>
            <div style={{ display:'flex', alignItems:'center' }}>
              <label style={{ ...lbl, marginBottom:0 }}>Tally Group</label>
              {manageBtn('tally_group','Tally Groups')}
            </div>
            <DropField value={form.tally_group} onChange={v => setF('tally_group',v)} options={dl.tally_group||[]} />
          </div>
          <div>
            <label style={lbl}>HSN Code</label>
            <input value={form.hsn_code} onChange={e => setF('hsn_code',e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>GST Rate (%)</label>
            <input value={form.gst_rate} onChange={e => setF('gst_rate',e.target.value)} style={inp} type="number" />
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:13 }}>
            <input type="checkbox" checked={form.ecom_enabled} onChange={e => setF('ecom_enabled',e.target.checked)} style={{ width:15, height:15 }} />
            Show on eCommerce
          </label>
          <label style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:13 }}>
            <input type="checkbox" checked={form.ecom_name_different} onChange={e => setF('ecom_name_different',e.target.checked)} style={{ width:15, height:15 }} />
            Different eCommerce name
          </label>
        </div>
        {form.ecom_name_different && (
          <div style={{ marginTop:10 }}>
            <div style={{ display:'flex', alignItems:'center' }}>
              <label style={{ ...lbl, marginBottom:0 }}>eCommerce Display Name</label>
              <AISuggest label="Suggest" onSuggest={() => aiSuggest('ecom_name')} loading={aiLoading.ecom_name} />
            </div>
            <input value={form.ecom_name} onChange={e => setF('ecom_name',e.target.value)} placeholder="Customer-facing product name…" style={{ ...inp, marginTop:4 }} />
          </div>
        )}
      </div>

      {/* ── SECTION 2: PROCESS PATH ──────────────────────────────────────────── */}
      <div style={card(C.section2)}>
        <SectionHead num="2" title="Process Path & Specifications" color={C.section2} sub="From Process Execution Order sheet — defines fabric journey and drives cost calculation" />

        <ProcessBuilder steps={form.process_steps} onChange={v => setF('process_steps',v)} />

        <div style={{ marginTop:16, borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.muted, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            💰 Cost Per Process Step
            <span style={{ fontSize:10, fontWeight:500 }}>— specifications used for cost calculation</span>
          </div>
          <div style={row('1fr 1fr 1fr')}>
            <div>
              <div style={{ display:'flex', alignItems:'center' }}>
                <label style={{ ...lbl, marginBottom:0 }}>Class</label>
                {manageBtn('process_class','Class Options')}
              </div>
              <DropField value={form.process_class} onChange={v => setF('process_class',v)} options={dl.process_class||['Regular','Premium','Khadi']} />
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center' }}>
                <label style={{ ...lbl, marginBottom:0 }}>Print Type</label>
                {manageBtn('print_type','Print Types')}
              </div>
              <DropField value={form.print_type} onChange={v => setF('print_type',v)} options={dl.print_type||[]} allowOther />
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center' }}>
                <label style={{ ...lbl, marginBottom:0 }}>Finish Width</label>
                {manageBtn('finish_width','Finish Widths')}
              </div>
              <DropField value={form.finish_width} onChange={v => setF('finish_width',v)} options={dl.finish_width||[]} />
            </div>
          </div>
          <div style={row('1fr 1fr 1fr')}>
            <div>
              <div style={{ display:'flex', alignItems:'center' }}>
                <label style={{ ...lbl, marginBottom:0 }}>Ink Type</label>
                {manageBtn('ink_type','Ink Types')}
              </div>
              <DropField value={form.ink_type_name} onChange={v => setF('ink_type_name',v)} options={dl.ink_type||[]} allowOther />
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center' }}>
                <label style={{ ...lbl, marginBottom:0 }}>Finish Treatment</label>
                {manageBtn('finish_treatment','Finish Treatments')}
              </div>
              <DropField value={form.finish_name} onChange={v => setF('finish_name',v)} options={dl.finish_treatment||[]} allowOther />
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center' }}>
                <label style={{ ...lbl, marginBottom:0 }}>Print Concept</label>
                {manageBtn('print_concept','Print Concepts')}
              </div>
              <DropField value={form.print_concept} onChange={v => setF('print_concept',v)} options={dl.print_concept||[]} allowOther />
              <AISuggest label="Suggest" onSuggest={() => aiSuggest('print_concept')} loading={aiLoading.print_concept} />
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: VALUE ADDITION ────────────────────────────────────────── */}
      <div style={card(C.section3)}>
        <SectionHead num="3" title="Value Addition" color={C.section3} sub="From Value Addition sheet — Hakoba, Embroidery, Foil, Crush, Washing etc." />
        <div style={row('1fr 1fr')}>
          <div>
            <div style={{ display:'flex', alignItems:'center' }}>
              <label style={{ ...lbl, marginBottom:0 }}>Value Addition Type</label>
              {manageBtn('value_addition','Value Addition Types')}
            </div>
            <DropField value={form.value_addition} onChange={v => setF('value_addition',v)} options={dl.value_addition||[]} placeholder="— none —" allowOther />
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center' }}>
              <label style={{ ...lbl, marginBottom:0 }}>VA Placement</label>
              {manageBtn('va_placement','VA Placement Options')}
            </div>
            <DropField value={form.va_placement} onChange={v => setF('va_placement',v)} options={dl.va_placement||[]} placeholder="— none —" allowOther />
          </div>
        </div>

        {/* Thread and Concept — only for Hakoba/Embroidery */}
        {['Hakoba','Embroidered','Embroidery'].some(v => form.value_addition?.includes(v)) && (
          <div style={row('1fr 1fr')}>
            <div>
              <div style={{ display:'flex', alignItems:'center' }}>
                <label style={{ ...lbl, marginBottom:0 }}>Thread Type</label>
                {manageBtn('va_thread','Thread Types')}
              </div>
              <DropField value={form.va_thread} onChange={v => setF('va_thread',v)} options={dl.va_thread||[]} allowOther />
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center' }}>
                <label style={{ ...lbl, marginBottom:0 }}>VA Concept / Style</label>
                {manageBtn('va_concept','VA Concepts')}
              </div>
              <DropField value={form.va_concept} onChange={v => setF('va_concept',v)} options={dl.va_concept||[]} allowOther />
            </div>
          </div>
        )}

        {/* Washing concepts — only for Washing/Deca */}
        {['Washing','Deca'].some(v => form.value_addition?.includes(v)) && (
          <div style={{ ...row('1fr 1fr'), marginTop:0 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center' }}>
                <label style={{ ...lbl, marginBottom:0 }}>Wash Type</label>
                {manageBtn('va_concept_wash','Wash Types')}
              </div>
              <DropField value={form.va_concept} onChange={v => setF('va_concept',v)} options={dl.va_concept_wash||[]} allowOther />
            </div>
          </div>
        )}

        <div style={{ marginTop:12 }}>
          <div style={{ display:'flex', alignItems:'center' }}>
            <label style={{ ...lbl, marginBottom:0 }}>Fabric Movement</label>
            {manageBtn('FABRIC_MOVEMENT','Fabric Movement Options')}
          </div>
          <DropField value={form.fabric_movement} onChange={v => setF('fabric_movement',v)}
            options={(()=>{ try { const mv = []; (JSON.parse((dl.fabric_movement||[]).map?.(o=>o.value)||'[]')||[]).forEach(m=>mv.push(m)); return mv.length?mv:['Grey → Jobworker','Grey → Dyer → Printer','Grey → Schiffli → Dyer','Grey → RFD → Printer']; } catch { return ['Grey → Jobworker','Grey → Dyer → Printer','Grey → Schiffli → Dyer','Grey → RFD → Printer']; } })()}
            placeholder="— select movement path —" />
        </div>
      </div>

      {/* ── SECTION 4: BASE FABRIC ───────────────────────────────────────────── */}
      <div style={card(C.section4)}>
        <SectionHead num="4" title="Base Fabric Mapping" color={C.section4} sub="Optional — links grey fabric to this finish fabric · Required for eCommerce display · Can map anytime" />
        <BaseFabricSelector value={form.base_fabric} onChange={v => setF('base_fabric',v)} />
        <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>
          Base fabric specs (GSM, construction, yarn, transparency, handfeel) will be used for eCommerce product pages.
          Once Tally sync is done, AI will suggest base fabric mappings for you to approve.
        </div>
      </div>

      {/* ── SKU PREVIEW ─────────────────────────────────────────────────────── */}
      {savedId && (
        <div style={{ background:C.tealLight, borderRadius:10, padding:'10px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>SKU:</span>
          <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:14, color:C.tealDark }}>
            {(() => {
              try {
                const f = JSON.parse(skuFormula||'{}');
                const parts = f.parts||['width','short_code','process_path'];
                const sep = f.separator||'-';
                const map = {
                  width: form.finish_width?.replace(/[^0-9]/g,''),
                  short_code: form.base_fabric?.short_code||'',
                  process_path: pathCode,
                  tag: form.process_class==='Regular'?'':form.process_class?.slice(0,3).toUpperCase(),
                  va_code: form.value_addition?.slice(0,3).toUpperCase()||'',
                };
                return parts.map(p=>map[p]||'').filter(Boolean).join(sep).toUpperCase() || '—';
              } catch { return '—'; }
            })()}
          </span>
          <button onClick={() => navigate('/admin/settings/sku-formula')} style={{ marginLeft:'auto', padding:'4px 10px', borderRadius:7, border:`1px solid ${C.teal}`, background:'#fff', color:C.teal, fontSize:11, cursor:'pointer' }}>Edit Formula</button>
        </div>
      )}

      {/* ── SAVE ─────────────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={save} disabled={saving} style={{
          flex:1, padding:'13px', borderRadius:10, border:'none',
          background:saving?C.border:C.teal, color:'#fff', fontSize:14, fontWeight:700, cursor:saving?'default':'pointer',
        }}>{saving ? 'Saving…' : savedId ? '✓ Update Finish Fabric' : '✓ Save Finish Fabric'}</button>
        {savedId && (
          <button onClick={pushToTally} disabled={pushingTally} style={{
            padding:'13px 20px', borderRadius:10, border:`2px solid ${C.gold}`,
            background:'#fff', color:C.gold, fontSize:13, fontWeight:700, cursor:pushingTally?'default':'pointer',
          }}>{pushingTally ? '…' : '⇄ Push to Tally'}</button>
        )}
        <button onClick={() => navigate('/admin/fabric/finish')} style={{
          padding:'13px 16px', borderRadius:10, border:`2px solid ${C.border}`,
          background:'#fff', color:C.text, fontSize:13, cursor:'pointer',
        }}>View All</button>
      </div>

      {/* ── NOTE ─────────────────────────────────────────────────────────────── */}
      <div style={{ marginTop:14, padding:'10px 14px', background:C.goldLight, borderRadius:9, fontSize:12, color:C.tealDark, border:`1px solid ${C.gold}33` }}>
        💡 <strong>Pricing, Design Numbers, Color Numbers & Design Images</strong> are added separately after saving this fabric name — go to the fabric record and click "Add Designs & Pricing".
      </div>
    </div>
  );
}
