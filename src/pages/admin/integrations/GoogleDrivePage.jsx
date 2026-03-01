import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const DRIVE_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || '1SVva3o8BTswoF_rQCyIwiXLEx_m3YPl6';
const BUNNY_CDN_URL = import.meta.env.VITE_BUNNY_CDN_URL || '';
const BUNNY_API_KEY = import.meta.env.VITE_BUNNY_API_KEY || '';
const BUNNY_STORAGE_ZONE = import.meta.env.VITE_BUNNY_STORAGE_ZONE || 'shreerangtrendz';

export default function GoogleDrivePage() {
  const [tab, setTab] = useState('browser');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [syncedFiles, setSyncedFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(DRIVE_FOLDER_ID);
  const [folderPath, setFolderPath] = useState([{ id: DRIVE_FOLDER_ID, name: 'Shreerang Trendz' }]);
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('google_access_token');
    if (token) { setAccessToken(token); setDriveConnected(true); listFiles(token, DRIVE_FOLDER_ID); }
    fetchSyncedFiles();
  }, []);

  async function connectGoogleDrive() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) { alert('Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to .env'); return; }
    const redirectUri = window.location.origin + '/admin/google-drive';
    const scope = 'https://www.googleapis.com/auth/drive.readonly';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
    window.location.href = authUrl;
  }

  async function listFiles(token, folderId) {
    setLoading(true);
    try {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink)&orderBy=name`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 401) { localStorage.removeItem('google_access_token'); setDriveConnected(false); setAccessToken(null); }
      else if (res.ok) { const data = await res.json(); setFiles(data.files || []); }
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  async function fetchSyncedFiles() {
    const { data } = await supabase.from('drive_synced_files').select('*').order('synced_at', { ascending: false }).limit(50);
    setSyncedFiles(data || []);
  }

  async function syncToBunny(file) {
    if (!BUNNY_API_KEY || !file) return;
    setLoading(true);
    try {
      const driveRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const blob = await driveRes.blob();
      const bunnyRes = await fetch(
        `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/shreerang/${file.name}`,
        { method: 'PUT', headers: { AccessKey: BUNNY_API_KEY, 'Content-Type': blob.type }, body: blob }
      );
      if (bunnyRes.ok) {
        const cdnUrl = `${BUNNY_CDN_URL}/shreerang/${file.name}`;
        await supabase.from('drive_synced_files').insert([{
          drive_file_id: file.id, file_name: file.name, file_type: file.mimeType,
          drive_url: file.webViewLink, cdn_url: cdnUrl, file_size: file.size
        }]);
        fetchSyncedFiles();
        alert(`✅ ${file.name} synced to Bunny CDN!`);
      }
    } catch(e) { alert('Sync failed: ' + e.message); }
    setLoading(false);
  }

  function formatSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/1024/1024).toFixed(1) + ' MB';
  }

  function getFileIcon(mimeType) {
    if (!mimeType) return '📄';
    if (mimeType.includes('folder')) return '📁';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
    if (mimeType.includes('presentation')) return '📊';
    if (mimeType.includes('video')) return '🎬';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️';
    return '📄';
  }

  function navigateToFolder(file) {
    if (!file.mimeType?.includes('folder')) return;
    setCurrentFolder(file.id);
    setFolderPath([...folderPath, { id: file.id, name: file.name }]);
    listFiles(accessToken, file.id);
  }

  function navigateToBreadcrumb(idx) {
    const target = folderPath[idx];
    setCurrentFolder(target.id);
    setFolderPath(folderPath.slice(0, idx + 1));
    listFiles(accessToken, target.id);
  }

  const tabs = [
    { id: 'browser', label: 'File Browser', icon: '📁' },
    { id: 'synced', label: 'Synced to CDN', icon: '☁️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Google Drive Integration</h1>
        <p className="text-gray-500 text-sm mt-1">Browse Google Drive files and sync product images to Bunny CDN</p>
      </div>

      <div className={`flex items-center gap-3 p-4 rounded-xl border mb-6 ${driveConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        <span className="text-2xl">{driveConnected ? '✅' : '🔗'}</span>
        <div className="flex-1">
          <p className={`font-medium ${driveConnected ? 'text-green-800' : 'text-gray-700'}`}>
            {driveConnected ? 'Google Drive Connected' : 'Connect Google Drive'}
          </p>
          <p className={`text-xs ${driveConnected ? 'text-green-600' : 'text-gray-500'}`}>
            {driveConnected ? `Browsing folder ID: ${DRIVE_FOLDER_ID}` : 'Click to connect with your Google account'}
          </p>
        </div>
        {!driveConnected ? (
          <button onClick={connectGoogleDrive}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
            🔑 Connect Google Drive
          </button>
        ) : (
          <button onClick={() => { localStorage.removeItem('google_access_token'); setDriveConnected(false); setFiles([]); }}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200">
            Disconnect
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'browser' && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex items-center gap-2 flex-wrap">
            {folderPath.map((f, i) => (
              <span key={i} className="flex items-center gap-1">
                <button onClick={() => navigateToBreadcrumb(i)}
                  className={`text-sm ${i === folderPath.length - 1 ? 'font-semibold text-gray-900' : 'text-blue-600 hover:underline'}`}>
                  {f.name}
                </button>
                {i < folderPath.length - 1 && <span className="text-gray-400">/</span>}
              </span>
            ))}
            {accessToken && (
              <button onClick={() => listFiles(accessToken, currentFolder)} className="ml-auto text-xs text-blue-600 hover:underline">↻ Refresh</button>
            )}
          </div>
          {!driveConnected ? (
            <div className="p-12 text-center text-gray-400">
              <div className="text-5xl mb-3">📁</div>
              <p className="font-medium">Connect Google Drive to browse files</p>
              <button onClick={connectGoogleDrive} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Connect Now</button>
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-gray-400">Loading files...</div>
          ) : (
            <div className="divide-y">
              {files.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No files in this folder</div>
              ) : files.map(file => (
                <div key={file.id}
                  className={`flex items-center gap-4 p-3 hover:bg-gray-50 ${file.mimeType?.includes('folder') ? 'cursor-pointer' : ''}`}
                  onClick={() => file.mimeType?.includes('folder') && navigateToFolder(file)}>
                  <span className="text-2xl w-8 text-center">{getFileIcon(file.mimeType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-gray-900 truncate ${file.mimeType?.includes('folder') ? 'text-blue-700' : ''}`}>{file.name}</p>
                    <p className="text-xs text-gray-400">{formatSize(parseInt(file.size))} · {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('en-IN') : '—'}</p>
                  </div>
                  {!file.mimeType?.includes('folder') && (
                    <div className="flex gap-2 flex-shrink-0">
                      <a href={file.webViewLink} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">View</a>
                      {BUNNY_API_KEY && (
                        <button onClick={() => syncToBunny(file)} disabled={loading}
                          className="text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50">
                          Sync to CDN
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'synced' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['File Name', 'Type', 'Size', 'CDN URL', 'Synced At'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {syncedFiles.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No files synced to CDN yet</td></tr>
              ) : syncedFiles.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{getFileIcon(f.file_type)}</span>
                      <span className="font-medium text-gray-900">{f.file_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{f.file_type?.split('/').pop() || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{formatSize(f.file_size)}</td>
                  <td className="px-4 py-3">
                    {f.cdn_url ? (
                      <a href={f.cdn_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate block max-w-xs">
                        {f.cdn_url}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{f.synced_at ? new Date(f.synced_at).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'settings' && (
        <div className="bg-white rounded-xl border p-6 max-w-lg space-y-4">
          <h3 className="font-semibold text-gray-900">Integration Settings</h3>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Root Drive Folder ID', value: DRIVE_FOLDER_ID, key: 'VITE_GOOGLE_DRIVE_FOLDER_ID' },
              { label: 'Bunny Storage Zone', value: BUNNY_STORAGE_ZONE, key: 'VITE_BUNNY_STORAGE_ZONE' },
              { label: 'CDN URL', value: BUNNY_CDN_URL || 'Not configured', key: 'VITE_BUNNY_CDN_URL' },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="font-mono text-xs text-gray-800 mt-1 break-all">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">env: {s.key}</p>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            <p className="font-medium mb-1">To use Google Drive OAuth:</p>
            <p>1. Create OAuth 2.0 credentials in Google Cloud Console</p>
            <p>2. Add VITE_GOOGLE_CLIENT_ID to .env</p>
            <p>3. Add authorized redirect: {window.location.origin}/admin/google-drive</p>
          </div>
        </div>
      )}
    </div>
  );
}
