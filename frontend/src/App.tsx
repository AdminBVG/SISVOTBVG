import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import UploadShareholders from './pages/UploadShareholders';
import RegisterAttendance from './pages/RegisterAttendance';
import Proxies from './pages/Proxies';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <nav className="bg-gray-800 text-white p-4">
          <ul className="flex space-x-4">
            <li><Link to="/upload" className="hover:underline">Upload</Link></li>
            <li><Link to="/attendance" className="hover:underline">Attendance</Link></li>
            <li><Link to="/proxies" className="hover:underline">Proxies</Link></li>
            <li><Link to="/dashboard" className="hover:underline">Dashboard</Link></li>
            <li className="ml-auto"><Link to="/login" className="hover:underline">Login</Link></li>
          </ul>
        </nav>
        <main className="flex-1 p-4">
          <Routes>
            <Route path="/" element={<h1 className="text-2xl font-semibold">Sistema de Asistentes BVG</h1>} />
            <Route path="/upload" element={<UploadShareholders />} />
            <Route path="/attendance" element={<RegisterAttendance />} />
            <Route path="/proxies" element={<Proxies />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
