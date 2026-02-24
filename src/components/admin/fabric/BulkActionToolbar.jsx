import React from 'react';
import { Button } from '@/components/ui/button';
import { Star, Eye, EyeOff, Trash2, X, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const BulkActionToolbar = ({ 
    selectedCount, 
    onClearSelection, 
    onSelectAll,
    allSelected,
    onBulkAction,
    loadingAction
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="bg-slate-900 text-white p-3 rounded-lg shadow-2xl flex items-center justify-between gap-4 border border-slate-700">
                <div className="flex items-center gap-4 pl-2">
                    <div className="flex items-center gap-2">
                        <span className="font-bold bg-white text-slate-900 rounded-full h-6 w-6 flex items-center justify-center text-xs">
                            {selectedCount}
                        </span>
                        <span className="text-sm font-medium">Selected</span>
                    </div>
                    
                    <Separator orientation="vertical" className="h-6 bg-slate-700" />
                    
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={onSelectAll} 
                        className="text-slate-300 hover:text-white h-8 text-xs gap-2"
                    >
                        {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                        {allSelected ? 'Deselect All' : 'Select All'}
                    </Button>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => onBulkAction('star')} 
                        disabled={loadingAction}
                        className="h-8 text-xs bg-yellow-500 text-yellow-950 hover:bg-yellow-400 border-yellow-600"
                    >
                        <Star className="h-3.5 w-3.5 mr-1.5 fill-current" /> Star
                    </Button>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => onBulkAction('unstar')} 
                        disabled={loadingAction}
                        className="h-8 text-xs bg-slate-700 text-slate-200 hover:bg-slate-600 border-slate-600"
                    >
                        <Star className="h-3.5 w-3.5 mr-1.5" /> Unstar
                    </Button>
                    
                    <div className="h-4 w-px bg-slate-700 mx-1" />

                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => onBulkAction('active')} 
                        disabled={loadingAction}
                        className="h-8 text-xs bg-green-700 text-green-50 hover:bg-green-600 border-green-600"
                    >
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> Active
                    </Button>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => onBulkAction('inactive')} 
                        disabled={loadingAction}
                        className="h-8 text-xs bg-orange-700 text-orange-50 hover:bg-orange-600 border-orange-600"
                    >
                        <EyeOff className="h-3.5 w-3.5 mr-1.5" /> Inactive
                    </Button>

                    <div className="h-4 w-px bg-slate-700 mx-1" />

                    <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => onBulkAction('delete')} 
                        disabled={loadingAction}
                        className="h-8 text-xs shadow-sm"
                    >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                    </Button>
                </div>
                
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClearSelection} 
                    className="h-8 w-8 text-slate-400 hover:text-white rounded-full ml-2"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default BulkActionToolbar;