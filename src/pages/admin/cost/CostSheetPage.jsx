
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Calculator, Save, Printer, History, Plus, Trash2, RefreshCw, Download, Eye } from 'lucide-react';
import { JobCardService } from '@/services/JobCardService';

const PATHS = [
  { id: 'path1', name: 'Grey Only', bg: 'bg-blue-500' },
  { id: 'path2', name: 'Grey to RFD', bg: 'bg-green-500' },
  { id: 'path3', name: 'Grey to RFD to Digital', bg: 'bg-teal-500' },
  { id: 'path4', name: 'Grey to Mill Process', bg: 'bg-orange-500' },
  { id: 'path5', name: 'Grey to Dyed', bg: 'bg-purple-500' },
  { id: 'path6', name: 'Grey to Mill to Schiffli to Deca', bg: 'bg-amber-700' },
  { id: 'path7', name: 'Grey to Schiffli to Mill', bg: 'bg-rsed-500' },
  { id: 'path8', name: 'Grey to Schiffli to Deca', bg: 'bg-rose-800' },
  { id: 'path9', name: 'Grey to Schiffli to RFD to Digital', bg: 'bg-slate-800' },
];

const EMPTY_FORM = {
  sku: '', design_number: '', path: '',
  inputQty: 1000, factoryCost: 0, margin: 20, dhara: 7, sellingPrice: 0,
  fabric_name: '', buyer_name: '', notes: '',
};

export default function CostSheetPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
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

  useEffect(() => { loadHistory(); }, []);

  const handleSave = async () => {
    if (!form.sku || !form.design_number) {
      toast({ title: 'SKU and Design Number are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await JobCardService.create({ ...form, sellingPrice });
      toast({ title: 'Cost sheet saved successfully!' });
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
      <html><head><title>Cost Sheet - ${form.sku}</title>
      <style>body{font-family:Arial;padding:20px;} table{width:100%;border-collapse:collapse;} td,th{padding:8px;border:1px solid #ccc;} h2{color:#1e40af;}</style>
      </head><body>
      <h2>Cost Sheet: ${form.sku}</h2>
      <p>Design: ${form.design_number} | Path: ${form.path} | Fabric: ${form.fabric_name}</p>
      <table>
        <tr><th>Item</th><th>Value</th></tr>
        <tr><td>Input Quantity</td><td>${form.inputQty} meters</td></tr>
        <tr><td>Factory Cost</td><td>Rs. ${form.factoryCost}</td></tr>
        <tr><td>Margin (${form.margin}%)</td><td>Rs. ${marginAmt.toFixed(2)}</td></tr>
        <tr><td>Dhara (${form.dhara}%)</td><td>Rs. ${dharaAmt.toFixed(2)}</td></tr>
        <tr><th>Selling Price</th><th>Rs. ${sellingPrice.toFixed(2)}</th></tr>
      </table>
      ${form.notes ? '<p>Notes: ' + form.notes + '</p>' : ''}
      <p style="margin-top:20px;color:#666;font-size:12px;">Generated: ${new Date().toLocaleString()}</p>
      </body></html>
    `;
    const win = window.open('', '_blank');
    win.document.write(printContent);
    win.document.close();
    win.print();
  };

  const exportCSV = () => {
    if (history.length === 0) { toast({ title: 'No history to export' }); return; }
    const headers = ['SKU','Design','Path','Fabric','Buyer','Qty','Factory Cost','Margin%','Dhara%','Selling Price','Notes','Date'];
    const rows = history.map(h => [
      h.sku, h.design_number, h.path, h.fabric_name || '', h.buyer_name || '',
      h.inputQty, h.factoryCost, h.margin, h.dhara, h.sellingPrice, h.notes || '',
      h.created_at ? new Date(h.created_at).toLocaleDateString() : ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => '"' + String(v || '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'cost_sheets_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click(); URL.revokeObjectURL(url);
    toast({ title: 'CSV exported successfully' });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cost Sheet Builder</h1>
          <p className="text-gray-500 text-sm mt-1">Build, save and track cost sheets for all designs</p>
        </div>
        <div className="flex gap-2">
          <Button variant={activeTab === 'builder' ? 'default' : 'outline'} onClick={() => setActiveTab('builder')}>
            <Calculator className="w-4 h-4 mr-2" /> Builder
          </Button>
          <Button variant={activeTab === 'history' ? 'default' : 'outline'} onClick={() => { setActiveTab('history'); loadHistory(); }}>
            <History className="w-4 h-4 mr-2" /> History ({history.length})
          </Button>
        </div>
      </div>

      {activeTab === 'builder' && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Design Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">SKU *</label>
                    <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. SRT-2024-001" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Design Number *</label>
                    <Input value={form.design_number} onChange={e => setForm(f => ({ ...f, design_number: e.target.value }))} placeholder="e.g. D-450" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Fabric Name</label>
                    <Input value={form.fabric_name} onChange={e => setForm(f => ({ ...f, fabric_name: e.target.value }))} placeholder="e.g. Cotton Voile" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Buyer Name</label>
                    <Input value={form.buyer_name} onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))} placeholder="e.g. Reliance Trends" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">Process Path</label>
                  <div className="flex flex-wrap gap-2">
                    {PATHS.map(p => (
                      <button key={p.id} onClick={() => setForm(f => ({ ...f, path: p.name }))}
                        className={'px-3 py-1 rounded-full text-xs font-medium transition-all ' +
                          (form.path === p.name ? p.bg + ' text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Cost Inputs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Input Qty (meters)</label>
                    <Input type="number" value={form.inputQty} onChange={e => setForm(f => ({ ...f, inputQty: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Factory Cost (Rs./meter)</label>
                    <Input type="number" value={form.factoryCost} onChange={e => setForm(f => ({ ...f, factoryCost: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Margin %</label>
                    <Input type="number" value={form.margin} onChange={e => setForm(f => ({ ...f, margin: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Dhara %</label>
                    <Input type="number" value={form.dhara} onChange={e => setForm(f => ({ ...f, dhara: e.target.value }))} />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
                  <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes..." />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white flex-1">
                <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Cost Sheet'}
              </Button>
              <Button onClick={handlePrint} variant="outline">
                <Printer className="w-4 h-4 mr-2" /> Print / PDF
              </Button>
              <Button onClick={() => setForm({ ...EMPTY_FORM })} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" /> Reset
              </Button>
            </div>
          </div>

          <div className="col-span-1 space-y-4">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-800">Live Price Calculation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-blue-100">
                  <span className="text-sm text-gray-600">Factory Cost</span>
                  <span className="font-semibold text-gray-800">Rs. {parseFloat(form.factoryCost || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-100">
                  <span className="text-sm text-gray-600">+ Margin ({form.margin}%)</span>
                  <span className="font-semibold text-green-600">+ Rs. {marginAmt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-blue-100">
                  <span className="text-sm text-gray-600">+ Dhara ({form.dhara}%)</span>
                  <span className="font-semibold text-orange-600">+ Rs. {dharaAmt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-blue-600 rounded-lg px-3">
                  <span className="text-white font-bold">Selling Price</span>
                  <span className="text-white text-xl font-bold">Rs. {sellingPrice.toFixed(2)}</span>
                </div>
                {form.inputQty > 0 && (
                  <div className="flex justify-between items-center py-2 bg-white rounded-lg px-3 border border-blue-200">
                    <span className="text-sm text-gray-600">Total ({form.inputQty}m)</span>
                    <span className="font-bold text-blue-700">Rs. {(sellingPrice * parseFloat(form.inputQty || 0)).toFixed(0)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-gray-600">Recent Cost Sheets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.slice(0, 5).map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                    <div>
                      <div className="font-medium text-gray-800">{h.sku}</div>
                      <div className="text-gray-500">{h.design_number}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-700">Rs. {parseFloat(h.sellingPrice || 0).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
                {history.length === 0 && <p className="text-gray-400 text-xs text-center py-3">No saved sheets yet</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Cost Sheet History ({history.length})</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={loadHistory} disabled={loadingHistory}>
                  <RefreshCw className={'w-4 h-4 mr-1 ' + (loadingHistory ? 'animate-spin' : '')} /> Refresh
                </Button>
                <Button size="sm" onClick={exportCSV} className="bg-green-600 hover:bg-green-700 text-white">
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No cost sheets saved yet.</p>
                <Button className="mt-3" onClick={() => setActiveTab('builder')}>
                  <Plus className="w-4 h-4 mr-2" /> Create First Cost Sheet
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">SKU</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Design</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Path</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-600">Fabric</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Factory Cost</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-600">Selling Price</th>
                      <th className="text-center py-2 px-3 font-semibold text-gray-600">Date</th>
                      <th className="text-center py-2 px-3 font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-3 font-medium text-blue-700">{h.sku}</td>
                        <td className="py-2 px-3 text-gray-700">{h.design_number}</td>
                        <td className="py-2 px-3">
                          <Badge className="text-xs bg-purple-100 text-purple-700">{h.path || '-'}</Badge>
                        </td>
                        <td className="py-2 px-3 text-gray-600">{h.fabric_name || '-'}</td>
                        <td className="py-2 px-3 text-right text-gray-700">Rs. {parseFloat(h.factoryCost || 0).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-bold text-green-700">Rs. {parseFloat(h.sellingPrice || 0).toFixed(2)}</td>
                        <td className="py-2 px-3 text-center text-gray-500 text-xs">
                          {h.created_at ? new Date(h.created_at).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button onClick={() => setPreviewItem(h)}
                            className="text-blue-500 hover:text-blue-700 p-1">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold border-t-2">
                      <td colSpan={5} className="py-2 px-3 text-right text-gray-700">Total Selling Value:</td>
                      <td className="py-2 px-3 text-right text-green-700">
                        Rs. {history.reduce((s, h) => s + (parseFloat(h.sellingPrice || 0) * parseFloat(h.inputQty || 0)), 0).toFixed(0)}
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

      {previewItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Cost Sheet: {previewItem.sku}</CardTitle>
                <button onClick={() => setPreviewItem(null)} className="text-gray-400 hover:text-gray-600 text-lg">x</button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Design:</span> <strong>{previewItem.design_number}</strong></div>
                <div><span className="text-gray-500">Fabric:</span> <strong>{previewItem.fabric_name || '-'}</strong></div>
                <div><span className="text-gray-500">Buyer:</span> <strong>{previewItem.buyer_name || '-'}</strong></div>
                <div><span className="text-gray-500">Path:</span> <strong>{previewItem.path || '-'}</strong></div>
                <div><span className="text-gray-500">Qty:</span> <strong>{previewItem.inputQty}m</strong></div>
                <div><span className="text-gray-500">Factory Cost:</span> <strong>Rs. {parseFloat(previewItem.factoryCost || 0).toFixed(2)}</strong></div>
                <div><span className="text-gray-500">Margin:</span> <strong>{previewItem.margin}%</strong></div>
                <div><span className="text-gray-500">Dhara:</span> <strong>{previewItem.dhara}%</strong></div>
              </div>
              <div className="bg-blue-600 rounded-lg p-3 flex justify-between items-center text-white">
                <span className="font-bold">Selling Price</span>
                <span className="text-xl font-bold">Rs. {parseFloat(previewItem.sellingPrice || 0).toFixed(2)}</span>
              </div>
              {previewItem.notes && <p className="text-sm text-gray-600 italic">Notes: {previewItem.notes}</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
