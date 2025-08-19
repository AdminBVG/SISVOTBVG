import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '../lib/react-query';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import Input from '../components/ui/input';
import Button from '../components/ui/button';

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
      if (data.role === 'REGISTRADOR_BVG') navigate('/upload');
      else navigate('/dashboard');
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={onSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-4">Ingreso</h1>
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <div className="mb-4">
          <label htmlFor="username" className="block mb-1 text-sm">
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
        <div className="mb-4">
          <label htmlFor="password" className="block mb-1 text-sm">
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
        <Button
          type="submit"
          className="w-full"
          disabled={mutation.isLoading}
        >
          {mutation.isLoading ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
    </div>
  );
};

export default Login;
