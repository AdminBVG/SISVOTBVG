import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from '../lib/icons';

const Layout: React.FC = () => {
  const { role, username, logout } = useAuth();
  const navigate = useNavigate();

  let links: { to: string; label: string }[] = [];
  if (role === 'REGISTRADOR_BVG') {
    links = [
      { to: '/upload', label: 'Carga de padrón' },
      { to: '/attendance', label: 'Registro' },
      { to: '/proxies', label: 'Apoderados' },
    ];
  } else if (role === 'ADMIN_BVG') {
    links = [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/votaciones', label: 'Votaciones' },
      { to: '/attendance', label: 'Registro de asistencia' },
      { to: '/proxies', label: 'Apoderados' },
    ];
  } else {
    links = [{ to: '/dashboard', label: 'Dashboard' }];
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-gray-800 text-white p-4">
        <h2 className="text-xl font-semibold mb-4">BVG</h2>
        <nav className="space-y-2">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="block hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="bg-gray-100 p-4 flex justify-between items-center">
          <h1 className="font-semibold">Sistema de Asistentes BVG</h1>
          <div className="flex items-center space-x-4">
            {username && role && (
              <span className="text-sm text-gray-700">{role} - {username}</span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center text-sm text-gray-700 hover:underline"
            >
              <LogOut className="w-4 h-4 mr-1" /> Cerrar sesión
            </button>
          </div>
        </header>
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

