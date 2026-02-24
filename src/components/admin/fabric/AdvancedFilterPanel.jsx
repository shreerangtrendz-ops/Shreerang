import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Filter, X, Save, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { FilterPresetService } from '@/services/FilterPresetService';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';

const AdvancedFilterPanel = ({ filters, setFilters, config, category, resultCount }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [presets, setPresets] = useState([]);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        if (category) {
            loadPresets();
        }
    }, [category]);

    const loadPresets = async () => {
        try {
            const data = await FilterPresetService.getPresets(category);
            setPresets(data || []);
        } catch (error) {
            console.error(error);
            setPresets([]);
        }
    };

    const handleFilterChange = (key, value) => {
        if (setFilters) {
            setFilters(prev => ({ ...prev, [key]: value }));
        } else {
            console.warn('setFilters prop is missing in AdvancedFilterPanel');
        }
    };

    const clearFilters = () => {
        if (setFilters) {
            const cleared = Object.keys(filters).reduce((acc, key) => ({ ...acc, [key]: 'all' }), {});
            setFilters(cleared);
        }
    };

    const activeFilterCount = filters ? Object.values(filters).filter(v => v !== 'all' && v !== '').length : 0;

    const handleSavePreset = async () => {
        if (!newPresetName.trim()) return;
        try {
            await FilterPresetService.savePreset(category, newPresetName, filters);
            toast({ title: 'Preset Saved' });
            setSaveDialogOpen(false);
            setNewPresetName('');
            loadPresets();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error saving preset' });
        }
    };

    const applyPreset = (preset) => {
        if (setFilters) {
            setFilters(preset.filter_config);
            toast({ title: `Applied "${preset.preset_name}"` });
        }
    };

    return (
        <div className="bg-white border rounded-lg shadow-sm mb-6">
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} className="gap-2">
                        <Filter className="h-4 w-4" />
                        {isOpen ? 'Hide Filters' : 'Advanced Filters'}
                        {activeFilterCount > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">{activeFilterCount}</span>}
                    </Button>
                    <div className="text-sm text-muted-foreground">
                        Showing {resultCount} results
                    </div>
                </div>
                {activeFilterCount > 0 && (
                     <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500 h-8">
                        <X className="h-3 w-3 mr-1" /> Clear All
                     </Button>
                )}
            </div>

            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleContent>
                    <div className="p-4 border-t bg-slate-50/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                            {config.map((field) => (
                                <div key={field.key} className="space-y-1.5">
                                    <Label className="text-xs font-medium text-slate-500">{field.label}</Label>
                                    <Select 
                                        value={filters?.[field.key] || 'all'} 
                                        onValueChange={(v) => handleFilterChange(field.key, v)}
                                    >
                                        <SelectTrigger className="h-8 bg-white">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            {field.options.map((opt) => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center border-t pt-4">
                            <div className="flex gap-2">
                                <Select onValueChange={(v) => {
                                    if(v === 'manage') return; 
                                    const preset = presets.find(p => p.id === v);
                                    if(preset) applyPreset(preset);
                                }}>
                                    <SelectTrigger className="w-[180px] h-8">
                                        <SelectValue placeholder="Load Preset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {presets.length === 0 ? <SelectItem value="none" disabled>No presets</SelectItem> : 
                                            presets.map(p => <SelectItem key={p.id} value={p.id}>{p.preset_name}</SelectItem>)
                                        }
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setSaveDialogOpen(true)} className="gap-2">
                                <Save className="h-3 w-3" /> Save Current Filters
                            </Button>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Filter Preset</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Preset Name</Label>
                        <Input 
                            value={newPresetName} 
                            onChange={e => setNewPresetName(e.target.value)} 
                            placeholder="e.g. Active Cotton Fabrics"
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSavePreset}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

AdvancedFilterPanel.propTypes = {
    filters: PropTypes.object.isRequired,
    setFilters: PropTypes.func.isRequired,
    config: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        options: PropTypes.array.isRequired
    })),
    category: PropTypes.string,
    resultCount: PropTypes.number
};

AdvancedFilterPanel.defaultProps = {
    config: [],
    resultCount: 0,
    category: 'default'
};

export default AdvancedFilterPanel;