"use client";

import { useCallback, useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Search, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  inputBaseStyles,
  inputDefaultStyles,
  inputErrorStyles,
} from "@/components/TextField";

interface SelectFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string; showStar?: boolean }>;
  error?: string;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  showLabel?: boolean;
  searchable?: boolean;
}

export function SelectField({
  label,
  placeholder = "Select an option...",
  value,
  onValueChange,
  options,
  error,
  required = false,
  className = "w-full",
  triggerClassName = "",
  disabled = false,
  showLabel = true,
  searchable = false,
}: SelectFieldProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleValueChange = useCallback(
    (newValue: string) => {
      onValueChange(newValue);
      setSearchQuery("");
    },
    [onValueChange],
  );

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [options, searchQuery]);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && showLabel && (
        <label className="text-sm font-medium text-slate-900">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            inputBaseStyles,
            inputDefaultStyles,
            "data-[placeholder]:text-[var(--form-field-placeholder)]",
            error && inputErrorStyles,
            triggerClassName
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="form-standardized-portal max-h-64">
          {searchable && (
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--form-field-border)] bg-[var(--form-field-background)] px-2 py-2">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="form-field-search flex-1"
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="shrink-0 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2 max-w-5xl">
                  <span>{option.label}</span>
                  {option.showStar && (
                    <Sparkles className="h-3 w-3 shrink-0 text-un-blue/30 fill-un-blue/20 -ml-1" />
                  )}
                </div>
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-2 text-center text-sm text-slate-500">
              No results found
            </div>
          )}
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
