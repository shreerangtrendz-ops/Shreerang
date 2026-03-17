import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit2, Image, Upload, Check, X, RefreshCw, ExternalLink } from 'lucide-react';

const CATEGORIES = [
  { value: 'mill_print', label: 'Mill Print', color: 'bg-blue-100 text-blue-700' },
  { value: 'digital', label: 'Digital Print', color: 'bg-purple-100 text-purple-700' },
  { value: 'solid', label: 'Solid Dyed', color: 'bg-green-100 text-green-700' },
  { value: 'embroidery', label: 'Embroidery', color: 'bg-pink-100 text-pink-700' },
  { value: 'schiffli', label: 'Schiffli', color: 'bg-orange-100 text-orange-700' },
  { value: 'hakoba', label: 'Hakoba', color: 'bg-yellow-100 text-yellow-700' },
];

const BUNNY_KEY = 'c63b3837-120a-46bf-b953-191f40f9059c';
const BUNNY_ZONE = 'shreerang-s';
const BUNNY_CDN = 'https://shreerang.b-cdn.net';

const CataloguePage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    category: 'mill_print', subcategory: '', name: '',
    image_url: '', description: '', price_range: '', in_stock: true, tags: ''
  });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase.from('fabric_catalogue').select('*, whatsapp_designs_sent(count)').order('category').order('sort_order').order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const filtered = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory);

  const resetForm = () => {
    setForm({ category: 'mill_print', subcategory: '', name: '', image_url: '', description: '', price_range: '', sort_order: 0, in_stock: true, tags: '' });
    setEditItem(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
    setForm({ ...item, tags: (item.tags || []).join(', ') });
    setEditItem(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Upload image to Bunny.net
  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filename = `catalogue/${form.category}-${Date.now()}.${ext}`;
      const r = await fetch(`https://storage.bunnycdn.com/${BUNNY_ZONE}/${filename}`, {
        method: 'PUT',
        headers: { 'AccessKey': BUNNY_KEY, 'Content-Type': file.type },
        body: file
      });
      if (r.ok) {
        const url = `${BUNNY_CDN}/${filename}`;
        setForm(prev => ({ ...prev, image_url: url }));
      } else {
        alert('Upload failed. Please paste the image URL manually.');
      }
    } catch(e) {
      alert('Upload error. Paste the CDN URL manually.');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.image_url || !form.category) return alert('Name, Category and Image URL are required');
    setSaving(true);
    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;

    if (editItem) {
      await supabase.from('fabric_catalogue').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editItem);
    } else {
      await supabase.from('fabric_catalogue').insert(payload);
    }
    await fetchItems();
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this catalogue item?')) return;
    await supabase.from('fabric_catalogue').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const toggleStock = async (id, current) => {
    await supabase.from('fabric_catalogue').update({ in_stock: !current }).eq('id', id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, in_stock: !current } : i));
  };

  const catColor = (cat) => CATEGORIES.find(c => c.value === cat)?.color || 'bg-slate-100 text-slate-700';
  const catLabel = (cat) => CATEGORIES.find(c => c.value === cat)?.label || cat;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Helmet><title>Fabric Catalogue — Shreerang</title></Helmet>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Image className="h-6 w-6 text-green-600" />
            WhatsApp Fabric Catalogue
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Images here are <strong>automatically sent</strong> to customers when they ask for fabric designs on WhatsApp
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchItems} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-1" />Add Fabric Image
          </Button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white border-2 border-green-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="font-bold text-slate-800 mb-4">{editItem ? '✏️ Edit Catalogue Item' : '➕ Add New Fabric Image'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Category *</label>
              <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Sub-category</label>
              <Input value={form.subcategory} onChange={e => setForm(p => ({...p, subcategory: e.target.value}))}
                placeholder="e.g. 44_inch, polyester, allover" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Fabric Name *</label>
              <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                placeholder="e.g. Mill Print 44&quot; Cotton Floral" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Image *</label>
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input value={form.image_url} onChange={e => setForm(p => ({...p, image_url: e.target.value}))}
                    placeholder="https://shreerang.b-cdn.net/... or paste any image URL" />
                  <p className="text-xs text-slate-400 mt-1">Paste Bunny CDN URL or click Upload to upload from your computer</p>
                </div>
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files?.[0])} />
                  <Button onClick={() => fileRef.current?.click()} variant="outline" disabled={uploading} className="whitespace-nowrap">
                    {uploading ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                </div>
                {form.image_url && (
                  <img src={form.image_url} alt="preview" className="h-12 w-12 object-cover rounded border" onError={e => e.target.style.display='none'} />
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Description</label>
              <Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                placeholder="e.g. Premium cotton, soft & breathable" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Price Range</label>
              <Input value={form.price_range} onChange={e => setForm(p => ({...p, price_range: e.target.value}))}
                placeholder="e.g. ₹45-65/mtr" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Sort Order <span className="text-slate-400">(1=first, 0=default)</span></label>
              <Input type="number" value={form.sort_order || 0} onChange={e => setForm(p => ({...p, sort_order: parseInt(e.target.value)||0}))}
                placeholder="0" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600 mb-1 block">Tags (comma separated)</label>
              <Input value={form.tags} onChange={e => setForm(p => ({...p, tags: e.target.value}))}
                placeholder="e.g. cotton, floral, ladies, summer" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.in_stock} onChange={e => setForm(p => ({...p, in_stock: e.target.checked}))}
                id="in_stock" className="h-4 w-4 text-green-600" />
              <label htmlFor="in_stock" className="text-sm font-medium text-slate-700">In Stock (show to customers)</label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              {saving ? 'Saving...' : editItem ? 'Update' : 'Add to Catalogue'}
            </Button>
            <Button onClick={resetForm} variant="outline"><X className="h-4 w-4 mr-1" />Cancel</Button>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
          All ({items.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = items.filter(i => i.category === cat.value).length;
          return (
            <button key={cat.value} onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === cat.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Designs', value: items.length, icon: '🖼️' },
          { label: 'In Stock', value: items.filter(i=>i.in_stock).length, icon: '✅' },
          { label: 'Out of Stock', value: items.filter(i=>!i.in_stock).length, icon: '❌' },
          { label: 'Total Sent', value: items.reduce((sum,i)=>(sum+(i.send_count||0)),0), icon: '📤' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-lg border p-3 text-center">
            <div className="text-xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-xs text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-800 flex items-start gap-2">
        <span className="text-lg">🤖</span>
        <div>
          <strong>Smart sending:</strong> Bot sends <strong>3 new designs</strong> each time (skips already-seen ones per customer).
          Customer types "aur dikhao" for 3 more, "sab dikhao" for all.
          When all designs seen → bot says "new arrivals coming soon".
          <strong> Sort Order</strong> controls which designs show first (1 = first).
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400"><RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No items in this category yet</p>
          <Button onClick={() => setShowForm(true)} className="mt-3 bg-green-600 text-white"><Plus className="h-4 w-4 mr-1" />Add First Image</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => (
            <div key={item.id} className={`bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow ${!item.in_stock ? 'opacity-60' : ''}`}>
              <div className="relative aspect-square bg-slate-100">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover"
                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                ) : null}
                <div className="hidden w-full h-full items-center justify-center text-slate-300">
                  <Image className="h-12 w-12" />
                </div>
                {!item.in_stock && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">OUT OF STOCK</div>
                )}
                <div className="absolute top-2 left-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${catColor(item.category)}`}>
                    {catLabel(item.category)}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm text-slate-800 line-clamp-2">{item.name}</h3>
                {item.price_range && <p className="text-xs text-green-700 font-medium mt-1">{item.price_range}</p>}
                {item.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>}
                {item.tags?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {item.tags.slice(0,3).map(tag => (
                      <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                  {(item.send_count > 0) && <span>📤 Sent {item.send_count}× to customers</span>}
                  {item.sort_order > 0 && <span>#{item.sort_order}</span>}
                </div>
                <div className="flex items-center gap-1 mt-3">
                  <Button onClick={() => handleEdit(item)} size="sm" variant="outline" className="flex-1 h-7 text-xs">
                    <Edit2 className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <button onClick={() => toggleStock(item.id, item.in_stock)}
                    className={`h-7 px-2 rounded text-xs font-medium border ${item.in_stock ? 'border-green-300 text-green-700 hover:bg-green-50' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                    title={item.in_stock ? 'Click to mark out of stock' : 'Click to mark in stock'}>
                    {item.in_stock ? '✅' : '❌'}
                  </button>
                  <button onClick={() => handleDelete(item.id)}
                    className="h-7 w-7 flex items-center justify-center rounded border border-red-200 text-red-400 hover:bg-red-50">
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <a href={item.image_url} target="_blank" rel="noopener noreferrer"
                    className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CataloguePage;
