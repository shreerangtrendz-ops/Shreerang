import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  FinishFabricService, buildFinishFabricName, buildFinishFabricSKU,
  PROCESS_STEPS, FINISH_WIDTHS, FABRIC_TAGS, TALLY_GROUPS,
} from '@/services/FinishFabricService';
import { VA_CODES, CONCEPT_CODES, PLACEMENT_CODES, THREAD_OPTIONS } from '@/lib/fabricMasterReferences';

const C = {
  teal:'#2BA898',tealDark:'#0B2E2B',tealLight:'#EEF8F6',
  gold:'#D4920A',surface:'#fff',surface2:'#F8FBFA',
  border:'#D6EEE9',text:'#0D2E2B',muted:'#4A7A74',
  error:'#D93A3A',green:'#1E9E5A',orange:'#C86020',
  blue:'#2563EB',purple:'#7C3AED',schiffli:'#8b5cf6',
  stage1:'#2BA898',stage2:'#D4920A',
};

const FABRIC_CATEGORIES = [
  { value:'mill_print',  label:'Mill Print',        color:'#f59e0b', icon:'\u{1F5A8}' },
  { value:'digital',     label:'Digital Print',     color:'#06b6d4', icon:'\u{1F4BB}' },
  { value:'embroidery',  label:'Embroidery',        color:'#ec4899', icon:'\u{1F9F5}' },
  { value:'schiffli',    label:'Schiffli / Hakoba', color:'#8b5cf6', icon:'\u{1FAA1}' },
  { value:'solid_dyed',  label:'Solid Dyed',        color:'#10b981', icon:'\u{1F3A8}' },
  { value:'fancy',       label:'Fancy Finish',      color:'#f97316', icon:'\u{2728}' },
];

const BUNNY_KEY = import.meta.env.VITE_BUNNY_API_KEY || '';
const CDN_URL   = 'https://shreerang.b-cdn.net';
const BUNNY_ZONE= 'shreerang-s';

async function uploadToBunny(file) {
  const ext = file.name.split('.').pop();
  const path = `designs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const r = await fetch(`https://storage.bunnycdn.com/${BUNNY_ZONE}/${path}`,{
    method:'PUT', headers:{AccessKey:BUNNY_KEY,'Content-Type':file.type}, body:file,
  });
  if (!r.ok) throw new Error('Bunny upload failed');
  return `${CDN_URL}/${path}`;
}

function useDebounce(v,d=350){
  const [dv,setDv]=useState(v);
  useEffect(()=>{const t=setTimeout(()=>setDv(v),d);return()=>clearTimeout(t);},[v,d]);
  return dv;
}

const labelStyle={fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:0.8,marginBottom:5,display:'block'};
const inputStyle={width:'100%',padding:'8px 11px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.text,outline:'none',boxSizing:'border-box',background:'#fff'};

function StageBar({stage,savedId}){
  const stages=[
    {num:1,label:'Stage 1 \u2014 Name & Identity',sub:'Category \xb7 Process Path \xb7 Tally Push',color:C.stage1},
    {num:2,label:'Stage 2 \u2014 Design & Costing',sub:'Design No \xb7 Images \xb7 Job Charges \xb7 Price',color:C.stage2},
  ];
  return(
    <div style={{display:'flex',gap:4,background:'rgba(0,0,0,0.06)',borderRadius:12,padding:5,marginBottom:20}}>
      {stages.map(s=>{
        const active=stage===s.num, done=stage>s.num, locked=s.num===2&&!savedId;
        return(
          <div key={s.num} style={{flex:1,display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderRadius:9,
            background:active?'#fff':done?'rgba(30,158,90,0.08)':'transparent',
            opacity:locked?0.45:1,boxShadow:active?'0 2px 8px rgba(0,0,0,0.08)':'none'}}>
            <div style={{width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,
              background:active?s.color:done?'#10b981':'rgba(0,0,0,0.1)',
              color:active||done?'#fff':'#888'}}>
              {done?'\u2713':s.num}
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:active?C.tealDark:done?'#166534':'#555'}}>{s.label}</div>
              <div style={{fontSize:11,color:active?C.muted:'#888'}}>{locked?'\u{1F512} Save Stage 1 first':s.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProcessPathBuilder({value=[],onChange}){
  const [dragging,setDragging]=useState(null);
  const add=(step)=>onChange([...value,{...step,_uid:`${step.id}_${Date.now()}`}]);
  const remove=(idx)=>onChange(value.filter((_,i)=>i!==idx));
  const move=(from,to)=>{const a=[...value];const[item]=a.splice(from,1);a.splice(to,0,item);onChange(a);};
  return(
    <div>
      <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>
        Click to add steps \u2014 same step can repeat for multi-pass
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:14}}>
        {PROCESS_STEPS.map(step=>(
          <button key={step.id} type="button" onClick={()=>add(step)}
            style={{padding:'5px 14px',borderRadius:20,border:`2px solid ${step.color}`,
              background:`${step.color}22`,color:step.color,fontWeight:600,fontSize:12,cursor:'pointer'}}>
            + {step.label}
          </button>
        ))}
      </div>
      {value.length===0?(
        <div style={{padding:14,textAlign:'center',color:C.muted,background:C.surface2,borderRadius:8,border:`2px dashed ${C.border}`,fontSize:13}}>
          Click steps above to define the fabric's process journey
        </div>
      ):(
        <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:4}}>
          {value.map((step,idx)=>(
            <div key={step._uid||step.id+idx} style={{display:'flex',alignItems:'center',gap:4}}>
              <div draggable onDragStart={()=>setDragging(idx)} onDragOver={e=>e.preventDefault()}
                onDrop={()=>{if(dragging!==null&&dragging!==idx)move(dragging,idx);setDragging(null);}}
                style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:20,
                  background:step.color||C.teal,color:'#fff',fontWeight:600,fontSize:12,cursor:'grab',userSelect:'none',opacity:dragging===idx?0.6:1}}>
                <span style={{fontSize:10,opacity:0.8,background:'rgba(0,0,0,0.2)',borderRadius:10,padding:'0 5px'}}>{idx+1}</span>
                {step.label}
                <span onClick={()=>remove(idx)} style={{marginLeft:2,cursor:'pointer',fontWeight:800,fontSize:14,opacity:0.8}}>\xd7</span>
              </div>
              {idx<value.length-1&&<span style={{color:C.muted,fontSize:16}}>\u2192</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProcessCostTable({steps=[],costs={},onChange}){
  const update=(key,field,val)=>onChange({...costs,[key]:{...(costs[key]||{}),[field]:val}});
  if(steps.length===0)return(
    <div style={{padding:'16px',background:C.surface2,borderRadius:8,fontSize:13,color:C.muted,textAlign:'center',border:`2px dashed ${C.border}`}}>
      No process steps defined. Add them in Stage 1 first, then come back here to set job charges.
    </div>
  );
  return(
    <div style={{overflowX:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
        <thead>
          <tr style={{background:C.surface2}}>
            {['Step','Job Worker Name','Rate (\u20b9/m)','Qty Basis','Shortage %','Notes'].map(h=>(
              <th key={h} style={{padding:'8px 10px',textAlign:'left',fontWeight:700,color:C.muted,whiteSpace:'nowrap'}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {steps.map((step,idx)=>{
            const key=step._uid||step.id+idx;
            const c=costs[key]||{};
            const isSchiffliStep=step.id==='schiffli';
            return(
              <tr key={key} style={{borderBottom:`1px solid ${C.border}`,background:isSchiffliStep?'#f5f3ff':'transparent'}}>
                <td style={{padding:'8px 10px'}}>
                  <span style={{padding:'3px 10px',borderRadius:12,background:`${step.color}22`,color:step.color,fontWeight:600,whiteSpace:'nowrap'}}>
                    {idx+1}. {step.label}
                  </span>
                </td>
                <td style={{padding:'8px 10px'}}>
                  <input value={c.job_worker||''} onChange={e=>update(key,'job_worker',e.target.value)}
                    placeholder="Job worker name"
                    style={{width:130,padding:'5px 8px',border:`1.5px solid ${C.border}`,borderRadius:6,fontSize:12}}/>
                </td>
                <td style={{padding:'8px 10px'}}>
                  <input type="number" step="0.01" min="0" value={c.rate||''}
                    onChange={e=>update(key,'rate',e.target.value)} placeholder="0.00"
                    style={{width:80,padding:'5px 8px',border:`1.5px solid ${C.border}`,borderRadius:6,fontSize:12}}/>
                </td>
                <td style={{padding:'8px 10px'}}>
                  <div style={{display:'flex',gap:8}}>
                    {['input','output'].map(basis=>(
                      <label key={basis} style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',fontSize:11,fontWeight:600}}>
                        <input type="radio" name={`qty_basis_${key}`} value={basis}
                          checked={(c.qty_basis||'input')===basis}
                          onChange={()=>update(key,'qty_basis',basis)}/>
                        {basis.charAt(0).toUpperCase()+basis.slice(1)}
                      </label>
                    ))}
                  </div>
                </td>
                <td style={{padding:'8px 10px'}}>
                  <input type="number" step="0.01" min="0" max="100" value={c.shortage||''}
                    onChange={e=>update(key,'shortage',e.target.value)} placeholder="0"
                    style={{width:60,padding:'5px 8px',border:`1.5px solid ${C.border}`,borderRadius:6,fontSize:12}}/>
                </td>
                <td style={{padding:'8px 10px'}}>
                  <input value={c.notes||''} onChange={e=>update(key,'notes',e.target.value)}
                    placeholder={isSchiffliStep?'e.g. 100\xd7100 thread':'Optional'}
                    style={{width:'100%',padding:'5px 8px',border:`1.5px solid ${C.border}`,borderRadius:6,fontSize:12}}/>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{marginTop:8,fontSize:11,color:C.muted,background:'#f0fdf4',padding:'6px 12px',borderRadius:6}}>
        \u{1F4A1} <strong>Input Qty</strong> = cost on fabric going into this step. <strong>Output Qty</strong> = cost on fabric coming out. Shortage % cascades step-by-step.
      </div>
    </div>
  );
}

function SchiffliSection({f,up}){
  return(
    <div style={{padding:20,background:'#f5f3ff',borderRadius:10,border:'1.5px solid #c4b5fd'}}>
      <div style={{fontSize:13,fontWeight:700,color:'#5b21b6',marginBottom:14}}>\u{1FAA1} Schiffli / Hakoba Details</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
        <div><label style={labelStyle}>Thread Count (H)</label>
          <input style={inputStyle} type="number" min="0" value={f.schiffliThreadH||''} onChange={e=>up('schiffliThreadH',e.target.value)} placeholder="e.g. 100"/></div>
        <div><label style={labelStyle}>Thread Count (V)</label>
          <input style={inputStyle} type="number" min="0" value={f.schiffliThreadV||''} onChange={e=>up('schiffliThreadV',e.target.value)} placeholder="e.g. 100"/></div>
        <div><label style={labelStyle}>Machine Width</label>
          <input style={inputStyle} value={f.schiffliWidth||''} onChange={e=>up('schiffliWidth',e.target.value)} placeholder='e.g. 44"'/></div>
      </div>
    </div>
  );
}

function FancyFinishSection({f,up}){
  const availableThreads=f.vaType?(THREAD_OPTIONS[f.vaType]||[]):[];
  return(
    <div style={{padding:20,background:'#fff7ed',borderRadius:10,border:'1.5px solid #fed7aa'}}>
      <div style={{fontSize:13,fontWeight:700,color:'#c2410c',marginBottom:14}}>\u2728 Fancy Finish \u2014 Value Addition Details</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div><label style={labelStyle}>Value Addition Type</label>
          <select style={inputStyle} value={f.vaType||''} onChange={e=>up('vaType',e.target.value)}>
            <option value="">\u2014 Select VA Type \u2014</option>
            {Object.keys(VA_CODES).map(k=><option key={k} value={k}>{k}</option>)}
          </select></div>
        <div><label style={labelStyle}>Thread Type</label>
          <select style={inputStyle} value={f.threadType||''} onChange={e=>up('threadType',e.target.value)}>
            <option value="">\u2014 Select Thread \u2014</option>
            {availableThreads.map(k=><option key={k} value={k}>{k}</option>)}
          </select></div>
        <div><label style={labelStyle}>Concept</label>
          <select style={inputStyle} value={f.concept||''} onChange={e=>up('concept',e.target.value)}>
            <option value="">\u2014 Select Concept \u2014</option>
            {Object.keys(CONCEPT_CODES).map(k=><option key={k} value={k}>{k}</option>)}
          </select></div>
        <div><label style={labelStyle}>Placement</label>
          <select style={inputStyle} value={f.placement||''} onChange={e=>up('placement',e.target.value)}>
            <option value="">\u2014 Select Placement \u2014</option>
            {Object.keys(PLACEMENT_CODES).map(k=><option key={k} value={k}>{k}</option>)}
          </select></div>
        <div><label style={labelStyle}>Job Work Unit</label>
          <input style={inputStyle} value={f.jobWorkUnit||''} onChange={e=>up('jobWorkUnit',e.target.value)} placeholder="e.g. per metre, per piece"/></div>
      </div>
    </div>
  );
}

function Section({title,icon,children,accent}){
  return(
    <div style={{marginBottom:20,padding:20,background:C.surface2,borderRadius:12,border:`1px solid ${C.border}`,borderLeft:accent?`4px solid ${accent}`:undefined}}>
      {title&&<div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14,display:'flex',alignItems:'center',gap:8}}>{icon&&<span>{icon}</span>} {title}</div>}
      {children}
    </div>
  );
}

function TallyBadge({status,onCheck}){
  const map={
    online:{bg:'#f0fdf4',border:'#86efac',color:'#166534',dot:'#10b981',label:'Tally Online'},
    offline:{bg:'#fef2f2',border:'#fca5a5',color:'#991b1b',dot:'#ef4444',label:'Tally Offline'},
    checking:{bg:'#fffbeb',border:'#fcd34d',color:'#92400e',dot:'#f59e0b',label:'Checking\u2026'},
    unknown:{bg:'#f8fafc',border:'#e2e8f0',color:'#64748b',dot:'#94a3b8',label:'Tally: Unknown'},
  };
  const s=map[status]||map.unknown;
  return(
    <div onClick={onCheck} title="Click to recheck"
      style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 12px',borderRadius:20,
        background:s.bg,border:`1.5px solid ${s.border}`,color:s.color,fontSize:12,fontWeight:600,cursor:'pointer'}}>
      <span style={{width:8,height:8,borderRadius:'50%',background:s.dot,display:'inline-block'}}/>
      {s.label}
    </div>
  );
}

export default function FinishFabricForm(){
  const {id}=useParams();
  const [searchParams]=useSearchParams();
  const navigate=useNavigate();
  const {toast}=useToast();
  const isEdit=Boolean(id);
  const fileRef=useRef(null);

  const stageParam=parseInt(searchParams.get('stage')||'1',10);
  const [stage,setStage]=useState(isEdit?stageParam:1);
  const [savedId,setSavedId]=useState(isEdit?id:null);

  const [mode,setMode]=useState('search');
  const [nameSearch,setNameSearch]=useState('');
  const [searchResults,setSearchResults]=useState([]);
  const [searching,setSearching]=useState(false);
  const debouncedSearch=useDebounce(nameSearch,400);

  const [tallyStatus,setTallyStatus]=useState('unknown');
  const [tallyItems,setTallyItems]=useState([]);
  const [tallySynced,setTallySynced]=useState(false);
  const [tallyResult,setTallyResult]=useState(null);

  const [bases,setBases]=useState([]);

  const [f1,setF1]=useState({
    baseFabricId:'',baseFabricName:'',shortCode:'',
    fabricCategory:'mill_print',width:'44"',tag:'Regular',fabricClass:'Regular',
    confirmName:'',hsnCode:'5208',gstRate:'',tallyGroup:'Finish Fabrics',
    processSteps:[],colourConcept:'',status:'active',
    vaType:'',threadType:'',concept:'',placement:'',jobWorkUnit:'',
    schiffliThreadH:'',schiffliThreadV:'',schiffliWidth:'',
  });
  const [f2,setF2]=useState({
    designNo:'',imageUrl:'',processCosts:{},
    lumpPrice:'',cutPackPrice:'',notes:'',ecomVisible:false,
  });

  const [saving1,setSaving1]=useState(false);
  const [saving2,setSaving2]=useState(false);
  const [imgFile,setImgFile]=useState(null);
  const [imgPreview,setImgPreview]=useState('');
  const [uploading,setUploading]=useState(false);

  const isFancy=f1.fabricCategory==='fancy';
  const isSchiffli=f1.fabricCategory==='schiffli';
  const isSolidDyed=f1.fabricCategory==='solid_dyed';

  const up1=(field,val)=>setF1(p=>({...p,[field]:val}));
  const up2=(field,val)=>setF2(p=>({...p,[field]:val}));

  useEffect(()=>{
    if(!isEdit)return;
    setMode('builder');
    FinishFabricService.getById(id).then(rec=>{
      let parsedSteps=[],parsedCosts={};
      try{parsedSteps=rec.process_steps?JSON.parse(rec.process_steps):[];}catch{}
      try{parsedCosts=rec.process_costs?JSON.parse(rec.process_costs):{};}catch{}
      setF1({
        baseFabricId:rec.base_fabric_id||'',
        baseFabricName:rec.base_fabrics?.base_fabric_name||'',
        shortCode:rec.base_fabrics?.short_code||'',
        fabricCategory:rec.fabric_category||'mill_print',
        width:rec.finish_width||'44"',
        tag:rec.tag||'Regular',
        fabricClass:rec.class||'Regular',
        confirmName:rec.finish_fabric_name||'',
        hsnCode:rec.hsn_code||'5208',
        gstRate:rec.gst_rate||'',
        tallyGroup:rec.tally_group||'Finish Fabrics',
        processSteps:parsedSteps,
        colourConcept:rec.design_concept||'',
        status:rec.status||'active',
        vaType:rec.va_type||'',
        threadType:rec.thread_type||'',
        concept:rec.concept||'',
        placement:rec.placement||'',
        jobWorkUnit:rec.job_work_unit||'',
        schiffliThreadH:rec.schiffli_thread_h||'',
        schiffliThreadV:rec.schiffli_thread_v||'',
        schiffliWidth:rec.schiffli_width||'',
      });
      setF2({
        designNo:rec.design_no||'',
        imageUrl:rec.design_image_url||'',
        processCosts:parsedCosts,
        lumpPrice:rec.lump_price||'',
        cutPackPrice:rec.cut_pack_price||'',
        notes:rec.notes||'',
        ecomVisible:rec.ecom_visible||false,
      });
      setImgPreview(rec.design_image_url||'');
      setTallySynced(rec.tally_synced||false);
    }).catch(err=>toast({variant:'destructive',title:'Load error',description:err.message}));
  },[id,isEdit]);

  useEffect(()=>{
    supabase.from('base_fabrics')
      .select('id,base_fabric_name,fabric_name,short_code,sku,hsn_code,gst_rate')
      .eq('status','active').order('base_fabric_name')
      .then(({data})=>setBases(data||[]));
  },[]);

  const checkTally=useCallback(async()=>{
    setTallyStatus('checking');
    try{
      const r=await fetch('https://tally.shreerangtrendz.com',{method:'GET',signal:AbortSignal.timeout(5000)});
      setTallyStatus(r.ok||r.status===400?'online':'offline');
    }catch{setTallyStatus('offline');}
  },[]);
  useEffect(()=>{checkTally();},[checkTally]);

  const fetchTallyItems=useCallback(async()=>{
    if(tallyStatus!=='online')return;
    try{
      const res=await fetch('https://tally.shreerangtrendz.com',{
        method:'POST',headers:{'Content-Type':'text/xml'},
        body:'<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Stock Items</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>Shreerang Trendz</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>',
      });
      const xml=await res.text();
      const matches=[...xml.matchAll(/<n>(.*?)<\/n>/gi)];
      setTallyItems(matches.map(m=>m[1]).filter(Boolean));
    }catch{}
  },[tallyStatus]);
  useEffect(()=>{fetchTallyItems();},[fetchTallyItems]);

  const liveName=buildFinishFabricName({...f1,processPath:'',processSteps:f1.processSteps});
  const liveSKU=buildFinishFabricSKU({...f1,processPath:'',processSteps:f1.processSteps});
  useEffect(()=>{if(!isEdit)setF1(p=>({...p,confirmName:liveName}));},[liveName,isEdit]);

  useEffect(()=>{
    if(!debouncedSearch||mode!=='search')return;
    setSearching(true);
    FinishFabricService.searchByName(debouncedSearch)
      .then(setSearchResults).catch(console.error).finally(()=>setSearching(false));
  },[debouncedSearch,mode]);

  const handleBaseSelect=(bId)=>{
    const b=bases.find(x=>x.id===bId);
    if(!b){setF1(p=>({...p,baseFabricId:'',baseFabricName:'',shortCode:''}));return;}
    setF1(p=>({...p,baseFabricId:b.id,baseFabricName:b.base_fabric_name||b.fabric_name||'',
      shortCode:b.short_code||b.sku||'',hsnCode:p.hsnCode||b.hsn_code||'5208',gstRate:p.gstRate||b.gst_rate||''}));
  };

  const handleImageChange=(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    setImgFile(file);setImgPreview(URL.createObjectURL(file));
  };

  const handleSaveStage1=async(skipTally=false)=>{
    if(!f1.confirmName.trim()){
      toast({variant:'destructive',title:'Name required',description:'Confirm the finish fabric name before saving.'});
      return;
    }
    setSaving1(true);
    try{
      const dbRecord={
        finish_fabric_name:f1.confirmName.trim(),
        fabric_category:f1.fabricCategory||'mill_print',
        base_fabric_id:f1.baseFabricId||null,
        process_steps:f1.processSteps?.length>0?JSON.stringify(f1.processSteps):null,
        process_path:f1.processSteps?.map(s=>s.code||s.id).join('-')||null,
        class:f1.fabricClass||'Regular',
        tag:f1.tag||'Regular',
        finish_width:f1.width||null,
        design_concept:f1.colourConcept||null,
        hsn_code:f1.hsnCode||'5208',
        gst_rate:f1.gstRate?parseFloat(f1.gstRate):null,
        tally_group:f1.tallyGroup||'Finish Fabrics',
        va_type:f1.vaType||null,
        thread_type:f1.threadType||null,
        concept:f1.concept||null,
        placement:f1.placement||null,
        job_work_unit:f1.jobWorkUnit||null,
        schiffli_thread_h:f1.schiffliThreadH?parseInt(f1.schiffliThreadH):null,
        schiffli_thread_v:f1.schiffliThreadV?parseInt(f1.schiffliThreadV):null,
        schiffli_width:f1.schiffliWidth||null,
        status:f1.status||'active',
        generated_sku:liveSKU||null,
        updated_at:new Date().toISOString(),
      };
      let currentId=isEdit?id:savedId;
      if(isEdit||currentId){
        const{error}=await supabase.from('finish_fabrics').update(dbRecord).eq('id',currentId);
        if(error)throw error;
      }else{
        dbRecord.created_at=new Date().toISOString();dbRecord.tally_synced=false;
        const{data,error}=await supabase.from('finish_fabrics').insert([dbRecord]).select('id').single();
        if(error)throw error;
        currentId=data.id;setSavedId(currentId);
      }
      let tr={success:false,skipped:skipTally};
      if(!skipTally){
        try{
          const tallyRes=await fetch('/api/tally-push',{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({itemName:f1.confirmName.trim(),tallyGroup:f1.tallyGroup||'Finish Fabrics',hsnCode:f1.hsnCode,gstRate:f1.gstRate?parseFloat(f1.gstRate):5,unit:'Mtr'}),
          });
          const tallyData=await tallyRes.json();
          if(tallyData.success){
            tr={success:true};
            await supabase.from('finish_fabrics').update({tally_synced:true,tally_item_name:f1.confirmName.trim(),tally_synced_at:new Date().toISOString()}).eq('id',currentId);
            setTallySynced(true);
          }else{tr={success:false,error:tallyData.tally_error||tallyData.error||'Tally push failed'};}
        }catch(tallyErr){tr={success:false,error:tallyErr.message};}
      }
      setTallyResult(tr);
      if(tr.success)toast({title:'\u2705 Saved & Tally synced!',description:`"${f1.confirmName}" ready. Now add Design No, Images & Costing \u2192`});
      else if(skipTally)toast({title:'\u2705 Saved!',description:'Fabric name saved. Add design details in Stage 2 \u2192'});
      else toast({variant:'destructive',title:'\u2705 Saved \u26a0\ufe0f Tally offline',description:'Record saved. Tally sync can be done later from the fabric list.'});
      setStage(2);
    }catch(err){
      toast({variant:'destructive',title:'Save failed',description:err.message});
    }finally{setSaving1(false);}
  };

  const handleSaveStage2=async()=>{
    const currentId=isEdit?id:savedId;
    if(!currentId){toast({variant:'destructive',title:'Complete Stage 1 first',description:'Save the fabric name before adding design details.'});return;}
    setSaving2(true);
    try{
      let imageUrl=f2.imageUrl;
      if(imgFile){setUploading(true);imageUrl=await uploadToBunny(imgFile);setUploading(false);up2('imageUrl',imageUrl);}
      const dbRecord={
        base_fabric_id:f1.baseFabricId||null,
        design_no:f2.designNo||null,
        design_image_url:imageUrl||null,
        process_costs:Object.keys(f2.processCosts||{}).length>0?JSON.stringify(f2.processCosts):null,
        lump_price:f2.lumpPrice?parseFloat(f2.lumpPrice):null,
        cut_pack_price:f2.cutPackPrice?parseFloat(f2.cutPackPrice):null,
        notes:f2.notes||null,
        ecom_visible:f2.ecomVisible||false,
        updated_at:new Date().toISOString(),
      };
      const{error}=await supabase.from('finish_fabrics').update(dbRecord).eq('id',currentId);
      if(error)throw error;
      toast({title:'\u2705 All details saved!',description:'Design number, images, costing and pricing updated.'});
      setTimeout(()=>navigate('/admin/fabric/finish'),1200);
    }catch(err){
      toast({variant:'destructive',title:'Save failed',description:err.message});
    }finally{setSaving2(false);setUploading(false);}
  };

  return(
    <div style={{fontFamily:"'DM Sans','Segoe UI',sans-serif",background:'#f4f9f8',minHeight:'100vh',color:C.text}}>
      <div style={{background:`linear-gradient(135deg,${C.tealDark} 0%,#1a4a44 100%)`,padding:'16px 28px',
        display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 2px 12px rgba(0,0,0,0.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <span style={{fontSize:26}}>\u{1F9F5}</span>
          <div>
            <div style={{color:'#fff',fontWeight:700,fontSize:18}}>{isEdit?'Edit Finish Fabric':'New Finish Fabric'}</div>
            <div style={{color:'#81c5bc',fontSize:12,marginTop:2}}>All categories unified \xb7 Save name first \u2192 then design number, images & costing</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <TallyBadge status={tallyStatus} onCheck={checkTally}/>
          {tallySynced&&<span style={{fontSize:12,color:'#86efac',fontWeight:600}}>\u2713 Tally Synced</span>}
          <button onClick={()=>navigate('/admin/fabric/finish')}
            style={{padding:'6px 16px',borderRadius:8,background:'rgba(255,255,255,0.15)',color:'#fff',border:'none',cursor:'pointer',fontSize:13}}>
            \u2190 Back
          </button>
        </div>
      </div>
      <div style={{maxWidth:960,margin:'0 auto',padding:'24px 20px'}}>
        {!isEdit&&mode==='search'&&(
          <Section title="Search or Create Finish Fabric" icon="\u{1F50D}" accent={C.teal}>
            <p style={{fontSize:13,color:C.muted,marginBottom:12}}>
              All categories (Mill Print, Digital, Embroidery, Schiffli, Solid Dyed, Fancy) are unified here. Search existing or create new.
            </p>
            <div style={{display:'flex',gap:10,marginBottom:16}}>
              <input style={{...inputStyle,flex:1}} autoFocus
                placeholder="Type fabric name (Rayon, Cotton, Hakoba\u2026)"
                value={nameSearch} onChange={e=>setNameSearch(e.target.value)}/>
              <button onClick={()=>setMode('builder')}
                style={{padding:'8px 20px',borderRadius:8,background:C.teal,color:'#fff',fontWeight:700,border:'none',cursor:'pointer',fontSize:13,whiteSpace:'nowrap'}}>
                + New Fabric
              </button>
            </div>
            {tallyItems.length>0&&nameSearch&&(
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>\u{1F4E6} Tally Matches</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {tallyItems.filter(n=>n.toLowerCase().includes(nameSearch.toLowerCase())).slice(0,12).map(name=>(
                    <button key={name} onClick={()=>{setF1(p=>({...p,confirmName:name}));setMode('builder');}}
                      style={{padding:'4px 12px',borderRadius:16,background:'#eff6ff',color:'#1d4ed8',fontSize:12,fontWeight:600,border:'1px solid #bfdbfe',cursor:'pointer'}}>
                      \u{1F4E6} {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {searching&&<div style={{color:C.muted,fontSize:13}}>Searching\u2026</div>}
            {!searching&&searchResults.length>0&&searchResults.map(r=>(
              <div key={r.id} onClick={()=>navigate(`/admin/fabric/finish-fabric-form/${r.id}`)}
                style={{padding:'10px 14px',borderRadius:8,background:'#fff',border:`1px solid ${C.border}`,marginBottom:6,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}
                onMouseEnter={e=>e.currentTarget.style.background=C.tealLight}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                <div>
                  <div style={{fontWeight:600,fontSize:13}}>{r.finish_fabric_name}</div>
                  <div style={{fontSize:11,color:C.muted}}>{r.fabric_category} \xb7 {r.status}</div>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  {r.design_no&&<span style={{fontSize:11,color:C.gold,fontWeight:600}}>D: {r.design_no}</span>}
                  {r.tally_synced&&<span style={{fontSize:11,color:C.green,fontWeight:600}}>\u2713 Tally</span>}
                </div>
              </div>
            ))}
            {!searching&&nameSearch&&searchResults.length===0&&(
              <div style={{fontSize:13,color:C.muted,fontStyle:'italic'}}>Not found. Click "+ New Fabric" to create.</div>
            )}
          </Section>
        )}
        {(isEdit||mode==='builder')&&(
          <>
            <StageBar stage={stage} savedId={savedId}/>
            <div style={{display:'flex',gap:6,marginBottom:20}}>
              <button onClick={()=>setStage(1)}
                style={{padding:'8px 20px',borderRadius:8,fontWeight:700,fontSize:13,border:'none',cursor:'pointer',
                  background:stage===1?C.teal:'#e2e8f0',color:stage===1?'#fff':C.muted}}>
                Stage 1: Name & Identity
              </button>
              <button onClick={()=>{if(savedId||isEdit)setStage(2);else toast({description:'Save Stage 1 first to unlock Stage 2.'});}}
                style={{padding:'8px 20px',borderRadius:8,fontWeight:700,fontSize:13,border:'none',
                  cursor:(savedId||isEdit)?'pointer':'not-allowed',
                  background:stage===2?C.gold:'#e2e8f0',
                  color:stage===2?'#fff':(savedId||isEdit)?C.muted:'#94a3b8',
                  opacity:(savedId||isEdit)?1:0.55}}>
                Stage 2: Design, Images & Costing {!(savedId||isEdit)&&'\u{1F512}'}
              </button>
            </div>
            {stage===1&&(
              <>
                <Section title="Fabric Category" icon="\u{1F5C2}\ufe0f" accent={C.teal}>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:6}}>
                    {FABRIC_CATEGORIES.map(cat=>(
                      <button key={cat.value} type="button" onClick={()=>up1('fabricCategory',cat.value)}
                        style={{padding:'8px 18px',borderRadius:20,border:`2px solid ${cat.color}`,
                          background:f1.fabricCategory===cat.value?cat.color:`${cat.color}18`,
                          color:f1.fabricCategory===cat.value?'#fff':cat.color,
                          fontWeight:700,fontSize:12,cursor:'pointer',transition:'all 0.15s'}}>
                        {cat.icon} {cat.label}
                      </button>
                    ))}
                  </div>
                  {isFancy&&<div style={{fontSize:12,color:C.orange,fontStyle:'italic',marginTop:4}}>\u2728 Fancy \u2014 VA fields appear below</div>}
                  {isSchiffli&&<div style={{fontSize:12,color:C.schiffli,fontStyle:'italic',marginTop:4}}>\u{1FAA1} Schiffli \u2014 thread count fields appear below</div>}
                </Section>
                <Section title="Core Identity" icon="\u{1F4CB}" accent={C.teal}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                    </div>
                    <div>
                      <label style={labelStyle}>Width</label>
                      <select style={inputStyle} value={f1.width} onChange={e=>up1('width',e.target.value)}>
                        {['44"','54"','56"','58"','60"'].map(w=><option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Tag / Quality</label>
                      <select style={inputStyle} value={f1.tag} onChange={e=>up1('tag',e.target.value)}>
                        <option value="Regular">Regular</option>
                        <option value="Discharge">Discharge</option>
                        <option value="Premium">Premium</option>
                        <option value="Premium Discharge">Premium Discharge</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Class</label>
                      <select style={inputStyle} value={f1.fabricClass} onChange={e=>up1('fabricClass',e.target.value)}>
                        <option value="Regular">Regular</option>
                        <option value="Premium">Premium</option>
                        <option value="Khadi">Khadi</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Colour / Concept</label>
                      <input style={inputStyle} value={f1.colourConcept} onChange={e=>up1('colourConcept',e.target.value)} placeholder="e.g. Floral, Stripe, Solid"/>
                    </div>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <select style={inputStyle} value={f1.status} onChange={e=>up1('status',e.target.value)}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </div>
                  </div>
                </Section>
                <Section title="Process Path & Sequence" icon="\u2699\ufe0f" accent={C.blue}>
                  <ProcessPathBuilder value={f1.processSteps} onChange={steps=>up1('processSteps',steps)}/>
                  <div style={{marginTop:12,padding:'8px 12px',background:'#eff6ff',borderRadius:8,fontSize:11,color:'#1e40af'}}>
                    \u{1F4A1} One fabric can pass through any number of process steps in sequence. Serial order drives cost calculation in Stage 2.
                  </div>
                </Section>
                {isSchiffli&&<Section accent={C.schiffli}><SchiffliSection f={f1} up={up1}/></Section>}
                {isFancy&&<Section accent={C.orange}><FancyFinishSection f={f1} up={up1}/></Section>}
                <Section title="Tally & Accounting" icon="\u{1F4CA}" accent={C.teal}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
                    <div>
                      <label style={labelStyle}>Tally Group</label>
                      <select style={inputStyle} value={f1.tallyGroup} onChange={e=>up1('tallyGroup',e.target.value)}>
                        {TALLY_GROUPS.map(g=><option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>HSN Code</label>
                      <input style={inputStyle} value={f1.hsnCode} onChange={e=>up1('hsnCode',e.target.value)} placeholder="5208"/>
                    </div>
                    <div>
                      <label style={labelStyle}>GST Rate (%)</label>
                      <input type="number" step="0.01" min="0" style={inputStyle} value={f1.gstRate} onChange={e=>up1('gstRate',e.target.value)} placeholder="5"/>
                    </div>
                  </div>
                </Section>
                <Section title="Live Name Preview & Confirm" icon="\u{1F3F7}\ufe0f" accent={C.green}>
                  <div style={{background:'#f0fdf4',borderRadius:10,padding:16,marginBottom:14,border:'1px solid #86efac'}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.green,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Auto-Generated Name</div>
                    <div style={{fontSize:16,fontWeight:700,color:C.tealDark,marginBottom:6}}>
                      {liveName||<span style={{color:C.muted,fontWeight:400}}>Fill in details above\u2026</span>}
                    </div>
                    <div style={{fontSize:12,color:C.muted}}>
                      SKU: <span style={{fontFamily:'monospace',background:'#dcfce7',padding:'2px 8px',borderRadius:4,color:C.green,fontWeight:700}}>{liveSKU||'-'}</span>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Confirm / Override Name * \u2014 exact name pushed to Tally</label>
                    <input style={{...inputStyle,fontWeight:700,fontSize:14,borderColor:f1.confirmName?C.green:C.error}}
                      value={f1.confirmName} onChange={e=>up1('confirmName',e.target.value)}
                      placeholder="Final fabric name as it will appear in Tally\u2026"/>
                    {f1.confirmName&&tallyItems.some(n=>n===f1.confirmName)&&(
                      <div style={{marginTop:6,fontSize:12,color:C.blue,fontWeight:600}}>
                        \u2139\ufe0f Name already exists in Tally \u2014 saving will update / match it.
                      </div>
                    )}
                  </div>
                </Section>
                <div style={{padding:'12px 16px',borderRadius:10,marginBottom:20,
                  background:tallyStatus==='online'?'#f0fdf4':'#fef2f2',
                  border:`1px solid ${tallyStatus==='online'?'#86efac':'#fca5a5'}`,
                  fontSize:13,display:'flex',alignItems:'center',gap:8}}>
                  <span>{tallyStatus==='online'?'\u2705':'\u26a0\ufe0f'}</span>
                  <span style={{color:tallyStatus==='online'?'#166534':'#991b1b'}}>
                    {tallyStatus==='online'
                      ?'Tally is ONLINE \u2014 item will be created / updated in Tally on save.'
                      :'Tally is OFFLINE. Record saved to website. Sync to Tally later.'}
                  </span>
                </div>
                {tallyResult&&!tallyResult.skipped&&(
                  <div style={{padding:'10px 16px',borderRadius:10,marginBottom:16,
                    background:tallyResult.success?'#f0fdf4':'#fff7ed',
                    border:`1px solid ${tallyResult.success?'#86efac':'#fed7aa'}`,
                    color:tallyResult.success?'#166534':'#9a3412',fontSize:13,fontWeight:600}}>
                    {tallyResult.success?`\u2705 Tally synced: "${f1.confirmName}"`:`\u26a0\ufe0f Tally: ${tallyResult.error}`}
                  </div>
                )}
                <div style={{display:'flex',gap:12,flexWrap:'wrap',background:'#fff',padding:16,borderRadius:12,border:`2px solid ${C.teal}`,boxShadow:'0 2px 12px rgba(43,168,152,0.12)'}}>
                  <div style={{width:'100%'}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:10,textTransform:'uppercase',letterSpacing:0.8}}>
                      Step 1 of 2 \u2014 Save Fabric Name & Push to Tally, then unlock Design & Costing
                    </div>
                    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                      <button onClick={()=>handleSaveStage1(false)} disabled={saving1}
                        style={{padding:'12px 32px',borderRadius:10,fontWeight:700,fontSize:15,border:'none',cursor:'pointer',
                          background:saving1?'#94a3b8':C.teal,color:'#fff'}}>
                        {saving1?'\u23f3 Saving\u2026':isEdit?'\u{1F4BE} Save & Sync Tally':'\u2705 Save Name & Continue \u2192'}
                      </button>
                      <button onClick={()=>handleSaveStage1(true)} disabled={saving1}
                        style={{padding:'12px 24px',borderRadius:10,fontWeight:600,fontSize:14,border:`1.5px solid ${C.border}`,cursor:'pointer',background:'#fff',color:C.muted}}>
                        Save Only (Skip Tally)
                      </button>
                      <button onClick={()=>mode==='builder'&&!isEdit?setMode('search'):navigate('/admin/fabric/finish')}
                        style={{padding:'12px 20px',borderRadius:10,fontWeight:600,fontSize:14,border:`1.5px solid ${C.border}`,cursor:'pointer',background:'#fff',color:C.muted}}>
                        Cancel
                      </button>
                    </div>
                    {!isEdit&&<div style={{fontSize:11,color:C.muted,marginTop:8}}>
                      After saving: Stage 2 unlocks to add Design Number, Images, Job Worker Charges & Pricing.
                    </div>}
                  </div>
                </div>
              </>
            )}
            {stage===2&&(savedId||isEdit)&&(
              <>
                <div style={{padding:'12px 18px',background:'#f0fdf4',borderRadius:10,border:'1px solid #86efac',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontSize:22}}>\u{1F3F7}\ufe0f</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14,color:C.tealDark}}>{f1.confirmName}</div>
                    <div style={{fontSize:11,color:C.muted}}>
                      {f1.fabricCategory} \xb7 {f1.width} \xb7 {f1.tag}
                      {f1.processSteps?.length>0&&<> \xb7 {f1.processSteps.map(s=>s.label).join(' \u2192 ')}</>}
                    </div>
                  </div>
                  <button onClick={()=>setStage(1)}
                    style={{padding:'5px 12px',borderRadius:7,border:`1px solid ${C.border}`,background:'#fff',color:C.muted,cursor:'pointer',fontSize:12}}>
                    \u2190 Edit Name
                  </button>
                </div>
                <Section title="Base Fabric Mapping" icon="\u{1F9F6}" accent={C.teal}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                    <div style={{gridColumn:'1/-1'}}>
                      <label style={labelStyle}>Base Fabric <span style={{color:C.green,fontWeight:400,textTransform:'none',fontSize:10}}>(map now that the finish fabric name is set)</span></label>
                      <select style={inputStyle} value={f1.baseFabricId} onChange={e=>handleBaseSelect(e.target.value)}>
                        <option value="">\u2014 Select Base Fabric \u2014</option>
                        {bases.map(b=><option key={b.id} value={b.id}>{b.base_fabric_name||b.fabric_name}</option>)}
                      </select>
                      {f1.baseFabricName&&<div style={{fontSize:11,color:C.green,marginTop:5,fontWeight:600}}>\u2714 {f1.baseFabricName} \xb7 SKU prefix: {f1.shortCode}</div>}
                      {!f1.baseFabricName&&<div style={{fontSize:11,color:C.muted,marginTop:4}}>Optional \u2014 leave blank if base fabric not registered yet</div>}
                    </div>
                  </div>
                </Section>
<Section title={isSolidDyed?'Colour Number':'Design Number'} icon="\u{1F3A8}" accent={C.gold}>
                  <label style={labelStyle}>{isSolidDyed?'Colour Number (for this dye lot)':'Design Number / Design Code'}</label>
                  <input style={{...inputStyle,fontSize:15,fontWeight:600}}
                    value={f2.designNo} onChange={e=>up2('designNo',e.target.value)}
                    placeholder={isSolidDyed?'C-001, C-002\u2026':'D-1234 or your design code'}/>
                  <div style={{fontSize:11,color:C.muted,marginTop:5}}>
                    \u{1F4A1} Design Number is used at job card / voucher time to calculate process costs across all steps automatically.
                  </div>
                </Section>
                <Section title="Design Image" icon="\u{1F5BC}\ufe0f" accent={C.gold}>
                  <div style={{display:'flex',gap:16,alignItems:'flex-start',flexWrap:'wrap'}}>
                    {imgPreview&&(
                      <div style={{position:'relative'}}>
                        <img src={imgPreview} alt="preview" style={{width:120,height:120,objectFit:'cover',borderRadius:10,border:`2px solid ${C.border}`}}/>
                        <button type="button" onClick={()=>{setImgFile(null);setImgPreview('');up2('imageUrl','');}}
                          style={{position:'absolute',top:-8,right:-8,width:22,height:22,borderRadius:'50%',background:C.error,color:'#fff',border:'none',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          \xd7
                        </button>
                      </div>
                    )}
                    <div>
                      <button type="button" onClick={()=>fileRef.current?.click()}
                        style={{padding:'10px 20px',borderRadius:8,background:C.surface2,border:`2px dashed ${C.border}`,cursor:'pointer',fontSize:13,fontWeight:600,color:C.muted,display:'flex',alignItems:'center',gap:8}}>
                        \u{1F4F8} {imgPreview?'Change Image':'Upload Design Image'}
                      </button>
                      <div style={{fontSize:11,color:C.muted,marginTop:6}}>JPG / PNG \xb7 Uploaded to Bunny CDN \xb7 Shown in e-commerce catalogue</div>
                      <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImageChange}/>
                    </div>
                  </div>
                </Section>
                <Section title="Job Charges & Costing \u2014 per Process Step" icon="\u{1F4B0}" accent={C.gold}>
                  <ProcessCostTable steps={f1.processSteps} costs={f2.processCosts} onChange={costs=>up2('processCosts',costs)}/>
                </Section>
                <Section title="Fabric Pricing" icon="\u{1F4B5}" accent={C.gold}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                    <div>
                      <label style={labelStyle}>Lump Price (\u20b9/m) \u2014 50m+ / colour / design</label>
                      <input type="number" step="0.01" min="0" style={inputStyle} value={f2.lumpPrice} onChange={e=>up2('lumpPrice',e.target.value)} placeholder="0.00"/>
                    </div>
                    <div>
                      <label style={labelStyle}>Cut Pack Price (\u20b9/m) \u2014 ~20m smaller orders</label>
                      <input type="number" step="0.01" min="0" style={inputStyle} value={f2.cutPackPrice} onChange={e=>up2('cutPackPrice',e.target.value)} placeholder="0.00"/>
                    </div>
                  </div>
                </Section>
                <Section title="Notes & E-commerce" icon="\u{1F6D2}" accent={C.teal}>
                  <div style={{marginBottom:14}}>
                    <label style={labelStyle}>Internal Notes</label>
                    <textarea style={{...inputStyle,minHeight:70,resize:'vertical'}} value={f2.notes} onChange={e=>up2('notes',e.target.value)} placeholder="Any internal notes\u2026"/>
                  </div>
                  <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontSize:13,fontWeight:600}}>
                    <input type="checkbox" checked={f2.ecomVisible} onChange={e=>up2('ecomVisible',e.target.checked)}/>
                    Show on e-commerce store / customer catalogue
                  </label>
                </Section>
                <div style={{display:'flex',gap:12,flexWrap:'wrap',background:'#fff',padding:16,borderRadius:12,border:`2px solid ${C.gold}`,boxShadow:'0 2px 12px rgba(212,146,10,0.12)'}}>
                  <div style={{width:'100%'}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.muted,marginBottom:10,textTransform:'uppercase',letterSpacing:0.8}}>
                      Step 2 of 2 \u2014 Save Design Details & Costing
                    </div>
                    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                      <button onClick={handleSaveStage2} disabled={saving2||uploading}
                        style={{padding:'12px 32px',borderRadius:10,fontWeight:700,fontSize:15,border:'none',cursor:'pointer',
                          background:saving2||uploading?'#94a3b8':C.gold,color:'#fff'}}>
                        {saving2?'\u23f3 Saving\u2026':uploading?'\u{1F4E4} Uploading\u2026':'\u2705 Save Details & Done'}
                      </button>
                      <button onClick={()=>setStage(1)}
                        style={{padding:'12px 20px',borderRadius:10,fontWeight:600,fontSize:14,border:`1.5px solid ${C.border}`,cursor:'pointer',background:'#fff',color:C.muted}}>
                        \u2190 Back to Stage 1
                      </button>
                      <button onClick={()=>navigate('/admin/fabric/finish')}
                        style={{padding:'12px 20px',borderRadius:10,fontWeight:600,fontSize:14,border:`1.5px solid ${C.border}`,cursor:'pointer',background:'#fff',color:C.muted}}>
                        Save Later / Exit
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
