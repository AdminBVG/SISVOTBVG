import React from 'react';

const Proxies: React.FC = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Gestión de Apoderados</h1>
      <p className="text-sm text-gray-600">Permite registrar poderes para accionistas.</p>
      <form className="space-y-2 max-w-md">
        <input className="border px-3 py-2 rounded w-full" placeholder="Número de documento" />
        <input className="border px-3 py-2 rounded w-full" placeholder="Fecha de otorgamiento" type="date" />
        <input className="border px-3 py-2 rounded w-full" placeholder="Fecha de vigencia" type="date" />
        <input className="border px-3 py-2 rounded w-full" type="file" />
        <button className="bg-green-600 text-white px-4 py-2 rounded" type="button">Guardar</button>
      </form>
      <p className="text-sm text-gray-600">Funcionalidad completa pendiente.</p>
    </div>
  );
};

export default Proxies;
