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

  // WhatsApp Sending State
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waItem, setWaItem] = useState(null);
  const [waCustomers, setWaCustomers] = useState([]);
  const [waSelectedCustomer, setWaSelectedCustomer] = useState('');
  const [waSending, setWaSending] = useState(false);

  useEffect(() => { 
    fetchItems(); 
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name, mobile, ai_wishlist').eq('business_type', 'customer').order('name');
    setWaCustomers(data || []);
  };

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

  const openWaModal = (item) => {
    setWaItem(item);
    setWaSelectedCustomer('');
    setWaModalOpen(true);
  };

  const handleSendWhatsApp = async () => {
    if (!waSelectedCustomer || !waItem) return alert("Select a customer");
    setWaSending(true);
    const customer = waCustomers.find(c => c.id === waSelectedCustomer);
    
    // 1. Send via n8n Webhook
    try {
      const N8N_WEBHOOK = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.shreerangtrendz.com/webhook/wa-bot';
      await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_send_design',
          customer_name: customer.name,
          customer_phone: customer.mobile,
          design_name: waItem.name,
          design_image: waItem.image_url,
          design_price: waItem.price_range,
          design_desc: waItem.description
        })
      });
      
      // 2. Log in whatsapp_designs_sent for tracking
      await supabase.from('whatsapp_designs_sent').insert({
        customer_id: customer.id,
        fabric_id: waItem.id,
        sent_by: 'admin'
      });
      
      alert(`Design sent to ${customer.name} securely!`);
      setWaModalOpen(false);
      fetchItems(); // Refresh counts
    } catch (e) {
      console.error(e);
      alert("Failed to ping n8n webhook. Is n8n online?");
    }
    setWaSending(false);
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
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-800 flex flex-col md:flex-row items-start gap-4">
        <div className="flex gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <strong>Smart sending:</strong> Bot sends <strong>3 new designs</strong> each time (skips already-seen ones per customer).
            Customer types "aur dikhao" for 3 more, "sab dikhao" for all.
            <strong> Sort Order</strong> controls which designs show first (1 = first).
          </div>
        </div>
        <div className="flex gap-2 border-l border-green-200 pl-4">
          <span className="text-lg">📱</span>
          <div>
            <strong>Admin Manual Push:</strong> Click the WhatsApp icon on any design to instantly fire a personalized promotional message directly to any synced CRM customer.
          </div>
        </div>
      </div>

      {/* WhatsApp Send Modal */}
      {waModalOpen && waItem && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="bg-green-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><span>💬</span> Send to WhatsApp</h3>
              <button onClick={() => setWaModalOpen(false)} className="opacity-70 hover:opacity-100">✕</button>
            </div>
            <div className="p-5">
              <div className="flex gap-3 mb-4 items-center bg-slate-50 p-2 rounded-lg border">
                <img src={waItem.image_url} alt="fabric" className="h-14 w-14 object-cover rounded border border-slate-200" />
                <div>
                  <div className="text-sm font-bold text-slate-800">{waItem.name}</div>
                  <div className="text-xs text-slate-500">{waItem.price_range || 'Price on request'}</div>
                </div>
              </div>
              
              <label className="text-sm font-semibold text-slate-700 block mb-2">Select Customer to Send To:</label>
              <select 
                value={waSelectedCustomer} 
                onChange={(e) => setWaSelectedCustomer(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm focus:border-green-500 focus:outline-none mb-4"
              >
                <option value="">-- Choose from CRM --</option>
                {waCustomers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.mobile || 'No Mobile'})</option>
                ))}
              </select>
              
              <div className="bg-amber-50 rounded p-3 mb-5 border border-amber-200">
                <p className="text-xs text-amber-800">
                  <strong>Preview:</strong> "Hi [Customer], check out our new {waItem.category.replace('_',' ')} design: {waItem.name}! {waItem.price_range ? `Priced at ${waItem.price_range}.` : ''} Let us know if you need physical samples."
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSendWhatsApp} disabled={waSending || !waSelectedCustomer} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-11 shadow-md hover:shadow-lg transition-all">
                  {waSending ? 'Sending via n8n...' : '🚀 Push to Customer'}
                </Button>
                <Button onClick={() => setWaModalOpen(false)} variant="outline" className="h-11 px-6 font-bold text-slate-600">Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    className="h-7 w-7 flex items-center justify-center rounded border border-red-200 text-red-500 hover:bg-red-50" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => openWaModal(item)}
                    className="h-7 w-7 flex items-center justify-center rounded border border-green-200 bg-green-50 text-green-600 hover:bg-green-100 hover:border-green-300 transition-colors shadow-sm ml-auto" title="Send via WhatsApp">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.488-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                  </button>
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
