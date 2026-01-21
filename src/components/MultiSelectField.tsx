'use client';

import { useState, useMemo } from 'react';
import { AlertCircle, Search, X, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';

interface MultiSelectFieldProps {
  label?: string;
  placeholder?: string;
  value: string[];
  onValueChange: (value: string[]) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  showLabel?: boolean;
  searchable?: boolean;
}

export function MultiSelectField({
  label,
  placeholder = 'Select options...',
  value,
  onValueChange,
  options,
  error,
  required = false,
  className = 'w-full',
  disabled = false,
  showLabel = true,
  searchable = true,
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { selectedOptions, unselectedOptions } = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    const filtered = searchQuery 
      ? options.filter(option => option.label.toLowerCase().includes(searchLower))
      : options;
    
    const selected = filtered.filter(option => value.includes(option.value));
    const unselected = filtered.filter(option => !value.includes(option.value));
    
    return { selectedOptions: selected, unselectedOptions: unselected };
  }, [options, searchQuery, value]);

  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onValueChange(newValue);
  };

  const handleClear = () => {
    onValueChange([]);
  };

  const handleAddCustom = () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery && !value.includes(trimmedQuery)) {
      onValueChange([...value, trimmedQuery]);
      setSearchQuery('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustom();
    }
  };

  const selectedLabels = value
    .map(v => {
      const option = options.find(opt => opt.value === v);
      return option ? option.label : v; // Use value itself if not found in options (custom entry)
    })
    .filter(Boolean);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && showLabel && (
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={`w-full justify-start h-9 font-normal px-3 gap-1 overflow-hidden ${
              error ? 'border-red-500 bg-red-50' : ''
            }`}
          >
            <div className="flex gap-1 items-center overflow-x-auto">
              {value.length === 0 ? (
                <span className="text-slate-400">{placeholder}</span>
              ) : (
                <>
                  {selectedLabels.map((label, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 rounded-full bg-un-blue/10 px-2 py-0.5 text-xs text-un-blue whitespace-nowrap"
                    >
                      {label}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(value[index]);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleToggle(value[index]);
                          }
                        }}
                        className="cursor-pointer hover:text-un-blue/80 ml-0.5 flex items-center"
                      >
                        <X className="h-3 w-3" />
                      </div>
                    </span>
                  ))}
                </>
              )}
            </div>
            {value.length > 0 && (
              <X
                className="ml-auto h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            {searchable && (
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            )}
            <CommandEmpty>
              {searchQuery.trim() ? (
                <div className="px-2 py-3 text-center">
                  <p className="text-xs text-slate-500 mb-1.5">No matching options</p>
                  <p className="text-xs text-slate-400">
                    Press <kbd className="px-1.5 py-0.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-300 rounded shadow-sm">Enter</kbd> or click below to add
                  </p>
                </div>
              ) : (
                <div className="px-2 py-3 text-center text-xs text-slate-500">
                  No options found.
                </div>
              )}
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {searchQuery.trim() && selectedOptions.length === 0 && unselectedOptions.length === 0 && (
                <CommandItem
                  value={searchQuery.trim()}
                  onSelect={handleAddCustom}
                  className="cursor-pointer bg-un-blue/5 border border-un-blue/20 mx-2 my-1 rounded"
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  <span className="font-medium text-un-blue">Add &quot;{searchQuery.trim()}&quot;</span>
                </CommandItem>
              )}
              {selectedOptions.length > 0 && (
                <>
                  {selectedOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleToggle(option.value)}
                      className="cursor-pointer bg-un-blue/5"
                    >
                      <Check className="mr-2 h-4 w-4 opacity-100 text-un-blue" />
                      <span className="font-medium">{option.label}</span>
                    </CommandItem>
                  ))}
                  {unselectedOptions.length > 0 && (
                    <div className="h-px bg-slate-200 my-1 mx-2" />
                  )}
                </>
              )}
              {unselectedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleToggle(option.value)}
                  className="cursor-pointer"
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {error && (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}
    </div>
  );
}
