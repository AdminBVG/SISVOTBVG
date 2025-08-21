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
    <div className="container py-4">
      <h1 className="h4 mb-4">Inicio</h1>
      <div className="row g-3">
        {sections.map((s) => (
          <div key={s.to} className="col-md-4">
            <div className="border rounded p-4 h-100 bg-white">
              <h2 className="h5 mb-2">{s.title}</h2>
              <p className="mb-3 text-body-secondary">{s.description}</p>
              <Link to={s.to} className="btn btn-primary">
                Ingresar
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
