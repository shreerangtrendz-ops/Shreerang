import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function BackButton({ to, label = "Back", className }) {
  const navigate = useNavigate();
  return (
    <Button 
      variant="ghost" 
      onClick={() => to ? navigate(to) : navigate(-1)}
      className={cn("gap-2 pl-0 hover:pl-2 transition-all text-muted-foreground hover:text-primary", className)}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}