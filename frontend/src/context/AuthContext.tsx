import React, { createContext, useContext, useState } from 'react';
import { getItem, setItem } from '../lib/storage';

interface AuthContextValue {
  token: string | null;
  role: string | null;
  username: string | null;
  login: (token: string, role: string, username?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => getItem('token'));
  const [role, setRole] = useState<string | null>(() => getItem('role'));
  const [username, setUsername] = useState<string | null>(() => getItem('username'));

  const login = (tok: string, rol: string, user?: string) => {
    setItem('token', tok);
    setItem('role', rol);
    if (user) {
      setItem('username', user);
      setUsername(user);
    }
    setToken(tok);
    setRole(rol);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    setToken(null);
    setRole(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};

