import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import {
  BookOpen,
  PlusCircle,
  Search,
  Bell,
  User,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, isPending, logout, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      userService
        .getNotifications()
        .then((res) => {
          if (res.success && res.data) {
            const list = res.data.notifications || res.data || [];
            const unread = list.filter((n) => !n.is_read).length;
            setUnreadCount(unread);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-[#faf7f2]/95 backdrop-blur-md border-b border-stone-300/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-amber-50 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif font-bold text-xl text-stone-900 tracking-tight">
                Book<span className="text-emerald-800">Swap</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/browse"
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                isActive('/browse')
                  ? 'bg-emerald-900/10 text-emerald-900 border border-emerald-900/20'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Search className="w-4 h-4" />
              Browse Catalog
            </Link>

            {isAuthenticated && (
              <Link
                to="/add-listing"
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive('/add-listing')
                    ? 'bg-emerald-900/10 text-emerald-900 border border-emerald-900/20'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-800" />
                List a Book
              </Link>
            )}
          </nav>

          {/* User Controls & CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* Dashboard Shortcut Link */}
                <Link
                  to={
                    isAdmin
                      ? '/admin'
                      : isStaff
                      ? '/staff'
                      : '/dashboard'
                  }
                  className="px-3 py-1.5 bg-stone-200/70 hover:bg-stone-300/70 text-stone-800 font-semibold text-xs rounded-lg border border-stone-300/60 transition-colors flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-stone-600" />
                  <span>
                    {isAdmin ? 'Admin Dashboard' : isStaff ? 'Staff Moderation' : 'My Dashboard'}
                  </span>
                </Link>

                {/* Notifications Link */}
                <Link
                  to="/dashboard?tab=notifications"
                  className="relative p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-lg transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-stone-200/60 transition-colors border border-stone-300/70 bg-white"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-800 text-amber-50 font-bold text-xs flex items-center justify-center shadow-sm">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="text-left hidden lg:block">
                      <p className="text-xs font-semibold text-stone-800 leading-tight">
                        {user.name}
                      </p>
                      <p className="text-[10px] font-medium text-stone-500 capitalize">
                        {user.role}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  </button>

                  {userDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-stone-100">
                        <p className="text-xs font-bold text-stone-800">{user.name}</p>
                        <p className="text-xs text-stone-500 truncate">{user.email}</p>
                      </div>

                      <Link
                        to="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      >
                        <User className="w-4 h-4 text-stone-400" />
                        Profile Settings
                      </Link>

                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      >
                        <LayoutDashboard className="w-4 h-4 text-stone-400" />
                        Reader Dashboard
                      </Link>

                      {isStaff && (
                        <Link
                          to="/staff"
                          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                        >
                          <ShieldCheck className="w-4 h-4 text-indigo-500" />
                          Staff Moderation
                        </Link>
                      )}

                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-500" />
                          Admin Console
                        </Link>
                      )}

                      <div className="border-t border-stone-100 my-1"></div>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 text-left"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : isPending ? (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-amber-100 text-amber-800 font-medium px-2.5 py-1 rounded-lg border border-amber-200">
                  Account Pending Approval
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-stone-500 hover:text-stone-800 underline"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-stone-700 hover:text-stone-900 font-medium text-sm transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-amber-50 font-medium text-sm rounded-lg shadow-md transition-all hover:scale-[1.02]"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg text-stone-600 hover:bg-stone-200/50"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-[#faf7f2] px-4 pt-2 pb-6 space-y-3">
          <Link
            to="/browse"
            onClick={() => setMenuOpen(false)}
            className="block py-2 text-sm font-medium text-stone-700 hover:text-emerald-800"
          >
            Browse Books
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/add-listing"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-sm font-medium text-stone-700 hover:text-emerald-800"
              >
                List a Book
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-sm font-medium text-stone-700 hover:text-emerald-800"
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-sm font-medium text-stone-700 hover:text-emerald-800"
              >
                Profile Settings
              </Link>

              {isStaff && (
                <Link
                  to="/staff"
                  onClick={() => setMenuOpen(false)}
                  className="block py-2 text-sm font-medium text-indigo-700"
                >
                  Staff Moderation
                </Link>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="block py-2 text-sm font-medium text-purple-700"
                >
                  Admin Console
                </Link>
              )}

              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left py-2 text-sm font-medium text-rose-600"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="pt-2 border-t border-stone-200 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="w-full text-center py-2 text-stone-700 font-medium text-sm border border-stone-300 rounded-lg bg-white"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="w-full text-center py-2 bg-emerald-800 text-amber-50 font-medium text-sm rounded-lg"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
