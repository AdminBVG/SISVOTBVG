import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut } from '../lib/icons';

const Layout: React.FC = () => {
  const { role, username, logout } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const base = id ? `/votaciones/${id}` : '';
  const [menuOpen, setMenuOpen] = useState(false);

  let links: { to: string; label: string }[] = [];
  if (role === 'FUNCIONAL_BVG') {
    if (base) {
      links = [
        { to: `${base}/upload`, label: 'Carga de padrón' },
        { to: `${base}/attendance`, label: 'Registro' },
        { to: `${base}/proxies`, label: 'Apoderados' },
      ];
    }
  } else if (role === 'ADMIN_BVG') {
    links = [{ to: '/votaciones', label: 'Votaciones' }];
    if (base) {
      links.push(
        { to: `${base}/dashboard`, label: 'Dashboard' },
        { to: `${base}/attendance`, label: 'Registro de asistencia' },
        { to: `${base}/proxies`, label: 'Apoderados' },
      );
    }
    links.push({ to: '/users', label: 'Usuarios' });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="d-flex min-vh-100">
      <aside
        className={`bg-dark text-white p-4 shadow-sm ${menuOpen ? 'd-block' : 'd-none d-md-block'}`}
      >
        <h2 className="h5 fw-semibold mb-4">BVG</h2>
        <nav className="nav flex-column gap-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `nav-link px-0 ${isActive ? 'active fw-semibold' : 'text-white-50'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-grow-1 d-flex flex-column">
        <header className="bg-light p-3 d-flex justify-content-between align-items-center shadow-sm">
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-secondary d-md-none"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
            <h1 className="h6 mb-0">Sistema de Asistentes BVG</h1>
          </div>
          <div className="d-flex align-items-center gap-3">
            {username && role && (
              <span className="small text-secondary">{role} - {username}</span>
            )}
            <button
              onClick={handleLogout}
              className="btn btn-link p-0 d-flex align-items-center text-secondary text-decoration-none"
            >
              <LogOut width={16} height={16} className="me-1" /> Cerrar sesión
            </button>
          </div>
        </header>
        <main className="flex-grow-1 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

