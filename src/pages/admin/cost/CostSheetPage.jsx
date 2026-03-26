import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Calculator, Save, Printer, History, Plus, RefreshCw, Download, Eye, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { JobCardService } from '@/services/JobCardService';
import { customSupabaseClient as supabase } from '@/lib/customSupabaseClient';

const PATHS = [
  { id: 'path1', name: 'Grey Only', bg: 'bg-blue-500' },
  { id: 'path2', name: 'Grey to RFD', bg: 'bg-green-500' },
  { id: 'path3', name: 'Grey to RFD to Digital', bg: 'bg-teal-500' },
  { id: 'path4', name: 'Grey to Mill Process', bg: 'bg-orange-500' },
  { id: 'path5', name: 'Grey to Dyed', bg: 'bg-purple-500' },
  { id: 'path6', name: 'Grey to Mill to Schiffli to Deca', bg: 'bg-amber-700' },
  { id: 'path7', name: 'Grey to Schiffli to Mill', bg: 'bg-red-500' },
  { id: 'path8', name: 'Grey to Schiffli to Deca', bg: 'bg-rose-800' },
  { id: 'path9', name: 'Grey to Schiffli to RFD to Digital', bg: 'bg-slate-800' },
];

const EMPTY_FORM = {
  sku: '', design_number: '', path: '',
  inputQty: 1000, factoryCost: 0, margin: 20, dhara: 7, sellingPrice: 0,
  fabric_name: '', buyer_name: '', notes: '', image_url: ''
};

export default function CostSheetPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [history, setHistory] = useState([]);
  const [tallyReceipts, setTallyReceipts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingTally, setLoadingTally] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('builder');
  const [previewItem, setPreviewItem] = useState(null);

  const totalCost = parseFloat(form.factoryCost) || 0;
  const marginAmt = (totalCost * (parseFloat(form.margin) || 0)) / 100;
  const dharaAmt = (totalCost * (parseFloat(form.dhara) || 0)) / 100;
  const sellingPrice = totalCost + marginAmt + dharaAmt;

  useEffect(() => {
    setForm(f => ({ ...f, sellingPrice: sellingPrice.toFixed(2) }));
  }, [form.factoryCost, form.margin, form.dhara]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await JobCardService.getAll();
      setHistory(data || []);
    } catch (e) {
      toast({ title: 'Could not load history', variant: 'destructive' });
    }
    setLoadingHistory(false);
  }, [toast]);

  const loadTallyReceipts = async () => {
    setLoadingTally(true);
    try {
      // Fetch received meters from Tally Data
      const { data: receipts, error: rxErr } = await supabase
        .from('process_issues')
        .select('*')
        .eq('process_type', 'Receive from Mill')
        .order('issue_date', { ascending: false })
        .limit(50);
        
      if (rxErr) throw rxErr;

      // Extract unique fabric names/design codes to map images
      const designNames = receipts.map(r => r.finished_fabric_name || (r.line_items && r.line_items[0]?.item_name)).filter(Boolean);
      
      const { data: designs } = await supabase
        .from('fabric_designs')
        .select('design_code, file_name, bunny_url')
        .in('design_code', designNames.map(d => d.split(' ')[0])); // naive split to grab code

      const mappedReceipts = receipts.map(r => {
        const itemName = r.finished_fabric_name || (r.line_items && r.line_items[0]?.item_name) || 'Unknown Fabric';
        const dcode = itemName.split(' ')[0]; // assuming "D-450 Cotton" format
        const matchingDesign = designs?.find(d => d.design_code?.includes(dcode) || d.file_name?.includes(dcode));
        return {
          ...r,
          display_name: itemName,
          metres: r.metres_received || (r.line_items && r.line_items[0]?.quantity) || 0,
          image_url: matchingDesign?.bunny_url || null
        };
      });

      setTallyReceipts(mappedReceipts);
    } catch (e) {
      console.error(e);
      toast({ title: 'Could not load Tally receipts', variant: 'destructive' });
    }
    setLoadingTally(false);
  };

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleCreateFromTally = (receipt) => {
    setForm({
      ...EMPTY_FORM,
      sku: receipt.voucher_number || `SYNC-${Date.now().toString().slice(-6)}`,
      design_number: receipt.display_name,
      fabric_name: receipt.display_name,
      inputQty: receipt.metres || 0,
      image_url: receipt.image_url || '',
      notes: `Generated from Tally Sync: ${receipt.voucher_number} - ${receipt.mill_name}`
    });
    setActiveTab('builder');
    toast({ title: 'Tally data imported to builder!' });
  };

  const handleSave = async () => {
    if (!form.sku || !form.design_number) {
      toast({ title: 'SKU and Design Number are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Note: Make sure JobCardService passes image_url if the DB supports it
      const payload = { ...form, sellingPrice };
      await JobCardService.create(payload);

      toast({ title: 'Visual Cost sheet saved successfully!' });
      setForm({ ...EMPTY_FORM });
      await loadHistory();
      setActiveTab('history');
    } catch (e) {
      toast({ title: 'Save failed', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handlePrint = () => {
    const printContent = `
      <html><head><title>Design Cost Sheet - ${form.sku}</title>
      <style>body{font-family:Arial;padding:20px;max-width:800px;margin:auto;} table{width:100%;border-collapse:collapse;margin-top:20px;} td,th{padding:10px;border:1px solid #ddd;text-align:left;} th{background:#f9f9f9;} h2{color:#1e40af;} .header-box{display:flex;justify-content:space-between;align-items:center;background:#f0f4f8;padding:20px;border-radius:10px;margin-bottom:20px;} .img-box{width:150px;height:150px;border-radius:10px;object-fit:cover;box-shadow:0 4px 6px rgba(0,0,0,0.1);}</style>
      </head><body>
      
      <div class="header-box">
        <div>
          <h2 style="margin:0 0 10px 0;">Design Cost Profile: ${form.design_number}</h2>
          <p style="margin:5px 0;color:#555;"><strong>SKU:</strong> ${form.sku}</p>
          <p style="margin:5px 0;color:#555;"><strong>Process Path:</strong> ${form.path || 'Standard'}</p>
          <p style="margin:5px 0;color:#555;"><strong>Fabric Quality:</strong> ${form.fabric_name || '-'}</p>
        </div>
        ${form.image_url ? `<img src="${form.image_url}" class="img-box" alt="Design Image"/>` : `<div style="width:150px;height:150px;background:#ddd;display:flex;align-items:center;justify-content:center;border-radius:10px;color:#888;">No Image</div>`}
      </div>

      <table>
        <tr><th colspan="2">Manufacturing & Cost Inputs</th></tr>
        <tr><td width="50%">Input Quantity (from Mill)</td><td><strong>${form.inputQty} meters</strong></td></tr>
        <tr><td>Base Factory Cost</td><td>Rs. ${form.factoryCost} / meter</td></tr>
        <tr><td>Required Margin (${form.margin}%)</td><td>Rs. ${marginAmt.toFixed(2)}</td></tr>
        <tr><td>Dhara / Commission (${form.dhara}%)</td><td>Rs. ${dharaAmt.toFixed(2)}</td></tr>
        <tr><th style="font-size:18px;color:#1e40af;">Final Selling Price</th><th style="font-size:18px;color:#1e40af;">Rs. ${sellingPrice.toFixed(2)} / meter</th></tr>
      </table>

      ${form.notes ? '<p style="margin-top:20px;"><strong>Operational Notes:</strong> ' + form.notes + '</p>' : ''}
      <p style="margin-top:40px;text-align:center;color:#999;font-size:12px;border-top:1px solid #ddd;padding-top:10px;">Generated automatically by Shreerang Costing Engine - ${new Date().toLocaleString()}</p>
      </body></html>
    `;
    const win = window.open('', '_blank');
    win.document.write(printContent);
    win.document.close();
    win.print();
  };

  // ... (Export CSV omitted for brevity)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visual Cost Engine</h1>
          <p className="text-gray-500 text-sm mt-1">Link Tally Mill receipts directly to design images and calculate costs</p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === 'tally' ? 'default' : 'outline'} onClick={() => { setActiveTab('tally'); loadTallyReceipts(); }} className={activeTab === 'tally' ? 'bg-indigo-600' : ''}>
            <LinkIcon className="w-4 h-4 mr-2" /> Sync Tally Receipts
          </Button>
          <Button variant={activeTab === 'builder' ? 'default' : 'outline'} onClick={() => setActiveTab('builder')}>
            <Calculator className="w-4 h-4 mr-2" /> Cost Builder
          </Button>
          <Button variant={activeTab === 'history' ? 'default' : 'outline'} onClick={() => { setActiveTab('history'); loadHistory(); }}>
            <History className="w-4 h-4 mr-2" /> Database ({history.length})
          </Button>
        </div>
      </div>

      {activeTab === 'tally' && (
        <Card className="border-indigo-100 shadow-sm border-t-4 border-t-indigo-500">
          <CardHeader className="pb-3 flex justify-between flex-row items-center">
            <div>
              <CardTitle className="text-base text-indigo-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-500" /> Recent Mill Receipts (Tally Sync)
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">Select a freshly received fabric batch to generate its Official Cost Sheet.</p>
            </div>
            <Button size="sm" variant="outline" onClick={loadTallyReceipts} disabled={loadingTally}>
              {loadingTally ? 'Scanning Tally...' : 'Refresh Database'}
            </Button>
          </CardHeader>
          <CardContent>
             {loadingTally ? <div className="py-10 text-center animate-pulse text-indigo-400 font-medium">Extracting Mill Receipts from Tally JSONB...</div> :
              tallyReceipts.length === 0 ? <p className="text-center text-gray-500 py-10">No recent mill receipts found. Make sure Tally Sync is running.</p> :
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tallyReceipts.map(receipt => (
                  <div key={receipt.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                    <div className="h-40 bg-gray-100 relative">
                       {receipt.image_url ? 
                         <img src={receipt.image_url} alt="Design" className="w-full h-full object-cover" /> :
                         <div className="flex items-center justify-center w-full h-full text-gray-400 flex-col"><ImageIcon className="w-8 h-8 mb-2 opacity-50"/> <span>No Image Matched</span></div>
                       }
                       <Badge className="absolute top-2 right-2 bg-indigo-600 shadow-sm">{receipt.metres} meters</Badge>
                    </div>
                    <div className="p-3 bg-white flex-1 flex flex-col justify-between">
                       <div>
                         <h4 className="font-bold text-gray-800 text-sm truncate">{receipt.display_name}</h4>
                         <p className="text-xs text-gray-500 mt-1">From: {receipt.mill_name}</p>
                         <p className="text-xs text-gray-400">Voucher: {receipt.voucher_number}</p>
                       </div>
                       <Button size="sm" onClick={() => handleCreateFromTally(receipt)} className="w-full mt-3 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50">
                         Generate Visual Cost Sheet
                       </Button>
                    </div>
                  </div>
                ))}
              </div>
             }
          </CardContent>
        </Card>
      )}

      {activeTab === 'builder' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <Card className={form.image_url ? "border-t-4 border-t-blue-500 shadow-md" : ""}>
              <CardHeader className="pb-3 border-b flex justify-between flex-row items-center bg-gray-50/50">
                <CardTitle className="text-sm font-semibold flex items-center">
                  <Calculator className="w-4 h-4 mr-2 text-blue-500"/> Design & Pricing Data
                </CardTitle>
                {form.image_url && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><LinkIcon className="w-3 h-3 mr-1"/> Tally + Image Linked</Badge>}
              </CardHeader>
              <CardContent className="space-y-6 pt-5">
                <div className="flex gap-6">
                  {/* Image Preview Panel */}
                  <div className="w-48 flex-shrink-0">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Design Asset</label>
                    <div className="w-full aspect-square border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex flex-col items-center justify-center relative group">
                      {form.image_url ? (
                        <>
                          <img src={form.image_url} alt="Design" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button size="sm" variant="secondary" onClick={() => setForm(f=>({...f, image_url: ''}))} className="h-7 text-xs">Remove</Button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-[10px] text-gray-400 text-center leading-tight">No image linked.<br/>Import from Tally tab or paste URL.</p>
                        </div>
                      )}
                    </div>
                    {!form.image_url && (
                       <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="Paste Image URL" className="mt-2 h-7 text-xs bg-gray-50" />
                    )}
                  </div>

                  {/* Fields Panel */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">SKU / Voucher Number *</label>
                        <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className="bg-gray-50" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Design Number / Name *</label>
                        <Input value={form.design_number} onChange={e => setForm(f => ({ ...f, design_number: e.target.value }))} className="font-semibold text-gray-800" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-600 block mb-1">Fabric Quality</label>
                        <Input value={form.fabric_name} onChange={e => setForm(f => ({ ...f, fabric_name: e.target.value }))} placeholder="e.g. Cotton Voile" />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">Manufacturing Process Path</label>
                  <div className="flex flex-wrap gap-2">
                    {PATHS.map(p => (
                      <button key={p.id} onClick={() => setForm(f => ({ ...f, path: p.name }))}
                        className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ' +
                          (form.path === p.name ? p.bg + ' text-white border-transparent shadow-sm scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50')}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Cost Configuration</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Meters Received</label>
                      <div className="relative">
                        <Input type="number" value={form.inputQty} onChange={e => setForm(f => ({ ...f, inputQty: e.target.value }))} className="font-semibold text-indigo-700 bg-white" />
                        <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">m</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Base Cost</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-gray-500 font-bold">₹</span>
                        <Input type="number" value={form.factoryCost} onChange={e => setForm(f => ({ ...f, factoryCost: e.target.value }))} className="pl-7 bg-white" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Margin</label>
                      <div className="relative">
                        <Input type="number" value={form.margin} onChange={e => setForm(f => ({ ...f, margin: e.target.value }))} className="pr-7 bg-white" />
                        <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-bold">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Dhara</label>
                      <div className="relative">
                        <Input type="number" value={form.dhara} onChange={e => setForm(f => ({ ...f, dhara: e.target.value }))} className="pr-7 bg-white" />
                        <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-bold">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Operational Notes & Details</label>
                  <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="E.g. Transport details, specific finishes applied..." className="bg-gray-50" />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="bg-gray-900 hover:bg-black text-white flex-1 h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all">
                <Save className="w-5 h-5 mr-2" /> {saving ? 'Saving System Record...' : 'Save & Publish Cost Sheet'}
              </Button>
              <Button onClick={handlePrint} variant="outline" className="h-12 px-6 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium whitespace-nowrap">
                <Printer className="w-5 h-5 mr-2 text-gray-500" /> Export PDF / WhatsApp View
              </Button>
            </div>
          </div>

          <div className="col-span-1 space-y-4">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-xl border-0 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              <CardHeader className="pb-3 border-b border-gray-700/50 relative z-10">
                <CardTitle className="text-sm font-semibold text-gray-200">Financial Summary</CardTitle>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Per Meter Metrics</p>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10 pt-5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">Base Factory Cost</span>
                  <span className="font-semibold text-gray-200">₹{parseFloat(form.factoryCost || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-300">+ Profit Margin ({form.margin}%)</span>
                  <span className="font-semibold text-green-400">+ ₹{marginAmt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-700/50 pb-4">
                  <span className="text-sm text-gray-300">+ Dhara Comm. ({form.dhara}%)</span>
                  <span className="font-semibold text-orange-400">+ ₹{dharaAmt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-200 font-medium">Final Selling Price</span>
                  <span className="text-white text-3xl font-black tracking-tight">₹{sellingPrice.toFixed(2)}</span>
                </div>
                {form.inputQty > 0 && (
                  <div className="mt-4 p-4 bg-black/30 rounded-xl border border-white/10 backdrop-blur-md">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Total Batch Value ({form.inputQty}m)</p>
                    <p className="text-xl font-bold text-white tracking-tight">₹{(sellingPrice * parseFloat(form.inputQty || 0)).toLocaleString('en-IN', {maximumFractionDigits:0})}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Cost Sheet Database ({history.length})</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={loadHistory} disabled={loadingHistory}>
                  <RefreshCw className={'w-4 h-4 mr-1 ' + (loadingHistory ? 'animate-spin' : '')} /> Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No cost sheets saved yet.</p>
                <Button className="mt-3" onClick={() => setActiveTab('tally')}>
                   Load from Tally Receipts
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Image</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">SKU / Design</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Fabric & Path</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Factory Cost</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Selling Price</th>
                      <th className="text-center py-2 px-3 font-semibold text-gray-600">Date</th>
                      <th className="text-center py-2 px-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-3">
                           {h.image_url ? <img src={h.image_url} alt="" className="w-10 h-10 object-cover rounded-md shadow-sm border"/> : <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-[10px] text-gray-400 border text-center leading-tight">No Img</div>}
                        </td>
                        <td className="py-2 px-3 font-medium text-indigo-700"><div>{h.sku}</div><div className="text-gray-500 font-normal">{h.design_number}</div></td>
                        <td className="py-2 px-3"><div className="text-gray-700">{h.fabric_name || '-'}</div><Badge className="text-[10px] mt-1 bg-gray-100 text-gray-700">{h.path || 'Standard'}</Badge></td>
                        <td className="py-2 px-3 text-right text-gray-700">₹{parseFloat(h.factoryCost || 0).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-bold text-green-700">₹{parseFloat(h.sellingPrice || 0).toFixed(2)}</td>
                        <td className="py-2 px-3 text-center text-gray-500 text-xs">{h.created_at ? new Date(h.created_at).toLocaleDateString('en-IN') : '-'}</td>
                        <td className="py-2 px-3 text-center">
                          <button onClick={() => setPreviewItem(h)} className="text-indigo-500 hover:text-indigo-700 p-1 bg-indigo-50 rounded shadow-sm hover:shadow transition-all"><Eye className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold border-t-2">
                      <td colSpan={4} className="py-2 px-3 text-right text-gray-700">Total Database Selling Value:</td>
                      <td className="py-2 px-3 text-right text-black text-lg">
                        ₹{history.reduce((s, h) => s + (parseFloat(h.sellingPrice || 0) * parseFloat(h.inputQty || 0)), 0).toLocaleString('en-IN', {maximumFractionDigits:0})}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
