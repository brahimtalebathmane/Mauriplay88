import { ButtonHTMLAttributes, useState } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button = ({
  children,
  loading,
  disabled,
  variant = 'primary',
  onClick,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) => {
  const [clicked, setClicked] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('Button clicked:', { type, loading, disabled, clicked });

    if (clicked || loading || disabled) {
      console.log('Button click blocked:', { clicked, loading, disabled });
      return;
    }

    setClicked(true);

    if (onClick) {
      console.log('Button: Calling onClick handler');
      onClick(e);
    }

    if (type !== 'submit') {
      setTimeout(() => setClicked(false), 1000);
    } else {
      setTimeout(() => setClicked(false), 300);
    }
  };

  const baseClasses = 'w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-white text-black hover:bg-gray-200',
    secondary: 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>جاري المعالجة...</span>
        </div>
      ) : children}
    </button>
  );
};
