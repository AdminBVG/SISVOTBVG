import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
}

const Button: React.FC<ButtonProps> = ({ variant = 'default', className = '', ...props }) => {
  const base =
    'px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'outline'
      ? 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-indigo-500'
      : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500';
  return <button className={`${base} ${styles} ${className}`} {...props} />;
};

export default Button;
