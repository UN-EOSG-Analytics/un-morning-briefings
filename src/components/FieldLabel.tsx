interface FieldLabelProps {
  label?: string;
  required?: boolean;
}

export function FieldLabel({ label, required = false }: FieldLabelProps) {
  if (!label) return null;
  return (
    <label className="text-sm font-medium text-slate-900">
      {label}
      {required && <span className="text-red-500"> *</span>}
    </label>
  );
}
