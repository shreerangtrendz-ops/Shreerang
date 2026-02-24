import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { DropdownManagementService } from '@/services/DropdownManagementService';
import { DropdownAISuggestionService } from '@/services/DropdownAISuggestionService';
import { Plus, Trash2, Edit2, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import FormErrorBoundary from '@/components/common/FormErrorBoundary';

const EnhancedDropdownField = ({ 
  label,
  category, 
  value, 
  onValueChange, 
  options = [], 
  onRefresh,
  allowManagement = true,
  placeholder = "Select option...",
  className,
  error
}) => {
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [currentOption, setCurrentOption] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({ value: '', code: '' });
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  
  const { toast } = useToast();
  
  // Safety check for options
  const safeOptions = Array.isArray(options) ? options : [];
  
  const handleOpenManage = (mode, option = null) => {
    setModalMode(mode);
    setCurrentOption(option);
    setFormData({ 
      value: option ? option.option_name : '', 
      code: option ? (option.option_code || '') : '' 
    });
    setAiSuggestions([]);
    setIsManageModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.value) {
      toast({ variant: "destructive", title: "Error", description: "Value is required" });
      return;
    }

    setSubmitting(true);
    try {
      const code = formData.code || formData.value.substring(0, 4).toUpperCase();
      
      if (modalMode === 'add') {
        await DropdownManagementService.addDropdownOption(category, formData.value, code);
        toast({ title: "Success", description: "Option added successfully" });
        onValueChange(formData.value);
      } else {
        await DropdownManagementService.updateDropdownOption(currentOption.id, formData.value, code);
        toast({ title: "Success", description: "Option updated successfully" });
        if (value === currentOption.option_name) {
          onValueChange(formData.value);
        }
      }
      
      setIsManageModalOpen(false);
      onRefresh?.();
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Operation Failed", description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, option) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${option.option_name}"?`)) return;

    try {
      await DropdownManagementService.deleteDropdownOption(option.id);
      toast({ title: "Deleted", description: "Option removed" });
      if (value === option.option_name) onValueChange('');
      onRefresh?.();
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete option" });
    }
  };

  const fetchAISuggestions = async () => {
    setAiLoading(true);
    try {
      const suggestions = await DropdownAISuggestionService.generateNewValueSuggestions(category);
      setAiSuggestions(suggestions);
    } catch (err) {
      toast({ variant: "destructive", title: "AI Error", description: "Could not fetch suggestions" });
    } finally {
      setAiLoading(false);
    }
  };

  // Handler for select changes - intercepts special values
  const handleSelectChange = (newValue) => {
    if (newValue === '__ADD_NEW__') {
      handleOpenManage('add');
    } else {
      onValueChange(newValue);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        {label && <Label className={error ? "text-red-500" : ""}>{label}</Label>}
        {onRefresh && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5 opacity-50 hover:opacity-100" 
            onClick={(e) => { e.preventDefault(); onRefresh(); }}
            title="Refresh Options"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      <FormErrorBoundary>
        <Select value={value || ''} onValueChange={handleSelectChange}>
          <SelectTrigger className={cn(error && "border-red-500 bg-red-50")}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {safeOptions.length === 0 ? (
               <div className="p-2 text-center text-sm text-muted-foreground">
                 No options available
               </div>
            ) : (
              <SelectGroup>
                {safeOptions.map((option) => (
                  <div key={option.id || Math.random().toString()} className="flex items-center justify-between w-full group">
                    <SelectItem 
                      value={option.option_name}
                      className="flex-1 cursor-pointer"
                    >
                      {option.option_name}
                    </SelectItem>
                    
                    {allowManagement && (
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 absolute right-2 bg-popover pl-2 z-10">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-5 w-5" 
                           onClick={(e) => { 
                             e.preventDefault(); 
                             e.stopPropagation(); 
                             handleOpenManage('edit', option); 
                           }}
                         >
                           <Edit2 className="h-3 w-3 text-slate-500" />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-5 w-5 hover:text-red-600" 
                           onClick={(e) => { 
                             e.preventDefault();
                             e.stopPropagation(); 
                             handleDelete(e, option); 
                           }}
                         >
                           <Trash2 className="h-3 w-3" />
                         </Button>
                       </div>
                     )}
                  </div>
                ))}
              </SelectGroup>
            )}

            {allowManagement && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectItem value="__ADD_NEW__" className="text-blue-600 font-medium focus:text-blue-700 cursor-pointer">
                    <div className="flex items-center">
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Value...
                    </div>
                  </SelectItem>
                </SelectGroup>
              </>
            )}
          </SelectContent>
        </Select>
      </FormErrorBoundary>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === 'add' ? 'Add New Option' : 'Edit Option'}</DialogTitle>
            <DialogDescription>
              {category ? category.replace(/_/g, ' ') : 'Category'} management
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Value</Label>
              <div className="flex gap-2">
                <Input 
                  value={formData.value} 
                  onChange={e => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="e.g. Cotton"
                />
                {modalMode === 'add' && (
                  <Button type="button" variant="outline" size="icon" onClick={fetchAISuggestions} title="Get AI Suggestions">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Code (Optional)</Label>
              <Input 
                value={formData.code} 
                onChange={e => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Auto-generated if empty"
              />
            </div>

            {aiLoading && <div className="flex justify-center p-2"><Loader2 className="h-5 w-5 animate-spin text-purple-500" /></div>}
            
            {aiSuggestions.length > 0 && (
              <div className="space-y-2 bg-purple-50 p-3 rounded-md border border-purple-100">
                <p className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Suggestions
                </p>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.map((s, i) => (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-purple-100 bg-white"
                      onClick={() => setFormData(prev => ({ ...prev, value: s }))}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsManageModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {modalMode === 'add' ? 'Add Option' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedDropdownField;