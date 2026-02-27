"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared input styling - exported for use in other components
export const fieldSurfaceStyles = "form-field-surface";
export const fieldFocusStyles = "form-field-focus";
export const inputBaseStyles = "form-field";
export const inputDefaultStyles = "form-field-focus";
export const inputErrorStyles = "form-field-error";

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
          <label className="text-sm font-medium text-slate-900">
            {label}
            {required && <span className="text-red-500"> *</span>}
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
