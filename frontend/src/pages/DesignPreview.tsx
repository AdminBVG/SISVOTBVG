import React, { useState } from 'react';

// ─── BVG Theme Colors ───────────────────────────
const BVG_COLORS = {
  primary: '#10069F', // Azul BVG
  lightBlue: '#005EB8',
  sky: '#00AEEF',
};

// ─── Layout Minimalista con Top Navbar ──────────
const Layout: React.FC<{ children: React.ReactNode; onTab: (t: string) => void; tab: string }> = ({ children, onTab, tab }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* Top Navbar */}
      <header className="h-16 flex items-center justify-between px-6 shadow-sm bg-white border-b border-gray-200">
        <div className="flex items-center space-x-6">
          <div className="font-bold text-white px-3 py-1 rounded" style={{ backgroundColor: BVG_COLORS.primary }}>
            BVG
          </div>
          <nav className="flex space-x-4 text-sm">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'votaciones', label: 'Votaciones' },
              { id: 'asistencia', label: 'Asistencia' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                className={`px-3 py-2 rounded transition-colors font-medium ${
                  tab === t.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="text-sm">Usuario ▾</div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
};

// ─── Vistas Demo ───────────────────────────────
const Dashboard = () => (
  <div className="p-6 bg-white rounded shadow">Bienvenido al Dashboard 📊</div>
);
const Votaciones = () => (
  <div className="p-6 bg-white rounded shadow">Módulo de Votaciones 🗳️</div>
);
const Asistencia = () => (
  <div className="p-6 bg-white rounded shadow">Registro de Asistencia 👥</div>
);

// ─── DesignPreview Page ─────────────────────────
const DesignPreview: React.FC = () => {
  const [tab, setTab] = useState('dashboard');

  return (
    <Layout onTab={setTab} tab={tab}>
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'votaciones' && <Votaciones />}
      {tab === 'asistencia' && <Asistencia />}
    </Layout>
  );
};

export default DesignPreview;

