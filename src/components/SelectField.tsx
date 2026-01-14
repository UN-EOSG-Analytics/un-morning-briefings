'use client';

import { useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

interface SelectFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  showLabel?: boolean;
}

export function SelectField({
  label,
  placeholder = 'Select an option...',
  value,
  onValueChange,
  options,
  error,
  required = false,
  className = 'w-full',
  triggerClassName = '',
  disabled = false,
  showLabel = true,
}: SelectFieldProps) {
  const handleValueChange = useCallback((newValue: string) => {
    onValueChange(newValue);
  }, [onValueChange]);
  return (
    <div className={`space-y-2 ${className}`}>
      {label && showLabel && (
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger
          className={`w-full ${
            error ? 'border-red-500 bg-red-50' : ''
          } ${triggerClassName}`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}
    </div>
  );
}
