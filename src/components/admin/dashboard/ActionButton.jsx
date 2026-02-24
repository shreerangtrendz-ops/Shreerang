import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const ActionButton = ({ 
  icon: Icon, 
  label, 
  onClick, 
  isLoading 
}) => {
  return (
    <div
      onClick={!isLoading ? onClick : undefined}
      className={cn(
        "flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg border border-slate-100 transition-all duration-300",
        !isLoading ? "cursor-pointer hover:shadow-2xl hover:scale-105 hover:bg-blue-50/50 group" : "opacity-80 cursor-wait"
      )}
    >
      {isLoading ? (
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
      ) : (
        <div className="p-4 rounded-full bg-blue-50 text-blue-600 mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm">
          {Icon && <Icon className="h-6 w-6" />}
        </div>
      )}
      <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700 transition-colors text-center">
        {label}
      </span>
    </div>
  );
};

export default ActionButton;