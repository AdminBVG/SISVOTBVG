import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '../lib/react-query';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
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
      navigate('/votaciones');
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError('');
    mutation.mutate({ username, password });
  };

  return (
    <div className="bg-gradient">
      {/* Background floating shapes */}
      <div className="floating-shape pulse-bg shape-1" />
      <div className="floating-shape pulse-bg shape-2" />
      <div className="floating-shape pulse-bg shape-3" />

      <div className="bvg-card slide-in">
        <div className="d-flex flex-column gap-4">
          {/* Title */}
          <div className="text-center mb-4">
            <h1 className="bvg-heading">¡Bienvenido! 👋</h1>
            <p className="bvg-subtitle">Ingresa a tu cuenta</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="alert error-shake" role="alert">
              ⚠️ {error}
            </div>
          )}

          {/* Username field */}
          <div>
            <label htmlFor="username" className="form-label">
              👤 Usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="modern-input"
              placeholder="Tu nombre de usuario"
            />
          </div>

          {/* Password field */}
          <div>
            <label htmlFor="password" className="form-label">
              🔒 Contraseña
            </label>
            <div className="input-group">
              <input
                id="password"
                type={isVisible ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="modern-input pe-5"
                placeholder="Tu contraseña"
              />
              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className="eye-button"
              >
                {isVisible ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Login button */}
          <button
            onClick={handleSubmit}
            disabled={mutation.isLoading}
            className="bvg-btn-gradient"
          >
            {mutation.isLoading ? (
              <>
                <span className="spinner"></span>
                Ingresando...
              </>
            ) : (
              <>🚀 Ingresar</>
            )}
          </button>

          {/* Links */}
          <div className="text-center">
            <div className="d-flex justify-content-center align-items-center flex-wrap gap-3">
              <Link to="/register" className="link-glow">
                ➕ Registrarse
              </Link>
              <span className="text-white-50">|</span>
              <Link to="/reset-password" className="link-glow">
                🔑 ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          {/* Demo note */}
          <div className="text-center mt-3">
            <p className="demo-note">
              💡 Demo: usuario "demo", contraseña "demo"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
