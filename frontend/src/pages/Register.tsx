import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import Card from '../components/ui/card';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (vars: { username: string; password: string }) =>
      apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      }),
    onSuccess: (data: any) => {
      setToken(data.verification_token);
    },
    onError: (err: any) => setError(err.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate({ username, password });
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-4">
      <Card className="p-4 w-100" style={{ maxWidth: '24rem' }}>
        <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
          <h1 className="h4 text-center">Registro</h1>
          {error && (
            <p role="alert" className="text-primary text-center">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="username" className="form-label">
              Usuario
            </label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="form-label">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-100" disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Registrando…' : 'Registrar'}
          </Button>
          {token && (
            <p className="text-sm text-center break-all">
              Token de verificación: {token}
            </p>
          )}
          <div className="text-center text-sm">
            <Link to="/login" className="text-primary">
              Volver al ingreso
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Register;
