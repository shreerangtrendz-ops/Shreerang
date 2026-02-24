import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X, Check } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const DropdownWithManualAdd = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder, 
  label, 
  category, 
  allowCustom = true,
  disabled = false
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [customOptions, setCustomOptions] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    if (category) {
      fetchCustomOptions();
    }
  }, [category]);

  const fetchCustomOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_dropdown_values')
        .select('value')
        .eq('category', category);
      
      if (error) throw error;
      setCustomOptions(data.map(item => item.value));
    } catch (error) {
      console.error('Error fetching custom options:', error);
    }
  };

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    
    // Check if exists in predefined or custom
    if (options.includes(newValue) || customOptions.includes(newValue)) {
      onChange(newValue);
      setIsAdding(false);
      setNewValue('');
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_dropdown_values')
        .insert([{ category, value: newValue.trim() }]);

      if (error) throw error;

      setCustomOptions(prev => [...prev, newValue.trim()]);
      onChange(newValue.trim());
      setIsAdding(false);
      setNewValue('');
      toast({ title: "Option added", description: `${newValue} added to ${label} options.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save new option." });
    }
  };

  const allOptions = [...new Set([...options, ...customOptions])].sort();

  if (isAdding) {
    return (
      <div className="flex gap-2 items-center animate-in fade-in zoom-in-95 duration-200">
        <Input 
          value={newValue} 
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={`Add new ${label}...`}
          className="h-10"
          autoFocus
        />
        <Button size="icon" type="button" onClick={handleAdd} className="h-10 w-10 shrink-0 bg-green-600 hover:bg-green-700">
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="outline" type="button" onClick={() => setIsAdding(false)} className="h-10 w-10 shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={(val) => {
      if (val === '__add_new__') {
        setIsAdding(true);
      } else {
        onChange(val);
      }
    }} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder || `Select ${label}`} />
      </SelectTrigger>
      <SelectContent>
        {allOptions.map((opt) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
        {allowCustom && (
          <>
            <div className="h-px bg-slate-100 my-1" />
            <SelectItem value="__add_new__" className="text-blue-600 font-medium">
              <span className="flex items-center gap-2"><Plus className="h-3 w-3" /> Add New...</span>
            </SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
};

export default DropdownWithManualAdd;