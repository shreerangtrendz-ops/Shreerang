import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const DependencyBadge = ({ count, type, onClick }) => {
    if (count === 0) {
        return <span className="text-slate-300 text-xs">-</span>;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge 
                        variant="outline" 
                        className={cn(
                            "cursor-pointer hover:bg-slate-100 transition-colors gap-1.5 py-1 px-2 font-mono",
                            count > 0 ? "border-slate-200 text-slate-700" : "text-muted-foreground border-dashed"
                        )}
                        onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
                    >
                        <Layers className="h-3 w-3" />
                        {count}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{count} {type} linked</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default DependencyBadge;