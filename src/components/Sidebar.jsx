import React from 'react';
import {
  LayoutDashboard, BookOpen, ArrowRightLeft, Clock, Bookmark, Bell,
  User, CheckCircle, FileText, BarChart3, List, AlertTriangle, Calendar,
  ShieldCheck, Sparkles, BookMarked
} from 'lucide-react';

const Sidebar = ({ role = 'customer', activeTab = 'overview', onTabChange, unreadNotifications = 0 }) => {
  const customerTabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'listings', label: 'My Listings', icon: BookOpen },
    { id: 'sent_requests', label: 'Sent Requests', icon: ArrowRightLeft },
    { id: 'received_requests', label: 'Received Requests', icon: Clock },
    { id: 'transactions', label: 'Active Exchanges', icon: CheckCircle },
    { id: 'watchlist', label: 'My Watchlist', icon: Bookmark },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications > 0 ? unreadNotifications : null },
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

  const tabs = role === 'admin' ? adminTabs : role === 'staff' ? staffTabs : customerTabs;
  const roleLabel = role === 'admin' ? 'Administrator' : role === 'staff' ? 'Staff Moderator' : 'Reader Portal';

  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      flexShrink: 0,
      background: '#FAF7F2',
      borderRadius: '28px',
      border: '1px solid #EBE4D8',
      padding: '24px 14px',
      boxShadow: '0 8px 30px rgba(90, 75, 60, 0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      position: 'relative',
    }}>
      {/* Brand Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '6px 10px 14px 10px',
        borderBottom: '1px solid #ECE5D9',
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '14px',
          background: '#DEEAE2',
          border: '1px solid #C9DFD2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2D523E',
          boxShadow: '0 2px 8px rgba(45, 82, 62, 0.08)',
        }}>
          <BookMarked style={{ width: '20px', height: '20px' }} />
        </div>
        <div>
          <div style={{
            fontSize: '15px',
            fontWeight: 800,
            color: '#282420',
            fontFamily: "'Playfair Display', Georgia, serif",
            lineHeight: 1.1,
          }}>
            BookSwap
          </div>
          <div style={{
            fontSize: '10.5px',
            fontWeight: 700,
            color: '#765B47',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginTop: '2px',
          }}>
            {roleLabel}
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '16px',
                border: isActive ? '1px solid #C8DDD0' : '1px solid transparent',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                transition: 'all 0.18s ease',
                background: isActive ? '#DEEAE2' : 'transparent',
                color: isActive ? '#244533' : '#6A6359',
                transform: isActive ? 'translateX(2px)' : 'translateX(0)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#F2ECE2';
                  e.currentTarget.style.color = '#26221E';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6A6359';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isActive ? '#FFFFFF' : 'transparent',
                  color: isActive ? '#2D523E' : '#888075',
                  boxShadow: isActive ? '0 2px 6px rgba(45, 82, 62, 0.1)' : 'none',
                  transition: 'all 0.18s',
                }}>
                  <Icon style={{ width: '15px', height: '15px' }} />
                </div>
                <span>{tab.label}</span>
              </div>

              {tab.badge ? (
                <span style={{
                  padding: '2px 8px',
                  fontSize: '10px',
                  fontWeight: 800,
                  borderRadius: '99px',
                  background: '#C47953',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 6px rgba(196, 121, 83, 0.25)',
                }}>
                  {tab.badge}
                </span>
              ) : isActive ? (
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#3A634E',
                  marginRight: '4px',
                }} />
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Community Info Card (Warm Latte) */}
      <div style={{
        padding: '14px',
        borderRadius: '18px',
        background: '#F3EAE0',
        border: '1px solid #E6D8CA',
        marginTop: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#765B47',
          }}>
            <ShieldCheck style={{ width: '13px', height: '13px' }} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#634735', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Safe Exchange
          </span>
        </div>
        <p style={{ fontSize: '11.5px', color: '#6A5648', lineHeight: 1.45, margin: 0 }}>
          Meetups occur at official designated campus & library hubs.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
