import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'link';
}

const Button: React.FC<ButtonProps> = ({ variant = 'default', className = '', ...props }) => {
  let base = 'bvg-btn';
  if (variant === 'outline') base = 'bvg-btn-outline';
  if (variant === 'link') base = 'bvg-btn-link';
  return <button className={`${base} ${className}`} {...props} />;
};

export default Button;
