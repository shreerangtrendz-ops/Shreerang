import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const DropdownDebugger = ({ name, options, value, loading, error, formState }) => {
    if (import.meta.env.MODE !== 'development') return null;

    return (
        <Card className="mt-2 p-4 bg-slate-900 text-slate-50 border-slate-700 font-mono text-xs">
            <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
                <span className="font-bold text-blue-400">DEBUG: {name}</span>
                <div className="flex gap-2">
                    <Badge variant="outline" className={loading ? "bg-yellow-900 text-yellow-200" : "bg-green-900 text-green-200"}>
                        {loading ? 'LOADING' : 'IDLE'}
                    </Badge>
                    <Badge variant="outline" className={options?.length > 0 ? "bg-blue-900 text-blue-200" : "bg-red-900 text-red-200"}>
                        Count: {options?.length || 0}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h4 className="text-slate-400 mb-1">State:</h4>
                    <pre className="bg-slate-950 p-2 rounded overflow-auto max-h-[100px]">
                        {JSON.stringify({ value, error }, null, 2)}
                    </pre>
                </div>
                <div>
                    <h4 className="text-slate-400 mb-1">First 3 Options:</h4>
                    <pre className="bg-slate-950 p-2 rounded overflow-auto max-h-[100px]">
                        {JSON.stringify(options?.slice(0, 3), null, 2)}
                    </pre>
                </div>
            </div>
        </Card>
    );
};

export default DropdownDebugger;