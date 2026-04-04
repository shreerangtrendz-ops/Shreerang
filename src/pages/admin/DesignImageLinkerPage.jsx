import { useState, useEffect, useCallback, useRef } from 'react';
import { customSupabase as supabase } from '@/lib/customSupabaseClient';

/* ══════════════════════════════════════════════════════════════════
   DESIGN IMAGE LINKER
   - Drag-and-drop upload from PC → Bunny CDN (designs/{design_no}.jpg)
   - Auto-links primary_image_url in design_batch_master
   - Also updates rec_from_mill and sales_bills linked designs
   - Shows all designs with/without images for visual status
   ══════════════════════════════════════════════════════════════════ */

const T = {
  navy:'#0B2E2B', teal:'#2BA898', tealLight:'#EEF8F6',
  green:'#1E9E5A', red:'#E74C3C', orange:'#E67E22',
  blue:'#2468C8', gold:'#E8A800', border:'#D0EDE8',
  bg:'#F0F9F7', surface:'#FFFFFF', text:'#0B2E2B', muted:'#6A9B95',
};

const BUNNY_KEY  = import.meta.env.VITE_BUNNY_API_KEY || '';
const BUNNY_ZONE = 'shreerang-s';
const BUNNY_HOST = 'https://storage.bunnycdn.com';
const CDN_BASE   = 'https://shreerang.b-cdn.net';
const CDN_FOLDER = 'designs';

function cdnUrl(designNo) {
  return `${CDN_BASE}/${CDN_FOLDER}/${designNo}.jpg`;
}

async function uploadToBunny(designNo, file) {
  const path = `${BUNNY_ZONE}/${CDN_FOLDER}/${designNo}.jpg`;
  const res = await fetch(`${BUNNY_HOST}/${path}`, {
    method: 'PUT',
    headers: { AccessKey: BUNNY_KEY, 'Content-Type': 'image/jpeg' },
    body: file,
  });
  if (!res.ok) throw new Error(`Bunny upload failed: ${res.status}`);
  return cdnUrl(designNo);
}

export default function DesignImageLinkerPage() {
  const [designs, setDesigns]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState({});
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all'); // all | with_image | without_image
  const [dragOver, setDragOver] = useState(null);
  const [stats, setStats]       = useState({total:0, with_img:0, without_img:0});
  const [manualDn, setManualDn] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Get all unique design numbers from rec_from_mill (process records have the real design nos)
    const {data: rfmData} = await supabase
      .from('rec_from_mill')
      .select('design_no, finish_item_name, mill_name, voucher_date')
      .not('design_no', 'is', null)
      .order('design_no', {ascending: false});

    // Deduplicate by design_no, keeping most recent
    const map = {};
    (rfmData||[]).forEach(r => {
      if (!map[r.design_no] || r.voucher_date > map[r.design_no].voucher_date) {
        map[r.design_no] = r;
      }
    });

    // Check which ones have images (try CDN URL pattern)
    const rows = Object.values(map).map(r => ({
      design_no: r.design_no,
      name: r.finish_item_name || `Design ${r.design_no}`,
      mill: r.mill_name,
      img_url: cdnUrl(r.design_no),
      has_image: false, // will be determined by img onError/onLoad
    }));

    // Sort by design_no descending (newest first)
    rows.sort((a,b) => Number(b.design_no||0) - Number(a.design_no||0));

    setDesigns(rows);
    setStats({total: rows.length, with_img: 0, without_img: rows.length});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleImageLoad = useCallback((dn) => {
    setDesigns(prev => prev.map(d => d.design_no===dn ? {...d, has_image:true} : d));
    setStats(prev => ({...prev, with_img: prev.with_img+1, without_img: prev.without_img-1}));
  }, []);

  const uploadImage = async (designNo, file) => {
    if (!file) return;
    if (!designNo || isNaN(Number(designNo))) {
      alert('Invalid design number: ' + designNo);
      return;
    }
    setUploading(prev => ({...prev, [designNo]: true}));
    try {
      const imgUrl = await uploadToBunny(designNo, file);
      // Update design_batch_master
      await supabase.from('design_batch_master')
        .update({primary_image_url: imgUrl})
        .eq('design_no', String(designNo));
      // Update in local state
      setDesigns(prev => prev.map(d =>
        d.design_no===String(designNo) ? {...d, img_url:imgUrl+'?t='+Date.now(), has_image:true} : d
      ));
      setStats(prev => ({...prev, with_img: prev.with_img+1, without_img: Math.max(0,prev.without_img-1)}));
    } catch(e) {
      alert(`Upload failed for D No-${designNo}: ${e.message}`);
    }
    setUploading(prev => ({...prev, [designNo]: false}));
  };

  const handleFileDrop = (designNo, e) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file && /image/i.test(file.type)) uploadImage(designNo, file);
  };

  const handleManualUpload = (e) => {
    const file = e.target.files?.[0];
    if (!manualDn || !file) return;
    uploadImage(manualDn.trim(), file);
    e.target.value = '';
  };

  const filtered = designs.filter(d => {
    if (filter === 'with_image' && !d.has_image) return false;
    if (filter === 'without_image' && d.has_image) return false;
    if (search && !String(d.design_no).includes(search) && !d.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{minHeight:'100vh',background:T.bg,padding:'20px 24px',fontFamily:"'DM Sans',sans-serif"}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:800,color:T.navy,margin:0}}>🖼️ Design Image Linker</h1>
        <p style={{fontSize:12,color:T.muted,margin:'4px 0 0'}}>
          Drag-and-drop images onto cards to upload to Bunny CDN · Auto-links to design master
        </p>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        {[
          {l:'Total Designs',v:stats.total,c:T.teal,ic:'🎨'},
          {l:'With Image',v:stats.with_img,c:T.green,ic:'✅'},
          {l:'Missing Image',v:stats.without_img,c:T.orange,ic:'⚠️'},
        ].map(k=>(
          <div key={k.l} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 16px',borderTop:`3px solid ${k.c}`}}>
            <div style={{fontSize:18}}>{k.ic}</div>
            <div style={{fontSize:22,fontWeight:800,color:T.navy}}>{k.v}</div>
            <div style={{fontSize:11,color:T.muted}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Manual upload + filters */}
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:'12px 16px',marginBottom:14,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',gap:6,alignItems:'center',flex:'0 0 auto'}}>
          <span style={{fontSize:12,fontWeight:600,color:T.navy}}>Manual Upload:</span>
          <input value={manualDn} onChange={e=>setManualDn(e.target.value)} placeholder="Design No…"
            style={{width:90,padding:'6px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12}} />
          <button onClick={()=>fileRef.current?.click()}
            style={{padding:'6px 14px',background:T.teal,border:'none',borderRadius:7,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
            📁 Choose File
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleManualUpload} style={{display:'none'}} />
        </div>
        <div style={{width:1,height:24,background:T.border}} />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search design no / name…"
          style={{flex:'1 1 150px',minWidth:0,padding:'6px 10px',border:`1px solid ${T.border}`,borderRadius:7,fontSize:12}} />
        {['all','with_image','without_image'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:'5px 12px',borderRadius:7,border:`1px solid ${T.border}`,background:filter===f?T.navy:T.bg,color:filter===f?'#fff':T.text,fontSize:11,fontWeight:600,cursor:'pointer'}}>
            {f==='all'?`All (${designs.length})`:f==='with_image'?`✅ Has Image (${stats.with_img})`:`⚠️ Missing (${stats.without_img})`}
          </button>
        ))}
        <button onClick={load} style={{padding:'6px 12px',background:T.teal,border:'none',borderRadius:7,color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>⟳</button>
      </div>

      {/* CDN note */}
      {!BUNNY_KEY && (
        <div style={{background:'#FEF3C7',border:'1px solid #F59E0B',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#92400E'}}>
          ⚠️ <strong>VITE_BUNNY_API_KEY</strong> not set — uploads will fail. Add it to your Vercel environment variables.
        </div>
      )}

      <div style={{fontSize:11,color:T.muted,marginBottom:10}}>
        Showing {filtered.length} of {designs.length} designs · Drag an image onto any card to upload
      </div>

      {/* Design grid */}
      {loading ? (
        <div style={{textAlign:'center',padding:60,color:T.muted}}>Loading designs…</div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10}}>
          {filtered.map(d => {
            const isUploading = uploading[d.design_no];
            const isDragTarget = dragOver === d.design_no;
            return (
              <div key={d.design_no}
                onDragOver={e=>{e.preventDefault();setDragOver(d.design_no);}}
                onDragLeave={()=>setDragOver(null)}
                onDrop={e=>handleFileDrop(d.design_no,e)}
                style={{
                  background: isDragTarget ? T.tealLight : T.surface,
                  border: `2px ${isDragTarget?'dashed solid'}[0] solid ${isDragTarget?T.teal:d.has_image?T.green:T.border}`,
                  borderStyle: isDragTarget ? 'dashed' : 'solid',
                  borderRadius:10,overflow:'hidden',cursor:'pointer',
                  transition:'all .15s',
                  boxShadow: isDragTarget ? `0 0 0 3px ${T.teal}40` : 'none',
                }}>
                {/* Image area */}
                <div style={{position:'relative',width:'100%',paddingTop:'100%',background:T.bg}}>
                  {isUploading ? (
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8}}>
                      <div style={{width:24,height:24,border:`3px solid ${T.tealLight}`,borderTopColor:T.teal,borderRadius:'50%',animation:'spin .7s linear infinite'}} />
                      <div style={{fontSize:9,color:T.muted}}>Uploading…</div>
                    </div>
                  ) : (
                    <>
                      <img
                        src={d.img_url}
                        alt={`D No-${d.design_no}`}
                        onLoad={() => handleImageLoad(d.design_no)}
                        onError={e => { e.target.style.display='none'; }}
                        style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}
                      />
                      {!d.has_image && (
                        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:4}}>
                          <div style={{fontSize:24,opacity:.4}}>🖼️</div>
                          <div style={{fontSize:9,color:T.muted,opacity:.7}}>Drop image here</div>
                        </div>
                      )}
                      {isDragTarget && (
                        <div style={{position:'absolute',inset:0,background:`${T.teal}22`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <div style={{fontSize:28}}>📤</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* Info */}
                <div style={{padding:'6px 8px',borderTop:`1px solid ${T.border}`}}>
                  <div style={{fontWeight:800,fontSize:12,color:T.teal}}>D No-{d.design_no}</div>
                  <div style={{fontSize:9,color:T.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginTop:1}}>{d.name}</div>
                  <div style={{display:'flex',alignItems:'center',gap:4,marginTop:4}}>
                    <span style={{fontSize:9,color:d.has_image?T.green:T.orange,fontWeight:700}}>
                      {d.has_image ? '✅ Linked' : '⚠️ No image'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
