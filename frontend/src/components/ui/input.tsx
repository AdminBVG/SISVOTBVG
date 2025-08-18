import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input: React.FC<InputProps> = ({ className = '', ...props }) => (
  <input className={`border rounded px-3 py-2 w-full ${className}`} {...props} />
);

export default Input;
