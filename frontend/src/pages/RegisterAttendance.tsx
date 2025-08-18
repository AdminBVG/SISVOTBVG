import React, { useState } from 'react';

const RegisterAttendance: React.FC = () => {
  const [query, setQuery] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Registro de Asistencia</h1>
      <input
        className="border px-3 py-2 rounded w-full md:w-1/2"
        placeholder="Buscar por nombre o código"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="space-x-2">
        <button className="bg-green-600 text-white px-3 py-1 rounded">Presencial</button>
        <button className="bg-blue-600 text-white px-3 py-1 rounded">Virtual</button>
        <button className="bg-gray-500 text-white px-3 py-1 rounded">Ausente</button>
      </div>
      <p className="text-sm text-gray-600">Funcionalidad de marcado en desarrollo.</p>
    </div>
  );
};

export default RegisterAttendance;
