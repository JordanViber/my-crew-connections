"use client";

import { useEffect, useState } from "react";
import { formatPhoneNumberForDisplay } from "@/lib/account-fields";

export function PhoneNumberInput({
  name,
  value,
  defaultValue,
  placeholder = "(415) 555-0132",
  disabled = false,
  required = false,
  autoComplete = "tel",
  className = "field-input",
  onValueChange,
}: Readonly<{
  name: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  className?: string;
  onValueChange?: (value: string) => void;
}>) {
  const isControlled = typeof value === "string";
  const [internalValue, setInternalValue] = useState(formatPhoneNumberForDisplay(defaultValue ?? value ?? ""));

  useEffect(() => {
    if (!isControlled) {
      setInternalValue(formatPhoneNumberForDisplay(defaultValue ?? ""));
    }
  }, [defaultValue, isControlled]);

  const displayValue = isControlled ? formatPhoneNumberForDisplay(value ?? "") : internalValue;

  function handleChange(nextValue: string) {
    const formattedValue = formatPhoneNumberForDisplay(nextValue);

    if (!isControlled) {
      setInternalValue(formattedValue);
    }

    onValueChange?.(formattedValue);
  }

  return (
    <input
      autoComplete={autoComplete}
      className={className}
      disabled={disabled}
      inputMode="tel"
      name={name}
      onChange={(event) => handleChange(event.target.value)}
      placeholder={placeholder}
      required={required}
      type="tel"
      value={displayValue}
    />
  );
}