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
          <label className="block text-white text-sm mb-2 text-right">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-gray-900 text-white border ${
            error ? 'border-red-500' : 'border-gray-800'
          } rounded-lg px-4 py-3 focus:outline-none focus:border-white transition-colors text-right ${className}`}
          {...props}
        />
        {error && (
          <p className="text-red-500 text-sm mt-1 text-right">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
