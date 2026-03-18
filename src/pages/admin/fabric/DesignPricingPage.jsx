import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const C = {
  teal:'#2BA898', tealDark:'#0B2E2B', tealLight:'#EEF8F6',
  gold:'#D4920A', goldLight:'#FEF9EC',
  border:'#D6EEE9', text:'#0D2E2B', muted:'#4A7A74',
  error:'#D93A3A', green:'#1E9E5A', surface:'#fff',
  purple:'#7C3AED', orange:'#C86020',
};
const lbl = { fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.8, marginBottom:4, display:'block' };
const inp = { width:'100%', padding:'8px 11px', border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, color:C.text, outline:'none', boxSizing:'border-box', background:'#fff', fontFamily:'inherit' };
const card = { background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:14 };

const PANEL_TYPES = [
  { id:'top',     label:'Top / Kurti',    icon:'👘', defaultMtrs:2.5 },
  { id:'bottom',  label:'Bottom / Pant',  icon:'👖', defaultMtrs:2.0 },
  { id:'dupatta', label:'Dupatta / Stall',icon:'🧣', defaultMtrs:2.25 },
  { id:'border',  label:'Border',         icon:'🔲', defaultMtrs:0.5 },
  { id:'inner',   label:'Inner / Lining', icon:'🩱', defaultMtrs:2.0 },
  { id:'other',   label:'Other',          icon:'📦', defaultMtrs:1.0 },
];

// ─── COST FORMULA (Scenario A: charge on grey, Scenario B: charge on finish) ─
function calcPanelCost(panel) {
  const metres = parseFloat(panel.metres_per_garment) || 0;
  const rate = parseFloat(panel.rate_per_metre) || 0;
  const jc = parseFloat(panel.jobworker_cost) || 0;
  const pc = parseFloat(panel.process_cost) || 0;
  const shortage = (parseFloat(panel.shortage_pct) || 5) / 100;
  // fabric cost + (jobworker on finish qty) + process / (1 - shortage)
  const fabric = metres * rate;
  const total = (fabric + jc * metres + pc * metres) / (1 - shortage);
  return Math.round(total * 100) / 100;
}

function calcTotalGarmentCost(panels) {
  return panels.reduce((sum, p) => sum + calcPanelCost(p), 0);
}

// ─── PANEL ROW ───────────────────────────────────────────────────────────────
function PanelRow({ panel, idx, onChange, onRemove, allFabrics }) {
  const panelDef = PANEL_TYPES.find(p => p.id === panel.panel_type);
  const cost = calcPanelCost(panel);
  return (
    <div style={{ background:idx%2===0?'#f9fffe':'#fff', border:`1px solid ${C.border}`, borderRadius:10, padding:14, marginBottom:8 }}>
      {/* Row 1: Panel type, label, fabric, metres, rate */}
      <div style={{ display:'grid', gridTemplateColumns:'140px 1fr 1.5fr 90px 90px 90px', gap:8, marginBottom:8 }}>
        <div>
          <label style={lbl}>Panel Type</label>
          <select value={panel.panel_type} onChange={e => onChange({...panel, panel_type:e.target.value})} style={inp}>
            {PANEL_TYPES.map(p => <option key={p.id} value={p.id}>{p.icon} {p.label}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Label / Name</label>
          <input value={panel.panel_label||''} onChange={e => onChange({...panel, panel_label:e.target.value})}
            placeholder={`e.g. ${panelDef?.label}`} style={inp} />
        </div>
        <div>
          <label style={lbl}>Fabric (same or different finish fabric)</label>
          <select value={panel.fabric_id||''} onChange={e => {
            const f = allFabrics.find(x => x.id === e.target.value);
            onChange({...panel, fabric_id:e.target.value, fabric_name:f?.item_name||f?.finish_fabric_name||''});
          }} style={inp}>
            <option value="">— same as parent fabric —</option>
            {allFabrics.map(f => <option key={f.id} value={f.id}>{f.item_name||f.finish_fabric_name}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Mtrs / Garment</label>
          <input type="number" step="0.25" value={panel.metres_per_garment||''} onChange={e => onChange({...panel, metres_per_garment:parseFloat(e.target.value)||0})} style={inp} />
        </div>
        <div>
          <label style={lbl}>Rate ₹/m</label>
          <input type="number" value={panel.rate_per_metre||''} onChange={e => onChange({...panel, rate_per_metre:parseFloat(e.target.value)||0})} style={inp} />
        </div>
        <div>
          <label style={lbl}>Shortage %</label>
          <input type="number" step="1" value={panel.shortage_pct||5} onChange={e => onChange({...panel, shortage_pct:parseFloat(e.target.value)||0})} style={inp} />
        </div>
      </div>
      {/* Row 2: jobworker cost, process cost, notes, cost preview, remove */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1.5fr 120px 40px', gap:8, alignItems:'end' }}>
        <div>
          <label style={lbl}>Jobworker ₹/m</label>
          <input type="number" value={panel.jobworker_cost||''} onChange={e => onChange({...panel, jobworker_cost:parseFloat(e.target.value)||0})} placeholder="0.00" style={inp} />
        </div>
        <div>
          <label style={lbl}>Process ₹/m</label>
          <input type="number" value={panel.process_cost||''} onChange={e => onChange({...panel, process_cost:parseFloat(e.target.value)||0})} placeholder="0.00" style={inp} />
        </div>
        <div>
          <label style={lbl}>Notes</label>
          <input value={panel.notes||''} onChange={e => onChange({...panel, notes:e.target.value})} placeholder="Optional notes" style={inp} />
        </div>
        <div style={{ padding:'8px 12px', background:C.tealLight, borderRadius:8, textAlign:'center' }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.muted }}>PANEL COST</div>
          <div style={{ fontSize:16, fontWeight:800, color:C.tealDark }}>₹{cost.toFixed(2)}</div>
          <div style={{ fontSize:9, color:C.muted }}>per garment</div>
        </div>
        <div>
          <button onClick={onRemove} type="button" style={{ width:38, height:38, borderRadius:7, border:`1.5px solid ${C.error}`, background:'#fff', color:C.error, cursor:'pointer', fontSize:14 }}>✕</button>
        </div>
      </div>
    </div>
  );
}

// ─── DESIGN ROW ──────────────────────────────────────────────────────────────
function DesignRow({ design, idx, onChange, onRemove, onSelectForPanels, isSelectedForPanels }) {
  return (
    <div style={{ border:`2px solid ${isSelectedForPanels?C.teal:C.border}`, borderRadius:12, padding:16, marginBottom:10, background:isSelectedForPanels?C.tealLight:'#fff' }}>
      <div style={{ display:'grid', gridTemplateColumns:'100px 1fr 1fr 1fr 90px 90px 80px', gap:8, alignItems:'end' }}>
        <div>
          <label style={lbl}>Design No *</label>
          <input value={design.design_no||design.design_number||''} onChange={e => onChange({...design, design_no:e.target.value, design_number:e.target.value})}
            placeholder="D001" style={{ ...inp, fontWeight:700, borderColor:design.design_no?C.teal:C.border }} />
        </div>
        <div>
          <label style={lbl}>Color / Name</label>
          <input value={design.color_name||''} onChange={e => onChange({...design, color_name:e.target.value})} placeholder="Red Floral" style={inp} />
        </div>
        <div>
          <label style={lbl}>Lump Price ₹/m</label>
          <input type="number" value={design.lump_price||''} onChange={e => onChange({...design, lump_price:parseFloat(e.target.value)||null})} placeholder="0.00" style={inp} />
        </div>
        <div>
          <label style={lbl}>Cut Pack ₹/m</label>
          <input type="number" value={design.cut_pack_price||''} onChange={e => onChange({...design, cut_pack_price:parseFloat(e.target.value)||null})} placeholder="0.00" style={inp} />
        </div>
        <div>
          <label style={lbl}>JW ₹/m</label>
          <input type="number" value={design.jobworker_cost||''} onChange={e => onChange({...design, jobworker_cost:parseFloat(e.target.value)||null})} placeholder="0.00" style={inp} />
        </div>
        <div>
          <label style={lbl}>Width</label>
          <select value={design.width||''} onChange={e => onChange({...design, width:e.target.value})} style={inp}>
            <option value="">—</option>
            {['44"','54"','56"','58"','60"'].map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
        <div>
          <button onClick={onRemove} type="button" style={{ padding:'7px', borderRadius:7, border:`1.5px solid ${C.error}`, background:'#fff', color:C.error, cursor:'pointer', width:'100%', fontSize:11 }}>Remove</button>
        </div>
      </div>
      {/* SKU + Panel mapping toggle */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:10, padding:'8px 10px', background:'#f8f9fa', borderRadius:8 }}>
        <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>SKU:</span>
        <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:13, color:C.tealDark }}>{design.sku || '—'}</span>
        <button onClick={() => onSelectForPanels(design)} type="button" style={{
          marginLeft:'auto', padding:'5px 14px', borderRadius:8,
          border:`2px solid ${isSelectedForPanels?C.teal:C.border}`,
          background:isSelectedForPanels?C.teal:'#fff',
          color:isSelectedForPanels?'#fff':C.text,
          fontSize:11, fontWeight:700, cursor:'pointer',
        }}>
          {isSelectedForPanels ? '✓ Editing Panels' : '+ Map Garment Panels'}
        </button>
        {design.panel_count > 0 && (
          <span style={{ fontSize:11, color:C.green, fontWeight:600 }}>✓ {design.panel_count} panels mapped</span>
        )}
      </div>
      {design.notes !== undefined && (
        <div style={{ marginTop:6 }}>
          <input value={design.notes||''} onChange={e => onChange({...design, notes:e.target.value})} placeholder="Internal notes…" style={{ ...inp, fontSize:12 }} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function DesignPricingPage() {
  const { fabricId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [fabric, setFabric] = useState(null);
  const [designs, setDesigns] = useState([]);
  const [panels, setPanels] = useState({});         // designId → panel[]
  const [selectedDesignId, setSelectedDesignId] = useState(null);
  const [allFabrics, setAllFabrics] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [skuFormula, setSkuFormula] = useState(null);

  const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  // Load fabric info
  useEffect(() => {
    if (!fabricId) return;
    (async () => {
      const { data } = await supabase.from('finish_fabrics').select('*').eq('id', fabricId).single();
      if (data) setFabric(data);
      // Load designs
      const { data: dd } = await supabase.from('finish_fabric_designs').select('*').eq('finish_fabric_id', fabricId).order('created_at');
      if (dd) setDesigns(dd.map(d => ({...d, design_no:d.design_no||d.design_number||''})));
      // Load panels for each design
      const panelMap = {};
      if (dd?.length) {
        const { data: pd } = await supabase.from('design_panels').select('*').in('design_id', dd.map(d=>d.id)).order('sort_order');
        if (pd) {
          pd.forEach(p => {
            if (!panelMap[p.design_id]) panelMap[p.design_id] = [];
            panelMap[p.design_id].push(p);
          });
        }
      }
      setPanels(panelMap);
    })();
  }, [fabricId]);

  // Load all finish fabrics for panel fabric selector
  useEffect(() => {
    supabase.from('finish_fabrics').select('id,item_name,finish_fabric_name').eq('is_active',true).order('item_name').limit(200).then(({data}) => setAllFabrics(data||[]));
    supabase.from('admin_settings').select('key_value').eq('key_name','SKU_FORMULA').single().then(({data}) => { if(data) setSkuFormula(data.key_value); });
  }, []);

  // Compute SKU for a design
  const computeSKU = (design) => {
    if (!skuFormula || !fabric) return '';
    try {
      const f = JSON.parse(skuFormula);
      const parts = f.parts || ['width','short_code','process_path','design_no'];
      const sep = f.separator || '-';
      let pathCode = '';
      try { const steps = JSON.parse(fabric.process_path||'[]'); pathCode = steps.map(s=>s.code||s.id||'').filter(Boolean).join('-'); } catch {}
      const map = {
        width: (design.width||fabric.finish_width||'44').replace(/[^0-9]/g,''),
        short_code: fabric.short_code||'',
        process_path: pathCode,
        tag: (fabric.process_class||'Regular')==='Regular'?'':(fabric.process_class||'').slice(0,3).toUpperCase(),
        va_code: (fabric.value_addition||'').slice(0,3).toUpperCase(),
        design_no: (design.design_no||'').toUpperCase().replace(/\s/g,''),
      };
      return parts.map(p=>map[p]||'').filter(Boolean).join(sep).toUpperCase();
    } catch { return ''; }
  };

  // ─── SAVE DESIGNS ──────────────────────────────────────────────────────────
  const saveAll = async () => {
    if (!fabricId) return;
    setSaving(true);
    let ok=0, fail=0;
    for (const d of designs) {
      const sku = d.sku_locked ? d.sku : computeSKU(d);
      const payload = {
        finish_fabric_id: fabricId,
        design_no: d.design_no||null, design_number: d.design_no||null,
        color_name: d.color_name||null, jobworker_name: d.jobworker_name||null,
        jobworker_cost: d.jobworker_cost||null, print_type: d.print_type||null,
        width: d.width||null, lump_price: d.lump_price||null,
        cut_pack_price: d.cut_pack_price||null, notes: d.notes||null,
        sku, sku_locked: d.sku_locked||false, is_active: true,
        updated_at: new Date().toISOString(),
      };
      let res;
      if (d.id && !d._new) {
        res = await supabase.from('finish_fabric_designs').update(payload).eq('id', d.id).select().single();
      } else {
        res = await supabase.from('finish_fabric_designs').insert({...payload, created_at:new Date().toISOString()}).select().single();
        if (!res.error) {
          // update local id
          setDesigns(prev => prev.map(x => x === d ? {...x, id:res.data.id, _new:false} : x));
          // Save panels for this new design
          if (panels[d._tempKey || d.id]?.length) {
            setPanels(prev => {
              const next = {...prev};
              next[res.data.id] = next[d._tempKey || d.id];
              delete next[d._tempKey || d.id];
              return next;
            });
          }
        }
      }
      res.error ? fail++ : ok++;
    }
    // Save panels
    for (const [designId, panelList] of Object.entries(panels)) {
      for (const p of panelList) {
        const pp = {
          design_id: designId, finish_fabric_id: fabricId,
          panel_type: p.panel_type, panel_label: p.panel_label||null,
          fabric_id: p.fabric_id||null, fabric_name: p.fabric_name||null,
          metres_per_garment: parseFloat(p.metres_per_garment)||2.5,
          rate_per_metre: parseFloat(p.rate_per_metre)||null,
          jobworker_cost: parseFloat(p.jobworker_cost)||0,
          process_cost: parseFloat(p.process_cost)||0,
          shortage_pct: parseFloat(p.shortage_pct)||5,
          notes: p.notes||null, sort_order: p.sort_order||0,
          updated_at: new Date().toISOString(),
        };
        if (p.id && !p._new) {
          await supabase.from('design_panels').update(pp).eq('id', p.id);
        } else {
          await supabase.from('design_panels').insert({...pp, created_at:new Date().toISOString()});
        }
      }
    }
    setSaving(false);
    showToast(fail>0?`Saved ${ok}, failed ${fail}`:`${ok} design(s) saved ✓`, fail>0?'error':'success');
  };

  const addDesign = () => {
    const tempKey = `_new_${Date.now()}`;
    setDesigns(d => [...d, { _new:true, _tempKey:tempKey, design_no:'', color_name:'', width:fabric?.finish_width||'44"', lump_price:null, cut_pack_price:null, jobworker_cost:null, notes:'', sku:'', sku_locked:false }]);
  };

  const updateDesign = (i, v) => setDesigns(d => d.map((x,j)=>j===i?v:x));
  const removeDesign = (i) => setDesigns(d => d.filter((_,j)=>j!==i));

  const getPanelsFor = (design) => panels[design.id || design._tempKey] || [];
  const setPanelsFor = (design, newPanels) => {
    const key = design.id || design._tempKey;
    setPanels(p => ({...p, [key]: newPanels}));
  };

  const addPanel = (design) => {
    const existing = getPanelsFor(design);
    const newPanel = { _new:true, panel_type:'top', panel_label:'', fabric_id:'', fabric_name:'', metres_per_garment:2.5, rate_per_metre:null, jobworker_cost:0, process_cost:0, shortage_pct:5, notes:'', sort_order:existing.length };
    setPanelsFor(design, [...existing, newPanel]);
  };

  const selectedDesign = designs.find(d => (d.id||d._tempKey) === selectedDesignId);
  const selectedPanels = selectedDesign ? getPanelsFor(selectedDesign) : [];
  const garmentCost = selectedPanels.length > 0 ? calcTotalGarmentCost(selectedPanels) : null;

  if (!fabric) return <div style={{ padding:40, textAlign:'center', color:C.muted }}>Loading…</div>;

  return (
    <div style={{ maxWidth:960, margin:'0 auto', padding:'20px 16px', fontFamily:'Inter,sans-serif', color:C.text }}>
      {toast && <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'10px 18px', borderRadius:10, background:toast.type==='error'?C.error:C.green, color:'#fff', fontSize:13, fontWeight:600, boxShadow:'0 4px 20px rgba(0,0,0,0.2)' }}>{toast.msg}</div>}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button onClick={() => navigate(`/admin/fabric/finish-fabric-form/${fabricId}`)} style={{ background:'none', border:'none', cursor:'pointer', color:C.muted, fontSize:18 }}>←</button>
        <div>
          <h1 style={{ margin:0, fontSize:18, fontWeight:800, color:C.tealDark }}>Designs & Pricing</h1>
          <div style={{ fontSize:12, color:C.muted }}>
            <span style={{ fontWeight:700, color:C.tealDark }}>{fabric.item_name||fabric.finish_fabric_name}</span>
            {fabric.finish_width && ` · ${fabric.finish_width}`}
            {fabric.fabric_category && ` · ${fabric.fabric_category}`}
          </div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          <button onClick={addDesign} style={{ padding:'8px 16px', borderRadius:8, border:'none', background:C.teal, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>+ Add Design</button>
          <button onClick={saveAll} disabled={saving} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:saving?C.border:C.green, color:'#fff', fontSize:13, fontWeight:700, cursor:saving?'default':'pointer' }}>
            {saving?'Saving…':'✓ Save All'}
          </button>
        </div>
      </div>

      {/* Designs list */}
      <div style={card}>
        <div style={{ fontSize:13, fontWeight:800, color:C.tealDark, marginBottom:12 }}>
          🎨 Design Numbers & Pricing
          <span style={{ fontSize:11, color:C.muted, fontWeight:500, marginLeft:8 }}>— Lump price for bulk 50m+ orders · Cut Pack for ~20m orders · JW = Jobworker cost</span>
        </div>
        {designs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px', color:C.muted }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🎨</div>
            <div>No designs yet. Click "+ Add Design" to start.</div>
          </div>
        ) : designs.map((d, i) => (
          <DesignRow key={d.id||d._tempKey}
            design={{ ...d, sku:computeSKU(d), panel_count: getPanelsFor(d).length }}
            idx={i}
            onChange={v => updateDesign(i,v)}
            onRemove={() => removeDesign(i)}
            onSelectForPanels={des => setSelectedDesignId((d.id||d._tempKey) === selectedDesignId ? null : (d.id||d._tempKey))}
            isSelectedForPanels={(d.id||d._tempKey) === selectedDesignId}
          />
        ))}
      </div>

      {/* Panel mapping section */}
      {selectedDesign && (
        <div style={{ ...card, borderTop:`3px solid ${C.purple}` }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:C.tealDark }}>
                👗 Garment Panels — D.No: <span style={{ color:C.purple }}>{selectedDesign.design_no||'(no number yet)'}</span>
              </div>
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                Map Top / Bottom / Dupatta / Border panels. Each panel can use the same or a different finish fabric.
                Cost is auto-calculated per garment.
              </div>
            </div>
            <button onClick={() => addPanel(selectedDesign)} style={{ padding:'8px 16px', borderRadius:8, border:`2px solid ${C.purple}`, background:'#fff', color:C.purple, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              + Add Panel
            </button>
          </div>

          {selectedPanels.length === 0 ? (
            <div style={{ textAlign:'center', padding:'24px', color:C.muted, border:`1.5px dashed ${C.border}`, borderRadius:9 }}>
              No panels yet. Add panels to calculate garment cost per set.
            </div>
          ) : (
            <>
              {selectedPanels.map((p, i) => (
                <PanelRow key={i} panel={p} idx={i}
                  onChange={v => {
                    const updated = [...selectedPanels];
                    updated[i] = v;
                    setPanelsFor(selectedDesign, updated);
                  }}
                  onRemove={() => setPanelsFor(selectedDesign, selectedPanels.filter((_,j)=>j!==i))}
                  allFabrics={allFabrics}
                />
              ))}

              {/* Cost summary */}
              <div style={{ background:C.tealLight, borderRadius:10, padding:'14px 18px', marginTop:12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:12 }}>
                  {selectedPanels.map((p,i) => {
                    const pdef = PANEL_TYPES.find(x=>x.id===p.panel_type);
                    return (
                      <div key={i} style={{ textAlign:'center', background:'#fff', borderRadius:8, padding:'10px' }}>
                        <div style={{ fontSize:20 }}>{pdef?.icon}</div>
                        <div style={{ fontSize:11, fontWeight:700, color:C.muted }}>{p.panel_label||pdef?.label}</div>
                        <div style={{ fontSize:14, fontWeight:800, color:C.tealDark }}>₹{calcPanelCost(p).toFixed(2)}</div>
                        <div style={{ fontSize:10, color:C.muted }}>{p.metres_per_garment}m @ ₹{p.rate_per_metre||0}/m</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.tealDark }}>Total Fabric Cost per Garment/Set:</div>
                  <div style={{ fontSize:24, fontWeight:800, color:C.teal }}>₹{garmentCost?.toFixed(2)}</div>
                </div>
                <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
                  This is fabric cost only. Add CMT (cutting/making/trimming) + accessories + packing + commercial costs for final selling price.
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Note */}
      <div style={{ padding:'10px 14px', background:C.goldLight, borderRadius:9, fontSize:12, color:C.tealDark, border:`1px solid ${C.gold}33`, marginTop:8 }}>
        💡 <strong>Costing method:</strong> Panel cost = (Metres × Rate + Jobworker ₹/m + Process ₹/m) ÷ (1 − Shortage%). This follows Scenario B (charge on finish metres). Consistent with Process Cost Sheet Scenario B from your Excel.
      </div>
    </div>
  );
}
