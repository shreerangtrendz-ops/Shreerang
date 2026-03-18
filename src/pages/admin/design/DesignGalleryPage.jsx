import React, { useState, useEffect, useCallback } from 'react';
import { customSupabaseClient as supabase } from '@/lib/customSupabaseClient';

const CATEGORIES = [
  '1-Rayon', '2-Capsule Rayon', '3-Capsule Rayon Doriya', '3-Modal Chanderi',
  '4-Cotton Camric', '5-Mill Print Cotton Camric Jaipuri Prints', '5-Vatican',
  '6-Berlin', '7-Cotton Mul', '8-Mill Print Other Fabrics(O)', '9-Western Wear Prints', '10-Mul chanderi'
];

export default function DesignGalleryPage() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);

  const fetchDesigns = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('fabric_designs').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (selectedCategory !== 'All') query = query.eq('category', selectedCategory);
    if (search) query = query.ilike('file_name', `%${search}%`);
    const { data, error } = await query.limit(200);
    if (!error) setDesigns(data || []);
    setLoading(false);
  }, [selectedCategory, search]);

  useEffect(() => { fetchDesigns(); }, [fetchDesigns]);

  const handleSync = async () => {
    setSyncStatus('Syncing...');
    try {
      const res = await fetch('https://n8n.shreerangtrendz.com/webhook/drive-bunny-sync', { method: 'POST' });
      setSyncStatus(res.ok ? 'Sync triggered! Check back in a few minutes.' : 'Sync trigger failed');
    } catch {
      setSyncStatus('Could not reach sync endpoint');
    }
    setTimeout(() => setSyncStatus(null), 5000);
  };

  const filteredDesigns = designs.filter(d => {
    const matchCat = selectedCategory === 'All' || d.category === selectedCategory;
    const matchSearch = !search || (d.file_name || '').toLowerCase().includes(search.toLowerCase()) || (d.design_code || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const categories = ['All', ...CATEGORIES];

  return (
    <div className="p-4 bg-gray-950 min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🖼 Design Gallery</h1>
          <p className="text-gray-400 text-sm mt-1">Shreerang Gallery → Bunny CDN → Website</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSync} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center gap-2">
            🔄 Sync from Drive
          </button>
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">
            {viewMode === 'grid' ? '☰ List' : '⊞ Grid'}
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className="mb-4 p-3 bg-blue-900/50 border border-blue-600 rounded-lg text-blue-300 text-sm">{syncStatus}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <div className="text-2xl font-bold text-blue-400">{designs.length}</div>
          <div className="text-gray-400 text-xs mt-1">Total Designs</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <div className="text-2xl font-bold text-green-400">{designs.filter(d => d.bunny_url).length}</div>
          <div className="text-gray-400 text-xs mt-1">On Bunny CDN</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <div className="text-2xl font-bold text-yellow-400">{designs.filter(d => d.is_stock_ready).length}</div>
          <div className="text-gray-400 text-xs mt-1">Stock Ready</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
          <div className="text-2xl font-bold text-purple-400">{new Set(designs.map(d => d.category).filter(Boolean)).size}</div>
          <div className="text-gray-400 text-xs mt-1">Categories</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search designs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 w-48"
        />
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
              {cat === 'All' ? 'All' : cat.split('-').slice(1).join(' ')} {cat !== 'All' && `(${designs.filter(d => d.category === cat).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredDesigns.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">🖼</div>
          <div className="text-lg font-medium">No designs found</div>
          <div className="text-sm mt-2">Try syncing from Google Drive first</div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredDesigns.map(design => (
            <div
              key={design.id}
              onClick={() => setSelectedDesign(design)}
              className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-blue-500 cursor-pointer transition-all hover:scale-105 group"
            >
              <div className="aspect-square bg-gray-800 relative">
                {design.bunny_url ? (
                  <img src={design.bunny_url} alt={design.file_name} className="w-full h-full object-cover" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-4xl">🖼</div>
                )}
                {design.is_stock_ready && (
                  <span className="absolute top-1 right-1 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full">In Stock</span>
                )}
              </div>
              <div className="p-2">
                <div className="text-xs text-gray-300 truncate">{design.design_code || design.file_name?.split('.')[0] || 'Unknown'}</div>
                <div className="text-xs text-gray-500 mt-0.5">{design.category?.split('-').slice(1).join(' ') || 'Uncategorized'}</div>
                {design.price_regular && (
                  <div className="text-xs text-green-400 mt-0.5">₹{design.price_regular}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left p-3 text-gray-400 font-medium">Preview</th>
                <th className="text-left p-3 text-gray-400 font-medium">Design Code</th>
                <th className="text-left p-3 text-gray-400 font-medium">Category</th>
                <th className="text-left p-3 text-gray-400 font-medium">Components</th>
                <th className="text-left p-3 text-gray-400 font-medium">Price (Lump)</th>
                <th className="text-left p-3 text-gray-400 font-medium">Status</th>
                <th className="text-left p-3 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDesigns.map(design => (
                <tr key={design.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3">
                    {design.bunny_url ? (
                      <img src={design.bunny_url} alt="" className="w-12 h-12 object-cover rounded-lg" loading="lazy" />
                    ) : <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center text-gray-600">🖼</div>}
                  </td>
                  <td className="p-3 text-white font-medium">{design.design_code || 'N/A'}</td>
                  <td className="p-3 text-gray-300">{design.category?.split('-').slice(1).join(' ') || '-'}</td>
                  <td className="p-3 text-gray-300">{design.components || '1pc'}</td>
                  <td className="p-3 text-green-400">{design.price_regular ? `₹${design.price_regular}` : '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${design.is_stock_ready ? 'bg-green-900/50 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                      {design.is_stock_ready ? 'In Stock' : 'Not Set'}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => setSelectedDesign(design)} className="text-blue-400 hover:text-blue-300 text-xs">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDesign && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDesign(null)}>
          <div className="bg-gray-900 rounded-2xl max-w-lg w-full border border-gray-700 overflow-hidden" onClick={e => e.stopPropagation()}>
            {selectedDesign.bunny_url && (
              <img src={selectedDesign.bunny_url} alt={selectedDesign.file_name} className="w-full max-h-64 object-cover" />
            )}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-lg">{selectedDesign.design_code || selectedDesign.file_name}</h3>
                <button onClick={() => setSelectedDesign(null)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Category:</span> <span className="text-white">{selectedDesign.category}</span></div>
                <div><span className="text-gray-500">Fabric:</span> <span className="text-white">{selectedDesign.fabric_type || 'N/A'}</span></div>
                <div><span className="text-gray-500">Components:</span> <span className="text-white">{selectedDesign.components || '1pc'}</span></div>
                <div><span className="text-gray-500">Regular:</span> <span className="text-green-400">{selectedDesign.price_regular ? `₹${selectedDesign.price_regular}` : 'N/A'}</span></div>
                <div><span className="text-gray-500">Cut Pack:</span> <span className="text-yellow-400">{selectedDesign.price_cutpack ? `₹${selectedDesign.price_cutpack}` : 'N/A'}</span></div>
                <div><span className="text-gray-500">Stock:</span> <span className={selectedDesign.is_stock_ready ? 'text-green-400' : 'text-gray-500'}>{selectedDesign.is_stock_ready ? 'Ready' : 'Not Set'}</span></div>
              </div>
              {selectedDesign.bunny_url && (
                <div className="mt-3 p-2 bg-gray-800 rounded text-xs text-gray-400 break-all">
                  CDN: {selectedDesign.bunny_url}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <a href={`/admin/mto-cost-template?design=${selectedDesign.id}`} className="flex-1 text-center px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium">
                  💰 Cost Template
                </a>
                {selectedDesign.drive_url && (
                  <a href={selectedDesign.drive_url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">
                    📁 Drive
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
