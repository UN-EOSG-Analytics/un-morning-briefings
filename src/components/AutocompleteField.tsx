"use client";

import { useState, useMemo } from "react";
import { AlertCircle, Search, X, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

interface AutocompleteFieldProps {
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  wrapperClassName?: string;
}

export function AutocompleteField({
  label,
  placeholder = "Select or type...",
  error,
  required = false,
  suggestions,
  value,
  onChange,
  wrapperClassName,
}: AutocompleteFieldProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { matchingSuggestions, unmatchingSuggestions, shouldShowAddButton } = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    
    if (!searchQuery) {
      return {
        matchingSuggestions: [],
        unmatchingSuggestions: suggestions,
        shouldShowAddButton: false,
      };
    }

    const matching = suggestions.filter((s) =>
      s.toLowerCase().includes(searchLower)
    );
    const unmatching = suggestions.filter(
      (s) => !s.toLowerCase().includes(searchLower)
    );

    return {
      matchingSuggestions: matching,
      unmatchingSuggestions: unmatching,
      shouldShowAddButton: !suggestions.includes(searchQuery.trim()) && searchQuery.trim() !== "",
    };
  }, [suggestions, searchQuery]);

  const handleSelect = (selected: string) => {
    onChange(selected);
    setSearchQuery("");
    setOpen(false);
  };

  const handleAddNew = () => {
    const trimmed = searchQuery.trim();
    if (trimmed) {
      handleSelect(trimmed);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className={`space-y-2 ${wrapperClassName ?? ""}`}>
      {label && (
        <label className="text-sm font-medium text-slate-900">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setSearchQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={`h-9 w-full justify-start gap-1 px-3 font-normal ${
              error ? "border-red-500 bg-red-50" : ""
            }`}
          >
            {value ? (
              <>
                <span className="flex-1 truncate text-left text-sm text-slate-900">{value}</span>
                <X
                  className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                  onClick={handleClear}
                />
              </>
            ) : (
              <span className="text-slate-500">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start" side="bottom" sideOffset={4} avoidCollisions={false}>
          <Command>
            <CommandInput placeholder="Search or type new..." value={searchQuery} onValueChange={setSearchQuery} />
            <CommandEmpty>
              {searchQuery.trim() ? (
                <div className="px-2 py-3 text-center">
                  <p className="mb-1.5 text-xs text-slate-500">
                    No matching options
                  </p>
                  <p className="text-xs text-slate-400">
                    Press{" "}
                    <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700 shadow-sm">
                      Enter
                    </kbd>{" "}
                    or click below to add
                  </p>
                </div>
              ) : (
                <div className="px-2 py-3 text-center text-xs text-slate-500">
                  No options found.
                </div>
              )}
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {/* Add new button when searching for non-existent option */}
              {shouldShowAddButton && (
                <>
                  <CommandItem
                    value={searchQuery.trim()}
                    onSelect={handleAddNew}
                    className="mx-2 my-1 cursor-pointer rounded border border-un-blue/20 bg-un-blue/5"
                  >
                    <Check className="mr-2 h-4 w-4 opacity-0" />
                    <span className="font-medium text-un-blue">
                      Add &quot;{searchQuery.trim()}&quot;
                    </span>
                  </CommandItem>
                  {matchingSuggestions.length > 0 && (
                    <div className="mx-2 my-1 h-px bg-slate-200" />
                  )}
                </>
              )}

              {/* Matching suggestions */}
              {matchingSuggestions.map((s) => (
                <CommandItem
                  key={s}
                  value={s}
                  onSelect={() => handleSelect(s)}
                  className="cursor-pointer"
                >
                  <Check className={`mr-2 h-4 w-4 ${value === s ? "text-un-blue opacity-100" : "opacity-0"}`} />
                  <span>{s}</span>
                </CommandItem>
              ))}

              {matchingSuggestions.length > 0 && unmatchingSuggestions.length > 0 && (
                <div className="mx-2 my-1 h-px bg-slate-200" />
              )}

              {/* Unmatching suggestions */}
              {unmatchingSuggestions.map((s) => (
                <CommandItem
                  key={s}
                  value={s}
                  onSelect={() => handleSelect(s)}
                  className="cursor-pointer"
                >
                  <Check className={`mr-2 h-4 w-4 ${value === s ? "text-un-blue opacity-100" : "opacity-0"}`} />
                  <span>{s}</span>
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
