import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card: React.FC<CardProps> = ({ className = '', ...props }) => (
  <div className={`bvg-card ${className}`} {...props} />
);

export default Card;
