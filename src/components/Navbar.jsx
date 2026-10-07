import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import BrandLogo from './BrandLogo';
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
  Crown,
} from 'lucide-react';

// Each role gets its own avatar colour, badge icon, and label, so it is clear at a
// glance which kind of account is signed in (handy when switching roles in a demo).
const ROLE_STYLES = {
  admin: {
    label: 'Administrator',
    Icon: Crown,
    avatar: 'bg-purple-700 text-white ring-purple-300',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  staff: {
    label: 'Exchange Moderator',
    Icon: ShieldCheck,
    avatar: 'bg-indigo-600 text-white ring-indigo-300',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  customer: {
    label: 'Reader',
    Icon: BookOpen,
    avatar: 'bg-emerald-700 text-white ring-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
};

const roleStyle = (role) => ROLE_STYLES[role] || ROLE_STYLES.customer;

// "Ana Santos" → "AS"; "System Administrator" → "SA"
const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';

const RoleAvatar = ({ user, size = 'w-8 h-8 text-xs' }) => {
  const style = roleStyle(user.role);
  return (
    <div className={`relative ${size} rounded-full ring-2 ${style.avatar} flex items-center justify-center font-bold shrink-0`} aria-hidden="true">
      {initials(user.name)}
      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow">
        <style.Icon className="w-2.5 h-2.5 text-stone-700" />
      </span>
    </div>
  );
};

const RoleBadge = ({ role }) => {
  const style = roleStyle(role);
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${style.badge}`}>
      <style.Icon className="w-3 h-3" />
      {style.label}
    </span>
  );
};

const Navbar = () => {
  const { user, isAuthenticated, isPending, logout, isAdmin, isStaff, isCustomer } = useAuth();
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
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 leather-tan shadow-[0_2px_6px_rgba(70,40,15,0.35)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <BrandLogo withTile className="w-11 h-11 drop-shadow-md group-hover:scale-105 transition-transform" />
            <div>
              <span className="font-display font-extrabold text-xl deboss tracking-tight">
                Book<span className="text-moss-700">Swap</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/browse"
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                isActive('/browse')
                  ? 'btn-pillow'
                  : 'deboss hover:bg-white/30'
              }`}
            >
              <Search className="w-4 h-4" />
              Browse Catalog
            </Link>

            {isCustomer && (
              <Link
                to="/add-listing"
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  isActive('/add-listing')
                    ? 'btn-pillow'
                    : 'deboss hover:bg-white/30'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-moss-700" />
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
                  className="btn-pillow px-3 py-1.5 font-semibold text-xs rounded-lg flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-moss-700" />
                  <span>
                    {isAdmin ? 'Admin Dashboard' : isStaff ? 'Staff Moderation' : 'My Dashboard'}
                  </span>
                </Link>

                {/* Notifications Link — customers only (staff/admin have no notifications tab in their dashboards) */}
                {isCustomer && (
                <Link
                  to="/dashboard?tab=notifications"
                  className="relative p-2 deboss hover:bg-white/30 rounded-lg transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                )}

                {/* Profile Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="btn-pillow flex items-center gap-2 p-1.5 rounded-xl"
                  >
                    <RoleAvatar user={user} />
                    <div className="text-left hidden lg:block">
                      <p className="text-xs font-semibold text-stone-800 leading-tight">
                        {user.name}
                      </p>
                      <RoleBadge role={user.role} />
                    </div>
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  </button>

                  {userDropdownOpen && (
                    <div
                      className="paper absolute right-0 mt-2 w-56 rounded-lg shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-dashed border-leather-200 flex items-center gap-3">
                        <RoleAvatar user={user} size="w-10 h-10 text-sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-stone-800 truncate">{user.name}</p>
                          <p className="text-xs text-stone-500 truncate">{user.email}</p>
                          <div className="mt-1"><RoleBadge role={user.role} /></div>
                        </div>
                      </div>

                      <Link
                        to="/profile"
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-leather-50"
                      >
                        <User className="w-4 h-4 text-stone-400" />
                        Profile Settings
                      </Link>

                      {isCustomer && (
                      <Link
                        to="/dashboard"
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-leather-50"
                      >
                        <LayoutDashboard className="w-4 h-4 text-stone-400" />
                        Reader Dashboard
                      </Link>
                      )}

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

                      <div className="border-t border-dashed border-leather-200 my-1"></div>

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
                  className="btn-pillow px-4 py-2 font-semibold text-sm rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-leather px-4 py-2 font-semibold text-sm rounded-lg"
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
              className="btn-pillow p-2 rounded-lg"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden paper border-t-0 px-4 pt-2 pb-6 space-y-3">
          <Link
            to="/browse"
            onClick={() => setMenuOpen(false)}
            className="block py-2 text-sm font-medium text-stone-700 hover:text-moss-700"
          >
            Browse Books
          </Link>
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-3 py-2 border-b border-dashed border-leather-200">
                <RoleAvatar user={user} size="w-10 h-10 text-sm" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-stone-800 truncate">{user.name}</p>
                  <p className="text-xs text-stone-500 truncate">{user.email}</p>
                  <div className="mt-1"><RoleBadge role={user.role} /></div>
                </div>
              </div>
              {isCustomer && (
              <Link
                to="/add-listing"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-sm font-medium text-stone-700 hover:text-moss-700"
              >
                List a Book
              </Link>
              )}
              {isCustomer && (
              <Link
                to="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-sm font-medium text-stone-700 hover:text-moss-700"
              >
                My Dashboard
              </Link>
              )}
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-sm font-medium text-stone-700 hover:text-moss-700"
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
                className="btn-pillow w-full text-center py-2 font-semibold text-sm rounded-lg"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="btn-leather w-full text-center py-2 font-semibold text-sm rounded-lg"
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
