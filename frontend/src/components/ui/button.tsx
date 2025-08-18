import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
}

const Button: React.FC<ButtonProps> = ({ variant = 'default', className = '', ...props }) => {
  const base = 'px-3 py-1 rounded text-sm';
  const styles = variant === 'outline'
    ? 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
    : 'bg-blue-600 text-white hover:bg-blue-700';
  return <button className={`${base} ${styles} ${className}`} {...props} />;
};

export default Button;
