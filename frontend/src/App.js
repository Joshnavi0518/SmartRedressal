import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import LoginHome from './pages/LoginHome';
import Login from './pages/Login';
import CitizenLogin from './pages/CitizenLogin';
import OfficerLogin from './pages/OfficerLogin';
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import CitizenDashboard from './pages/CitizenDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/login" element={<LoginHome />} />
            <Route path="/citizen-login" element={<CitizenLogin />} />
            <Route path="/officer-login" element={<OfficerLogin />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/citizen"
              element={
                <PrivateRoute>
                  <CitizenDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/officer"
              element={
                <PrivateRoute allowedRoles={['Officer', 'Admin']}>
                  <OfficerDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <PrivateRoute allowedRoles={['Admin']}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/old-login" element={<Login />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
