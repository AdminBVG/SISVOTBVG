import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from './lib/react-query';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import UploadShareholders from './pages/UploadShareholders';
import Asistencia from './pages/Asistencia';
import Proxies from './pages/Proxies';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Votaciones from './pages/Votaciones';
import ManageAssistants from './pages/ManageAssistants';
import ManageUsers from './pages/ManageUsers';
import ManageElectionUsers from './pages/ManageElectionUsers';
import AuditLogs from './pages/AuditLogs';
import { ToastProvider } from './components/ui/toast';

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute roles={["ADMIN_BVG", "FUNCIONAL_BVG"]} />}>
                <Route element={<Layout />}> 
                  <Route path="/votaciones" element={<Votaciones />} /> 
                </Route> 
              </Route> 
              <Route element={<ProtectedRoute roles={["FUNCIONAL_BVG"]} />}>
                <Route element={<Layout />}> 
                  <Route path="/votaciones/:id/upload" element={<UploadShareholders />} /> 
                </Route> 
              </Route> 
              <Route element={<ProtectedRoute roles={["FUNCIONAL_BVG", "ADMIN_BVG"]} />}>
                <Route element={<Layout />}> 
                  <Route path="/votaciones/:id/attendance" element={<Asistencia />} /> 
                  <Route path="/votaciones/:id/proxies" element={<Proxies />} /> 
                </Route> 
              </Route> 
              <Route element={<ProtectedRoute roles={["ADMIN_BVG"]} />}> 
                <Route element={<Layout />}> 
                  <Route path="/votaciones/:id/assistants" element={<ManageAssistants />} />
                  <Route path="/votaciones/:id/audit" element={<AuditLogs />} />
                  <Route path="/users" element={<ManageUsers />} />
                  <Route path="/votaciones/:id/users" element={<ManageElectionUsers />} />
                </Route>
              </Route>
              <Route element={<ProtectedRoute roles={["ADMIN_BVG", "FUNCIONAL_BVG"]} />}>
                <Route element={<Layout />}>
                  <Route path="/votaciones/:id/dashboard" element={<Dashboard />} />
                </Route>
              </Route>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;

