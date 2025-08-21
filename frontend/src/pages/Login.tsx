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
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(1deg); }
          66% { transform: translateY(-10px) rotate(-1deg); }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.05); opacity: 0.2; }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .bg-gradient {
          background: linear-gradient(135deg,
            #667eea 0%,
            #764ba2 25%,
            #f093fb 50%,
            #f5576c 75%,
            #4facfe 100%);
          background-size: 300% 300%;
          animation: gradientShift 8s ease infinite;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          position: relative;
          overflow: hidden;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border-radius: 1.5rem;
          padding: 2.5rem;
          max-width: 28rem;
          width: 100%;
          z-index: 10;
          position: relative;
        }

        .floating-shape {
          animation: float 6s ease-in-out infinite;
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
        }

        .slide-in {
          animation: slideIn 0.6s ease-out forwards;
        }

        .pulse-bg {
          animation: pulse 4s ease-in-out infinite;
        }

        .error-shake {
          animation: shake 0.5s ease-in-out;
        }

        .modern-input {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          color: white;
          font-size: 1rem;
          width: 100%;
          transition: all 0.3s ease;
        }

        .modern-input:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
          border-color: #667eea;
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.2);
        }

        .modern-input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }

        .btn-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 0.75rem;
          padding: 0.75rem 2rem;
          color: white;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          width: 100%;
          transform: translateY(0);
          transition: all 0.3s ease;
        }

        .btn-gradient:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
          background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        }

        .btn-gradient:active {
          transform: translateY(-1px);
        }

        .btn-gradient:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .link-glow {
          color: white;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .link-glow:hover {
          text-shadow: 0 0 8px currentColor;
          transform: scale(1.05);
          color: white;
        }

        .input-group {
          position: relative;
        }

        .eye-button {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 1rem;
          z-index: 5;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          display: inline-block;
          margin-right: 0.5rem;
        }

        .alert {
          background: rgba(220, 53, 69, 0.2);
          border: 1px solid rgba(220, 53, 69, 0.3);
          color: white;
          padding: 0.75rem;
          border-radius: 0.5rem;
          text-align: center;
        }

        .form-label {
          color: white;
          font-weight: 600;
          margin-bottom: 0.5rem;
          display: block;
        }

        .text-center {
          text-align: center;
        }

        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 1rem; }
        .mb-4 { margin-bottom: 1.5rem; }
        .me-1 { margin-right: 0.25rem; }
        .me-2 { margin-right: 0.5rem; }
        .gap-3 > * + * { margin-top: 1rem; }
        .gap-4 > * + * { margin-top: 1.5rem; }
        .d-flex { display: flex; }
        .justify-content-center { justify-content: center; }
        .align-items-center { align-items: center; }
        .flex-wrap { flex-wrap: wrap; }
      `}</style>

      <div className="bg-gradient">
        {/* Background floating shapes */}
        <div
          className="floating-shape pulse-bg"
          style={{
            width: '200px',
            height: '200px',
            top: '10%',
            left: '10%',
            animationDelay: '0s',
          }}
        />
        <div
          className="floating-shape pulse-bg"
          style={{
            width: '150px',
            height: '150px',
            bottom: '20%',
            right: '15%',
            animationDelay: '2s',
          }}
        />
        <div
          className="floating-shape pulse-bg"
          style={{
            width: '100px',
            height: '100px',
            top: '30%',
            right: '25%',
            animationDelay: '4s',
          }}
        />

        <div className="glass-card slide-in">
          <div className="gap-4" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Title */}
            <div className="text-center mb-4">
              <h1
                style={{
                  fontSize: '2rem',
                  color: 'white',
                  fontWeight: 'bold',
                  marginBottom: '0.5rem',
                  textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                }}
              >
                ¡Bienvenido! 👋
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                Ingresa a tu cuenta
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className={`alert error-shake`} role="alert">
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
                  className="modern-input"
                  placeholder="Tu contraseña"
                  style={{ paddingRight: '3rem' }}
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
              className="btn-gradient"
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
              <div
                className="d-flex justify-content-center align-items-center flex-wrap"
                style={{ gap: '1rem' }}
              >
                <Link to="/register" className="link-glow">
                  ➕ Registrarse
                </Link>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
                <Link to="/reset-password" className="link-glow">
                  🔑 ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {/* Demo note */}
            <div className="text-center" style={{ marginTop: '1rem' }}>
              <p
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.9rem',
                  margin: 0,
                }}
              >
                💡 Demo: usuario "demo", contraseña "demo"
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;

