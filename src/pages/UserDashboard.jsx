import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService, listingService, exchangeService, transactionService } from '../services/api';
import Sidebar from '../components/Sidebar';
import BookCard from '../components/BookCard';
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

  const [dashboardData, setDashboardData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [watchlist, setWatchlist] = useState([]);

  const [loading, setLoading] = useState(true);

  // Decline modal state
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [declineReason, setDeclineReason] = useState('Would prefer a different book in return.');

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
    try {
      await exchangeService.declineRequest(selectedRequestId, declineReason);
      setDeclineModalOpen(false);
      fetchDashboard();
    } catch (err) {
      alert(err.message || 'Failed to decline request.');
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

  const handleMarkNotificationRead = async (id) => {
    await userService.markNotificationRead(id).catch(() => {});
    fetchDashboard();
  };

  if (loading) return <LoadingState message="Loading your dashboard..." />;

  const myListings = dashboardData?.listings || [];
  const sentRequests = dashboardData?.sent_requests || [];
  const receivedRequests = dashboardData?.received_requests || [];
  const transactions = dashboardData?.transactions || [];

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-12">
      <Sidebar
        role="customer"
        activeTab={currentTab}
        onTabChange={handleTabChange}
        unreadNotifications={notifications.filter((n) => !n.is_read).length}
      />

      <main className="flex-1 space-y-6">
        {/* TAB 1: MY LISTINGS */}
        {currentTab === 'listings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <div>
                <h2 className="text-xl font-serif font-bold text-slate-900">My Book Listings</h2>
                <p className="text-xs text-slate-500">Manage your posted books and track verification state</p>
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
                  <div key={item.id} className="relative group">
                    <BookCard listing={item} showActions={false} />
                    <div className="p-3 bg-slate-50 border-t border-slate-200/80 rounded-b-2xl flex items-center justify-between text-xs">
                      <StatusBadge status={item.status} />
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-slate-900">Sent Exchange Proposals</h2>
              <p className="text-xs text-slate-500">Track 1-to-1 swap proposals you have sent to other book owners</p>
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
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={req.status} />
                        <span className="text-xs text-slate-400">
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm">
                        Requested: <span className="text-brand-700">{req.target_title}</span>
                      </p>
                      <p className="text-xs text-slate-600">
                        Offered in Return: <span className="font-semibold">{req.offered_title}</span>
                      </p>
                      {req.message && (
                        <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg mt-2">
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-slate-900">Received Swap Proposals</h2>
              <p className="text-xs text-slate-500">Accept or decline swap offers submitted for your book listings</p>
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
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={req.status} />
                        <span className="text-xs text-slate-400">
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm">
                        Requester: <span className="text-slate-800 font-semibold">{req.requester_name}</span>
                      </p>
                      <p className="text-xs text-slate-600">
                        Offers: <span className="font-bold text-brand-700">{req.offered_title}</span> in exchange for your <span className="font-bold text-slate-800">{req.target_title}</span>
                      </p>
                      {req.message && (
                        <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg mt-2">
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-slate-900">Active Exchanges & Handovers</h2>
              <p className="text-xs text-slate-500">Track accepted transactions through scheduling and receipt confirmation</p>
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
                    className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={tx.status} />
                        <span className="text-xs font-bold text-slate-500">
                          Transaction #{tx.id}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        Updated {new Date(tx.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-slate-400 font-semibold">Target Book:</p>
                        <p className="font-bold text-slate-800">{tx.target_title}</p>
                        <p className="text-slate-500">Owner: {tx.owner_name}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-slate-400 font-semibold">Offered Book:</p>
                        <p className="font-bold text-slate-800">{tx.offered_title}</p>
                        <p className="text-slate-500">Requester: {tx.requester_name}</p>
                      </div>
                    </div>

                    {/* Handover Details if Scheduled */}
                    {tx.slot_date && (
                      <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 text-xs space-y-2">
                        <p className="font-bold text-indigo-900 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                          Handover Schedule Assigned by Moderator:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-indigo-800 font-medium">
                          <p>
                            <strong>Date & Time:</strong> {tx.slot_date} ({tx.start_time} - {tx.end_time})
                          </p>
                          <p className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span><strong>Location:</strong> {tx.location_name}, {tx.location_address}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Receipt Confirmation */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="text-xs text-slate-500">
                        {tx.requester_confirmed === 1 ? '✓ Requester confirmed' : '⏳ Awaiting requester confirmation'} •{' '}
                        {tx.owner_confirmed === 1 ? '✓ Owner confirmed' : '⏳ Awaiting owner confirmation'}
                      </div>

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
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: WATCHLIST */}
        {currentTab === 'watchlist' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-slate-900">Saved Watchlist</h2>
              <p className="text-xs text-slate-500">Books you are watching for availability</p>
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif font-bold text-slate-900">In-App Notifications</h2>
                <p className="text-xs text-slate-500">Event updates on verifications, swap requests, and handovers</p>
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
                        ? 'bg-brand-50/50 border-brand-200 font-semibold text-slate-900'
                        : 'bg-white border-slate-200/80 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-brand-700 capitalize">
                        {n.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">
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

      {/* Decline Reason Select Modal */}
      <Modal
        isOpen={declineModalOpen}
        onClose={() => setDeclineModalOpen(false)}
        title="Decline Swap Proposal"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleDeclineRequestSubmit} className="space-y-4">
          <Dropdown
            label="Select Reason for Declining"
            options={[
              'Would prefer a different book in return.',
              'The offered book condition is lower than desired.',
              'Currently negotiating another swap offer.',
              'No longer looking to exchange this book.',
            ]}
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            required
          />

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
    </div>
  );
};

export default UserDashboard;
