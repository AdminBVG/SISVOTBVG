import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '../lib/react-query';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

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
      navigate('/');
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white p-6 rounded-md shadow"
      >
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold mb-1">Inicio de sesión</h1>
          <p className="text-sm text-gray-500">Ingresa a tu cuenta</p>
        </div>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <div className="mb-4">
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            Usuario
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tu nombre de usuario"
          />
        </div>
        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tu contraseña"
          />
        </div>
        <button
          type="submit"
          disabled={mutation.isLoading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {mutation.isLoading ? 'Ingresando...' : 'Ingresar'}
        </button>
        <div className="text-center mt-4 text-sm">
          <Link to="/register" className="text-blue-600 hover:underline">
            Registrarse
          </Link>
          <span className="mx-2 text-gray-400">|</span>
          <Link to="/reset-password" className="text-blue-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
