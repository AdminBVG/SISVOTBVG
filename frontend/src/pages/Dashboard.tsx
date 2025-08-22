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

  const pieData = [
    { name: 'Presencial', value: data.presencial, color: 'var(--bvg-blue)' },
    { name: 'Virtual', value: data.virtual, color: 'var(--bvg-blue-light)' },
    { name: 'Ausente', value: data.ausente, color: 'var(--bvg-gray)' },
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
            Presencial {data.presencial}, Virtual {data.virtual}, Ausente {data.ausente}
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
