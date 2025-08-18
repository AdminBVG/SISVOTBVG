import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from '../lib/icons';

const Layout: React.FC = () => {
  const { role, username, logout } = useAuth();
  const navigate = useNavigate();

  const links = role === 'REGISTRADOR_BVG'
    ? [
        { to: '/upload', label: 'Carga de padrón' },
        { to: '/attendance', label: 'Registro' },
        { to: '/proxies', label: 'Apoderados' },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard' },
      ];

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
        <header className="bg-gray-100 p-4 flex justify-end items-center space-x-4">
          {username && <span className="text-sm text-gray-700">{username}</span>}
          <button onClick={handleLogout} className="flex items-center text-sm text-gray-700 hover:underline">
            <LogOut className="w-4 h-4 mr-1" /> Salir
          </button>
        </header>
        <main className="flex-1 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

