import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card: React.FC<CardProps> = ({ className = '', ...props }) => (
  <div className={`bg-white rounded-3 shadow-sm ${className}`} {...props} />
);

export default Card;
