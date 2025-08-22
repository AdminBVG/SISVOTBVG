import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Section {
  to: string;
  title: string;
  description: string;
}

const Home: React.FC = () => {
  const { role } = useAuth();

  const sections: Section[] = [];

  if (role === 'ADMIN_BVG') {
    sections.push(
      {
        to: '/votaciones',
        title: 'Votaciones',
        description: 'Crear y gestionar procesos de votación.',
      },
      {
        to: '/users',
        title: 'Usuarios',
        description: 'Administración de usuarios y roles.',
      },
      {
        to: '/config',
        title: 'Configuración',
        description: 'Personalización del sistema.',
      }
    );
  } else if (role === 'FUNCIONAL_BVG') {
    sections.push({
      to: '/votaciones',
      title: 'Votaciones',
      description: 'Acceso a los procesos según sus permisos.',
    });
  }

  return (
    <div className="max-w-5xl mx-auto py-4 px-4">
      <h1 className="text-xl font-semibold mb-4">Inicio</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((s) => (
          <div key={s.to} className="bvg-card p-4 flex flex-col">
            <h2 className="text-lg font-medium mb-2">{s.title}</h2>
            <p className="mb-3 text-gray-600 flex-1">{s.description}</p>
            <Link to={s.to} className="bvg-btn mt-auto">
              Ingresar
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
