import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <LoadingState message="Verifying session..." />;

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
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
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div className={`min-h-screen flex flex-col text-slate-800 ${isLandingPage ? 'bg-[#fdfbf7]' : 'skin'}`}>
      {!isLandingPage && <Navbar />}
      <main className="flex-1 w-full">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="/browse" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><BrowseBooks /></div>} />
          <Route path="/listings/:id" element={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><BookDetails /></div>} />

          {/* Reader Protected Routes */}
          <Route
            path="/add-listing"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"><AddListing /></div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
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
      <footer className="leather-tan relative py-8 text-xs mt-auto">
        <div className="absolute left-0 right-0 top-[5px] seam" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 text-center md:text-left deboss font-semibold">
          <p>© 2026 BookSwap Platform. ITS122P Web Systems Project Group 3.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 md:gap-4">
            <span>Peer-to-Peer Exchange</span>
            <span className="text-moss-700">•</span>
            <span>Supervised Handovers</span>
            <span className="text-moss-700">•</span>
            <span>Community Moderated</span>
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
