"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared input styling - exported for use in other components
export const inputBaseStyles =
  "w-full rounded border px-3 py-2 text-sm transition outline-none";
export const inputDefaultStyles =
  "border-slate-300 bg-slate-50 focus:border-un-blue focus:ring-2 focus:ring-un-blue/15";
export const inputErrorStyles =
  "border-red-500 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/15";

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label?: string;
  error?: string;
  optional?: boolean;
  wrapperClassName?: string;
  inputClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      error,
      optional = false,
      required = false,
      wrapperClassName,
      inputClassName,
      ...inputProps
    },
    ref
  ) => {
    return (
      <div className={cn("space-y-2", wrapperClassName)}>
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
          ref={ref}
          className={cn(
            inputBaseStyles,
            error ? inputErrorStyles : inputDefaultStyles,
            inputClassName
          )}
          {...inputProps}
        />
        {error && (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}
      </div>
    );
  }
);

TextField.displayName = "TextField";
