import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const FormDatePicker = ({
  label,
  id,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  min,
  max,
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={id} className={cn(error && 'text-red-500')}>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <Input
        id={id}
        type="date"
        value={value}
        onChange={onChange}
        disabled={disabled}
        min={min}
        max={max}
        className={cn(
          error && 'border-red-500 focus-visible:ring-red-500',
          'bg-white'
        )}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default FormDatePicker;