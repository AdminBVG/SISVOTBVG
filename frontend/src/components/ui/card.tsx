import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card: React.FC<CardProps> = ({ className = '', ...props }) => (
  <div
    className={`bg-white rounded-xl border border-gray-200 shadow-md transition-shadow hover:shadow-lg ${className}`}
    {...props}
  />
);

export default Card;
