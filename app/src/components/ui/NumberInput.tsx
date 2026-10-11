'use client';

import { InputHTMLAttributes } from 'react';

/**
 * A number input that does NOT change value on mouse-wheel scroll.
 * The browser default is to change the value when the input is focused
 * and the user scrolls — this prevents that by blurring on wheel.
 */
interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  className?: string;
}

export default function NumberInput({ className = '', onWheel, ...props }: Props) {
  return (
    <input
      type="number"
      inputMode="numeric"
      className={className}
      // Blur the input on scroll so the wheel doesn't change the value
      onWheel={(e) => {
        (e.currentTarget as HTMLInputElement).blur();
        onWheel?.(e);
      }}
      {...props}
    />
  );
}

/**
 * Same but for decimal (monetary) inputs.
 */
export function DecimalInput({ className = '', onWheel, ...props }: Props) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={className}
      onWheel={(e) => {
        (e.currentTarget as HTMLInputElement).blur();
        onWheel?.(e);
      }}
      {...props}
    />
  );
}
