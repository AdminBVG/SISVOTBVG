import React from 'react';

const Alert: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex items-center p-2 mb-2 text-red-700 bg-red-100 border border-red-200 rounded">
    <span className="mr-2">⚠️</span>
    <span>{message}</span>
  </div>
);

export default Alert;
