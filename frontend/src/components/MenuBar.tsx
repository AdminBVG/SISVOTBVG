import React from 'react';
import { NavLink } from 'react-router-dom';

interface MenuSection {
  label: string;
  items: { to: string; label: string }[];
}

const menuSections: MenuSection[] = [
  {
    label: 'Gestión',
    items: [
      { to: '/votaciones', label: 'Votaciones' },
      { to: '/users', label: 'Usuarios' },
      { to: '/config', label: 'Configuración' },
    ],
  },
];

const MenuBar: React.FC = () => {
  return (
    <nav className="navbar navbar-expand-md bvg-navbar border-top">
      <div className="container-fluid">
        <ul className="navbar-nav">
          {menuSections.map((section) => (
            <li key={section.label} className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                {section.label}
              </a>
              <ul className="dropdown-menu">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} className="dropdown-item">
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default MenuBar;
