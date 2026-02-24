
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Trash2, List, Zap, CheckCircle, RefreshCw, Search } from 'lucide-react';
import { DropdownService } from '@/services/DropdownService';

const INDUSTRY_DEFAULTS = {
  'Fiber Category': ['Cotton','Polyester','Viscose','Silk','Linen','Nylon','Wool','Blended','Acrylic','Modal'],
  'Process Type': ['Grey','Bleached','Dyed','Printed','Yarn Dyed','Embroidered','Washed','Coated'],
  'Width': ['36 inch','44 inch','54 inch','58 inch','60 inch','72 inch','90 inch','108 inch'],
  'Construction': ['Plain','Twill','Satin','Dobby','Jacquard','Crepe','Georgette','Chiffon','Canvas'],
  'Stretchability': ['Non-Stretch','Low Stretch','Medium Stretch','High Stretch','4-Way Stretch'],
  'Transparency': ['Opaque','Semi-Transparent','Transparent','Sheer'],
  'Handfeel': ['Soft','Crisp','Smooth','Rough','Silky','Coarse','Medium','Stiff'],
  'Yarn Type': ['Single','Double','Twisted','Textured','Filament','Spun','Open End','Ring Spun'],
  'Value Addition': ['Embroidery','Printing','Dyeing','Washing','Coating','Lamination','Pleating','Smocking'],
  'Class Type': ['Economy','Standard','Premium','Luxury','Export Quality'],
};

export default function DropdownManagerPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState('');
  const [options, setOptions] = useState([]);
  const [newOption, setNewOption] = useState('');
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      const data = await DropdownService.getCategories();
      setCategories(data || []);
      if (data && data.length > 0 && !selected) {
        setSelected(data[0].name || data[0]);
      }
    } catch (e) {
      toast({ title: 'Error loading categories', variant: 'destructive' });
    }
  }, [selected, toast]);

  const loadOptions = useCallback(async (cat) => {
    try {
      const data = await DropdownService.getOptions(cat);
      setOptions(data || []);
    } catch (e) {
      setOptions([]);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { if (selected) loadOptions(selected); }, [selected, loadOptions]);

  const addOption = async () => {
    if (!newOption.trim() || !selected) return;
    setLoading(true);
    try {
      await DropdownService.addOption(selected, newOption.trim());
      setNewOption('');
      await loadOptions(selected);
      toast({ title: 'Option added successfully' });
    } catch (e) {
      toast({ title: 'Failed to add option', variant: 'destructive' });
    }
    setLoading(false);
  };

  const deleteOption = async (optionId) => {
    try {
      await DropdownService.deleteOption(optionId);
      await loadOptions(selected);
      toast({ title: 'Option removed' });
    } catch (e) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const seedCategory = async (catName) => {
    const defaults = INDUSTRY_DEFAULTS[catName] || [];
    const existing = options.map(o => (o.value || o.label || o).toLowerCase());
    const toAdd = defaults.filter(d => !existing.includes(d.toLowerCase()));
    if (toAdd.length === 0) { toast({ title: 'All defaults already exist for ' + catName }); return; }
    try {
      for (const item of toAdd) await DropdownService.addOption(catName, item);
      await loadOptions(selected);
      toast({ title: 'Added ' + toAdd.length + ' defaults to ' + catName });
    } catch (e) {
      toast({ title: 'Seed failed', variant: 'destructive' });
    }
  };

  const seedAll = async () => {
    setSeeding(true);
    let total = 0;
    try {
      for (const [catName, defaults] of Object.entries(INDUSTRY_DEFAULTS)) {
        for (const item of defaults) {
          try { await DropdownService.addOption(catName, item); total++; } catch (e) {}
        }
      }
      await loadCategories();
      toast({ title: 'Seeded ' + total + ' industry defaults across all categories' });
    } catch (e) {
      toast({ title: 'Seed all failed', variant: 'destructive' });
    }
    setSeeding(false);
  };

  const optionLabels = options.map(o => (o.value || o.label || o).toLowerCase());
  const defaults = INDUSTRY_DEFAULTS[selected] || [];
  const missing = defaults.filter(d => !optionLabels.includes(d.toLowerCase()));
  const filteredOptions = options.filter(o => {
    const label = (o.value || o.label || o).toLowerCase();
    return label.includes(search.toLowerCase());
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dropdown Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Manage dropdown options used across all forms</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCategories}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button onClick={seedAll} disabled={seeding} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Zap className="w-4 h-4 mr-2" />
            {seeding ? 'Seeding...' : 'Seed All Industry Defaults'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <List className="w-4 h-4" /> Categories ({categories.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {categories.map((cat, i) => {
                  const catName = cat.name || cat;
                  const hasDefaults = !!INDUSTRY_DEFAULTS[catName];
                  return (
                    <button key={i} onClick={() => setSelected(catName)}
                      className={'w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between transition-colors ' +
                        (selected === catName ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100 text-gray-700')}>
                      <span className="truncate">{catName}</span>
                      {hasDefaults && <Badge className="text-xs bg-green-100 text-green-700 ml-1 shrink-0">auto</Badge>}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-3 space-y-4">
          {selected ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Add Option to: <span className="text-blue-600">{selected}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input value={newOption} onChange={e => setNewOption(e.target.value)}
                      placeholder="Type new option and press Enter..."
                      onKeyDown={e => { if (e.key === 'Enter') addOption(); }} className="flex-1" />
                    <Button onClick={addOption} disabled={loading || !newOption.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {missing.length > 0 && (
                <Card className="border-amber-300 bg-amber-50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-amber-800">
                        Missing Industry Defaults ({missing.length})
                      </CardTitle>
                      <Button size="sm" onClick={() => seedCategory(selected)} className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs">
                        <Zap className="w-3 h-3 mr-1" /> Add All Missing
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {missing.map((m, i) => (
                        <button key={i} onClick={async () => {
                          setLoading(true);
                          try { await DropdownService.addOption(selected, m); await loadOptions(selected); toast({ title: m + ' added' }); } catch(e) {}
                          setLoading(false);
                        }} className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs rounded border border-amber-300 transition-colors">
                          + {m}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      Current Options ({options.length})
                      {defaults.length > 0 && missing.length === 0 && (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-normal">
                          <CheckCircle className="w-3 h-3" /> All defaults present
                        </span>
                      )}
                    </CardTitle>
                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search options..." className="pl-7 h-7 text-xs w-40" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredOptions.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">
                      {options.length === 0 ? 'No options yet. Add above or seed defaults.' : 'No options match your search.'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {filteredOptions.map((opt, i) => {
                        const label = opt.value || opt.label || opt;
                        const id = opt.id || i;
                        return (
                          <div key={i} className="flex items-center gap-1 bg-gray-100 hover:bg-red-50 rounded-full px-3 py-1 group transition-colors">
                            <span className="text-sm text-gray-700">{label}</span>
                            <button onClick={() => deleteOption(id)}
                              className="text-gray-300 group-hover:text-red-500 ml-1 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {INDUSTRY_DEFAULTS[selected] && (
                <Card className="border-blue-100 bg-blue-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-blue-700">Industry Reference for: {selected}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {INDUSTRY_DEFAULTS[selected].map((def, i) => {
                        const exists = optionLabels.includes(def.toLowerCase());
                        return (
                          <span key={i} className={'text-xs px-2 py-1 rounded-full border ' +
                            (exists ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-500 border-gray-200')}>
                            {exists ? <CheckCircle className="w-3 h-3 inline mr-1" /> : null}{def}
                          </span>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                Select a category from the left to manage its options.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
