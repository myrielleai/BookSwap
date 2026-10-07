import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService, listingService, exchangeService, transactionService } from '../services/api';
import Sidebar from '../components/Sidebar';
import BookCard from '../components/BookCard';
import ReaderDesk from '../components/ReaderDesk';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Dropdown from '../components/Dropdown';
import { LoadingState, EmptyState } from '../components/LoadingState';
import {
  BookOpen,
  ArrowRightLeft,
  Clock,
  CheckCircle,
  Bell,
  Trash2,
  Check,
  X,
  AlertTriangle,
  MapPin,
  Calendar,
  Bookmark,
} from 'lucide-react';

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'listings';

  // Welcome banner — read sessionStorage flag set by Login (useEffect avoids React Strict Mode double-invoke)
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');

  useEffect(() => {
    const name = sessionStorage.getItem('bs_just_logged_in');
    if (name) {
      sessionStorage.removeItem('bs_just_logged_in');
      setWelcomeName(user?.first_name || name);
      setShowWelcome(true);
    }
  }, []);

  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [watchlist, setWatchlist] = useState([]);

  const [loading, setLoading] = useState(true);

  // Decline modal state
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [declineReason, setDeclineReason] = useState('prefer_different_book');
  const [declineNote, setDeclineNote] = useState('');
  const [declineError, setDeclineError] = useState(null);

  // Report modal state (Phase 1 §3.3.6: report a handover that went wrong)
  const [reportTx, setReportTx] = useState(null);
  const [reportType, setReportType] = useState('misdescribed_condition');
  const [reportDescription, setReportDescription] = useState('');
  const [reportError, setReportError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, notifRes, watchRes] = await Promise.all([
        userService.getDashboard(),
        userService.getNotifications().catch(() => ({ data: [] })),
        listingService.getWatchlist().catch(() => ({ data: [] })),
      ]);

      if (dashRes.success) setDashboardData(dashRes.data);
      if (notifRes.success) setNotifications(notifRes.data.notifications || notifRes.data || []);
      if (watchRes.success) setWatchlist(watchRes.data.watchlist || watchRes.data || []);
    } catch (err) {
      console.error('Failed fetching dashboard:', err);
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

  // Actions
  const handleWithdrawListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to withdraw this listing from the catalog?')) return;
    try {
      await listingService.withdrawListing(listingId);
      fetchDashboard();
    } catch (err) {
      alert(err.message || 'Failed to withdraw listing.');
    }
  };

  const handleWithdrawRequest = async (requestId) => {
    try {
      await exchangeService.withdrawRequest(requestId);
      fetchDashboard();
    } catch (err) {
      alert(err.message || 'Failed to withdraw request.');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const res = await exchangeService.acceptRequest(requestId);
      if (res.success) {
        alert('Exchange request accepted! Other competing requests involving either book have been automatically declined.');
        fetchDashboard();
      }
    } catch (err) {
      alert(err.message || 'Failed to accept exchange request.');
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
      // Prefer the backend's field messages (e.g. the missing note) over the generic summary.
      const fieldMessages = err.errors ? Object.values(err.errors).join(' ') : null;
      setDeclineError(fieldMessages || err.message || 'Failed to decline request.');
    }
  };

  const handleConfirmReceipt = async (transactionId) => {
    try {
      const res = await transactionService.confirmReceipt(transactionId);
      if (res.success) {
        alert('Receipt confirmed! Once both parties confirm, the swap completes.');
        fetchDashboard();
      }
    } catch (err) {
      alert(err.message || 'Failed to confirm receipt.');
    }
  };

  const openReportModal = (tx) => {
    setReportTx(tx);
    setReportType('misdescribed_condition');
    setReportDescription('');
    setReportError(null);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setReportError(null);
    const description = reportDescription.trim();
    if (!description) {
      setReportError('Please describe what happened.');
      return;
    }
    try {
      await userService.fileReport({ report_type: reportType, transaction_id: reportTx.id, description });
      setReportTx(null);
      alert('Report filed. A moderator will review it.');
    } catch (err) {
      const fieldMessages = err.errors ? Object.values(err.errors).join(' ') : null;
      setReportError(fieldMessages || err.message || 'Failed to file report.');
    }
  };

  const handleMarkNotificationRead = async (id) => {
    await userService.markNotificationRead(id).catch(() => {});
    fetchDashboard();
  };

  if (loading) return <LoadingState message="Loading your dashboard..." />;

  const myListings = dashboardData?.listings || [];
  const sentRequests = dashboardData?.sent_requests || [];
  const receivedRequests = dashboardData?.received_requests || dashboardData?.incoming_requests || [];
  const transactions = dashboardData?.transactions || [];

  return (
    <div className="flex flex-col gap-0 pb-12">
      {/* ── Welcome Banner ── */}
      {showWelcome && (
        <div
          style={{ animation: 'slideDownFade 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
          className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-2xl px-8 py-8 mb-8 bg-emerald-950 border border-emerald-900 shadow-xl overflow-hidden"
        >
          {/* Elegant pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          
          {/* Large decorative background icon */}
          <BookOpen className="absolute -right-8 -bottom-12 w-64 h-64 text-emerald-900/50 transform -rotate-12 pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center gap-6 relative z-10 w-full">
            <div className="w-16 h-16 rounded-2xl bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center shrink-0 shadow-inner backdrop-blur-sm">
              <span className="text-3xl">👋</span>
            </div>
            
            <div className="flex-1">
              <p className="text-xs font-bold tracking-widest text-amber-400/90 uppercase mb-1">
                Reader's Dashboard
              </p>
              <h2 className="text-2xl sm:text-3xl font-serif text-emerald-50 leading-tight">
                Welcome back, <span className="italic font-medium">{welcomeName}</span>.
              </h2>
              <p className="text-sm text-emerald-100/70 mt-2 max-w-xl leading-relaxed">
                Your literary journey continues here. Check your active exchanges, manage listings, and dive into your next great read.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowWelcome(false)}
            className="relative z-10 w-8 h-8 rounded-full bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700/50 flex items-center justify-center text-emerald-300 transition-colors shrink-0 self-start sm:self-center"
            aria-label="Dismiss welcome"
          >
            <X className="w-4 h-4" />
          </button>

          <style>{`
            @keyframes slideDownFade {
              from { opacity: 0; transform: translateY(-12px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
      <Sidebar
        role="customer"
        activeTab={currentTab}
        onTabChange={handleTabChange}
        unreadNotifications={notifications.filter((n) => !n.is_read).length}
      />

      <main className="flex-1 min-w-0 space-y-6">
        {/* Reader's desk overview */}
        <ReaderDesk
          user={user}
          listings={myListings}
          sentRequests={sentRequests}
          receivedRequests={receivedRequests}
          transactions={transactions}
          unread={notifications.filter((n) => !n.is_read).length}
          onOpen={handleTabChange}
        />

        {/* TAB 1: MY LISTINGS */}
        {currentTab === 'listings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm">
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900">My Book Listings</h2>
                <p className="text-xs text-stone-500">Manage your posted books and track verification state</p>
              </div>
              <Button variant="primary" size="sm" onClick={() => navigate('/add-listing')}>
                + List New Book
              </Button>
            </div>

            {myListings.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No book listings yet"
                description="Share books from your bookshelf to begin exchanging with nearby readers."
                action={
                  <Button variant="primary" size="sm" onClick={() => navigate('/add-listing')}>
                    Post First Book Listing
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {myListings.map((item) => (
                  <div key={item.id} className="relative group flex flex-col">
                    <BookCard listing={item} showActions={false} />
                    <div className="pt-2 flex items-center justify-center text-xs">
                      {item.status === 'available' || item.status === 'unverified' ? (
                        <button
                          onClick={() => handleWithdrawListing(item.id)}
                          className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Withdraw
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SENT REQUESTS */}
        {currentTab === 'sent_requests' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-stone-900">Sent Exchange Proposals</h2>
              <p className="text-xs text-stone-500">Track 1-to-1 swap proposals you have sent to other book owners</p>
            </div>

            {sentRequests.length === 0 ? (
              <EmptyState
                icon={ArrowRightLeft}
                title="No sent requests"
                description="Browse the catalog and propose a swap using one of your verified books."
              />
            ) : (
              <div className="space-y-4">
                {sentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={req.status} />
                        <span className="text-xs text-stone-400">
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="font-bold text-stone-900 text-sm">
                        Requested: <span className="text-emerald-800">{req.target_title}</span>
                      </p>
                      <p className="text-xs text-stone-600">
                        Offered in Return: <span className="font-semibold text-stone-800">{req.offered_title}</span>
                      </p>
                      {req.message && (
                        <p className="text-xs text-stone-500 italic bg-stone-50 p-2 rounded-lg mt-2">
                          "{req.message}"
                        </p>
                      )}
                      {req.decline_reason && (
                        <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">
                          Decline Reason: {req.decline_reason}
                        </p>
                      )}
                    </div>

                    {req.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleWithdrawRequest(req.id)}
                      >
                        Withdraw Request
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RECEIVED REQUESTS */}
        {currentTab === 'received_requests' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-stone-900">Received Swap Proposals</h2>
              <p className="text-xs text-stone-500">Accept or decline swap offers submitted for your book listings</p>
            </div>

            {receivedRequests.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No incoming swap offers"
                description="When readers request your books, their offers will appear here."
              />
            ) : (
              <div className="space-y-4">
                {receivedRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={req.status} />
                        <span className="text-xs text-stone-400">
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="font-bold text-stone-900 text-sm">
                        Requester: <span className="text-stone-800 font-semibold">{req.requester_name}</span>
                      </p>
                      <p className="text-xs text-stone-600">
                        Offers: <span className="font-bold text-emerald-800">{req.offered_title}</span> in exchange for your <span className="font-bold text-stone-800">{req.target_title}</span>
                      </p>
                      {req.message && (
                        <p className="text-xs text-stone-500 italic bg-stone-50 p-2 rounded-lg mt-2">
                          "{req.message}"
                        </p>
                      )}
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Check}
                          onClick={() => handleAcceptRequest(req.id)}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={X}
                          onClick={() => {
                            setSelectedRequestId(req.id);
                            setDeclineReason('prefer_different_book');
                            setDeclineNote('');
                            setDeclineError(null);
                            setDeclineModalOpen(true);
                          }}
                        >
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ACTIVE TRANSACTIONS & EXCHANGES */}
        {currentTab === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-stone-900">Active Exchanges & Handovers</h2>
              <p className="text-xs text-stone-500">Track accepted transactions through scheduling and receipt confirmation</p>
            </div>

            {transactions.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="No active transactions"
                description="Once a swap proposal is accepted, the handover progress will be tracked here."
              />
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={tx.status} />
                        <span className="text-xs font-bold text-stone-500">
                          Transaction #{tx.id}
                        </span>
                      </div>
                      <span className="text-xs text-stone-400">
                        Updated {new Date(tx.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="bg-stone-50 p-3 rounded-xl">
                        <p className="text-stone-400 font-semibold">Target Book:</p>
                        <p className="font-bold text-stone-800">{tx.target_title}</p>
                        <p className="text-stone-500">Owner: {tx.owner_name}</p>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-xl">
                        <p className="text-stone-400 font-semibold">Offered Book:</p>
                        <p className="font-bold text-stone-800">{tx.offered_title}</p>
                        <p className="text-stone-500">Requester: {tx.requester_name}</p>
                      </div>
                    </div>

                    {/* Handover Details if Scheduled */}
                    {tx.slot_date && (
                      <div className="bg-amber-900/5 p-4 rounded-xl border border-amber-900/15 text-xs space-y-2">
                        <p className="font-bold text-amber-900 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-emerald-800" />
                          Handover Schedule Assigned by Moderator:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-800 font-medium">
                          <p>
                            <strong>Date & Time:</strong> {tx.slot_date} ({tx.start_time} - {tx.end_time})
                          </p>
                          <p className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                            <span><strong>Location:</strong> {tx.location_name}, {tx.location_address}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Receipt Confirmation */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                      <div className="text-xs text-stone-500">
                        {tx.requester_confirmed === 1 ? '✓ Requester confirmed' : '⏳ Awaiting requester confirmation'} •{' '}
                        {tx.owner_confirmed === 1 ? '✓ Owner confirmed' : '⏳ Awaiting owner confirmation'}
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        {/* Reports open once a handover is scheduled (backend rule) */}
                        {(tx.status === 'scheduled' || tx.status === 'completed') && (
                          <Button variant="outline" size="sm" onClick={() => openReportModal(tx)}>
                            Report Issue
                          </Button>
                        )}
                        {tx.status !== 'completed' && tx.status !== 'cancelled' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleConfirmReceipt(tx.id)}
                          >
                            Confirm Physical Receipt
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: WATCHLIST */}
        {currentTab === 'watchlist' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-stone-900">Saved Watchlist</h2>
              <p className="text-xs text-stone-500">Books you are watching for availability</p>
            </div>

            {watchlist.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="Watchlist is empty"
                description="Click the bookmark icon on any book detail page to save it here."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {watchlist.map((item) => (
                  <BookCard key={item.id} listing={item} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: NOTIFICATIONS */}
        {currentTab === 'notifications' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900">In-App Notifications</h2>
                <p className="text-xs text-stone-500">Event updates on verifications, swap requests, and handovers</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  userService.markAllNotificationsRead().then(fetchDashboard);
                }}
              >
                Mark All Read
              </Button>
            </div>

            {notifications.length === 0 ? (
              <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkNotificationRead(n.id)}
                    className={`p-4 rounded-xl border text-xs cursor-pointer transition-colors ${
                      !n.is_read
                        ? 'bg-emerald-900/10 border-emerald-900/20 font-semibold text-stone-900'
                        : 'bg-white border-stone-200/80 text-stone-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-emerald-800 capitalize">
                        {n.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p>{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      </div>{/* end flex-row wrapper */}

      {/* Decline Reason Select Modal */}
      <Modal
        isOpen={declineModalOpen}
        onClose={() => setDeclineModalOpen(false)}
        title="Decline Swap Proposal"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleDeclineRequestSubmit} className="space-y-4">
          {declineError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{declineError}</span>
            </div>
          )}

          {/* Values are the DECLINE_REASONS keys in backend/config/constants.php */}
          <Dropdown
            label="Select Reason for Declining"
            options={[
              { value: 'prefer_different_book', label: 'Would prefer a different book in return.' },
              { value: 'not_interested', label: 'Not interested in the offered book.' },
              { value: 'condition_concern', label: 'Concerned about the condition of the offered book.' },
              { value: 'book_no_longer_available', label: 'The requested book is no longer available.' },
              { value: 'other', label: 'Other' },
            ]}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-stone-700">
              Note {declineReason === 'other' ? <span className="text-rose-500">*</span> : '(Optional)'}
            </label>
            <textarea
              rows={3}
              maxLength={200}
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              placeholder={declineReason === 'other' ? 'Tell the requester why you are declining.' : 'Optional message for the requester'}
              className="block w-full rounded-lg border border-stone-300 text-xs p-3 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              required={declineReason === 'other'}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeclineModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger">
              Decline Proposal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Report Issue Modal */}
      <Modal
        isOpen={reportTx !== null}
        onClose={() => setReportTx(null)}
        title={reportTx ? `Report Transaction #${reportTx.id}` : 'Report Issue'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleReportSubmit} className="space-y-4">
          {reportError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{reportError}</span>
            </div>
          )}

          {/* Values are the transaction report types in backend/controllers/UserController.php */}
          <Dropdown
            label="What went wrong?"
            options={[
              { value: 'misdescribed_condition', label: 'The book did not match its listed condition' },
              { value: 'no_show', label: 'The other member did not show up' },
            ]}
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-stone-700">
              Details <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              maxLength={2000}
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Describe what happened so a moderator can review it."
              className="block w-full rounded-lg border border-stone-300 text-xs p-3 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReportTx(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger">
              Submit Report
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserDashboard;
