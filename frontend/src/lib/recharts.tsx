import React from 'react';

interface PieSlice {
  name: string;
  value: number;
  color: string;
}

export const PieChart: React.FC<{ data: PieSlice[]; width: number; height: number } & React.SVGProps<SVGSVGElement>> = ({ data, width, height, ...props }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;
  const radius = Math.min(width, height) / 2;
  const centerX = width / 2;
  const centerY = height / 2;
  return (
    <svg width={width} height={height} {...props}>
      {data.map((d) => {
        const startAngle = (cumulative / total) * 2 * Math.PI;
        cumulative += d.value;
        const endAngle = (cumulative / total) * 2 * Math.PI;
        const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
        const x1 = centerX + radius * Math.cos(startAngle);
        const y1 = centerY + radius * Math.sin(startAngle);
        const x2 = centerX + radius * Math.cos(endAngle);
        const y2 = centerY + radius * Math.sin(endAngle);
        const pathData = `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`;
        return <path key={d.name} d={pathData} fill={d.color} />;
      })}
    </svg>
  );
};

interface BarItem {
  name: string;
  value: number;
  color: string;
}

export const BarChart: React.FC<{ data: BarItem[]; width: number; height: number } & React.SVGProps<SVGSVGElement>> = ({ data, width, height, ...props }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = width / data.length;
  return (
    <svg width={width} height={height} {...props}>
      {data.map((d, i) => {
        const barHeight = (d.value / max) * height;
        return (
          <g key={d.name}>
            <rect
              x={i * barWidth + 5}
              y={height - barHeight}
              width={barWidth - 10}
              height={barHeight}
              fill={d.color}
            />
            <text
              x={i * barWidth + barWidth / 2}
              y={height - 5}
              textAnchor="middle"
              fontSize="10"
            >
              {d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
