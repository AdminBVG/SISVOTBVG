import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import Card from '../components/ui/card';

const Verify: React.FC = () => {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: (vars: { username: string; token: string }) =>
      apiFetch('/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vars),
      }),
    onSuccess: () => {
      navigate('/login');
    },
    onError: (err: any) => setError(err.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate({ username, token });
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-4">
      <Card className="p-4 w-100" style={{ maxWidth: '24rem' }}>
        <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
          <h1 className="h4 text-center">Verificar cuenta</h1>
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
            <label htmlFor="token" className="form-label">
              Token
            </label>
            <Input
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-100" disabled={mutation.isLoading}>
            {mutation.isLoading ? 'Verificando…' : 'Verificar'}
          </Button>
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

export default Verify;
