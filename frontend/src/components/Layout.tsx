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
    <div className="min-vh-100 d-flex flex-column">
      <nav className="navbar navbar-expand-md bg-white border-bottom fixed-top">
        <div className="container-fluid">
          <NavLink to="/" className="navbar-brand fw-bold">
            BVG
          </NavLink>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNav"
            aria-controls="mainNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse justify-content-end" id="mainNav">
            <ul className="navbar-nav align-items-center gap-2">
              {links.map((l) => (
                <li key={l.to} className="nav-item">
                  <NavLink
                    to={l.to}
                    className={({ isActive }) => `nav-link ${isActive ? 'active fw-semibold' : ''}`}
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
              {username && role && (
                <li className="nav-item d-none d-md-block">
                  <span className="nav-link disabled text-body-secondary small">
                    {role} - {username}
                  </span>
                </li>
              )}
              <li className="nav-item">
                <button
                  onClick={handleLogout}
                  className="btn btn-link nav-link p-0 d-flex align-items-center"
                >
                  <LogOut width={16} height={16} className="me-1" /> Cerrar sesión
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <main className="container py-4 mt-5 flex-grow-1">
        <Outlet />
      </main>
      <footer className="text-center py-3 border-top mt-auto bg-white">
        <small>&copy; BVG</small>
      </footer>
    </div>
  );
};

export default Layout;
