"use client";

import { useState, useEffect, useRef, InputHTMLAttributes } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  inputBaseStyles,
  inputDefaultStyles,
  inputErrorStyles,
} from "./TextField";

interface AutocompleteFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "onChange"> {
  label?: string;
  error?: string;
  optional?: boolean;
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  wrapperClassName?: string;
  inputClassName?: string;
}

export function AutocompleteField({
  label,
  error,
  optional = false,
  required = false,
  suggestions,
  value,
  onChange,
  wrapperClassName,
  inputClassName,
  ...inputProps
}: AutocompleteFieldProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  useEffect(() => {
    if (!value || value.trim() === "") {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchTerm = value.toLowerCase();
    const filtered = suggestions.filter((s) =>
      s.toLowerCase().includes(searchTerm)
    );
    setFilteredSuggestions(filtered);

    if (filtered.length > 0) {
      setShowSuggestions(true);
    }
  }, [value, suggestions]);

  const handleFocus = () => {
    if (value && value.trim() && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSelect = (selected: string) => {
    onChange(selected);
    setShowSuggestions(false);
  };

  return (
    <div className={cn("space-y-2 relative", wrapperClassName)} ref={wrapperRef}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
          {optional && (
            <span className="text-xs text-slate-500"> (optional)</span>
          )}
        </label>
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
        className={cn(
          inputBaseStyles,
          error ? inputErrorStyles : inputDefaultStyles,
          inputClassName
        )}
        {...inputProps}
      />
      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-un-blue hover:text-white transition-colors cursor-pointer border-b border-slate-100 last:border-b-0"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </div>
      )}
    </div>
  );
}
