import { forwardRef, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      className={`ui-input ${className}`.trim()}
      data-slot="input"
      {...props}
    />
  ),
);

Input.displayName = 'Input';
