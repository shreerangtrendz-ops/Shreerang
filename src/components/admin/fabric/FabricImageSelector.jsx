import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { FABRIC_IMAGES } from '@/data/fabricImages';

const FabricImageSelector = ({ selectedFabricId, onSelectFabric }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {FABRIC_IMAGES.map((fabric) => {
        const isSelected = selectedFabricId === fabric.id;
        
        return (
          <div
            key={fabric.id}
            onClick={() => onSelectFabric(fabric)}
            className={cn(
              "group relative cursor-pointer rounded-xl overflow-hidden transition-all duration-300",
              "bg-white border-2",
              isSelected 
                ? "border-blue-500 shadow-xl scale-105 ring-4 ring-blue-500/20" 
                : "border-slate-100 shadow-md hover:shadow-lg hover:scale-105 hover:border-blue-200"
            )}
          >
            {/* Image Container */}
            <div className="aspect-[4/3] overflow-hidden relative bg-slate-100">
              <img 
                src={fabric.imageUrl} 
                alt={fabric.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              {/* Overlay Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="font-bold text-lg tracking-wide">{fabric.name}</h3>
                <p className="text-xs text-white/80 line-clamp-1 opacity-100 group-hover:opacity-100 transition-all duration-300">
                  {fabric.description}
                </p>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 bg-blue-500 text-white p-1.5 rounded-full shadow-lg animate-in zoom-in duration-200">
                  <Check className="w-5 h-5 stroke-[3px]" />
                </div>
              )}
            </div>
            
            {/* Hover overlay effect for unselected items */}
            <div className={cn(
              "absolute inset-0 bg-blue-500/10 pointer-events-none transition-opacity duration-300",
              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )} />
          </div>
        );
      })}
    </div>
  );
};

export default FabricImageSelector;