import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  FinishFabricService, buildFinishFabricName, buildFinishFabricSKU,
  PROCESS_STEPS, PROCESS_PATHS, FINISH_WIDTHS, FABRIC_TAGS, TALLY_GROUPS,
} from '@/services/FinishFabricService';

const C = { teal:'#2BA898',tealDark:'#0B2E2B',gold:'#D4920A',surface:'#fff',surface2:'#EEF8F6',border:'#D6EEE9',text:'#0D2E2B',muted:'#4A7A74',error:'#D93A3A',green:'#1E9E5A',orange:'#C86020' };
const BUNNY_ZONE='shreerang-s',BUNNY_HOST='https://storage.bunnycdn.com',CDN_URL='https://shreerang.b-cdn.net',BUNNY_KEY=import.meta.env.VITE_BUNNY_API_KEY||'';

async function uploadToBunny(file) {
  const ext = file.name.split('.').pop();
  const path = designs/\-\.\;
  const r = await fetch(\/\/\I:\My Drive\Automation\Shreerang 2026\Horizon Code\src\pages\admin\fabric\FinishFabricForm.jsx, { method:'PUT', headers:{ AccessKey:BUNNY_KEY,'Content-Type':file.type }, body:file });
  if (!r.ok) throw new Error('Bunny upload failed'); return \/\I:\My Drive\Automation\Shreerang 2026\Horizon Code\src\pages\admin\fabric\FinishFabricForm.jsx;
}
function useDebounce(v,d=350){const[dv,setDv]=useState(v);useEffect(()=>{const t=setTimeout(()=>setDv(v),d);return()=>clearTimeout(t);},[v,d]);return dv;}

function ProcessPathBuilder({ value = [], onChange }) {
  const [dragging, setDragging] = useState(null);
  const add = (step) => {
    if (!value.find(s => s.id === step.id))
      onChange([...value, { id: step.id, label: step.label, code: step.code, color: step.color }]);
  };
  const remove = (idx) => onChange(value.filter((_, i) => i !== idx));
  const move   = (from, to) => {
    const a = [...value]; const [item] = a.splice(from, 1); a.splice(to, 0, item); onChange(a);
  };
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
        Click to add steps
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
        {PROCESS_STEPS.map(step => {
          const used = value.find(s => s.id === step.id);
          return (
            <button key={step.id} onClick={() => add(step)} disabled={!!used}
              style={{ padding:'5px 14px', borderRadius:20, border:`2px solid ${step.color}`,
                background: used ? '#f1f5f9' : `${step.color}22`,
                color: used ? '#94a3b8' : step.color,
                fontWeight:600, fontSize:12, cursor: used ? 'not-allowed' : 'pointer', opacity: used ? .5 : 1 }}>
              {step.label}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
        Process Path (drag to reorder)
      </div>
      {value.length === 0 ? (
        <div style={{ padding:14, textAlign:'center', color:C.muted, background:C.surface2, borderRadius:8, border:`2px dashed ${C.border}`, fontSize:13 }}>
          Click steps above to define the fabric journey
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:4 }}>
          {value.map((step, idx) => (
            <div key={step.id} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div draggable
                onDragStart={() => setDragging(idx)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => { if (dragging !== null && dragging !== idx) move(dragging, idx); setDragging(null); }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20,
                  background: step.color || C.teal, color:'#fff', fontWeight:600, fontSize:12, cursor:'grab', userSelect:'none' }}>
                {step.label}
                <span onClick={() => remove(idx)}
                  style={{ marginLeft:4, cursor:'pointer', fontWeight:800, fontSize:14, opacity:.8 }}>x</span>
              </div>
              {idx < value.length - 1 && <span style={{ color:C.muted, fontSize:16 }}>&rarr;</span>}
            </div>
          ))}
        </div>
      )}
      {value.length > 0 && (
        <div style={{ fontSize:11, color:C.muted, background:'#f0fdf4', borderRadius:6, padding:'6px 10px', marginTop:10 }}>
          Cost calculation applied per stage ({value.length} steps)
        </div>
      )}
    </div>
  );
}
export default function FinishFabricForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = Boolean(id);

  const [nameSearch, setNameSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState('search');
  const debouncedSearch = useDebounce(nameSearch, 400);
  const [bases, setBases] = useState([]);

  const [f, setF] = useState({
    baseFabricId:'', baseFabricName:'', shortCode:'',
    width:'', processPath:'', processSteps:[],
    tag:'Regular', colourConcept:'', fabricClass:'Regular',
    hsnCode:'', gstRate:'', tallyGroup:'Finish Fabrics',
    jobWorkerId:'', jobWorkerCost:'', shortage:'',
    notes:'', ecomVisible:false, status:'active',
    imageUrl:'', confirmName:'',
  });

  const [tallySynced, setTallySynced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tallyResult, setTallyResult] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isEdit) return;
    FinishFabricService.getById(id).then(rec => {
      let parsedSteps = [];
      try { parsedSteps = rec.process_steps ? JSON.parse(rec.process_steps) : []; } catch {}
      setF({
        baseFabricId:   rec.base_fabric_id || '',
        baseFabricName: rec.base_fabrics?.base_fabric_name || rec.fabric_name || '',
        shortCode:      rec.base_fabrics?.short_code || '',
        width:          rec.finish_width || '',
        processPath:    rec.process_type || rec.process_path || '',
        processSteps:   parsedSteps,
        tag:            rec.tag || 'Regular',
        colourConcept:  rec.design_concept || '',
        fabricClass:    rec.class || 'Regular',
        hsnCode:        rec.hsn_code || '',
        gstRate:        rec.gst_rate || '',
        tallyGroup:     rec.tally_group || 'Finish Fabrics',
        jobWorkerId:    rec.job_worker_id || '',
        jobWorkerCost:  rec.job_worker_cost || '',
        shortage:       rec.shortage_percent || '',
        notes:          rec.notes || '',
        ecomVisible:    rec.ecom_visible || false,
        status:         rec.status || 'active',
        imageUrl:       rec.design_image_url || '',
        confirmName:    rec.finish_fabric_name || '',
      });
      setImgPreview(rec.design_image_url || '');
      setTallySynced(rec.tally_synced || false);
      setMode('builder');
    }).catch(err => toast({ variant:'destructive', title:'Load error', description:err.message }));
  }, [id, isEdit]);

  useEffect(() => {
    supabase.from('base_fabrics').select('id,base_fabric_name,fabric_name,short_code,sku,hsn_code,gst_rate').eq('status','active').order('base_fabric_name')
      .then(({ data }) => setBases(data || []));
  }, []);

  const liveName = buildFinishFabricName(f);
  const liveSKU  = buildFinishFabricSKU(f);
  useEffect(() => { if (!isEdit) setF(p => ({ ...p, confirmName: liveName })); }, [liveName]);

  useEffect(() => {
    if (!debouncedSearch || mode !== 'search') return;
    setSearching(true);
    FinishFabricService.searchByName(debouncedSearch).then(setSearchResults).catch(console.error).finally(() => setSearching(false));
  }, [debouncedSearch, mode]);

  const up = (field, val) => setF(p => ({ ...p, [field]: val }));

  const handleBaseSelect = (bId) => {
    const b = bases.find(x => x.id === bId);
    if (!b) { setF(p => ({ ...p, baseFabricId:'', baseFabricName:'', shortCode:'' })); return; }
    setF(p => ({ ...p, baseFabricId:b.id, baseFabricName:b.base_fabric_name||b.fabric_name||'', shortCode:b.short_code||b.sku||'', hsnCode:p.hsnCode||b.hsn_code||'', gstRate:p.gstRate||b.gst_rate||'' }));
  };

  const handleSave = async (skipTally = false) => {
    if (!f.confirmName.trim()) {
      toast({ variant:'destructive', title:'Name required', description:'Confirm the finish fabric name before saving.' });
      return;
    }
    setSaving(true);
    try {
      let imageUrl = f.imageUrl;
      if (imgFile && !imageUrl) { imageUrl = await uploadToBunny(imgFile); up('imageUrl', imageUrl); }
      const fields = { ...f, imageUrl };
      const result = isEdit
        ? await FinishFabricService.updateWithTallyPush(id, fields, { skipTally })
        : await FinishFabricService.createWithTallyPush(fields, { skipTally });
      const { tallyResult: tr } = result;
      setTallyResult(tr);
      if (tr.success) {
        setTallySynced(true);
        toast({ title: isEdit ? 'Updated + Tally synced' : 'Created + Tally synced', description:`"${f.confirmName}" is now in Tally.` });
      } else if (skipTally) {
        toast({ title:'Saved', description:'Tally sync skipped.' });
      } else {
        toast({ variant:'destructive', title:'Saved to website, Tally push failed', description: tr.error || 'Ensure Tally is open and FRP is running.' });
      }
      setTimeout(() => navigate('/admin/fabric/finish'), 1200);
    } catch (err) {
      toast({ variant:'destructive', title:'Save failed', description:err.message });
    } finally { setSaving(false); setShowConfirm(false); }
  };
  return (
    <div style={{ minHeight:'100vh',background:C.surface2 }}>
      <div style={{ background:C.tealDark,color:'#fff',padding:'16px 28px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:11,opacity:.6,textTransform:'uppercase',marginBottom:2 }}>Finish Fabric</div>
          <div style={{ fontSize:20,fontWeight:700 }}>{isEdit?Edit: :'New Finish Fabric'}</div>
        </div>
        <button onClick={()=>navigate('/admin/fabric/finish')} style={{ background:'transparent',border:'1px solid rgba(255,255,255,.3)',borderRadius:8,color:'#fff',padding:'7px 18px',cursor:'pointer' }}>Back to List</button>
      </div>
      <div style={{ maxWidth:980,margin:'0 auto',padding:'28px 20px' }}>
  return (
    <div style={{ minHeight:'100vh',background:C.surface2 }}>
      <div style={{ background:C.tealDark,color:'#fff',padding:'16px 28px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <div><div style={{ fontSize:20,fontWeight:700 }}>{isEdit?'Edit: '+f.confirmName:'New Finish Fabric'}</div></div>
        <button onClick={()=>navigate('/admin/fabric/finish')} style={{ background:'transparent',border:'1px solid rgba(255,255,255,.3)',borderRadius:8,color:'#fff',padding:'7px 18px',cursor:'pointer' }}>Back to List</button>
      </div>
      <div style={{ maxWidth:980,margin:'0 auto',padding:'28px 20px' }}>
        {!isEdit&&(<Section title='Step 0 - Search or Create' accent={C.teal}>
          <div style={{ display:'flex',gap:10,marginBottom:10 }}>
            <input style={{ ...inputStyle,flex:1 }} placeholder='Search...' value={nameSearch} onChange={e=>{setNameSearch(e.target.value);setMode('search');}} />
            <Btn onClick={()=>setMode('builder')} color={C.teal}>+ Create New</Btn>
          </div>
          {mode==='search'&&nameSearch&&(<div style={{ border:'1px solid '+C.border,borderRadius:8,background:C.surface,overflow:'hidden' }}>
            {searching&&<div style={{ padding:10,color:C.muted }}>Searching...</div>}
            {!searching&&searchResults.length===0&&nameSearch.length>1&&(<div style={{ padding:'12px 16px',fontSize:13,color:C.muted }}>No match. <span style={{ color:C.teal,cursor:'pointer',fontWeight:600 }} onClick={()=>{setF(p=>({...p,confirmName:nameSearch}));setMode('builder');}}>Create this</span></div>)}
            {searchResults.map(r=>(<div key={r.id} style={{ display:'flex',padding:'10px 16px',borderBottom:'1px solid '+C.border,cursor:'pointer' }} onClick={()=>navigate('/admin/fabric/finish/'+r.id+'/edit')}>
              <div style={{ flex:1 }}><div style={{ fontWeight:600 }}>{r.finish_fabric_name}</div><div style={{ fontSize:11,color:C.muted }}>{r.process_type}</div></div>
              <div style={{ display:'flex',gap:8 }}>{r.tally_synced?<Badge color={C.green}>Tally OK</Badge>:<Badge color={C.orange}>Not in Tally</Badge>}<Badge color={C.teal}>Edit</Badge></div>
            </div>))}
          </div>)}
        </Section>)}
        {(mode==='builder'||isEdit)&&(<>
          <Section title='Step 1 - Base Fabric (Optional)' accent={C.teal}>
            <p style={{ fontSize:13,color:C.muted,marginBottom:12 }}>Map to a base fabric or skip for now.</p>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
              <Field label='Base Fabric'><select style={selectStyle} value={f.baseFabricId} onChange={e=>handleBaseSelect(e.target.value)}><option value=''>None / Skip</option>{bases.map(b=><option key={b.id} value={b.id}>{b.base_fabric_name||b.fabric_name}</option>)}</select></Field>
              <Field label='Short Code'><input style={{ ...inputStyle,background:C.surface2 }} value={f.shortCode} readOnly /></Field>
            </div>
            {!f.baseFabricId&&<Field label='Or type base fabric name'><input style={inputStyle} placeholder='Cotton Camric' value={f.baseFabricName} onChange={e=>up('baseFabricName',e.target.value)} /></Field>}
          </Section>
          <Section title='Step 2 - Process Path (Multi-Step)' accent={C.teal}>
            <p style={{ fontSize:13,color:C.muted,marginBottom:14 }}>Build the fabric journey. Any combination. Drives cost calculation.</p>
            <ProcessPathBuilder value={f.processSteps} onChange={steps=>setF(p=>({...p,processSteps:steps}))} />
          </Section>
          <Section title='Step 3 - Fabric Details' accent={C.teal}>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14 }}>
              <Field label='Width'><select style={selectStyle} value={f.width} onChange={e=>up('width',e.target.value)}><option value=''>Select</option>{FINISH_WIDTHS.map(w2=><option key={w2.value} value={w2.value}>{w2.label}</option>)}</select></Field>
              <Field label='Tag'><select style={selectStyle} value={f.tag} onChange={e=>up('tag',e.target.value)}>{FABRIC_TAGS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
              <Field label='Colour'><input style={inputStyle} placeholder='Blue Floral' value={f.colourConcept} onChange={e=>up('colourConcept',e.target.value)} /></Field>
              <Field label='HSN'><input style={inputStyle} placeholder='5208' value={f.hsnCode} onChange={e=>up('hsnCode',e.target.value)} /></Field>
              <Field label='GST %'><input style={inputStyle} type='number' placeholder='5' value={f.gstRate} onChange={e=>up('gstRate',e.target.value)} /></Field>
              <Field label='Tally Group'><select style={selectStyle} value={f.tallyGroup} onChange={e=>up('tallyGroup',e.target.value)}>{TALLY_GROUPS.map(g=><option key={g} value={g}>{g}</option>)}</select></Field>
              <Field label='Shortage %'><input style={inputStyle} type='number' value={f.shortage} onChange={e=>up('shortage',e.target.value)} /></Field>
              <Field label='JW Cost'><input style={inputStyle} type='number' value={f.jobWorkerCost} onChange={e=>up('jobWorkerCost',e.target.value)} /></Field>
              <Field label='Status'><select style={selectStyle} value={f.status} onChange={e=>up('status',e.target.value)}><option value='active'>Active</option><option value='inactive'>Inactive</option><option value='discontinued'>Discontinued</option></select></Field>
            </div>
            <Field label='Notes'><textarea style={{ ...inputStyle,height:72,resize:'vertical' }} value={f.notes} onChange={e=>up('notes',e.target.value)} /></Field>
          </Section>
          <Section title='Step 4 - Design Image' accent={C.gold}>
            <div style={{ display:'flex',gap:20 }}>
              {imgPreview&&<img src={imgPreview} alt='preview' style={{ width:120,height:120,objectFit:'cover',borderRadius:8 }} />}
              <div style={{ flex:1 }}>
                <input ref={fileRef} type='file' accept='image/*' style={{ display:'none' }} onChange={e=>{const fi=e.target.files?.[0];if(fi){setImgFile(fi);setImgPreview(URL.createObjectURL(fi));}}}/>
                <Btn onClick={()=>fileRef.current?.click()} color={C.muted}>Pick Image</Btn>
                <label style={{ display:'flex',alignItems:'center',gap:8,marginTop:12,fontSize:13 }}><input type='checkbox' checked={f.ecomVisible} onChange={e=>up('ecomVisible',e.target.checked)} />Show on e-commerce</label>
              </div>
            </div>
          </Section>
          <Section title='Step 5 - Confirm and Push to Tally' accent={tallySynced?C.green:C.orange}>
            <div style={{ background:C.tealDark,borderRadius:10,padding:'14px 20px',marginBottom:16 }}>
              <div style={{ fontSize:11,color:'rgba(255,255,255,.5)',textTransform:'uppercase',marginBottom:4 }}>Live Name Preview</div>
              <div style={{ fontSize:22,fontWeight:700,color:'#fff' }}>{liveName||'-'}</div>
              <div style={{ fontSize:12,color:'rgba(255,255,255,.5)',marginTop:4 }}>SKU: {liveSKU||'-'}</div>
              {f.processSteps.length>0&&(<div style={{ display:'flex',gap:6,flexWrap:'wrap',marginTop:10 }}>{f.processSteps.map((s,i)=>(<span key={i} style={{ background:(s.color||'#fff')+'33',color:'#fff',borderRadius:12,padding:'2px 10px',fontSize:11 }}>{s.label}</span>))}</div>)}
            </div>
            <Field label='Confirm Item Name'><input style={{ ...inputStyle,fontWeight:700,fontSize:15 }} value={f.confirmName} onChange={e=>up('confirmName',e.target.value)} /></Field>
            {tallySynced&&<div style={{ background:'#d4edda',borderRadius:8,padding:'10px 16px',color:C.green,fontSize:13,marginTop:8 }}>Already synced to Tally</div>}
            {tallyResult&&!tallyResult.success&&!tallyResult.skipped&&<div style={{ background:'#fdecea',borderRadius:8,padding:'10px 16px',color:C.error,fontSize:13,marginTop:8 }}>Tally failed: {tallyResult.error}</div>}
          </Section>
          <div style={{ display:'flex',gap:14,justifyContent:'flex-end',marginTop:24 }}>
            <Btn onClick={()=>navigate('/admin/fabric/finish')} color={C.muted}>Cancel</Btn>
            <Btn onClick={()=>handleSave(true)} color={C.muted} disabled={saving}>Save Only</Btn>
            <Btn onClick={()=>setShowConfirm(true)} color={C.teal} disabled={saving}>{saving?'Saving...':(isEdit?'Update + Tally':'Create + Tally')}</Btn>
          </div>
          {showConfirm&&(<div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000 }}>
            <div style={{ background:C.surface,borderRadius:14,padding:28,maxWidth:480,width:'100%' }}>
              <div style={{ fontSize:18,fontWeight:700,marginBottom:8 }}>Confirm Tally Push</div>
              <div style={{ background:C.surface2,borderRadius:8,padding:'12px 16px',marginBottom:16 }}>
                <div style={{ fontWeight:700 }}>{f.confirmName}</div>
                <div style={{ fontSize:12,color:C.muted }}>Group: {f.tallyGroup}</div>
                {f.processSteps.length>0&&<div style={{ fontSize:11,color:C.muted,marginTop:4 }}>Process: {f.processSteps.map(s=>s.label).join(' -> ')}</div>}
              </div>
              <div style={{ display:'flex',gap:10,justifyContent:'flex-end' }}>
                <Btn onClick={()=>setShowConfirm(false)} color={C.muted}>Cancel</Btn>
                <Btn onClick={()=>handleSave(false)} color={C.teal} disabled={saving}>{saving?'Pushing...':'Confirm & Push'}</Btn>
              </div>
            </div>
          </div>)}
        </>)}
      </div>
    </div>
  );
}
function Section({title,accent=C.teal,children}){return(<div style={{ background:C.surface,borderRadius:12,border:'1px solid '+C.border,borderTop:'4px solid '+accent,padding:'20px 24px',marginBottom:20 }}><div style={{ fontWeight:700,fontSize:13,textTransform:'uppercase',color:accent,marginBottom:16 }}>{title}</div>{children}</div>);}
function Field({label,children}){return(<div style={{ marginBottom:4 }}><label style={{ display:'block',fontSize:11,fontWeight:700,textTransform:'uppercase',color:C.muted,marginBottom:5 }}>{label}</label>{children}</div>);}
function Badge({color,children}){return<span style={{ background:color+'22',color,borderRadius:10,padding:'2px 9px',fontSize:11,fontWeight:600 }}>{children}</span>;}
function Btn({onClick,color,disabled,children}){return(<button onClick={onClick} disabled={disabled} style={{ background:disabled?'#ccc':color,color:'#fff',border:'none',borderRadius:8,padding:'9px 20px',fontSize:13,fontWeight:600,cursor:disabled?'not-allowed':'pointer',opacity:disabled?.7:1 }}>{children}</button>);}
const inputStyle={width:'100%',border:'1px solid #D6EEE9',borderRadius:7,padding:'8px 12px',fontSize:13,outline:'none',background:'#fff',color:C.text,boxSizing:'border-box'};
const selectStyle={...inputStyle,appearance:'none',cursor:'pointer'};

