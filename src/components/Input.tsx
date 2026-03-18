import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-gray-300 text-caption font-medium mb-2 text-right">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full min-h-[48px] bg-card text-white border ${
            error ? 'border-red-500' : 'border-white/10'
          } rounded-input px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 transition-colors text-right ${className}`}
          {...props}
        />
        {error && (
          <p className="text-red-500 text-caption mt-1 text-right">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
