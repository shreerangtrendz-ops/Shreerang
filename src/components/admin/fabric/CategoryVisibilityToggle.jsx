import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

const CategoryVisibilityToggle = ({ onVisibilityChange }) => {
  const [visibility, setVisibility] = useState({
    base_fabric: true,
    finish_fabric: true,
    fancy_finish_fabric: true
  });

  useEffect(() => {
    fetchVisibility();
  }, []);

  const fetchVisibility = async () => {
    const stored = localStorage.getItem('fabric_master_visibility');
    if (stored) {
        const parsed = JSON.parse(stored);
        setVisibility(parsed);
        if (onVisibilityChange) onVisibilityChange(parsed);
    }
  };

  const toggleVisibility = (key) => {
    const newValue = !visibility[key];
    const newVis = { ...visibility, [key]: newValue };
    setVisibility(newVis);
    localStorage.setItem('fabric_master_visibility', JSON.stringify(newVis));
    if (onVisibilityChange) onVisibilityChange(newVis);
  };

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-white border rounded-lg shadow-sm mb-6 items-center">
      <div className="flex items-center gap-2 mr-4">
        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Category Display:</span>
      </div>
      
      {['base_fabric', 'finish_fabric', 'fancy_finish_fabric'].map(key => (
        <div key={key} className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-full border">
          <Switch 
            id={key} 
            checked={visibility[key]} 
            onCheckedChange={() => toggleVisibility(key)} 
            className="data-[state=checked]:bg-blue-600"
          />
          <Label htmlFor={key} className="cursor-pointer flex items-center gap-1.5 text-sm font-medium">
             {visibility[key] ? <Eye className="h-3.5 w-3.5 text-blue-600"/> : <EyeOff className="h-3.5 w-3.5 text-slate-400"/>}
             {key.replace(/_/g, ' ').replace('fabric', '').trim().replace(/\b\w/g, l => l.toUpperCase())}
          </Label>
        </div>
      ))}
    </div>
  );
};

export default CategoryVisibilityToggle;