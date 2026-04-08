"use client";

import { useCallback, useState, useMemo } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Sparkles, CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  inputBaseStyles,
  inputDefaultStyles,
  inputErrorStyles,
} from "@/components/TextField";
import { FieldLabel } from "@/components/FieldLabel";
import { FieldError } from "@/components/FieldError";

interface SelectFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
    sublabel?: string;
    showStar?: boolean;
  }>;
  error?: string;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  showLabel?: boolean;
  searchable?: boolean;
  side?: "top" | "bottom" | "left" | "right";
  onOpenChange?: (open: boolean) => void;
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
  side,
  onOpenChange,
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
    const q = searchQuery.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.sublabel?.toLowerCase().includes(q),
    );
  }, [options, searchQuery]);

  const hasSublabels = options.some((o) => o.sublabel);

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && <FieldLabel label={label} required={required} />}
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
        onOpenChange={onOpenChange}
      >
        <SelectTrigger
          className={cn(
            inputBaseStyles,
            inputDefaultStyles,
            "data-[placeholder]:text-[var(--form-field-placeholder)]",
            error && inputErrorStyles,
            triggerClassName,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        {searchable ? (
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              side={side ?? "bottom"}
              sideOffset={4}
              avoidCollisions={false}
              className={cn(
                "relative z-50 w-(--radix-select-trigger-width) min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
                "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
              )}
            >
              {/* Search bar — outside the scrolling viewport */}
              <div className="flex items-center gap-2 border-b px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="shrink-0 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Scrollable list */}
              <SelectPrimitive.Viewport className="max-h-64 overflow-y-auto p-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <SelectPrimitive.Item
                      key={option.value}
                      value={option.value}
                      className={cn(
                        "relative flex w-full cursor-default items-start rounded-sm pr-8 pl-2 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
                        hasSublabels ? "py-2" : "py-1.5",
                      )}
                    >
                      <span className="absolute top-1/2 right-2 flex size-3.5 -translate-y-1/2 items-center justify-center">
                        <SelectPrimitive.ItemIndicator>
                          <CheckIcon className="size-3.5" />
                        </SelectPrimitive.ItemIndicator>
                      </span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <SelectPrimitive.ItemText>
                          {option.label}
                        </SelectPrimitive.ItemText>
                        {option.sublabel && (
                          <span className="text-xs leading-none text-slate-400">
                            {option.sublabel}
                          </span>
                        )}
                      </div>
                      {option.showStar && (
                        <Sparkles className="mt-0.5 ml-auto h-3 w-3 shrink-0 fill-un-blue/20 text-un-blue/30" />
                      )}
                    </SelectPrimitive.Item>
                  ))
                ) : (
                  <div className="px-2 py-3 text-center text-sm text-slate-500">
                    No results found
                  </div>
                )}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        ) : (
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              side={side ?? "bottom"}
              sideOffset={4}
              avoidCollisions={false}
              className={cn(
                "relative z-50 w-(--radix-select-trigger-width) min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
                "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
              )}
            >
              <SelectPrimitive.Viewport className="max-h-64 overflow-y-auto p-1">
                {options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    className="relative flex w-full cursor-default items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
                  >
                    <span className="absolute right-2 flex size-3.5 items-center justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <CheckIcon className="size-3.5" />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText>
                      {option.label}
                    </SelectPrimitive.ItemText>
                    {option.showStar && (
                      <Sparkles className="ml-auto h-3 w-3 shrink-0 fill-un-blue/20 text-un-blue/30" />
                    )}
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        )}
      </Select>
      <FieldError error={error} />
    </div>
  );
}
