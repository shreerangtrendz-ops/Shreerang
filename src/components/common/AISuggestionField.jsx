import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sparkles, Check, X, RotateCcw } from 'lucide-react';
import DropdownWithManualAdd from './DropdownWithManualAdd';

const AISuggestionField = ({
  label,
  value,
  onChange,
  onManualChange,
  suggestion,
  options = [],
  allowCustom = true,
  category,
  type = 'dropdown' // 'dropdown' or 'input'
}) => {
  const [status, setStatus] = useState('pending'); // pending, accepted, rejected
  
  useEffect(() => {
    if (suggestion && !value && status === 'pending') {
      // Suggestion available but not acted upon
    }
  }, [suggestion, value, status]);

  const handleAccept = () => {
    onChange(suggestion);
    setStatus('accepted');
  };

  const handleReject = () => {
    setStatus('rejected');
  };

  const handleReset = () => {
    setStatus('pending');
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label>{label}</Label>
        {status === 'pending' && suggestion && (
           <div className="flex items-center gap-2 text-xs text-purple-600 animate-pulse bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
             <Sparkles className="h-3 w-3" />
             <span>AI Suggestion: <strong>{suggestion}</strong></span>
           </div>
        )}
      </div>

      {status === 'pending' && suggestion ? (
        <div className="flex gap-2">
           <div className="relative flex-1">
             <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Sparkles className="h-4 w-4 text-purple-400" />
             </div>
             <Input 
               value={suggestion} 
               readOnly 
               className="pl-9 border-purple-200 bg-purple-50/50 text-purple-900 font-medium" 
             />
           </div>
           <Button type="button" size="icon" onClick={handleAccept} className="bg-green-600 hover:bg-green-700" title="Accept AI Suggestion">
             <Check className="h-4 w-4" />
           </Button>
           <Button type="button" size="icon" variant="outline" onClick={handleReject} className="border-red-200 text-red-600 hover:bg-red-50" title="Reject & Enter Manually">
             <X className="h-4 w-4" />
           </Button>
        </div>
      ) : (
        <div className="relative">
          {type === 'dropdown' ? (
            <DropdownWithManualAdd 
              label={label}
              options={options}
              value={value}
              onChange={onChange}
              category={category}
              allowCustom={allowCustom}
            />
          ) : (
            <Input 
              value={value} 
              onChange={(e) => onChange(e.target.value)} 
              placeholder={`Enter ${label}`}
            />
          )}
          
          {status !== 'pending' && suggestion && (
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              className="absolute right-8 top-0 h-10 w-8 text-slate-400 hover:text-purple-600" 
              onClick={handleReset}
              title="Reset AI Suggestion"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default AISuggestionField;