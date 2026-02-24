import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FilterSidebar = ({ filters, onFilterChange, categories = [] }) => {
  
  const handleCategoryChange = (catName) => {
    const currentCats = filters.category || [];
    const newCats = currentCats.includes(catName)
      ? currentCats.filter(c => c !== catName)
      : [...currentCats, catName];
    onFilterChange({ ...filters, category: newCats });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Filters</h3>
        <Button variant="ghost" size="sm" onClick={() => onFilterChange({})} className="text-muted-foreground">
          Reset
        </Button>
      </div>

      <Accordion type="multiple" defaultValue={['categories', 'price']} className="w-full">
        <AccordionItem value="categories">
          <AccordionTrigger>Categories</AccordionTrigger>
          <AccordionContent>
             <div className="space-y-2 pt-2">
                {(categories.length > 0 ? categories : ['Mill Print', 'Digital Print Poly', 'Digital Print Pure', 'Solid Dyed', 'Embroidery']).map((cat) => (
                    <div key={cat} className="flex items-center space-x-2">
                        <Checkbox 
                            id={`cat-${cat}`} 
                            checked={filters.category?.includes(cat)}
                            onCheckedChange={() => handleCategoryChange(cat)}
                        />
                        <label htmlFor={`cat-${cat}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {cat}
                        </label>
                    </div>
                ))}
             </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="price">
          <AccordionTrigger>Price Range</AccordionTrigger>
          <AccordionContent>
            <div className="pt-4 px-2">
               <Slider 
                  defaultValue={[0, 5000]} 
                  max={5000} 
                  step={100} 
                  className="mb-6"
                  onValueChange={(val) => console.log(val)} // Need state for range
               />
               <div className="flex justify-between text-xs text-muted-foreground">
                 <span>₹0</span>
                 <span>₹5000+</span>
               </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default FilterSidebar;