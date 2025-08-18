import React from 'react';

export const PieChart: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => (
  <div {...props}>{children}</div>
);
export const Pie: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => (
  <div {...props}>{children}</div>
);
export const Cell: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => <div {...props} />;
export const BarChart = PieChart;
export const Bar = Pie;
export const XAxis: React.FC = () => <div />;
export const YAxis: React.FC = () => <div />;
export const Tooltip: React.FC = () => null;
