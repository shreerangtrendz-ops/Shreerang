import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';

const FilterBar = ({ 
    activeCount, 
    onToggleAdvanced, 
    onClearAll, 
    resultCount, 
    totalCount 
}) => {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-3 rounded-lg border shadow-sm mb-4">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Filter className="h-4 w-4" />
                    Filters
                </div>
                
                {activeCount > 0 && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                        {activeCount} Active
                    </Badge>
                )}

                <Button variant="outline" size="sm" onClick={onToggleAdvanced} className="h-8 text-xs">
                    Advanced Filters
                </Button>

                {activeCount > 0 && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={onClearAll} 
                        className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <X className="h-3 w-3 mr-1" /> Clear All
                    </Button>
                )}
            </div>

            <div className="text-sm text-muted-foreground font-medium">
                Showing <span className="text-slate-900">{resultCount}</span> of {totalCount} fabrics
            </div>
        </div>
    );
};

export default FilterBar;