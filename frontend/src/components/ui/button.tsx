import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'link';
}

const Button: React.FC<ButtonProps> = ({ variant = 'default', className = '', ...props }) => {
  let base = 'btn bvg-btn-gradient';
  if (variant === 'outline') base = 'btn btn-outline-primary';
  if (variant === 'link') base = 'btn btn-link';
  return <button className={`${base} ${className}`} {...props} />;
};

export default Button;
