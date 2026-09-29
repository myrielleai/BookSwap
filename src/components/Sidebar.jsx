import React from 'react';
import {
  BookOpen,
  ArrowRightLeft,
  Clock,
  Bookmark,
  Bell,
  User,
  ShieldCheck,
  CheckCircle,
  FileText,
  BarChart3,
  List,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

const Sidebar = ({ role = 'customer', activeTab, onTabChange, unreadNotifications = 0 }) => {
  const customerTabs = [
    { id: 'listings', label: 'My Listings', icon: BookOpen },
    { id: 'sent_requests', label: 'Sent Requests', icon: ArrowRightLeft },
    { id: 'received_requests', label: 'Received Requests', icon: Clock },
    { id: 'transactions', label: 'Active Exchanges', icon: CheckCircle },
    { id: 'watchlist', label: 'My Watchlist', icon: Bookmark },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotifications > 0 ? unreadNotifications : null,
    },
    { id: 'profile', label: 'Profile Settings', icon: User },
  ];

  const staffTabs = [
    { id: 'verifications', label: 'Listing Verifications', icon: CheckCircle },
    { id: 'requests', label: 'Request Monitoring', icon: Clock },
    { id: 'handovers', label: 'Handover Scheduling', icon: Calendar },
    { id: 'transactions', label: 'Transactions Queue', icon: ArrowRightLeft },
    { id: 'reports', label: 'Disputes & Reports', icon: AlertTriangle },
  ];

  const adminTabs = [
    { id: 'users', label: 'User Governance', icon: User },
    { id: 'taxonomies', label: 'Categories & Rubrics', icon: List },
    { id: 'slots', label: 'Handover Venues & Slots', icon: Calendar },
    { id: 'reports', label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'audit', label: 'System Audit Log', icon: FileText },
  ];

  const tabs =
    role === 'admin' ? adminTabs : role === 'staff' ? staffTabs : customerTabs;

  return (
    <aside className="w-full lg:w-64 bg-white border border-stone-200/90 rounded-2xl p-4 shadow-sm shrink-0">
      <div className="mb-4 px-3 py-2 bg-stone-50 border border-stone-200/60 rounded-xl">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
          {role === 'admin'
            ? 'Administrator'
            : role === 'staff'
            ? 'Exchange Moderator'
            : 'Reader Portal'}
        </p>
        <p className="text-sm font-bold text-stone-800">Control Panel</p>
      </div>

      <nav className="space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-800 text-amber-50 shadow-md'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-200' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
              </div>
              {tab.badge && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-rose-600 text-white animate-pulse'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
