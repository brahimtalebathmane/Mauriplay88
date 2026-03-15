import { InputHTMLAttributes, forwardRef } from 'react';
import { formatPhoneInput } from '../utils/phoneNumber';

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, value, onChange, className = '', ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneInput(e.target.value);
      onChange(formatted);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-white text-sm mb-2 text-right">
            {label}
          </label>
        )}
        <div className="relative">
          <div className="absolute right-0 top-0 h-full flex items-center px-4 bg-gray-800 border border-gray-800 rounded-r-lg pointer-events-none">
            <span className="text-white font-mono">+222</span>
          </div>
          <input
            ref={ref}
            type="tel"
            inputMode="numeric"
            value={value}
            onChange={handleChange}
            maxLength={8}
            className={`w-full bg-gray-900 text-white border ${
              error ? 'border-red-500' : 'border-gray-800'
            } rounded-lg pl-4 pr-20 py-3 focus:outline-none focus:border-white transition-colors text-right font-mono ${className}`}
            placeholder="XXXXXXXX"
            {...props}
          />
        </div>
        {error && (
          <p className="text-red-500 text-sm mt-1 text-right">{error}</p>
        )}
        <p className="text-gray-400 text-xs mt-1 text-right">
          أدخل 8 أرقام فقط (يبدأ بـ 2 أو 3 أو 4)
        </p>
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
