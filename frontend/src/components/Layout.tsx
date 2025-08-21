import React from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from '../lib/icons';

const Layout: React.FC = () => {
  const { role, username, logout } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const base = id ? `/votaciones/${id}` : '';

  let links: { to: string; label: string }[] = [];
  if (role === 'FUNCIONAL_BVG') {
    if (base) {
      links = [{ to: `${base}/attendance`, label: 'Registro' }];
    }
  } else if (role === 'ADMIN_BVG') {
    links = [{ to: '/votaciones', label: 'Votaciones' }];
    if (base) {
      links.push(
        { to: `${base}/upload`, label: 'Carga de padrón' },
        { to: `${base}/attendance`, label: 'Registro de asistencia' },
        { to: `${base}/proxies`, label: 'Apoderados' },
        { to: `${base}/dashboard`, label: 'Dashboard' },
      );
    }
    links.push({ to: '/users', label: 'Usuarios' });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-gradient min-vh-100 d-flex flex-column">
      <div className="floating-shape shape-1" />
      <div className="floating-shape shape-2" />
      <div className="floating-shape shape-3" />
      <nav className="navbar navbar-expand-md bvg-navbar fixed-top">
        <div className="container-fluid">
          <NavLink to="/votaciones" className="navbar-brand fw-bold text-white">
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
                  <span className="nav-link disabled text-white-50 small">
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
      <footer className="bvg-footer text-center py-3 mt-auto">
        <small>&copy; BVG</small>
      </footer>
    </div>
  );
};

export default Layout;
