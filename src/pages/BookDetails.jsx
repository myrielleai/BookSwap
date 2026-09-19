import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listingService, exchangeService, userService } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Dropdown from '../components/Dropdown';
import { LoadingState, ErrorMessage } from '../components/LoadingState';
import {
  BookOpen,
  ArrowRightLeft,
  Bookmark,
  BookmarkCheck,
  User,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';

const BookDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [listing, setListing] = useState(null);
  const [userListings, setUserListings] = useState([]);
  const [isWatchlisted, setIsWatchlisted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Proposal Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOfferedBook, setSelectedOfferedBook] = useState('');
  const [proposalMessage, setProposalMessage] = useState('');
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalError, setProposalError] = useState(null);
  const [proposalSuccess, setProposalSuccess] = useState(false);

  const fetchListingDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listingService.getListing(id);
      if (res.success && res.data) {
        const data = res.data.listing || res.data;
        setListing(data);
        setIsWatchlisted(!!data.is_watchlisted);
      }
    } catch (err) {
      setError(err.message || 'Failed to load book details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListingDetails();
  }, [id]);

  // Load current user's available listings when modal opens
  const handleOpenProposalModal = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/listings/${id}` } } });
      return;
    }

    setModalOpen(true);
    setProposalError(null);
    setProposalSuccess(false);

    try {
      const res = await userService.getDashboard();
      if (res.success && res.data) {
        const myListings = res.data.listings || [];
        // Only allow verified available listings owned by user
        const availableMine = myListings.filter(
          (l) => l.status === 'available' && l.id !== parseInt(id)
        );
        setUserListings(availableMine);
        if (availableMine.length > 0) {
          setSelectedOfferedBook(availableMine[0].id.toString());
        }
      }
    } catch (err) {
      console.error('Failed fetching user listings:', err);
    }
  };

  const handleToggleWatchlist = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      if (isWatchlisted) {
        await listingService.removeFromWatchlist(id);
        setIsWatchlisted(false);
      } else {
        await listingService.addToWatchlist(id);
        setIsWatchlisted(true);
      }
    } catch (err) {
      console.error('Watchlist toggle failed:', err);
    }
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    setProposalError(null);

    if (!selectedOfferedBook) {
      setProposalError('You must select one of your verified available books to offer.');
      return;
    }

    setSubmittingProposal(true);

    try {
      const res = await exchangeService.sendRequest({
        target_listing_id: parseInt(id),
        offered_listing_id: parseInt(selectedOfferedBook),
        message: proposalMessage || null,
      });

      if (res.success) {
        setProposalSuccess(true);
        setTimeout(() => {
          setModalOpen(false);
          navigate('/dashboard?tab=sent_requests');
        }, 2000);
      } else {
        setProposalError(res.message || 'Failed to send exchange request.');
      }
    } catch (err) {
      setProposalError(err.message || 'Error submitting exchange request.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  if (loading) return <LoadingState message="Loading book details..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchListingDetails} />;
  if (!listing) return null;

  const photoUrl = listing.cover_photo_path
    ? (listing.cover_photo_path.startsWith('http') ? listing.cover_photo_path : `/${listing.cover_photo_path}`)
    : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600';

  const isOwner = user && user.id === listing.user_id;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Top Back Link */}
      <Link
        to="/browse"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        &larr; Back to Catalog Browsing
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-0">
        {/* Cover Photo Column */}
        <div className="md:col-span-5 bg-slate-100 p-6 flex items-center justify-center relative min-h-[380px]">
          <img
            src={photoUrl}
            alt={listing.title}
            className="w-full max-h-[460px] object-contain rounded-2xl shadow-lg"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600';
            }}
          />

          <button
            onClick={handleToggleWatchlist}
            className={`absolute top-4 right-4 p-3 rounded-full shadow-md backdrop-blur-md transition-all ${
              isWatchlisted
                ? 'bg-rose-500 text-white'
                : 'bg-white/80 text-slate-700 hover:bg-white'
            }`}
            title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            {isWatchlisted ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          </button>
        </div>

        {/* Details Content Column */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-xs text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full uppercase tracking-wider">
                {listing.genre_name || 'General'}
              </span>
              <StatusBadge status={listing.status} />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 leading-tight">
                {listing.title}
              </h1>
              <p className="text-sm font-semibold text-slate-500 mt-1">
                Author: <span className="text-slate-800">{listing.author}</span>
              </p>
            </div>

            {/* Spec Table */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-400 font-medium">Condition Grade</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {listing.condition_label || listing.condition_name || 'Good'}
                </p>
                {listing.condition_description && (
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    {listing.condition_description}
                  </p>
                )}
              </div>

              <div>
                <p className="text-slate-400 font-medium">Edition / Publisher</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {listing.edition || 'Standard Edition'}
                </p>
                <p className="text-slate-500">{listing.publisher || 'N/A'}</p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Age Category</p>
                <p className="font-semibold text-slate-800">
                  {listing.age_category_name || 'General Audience'}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Format</p>
                <p className="font-semibold text-slate-800">
                  {listing.format_name || 'Paperback'}
                </p>
              </div>
            </div>

            {/* Preferred Return / Swap Type */}
            <div className="p-4 bg-brand-50/60 rounded-2xl border border-brand-100 space-y-1">
              <p className="text-xs font-bold text-brand-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span>Preferred Return / Swap Offer</span>
              </p>
              <p className="text-xs text-brand-800">
                {listing.is_open_offer === 1
                  ? 'Open to any book swap offer!'
                  : listing.preferred_return || 'Open to any reasonable book offer'}
              </p>
            </div>

            {/* Listing Owner Information */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">{listing.owner_name || 'Reader'}</p>
                  <p className="text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {listing.city || 'City Location'}
                  </p>
                </div>
              </div>

              {listing.owner_exchange_count !== undefined && (
                <div className="text-right">
                  <p className="font-bold text-emerald-700">{listing.owner_exchange_count} Swaps</p>
                  <p className="text-[10px] text-slate-400">Completed Swaps</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            {isOwner ? (
              <Link
                to="/dashboard?tab=listings"
                className="w-full text-center py-3 bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-200 transition-colors"
              >
                Manage This Listing in Dashboard
              </Link>
            ) : listing.status === 'available' ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full shadow-lg shadow-brand-500/20"
                icon={ArrowRightLeft}
                onClick={handleOpenProposalModal}
              >
                Propose 1-to-1 Exchange
              </Button>
            ) : (
              <div className="w-full p-3 bg-slate-100 text-slate-500 text-xs text-center rounded-xl font-medium">
                This listing is currently {listing.status} and not taking new swap proposals.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exchange Proposal Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Propose Exchange for "${listing.title}"`}
        maxWidth="max-w-lg"
      >
        {proposalSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-800">Exchange Proposal Sent!</h4>
            <p className="text-xs text-slate-600">
              The listing owner will review your offer. Redirecting to your sent requests...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitProposal} className="space-y-5">
            {proposalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{proposalError}</span>
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1">
              <p className="text-slate-400 font-semibold">Target Book Requested:</p>
              <p className="font-bold text-slate-900">{listing.title} by {listing.author}</p>
            </div>

            {userListings.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>No Verified Available Books</span>
                </div>
                <p>
                  Operating rule requirement: You must have at least one verified available book listing in your collection to offer in a 1-to-1 swap.
                </p>
                <Link
                  to="/add-listing"
                  className="inline-block mt-2 font-bold text-brand-700 underline"
                >
                  Post a Book Listing Now &rarr;
                </Link>
              </div>
            ) : (
              <>
                <Dropdown
                  label="Select One of Your Verified Books to Offer"
                  options={userListings.map((l) => ({
                    id: l.id,
                    name: `${l.title} (${l.condition_label || 'Good'})`,
                  }))}
                  value={selectedOfferedBook}
                  onChange={(e) => setSelectedOfferedBook(e.target.value)}
                  required
                />

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Short Message for Listing Owner (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={proposalMessage}
                    onChange={(e) => setProposalMessage(e.target.value)}
                    placeholder="e.g. Hi! I'd love to swap for your copy. I'm available for handovers on weekends."
                    className="block w-full rounded-lg border border-slate-300 text-xs p-3 focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" isLoading={submittingProposal}>
                    Submit Swap Request
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
};

export default BookDetails;
