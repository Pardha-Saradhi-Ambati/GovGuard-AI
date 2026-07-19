import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Records from './pages/Records';
import Alerts from './pages/Alerts';
import Investigations from './pages/Investigations';
import InvestigationDetails from './pages/InvestigationDetails';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes (Wrapper Layout) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard (Index Page) */}
            <Route index element={<Dashboard />} />

            {/* Financial Records Catalogue */}
            <Route path="records" element={<Records />} />

            {/* Fraud Alerts Queue */}
            <Route path="alerts" element={<Alerts />} />

            {/* Case Investigations List */}
            <Route path="investigations" element={<Investigations />} />

            {/* Investigation Details Workbench */}
            <Route path="investigations/:id" element={<InvestigationDetails />} />

            {/* Performance Analytics */}
            <Route path="analytics" element={<Analytics />} />

            {/* Platform Settings */}
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
