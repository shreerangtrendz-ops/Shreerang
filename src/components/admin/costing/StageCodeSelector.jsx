import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PROCESS_STAGES, STAGE_CODE_LABELS } from '@/lib/costing_constants';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const StageCodeSelector = ({ stageNumber, selectedCodes = [], onSelectionChange, disabled = false }) => {
  const stageDef = PROCESS_STAGES[stageNumber];
  
  if (!stageDef) return null;

  // Handle mutually exclusive selection (Stage 1 or forced single choice)
  const isExclusive = stageDef.isExclusive || stageNumber === '1';

  const handleExclusiveChange = (value) => {
    onSelectionChange([value]);
  };

  const handleMultiChange = (code, checked) => {
    let newSelection = [...selectedCodes];
    if (checked) {
      if (!newSelection.includes(code)) newSelection.push(code);
    } else {
      newSelection = newSelection.filter(c => c !== code);
    }
    onSelectionChange(newSelection);
  };

  if (isExclusive) {
    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium text-slate-700">Select {stageDef.name} Type</Label>
        <Select 
            value={selectedCodes[0] || ''} 
            onValueChange={handleExclusiveChange}
            disabled={disabled}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder={`Select ${stageDef.name}...`} />
          </SelectTrigger>
          <SelectContent>
            {stageDef.codes.map(code => (
              <SelectItem key={code} value={code}>
                <span className="font-mono font-bold mr-2">{code}</span> 
                <span className="text-slate-500">- {STAGE_CODE_LABELS[code]}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-slate-500">{stageDef.description}</p>
      </div>
    );
  }

  // Multi-select for optional stages
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{stageDef.name} Options</Label>
      <div className="grid grid-cols-2 gap-2">
        {stageDef.codes.map(code => (
          <div key={code} className="flex items-center space-x-2 border p-2 rounded bg-white hover:bg-slate-50">
            <Checkbox 
                id={`stage-${stageNumber}-${code}`} 
                checked={selectedCodes.includes(code)}
                onCheckedChange={(checked) => handleMultiChange(code, checked)}
                disabled={disabled}
            />
            <Label 
                htmlFor={`stage-${stageNumber}-${code}`} 
                className="text-xs cursor-pointer flex-1"
            >
              <span className="font-mono font-bold">{code}</span>
              <span className="block text-[10px] text-slate-500">{STAGE_CODE_LABELS[code]}</span>
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StageCodeSelector;