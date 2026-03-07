import { useState, useEffect, useRef } from 'react';

const BUNNY_KEY = import.meta.env.VITE_BUNNY_API_KEY || '';
const CDN_URL   = 'https://shreerang.b-cdn.net';
const ZONE      = 'shreerang-s';
const HOST      = 'https://storage.bunnycdn.com';

export default function MediaLibraryPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('designs/');
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { listFiles(); }, [folder]);

  async function listFiles() {
    setLoading(true);
    try {
      const res = await fetch(`${HOST}/${ZONE}/${folder}`, {
        headers: { AccessKey: BUNNY_KEY, accept:'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : []);
      } else {
        setFiles([]);
      }
    } catch { setFiles([]); }
    setLoading(false);
  }

  async function uploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadProgress(0);
    try {
      const fileName = `${folder}${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const res = await fetch(`${HOST}/${ZONE}/${fileName}`, {
        method: 'PUT',
        headers: { AccessKey: BUNNY_KEY, 'Content-Type': file.type },
        body: file,
      });
      if (res.ok) { setUploadProgress(100); listFiles(); }
      else alert('Upload failed: ' + res.status);
    } catch(err) { alert('Upload error: ' + err.message); }
    finally { setUploading(false); }
  }

  async function deleteFile(fileName) {
    if (!confirm(`Delete ${fileName}?`)) return;
    await fetch(`${HOST}/${ZONE}/${folder}${fileName}`, { method: 'DELETE', headers: { AccessKey: BUNNY_KEY } });
    listFiles();
  }

  function copyUrl(fileName) {
    const url = `${CDN_URL}/${folder}${fileName}`;
    navigator.clipboard.writeText(url).then(()=>{ setCopied(fileName); setTimeout(()=>setCopied(false), 2000); });
  }

  const filtered = files.filter(f => f.ObjectName?.toLowerCase().includes(search.toLowerCase()));
  const images = filtered.filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.ObjectName||''));
  const others = filtered.filter(f => !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.ObjectName||''));
  const fmtSize = b => b > 1e6 ? (b/1e6).toFixed(1)+'MB' : b > 1e3 ? (b/1e3).toFixed(0)+'KB' : b+'B';

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'var(--bg,#F4FBFA)', minHeight:'100vh' }}>
      <div style={{ background:'linear-gradient(135deg,#0B2E2B,#143F3C)', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
            <span>🖼️</span> Media Library
          </div>
          <p style={{ fontSize:11, color:'#6A9B95', margin:0 }}>Bunny CDN · shreerang.b-cdn.net · Design images</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={uploadFile} style={{ display:'none' }} />
          <button onClick={()=>fileInputRef.current?.click()} disabled={uploading}
            style={{ padding:'9px 18px', borderRadius:9, border:'none', background: uploading?'#555':'linear-gradient(135deg,#E8A800,#D4920A)', color:'#fff', fontSize:12, fontWeight:700, cursor: uploading?'wait':'pointer' }}>
            {uploading ? `⏳ Uploading ${uploadProgress}%` : '⬆ Upload File'}
          </button>
          <button onClick={listFiles} style={{ padding:'9px 14px', borderRadius:9, border:'none', background:'rgba(255,255,255,.1)', color:'#fff', fontSize:12, cursor:'pointer' }}>↻</button>
        </div>
      </div>

      <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search files…"
            style={{ flex:1, maxWidth:300, padding:'8px 12px', borderRadius:8, border:'1px solid rgba(43,168,152,.3)', fontSize:13 }} />
          {['designs/','fabrics/','documents/'].map(f=>(
            <button key={f} onClick={()=>setFolder(f)} style={{ padding:'6px 14px', borderRadius:20, border:'none', fontSize:12, fontWeight:600, cursor:'pointer',
              background: folder===f?'#0B2E2B':'#fff', color: folder===f?'#3DBFAE':'#6A9B95', boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
              {f.replace('/','') }
            </button>
          ))}
          <span style={{ fontSize:12, color:'#94a3b8', marginLeft:'auto' }}>{filtered.length} files</span>
        </div>

        {loading ? <div style={{ textAlign:'center', padding:40, color:'#6A9B95' }}>Loading files…</div>
        : filtered.length === 0 ? (
          <div style={{ background:'#fff', borderRadius:12, padding:40, textAlign:'center', color:'#94a3b8', border:'2px dashed rgba(43,168,152,.2)' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🖼️</div>
            <div style={{ fontWeight:600, marginBottom:6 }}>No files in {folder}</div>
            <div style={{ fontSize:13 }}>Upload design images or switch folder above.</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:14 }}>
            {images.map(f=>(
              <div key={f.ObjectName} onClick={()=>setSelected(selected===f.ObjectName?null:f.ObjectName)}
                style={{ background:'#fff', borderRadius:12, overflow:'hidden', boxShadow:'0 2px 10px rgba(0,0,0,.08)',
                  border: selected===f.ObjectName ? '2px solid #3DBFAE' : '2px solid transparent', cursor:'pointer' }}>
                <div style={{ height:140, overflow:'hidden', background:'#F4FBFA', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <img src={`${CDN_URL}/${folder}${f.ObjectName}`} alt={f.ObjectName} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.target.style.display='none';}} />
                </div>
                <div style={{ padding:'8px 10px' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'#0B2E2B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.ObjectName}</div>
                  <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>{fmtSize(f.Length||0)}</div>
                  {selected===f.ObjectName && (
                    <div style={{ display:'flex', gap:5, marginTop:8 }}>
                      <button onClick={e=>{e.stopPropagation();copyUrl(f.ObjectName);}}
                        style={{ flex:1, padding:'4px', borderRadius:6, border:'none', background: copied===f.ObjectName?'#E8FFF4':'#EEF6FF', color: copied===f.ObjectName?'#1E9E5A':'#2468C8', fontSize:10, fontWeight:700, cursor:'pointer' }}>
                        {copied===f.ObjectName?'✅ Copied':'📋 Copy URL'}
                      </button>
                      <button onClick={e=>{e.stopPropagation();deleteFile(f.ObjectName);}}
                        style={{ padding:'4px 8px', borderRadius:6, border:'none', background:'#FFF3F3', color:'#ef4444', fontSize:10, fontWeight:700, cursor:'pointer' }}>
                        🗑
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!BUNNY_KEY && (
          <div style={{ background:'#FFF8E8', border:'1px solid rgba(212,146,10,.3)', borderRadius:10, padding:'12px 16px', fontSize:13, color:'#92754A' }}>
            ⚠️ Add <strong>VITE_BUNNY_API_KEY</strong> to your Vercel environment variables to connect Bunny CDN.
          </div>
        )}
      </div>
    </div>
  );
}
