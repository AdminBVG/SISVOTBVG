import React from 'react';
import { PieChart, BarChart } from '../lib/recharts';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useParams } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const { data, isLoading, error } = useDashboardStats(electionId);

  if (isLoading) return <p>Cargando...</p>;
  if (error || !data) return <p className="text-red-600">Error al cargar estadísticas</p>;

  const pieData = [
    { name: 'Presencial', value: data.presencial, color: '#14532d' },
    { name: 'Virtual', value: data.virtual, color: '#16a34a' },
    { name: 'Ausente', value: data.ausente, color: '#9ca3af' },
  ];

  const barData = [
    { name: 'Directo', value: data.capital_presente_directo, color: '#14532d' },
    { name: 'Representado', value: data.capital_presente_representado, color: '#16a34a' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold mb-4">Dashboard</h1>
      <div className="flex flex-col md:flex-row md:space-x-8">
        <div className="mt-4" role="img" aria-label="Distribución de asistencia">
          <PieChart width={300} height={200} data={pieData} />
          <p className="sr-only">
            Presencial {data.presencial}, Virtual {data.virtual}, Ausente {data.ausente}
          </p>
        </div>
        <div
          className="mt-6 md:mt-0"
          role="img"
          aria-label="Capital presente directo versus representado"
        >
          <BarChart width={300} height={200} data={barData} />
          <p className="sr-only">
            Directo {data.capital_presente_directo}, Representado {data.capital_presente_representado}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
