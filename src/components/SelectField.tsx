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
        <label className="text-sm font-medium text-slate-700">
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
          className={`w-full ${
            error ? "border-red-500 bg-red-50" : ""
          } ${triggerClassName}`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {searchable && (
            <div className="sticky top-0 flex items-center gap-2 border-b bg-slate-50 px-2 py-2">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm placeholder-slate-400 outline-none"
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
                <div className="flex items-center gap-2 relative">
                  <span>{option.label}</span>
                  {option.showStar && (
                    <Sparkles className="h-3 w-3 text-un-blue/30 fill-un-blue/20 -ml-1" />
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
