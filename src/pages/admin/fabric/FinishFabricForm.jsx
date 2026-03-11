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
