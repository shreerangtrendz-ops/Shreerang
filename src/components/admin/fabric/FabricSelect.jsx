import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Enhanced Dropdown with standardized error handling, loading states, and debugging support.
 */
const FabricSelect = ({ 
    label, 
    value, 
    onChange, 
    options = [], 
    placeholder = "Select option", 
    loading = false, 
    error = null, 
    disabled = false,
    required = false,
    onRetry,
    className
}) => {
    // Determine the label of the currently selected item for better UX
    const selectedItem = options.find(opt => String(opt.id || opt.value) === String(value));
    const selectedLabel = selectedItem ? (selectedItem.label || selectedItem.name || selectedItem.value) : value;

    // Debug log for development
    if (import.meta.env.MODE === 'development') {
        // console.debug(`[FabricSelect:${label}] Render state:`, { value, loading, error, optionsCount: options?.length });
    }

    return (
        <div className={cn("space-y-1.5", className)}>
            {label && (
                <div className="flex justify-between items-center mb-1">
                    <Label className="flex items-center gap-1 text-sm font-medium text-slate-700">
                        {label} {required && <span className="text-red-500">*</span>}
                    </Label>
                    
                    {/* Status Indicators */}
                    <div className="flex items-center gap-2">
                        {loading && (
                            <span className="flex items-center text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin"/> Loading...
                            </span>
                        )}
                        {!loading && !error && options.length > 0 && value && (
                            <span className="text-[10px] text-green-600 flex items-center">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Selected
                            </span>
                        )}
                    </div>
                </div>
            )}
            
            <div className="relative">
                <Select 
                    value={value ? String(value) : undefined} 
                    onValueChange={onChange} 
                    disabled={disabled || loading || !!error}
                >
                    <SelectTrigger 
                        className={cn(
                            "w-full transition-all duration-200",
                            error ? "border-red-300 bg-red-50 focus:ring-red-200" : "focus:ring-blue-200",
                            !value && !loading && "text-muted-foreground"
                        )}
                    >
                        <SelectValue placeholder={loading ? "Loading data..." : placeholder}>
                            {selectedLabel}
                        </SelectValue>
                    </SelectTrigger>
                    
                    <SelectContent className="max-h-[300px]">
                        {options.length > 0 ? (
                            options.map((opt) => (
                                <SelectItem 
                                    key={opt.id || opt.value} 
                                    value={String(opt.id || opt.value)}
                                    className="cursor-pointer focus:bg-slate-50"
                                >
                                    <span className="flex flex-col">
                                        <span className="font-medium">{opt.label || opt.name || opt.value}</span>
                                        {opt.description && <span className="text-xs text-muted-foreground">{opt.description}</span>}
                                    </span>
                                </SelectItem>
                            ))
                        ) : (
                            <div className="p-4 text-center space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    {loading ? "Loading options..." : "No options found"}
                                </p>
                            </div>
                        )}
                    </SelectContent>
                </Select>

                {/* Inline Error Handling & Retry */}
                {error && (
                    <div className="absolute right-0 top-full mt-1 z-10 w-full">
                         <div className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-md shadow-sm">
                            <span className="text-xs text-red-600 flex items-center">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {typeof error === 'string' ? error : 'Failed to load'}
                            </span>
                            {onRetry && (
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={(e) => { e.preventDefault(); onRetry(); }}
                                    className="h-6 px-2 text-[10px] hover:bg-red-100 text-red-700"
                                >
                                    <RefreshCw className="h-3 w-3 mr-1" /> Retry
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Helper text for empty state when not loading/error */}
            {!loading && !error && options.length === 0 && (
                <p className="text-[10px] text-orange-500 flex items-center mt-1">
                    <AlertCircle className="h-3 w-3 mr-1" /> No data available in master
                </p>
            )}
        </div>
    );
};

export default FabricSelect;