import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Check, X, ChevronDown } from 'lucide-react';
import { DropdownService } from '@/services/DropdownService';
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem 
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

const DropdownField = ({ 
  fieldName, 
  value, 
  onChange, 
  fabricCategory, 
  placeholder = "Select option", 
  disabled = false,
  className
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  // New Option State
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionSKU, setNewOptionSKU] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    fetchOptions();
  }, [fieldName, fabricCategory]);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const data = await DropdownService.getDropdownOptions(fieldName, fabricCategory);
      setOptions(data || []);
    } catch (error) {
      console.error(`Error fetching options for ${fieldName}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = async () => {
    if (!newOptionName || !newOptionSKU) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Name and SKU Code are required.'
      });
      return;
    }

    try {
      const newOption = await DropdownService.addDropdownOption(
        fieldName, 
        newOptionName, 
        newOptionSKU, 
        fabricCategory
      );
      
      setOptions([...options, newOption]);
      onChange(newOption);
      setIsAddingNew(false);
      setNewOptionName('');
      setNewOptionSKU('');
      setOpen(false);
      
      toast({
        title: 'Success',
        description: 'New option added successfully.'
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add new option.'
      });
    }
  };

  // Find selected option object to display correct label
  const selectedOption = options.find(opt => opt.id === value?.id) || value;

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedOption ? selectedOption.option_name : placeholder}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder={`Search ${fieldName}...`} className="h-9" />
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-y-auto">
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.option_name}
                  onSelect={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  {option.option_name}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedOption?.id === option.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            
            {/* Add New Section */}
            <div className="p-2 border-t mt-1 bg-slate-50">
              {isAddingNew ? (
                <div className="space-y-2 p-1">
                  <Input 
                    placeholder="New Option Name" 
                    value={newOptionName}
                    onChange={(e) => setNewOptionName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input 
                    placeholder="SKU Code (e.g. CTN)" 
                    value={newOptionSKU}
                    onChange={(e) => setNewOptionSKU(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingNew(false)} className="h-7 px-2">
                      <X className="h-3 w-3" />
                    </Button>
                    <Button size="sm" onClick={handleAddNew} className="h-7 px-2 bg-blue-600 hover:bg-blue-700 text-white">
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-blue-600 hover:text-blue-700"
                  onClick={() => setIsAddingNew(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New {fieldName}
                </Button>
              )}
            </div>

          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DropdownField;