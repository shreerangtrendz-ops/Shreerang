import React, { useState, useEffect, useCallback } from 'react';
import { customSupabaseClient as supabase } from '@/lib/customSupabaseClient';

const FABRIC_CATEGORIES = [
  '1-Rayon', '2-Capsule Rayon', '3-Capsule Rayon Doriya', '3-Modal Chanderi',
  '4-Cotton Camric', '5-Mill Print Cotton Camric Jaipuri Prints', '5-Vatican',
  '6-Berlin', '7-Cotton Mul', '8-Mill Print Other Fabrics(O)', '9-Western Wear Prints', '10-Mul chanderi'
];

const DEFAULT_PROCESS = { name: '', rate: 0 };
const DEFAULT_COMPONENT = {
  name: '1pc',
  base_fabric: '',
  width_inches: 44,
  fabric_rate: 0,
  consumption_mtrs: 2.5,
  processes: [{ name: 'Cutting', rate: 0 }, { name: 'Stitching', rate: 0 }],
  wastage_pct: 5,
};

function calcComponentCost(comp) {
  const fabricCost = comp.fabric_rate * comp.consumption_mtrs;
  const processCost = (comp.processes || []).reduce((s, p) => s + parseFloat(p.rate || 0), 0);
  const subTotal = fabricCost + processCost;
  const wastageAmt = subTotal * (comp.wastage_pct / 100);
  return parseFloat((subTotal + wastageAmt).toFixed(2));
}

export default function MTOCostTemplatePage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // list | create | edit
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Form state
  const [form, setForm] = useState({
    design_code: '',
    design_name: '',
    category: '',
    fabric_type: '',
    design_image_url: '',
    components: '1pc',
    component_costs: [{ ...DEFAULT_COMPONENT }],
    markup_pct: 20,
    notes: '',
    id: null
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('design_cost_templates').select('*').eq('is_active', true).order('updated_at', { ascending: false });
    if (selectedCategory !== 'All') q = q.eq('category', selectedCategory);
    if (search) q = q.ilike('design_code', `%${search}%`);
    const { data } = await q.limit(100);
    setTemplates(data || []);
    setLoading(false);
  }, [selectedCategory, search]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const getTotalCost = () => {
    const componentCosts = form.component_costs;
    return componentCosts.reduce((sum, c) => sum + calcComponentCost(c), 0);
  };

  const getSellingPriceLump = () => {
    const cost = getTotalCost();
    return parseFloat((cost * (1 + form.markup_pct / 100)).toFixed(2));
  };

  const getSellingPriceCut = () => {
    return parseFloat((getSellingPriceLump() + 2.5).toFixed(2));
  };

  const addComponent = () => {
    const compCount = form.component_costs.length + 1;
    const labels = ['1pc', '2pc', '3pc', '4pc', '5pc'];
    setForm(prev => ({
      ...prev,
      components: labels[compCount - 1] || `${compCount}pc`,
      component_costs: [...prev.component_costs, { ...DEFAULT_COMPONENT, name: labels[compCount - 1] || `Piece ${compCount}` }]
    }));
  };

  const removeComponent = (idx) => {
    const updated = form.component_costs.filter((_, i) => i !== idx);
    setForm(prev => ({ ...prev, component_costs: updated }));
  };

  const updateComponent = (idx, field, value) => {
    const updated = [...form.component_costs];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm(prev => ({ ...prev, component_costs: updated }));
  };

  const addProcess = (compIdx) => {
    const updated = [...form.component_costs];
    updated[compIdx].processes = [...(updated[compIdx].processes || []), { ...DEFAULT_PROCESS }];
    setForm(prev => ({ ...prev, component_costs: updated }));
  };

  const updateProcess = (compIdx, procIdx, field, value) => {
    const updated = [...form.component_costs];
    updated[compIdx].processes[procIdx] = { ...updated[compIdx].processes[procIdx], [field]: value };
    setForm(prev => ({ ...prev, component_costs: updated }));
  };

  const removeProcess = (compIdx, procIdx) => {
    const updated = [...form.component_costs];
    updated[compIdx].processes = updated[compIdx].processes.filter((_, i) => i !== procIdx);
    setForm(prev => ({ ...prev, component_costs: updated }));
  };

  const handleSave = async () => {
    if (!form.design_code) { alert('Design code is required'); return; }
    setSaving(true);
    const totalCost = getTotalCost();
    const payload = {
      design_code: form.design_code.toUpperCase(),
      design_name: form.design_name,
      category: form.category,
      fabric_type: form.fabric_type,
      design_image_url: form.design_image_url,
      components: form.components,
      component_costs: form.component_costs,
      total_cost_per_set: totalCost,
      markup_pct: form.markup_pct,
      selling_price_lump: getSellingPriceLump(),
      selling_price_cut: getSellingPriceCut(),
      notes: form.notes,
      is_active: true,
      updated_at: new Date().toISOString()
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from('design_cost_templates').update(payload).eq('id', form.id));
    } else {
      ({ error } = await supabase.from('design_cost_templates').insert([payload]));
    }
    setSaving(false);
    if (!error) {
      alert('Template saved successfully!');
      setActiveTab('list');
      fetchTemplates();
      resetForm();
    } else {
      alert('Error: ' + error.message);
    }
  };

  const resetForm = () => setForm({
    design_code: '', design_name: '', category: '', fabric_type: '',
    design_image_url: '', components: '1pc',
    component_costs: [{ ...DEFAULT_COMPONENT }],
    markup_pct: 20, notes: '', id: null
  });

  const loadTemplate = (t) => {
    setForm({
      id: t.id,
      design_code: t.design_code || '',
      design_name: t.design_name || '',
      category: t.category || '',
      fabric_type: t.fabric_type || '',
      design_image_url: t.design_image_url || '',
      components: t.components || '1pc',
      component_costs: t.component_costs || [{ ...DEFAULT_COMPONENT }],
      markup_pct: t.markup_pct || 20,
      notes: t.notes || '',
    });
    setActiveTab('edit');
  };

  const totalCost = getTotalCost();
  const sellingLump = getSellingPriceLump();
  const sellingCut = getSellingPriceCut();

  return (
    <div className="p-4 bg-gray-950 min-h-screen text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">💰 MTO Cost Templates</h1>
          <p className="text-gray-400 text-sm mt-1">Build once, reuse forever. Never recalculate the same design.</p>
        </div>
        {activeTab === 'list' && (
          <button onClick={() => { resetForm(); setActiveTab('create'); }} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium">
            + New Template
          </button>
        )}
        {(activeTab === 'create' || activeTab === 'edit') && (
          <button onClick={() => setActiveTab('list')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">
            ← Back to List
          </button>
        )}
      </div>

      {activeTab === 'list' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <input type="text" placeholder="Search design code..." value={search} onChange={e => setSearch(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 w-48" />
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
              <option value="All">All Categories</option>
              {FABRIC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div></div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <div className="text-5xl mb-4">💰</div>
              <div className="text-lg">No cost templates yet</div>
              <div className="text-sm mt-2">Create your first MTO cost template</div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-800">
                  <th className="text-left p-3 text-gray-400">Design</th>
                  <th className="text-left p-3 text-gray-400">Category</th>
                  <th className="text-left p-3 text-gray-400">Components</th>
                  <th className="text-right p-3 text-gray-400">Total Cost</th>
                  <th className="text-right p-3 text-gray-400">Lump Price</th>
                  <th className="text-right p-3 text-gray-400">Cut Pack</th>
                  <th className="text-right p-3 text-gray-400">Markup</th>
                  <th className="text-center p-3 text-gray-400">Actions</th>
                </tr></thead>
                <tbody>
                  {templates.map(t => (
                    <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {t.design_image_url && <img src={t.design_image_url} alt="" className="w-8 h-8 rounded object-cover" />}
                          <div>
                            <div className="font-medium text-white">{t.design_code}</div>
                            <div className="text-xs text-gray-500">{t.design_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-gray-300">{t.category?.split('-').slice(1).join(' ') || '-'}</td>
                      <td className="p-3 text-gray-300">{t.components || '1pc'}</td>
                      <td className="p-3 text-right text-red-400 font-medium">₹{t.total_cost_per_set}</td>
                      <td className="p-3 text-right text-green-400 font-medium">₹{t.selling_price_lump}</td>
                      <td className="p-3 text-right text-yellow-400">₹{t.selling_price_cut}</td>
                      <td className="p-3 text-right text-gray-400">{t.markup_pct}%</td>
                      <td className="p-3 text-center">
                        <button onClick={() => loadTemplate(t)} className="text-blue-400 hover:text-blue-300 text-xs mr-2">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {(activeTab === 'create' || activeTab === 'edit') && (
        <div className="space-y-6">
          {/* Design Info */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h3 className="font-semibold text-white mb-4">Design Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Design Code *</label>
                <input type="text" value={form.design_code} onChange={e => setForm(p => ({...p, design_code: e.target.value}))}
                  placeholder="e.g. CR-001" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Design Name</label>
                <input type="text" value={form.design_name} onChange={e => setForm(p => ({...p, design_name: e.target.value}))}
                  placeholder="Descriptive name" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                  <option value="">Select category</option>
                  {FABRIC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Fabric Type</label>
                <input type="text" value={form.fabric_type} onChange={e => setForm(p => ({...p, fabric_type: e.target.value}))}
                  placeholder="e.g. Rayon, Cotton" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">Design Image URL (Bunny CDN)</label>
                <input type="text" value={form.design_image_url} onChange={e => setForm(p => ({...p, design_image_url: e.target.value}))}
                  placeholder="https://shreerang.b-cdn.net/fabrics/..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
              </div>
            </div>
          </div>

          {/* Component Cost Builder */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Component Costs</h3>
              <button onClick={addComponent} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm">
                + Add Piece
              </button>
            </div>
            <div className="space-y-6">
              {form.component_costs.map((comp, idx) => {
                const compCost = calcComponentCost(comp);
                return (
                  <div key={idx} className="border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-blue-400">Piece {idx + 1} — {comp.name}</h4>
                      {idx > 0 && (
                        <button onClick={() => removeComponent(idx)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Piece Label</label>
                        <input type="text" value={comp.name} onChange={e => updateComponent(idx, 'name', e.target.value)}
                          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Base Fabric</label>
                        <input type="text" value={comp.base_fabric} onChange={e => updateComponent(idx, 'base_fabric', e.target.value)}
                          placeholder="Fabric name" className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Width (inches)</label>
                        <input type="number" value={comp.width_inches} onChange={e => updateComponent(idx, 'width_inches', parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Fabric Rate (₹/mtr)</label>
                        <input type="number" value={comp.fabric_rate} onChange={e => updateComponent(idx, 'fabric_rate', parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Consumption (mtr)</label>
                        <input type="number" step="0.1" value={comp.consumption_mtrs} onChange={e => updateComponent(idx, 'consumption_mtrs', parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Wastage (%)</label>
                        <input type="number" step="0.5" value={comp.wastage_pct} onChange={e => updateComponent(idx, 'wastage_pct', parseFloat(e.target.value))}
                          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white" />
                      </div>
                    </div>
                    {/* Processes */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-400">Processes / Labour</label>
                        <button onClick={() => addProcess(idx)} className="text-xs text-blue-400 hover:text-blue-300">+ Add Process</button>
                      </div>
                      <div className="space-y-1">
                        {(comp.processes || []).map((proc, pIdx) => (
                          <div key={pIdx} className="flex gap-2 items-center">
                            <input type="text" placeholder="Process name" value={proc.name} onChange={e => updateProcess(idx, pIdx, 'name', e.target.value)}
                              className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white" />
                            <input type="number" placeholder="Rate ₹" value={proc.rate} onChange={e => updateProcess(idx, pIdx, 'rate', parseFloat(e.target.value))}
                              className="w-24 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white" />
                            <button onClick={() => removeProcess(idx, pIdx)} className="text-red-400 hover:text-red-300 text-xs px-1">×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Component Cost Summary */}
                    <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Fabric: ₹{(comp.fabric_rate * comp.consumption_mtrs).toFixed(2)} + 
                        Processes: ₹{(comp.processes||[]).reduce((s,p) => s+parseFloat(p.rate||0),0).toFixed(2)} + 
                        Wastage {comp.wastage_pct}%
                      </div>
                      <div className="text-sm font-bold text-yellow-400">₹{compCost.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h3 className="font-semibold text-white mb-4">Pricing & Markup</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Total Cost</div>
                <div className="text-xl font-bold text-red-400">₹{totalCost.toFixed(2)}</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3">
                <label className="block text-xs text-gray-500 mb-1">Markup %</label>
                <input type="number" step="0.5" value={form.markup_pct} onChange={e => setForm(p => ({...p, markup_pct: parseFloat(e.target.value)}))}
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white text-center font-bold" />
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Selling (Lump)</div>
                <div className="text-xl font-bold text-green-400">₹{sellingLump.toFixed(2)}</div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-500 mb-1">Selling (Cut Pack)</div>
                <div className="text-xl font-bold text-yellow-400">₹{sellingCut.toFixed(2)}</div>
                <div className="text-xs text-gray-600 mt-1">+₹2.50/pc</div>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
                placeholder="Any notes about this design cost..." rows={2}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button onClick={() => setActiveTab('list')} className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-sm font-medium">
              {saving ? 'Saving...' : (form.id ? '💾 Update Template' : '💾 Save Template')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
