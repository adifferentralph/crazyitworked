import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  errors?: string[];
  label: string;
  name: string;
};

export function AuthField({ className, errors, id, label, name, ...props }: AuthFieldProps) {
  const inputId = id ?? name;
  const errorId = `${inputId}-error`;
  const hasError = Boolean(errors?.length);

  return (
    <div className="grid gap-2">
      <label htmlFor={inputId} className="text-sm font-semibold text-stone-800">
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        name={name}
        aria-describedby={hasError ? errorId : undefined}
        aria-invalid={hasError}
        className={cn(
          "h-12 w-full rounded-md border border-stone-300 bg-white px-3.5 text-base text-stone-950 outline-none placeholder:text-stone-400 focus:border-primary focus:ring-2 focus:ring-primary/20",
          hasError && "border-primary",
          className,
        )}
      />
      {hasError ? (
        <p id={errorId} className="text-sm text-primary">
          {errors?.[0]}
        </p>
      ) : null}
    </div>
  );
}
