import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from '../lib/icons';

const Layout: React.FC = () => {
  const { role, username, logout } = useAuth();
  const navigate = useNavigate();

  let links: { to: string; label: string }[] = [];
  if (role === 'ADMIN_BVG') {
    links = [
      { to: '/votaciones', label: 'Votaciones' },
      { to: '/users', label: 'Usuarios' },
      { to: '/config', label: 'Configuración' },
    ];
  } else if (role === 'FUNCIONAL_BVG') {
    links = [{ to: '/votaciones', label: 'Votaciones' }];
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <NavLink to="/" className="text-lg font-semibold">
          BVG
        </NavLink>
        <nav className="flex items-center gap-6">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-sm transition-colors hover:text-bvg-blue-light focus:text-bvg-celeste ${isActive ? 'text-bvg-blue' : 'text-gray-600'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {username && role && (
            <span className="text-xs text-gray-400">
              {role} - {username}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
          >
            <LogOut width={16} height={16} /> Cerrar sesión
          </button>
        </nav>
      </header>
      <main className="flex-1 px-6 py-8">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-gray-500 py-4 border-t">
        &copy; BVG
      </footer>
    </div>
  );
};

export default Layout;
