import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import BrowseBooks from './pages/BrowseBooks';
import BookDetails from './pages/BookDetails';
import AddListing from './pages/AddListing';
import UserDashboard from './pages/UserDashboard';
import Profile from './pages/Profile';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { LoadingState } from './components/LoadingState';

// Protected Route Wrapper for Authenticated Users
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <LoadingState message="Verifying session..." />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their default dashboard if unauthorized
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'staff') return <Navigate to="/staff" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppContent = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />
      <main className="flex-1 w-full">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><Login /></div>} />
          <Route path="/register" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><Register /></div>} />
          <Route path="/browse" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><BrowseBooks /></div>} />
          <Route path="/listings/:id" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><BookDetails /></div>} />

          {/* Reader Protected Routes */}
          <Route
            path="/add-listing"
            element={
              <ProtectedRoute allowedRoles={['customer', 'staff', 'admin']}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><AddListing /></div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer', 'staff', 'admin']}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><UserDashboard /></div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['customer', 'staff', 'admin']}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><Profile /></div>
              </ProtectedRoute>
            }
          />

          {/* Staff Moderation Route */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['staff', 'admin']}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><StaffDashboard /></div>
              </ProtectedRoute>
            }
          />

          {/* Admin Control Console Route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><AdminDashboard /></div>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 BookSwap Platform. ITS122P Web Systems Project Group 3.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-800 transition-colors">Peer-to-Peer Exchange</span>
            <span>•</span>
            <span className="hover:text-slate-800 transition-colors">Supervised Handovers</span>
            <span>•</span>
            <span className="hover:text-slate-800 transition-colors">Community Moderated</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
