"use client";

import { Eye, EyeOff } from "lucide-react";
import React, { useState, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  errors?: string[];
  label: string;
  name: string;
};

export function AuthField({
  className,
  disabled,
  errors,
  id,
  label,
  name,
  type,
  ...props
}: AuthFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputId = id ?? name;
  const errorId = `${inputId}-error`;
  const isPassword = type === "password";
  const hasError = Boolean(errors?.length);
  const inputType = isPassword && isPasswordVisible ? "text" : type;

  return (
    <div className="grid gap-2">
      <label htmlFor={inputId} className="text-sm font-semibold text-stone-800">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={inputId}
          name={name}
          type={inputType}
          disabled={disabled}
          aria-describedby={hasError ? errorId : undefined}
          aria-invalid={hasError}
          className={cn(
            "h-12 w-full rounded-md border border-stone-300 bg-white px-3.5 text-base text-stone-950 outline-none placeholder:text-stone-400 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500",
            isPassword && "pr-12",
            hasError && "border-primary bg-red-50 ring-2 ring-primary/20",
            className,
          )}
        />
        {isPassword ? (
          <button
            type="button"
            className="absolute right-1 top-1 grid size-10 place-items-center rounded-md text-stone-600 outline-none hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-controls={inputId}
            aria-label={
              isPasswordVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`
            }
            aria-pressed={isPasswordVisible}
            disabled={disabled}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
          >
            {isPasswordVisible ? (
              <EyeOff className="size-5" aria-hidden="true" />
            ) : (
              <Eye className="size-5" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
      {hasError ? (
        <p id={errorId} className="text-sm font-medium text-primary">
          {errors?.[0]}
        </p>
      ) : null}
    </div>
  );
}
