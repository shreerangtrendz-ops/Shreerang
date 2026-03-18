import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

const C = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6',
  gold:'#D4920A', border:'#D6EEE9', text:'#0D2E2B', muted:'#4A7A74',
  error:'#D93A3A', green:'#1E9E5A', surface:'#fff',
};
const inp = { width:'100%', padding:'8px 11px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, color:C.text, outline:'none', boxSizing:'border-box', background:'#fff' };
const lbl = { fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:5, display:'block' };
const card = { background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:16 };

const ALL_PARTS = [
  { id:'width',        label:'Width',         example:'44',      desc:'Fabric finish width (numeric only)' },
  { id:'short_code',   label:'Short Code',    example:'RAY',     desc:'Short code from Base Fabric master' },
  { id:'process_path', label:'Process Path',  example:'DP',      desc:'Process path code (e.g. GY-RF-DP)' },
  { id:'tag',          label:'Tag',           example:'PRM',     desc:'Fabric tag (omit Regular by default)' },
  { id:'va_code',      label:'VA Code',       example:'EMB',     desc:'Value addition code (Embroidered=EMB, Hakoba=HK etc.)' },
  { id:'design_no',    label:'Design No',     example:'D001',    desc:'Design number / color number' },
];

const VA_CODE_MAP = {
  'Hakoba (Sch-Rl)':'HK','Embroidered':'EMB','Handwork':'HW','Foil/Gold/Glitter':'FOIL',
  'Crush/Pleated':'CRH','Deca/Washing':'DEC','Washing':'WSH','Schiffli Cutwork':'SCH',
  'Sequence Work':'SEQ','Gota Patti':'GP',
};

function computeExample(parts, sep, uppercase, omitRegTag) {
  const map = { width:'44', short_code:'RAY', process_path:'DP', tag: omitRegTag ? '' : 'REG', va_code:'EMB', design_no:'D001' };
  const res = parts.map(p => map[p]||'').filter(Boolean).join(sep);
  return uppercase ? res.toUpperCase() : res;
}

export default function SKUFormulaSettings() {
  const navigate = useNavigate();
  const [parts, setParts] = useState(['width','short_code','process_path','design_no']);
  const [sep, setSep] = useState('-');
  const [uppercase, setUppercase] = useState(true);
  const [omitRegTag, setOmitRegTag] = useState(true);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  // Editable lists
  const [vaOpts, setVaOpts] = useState([]);
  const [movementOpts, setMovementOpts] = useState([]);
  const [newVa, setNewVa] = useState('');
  const [newMovement, setNewMovement] = useState('');

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('admin_settings').select('key_name,key_value')
        .in('key_name',['SKU_FORMULA','VA_OPTIONS','FABRIC_MOVEMENT_OPTIONS']);
      if (!data) return;
      const map = Object.fromEntries(data.map(r=>[r.key_name,r.key_value]));
      if (map.SKU_FORMULA) {
        try {
          const f = JSON.parse(map.SKU_FORMULA);
          if (f.parts) setParts(f.parts);
          if (f.separator) setSep(f.separator);
          if (f.uppercase!==undefined) setUppercase(f.uppercase);
          if (f.omit_regular_tag!==undefined) setOmitRegTag(f.omit_regular_tag);
        } catch {}
      }
      if (map.VA_OPTIONS) { try { setVaOpts(JSON.parse(map.VA_OPTIONS)); } catch {} }
      if (map.FABRIC_MOVEMENT_OPTIONS) { try { setMovementOpts(JSON.parse(map.FABRIC_MOVEMENT_OPTIONS)); } catch {} }
    })();
  }, []);

  const togglePart = (pid) => {
    if (parts.includes(pid)) setParts(parts.filter(p=>p!==pid));
    else setParts([...parts, pid]);
  };
  const movePart = (idx, dir) => {
    const arr = [...parts];
    const to = idx+dir;
    if (to<0||to>=arr.length) return;
    [arr[idx],arr[to]]=[arr[to],arr[idx]];
    setParts(arr);
  };

  const save = async () => {
    setSaving(true);
    const formula = JSON.stringify({ parts, separator:sep, uppercase, omit_regular_tag:omitRegTag });
    const upserts = [
      { key_name:'SKU_FORMULA', key_value:formula, description:'SKU formula for finish fabric designs', updated_at:new Date().toISOString() },
      { key_name:'VA_OPTIONS', key_value:JSON.stringify(vaOpts), description:'Value addition options', updated_at:new Date().toISOString() },
      { key_name:'FABRIC_MOVEMENT_OPTIONS', key_value:JSON.stringify(movementOpts), description:'Fabric movement path options', updated_at:new Date().toISOString() },
    ];
    for (const u of upserts) {
      await supabase.from('admin_settings').upsert(u, { onConflict:'key_name' });
    }
    setSaving(false);
    showToast('Settings saved ✓');
  };

  const example = computeExample(parts, sep, uppercase, omitRegTag);

  return (
    <div style={{ maxWidth:760, margin:'0 auto', padding:'20px 16px', fontFamily:'Inter,sans-serif', color:C.text }}>
      {toast && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'10px 18px', borderRadius:10,
          background: toast.type==='error' ? C.error : C.green, color:'#fff', fontSize:13, fontWeight:600,
          boxShadow:'0 4px 20px rgba(0,0,0,0.18)' }}>{toast.msg}</div>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <button onClick={()=>navigate(-1)} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:18, padding:0 }}>←</button>
        <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:C.tealDark }}>SKU Formula & Settings</h1>
      </div>

      {/* Live preview */}
      <div style={{ ...card, background:C.tealLight, borderColor:C.teal, marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:6 }}>LIVE EXAMPLE SKU</div>
        <div style={{ fontFamily:'monospace', fontSize:28, fontWeight:800, color:C.tealDark, letterSpacing:2 }}>{example || '—'}</div>
        <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>Parts: {parts.join(` ${sep} `)} · Separator: "{sep}" · {uppercase ? 'UPPERCASE' : 'lowercase'} · {omitRegTag ? 'Regular tag omitted' : 'Regular tag included'}</div>
      </div>

      {/* Formula builder */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:800, color:C.tealDark, marginBottom:14 }}>📐 SKU Parts (select & reorder)</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
          {ALL_PARTS.map(p => (
            <button key={p.id} onClick={()=>togglePart(p.id)} type="button" style={{
              padding:'6px 14px', borderRadius:20, border:`2px solid ${parts.includes(p.id) ? C.teal : C.border}`,
              background: parts.includes(p.id) ? C.tealLight : '#fff',
              color: parts.includes(p.id) ? C.tealDark : C.muted,
              fontWeight:700, fontSize:12, cursor:'pointer',
            }}>
              {p.label} <span style={{ opacity:0.6, fontWeight:400, fontSize:10 }}>({p.example})</span>
            </button>
          ))}
        </div>

        {/* Part ordering */}
        {parts.length>0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>ORDER (drag to reorder):</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {parts.map((pid, i) => {
                const p = ALL_PARTS.find(x=>x.id===pid);
                return (
                  <div key={pid} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', background:C.teal, borderRadius:7, color:'#fff' }}>
                    <span style={{ fontSize:12, fontWeight:700 }}>{i+1}. {p?.label}</span>
                    <button type="button" onClick={()=>movePart(i,-1)} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.8)',cursor:'pointer',padding:'0 2px',fontSize:10 }}>▲</button>
                    <button type="button" onClick={()=>movePart(i,1)} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.8)',cursor:'pointer',padding:'0 2px',fontSize:10 }}>▼</button>
                    <button type="button" onClick={()=>togglePart(pid)} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.9)',cursor:'pointer',padding:'0 2px',fontSize:11,fontWeight:700 }}>✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          <div>
            <label style={lbl}>Separator</label>
            <select value={sep} onChange={e=>setSep(e.target.value)} style={inp}>
              <option value="-">— (hyphen)</option>
              <option value="/">/ (slash)</option>
              <option value=".">, (dot)</option>
              <option value="">No separator</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Case</label>
            <select value={uppercase?'upper':'lower'} onChange={e=>setUppercase(e.target.value==='upper')} style={inp}>
              <option value="upper">UPPERCASE</option>
              <option value="lower">lowercase</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Regular Tag</label>
            <select value={omitRegTag?'omit':'include'} onChange={e=>setOmitRegTag(e.target.value==='omit')} style={inp}>
              <option value="omit">Omit "Regular" tag</option>
              <option value="include">Include all tags</option>
            </select>
          </div>
        </div>
      </div>

      {/* VA options */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:800, color:C.tealDark, marginBottom:10 }}>✨ Value Addition Options</div>
        <div style={{ fontSize:11, color:C.muted, marginBottom:10 }}>VA Code mapping: {Object.entries(VA_CODE_MAP).slice(0,4).map(([k,v])=>`${k} → ${v}`).join(', ')}...</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
          {vaOpts.map((v,i) => (
            <span key={i} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', background:C.tealLight, borderRadius:20, fontSize:12 }}>
              {v} <span style={{ fontSize:10, color:C.muted }}>({VA_CODE_MAP[v]||'?'})</span>
              <button onClick={()=>setVaOpts(vaOpts.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',color:C.error,cursor:'pointer',padding:0,fontSize:12 }}>✕</button>
            </span>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input value={newVa} onChange={e=>setNewVa(e.target.value)}
            placeholder="Add value addition option..." style={{ ...inp, flex:1 }}
            onKeyDown={e=>{ if(e.key==='Enter' && newVa.trim()){ setVaOpts([...vaOpts, newVa.trim()]); setNewVa(''); } }} />
          <button onClick={()=>{ if(newVa.trim()){ setVaOpts([...vaOpts, newVa.trim()]); setNewVa(''); }}} style={{ padding:'8px 16px', borderRadius:8, border:'none', background:C.teal, color:'#fff', cursor:'pointer', fontWeight:600 }}>Add</button>
        </div>
      </div>

      {/* Movement options */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:800, color:C.tealDark, marginBottom:10 }}>🚚 Fabric Movement Options</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
          {movementOpts.map((m,i) => (
            <span key={i} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', background:'#f1f5f9', borderRadius:20, fontSize:12 }}>
              {m}
              <button onClick={()=>setMovementOpts(movementOpts.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',color:C.error,cursor:'pointer',padding:0,fontSize:12 }}>✕</button>
            </span>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input value={newMovement} onChange={e=>setNewMovement(e.target.value)}
            placeholder="e.g. Grey → Dyer → Schiffli → Printer" style={{ ...inp, flex:1 }}
            onKeyDown={e=>{ if(e.key==='Enter' && newMovement.trim()){ setMovementOpts([...movementOpts, newMovement.trim()]); setNewMovement(''); }}} />
          <button onClick={()=>{ if(newMovement.trim()){ setMovementOpts([...movementOpts, newMovement.trim()]); setNewMovement(''); }}} style={{ padding:'8px 16px', borderRadius:8, border:'none', background:C.teal, color:'#fff', cursor:'pointer', fontWeight:600 }}>Add</button>
        </div>
      </div>

      <button onClick={save} disabled={saving} style={{
        width:'100%', padding:'13px', borderRadius:10, border:'none',
        background: saving ? C.border : C.teal, color:'#fff', fontSize:14, fontWeight:700, cursor: saving ? 'default' : 'pointer',
      }}>{saving ? 'Saving...' : 'Save All Settings ✓'}</button>
    </div>
  );
}
