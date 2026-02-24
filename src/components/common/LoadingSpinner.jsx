import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = "Loading data...", fullHeight = false }) {
  return (
    <div className={`flex flex-col items-center justify-center w-full text-muted-foreground ${fullHeight ? 'min-h-[60vh]' : 'min-h-[200px]'}`}>
      <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
      <p className="text-sm font-medium animate-pulse">{text}</p>
    </div>
  );
}