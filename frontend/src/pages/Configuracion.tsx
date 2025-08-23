import React, { useEffect, useState } from 'react';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import { useSettings, useUpdateSettings, Settings } from '../hooks/useSettings';
import { useToast } from '../components/ui/toast';

const Configuracion: React.FC = () => {
  const { data } = useSettings();
  const toast = useToast();
  const update = useUpdateSettings(() => toast('Guardado'));
  const [form, setForm] = useState<Settings>({});
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);
  const handleChange = (field: keyof Settings) => (e: any) =>
    setForm({ ...form, [field]: e.target.value });
  return (
    <div className="container py-4 space-y-2">
      <h1 className="h4 mb-4">Configuración</h1>
      <Input placeholder="SMTP host" value={form.smtp_host || ''} onChange={handleChange('smtp_host')} />
      <Input placeholder="SMTP port" value={form.smtp_port || ''} onChange={handleChange('smtp_port')} />
      <Input placeholder="SMTP user" value={form.smtp_user || ''} onChange={handleChange('smtp_user')} />
      <Input
        placeholder="SMTP password"
        type="password"
        value={form.smtp_password || ''}
        onChange={handleChange('smtp_password')}
      />
      <Input placeholder="Correo remitente" value={form.smtp_from || ''} onChange={handleChange('smtp_from')} />
      <Button onClick={() => update.mutate(form)}>Guardar</Button>
    </div>
  );
};

export default Configuracion;
