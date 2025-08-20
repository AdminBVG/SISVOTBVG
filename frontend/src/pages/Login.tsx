import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '../lib/react-query';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import Card from '../components/ui/card';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const mutation = useMutation({
    mutationFn: async (vars: { username: string; password: string }) => {
      return apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      });
    },
    onSuccess: (data) => {
      login(data.access_token, data.role, data.username);
      if (data.role === 'FUNCIONAL_BVG') navigate('/votaciones/1/upload');
      else navigate('/votaciones/1/dashboard');
    },
    onError: (err: any) => {
      setError(err.message);
    },
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
          <h1 className="h4 text-center">Ingreso</h1>
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
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
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
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-100" disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Login;
