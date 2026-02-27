"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { FieldLabel } from "@/components/FieldLabel";
import { FieldError } from "@/components/FieldError";

// Shared input styling - exported for use in other components
export const inputBaseStyles = "form-field";
export const inputDefaultStyles = "form-field-focus";
export const inputErrorStyles = "form-field-error";

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
  inputClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      error,
      required = false,
      wrapperClassName,
      inputClassName,
      ...inputProps
    },
    ref
  ) => {
    return (
      <div className={cn("space-y-2", wrapperClassName)}>
        <FieldLabel label={label} required={required} />
        <input
          ref={ref}
          className={cn(
            inputBaseStyles,
            error ? inputErrorStyles : inputDefaultStyles,
            inputClassName
          )}
          {...inputProps}
        />
        <FieldError error={error} />
      </div>
    );
  }
);

TextField.displayName = "TextField";
