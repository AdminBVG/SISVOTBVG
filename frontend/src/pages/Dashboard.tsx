import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from '../lib/recharts';

const Dashboard: React.FC = () => {
  const pieData = [
    { name: 'Presencial', value: 50 },
    { name: 'Virtual', value: 30 },
    { name: 'Ausente', value: 20 },
  ];

  const barData = [
    { name: 'Directo', acciones: 70 },
    { name: 'Representado', acciones: 30 },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold mb-4">Dashboard</h1>
      <div className="flex flex-col md:flex-row md:space-x-8">
        <PieChart width={300} height={200}>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
            {pieData.map((_, i) => (
              <Cell key={i} fill={["#14532d", "#16a34a", "#9ca3af"][i]} />
            ))}
          </Pie>
        </PieChart>
        <BarChart width={300} height={200} data={barData} className="mt-6 md:mt-0">
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="acciones" fill="#14532d" />
        </BarChart>
      </div>
    </div>
  );
};

export default Dashboard;
