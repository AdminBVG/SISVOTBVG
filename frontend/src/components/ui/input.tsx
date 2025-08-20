import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input: React.FC<InputProps> = ({ className = '', ...props }) => (
  <input className={`form-control ${className}`} {...props} />
);

export default Input;
