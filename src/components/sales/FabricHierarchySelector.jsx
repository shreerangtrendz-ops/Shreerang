import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Search, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import FabricItemCard from './FabricItemCard';

const FabricHierarchySelector = ({ baseFabrics, finishFabrics, fancyFabrics, onAddItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBase, setExpandedBase] = useState({});

  const toggleBase = (id) => {
    setExpandedBase(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter logic
  const filteredBase = baseFabrics.filter(b => 
    b.base_fabric_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.hsn_code?.includes(searchTerm)
  );

  return (
    <div className="bg-white rounded-lg border h-full flex flex-col">
      <div className="p-4 border-b space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Fabric Item Selection
        </h3>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search fabrics, codes..." 
            className="pl-8 h-9 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 bg-slate-50/50">
        <div className="space-y-4">
          {filteredBase.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No fabrics found matching "{searchTerm}"</p>
          ) : (
            filteredBase.map(base => {
               // Find children
               const childrenFinish = finishFabrics.filter(f => f.base_fabric_id === base.id);
               
               return (
                <div key={base.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 shrink-0" 
                        onClick={() => toggleBase(base.id)}
                     >
                        {expandedBase[base.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                     </Button>
                     <div className="flex-1">
                        <FabricItemCard 
                            item={base} 
                            type="base_fabric" 
                            onAdd={() => onAddItem(base, 'base_fabric')} 
                        />
                     </div>
                  </div>

                  {expandedBase[base.id] && (
                    <div className="pl-8 space-y-3 border-l-2 border-slate-200 ml-3">
                        {childrenFinish.length === 0 && <p className="text-xs text-muted-foreground py-1">No finish variations available.</p>}
                        
                        {childrenFinish.map(finish => {
                            const childrenFancy = fancyFabrics.filter(ff => ff.finish_fabric_id === finish.id);
                            
                            return (
                                <div key={finish.id} className="space-y-2">
                                     <FabricItemCard 
                                        item={finish} 
                                        type="finish_fabric" 
                                        parentName={base.base_fabric_name}
                                        onAdd={() => onAddItem(finish, 'finish_fabric')} 
                                     />
                                     
                                     {/* Fancy Nested */}
                                     {childrenFancy.length > 0 && (
                                         <div className="pl-6 pt-1 space-y-2 border-l-2 border-indigo-100 ml-2">
                                             {childrenFancy.map(fancy => (
                                                 <FabricItemCard 
                                                    key={fancy.id} 
                                                    item={fancy} 
                                                    type="fancy_finish_fabric"
                                                    parentName={finish.finish_fabric_name} 
                                                    onAdd={() => onAddItem(fancy, 'fancy_finish_fabric')} 
                                                 />
                                             ))}
                                         </div>
                                     )}
                                </div>
                            );
                        })}
                    </div>
                  )}
                </div>
               );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FabricHierarchySelector;