import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import FabricMasterTable from './FabricMasterTable';
import { Badge } from '@/components/ui/badge';

const GroupSection = ({ baseName, fabrics, selectedIds, onSelectAll, onSelectOne, onDelete, onEdit }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-white shadow-sm mb-4">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-500" />
            <span className="font-semibold text-slate-900 text-lg">{baseName}</span>
          </div>
          <Badge variant="secondary" className="ml-2 bg-slate-100 text-slate-600">{fabrics.length}</Badge>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-4 pt-0">
          <FabricMasterTable 
            fabrics={fabrics}
            selectedIds={selectedIds}
            onSelectAll={(checked) => onSelectAll(fabrics.map(f => f.id), checked)}
            onSelectOne={onSelectOne}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const FabricMasterGroupedView = ({ fabrics, ...props }) => {
  // Group by base
  const grouped = fabrics.reduce((acc, fabric) => {
    const base = fabric.base || 'Uncategorized';
    if (!acc[base]) acc[base] = [];
    acc[base].push(fabric);
    return acc;
  }, {});

  const sortedGroups = Object.keys(grouped).sort();

  if (fabrics.length === 0) {
      return (
          <div className="text-center py-12 bg-white rounded-lg border">
              <Layers className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No fabrics found</h3>
              <p className="text-slate-500">Try adjusting your filters or add a new fabric.</p>
          </div>
      )
  }

  return (
    <div className="space-y-4">
      {sortedGroups.map(base => (
        <GroupSection 
          key={base} 
          baseName={base} 
          fabrics={grouped[base]} 
          {...props} 
        />
      ))}
    </div>
  );
};

export default FabricMasterGroupedView;