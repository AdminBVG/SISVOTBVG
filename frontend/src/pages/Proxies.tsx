import React, { useState } from 'react';
import { useToast } from '../components/ui/toast';
import { useProxies, useCreateProxy } from '../hooks/useProxies';

const Proxies: React.FC = () => {
  const electionId = 1; // demo election
  const toast = useToast();
  const { data: proxies, refetch } = useProxies(electionId);
  const initialForm = {
    proxy_person_id: '',
    tipo_doc: '',
    num_doc: '',
    fecha_otorg: '',
    fecha_vigencia: '',
    pdf_url: '',
  };
  const [form, setForm] = useState(initialForm);

  const createProxy = useCreateProxy(
    electionId,
    () => {
      toast('Poder registrado');
      setForm(initialForm);
      refetch();
    },
    (err) => toast(err.message)
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProxy.mutate({
      proxy_person_id: Number(form.proxy_person_id),
      tipo_doc: form.tipo_doc,
      num_doc: form.num_doc,
      fecha_otorg: form.fecha_otorg,
      fecha_vigencia: form.fecha_vigencia || null,
      pdf_url: form.pdf_url,
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Gestión de Apoderados</h1>
      <form className="space-y-2 max-w-md" onSubmit={handleSubmit}>
        <input
          className="border px-3 py-2 rounded w-full"
          name="proxy_person_id"
          placeholder="ID persona apoderada"
          value={form.proxy_person_id}
          onChange={handleChange}
        />
        <input
          className="border px-3 py-2 rounded w-full"
          name="tipo_doc"
          placeholder="Tipo de documento"
          value={form.tipo_doc}
          onChange={handleChange}
        />
        <input
          className="border px-3 py-2 rounded w-full"
          name="num_doc"
          placeholder="Número de documento"
          value={form.num_doc}
          onChange={handleChange}
        />
        <input
          className="border px-3 py-2 rounded w-full"
          name="fecha_otorg"
          placeholder="Fecha de otorgamiento"
          type="date"
          value={form.fecha_otorg}
          onChange={handleChange}
        />
        <input
          className="border px-3 py-2 rounded w-full"
          name="fecha_vigencia"
          placeholder="Fecha de vigencia"
          type="date"
          value={form.fecha_vigencia}
          onChange={handleChange}
        />
        <input
          className="border px-3 py-2 rounded w-full"
          name="pdf_url"
          placeholder="URL del PDF"
          value={form.pdf_url}
          onChange={handleChange}
        />
        <button className="bg-green-600 text-white px-4 py-2 rounded" type="submit">
          Guardar
        </button>
      </form>
      {proxies && proxies.length > 0 && (
        <ul className="list-disc pl-4">
          {proxies.map((p) => (
            <li key={p.id}>Poder #{p.id} - Documento {p.num_doc}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Proxies;

