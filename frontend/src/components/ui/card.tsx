import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card: React.FC<CardProps> = ({ className = '', ...props }) => (
  <div className={`border rounded shadow-sm bg-white ${className}`} {...props} />
);

export default Card;
