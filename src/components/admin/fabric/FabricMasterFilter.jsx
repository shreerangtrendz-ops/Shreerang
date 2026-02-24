import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Search, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const FabricMasterFilter = ({ onApplyFilters, onClearFilters }) => {
  const [fabricMasterCategory, setFabricMasterCategory] = useState('base');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBase, setSelectedBase] = useState('All');
  const [selectedProcess, setSelectedProcess] = useState('All');
  const [selectedWidth, setSelectedWidth] = useState('All');
  const [selectedValueAddition, setSelectedValueAddition] = useState('All');
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Filter Data Structure
  const CATEGORIES = [
    { value: 'base', label: 'Base Fabric' },
    { value: 'finish', label: 'Finish Fabric' },
    { value: 'fancy_base', label: 'Fancy Base Fabric' },
    { value: 'fancy_finish', label: 'Fancy Finish Fabric' }
  ];

  const BASES = {
    'Synthetic Base': ['Polyester', 'Nylon'],
    'Blend Base': ['PV', 'NV', 'PC', 'Rayon x Poly', 'Semi-Synthetic'],
    'Natural Base': ['Viscose', 'Rayon', 'Modal', 'Cotton', 'Linen', 'Silk', 'Wool', 'Hemp']
  };

  const PROCESSES = [
    { value: 'Griege', label: 'Griege-GRI' },
    { value: 'RFD', label: 'RFD-RFD' },
    { value: 'PPF', label: 'PPF-PPF' },
    { value: 'Mill Print', label: 'Mill Print-MP' },
    { value: 'Digital Print', label: 'Digital Print-DP' },
    { value: 'Dyed', label: 'Dyed-DYD' }
  ];

  const WIDTHS = [
    '28"', '36"', '38"', '40"', '42"', '44"', '46"', '48"', '54"', '58"', '62"', '66"', '68"', '72"', '78"'
  ];

  const VALUE_ADDITIONS = [
    { value: 'Hakoba', label: 'Hakoba-SCH' },
    { value: 'Embroidered', label: 'Embroidered-EMB' },
    { value: 'Handwork', label: 'Handwork-HW' },
    { value: 'Foil', label: 'Foil-FOIL' },
    { value: 'Gold', label: 'Gold-GLD' },
    { value: 'Glitter', label: 'Glitter-GLT' },
    { value: 'Crush', label: 'Crush-CRH' },
    { value: 'Pleated', label: 'Pleated-PLT' },
    { value: 'Deca', label: 'Deca-DEC' },
    { value: 'Washing', label: 'Washing-WSH' }
  ];

  const isFancy = fabricMasterCategory === 'fancy_base' || fabricMasterCategory === 'fancy_finish';

  useEffect(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedBase && selectedBase !== 'All') count++;
    if (selectedProcess && selectedProcess !== 'All') count++;
    if (selectedWidth && selectedWidth !== 'All') count++;
    if (isFancy && selectedValueAddition && selectedValueAddition !== 'All') count++;
    
    setActiveFilterCount(count);
  }, [searchQuery, selectedBase, selectedProcess, selectedWidth, selectedValueAddition, isFancy, fabricMasterCategory]);

  const handleApply = () => {
    if (onApplyFilters) {
      onApplyFilters({
        category: fabricMasterCategory,
        search: searchQuery,
        base: selectedBase === 'All' ? null : selectedBase,
        process: selectedProcess === 'All' ? null : selectedProcess,
        width: selectedWidth === 'All' ? null : selectedWidth,
        valueAddition: (isFancy && selectedValueAddition !== 'All') ? selectedValueAddition : null
      });
    } else {
      console.warn('onApplyFilters prop is missing in FabricMasterFilter');
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedBase('All');
    setSelectedProcess('All');
    setSelectedWidth('All');
    setSelectedValueAddition('All');
    // We don't reset category to 'base' to keep user context, but reset all other filters
    if (onClearFilters) {
      onClearFilters();
    }
  };

  // Check if any filter is active including category change from default
  const hasChanges = activeFilterCount > 0 || fabricMasterCategory !== 'base';

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
           <Filter className="h-5 w-5 text-gray-500" />
           <h3 className="font-medium text-gray-900">Filters</h3>
           {activeFilterCount > 0 && (
             <Badge className="bg-blue-600 hover:bg-blue-700 text-white ml-2 transition-colors">
               {activeFilterCount}
             </Badge>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by SKU or Name" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 border-gray-300 focus:ring-2 focus:ring-blue-500 rounded-lg transition-all"
          />
        </div>

        {/* Fabric Master Category */}
        <div className="space-y-1">
          <Select value={fabricMasterCategory} onValueChange={setFabricMasterCategory}>
            <SelectTrigger className="border-gray-300 focus:ring-2 focus:ring-blue-500 rounded-lg">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Base Dropdown */}
        <div className="space-y-1">
          <Select value={selectedBase} onValueChange={setSelectedBase}>
             <SelectTrigger className="border-gray-300 focus:ring-2 focus:ring-blue-500 rounded-lg">
                <SelectValue placeholder="Base Material" />
             </SelectTrigger>
             <SelectContent>
                <SelectItem value="All">All Bases</SelectItem>
                {Object.entries(BASES).map(([group, options]) => (
                   <SelectGroup key={group}>
                      <SelectLabel className="text-gray-500 font-semibold px-2 py-1.5 text-xs uppercase tracking-wider bg-gray-50">{group}</SelectLabel>
                      {options.map(base => (
                         <SelectItem key={base} value={base} className="cursor-pointer">{base}</SelectItem>
                      ))}
                   </SelectGroup>
                ))}
             </SelectContent>
          </Select>
        </div>

        {/* Process Dropdown */}
        <div className="space-y-1">
           <Select value={selectedProcess} onValueChange={setSelectedProcess}>
              <SelectTrigger className="border-gray-300 focus:ring-2 focus:ring-blue-500 rounded-lg">
                 <SelectValue placeholder="Process" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="All">All Processes</SelectItem>
                 {PROCESSES.map(proc => (
                    <SelectItem key={proc.value} value={proc.value}>{proc.label}</SelectItem>
                 ))}
              </SelectContent>
           </Select>
        </div>

        {/* Width Dropdown */}
        <div className="space-y-1">
           <Select value={selectedWidth} onValueChange={setSelectedWidth}>
              <SelectTrigger className="border-gray-300 focus:ring-2 focus:ring-blue-500 rounded-lg">
                 <SelectValue placeholder="Width" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="All">All Widths</SelectItem>
                 {WIDTHS.map(width => (
                    <SelectItem key={width} value={width}>{width}</SelectItem>
                 ))}
              </SelectContent>
           </Select>
        </div>

        {/* Value Addition Dropdown (Conditional) */}
        {isFancy && (
          <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
             <Select value={selectedValueAddition} onValueChange={setSelectedValueAddition}>
                <SelectTrigger className="border-gray-300 focus:ring-2 focus:ring-blue-500 rounded-lg">
                   <SelectValue placeholder="Value Addition" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="All">All Value Additions</SelectItem>
                   {VALUE_ADDITIONS.map(va => (
                      <SelectItem key={va.value} value={va.value}>{va.label}</SelectItem>
                   ))}
                </SelectContent>
             </Select>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 mt-2">
        <Button 
          variant="secondary" 
          onClick={handleClear}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
        >
          <X className="h-4 w-4 mr-2" /> Clear All
        </Button>
        <Button 
          onClick={handleApply}
          disabled={!hasChanges}
          className={`text-white transition-all ${
             !hasChanges 
               ? 'bg-gray-300 cursor-not-allowed' 
               : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow'
          }`}
        >
          <Filter className="h-4 w-4 mr-2" /> Apply Filters
        </Button>
      </div>
    </div>
  );
};

FabricMasterFilter.propTypes = {
  onApplyFilters: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func
};

FabricMasterFilter.defaultProps = {
  onClearFilters: () => {}
};

export default FabricMasterFilter;