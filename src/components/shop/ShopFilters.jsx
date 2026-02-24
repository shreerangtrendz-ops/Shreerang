import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const ShopFilters = ({ filters, onChange }) => {
  const categories = [
    { id: 'mill-print', label: 'Mill Print' },
    { id: 'digital-poly', label: 'Digital Print Poly' },
    { id: 'digital-pure', label: 'Digital Print Pure' },
    { id: 'solid-dyed', label: 'Solid Dyed' },
    { id: 'embroidery', label: 'Embroidery' },
    { id: 'schiffli', label: 'Schiffli' },
  ];

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Category</h3>
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center space-x-2">
              <Checkbox 
                id={cat.id} 
                checked={filters.category === cat.id}
                onCheckedChange={(checked) => onChange('category', checked ? cat.id : '')}
              />
              <Label htmlFor={cat.id} className="text-sm font-normal">{cat.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-200" />

      {/* Fabric Type */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Fabric Type</h3>
        <div className="space-y-2">
          {['Cotton', 'Polyester', 'Rayon', 'Silk', 'Georgette'].map(type => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox 
                id={type} 
                checked={filters.fabricType === type}
                onCheckedChange={(checked) => onChange('fabricType', checked ? type : '')}
              />
              <Label htmlFor={type} className="text-sm font-normal">{type}</Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShopFilters;