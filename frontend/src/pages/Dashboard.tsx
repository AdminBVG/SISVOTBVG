import React from 'react';
import { PieChart, BarChart } from '../lib/recharts';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useParams } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const { data, isLoading, error } = useDashboardStats(electionId);

  if (isLoading) return <p>Cargando...</p>;
  if (error || !data)
    return (
      <p role="alert" className="text-body">
        Error al cargar estadísticas
      </p>
    );

  const totalPresentes = data.presencial + data.virtual;
  const pctPresencial = totalPresentes
    ? (data.presencial / totalPresentes) * 100
    : 0;
  const pctVirtual = totalPresentes ? (data.virtual / totalPresentes) * 100 : 0;
  const pieData = [
    { name: 'Presencial', value: pctPresencial, color: 'var(--bvg-blue)' },
    { name: 'Virtual', value: pctVirtual, color: 'var(--bvg-blue-light)' },
  ];

  const barData = [
    { name: 'Directo', value: data.capital_presente_directo, color: 'var(--bvg-blue)' },
    { name: 'Representado', value: data.capital_presente_representado, color: 'var(--bvg-blue-light)' },
  ];

  return (
    <div className="container py-4">
      <h1 className="h4 mb-4">Dashboard</h1>
      <div className="d-flex flex-column flex-md-row gap-4">
        <div role="img" aria-label="Distribución de asistencia">
          <PieChart width={300} height={200} data={pieData} />
          <p className="visually-hidden">
            Presencial {pctPresencial.toFixed(2)}%, Virtual {pctVirtual.toFixed(2)}%
          </p>
        </div>
        <div role="img" aria-label="Capital presente directo versus representado">
          <BarChart width={300} height={200} data={barData} />
          <p className="visually-hidden">
            Directo {data.capital_presente_directo}, Representado {data.capital_presente_representado}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
