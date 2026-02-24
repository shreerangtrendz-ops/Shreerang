import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const StatCard = ({ 
  icon: Icon, 
  label, 
  count, 
  trend, 
  onClick, 
  isLoading, 
  error 
}) => {
  return (
    <Card 
      onClick={!isLoading && !error ? onClick : undefined}
      className={cn(
        "bg-white rounded-xl shadow-lg border-none overflow-hidden relative group transition-all duration-300",
        !isLoading && !error && "hover:shadow-2xl hover:scale-105 cursor-pointer"
      )}
    >
      {/* Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-slate-50 opacity-50 pointer-events-none" />
      
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          {/* Left: Icon */}
          <div className="flex-shrink-0">
            {isLoading ? (
              <Skeleton className="h-12 w-12 rounded-lg" />
            ) : error ? (
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center text-red-500">
                <AlertCircle className="h-6 w-6" />
              </div>
            ) : (
              <div className="h-14 w-14 rounded-xl bg-slate-50 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
                {Icon && <Icon className="h-8 w-8 opacity-90" />}
              </div>
            )}
          </div>

          {/* Right: Label & Count */}
          <div className="text-right flex flex-col justify-center h-full">
            {isLoading ? (
              <div className="space-y-2 flex flex-col items-end">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : error ? (
              <span className="text-sm text-red-500 font-medium">Error loading</span>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <span className="text-3xl font-bold text-slate-800">{count?.toLocaleString()}</span>
                </div>
                {trend && (
                  <div className={cn(
                    "inline-flex items-center text-xs font-medium mt-1 px-2 py-0.5 rounded-full",
                    trend.direction === 'up' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {trend.direction === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                    {trend.value}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;