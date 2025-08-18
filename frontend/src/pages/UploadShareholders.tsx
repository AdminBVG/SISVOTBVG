import React, { ChangeEvent } from 'react';
import { useShareholdersImport } from '../hooks/useShareholdersImport';

const UploadShareholders: React.FC = () => {
  const {
    file,
    previewData,
    errors,
    loading,
    result,
    handleFile,
    upload,
    reset,
  } = useShareholdersImport();

  const electionId = 1; // fijo en este prototipo

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onSubmit = async () => {
    await upload(electionId);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white shadow rounded p-6">
        <h1 className="text-2xl font-semibold mb-6">
          Cargar Padrón de Accionistas
        </h1>

        {/* File Input */}
        <div className="mb-4">
          <input
            type="file"
            accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={onFileChange}
            className="block w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4
                       file:rounded file:border-0
                       file:text-sm file:font-semibold
                       file:bg-indigo-50 file:text-indigo-700
                       hover:file:bg-indigo-100"
          />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-4 text-red-600">
            <p className="font-semibold">Errores:</p>
            <ul className="list-disc list-inside">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Preview Table */}
        {previewData.length > 0 && (
          <div className="mb-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Código</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Nombre</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Documento</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {previewData.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">{row.code}</td>
                    <td className="px-4 py-2">{row.name}</td>
                    <td className="px-4 py-2">{row.document}</td>
                    <td className="px-4 py-2">{row.email}</td>
                    <td className="px-4 py-2">{row.actions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={onSubmit}
            disabled={!file || previewData.length === 0 || loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded
                       disabled:opacity-50"
          >
            {loading ? 'Importando…' : 'Importar'}
          </button>
          <button
            onClick={reset}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded"
          >
            Limpiar
          </button>
        </div>

        {/* Result Summary */}
        {result && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Resumen de importación</h2>
            <p>Nuevos: {result.created}</p>
            <p>Actualizados: {result.updated}</p>
            <p>Errores: {result.errors}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadShareholders;

