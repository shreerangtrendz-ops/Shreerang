import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import {
  PROCESS_STEPS, FINISH_WIDTHS, FABRIC_TAGS, TALLY_GROUPS,
  buildFinishFabricName, buildFinishFabricSKU, processPathLabel,
} from '@/services/FinishFabricService';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const C = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6',
  gold:'#D4920A', surface:'#fff', surface2:'#F8FBFA',
  border:'#D6EEE9', text:'#0D2E2B', muted:'#4A7A74',
  error:'#D93A3A', green:'#1E9E5A', orange:'#C86020',
  blue:'#2563EB', purple:'#7C3AED',
};

const FABRIC_CATEGORIES = [
  { value:'mill_print',  label:'Mill Print',        color:'#f59e0b', icon:'🖨' },
  { value:'digital',     label:'Digital Print',     color:'#06b6d4', icon:'💻' },
  { value:'embroidery',  label:'Embroidery',        color:'#ec4899', icon:'🧵' },
  { value:'schiffli',    label:'Schiffli / Hakoba', color:'#8b5cf6', icon:'🪡' },
  { value:'solid_dyed',  label:'Solid Dyed',        color:'#10b981', icon:'🎨' },
  { value:'fancy',       label:'Fancy Finish',      color:'#f97316', icon:'✨' },
];

const PRINT_TYPES = [
  'Screen Print', 'Digital Print', 'Discharge Print', 'Pigment Print',
  'Foil Print', 'Block Print', 'Acid Print', 'Laser Print',
];

const labelStyle = { fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase',
  letterSpacing:0.8, marginBottom:5, display:'block' };
const inputStyle = { width:'100%', padding:'8px 11px', border:`1.5px solid ${C.border}`,
  borderRadius:8, fontSize:13, color:C.text, outline:'none', boxSizing:'border-box', background:'#fff' };
const cardStyle = { background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:16 };

// ─── STAGE BAR ──────────────────────────────────────────────────────────────
function StageBar({ stage, savedId }) {
  const stages = [
    { num:1, label:'Stage 1 — Name & Identity',    sub:'Category · Base Fabric · Process Path · Tally Push' },
    { num:2, label:'Stage 2 — Designs & Costing',  sub:'Design No · Jobworker · Width · Pricing' },
  ];
  return (
    <div style={{ display:'flex', gap:4, background:'rgba(0,0,0,0.06)', borderRadius:12, padding:5, marginBottom:20 }}>
      {stages.map(s => {
        const active = stage === s.num, done = stage > s.num, locked = s.num === 2 && !savedId;
        return (
          <div key={s.num} style={{
            flex:1, padding:'8px 14px', borderRadius:9, cursor: locked ? 'not-allowed' : 'default',
            background: active ? C.teal : done ? C.tealLight : 'transparent',
            opacity: locked ? 0.4 : 1, transition:'all 0.2s',
          }}>
            <div style={{ fontSize:11, fontWeight:700, color: active ? '#fff' : C.muted }}>
              {done ? '✓ ' : ''}{s.label}
            </div>
            <div style={{ fontSize:10, color: active ? 'rgba(255,255,255,0.75)' : C.muted, marginTop:1 }}>{s.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── PROCESS PATH BUILDER ────────────────────────────────────────────────────
function ProcessPathBuilder({ value, onChange }) {
  const toggle = (stepId) => {
    const exists = value.find(s => s.id === stepId);
    if (exists) onChange(value.filter(s => s.id !== stepId));
    else onChange([...value, { id: stepId }]);
  };
  const moveUp = (idx) => {
    if (idx === 0) return;
    const arr = [...value];
    [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
    onChange(arr);
  };
  const moveDown = (idx) => {
    if (idx === value.length - 1) return;
    const arr = [...value];
    [arr[idx], arr[idx+1]] = [arr[idx+1], arr[idx]];
    onChange(arr);
  };

  return (
    <div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
        {PROCESS_STEPS.map(step => {
          const sel = value.find(s => s.id === step.id);
          return (
            <button key={step.id} onClick={() => toggle(step.id)} type="button" style={{
              padding:'5px 11px', borderRadius:20, border:`1.5px solid ${sel ? step.color : C.border}`,
              background: sel ? step.color : '#fff', color: sel ? '#fff' : C.text,
              fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s',
            }}>
              {step.label}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:C.muted, fontWeight:700 }}>ORDER:</span>
          {value.map((s, idx) => {
            const step = PROCESS_STEPS.find(p => p.id === s.id);
            if (!step) return null;
            return (
              <div key={s.id} style={{
                display:'flex', alignItems:'center', gap:4, padding:'3px 8px',
                background:step.color, borderRadius:6, color:'#fff', fontSize:12,
              }}>
                <span>{step.code}</span>
                <span style={{ fontSize:10, opacity:0.8 }}>{step.label}</span>
                <button type="button" onClick={() => moveUp(idx)} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', padding:'0 2px', fontSize:10 }}>▲</button>
                <button type="button" onClick={() => moveDown(idx)} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', padding:'0 2px', fontSize:10 }}>▼</button>
                <button type="button" onClick={() => toggle(s.id)} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', padding:'0 2px', fontSize:10 }}>✕</button>
              </div>
            );
          })}
          <span style={{ fontSize:11, color:C.muted }}>→ Path code: <strong>{processPathLabel(value)}</strong></span>
        </div>
      )}
    </div>
  );
}

// ─── BASE FABRIC SELECTOR ────────────────────────────────────────────────────
function BaseFabricSelector({ value, onChange }) {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchOptions = useCallback(async (q) => {
    setLoading(true);
    const query = supabase.from('base_fabrics').select('id, fabric_name, supplier, gsm').order('fabric_name');
    if (q) query.ilike('fabric_name', `%${q}%`);
    const { data } = await query.limit(30);
    setOptions(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchOptions(search);
  }, [open, search, fetchOptions]);

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        ...inputStyle, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <span style={{ color: value?.fabric_name ? C.text : C.muted }}>
          {value?.fabric_name || 'Select base fabric (optional)'}
        </span>
        <span style={{ fontSize:10 }}>▼</span>
      </div>
      {open && (
        <div style={{
          position:'absolute', top:'100%', left:0, right:0, zIndex:50, background:'#fff',
          border:`1.5px solid ${C.border}`, borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.12)',
          maxHeight:240, overflow:'auto', marginTop:4,
        }}>
          <div style={{ padding:8, borderBottom:`1px solid ${C.border}` }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search base fabric..."
              style={{ ...inputStyle, padding:'6px 10px' }}
            />
          </div>
          <div
            onClick={() => { onChange(null); setOpen(false); }}
            style={{ padding:'8px 12px', fontSize:12, color:C.muted, cursor:'pointer', borderBottom:`1px solid ${C.border}` }}
          >
            ✕ Clear selection
          </div>
          {loading ? (
            <div style={{ padding:12, fontSize:12, color:C.muted, textAlign:'center' }}>Loading...</div>
          ) : options.length === 0 ? (
            <div style={{ padding:12, fontSize:12, color:C.muted, textAlign:'center' }}>No base fabrics found</div>
          ) : options.map(opt => (
            <div key={opt.id} onClick={() => { onChange(opt); setOpen(false); }} style={{
              padding:'9px 12px', fontSize:13, cursor:'pointer', borderBottom:`1px solid ${C.border}`,
              background: value?.id === opt.id ? C.tealLight : '#fff',
            }}>
              <div style={{ fontWeight:600, color:C.text }}>{opt.fabric_name}</div>
              {(opt.supplier || opt.gsm) && (
                <div style={{ fontSize:11, color:C.muted }}>{[opt.supplier, opt.gsm && `${opt.gsm} GSM`].filter(Boolean).join(' · ')}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DESIGN VARIANT ROW ───────────────────────────────────────────────────────
function DesignRow({ design, onChange, onRemove, isNew }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr 80px 80px 36px', gap:8, alignItems:'end', padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
      <div>
        <label style={labelStyle}>Design No</label>
        <input value={design.design_no || ''} onChange={e => onChange({ ...design, design_no: e.target.value })}
          placeholder="e.g. D001, MAIN" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Jobworker</label>
        <input value={design.jobworker_name || ''} onChange={e => onChange({ ...design, jobworker_name: e.target.value })}
          placeholder="Job worker name" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Print Type</label>
        <select value={design.print_type || ''} onChange={e => onChange({ ...design, print_type: e.target.value })} style={inputStyle}>
          <option value="">— select —</option>
          {PRINT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Width</label>
        <select value={design.width || ''} onChange={e => onChange({ ...design, width: e.target.value })} style={inputStyle}>
          <option value="">—</option>
          {FINISH_WIDTHS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Notes</label>
        <input value={design.notes || ''} onChange={e => onChange({ ...design, notes: e.target.value })}
          placeholder="Optional notes" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Lump ₹/m</label>
        <input type="number" value={design.lump_price || ''} onChange={e => onChange({ ...design, lump_price: parseFloat(e.target.value) || null })}
          placeholder="0.00" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Cut Pack ₹</label>
        <input type="number" value={design.cut_pack_price || ''} onChange={e => onChange({ ...design, cut_pack_price: parseFloat(e.target.value) || null })}
          placeholder="0.00" style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>&nbsp;</label>
        <button onClick={onRemove} type="button" style={{
          width:36, height:36, borderRadius:8, border:`1.5px solid ${C.error}`,
          background:'#fff', color:C.error, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
        }}>✕</button>
      </div>
    </div>
  );
}

// ─── MAIN FORM ────────────────────────────────────────────────────────────────
export default function FinishFabricForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;

  const [stage, setStage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [pushingTally, setPushingTally] = useState(false);
  const [savedId, setSavedId] = useState(id || null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type='success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  // Stage 1 fields
  const [form, setForm] = useState({
    item_name: '',
    fabric_category: searchParams.get('category') || 'mill_print',
    tag: 'Regular',
    base_fabric: null,
    process_path_steps: [],
    width: '44',
    hsn_code: '5208',
    tally_group: 'Finish Fabrics',
    description: '',
    is_active: true,
    ecom_enabled: false,
    ecom_name_different: false,
    ecom_name: '',
    ecom_description: '',
  });

  // Stage 2 designs
  const [designs, setDesigns] = useState([]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Load existing record
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from('finish_fabrics').select('*').eq('id', id).single();
      if (data) {
        let steps = [];
        try { steps = typeof data.process_path === 'string' ? JSON.parse(data.process_path) : (data.process_path || []); } catch {}
        setForm({
          item_name: data.item_name || data.tally_item_name || '',
          fabric_category: data.fabric_category || 'mill_print',
          tag: data.tag || 'Regular',
          base_fabric: data.base_fabric_id ? { id: data.base_fabric_id, fabric_name: data.base_fabric_name || '' } : null,
          process_path_steps: Array.isArray(steps) ? steps : [],
          width: data.finish_width || '44',
          hsn_code: data.hsn_code || '5208',
          tally_group: data.tally_group || 'Finish Fabrics',
          description: data.description || '',
          is_active: data.is_active !== false,
          ecom_enabled: !!(data.ecom_enabled || data.ecom_visible),
          ecom_name_different: !!(data.ecom_name),
          ecom_name: data.ecom_name || '',
          ecom_description: data.ecom_description || '',
        });
        setSavedId(id);
      }
      // Load designs
      const { data: ddata } = await supabase.from('finish_fabric_designs').select('*').eq('finish_fabric_id', id).order('design_no');
      if (ddata) setDesigns(ddata);
    })();
  }, [id]);

  // Save Stage 1
  const saveStage1 = async () => {
    if (!form.item_name.trim()) { showToast('Item name (Tally name) is required', 'error'); return; }
    setSaving(true);
    const payload = {
      item_name: form.item_name.trim(),
      tally_item_name: form.item_name.trim(),
      fabric_category: form.fabric_category,
      tag: form.tag,
      base_fabric_id: form.base_fabric?.id || null,
      base_fabric_name: form.base_fabric?.fabric_name || null,
      process_path: JSON.stringify(form.process_path_steps),
      finish_width: form.width,
      hsn_code: form.hsn_code,
      tally_group: form.tally_group,
      description: form.description,
      is_active: form.is_active,
      ecom_enabled: form.ecom_enabled,
      ecom_visible: form.ecom_enabled,
      ecom_name: form.ecom_name_different ? form.ecom_name : null,
      ecom_description: form.ecom_description || null,
      updated_at: new Date().toISOString(),
    };
    let result;
    if (savedId) {
      result = await supabase.from('finish_fabrics').update(payload).eq('id', savedId).select().single();
    } else {
      result = await supabase.from('finish_fabrics').insert({ ...payload, created_at: new Date().toISOString() }).select().single();
    }
    setSaving(false);
    if (result.error) { showToast(`Save failed: ${result.error.message}`, 'error'); return; }
    const newId = result.data.id;
    setSavedId(newId);
    showToast('Stage 1 saved ✓');
    setStage(2);
    if (!isEdit) navigate(`/admin/fabric/finish-fabric-form/${newId}`, { replace: true });
  };

  // Push to Tally
  const pushToTally = async () => {
    if (!savedId) { showToast('Save first before pushing to Tally', 'error'); return; }
    if (!form.item_name.trim()) { showToast('Item name required', 'error'); return; }
    setPushingTally(true);
    try {
      const tallyXml = `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>All Masters</REPORTNAME></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"><STOCKITEM NAME="${form.item_name.trim()}" RESERVEDNAME=""><CATEGORY>${form.tally_group}</CATEGORY><BASEUNITS>Mtr</BASEUNITS><HSNDETAILS><HSNDETAIL><HSNCODE>${form.hsn_code}</HSNCODE><TAXABILITY>Taxable</TAXABILITY><GSTRATE>5</GSTRATE></HSNDETAIL></HSNDETAILS></STOCKITEM></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
      const res = await fetch('https://tally-test.shreerangtrendz.com', { method:'POST', body:tallyXml, headers:{ 'Content-Type':'text/xml' }, signal: AbortSignal.timeout(10000) });
      const ok = res.ok;
      await supabase.from('finish_fabrics').update({ tally_synced_at: new Date().toISOString(), tally_sync_ok: ok, tally_synced: ok }).eq('id', savedId);
      await supabase.from('tally_sync_log').insert({ entity_type:'finish_fabric', entity_id:savedId, entity_name:form.item_name, action:'create', tally_ok:ok, tally_error: ok ? null : `HTTP ${res.status}`, synced_by:'manual' });
      showToast(ok ? 'Pushed to Tally ✓' : 'Tally push failed (offline?)', ok ? 'success' : 'error');
    } catch (e) {
      await supabase.from('finish_fabrics').update({ tally_sync_ok: false }).eq('id', savedId);
      showToast('Tally offline / tunnel down', 'error');
    }
    setPushingTally(false);
  };

  // Stage 2: save designs
  const saveDesigns = async () => {
    if (!savedId) return;
    setSaving(true);
    for (const d of designs) {
      const payload = { finish_fabric_id: savedId, design_no: d.design_no, jobworker_name: d.jobworker_name || null, print_type: d.print_type || null, width: d.width || null, lump_price: d.lump_price || null, cut_pack_price: d.cut_pack_price || null, notes: d.notes || null, is_active: true, updated_at: new Date().toISOString() };
      if (d.id && !d._new) {
        await supabase.from('finish_fabric_designs').update(payload).eq('id', d.id);
      } else {
        await supabase.from('finish_fabric_designs').upsert({ ...payload, created_at: new Date().toISOString() }, { onConflict:'finish_fabric_id,design_no' });
      }
    }
    setSaving(false);
    showToast('Designs saved ✓');
  };

  const addDesign = () => setDesigns(d => [...d, { _new:true, _key: Date.now(), design_no:'', jobworker_name:'', print_type:'', width:form.width, lump_price:null, cut_pack_price:null, notes:'' }]);
  const updateDesign = (i, v) => setDesigns(d => d.map((x, j) => j === i ? v : x));
  const removeDesign = (i) => setDesigns(d => d.filter((_, j) => j !== i));

  const catObj = FABRIC_CATEGORIES.find(c => c.value === form.fabric_category);

  return (
    <div style={{ maxWidth:860, margin:'0 auto', padding:'20px 16px', fontFamily:'Inter, sans-serif', color:C.text }}>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'10px 18px', borderRadius:10, background: toast.type==='error' ? C.error : C.green, color:'#fff', fontSize:13, fontWeight:600, boxShadow:'0 4px 20px rgba(0,0,0,0.18)' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:18 }}>←</button>
          <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:C.tealDark }}>
            {isEdit ? 'Edit Finish Fabric' : 'New Finish Fabric'}
          </h1>
          {catObj && (
            <span style={{ padding:'3px 10px', borderRadius:20, background:catObj.color, color:'#fff', fontSize:11, fontWeight:700 }}>
              {catObj.icon} {catObj.label}
            </span>
          )}
        </div>
        <p style={{ margin:0, fontSize:12, color:C.muted }}>
          Item name = Tally stock item name. One fabric name → multiple designs in Stage 2.
        </p>
      </div>

      <StageBar stage={stage} savedId={savedId} />

      {/* ─── STAGE 1 ─────────────────────────────────────────────────────────── */}
      {stage === 1 && (
        <>
          {/* Category */}
          <div style={cardStyle}>
            <label style={{ ...labelStyle, fontSize:12, marginBottom:10 }}>Fabric Category</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {FABRIC_CATEGORIES.map(cat => (
                <button key={cat.value} type="button" onClick={() => set('fabric_category', cat.value)} style={{
                  padding:'8px 16px', borderRadius:24, border:`2px solid ${form.fabric_category === cat.value ? cat.color : C.border}`,
                  background: form.fabric_category === cat.value ? cat.color : '#fff',
                  color: form.fabric_category === cat.value ? '#fff' : C.text,
                  fontWeight:700, fontSize:13, cursor:'pointer', transition:'all 0.15s',
                }}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tally Name + Tag */}
          <div style={cardStyle}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:12, marginBottom:16 }}>
              <div>
                <label style={labelStyle}>Item Name (Tally Stock Item Name) *</label>
                <input
                  value={form.item_name}
                  onChange={e => { set('item_name', e.target.value); if (!form.ecom_name_different) set('ecom_name', e.target.value); }}
                  placeholder="Exactly as it will appear in Tally Prime..."
                  style={{ ...inputStyle, fontSize:14, fontWeight:600, borderColor: form.item_name ? C.teal : C.border }}
                />
                <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
                  This name = Tally stock item name. Used for all Tally vouchers and stock reports.
                </div>
              </div>
              <div style={{ minWidth:140 }}>
                <label style={labelStyle}>Tag / Variant</label>
                <select value={form.tag} onChange={e => set('tag', e.target.value)} style={inputStyle}>
                  {FABRIC_TAGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>

            {/* eCommerce name toggle */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:C.tealLight, borderRadius:8, marginBottom: form.ecom_name_different ? 12 : 0 }}>
              <input type="checkbox" id="ecom-diff" checked={form.ecom_name_different}
                onChange={e => { set('ecom_name_different', e.target.checked); if (!e.target.checked) set('ecom_name', ''); }}
                style={{ width:16, height:16, cursor:'pointer' }} />
              <label htmlFor="ecom-diff" style={{ fontSize:13, color:C.tealDark, fontWeight:600, cursor:'pointer' }}>
                Use a different name for eCommerce / SKU
              </label>
            </div>
            {form.ecom_name_different && (
              <div style={{ marginTop:8 }}>
                <label style={labelStyle}>eCommerce Display Name</label>
                <input value={form.ecom_name} onChange={e => set('ecom_name', e.target.value)}
                  placeholder="Customer-facing product name..." style={inputStyle} />
              </div>
            )}
          </div>

          {/* Base Fabric + Process Path */}
          <div style={cardStyle}>
            <div style={{ marginBottom:16 }}>
              <label style={labelStyle}>Base Fabric (Optional — map grey fabric to this finish fabric)</label>
              <BaseFabricSelector value={form.base_fabric} onChange={v => set('base_fabric', v)} />
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
                After syncing Tally, AI will suggest base fabric mappings for you to approve.
              </div>
            </div>

            <div>
              <label style={labelStyle}>Process Path (fabric journey — select & reorder steps)</label>
              <ProcessPathBuilder value={form.process_path_steps} onChange={v => set('process_path_steps', v)} />
            </div>
          </div>

          {/* Specs */}
          <div style={cardStyle}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <div>
                <label style={labelStyle}>Default Width</label>
                <select value={form.width} onChange={e => set('width', e.target.value)} style={inputStyle}>
                  {FINISH_WIDTHS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>HSN Code</label>
                <input value={form.hsn_code} onChange={e => set('hsn_code', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tally Stock Group</label>
                <select value={form.tally_group} onChange={e => set('tally_group', e.target.value)} style={inputStyle}>
                  {TALLY_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop:12 }}>
              <label style={labelStyle}>Description / Notes</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={2} placeholder="Internal notes..." style={{ ...inputStyle, resize:'vertical' }} />
            </div>
            <div style={{ display:'flex', gap:16, marginTop:12 }}>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} style={{ width:16, height:16 }} />
                <span>Active</span>
              </label>
              <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
                <input type="checkbox" checked={form.ecom_enabled} onChange={e => set('ecom_enabled', e.target.checked)} style={{ width:16, height:16 }} />
                <span>Show on eCommerce</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:10, marginTop:8 }}>
            <button onClick={saveStage1} disabled={saving} style={{
              flex:1, padding:'12px 20px', borderRadius:10, border:'none',
              background: saving ? C.border : C.teal, color:'#fff', fontSize:14, fontWeight:700, cursor: saving ? 'default' : 'pointer',
            }}>
              {saving ? 'Saving...' : savedId ? 'Update & Continue to Stage 2 →' : 'Save & Continue to Stage 2 →'}
            </button>
            {savedId && (
              <button onClick={pushToTally} disabled={pushingTally} style={{
                padding:'12px 20px', borderRadius:10, border:`2px solid ${C.gold}`,
                background:'#fff', color:C.gold, fontSize:13, fontWeight:700, cursor: pushingTally ? 'default' : 'pointer',
              }}>
                {pushingTally ? 'Pushing...' : '⇄ Push to Tally'}
              </button>
            )}
          </div>
        </>
      )}

      {/* ─── STAGE 2 ─────────────────────────────────────────────────────────── */}
      {stage === 2 && savedId && (
        <>
          <div style={{ ...cardStyle, background:C.tealLight, borderColor:C.teal }}>
            <div style={{ fontSize:13, color:C.tealDark }}>
              <strong>{form.item_name}</strong>
              {form.tag !== 'Regular' && <span style={{ marginLeft:8, padding:'2px 8px', borderRadius:12, background:C.teal, color:'#fff', fontSize:11 }}>{form.tag}</span>}
              <span style={{ marginLeft:12, color:C.muted, fontSize:12 }}>
                {catObj?.icon} {catObj?.label}
                {form.base_fabric && ` · Base: ${form.base_fabric.fabric_name}`}
                {form.process_path_steps.length > 0 && ` · Path: ${processPathLabel(form.process_path_steps)}`}
              </span>
            </div>
            <button onClick={() => setStage(1)} style={{ marginTop:6, background:'none', border:'none', color:C.teal, cursor:'pointer', fontSize:12, fontWeight:700, padding:0 }}>
              ← Edit Stage 1
            </button>
          </div>

          <div style={cardStyle}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div>
                <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:C.tealDark }}>Design Variants</h3>
                <p style={{ margin:'3px 0 0', fontSize:12, color:C.muted }}>
                  One fabric name can have many designs. Each design has its own jobworker, print type, width and pricing.
                </p>
              </div>
              <button onClick={addDesign} type="button" style={{
                padding:'8px 16px', borderRadius:8, border:`2px solid ${C.teal}`,
                background:C.teal, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
              }}>
                + Add Design
              </button>
            </div>

            {designs.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px 0', color:C.muted }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🎨</div>
                <div style={{ fontSize:13 }}>No designs yet. Click "+ Add Design" to add the first design variant.</div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr 80px 80px 36px', gap:8, paddingBottom:6, borderBottom:`2px solid ${C.border}` }}>
                  {['Design No','Jobworker','Print Type','Width','Notes','Lump ₹/m','Cut Pack',''].map(h => (
                    <div key={h} style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase' }}>{h}</div>
                  ))}
                </div>
                {designs.map((d, i) => (
                  <DesignRow key={d.id || d._key} design={d}
                    onChange={v => updateDesign(i, v)}
                    onRemove={() => removeDesign(i)} />
                ))}
              </>
            )}
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={saveDesigns} disabled={saving || designs.length === 0} style={{
              flex:1, padding:'12px 20px', borderRadius:10, border:'none',
              background: (saving || designs.length === 0) ? C.border : C.teal,
              color:'#fff', fontSize:14, fontWeight:700, cursor: saving ? 'default' : 'pointer',
            }}>
              {saving ? 'Saving...' : 'Save Designs ✓'}
            </button>
            <button onClick={() => navigate('/admin/fabric/finish-fabric-form')} style={{
              padding:'12px 20px', borderRadius:10, border:`2px solid ${C.border}`,
              background:'#fff', color:C.text, fontSize:13, fontWeight:700, cursor:'pointer',
            }}>
              + New Fabric
            </button>
            <button onClick={pushToTally} disabled={pushingTally} style={{
              padding:'12px 20px', borderRadius:10, border:`2px solid ${C.gold}`,
              background:'#fff', color:C.gold, fontSize:13, fontWeight:700, cursor: pushingTally ? 'default' : 'pointer',
            }}>
              {pushingTally ? '...' : '⇄ Push to Tally'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
