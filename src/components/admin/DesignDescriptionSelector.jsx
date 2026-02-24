import React from 'react';
import { Badge } from '@/components/ui/badge';
import { X, Tag } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

const CATEGORIES = {
  "Print Concept": ["Floral", "Geometric", "Abstract", "Polka Dots", "Stripes/Checks", "Animal/Skin", "Paisley", "Digital"],
  "Traditional Patterns": ["Patola", "Bandhani", "Leheriya", "Ikat", "Kalamkari", "Ajrakh", "Batik", "Warli"],
  "Value Addition": ["Allover", "Daman/Skirt", "Butti", "Jall", "Neck/Yoke", "Panel", "Running Border"]
};

const DesignDescriptionSelector = ({ selectedTags = [], onChange, visible = false }) => {
  if (!visible) return null;

  const handleToggle = (tag) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    onChange(newTags);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300 border rounded-lg p-4 bg-slate-50">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-indigo-600" />
        <h3 className="font-semibold text-sm">Design Tags</h3>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4 min-h-[2rem]">
        {selectedTags.length === 0 && <span className="text-sm text-slate-400 italic">No tags selected</span>}
        {selectedTags.map(tag => (
          <Badge key={tag} variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer" onClick={() => handleToggle(tag)}>
            {tag} <X className="ml-1 h-3 w-3" />
          </Badge>
        ))}
      </div>

      <ScrollArea className="h-64 rounded-md border bg-white p-4">
        <div className="space-y-6">
          {Object.entries(CATEGORIES).map(([category, tags]) => (
            <div key={category}>
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">{category}</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge 
                    key={tag} 
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${selectedTags.includes(tag) ? 'bg-indigo-600 hover:bg-indigo-700' : 'hover:bg-slate-100'}`}
                    onClick={() => handleToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DesignDescriptionSelector;