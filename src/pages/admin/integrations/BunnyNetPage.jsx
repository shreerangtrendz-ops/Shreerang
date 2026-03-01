import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const BUNNY_API_KEY = import.meta.env.VITE_BUNNY_API_KEY || '';
const BUNNY_CDN_URL = import.meta.env.VITE_BUNNY_CDN_URL || '';
const BUNNY_STORAGE_ZONE = import.meta.env.VITE_BUNNY_STORAGE_ZONE || 'shreerangtrendz';
const BUNNY_STORAGE_HOST = 'https://storage.bunnycdn.com';

export default function BunnyNetPage() {
  const [tab, setTab] = useState('media');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentPath, setCurrentPath] = useState('shreerang/');
  const [stats, setStats] = useState({ total: 0, images: 0, totalSize: 0 });
  const [selectedFile, setSelectedFile] = useState(null);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { listFiles(currentPath); }, [currentPath]);

  async function listFiles(path) {
    if (!BUNNY_API_KEY) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${path}`,
        { headers: { AccessKey: BUNNY_API_KEY, accept: 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        setFiles(data || []);
        const imgs = (data || []).filter(f => !f.IsDirectory && /\.(jpg|jpeg|png|gif|webp|svg)/i.test(f.ObjectName));
        const totalSize = (data || []).reduce((acc, f) => acc + (f.Length || 0), 0);
        setStats({ total: (data || []).length, images: imgs.length, totalSize });
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function uploadFile(file) {
    if (!BUNNY_API_KEY || !file) return;
    setUploading(true);
    setUploadProgress(0);
    const path = currentPath + file.name;
    try {
      const res = await fetch(
        `${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${path}`,
        { method: 'PUT', headers: { AccessKey: BUNNY_API_KEY, 'Content-Type': file.type }, body: file }
      );
      if (res.ok) {
        setUploadProgress(100);
        await supabase.from('media_library').insert([{
          file_name: file.name, file_type: file.type, file_size: file.size,
          cdn_url: `${BUNNY_CDN_URL}/${path}`, storage_path: path
        }]);
        setTimeout(() => { listFiles(currentPath); setUploading(false); setUploadProgress(0); }, 500);
      }
    } catch(e) { console.error(e); setUploading(false); }
  }

  async function deleteFile(fileName) {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;
    const path = currentPath + fileName;
    const res = await fetch(`${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${path}`,
      { method: 'DELETE', headers: { AccessKey: BUNNY_API_KEY } });
    if (res.ok) listFiles(currentPath);
  }

  function getCdnUrl(fileName) {
    return `${BUNNY_CDN_URL}/${currentPath}${fileName}`;
  }

  function formatSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/1024/1024).toFixed(1) + ' MB';
  }

  function isImage(name) { return /\.(jpg|jpeg|png|gif|webp|svg)/i.test(name); }

  const filteredFiles = files.filter(f => f.ObjectName?.toLowerCase().includes(search.toLowerCase()));

  const tabs = [
    { id: 'media', label: 'Media Library', icon: '🖼️' },
    { id: 'upload', label: 'Upload', icon: '⬆️' },
    { id: 'settings', label: 'CDN Settings', icon: '⚙️' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bunny.net CDN</h1>
        <p className="text-gray-500 text-sm mt-1">Manage product images and media files on Bunny CDN</p>
      </div>

      {!BUNNY_API_KEY && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-yellow-800 font-medium">⚠️ Bunny.net API Key not configured</p>
          <p className="text-yellow-700 text-sm mt-1">Add VITE_BUNNY_API_KEY, VITE_BUNNY_CDN_URL, and VITE_BUNNY_STORAGE_ZONE to your .env file</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Files', value: stats.total, icon: '📁', color: 'bg-blue-50 text-blue-700' },
          { label: 'Images', value: stats.images, icon: '🖼️', color: 'bg-purple-50 text-purple-700' },
          { label: 'Total Storage', value: formatSize(stats.totalSize), icon: '💾', color: 'bg-green-50 text-green-700' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl border p-4 ${s.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{s.icon}</span>
              <span className="text-xl font-bold">{s.value}</span>
            </div>
            <p className="text-sm opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'media' && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search files..." className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <button onClick={() => listFiles(currentPath)} className="text-sm text-orange-600 hover:underline">↻ Refresh</button>
            <button onClick={() => setTab('upload')} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">+ Upload</button>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading media files...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-4">
              {filteredFiles.length === 0 ? (
                <div className="col-span-5 py-12 text-center text-gray-400">
                  <div className="text-4xl mb-2">📭</div>
                  <p>{BUNNY_API_KEY ? 'No files found' : 'Configure Bunny.net to view files'}</p>
                </div>
              ) : filteredFiles.map(file => (
                <div key={file.Guid || file.ObjectName}
                  className={`border rounded-xl overflow-hidden group hover:shadow-md transition-shadow cursor-pointer ${selectedFile?.ObjectName === file.ObjectName ? 'ring-2 ring-orange-500' : ''}`}
                  onClick={() => setSelectedFile(selectedFile?.ObjectName === file.ObjectName ? null : file)}>
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    {file.IsDirectory ? (
                      <span className="text-4xl">📁</span>
                    ) : isImage(file.ObjectName) ? (
                      <img src={getCdnUrl(file.ObjectName)} alt={file.ObjectName}
                        className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}/>
                    ) : (
                      <span className="text-3xl">📄</span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-700 truncate">{file.ObjectName}</p>
                    <p className="text-xs text-gray-400">{formatSize(file.Length)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedFile && !selectedFile.IsDirectory && (
            <div className="border-t p-4 bg-gray-50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.ObjectName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatSize(selectedFile.Length)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">CDN URL:</span>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono break-all">{getCdnUrl(selectedFile.ObjectName)}</code>
                    <button onClick={() => navigator.clipboard.writeText(getCdnUrl(selectedFile.ObjectName))}
                      className="text-xs text-blue-600 hover:underline flex-shrink-0">Copy</button>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a href={getCdnUrl(selectedFile.ObjectName)} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200">View</a>
                  <button onClick={() => deleteFile(selectedFile.ObjectName)}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs hover:bg-red-200">Delete</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'upload' && (
        <div className="bg-white rounded-xl shadow-sm border p-6 max-w-xl">
          <h3 className="font-semibold text-gray-900 mb-4">Upload Files to CDN</h3>
          <div
            className="border-2 border-dashed border-orange-300 rounded-xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}>
            <div className="text-5xl mb-3">⬆️</div>
            <p className="font-medium text-gray-700">Click or drag & drop files here</p>
            <p className="text-sm text-gray-400 mt-1">Images, PDFs, documents — max 100MB</p>
            <input ref={fileInputRef} type="file" className="hidden"
              onChange={e => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); }} />
          </div>

          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Uploading...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            <p className="font-medium">Upload Path: <code className="font-mono">{currentPath}</code></p>
            <p className="mt-1">Files will be available at: <code className="font-mono">{BUNNY_CDN_URL}/{currentPath}filename.jpg</code></p>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="bg-white rounded-xl border p-6 max-w-lg space-y-4">
          <h3 className="font-semibold text-gray-900">Bunny.net Configuration</h3>
          <div className="space-y-3">
            {[
              { label: 'Storage Zone', value: BUNNY_STORAGE_ZONE, key: 'VITE_BUNNY_STORAGE_ZONE' },
              { label: 'CDN Hostname', value: BUNNY_CDN_URL || 'Not configured', key: 'VITE_BUNNY_CDN_URL' },
              { label: 'API Key Status', value: BUNNY_API_KEY ? '✅ Configured' : '❌ Not set', key: 'VITE_BUNNY_API_KEY' },
              { label: 'Current Upload Path', value: currentPath, key: 'path' },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="font-mono text-xs text-gray-800 mt-1 break-all">{s.value}</p>
                {s.key !== 'path' && <p className="text-xs text-gray-400 mt-0.5">env: {s.key}</p>}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {['shreerang/', 'products/', 'designs/', 'catalogues/', 'invoices/'].map(path => (
              <button key={path} onClick={() => setCurrentPath(path)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all ${currentPath === path ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                📁 /{path} {currentPath === path && '← Active'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
