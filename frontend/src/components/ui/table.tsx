import React from 'react';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className = '',
  ...props
}) => <table className={`bvg-table ${className}`} {...props} />;

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  ...props
}) => <thead className={`sticky top-0 bg-gray-100 z-10 ${className}`} {...props} />;

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  ...props
}) => <tbody className={className} {...props} />;

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className = '',
  ...props
}) => (
  <tr
    className={`odd:bg-white even:bg-gray-50 hover:bg-gray-100 ${className}`}
    {...props}
  />
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  ...props
}) => (
  <th
    className={`font-semibold px-4 py-2 text-sm text-gray-700 ${className}`}
    scope="col"
    {...props}
  />
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  ...props
}) => <td className={`px-4 py-2 ${className}`} {...props} />;
