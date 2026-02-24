import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { DropdownService } from '@/services/DropdownService';
import DropdownManager from '@/components/admin/DropdownManager';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const DynamicDropdown = ({ category, value, onChange, placeholder, className, disabled, label }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const data = await DropdownService.getOptions(category);
      setOptions(data);
    } catch (error) {
      console.error('Failed to load dropdown options:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, [category]);

  const handleManagerClose = () => {
    setIsManagerOpen(false);
    fetchOptions(); // Refresh options after management
  };

  return (
    <div className="relative flex items-center gap-2">
      <div className="flex-1">
        <Select 
            value={value?.toString()} 
            onValueChange={onChange} 
            disabled={disabled || loading}
        >
          <SelectTrigger className={cn(className)}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            <SelectValue placeholder={loading ? "Loading..." : (placeholder || "Select option")} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.id} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
            {options.length === 0 && !loading && (
                <div className="p-2 text-sm text-slate-500 text-center">No options available</div>
            )}
          </SelectContent>
        </Select>
      </div>
      
      {!disabled && (
        <Button 
          type="button"
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
          onClick={() => setIsManagerOpen(true)}
          title={`Manage ${label || 'options'}`}
        >
          <Settings className="w-4 h-4" />
        </Button>
      )}

      <DropdownManager 
        isOpen={isManagerOpen} 
        onClose={handleManagerClose} 
        category={category}
        title={label || category}
      />
    </div>
  );
};

export default DynamicDropdown;