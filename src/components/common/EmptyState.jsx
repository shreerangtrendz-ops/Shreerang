import React from 'react';
import { Button } from '@/components/ui/button';
import { Box } from 'lucide-react';

export default function EmptyState({ 
  title = "No data found", 
  description = "There are no records to display at the moment.", 
  action, 
  icon: Icon = Box 
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full text-center p-8 border-2 border-dashed rounded-lg bg-slate-50/50">
      <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-6">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-md mb-8">{description}</p>
      {action && (
        <div className="flex gap-4">
          {action}
        </div>
      )}
    </div>
  );
}