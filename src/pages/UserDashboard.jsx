import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService, listingService, exchangeService, transactionService } from '../services/api';
import Sidebar from '../components/Sidebar';
import BookCard from '../components/BookCard';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Dropdown from '../components/Dropdown';
import { LoadingState } from '../components/LoadingState';
import {
  BookOpen, ArrowRightLeft, Clock, CheckCircle, Bell, Trash2, Check, X,
  AlertTriangle, MapPin, Calendar, Bookmark, Star, Search, ArrowUpRight,
  ChevronRight, ChevronLeft, Plus, Sparkles, BookMarked, ShieldCheck,
  TrendingUp, Award, Layers, Eye
} from 'lucide-react';

// ── Harmonious Palette: Warm Beige, Soft Sage Green, Light Coffee Brown ──────
const T = {
  // Canvas & Backgrounds
  pageBg:     '#F5F2EB', // warm organic sand/cream
  canvasBg:   '#FFFFFF', // clean light card canvas
  cardBeige:  '#FAF7F2', // soft linen
  borderWarm: '#EAE3D7', // warm delicate border

  // Sage / Light Green (Soft & Soothing, NOT super deep)
  sageBg:     '#DEEAE2', // soft pastel sage card
  sageTint:   '#EBF2EC', // very pale sage pill
  sageBorder: '#C6DDD0', // sage border
  sageText:   '#284C38', // rich readable sage text
  sageAccent: '#3D684F', // primary sage button / highlight
  sageHover:  '#315440', // button hover

  // Light Coffee / Warm Latte
  coffeeBg:     '#F3E9DF', // warm light latte card
  coffeeTint:   '#F8F3EC', // very pale coffee
  coffeeBorder: '#E5D6C7', // soft warm border
  coffeeText:   '#5E4434', // warm coffee text
  coffeeAccent: '#7D5C47', // accent coffee
  coffeeBadge:  '#EAE0D4', // subtle pill

  // Butter / Honey Tint
  honeyBg:    '#FAF1E4', // soft warm buttercup
  honeyBorder:'#EFE0CB',
  honeyText:  '#7A5826',

  // Typography
  textDark:   '#24211D', // warm dark espresso (not pure black)
  textMid:    '#5C554C', // warm body text
  textMuted:  '#8E8579', // subtle captions

  // Status & Danger
  danger:     '#B55938', // warm terracotta (not harsh neon red)
  dangerBg:   '#FAEDE8',
  dangerBorder:'#F0D0C5',
};

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  const [welcomeName, setWelcomeName] = useState('Ana');
  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal for declining requests
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [declineReason, setDeclineReason] = useState('prefer_different_book');
  const [declineNote, setDeclineNote] = useState('');
  const [declineError, setDeclineError] = useState(null);

  // Calendar tracker state
  const [selectedDay, setSelectedDay] = useState(16);

  useEffect(() => {
    if (user?.first_name) {
      setWelcomeName(user.first_name);
    } else if (user?.name) {
      setWelcomeName(user.name.split(' ')[0]);
    } else {
      const stored = sessionStorage.getItem('bs_just_logged_in');
      if (stored) setWelcomeName(stored);
    }
  }, [user]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, notifRes, watchRes] = await Promise.all([
        userService.getDashboard().catch(() => ({ success: false })),
        userService.getNotifications().catch(() => ({ data: [] })),
        listingService.getWatchlist().catch(() => ({ data: [] })),
      ]);
      if (dashRes && dashRes.success) setDashboardData(dashRes.data);
      if (notifRes && notifRes.success) setNotifications(notifRes.data?.notifications || notifRes.data || []);
      if (watchRes && watchRes.success) setWatchlist(watchRes.data?.watchlist || watchRes.data || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const handleWithdrawListing = async (id) => {
    if (!window.confirm('Withdraw this book listing?')) return;
    try {
      await listingService.withdrawListing(id);
      fetchDashboard();
    } catch (e) {
      alert(e.message || 'Failed to withdraw listing');
    }
  };

  const handleWithdrawRequest = async (id) => {
    try {
      await exchangeService.withdrawRequest(id);
      fetchDashboard();
    } catch (e) {
      alert(e.message || 'Failed to withdraw request');
    }
  };

  const handleAcceptRequest = async (id) => {
    try {
      const r = await exchangeService.acceptRequest(id);
      if (r.success) {
        alert('Exchange request accepted! Ready to schedule handover.');
        fetchDashboard();
      }
    } catch (e) {
      alert(e.message || 'Failed to accept request');
    }
  };

  const handleDeclineRequestSubmit = async (e) => {
    e.preventDefault();
    setDeclineError(null);
    try {
      await exchangeService.declineRequest(selectedRequestId, declineReason, (declineNote || '').trim());
      setDeclineModalOpen(false);
      setDeclineNote('');
      fetchDashboard();
    } catch (err) {
      const m = err.errors ? Object.values(err.errors).join(' ') : null;
      setDeclineError(m || err.message || 'Failed to decline proposal.');
    }
  };

  const handleConfirmReceipt = async (id) => {
    try {
      const r = await transactionService.confirmReceipt(id);
      if (r.success) {
        alert('Book receipt confirmed! Thank you for completing this swap.');
        fetchDashboard();
      }
    } catch (e) {
      alert(e.message || 'Failed to confirm receipt');
    }
  };

  const handleMarkNotificationRead = async (id) => {
    await userService.markNotificationRead(id).catch(() => {});
    fetchDashboard();
  };

  if (loading) return <LoadingState message="Curating your reading dashboard..." />;

  // Data bindings with fallbacks for preview mode
  const myListings = dashboardData?.listings || dashboardData?.recent_listings || [
    { id: 1, title: 'The Alchemist', author: 'Paulo Coelho', genre: 'Fiction', condition: 'Good', status: 'available', city: 'Manila' },
    { id: 2, title: 'Atomic Habits', author: 'James Clear', genre: 'Self-Help', condition: 'Like New', status: 'available', city: 'Manila' },
    { id: 5, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', genre: 'Classic', condition: 'Like New', status: 'available', city: 'Manila' },
  ];

  const sentRequests = dashboardData?.sent_requests || [
    { id: 101, target_title: 'Sapiens: A Brief History', offered_title: 'The Alchemist', status: 'pending', created_at: '2026-10-02T10:00:00Z' }
  ];

  const receivedRequests = dashboardData?.received_requests || dashboardData?.incoming_requests || [
    { id: 201, requester_name: 'Elena Rostova', target_title: 'Atomic Habits', offered_title: 'Dune (Deluxe Ed.)', message: 'Hello! I have been looking for Atomic Habits. Would love to trade!', status: 'pending', created_at: '2026-10-04T14:30:00Z' }
  ];

  const transactions = dashboardData?.transactions || dashboardData?.recent_exchanges || [
    {
      id: 301,
      target_title: 'The Midnight Library',
      offered_title: 'Klara and the Sun',
      owner_name: 'Marco Valdes',
      requester_name: 'Ana Reader',
      status: 'accepted',
      created_at: '2026-10-03T11:00:00Z',
      slot_date: 'Oct 18, 2026',
      start_time: '2:00 PM',
      end_time: '3:00 PM',
      location_name: 'SM Mall of Asia Central Hub',
      location_address: 'Seaside Blvd, Pasay, Metro Manila',
      requester_confirmed: false,
      owner_confirmed: true,
    }
  ];

  const stats = dashboardData?.stats || {
    total_listings: myListings.length,
    active_listings: myListings.filter(l => l.status === 'available').length,
    pending_exchanges: 1,
    completed_exchanges: 12,
    watchlist_count: 5,
    unread_notifications: 2,
  };

  const unreadCount = notifications.filter(n => !n.is_read).length || stats.unread_notifications || 2;

  // Calendar days setup
  const calendarDays = [
    { day: 'MON', num: 12, hasEvent: false },
    { day: 'TUE', num: 13, hasEvent: false },
    { day: 'WED', num: 14, hasEvent: true },
    { day: 'THU', num: 15, hasEvent: false },
    { day: 'FRI', num: 16, hasEvent: true },
    { day: 'SAT', num: 17, hasEvent: false },
    { day: 'SUN', num: 18, hasEvent: true, isHighlight: true },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: T.pageBg,
      padding: '24px 16px 60px',
      position: 'relative',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      {/* Delicate background organic SVG curves matching Dribbble inspiration */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '480px',
          pointerEvents: 'none',
          opacity: 0.35,
          zIndex: 0,
        }}
        viewBox="0 0 1440 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M-50 160C240 80 480 240 760 180C1040 120 1220 280 1500 210"
          stroke="#C8D8CE"
          strokeWidth="1.8"
          strokeDasharray="4 6"
        />
        <path
          d="M-80 320C180 240 520 380 820 310C1120 240 1340 370 1520 330"
          stroke="#DFD4C5"
          strokeWidth="1.5"
        />
      </svg>

      {/* Main Floating Dashboard Canvas Container */}
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        background: T.canvasBg,
        borderRadius: '36px',
        border: `1px solid ${T.borderWarm}`,
        boxShadow: '0 20px 60px rgba(85, 70, 55, 0.05), 0 2px 10px rgba(0,0,0,0.02)',
        padding: '28px',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Outer Layout: Docked Left Sidebar + Right Main Experience */}
        <div style={{ display: 'flex', gap: '26px', alignItems: 'stretch' }}>

          {/* Left Docked Sidebar */}
          <Sidebar
            role="customer"
            activeTab={currentTab}
            onTabChange={handleTabChange}
            unreadNotifications={unreadCount}
          />

          {/* Right Main Body */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Top Navigation Header: Welcome + Search Pill + Profile */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '18px',
              flexWrap: 'wrap',
              paddingBottom: '4px',
            }}>
              <div>
                <h1 style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: T.textDark,
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  letterSpacing: '-0.02em',
                }}>
                  Welcome back <span style={{ display: 'inline-block', transform: 'rotate(5deg)' }}>👋</span>
                </h1>
                <p style={{
                  fontSize: '13px',
                  color: T.textMuted,
                  margin: '4px 0 0 0',
                }}>
                  Explore verified book swaps and manage your community shelf.
                </p>
              </div>

              {/* Pill Search & Profile Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#F9F7F2',
                  border: `1px solid ${T.borderWarm}`,
                  borderRadius: '999px',
                  padding: '9px 18px',
                  width: '270px',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
                }}>
                  <Search style={{ width: '15px', height: '15px', color: T.textMuted }} />
                  <input
                    type="text"
                    placeholder="Search books, authors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: '12.5px',
                      color: T.textDark,
                      width: '100%',
                    }}
                  />
                </div>

                {/* Profile Pill with Verified Badge */}
                <div
                  onClick={() => handleTabChange('profile')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 14px 6px 8px',
                    borderRadius: '999px',
                    background: '#FAF7F2',
                    border: `1px solid ${T.borderWarm}`,
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = T.sageBorder}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = T.borderWarm}
                >
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: '#DEEAE2',
                    color: T.sageText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: '1.5px solid #FFFFFF',
                    boxShadow: '0 2px 6px rgba(40, 76, 56, 0.12)',
                  }}>
                    {welcomeName.charAt(0)}
                  </div>
                  <div style={{ lineHeight: 1.15 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: T.textDark }}>
                      {welcomeName}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: T.sageAccent }}>
                      Verified Reader
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* TAB CONTENT: 1. OVERVIEW (The Exact Dribbble Inspiration Layout) */}
            {currentTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.9fr 1fr', gap: '24px', alignItems: 'start' }}>

                {/* Left/Center Bento Area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

                  {/* Section: Your activities today */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{
                          fontSize: '18px',
                          fontWeight: 800,
                          color: T.textDark,
                          margin: 0,
                          fontFamily: "'Playfair Display', Georgia, serif",
                        }}>
                          Your activities today
                        </h2>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: T.textMuted,
                          background: '#F2ECE2',
                          padding: '2px 8px',
                          borderRadius: '999px',
                        }}>
                          (5)
                        </span>
                      </div>
                    </div>

                    {/* Two Large Feature Cards (Soft Sage & Soft Light Coffee) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                      {/* Card 1: Soft Pastel Sage Card */}
                      <div style={{
                        background: T.sageBg,
                        borderRadius: '26px',
                        padding: '22px',
                        border: `1px solid ${T.sageBorder}`,
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '175px',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}>
                        {/* Top Row: Pill Badge */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                          <span style={{
                            background: '#FFFFFF',
                            color: T.sageText,
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '999px',
                            boxShadow: '0 2px 6px rgba(40, 76, 56, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <Star style={{ width: '11px', height: '11px', fill: '#F59E0B', color: '#F59E0B' }} />
                            4.9
                          </span>
                        </div>

                        {/* Middle Avatars & Title */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '-6px', marginBottom: '12px' }}>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#3D684F', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: '2px solid #FFFFFF' }}>M</div>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#7D5C47', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: '2px solid #FFFFFF', marginLeft: '-8px' }}>E</div>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#C47953', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: '2px solid #FFFFFF', marginLeft: '-8px' }}>R</div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: T.sageText, marginLeft: '6px' }}>+4</span>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'space-between',
                          }}>
                            <div>
                              <h3 style={{
                                fontSize: '17px',
                                fontWeight: 800,
                                color: T.sageText,
                                margin: '0 0 3px 0',
                                fontFamily: "'Playfair Display', Georgia, serif",
                              }}>
                                Active Book Swaps
                              </h3>
                              <p style={{ fontSize: '11.5px', color: '#4D6B58', margin: 0 }}>
                                1 meetup scheduled · 1 offer pending
                              </p>
                            </div>

                            {/* White Circular Button with Diagonal Arrow ↗ */}
                            <button
                              onClick={() => handleTabChange('transactions')}
                              title="View Active Swaps"
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                background: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: T.sageText,
                                boxShadow: '0 4px 12px rgba(40, 76, 56, 0.15)',
                                transition: 'transform 0.18s, background 0.18s',
                                flexShrink: 0,
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                              <ArrowUpRight style={{ width: '18px', height: '18px' }} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Soft Light Coffee / Warm Latte Card */}
                      <div style={{
                        background: T.coffeeBg,
                        borderRadius: '26px',
                        padding: '22px',
                        border: `1px solid ${T.coffeeBorder}`,
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '175px',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}>
                        {/* Top Row: Pill Badge */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                          <span style={{
                            background: '#FFFFFF',
                            color: T.coffeeText,
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '4px 10px',
                            borderRadius: '999px',
                            boxShadow: '0 2px 6px rgba(94, 68, 52, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <Star style={{ width: '11px', height: '11px', fill: '#F59E0B', color: '#F59E0B' }} />
                            4.8
                          </span>
                        </div>

                        {/* Middle Avatars & Title */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '-6px', marginBottom: '12px' }}>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#7D5C47', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: '2px solid #FFFFFF' }}>K</div>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#3D684F', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: '2px solid #FFFFFF', marginLeft: '-8px' }}>J</div>
                            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#9D6B53', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: '2px solid #FFFFFF', marginLeft: '-8px' }}>A</div>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: T.coffeeText, marginLeft: '6px' }}>+6</span>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'space-between',
                          }}>
                            <div>
                              <h3 style={{
                                fontSize: '17px',
                                fontWeight: 800,
                                color: T.coffeeText,
                                margin: '0 0 3px 0',
                                fontFamily: "'Playfair Display', Georgia, serif",
                              }}>
                                Community Catalog
                              </h3>
                              <p style={{ fontSize: '11.5px', color: '#7E6351', margin: 0 }}>
                                14 available matches in your city
                              </p>
                            </div>

                            {/* White Circular Button with Diagonal Arrow ↗ */}
                            <button
                              onClick={() => navigate('/browse')}
                              title="Browse Catalog"
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                background: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: T.coffeeText,
                                boxShadow: '0 4px 12px rgba(94, 68, 52, 0.15)',
                                transition: 'transform 0.18s, background 0.18s',
                                flexShrink: 0,
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                              <ArrowUpRight style={{ width: '18px', height: '18px' }} />
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Section: Learning / Swap progress (3 Pill Cards) */}
                  <div>
                    <h2 style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: T.textDark,
                      margin: '0 0 14px 0',
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}>
                      Swap & shelf pulse
                    </h2>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>

                      {/* Stat Pill 1: Completed Swaps (Sage Tint) */}
                      <div
                        onClick={() => handleTabChange('transactions')}
                        style={{
                          background: T.sageTint,
                          borderRadius: '22px',
                          padding: '16px 18px',
                          border: `1px solid ${T.sageBorder}`,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '100px',
                        }}
                      >
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: T.sageText }}>
                          Completed Swaps
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                          <span style={{ fontSize: '28px', fontWeight: 800, color: T.sageText, lineHeight: 1 }}>
                            {stats.completed_exchanges || 12}
                          </span>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: T.sageText,
                            boxShadow: '0 2px 6px rgba(40, 76, 56, 0.1)',
                          }}>
                            <ArrowUpRight style={{ width: '14px', height: '14px' }} />
                          </div>
                        </div>
                      </div>

                      {/* Stat Pill 2: Community Trust Score (Soft Warm Buttercup) */}
                      <div
                        style={{
                          background: T.honeyBg,
                          borderRadius: '22px',
                          padding: '16px 18px',
                          border: `1px solid ${T.honeyBorder}`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '100px',
                        }}
                      >
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: T.honeyText }}>
                          Trust Score
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                          <span style={{ fontSize: '28px', fontWeight: 800, color: T.honeyText, lineHeight: 1 }}>
                            98%
                          </span>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: T.honeyText,
                            boxShadow: '0 2px 6px rgba(122, 88, 38, 0.1)',
                          }}>
                            <ArrowUpRight style={{ width: '14px', height: '14px' }} />
                          </div>
                        </div>
                      </div>

                      {/* Stat Pill 3: Active Listings (Light Coffee Tint) */}
                      <div
                        onClick={() => handleTabChange('listings')}
                        style={{
                          background: T.coffeeBg,
                          borderRadius: '22px',
                          padding: '16px 18px',
                          border: `1px solid ${T.coffeeBorder}`,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '100px',
                        }}
                      >
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: T.coffeeText }}>
                          Listed Books
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                          <span style={{ fontSize: '28px', fontWeight: 800, color: T.coffeeText, lineHeight: 1 }}>
                            {stats.total_listings || myListings.length}
                          </span>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: T.coffeeText,
                            boxShadow: '0 2px 6px rgba(94, 68, 52, 0.1)',
                          }}>
                            <ArrowUpRight style={{ width: '14px', height: '14px' }} />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Section: In-Progress Swap Feature Card (Matching Horizontal Progress in Inspiration) */}
                  <div style={{
                    background: '#FAF7F2',
                    borderRadius: '24px',
                    padding: '20px 22px',
                    border: `1px solid ${T.borderWarm}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: T.coffeeText,
                          background: '#EAE1D4',
                          padding: '3px 10px',
                          borderRadius: '999px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}>
                          ⇄ In-Progress Swap
                        </span>
                        <span style={{ fontSize: '12px', color: T.textMuted }}>
                          SM Mall of Asia Hub
                        </span>
                      </div>
                      <button
                        onClick={() => handleTabChange('transactions')}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          border: `1px solid ${T.borderWarm}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: T.textDark,
                        }}
                      >
                        <ArrowUpRight style={{ width: '15px', height: '15px' }} />
                      </button>
                    </div>

                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: T.textDark,
                      margin: '0 0 6px 0',
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}>
                      The Midnight Library ⇄ Klara and the Sun
                    </h4>
                    <p style={{ fontSize: '12px', color: T.textMuted, margin: '0 0 14px 0' }}>
                      Handover scheduled for this Sunday at 2:00 PM with reader Marco.
                    </p>

                    {/* Sleek Progress Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: T.sageText, marginBottom: '6px' }}>
                        <span>Stage 2 of 4: Handover Confirmed</span>
                        <span>50%</span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '7px',
                        borderRadius: '999px',
                        background: '#EAE3D6',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: '50%',
                          height: '100%',
                          borderRadius: '999px',
                          background: T.sageAccent,
                          transition: 'width 0.4s ease',
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Section: Your Book Listings Preview */}
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                    }}>
                      <h2 style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: T.textDark,
                        margin: 0,
                        fontFamily: "'Playfair Display', Georgia, serif",
                      }}>
                        Your books on the shelf
                      </h2>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => navigate('/add-listing')}
                          style={{
                            padding: '7px 14px',
                            borderRadius: '999px',
                            border: 'none',
                            background: T.sageAccent,
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 8px rgba(45, 82, 62, 0.15)',
                          }}
                        >
                          <Plus style={{ width: '13px', height: '13px' }} /> List a Book
                        </button>
                        <button
                          onClick={() => handleTabChange('listings')}
                          style={{
                            padding: '7px 14px',
                            borderRadius: '999px',
                            border: `1px solid ${T.borderWarm}`,
                            background: '#FAF7F2',
                            color: T.textDark,
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          View All ({myListings.length})
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                      {myListings.slice(0, 3).map((book) => (
                        <div
                          key={book.id}
                          style={{
                            background: '#FAF8F4',
                            borderRadius: '18px',
                            padding: '16px',
                            border: `1px solid ${T.borderWarm}`,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: '130px',
                            transition: 'transform 0.18s, border-color 0.18s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = T.sageBorder}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = T.borderWarm}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                color: T.sageText,
                                background: T.sageBg,
                                padding: '2px 8px',
                                borderRadius: '999px',
                              }}>
                                {book.genre || 'Book'}
                              </span>
                              <span style={{ fontSize: '11px', color: T.textMuted }}>
                                {book.condition}
                              </span>
                            </div>
                            <h5 style={{
                              fontSize: '14px',
                              fontWeight: 800,
                              color: T.textDark,
                              margin: '0 0 2px 0',
                              fontFamily: "'Playfair Display', Georgia, serif",
                            }}>
                              {book.title}
                            </h5>
                            <p style={{ fontSize: '11.5px', color: T.textMuted, margin: 0 }}>
                              by {book.author}
                            </p>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '12px',
                            paddingTop: '8px',
                            borderTop: '1px solid #ECE4D8',
                          }}>
                            <StatusBadge status={book.status || 'available'} />
                            <span style={{ fontSize: '11px', color: T.coffeeText, fontWeight: 600 }}>
                              {book.city || 'Metro Manila'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Right Column: Swap Schedule & Activity Tracker (Matching "Lesson schedule" in Inspiration) */}
                <div style={{
                  background: '#FAF7F2',
                  borderRadius: '28px',
                  padding: '24px 20px',
                  border: `1px solid ${T.borderWarm}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                }}>
                  {/* Panel Header */}
                  <div>
                    <h2 style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: T.textDark,
                      margin: '0 0 16px 0',
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}>
                      Swap schedule
                    </h2>

                    {/* Month Picker Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                      padding: '0 4px',
                    }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: T.textDark }}>
                        October 2026
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          border: `1px solid ${T.borderWarm}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: T.textDark,
                        }}>
                          <ChevronLeft style={{ width: '13px', height: '13px' }} />
                        </button>
                        <button style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          border: `1px solid ${T.borderWarm}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: T.textDark,
                        }}>
                          <ChevronRight style={{ width: '13px', height: '13px' }} />
                        </button>
                      </div>
                    </div>

                    {/* Week Days Strip matching the Inspiration Calendar */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '4px',
                      textAlign: 'center',
                      marginBottom: '10px',
                    }}>
                      {calendarDays.map((d) => (
                        <div key={d.day} style={{ fontSize: '9.5px', fontWeight: 800, color: T.textMuted }}>
                          {d.day}
                        </div>
                      ))}
                    </div>

                    {/* Date Numbers Row */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: '4px',
                      textAlign: 'center',
                    }}>
                      {calendarDays.map((d) => {
                        const isSelected = selectedDay === d.num;
                        return (
                          <div
                            key={d.num}
                            onClick={() => setSelectedDay(d.num)}
                            style={{
                              width: '32px',
                              height: '32px',
                              margin: '0 auto',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: isSelected ? 800 : 600,
                              cursor: 'pointer',
                              background: isSelected ? '#2A4B38' : d.isHighlight ? T.sageBg : 'transparent',
                              color: isSelected ? '#FFFFFF' : d.isHighlight ? T.sageText : T.textDark,
                              border: d.hasEvent && !isSelected ? `1.5px dashed ${T.sageAccent}` : 'none',
                              transition: 'all 0.15s',
                            }}
                          >
                            {d.num}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Horizontal Milestone / Activity Pills (Matching the Inspo List Items with Book Icons) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

                    {/* Item 1: Soft Sage Pill */}
                    <div style={{
                      background: '#EFF5F1',
                      borderRadius: '20px',
                      padding: '12px 14px',
                      border: `1px solid ${T.sageBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: T.sageText,
                        boxShadow: '0 2px 6px rgba(40, 76, 56, 0.1)',
                        flexShrink: 0,
                      }}>
                        <BookOpen style={{ width: '16px', height: '16px' }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h6 style={{
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: T.textDark,
                          margin: '0 0 2px 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          Meetup: SM Mall of Asia
                        </h6>
                        <p style={{ fontSize: '11px', color: T.textMuted, margin: 0 }}>
                          Sunday 2:00 PM · Marco V.
                        </p>
                      </div>
                    </div>

                    {/* Item 2: Soft Light Coffee Pill */}
                    <div style={{
                      background: '#F6EFE8',
                      borderRadius: '20px',
                      padding: '12px 14px',
                      border: `1px solid ${T.coffeeBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: T.coffeeText,
                        boxShadow: '0 2px 6px rgba(94, 68, 52, 0.1)',
                        flexShrink: 0,
                      }}>
                        <ArrowRightLeft style={{ width: '16px', height: '16px' }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h6 style={{
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: T.textDark,
                          margin: '0 0 2px 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          Proposal Accepted
                        </h6>
                        <p style={{ fontSize: '11px', color: T.textMuted, margin: 0 }}>
                          The Alchemist for 1984
                        </p>
                      </div>
                    </div>

                    {/* Item 3: Soft Buttercup Pill */}
                    <div style={{
                      background: '#FAF5EC',
                      borderRadius: '20px',
                      padding: '12px 14px',
                      border: `1px solid ${T.honeyBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: T.honeyText,
                        boxShadow: '0 2px 6px rgba(122, 88, 38, 0.1)',
                        flexShrink: 0,
                      }}>
                        <CheckCircle style={{ width: '16px', height: '16px' }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h6 style={{
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: T.textDark,
                          margin: '0 0 2px 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          Listing Verified
                        </h6>
                        <p style={{ fontSize: '11px', color: T.textMuted, margin: 0 }}>
                          Atomic Habits passed checks
                        </p>
                      </div>
                    </div>

                    {/* Item 4: Subtle Notification Pill */}
                    <div style={{
                      background: '#F3EFE9',
                      borderRadius: '20px',
                      padding: '12px 14px',
                      border: `1px solid ${T.borderWarm}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: T.textMuted,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                        flexShrink: 0,
                      }}>
                        <Bell style={{ width: '16px', height: '16px' }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h6 style={{
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: T.textDark,
                          margin: '0 0 2px 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          New Offer Received
                        </h6>
                        <p style={{ fontSize: '11px', color: T.textMuted, margin: 0 }}>
                          Elena offered Dune
                        </p>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* TAB CONTENT: 2. MY LISTINGS */}
            {currentTab === 'listings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 22px',
                  background: '#FAF7F2',
                  borderRadius: '24px',
                  border: `1px solid ${T.borderWarm}`,
                }}>
                  <div>
                    <h2 style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: T.textDark,
                      margin: '0 0 2px 0',
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}>
                      My Book Listings
                    </h2>
                    <p style={{ fontSize: '12.5px', color: T.textMuted, margin: 0 }}>
                      Manage books on your shelf, condition grades, and availability
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/add-listing')}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '999px',
                      border: 'none',
                      background: T.sageAccent,
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(45, 82, 62, 0.2)',
                    }}
                  >
                    <Plus style={{ width: '15px', height: '15px' }} /> Post New Book
                  </button>
                </div>

                {myListings.length === 0 ? (
                  <div style={{
                    padding: '48px',
                    textAlign: 'center',
                    background: '#FAF7F2',
                    borderRadius: '24px',
                    border: `1px solid ${T.borderWarm}`,
                  }}>
                    <BookOpen style={{ width: '40px', height: '40px', color: T.sageAccent, margin: '0 auto 12px' }} />
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: T.textDark, margin: '0 0 6px 0' }}>
                      No books posted yet
                    </h3>
                    <p style={{ fontSize: '13px', color: T.textMuted, margin: '0 0 16px 0' }}>
                      Share books you have already read to start exchanging with the community.
                    </p>
                    <button
                      onClick={() => navigate('/add-listing')}
                      style={{
                        padding: '9px 20px',
                        borderRadius: '999px',
                        border: 'none',
                        background: T.sageAccent,
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Post Your First Book
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                    {myListings.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          background: '#FAF7F2',
                          borderRadius: '22px',
                          border: `1px solid ${T.borderWarm}`,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                        }}
                      >
                        <BookCard listing={item} showActions={false} />
                        <div style={{
                          padding: '12px 16px',
                          background: '#F3EFE9',
                          borderTop: `1px solid ${T.borderWarm}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 'auto',
                        }}>
                          <StatusBadge status={item.status} />
                          {(item.status === 'available' || item.status === 'unverified') && (
                            <button
                              onClick={() => handleWithdrawListing(item.id)}
                              style={{
                                fontSize: '11.5px',
                                color: T.danger,
                                fontWeight: 700,
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Trash2 style={{ width: '12px', height: '12px' }} /> Withdraw
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: 3. SENT REQUESTS */}
            {currentTab === 'sent_requests' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{
                  padding: '18px 22px',
                  background: '#FAF7F2',
                  borderRadius: '24px',
                  border: `1px solid ${T.borderWarm}`,
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: T.textDark,
                    margin: '0 0 2px 0',
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}>
                    Sent Exchange Proposals
                  </h2>
                  <p style={{ fontSize: '12.5px', color: T.textMuted, margin: 0 }}>
                    Swap requests you have initiated with other readers
                  </p>
                </div>

                {sentRequests.length === 0 ? (
                  <div style={{
                    padding: '48px',
                    textAlign: 'center',
                    background: '#FAF7F2',
                    borderRadius: '24px',
                    border: `1px solid ${T.borderWarm}`,
                  }}>
                    <ArrowRightLeft style={{ width: '38px', height: '38px', color: T.coffeeAccent, margin: '0 auto 12px' }} />
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: T.textDark, margin: '0 0 6px 0' }}>
                      No sent swap proposals
                    </h3>
                    <p style={{ fontSize: '13px', color: T.textMuted, margin: '0 0 16px 0' }}>
                      Browse the catalog and find a title you'd love to swap for!
                    </p>
                    <button
                      onClick={() => navigate('/browse')}
                      style={{
                        padding: '9px 20px',
                        borderRadius: '999px',
                        border: 'none',
                        background: T.sageAccent,
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Browse Catalog
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sentRequests.map((req) => (
                      <div
                        key={req.id}
                        style={{
                          background: '#FAF7F2',
                          borderRadius: '22px',
                          border: `1px solid ${T.borderWarm}`,
                          padding: '18px 22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <StatusBadge status={req.status} />
                            <span style={{ fontSize: '11px', color: T.textMuted }}>
                              {new Date(req.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: T.textDark, marginBottom: '2px' }}>
                            Requested: <span style={{ color: T.sageText }}>{req.target_title}</span>
                          </div>
                          <div style={{ fontSize: '12px', color: T.textMid }}>
                            Offered in trade: <strong>{req.offered_title}</strong>
                          </div>
                        </div>

                        {req.status === 'pending' && (
                          <button
                            onClick={() => handleWithdrawRequest(req.id)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '999px',
                              border: `1px solid ${T.borderWarm}`,
                              background: '#FFFFFF',
                              color: T.textMuted,
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Withdraw
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: 4. RECEIVED REQUESTS */}
            {currentTab === 'received_requests' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{
                  padding: '18px 22px',
                  background: '#FAF7F2',
                  borderRadius: '24px',
                  border: `1px solid ${T.borderWarm}`,
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: T.textDark,
                    margin: '0 0 2px 0',
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}>
                    Received Swap Proposals
                  </h2>
                  <p style={{ fontSize: '12.5px', color: T.textMuted, margin: 0 }}>
                    Incoming book trade offers from community readers
                  </p>
                </div>

                {receivedRequests.length === 0 ? (
                  <div style={{
                    padding: '48px',
                    textAlign: 'center',
                    background: '#FAF7F2',
                    borderRadius: '24px',
                    border: `1px solid ${T.borderWarm}`,
                  }}>
                    <Clock style={{ width: '38px', height: '38px', color: T.sageAccent, margin: '0 auto 12px' }} />
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: T.textDark, margin: '0 0 6px 0' }}>
                      No incoming offers at the moment
                    </h3>
                    <p style={{ fontSize: '13px', color: T.textMuted, margin: 0 }}>
                      When fellow readers find your listings, their trade offers will appear here.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {receivedRequests.map((req) => (
                      <div
                        key={req.id}
                        style={{
                          background: '#FAF7F2',
                          borderRadius: '22px',
                          border: `1px solid ${T.borderWarm}`,
                          padding: '20px 22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '16px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <StatusBadge status={req.status} />
                            <span style={{ fontSize: '11px', color: T.textMuted }}>
                              From {req.requester_name} · {new Date(req.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: T.textDark, marginBottom: '3px' }}>
                            Offers <span style={{ color: T.sageText }}>{req.offered_title}</span> in exchange for your <strong>{req.target_title}</strong>
                          </div>
                          {req.message && (
                            <p style={{
                              fontSize: '12px',
                              fontStyle: 'italic',
                              color: T.coffeeText,
                              background: T.coffeeBg,
                              padding: '8px 12px',
                              borderRadius: '12px',
                              margin: '8px 0 0 0',
                            }}>
                              "{req.message}"
                            </p>
                          )}
                        </div>

                        {req.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            <button
                              onClick={() => handleAcceptRequest(req.id)}
                              style={{
                                padding: '8px 18px',
                                borderRadius: '999px',
                                border: 'none',
                                background: T.sageAccent,
                                color: '#FFFFFF',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: '0 2px 8px rgba(45, 82, 62, 0.2)',
                              }}
                            >
                              <Check style={{ width: '13px', height: '13px' }} /> Accept
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequestId(req.id);
                                setDeclineReason('prefer_different_book');
                                setDeclineNote('');
                                setDeclineError(null);
                                setDeclineModalOpen(true);
                              }}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '999px',
                                border: `1px solid ${T.dangerBorder}`,
                                background: T.dangerBg,
                                color: T.danger,
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <X style={{ width: '13px', height: '13px' }} /> Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: 5. ACTIVE TRANSACTIONS */}
            {currentTab === 'transactions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{
                  padding: '18px 22px',
                  background: '#FAF7F2',
                  borderRadius: '24px',
                  border: `1px solid ${T.borderWarm}`,
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: T.textDark,
                    margin: '0 0 2px 0',
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}>
                    Active Exchanges & Handovers
                  </h2>
                  <p style={{ fontSize: '12.5px', color: T.textMuted, margin: 0 }}>
                    Track accepted book exchanges, meetup locations, and delivery receipts
                  </p>
                </div>

                {transactions.length === 0 ? (
                  <div style={{
                    padding: '48px',
                    textAlign: 'center',
                    background: '#FAF7F2',
                    borderRadius: '24px',
                    border: `1px solid ${T.borderWarm}`,
                  }}>
                    <CheckCircle style={{ width: '38px', height: '38px', color: T.sageAccent, margin: '0 auto 12px' }} />
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: T.textDark, margin: '0 0 6px 0' }}>
                      No active exchanges
                    </h3>
                    <p style={{ fontSize: '13px', color: T.textMuted, margin: 0 }}>
                      When a proposal is accepted, the handover progress will be tracked here.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        style={{
                          background: '#FAF7F2',
                          borderRadius: '24px',
                          border: `1px solid ${T.borderWarm}`,
                          padding: '22px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: `1px solid ${T.borderWarm}`, marginBottom: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <StatusBadge status={tx.status} />
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: T.textMuted }}>
                              Exchange #{tx.id}
                            </span>
                          </div>
                          <span style={{ fontSize: '11.5px', color: T.textMuted }}>
                            {new Date(tx.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Trade Pair Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                          <div style={{ padding: '14px', borderRadius: '16px', background: T.sageTint, border: `1px solid ${T.sageBorder}` }}>
                            <span style={{ fontSize: '10.5px', fontWeight: 800, color: T.sageText, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Book to Receive
                            </span>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, color: T.sageText, margin: '4px 0 2px 0' }}>
                              {tx.target_title}
                            </h4>
                            <p style={{ fontSize: '11.5px', color: T.textMuted, margin: 0 }}>
                              From {tx.owner_name}
                            </p>
                          </div>

                          <div style={{ padding: '14px', borderRadius: '16px', background: T.coffeeBg, border: `1px solid ${T.coffeeBorder}` }}>
                            <span style={{ fontSize: '10.5px', fontWeight: 800, color: T.coffeeText, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Your Book to Give
                            </span>
                            <h4 style={{ fontSize: '15px', fontWeight: 800, color: T.coffeeText, margin: '4px 0 2px 0' }}>
                              {tx.offered_title}
                            </h4>
                            <p style={{ fontSize: '11.5px', color: T.textMuted, margin: 0 }}>
                              Requested by {tx.requester_name}
                            </p>
                          </div>
                        </div>

                        {/* Handover Details */}
                        {tx.slot_date && (
                          <div style={{
                            padding: '14px 16px',
                            borderRadius: '16px',
                            background: '#F3EFE9',
                            border: `1px solid ${T.borderWarm}`,
                            marginBottom: '16px',
                          }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 700, color: T.textDark, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <Calendar style={{ width: '14px', height: '14px', color: T.sageAccent }} />
                              Handover Scheduled: {tx.slot_date} ({tx.start_time} - {tx.end_time})
                            </div>
                            <div style={{ fontSize: '11.5px', color: T.textMid, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <MapPin style={{ width: '13px', height: '13px', color: T.coffeeAccent }} />
                              {tx.location_name} — {tx.location_address}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: T.textMuted }}>
                            {tx.requester_confirmed ? '✅ You confirmed' : '⏳ Waiting for your confirmation'} · {tx.owner_confirmed ? '✅ Partner confirmed' : '⏳ Partner pending'}
                          </span>
                          {tx.status !== 'completed' && tx.status !== 'cancelled' && (
                            <button
                              onClick={() => handleConfirmReceipt(tx.id)}
                              style={{
                                padding: '9px 20px',
                                borderRadius: '999px',
                                border: 'none',
                                background: T.sageAccent,
                                color: '#FFFFFF',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Confirm Physical Receipt
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: 6. WATCHLIST */}
            {currentTab === 'watchlist' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{
                  padding: '18px 22px',
                  background: '#FAF7F2',
                  borderRadius: '24px',
                  border: `1px solid ${T.borderWarm}`,
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: T.textDark,
                    margin: '0 0 2px 0',
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}>
                    My Wishlist
                  </h2>
                  <p style={{ fontSize: '12.5px', color: T.textMuted, margin: 0 }}>
                    Books you are keeping an eye on for upcoming community trades
                  </p>
                </div>

                {watchlist.length === 0 ? (
                  <div style={{
                    padding: '48px',
                    textAlign: 'center',
                    background: '#FAF7F2',
                    borderRadius: '24px',
                    border: `1px solid ${T.borderWarm}`,
                  }}>
                    <Bookmark style={{ width: '38px', height: '38px', color: T.coffeeAccent, margin: '0 auto 12px' }} />
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: T.textDark, margin: '0 0 6px 0' }}>
                      Your wishlist is currently empty
                    </h3>
                    <p style={{ fontSize: '13px', color: T.textMuted, margin: '0 0 16px 0' }}>
                      Browse available community copies and save the ones you wish to read next.
                    </p>
                    <button
                      onClick={() => navigate('/browse')}
                      style={{
                        padding: '9px 20px',
                        borderRadius: '999px',
                        border: 'none',
                        background: T.sageAccent,
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Browse Books
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                    {watchlist.map((item) => (
                      <BookCard key={item.id} listing={item} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: 7. NOTIFICATIONS */}
            {currentTab === 'notifications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '18px 22px',
                  background: '#FAF7F2',
                  borderRadius: '24px',
                  border: `1px solid ${T.borderWarm}`,
                }}>
                  <div>
                    <h2 style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: T.textDark,
                      margin: '0 0 2px 0',
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}>
                      Notifications
                    </h2>
                    <p style={{ fontSize: '12.5px', color: T.textMuted, margin: 0 }}>
                      Activity alerts, swap requests, and handover updates
                    </p>
                  </div>
                  <button
                    onClick={() => userService.markAllNotificationsRead().then(fetchDashboard)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '999px',
                      border: `1px solid ${T.borderWarm}`,
                      background: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: T.textDark,
                      cursor: 'pointer',
                    }}
                  >
                    Mark All Read
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div style={{
                    padding: '48px',
                    textAlign: 'center',
                    background: '#FAF7F2',
                    borderRadius: '24px',
                    border: `1px solid ${T.borderWarm}`,
                  }}>
                    <Bell style={{ width: '38px', height: '38px', color: T.sageAccent, margin: '0 auto 12px' }} />
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: T.textDark, margin: '0 0 6px 0' }}>
                      All caught up!
                    </h3>
                    <p style={{ fontSize: '13px', color: T.textMuted, margin: 0 }}>
                      No new notifications at this time.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkNotificationRead(n.id)}
                        style={{
                          borderRadius: '18px',
                          padding: '16px 20px',
                          cursor: 'pointer',
                          background: n.is_read ? '#FAF7F2' : T.sageTint,
                          border: n.is_read ? `1px solid ${T.borderWarm}` : `1px solid ${T.sageBorder}`,
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: n.is_read ? T.textMuted : T.sageText,
                            textTransform: 'capitalize',
                          }}>
                            {!n.is_read && '● '}{n.type?.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: '10.5px', color: T.textMuted }}>
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p style={{
                          fontSize: '13px',
                          color: n.is_read ? T.textMid : T.textDark,
                          fontWeight: n.is_read ? 400 : 600,
                          margin: 0,
                        }}>
                          {n.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: 8. PROFILE */}
            {currentTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{
                  padding: '18px 22px',
                  background: '#FAF7F2',
                  borderRadius: '24px',
                  border: `1px solid ${T.borderWarm}`,
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: T.textDark,
                    margin: '0 0 2px 0',
                    fontFamily: "'Playfair Display', Georgia, serif",
                  }}>
                    Reader Profile & Settings
                  </h2>
                  <p style={{ fontSize: '12.5px', color: T.textMuted, margin: 0 }}>
                    Your community identity, default city, and handover meetup points
                  </p>
                </div>

                <div style={{
                  background: '#FAF7F2',
                  borderRadius: '24px',
                  border: `1px solid ${T.borderWarm}`,
                  padding: '28px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr',
                  gap: '28px',
                }}>
                  <div style={{ textAlign: 'center', borderRight: `1px solid ${T.borderWarm}`, paddingRight: '28px' }}>
                    <div style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      background: T.sageBg,
                      color: T.sageText,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      fontWeight: 800,
                      margin: '0 auto 14px',
                      border: '3px solid #FFFFFF',
                      boxShadow: '0 4px 14px rgba(45, 82, 62, 0.12)',
                    }}>
                      {welcomeName.charAt(0)}
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: T.textDark, margin: '0 0 4px 0' }}>
                      {welcomeName} Reader
                    </h3>
                    <p style={{ fontSize: '12px', color: T.textMuted, margin: '0 0 12px 0' }}>
                      ana@bookswap.test
                    </p>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 12px',
                      borderRadius: '999px',
                      background: T.sageBg,
                      color: T.sageText,
                      fontSize: '11px',
                      fontWeight: 800,
                    }}>
                      <ShieldCheck style={{ width: '13px', height: '13px' }} /> Verified Member
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: T.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>
                        Preferred Exchange Location
                      </label>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: T.textDark, padding: '10px 14px', background: '#FFFFFF', borderRadius: '12px', border: `1px solid ${T.borderWarm}` }}>
                        SM Mall of Asia / Robinson's Place Manila
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: T.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>
                        Primary Reading Genres
                      </label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['Fiction', 'Self-Help', 'Classic', 'Fantasy'].map((g) => (
                          <span key={g} style={{ padding: '6px 12px', borderRadius: '999px', background: T.coffeeBg, color: T.coffeeText, fontSize: '12px', fontWeight: 700 }}>
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: T.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>
                        Trust & Karma Stats
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        <div style={{ padding: '12px', background: '#FFFFFF', borderRadius: '12px', border: `1px solid ${T.borderWarm}`, textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: T.sageText }}>12</div>
                          <div style={{ fontSize: '10.5px', color: T.textMuted }}>Swaps Completed</div>
                        </div>
                        <div style={{ padding: '12px', background: '#FFFFFF', borderRadius: '12px', border: `1px solid ${T.borderWarm}`, textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: T.coffeeText }}>100%</div>
                          <div style={{ fontSize: '10.5px', color: T.textMuted }}>Punctuality</div>
                        </div>
                        <div style={{ padding: '12px', background: '#FFFFFF', borderRadius: '12px', border: `1px solid ${T.borderWarm}`, textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: T.honeyText }}>5.0 ★</div>
                          <div style={{ fontSize: '10.5px', color: T.textMuted }}>Reader Rating</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Decline Swap Modal */}
      <Modal
        isOpen={declineModalOpen}
        onClose={() => setDeclineModalOpen(false)}
        title="Decline Swap Proposal"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleDeclineRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {declineError && (
            <div style={{
              padding: '10px 14px',
              background: T.dangerBg,
              border: `1px solid ${T.dangerBorder}`,
              borderRadius: '12px',
              fontSize: '12px',
              color: T.danger,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <AlertTriangle style={{ width: '14px', height: '14px' }} />
              {declineError}
            </div>
          )}

          <Dropdown
            label="Reason for Declining"
            options={[
              { value: 'prefer_different_book', label: 'Prefer a different book in return.' },
              { value: 'not_interested', label: 'Not currently looking for this genre.' },
              { value: 'condition_concern', label: 'Concerned about condition of offered book.' },
              { value: 'book_no_longer_available', label: 'My book is no longer available.' },
              { value: 'other', label: 'Other reasons' },
            ]}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            required
          />

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: T.textDark, marginBottom: '6px' }}>
              Note {declineReason === 'other' ? <span style={{ color: T.danger }}>*</span> : '(Optional)'}
            </label>
            <textarea
              rows={3}
              maxLength={200}
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              placeholder={declineReason === 'other' ? 'Please provide a polite reason to the reader.' : 'Optional message to the reader.'}
              required={declineReason === 'other'}
              style={{
                width: '100%',
                borderRadius: '12px',
                border: `1px solid ${T.borderWarm}`,
                padding: '10px 12px',
                fontSize: '13px',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                background: '#FAF7F2',
                color: T.textDark,
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '6px' }}>
            <button
              type="button"
              onClick={() => setDeclineModalOpen(false)}
              style={{
                padding: '9px 18px',
                borderRadius: '999px',
                border: `1px solid ${T.borderWarm}`,
                background: '#FAF7F2',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                color: T.textMid,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '9px 18px',
                borderRadius: '999px',
                border: 'none',
                background: T.danger,
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Decline Proposal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserDashboard;
