import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ChevronRight, FileImage } from 'lucide-react';

const RecentItemsList = ({ 
  title, 
  items, 
  columns, 
  onViewAll, 
  isLoading, 
  emptyMessage = "No items found" 
}) => {
  return (
    <Card className="h-full shadow-lg border-slate-100 rounded-xl overflow-hidden flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-50/50 border-b border-slate-100">
        <CardTitle className="text-lg font-bold text-slate-800">{title}</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onViewAll}
          className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          View All <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items && items.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {items.map((item, index) => (
              <div 
                key={item.id || index} 
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group flex items-center gap-4"
                onClick={onViewAll} // Or specific item navigation if implemented
              >
                {/* Optional Image rendering if 'image_url' is in item */}
                {item.image_url !== undefined && (
                  <div className="h-12 w-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt="Thumbnail" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400">
                        <FileImage className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-1 min-w-0 grid grid-cols-12 gap-2 items-center">
                  {columns.map((col, colIdx) => (
                    <div 
                      key={col.key} 
                      className={`${colIdx === 0 ? 'col-span-6 font-medium text-slate-900' : 'col-span-3 text-sm text-slate-500'} truncate`}
                    >
                      {col.render ? col.render(item[col.key], item) : (
                        col.key === 'created_at' && item[col.key] 
                          ? format(new Date(item[col.key]), 'MMM d, yyyy') 
                          : item[col.key]
                      )}
                    </div>
                  ))}
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
             <p className="text-sm">{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentItemsList;