import React, { useState } from 'react';
import { useToast } from '../components/ui/toast';
import { useProxies, useCreateProxy } from '../hooks/useProxies';
import Input from '../components/ui/input';
import Button from '../components/ui/button';

const Proxies: React.FC = () => {
  const electionId = 1; // demo election
  const toast = useToast();
  const { data: proxies, refetch, isLoading, error } = useProxies(electionId);
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
        <div>
          <label htmlFor="proxy_person_id" className="text-sm block mb-1">
            ID persona apoderada
          </label>
          <Input
            id="proxy_person_id"
            name="proxy_person_id"
            value={form.proxy_person_id}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="tipo_doc" className="text-sm block mb-1">
            Tipo de documento
          </label>
          <Input
            id="tipo_doc"
            name="tipo_doc"
            value={form.tipo_doc}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="num_doc" className="text-sm block mb-1">
            Número de documento
          </label>
          <Input
            id="num_doc"
            name="num_doc"
            value={form.num_doc}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="fecha_otorg" className="text-sm block mb-1">
            Fecha de otorgamiento
          </label>
          <Input
            id="fecha_otorg"
            name="fecha_otorg"
            type="date"
            value={form.fecha_otorg}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="fecha_vigencia" className="text-sm block mb-1">
            Fecha de vigencia
          </label>
          <Input
            id="fecha_vigencia"
            name="fecha_vigencia"
            type="date"
            value={form.fecha_vigencia}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="pdf_url" className="text-sm block mb-1">
            URL del PDF
          </label>
          <Input
            id="pdf_url"
            name="pdf_url"
            value={form.pdf_url}
            onChange={handleChange}
          />
        </div>
        <Button type="submit">Guardar</Button>
      </form>
      {isLoading && <p>Cargando...</p>}
      {error && <p className="text-red-600">{error.message}</p>}
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

