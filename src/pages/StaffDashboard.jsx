import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { staffService, categoryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Dropdown from '../components/Dropdown';
import { LoadingState, EmptyState } from '../components/LoadingState';
import {
  ShieldCheck,
  CheckCircle,
  Calendar,
  AlertTriangle,
  ArrowRightLeft,
  XCircle,
  Clock,
  MapPin,
  Check,
  X,
  FileText,
} from 'lucide-react';

const StaffDashboard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'verifications';

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
  const [availableSlots, setAvailableSlots] = useState([]);
  const [reports, setReports] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verification action modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [verifyAction, setVerifyAction] = useState('approve'); // approve, return, reject
  const [staffNote, setStaffNote] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  // Schedule modal state
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  // Report resolution modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionText, setResolutionText] = useState('');
  const [reportStatus, setReportStatus] = useState('resolved');

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const [dashRes, slotsRes, reportsRes, txRes] = await Promise.all([
        staffService.getDashboard(),
        staffService.getAvailableSlots().catch(() => ({ data: [] })),
        staffService.getReports().catch(() => ({ data: [] })),
        staffService.getTransactions().catch(() => ({ data: [] })),
      ]);

      if (dashRes.success) setDashboardData(dashRes.data);
      if (slotsRes.success) setAvailableSlots(slotsRes.data.slots || slotsRes.data || []);
      if (reportsRes.success) setReports(reportsRes.data.reports || reportsRes.data || []);
      if (txRes.success) setAllTransactions(txRes.data.transactions || txRes.data || []);
    } catch (err) {
      console.error('Staff dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Submit Listing Verification
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setSubmittingVerify(true);
    setVerifyError(null);
    try {
      await staffService.verifyListing(selectedListing.id, verifyAction, staffNote.trim());
      setVerifyModalOpen(false);
      setStaffNote('');
      fetchStaffData();
    } catch (err) {
      // Prefer the backend's field messages (e.g. the missing note) over the generic summary.
      const fieldMessages = err.errors ? Object.values(err.errors).join(' ') : null;
      setVerifyError(fieldMessages || err.message || 'Verification update failed.');
    } finally {
      setSubmittingVerify(false);
    }
  };

  // Submit Schedule Handover
  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlotId) {
      alert('Please select a handover slot.');
      return;
    }
    setSubmittingSchedule(true);
    try {
      await staffService.scheduleHandover(selectedTxId, parseInt(selectedSlotId));
      setScheduleModalOpen(false);
      fetchStaffData();
    } catch (err) {
      alert(err.message || 'Scheduling failed.');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  // Record No Show
  const handleRecordNoShow = async (txId) => {
    if (!window.confirm('Record a no-show for this transaction? This will cancel the exchange and reset listings to available.')) return;
    try {
      await staffService.recordNoShow(txId);
      fetchStaffData();
    } catch (err) {
      alert(err.message || 'Failed to record no-show.');
    }
  };

  // Complete Transaction (Feature F-09)
  const [completingTxId, setCompletingTxId] = useState(null);
  const handleCompleteTransaction = async (txId) => {
    if (!window.confirm('Mark this transaction as completed? Both listings will be archived and member exchange counts updated.')) return;
    setCompletingTxId(txId);
    try {
      await staffService.updateStatus(txId, 'completed');
      alert('Transaction marked as completed! Both listings have been archived.');
      fetchStaffData();
    } catch (err) {
      alert(err.message || 'Failed to complete transaction.');
    } finally {
      setCompletingTxId(null);
    }
  };

  // Resolve Report
  const handleResolveReportSubmit = async (e) => {
    e.preventDefault();
    try {
      await staffService.resolveReport(selectedReport.id, resolutionText, reportStatus);
      setReportModalOpen(false);
      fetchStaffData();
    } catch (err) {
      alert(err.message || 'Failed to update report.');
    }
  };

  if (loading) return <LoadingState message="Loading Exchange Moderator console..." />;

  const unverifiedListings = dashboardData?.pending_verifications || [];
  const unscheduledTxs = dashboardData?.unscheduled_transactions || dashboardData?.awaiting_schedule || [];
  const todayHandovers = dashboardData?.today_handovers || dashboardData?.todays_handovers || [];
  const allTxs = dashboardData?.transactions || allTransactions || [];

  return (
    <div className="flex flex-col gap-0 pb-12">
      {/* ── Welcome Banner ── */}
      {showWelcome && (
        <div
          style={{ animation: 'slideDownFade 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
          className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-2xl px-8 py-8 mb-8 bg-amber-950 border border-amber-900 shadow-xl overflow-hidden"
        >
          {/* Elegant pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          
          {/* Large decorative background icon */}
          <CheckCircle className="absolute -right-8 -bottom-12 w-64 h-64 text-amber-900/50 transform -rotate-12 pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center gap-6 relative z-10 w-full">
            <div className="w-16 h-16 rounded-2xl bg-amber-900/60 border border-amber-700/50 flex items-center justify-center shrink-0 shadow-inner backdrop-blur-sm">
              <span className="text-3xl">🛡️</span>
            </div>
            
            <div className="flex-1">
              <p className="text-xs font-bold tracking-widest text-emerald-400/90 uppercase mb-1">
                Exchange Moderator
              </p>
              <h2 className="text-2xl sm:text-3xl font-serif text-amber-50 leading-tight">
                Welcome back, <span className="italic font-medium">{welcomeName}</span>.
              </h2>
              <p className="text-sm text-amber-200/70 mt-2 max-w-xl leading-relaxed">
                The community relies on your reviews. Verify new listings, assign handover slots, and resolve member disputes.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowWelcome(false)}
            className="relative z-10 w-8 h-8 rounded-full bg-amber-900/60 hover:bg-amber-800 border border-amber-700/50 flex items-center justify-center text-amber-300 transition-colors shrink-0 self-start sm:self-center"
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
      <Sidebar role="staff" activeTab={currentTab} onTabChange={handleTabChange} />

      <main className="flex-1 space-y-6">
        {/* TAB 1: LISTING VERIFICATIONS */}
        {currentTab === 'verifications' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-800" />
                Pending Listing Verifications Queue
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Review submitted books for completeness, legible photo quality, and plausible condition grades.
              </p>
            </div>

            {unverifiedListings.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="No pending verifications"
                description="All submitted book listings have been processed by moderators."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {unverifiedListings.map((item) => {
                  const rawPhoto = item.cover_photo_path || item.cover_photo || (item.cover_photo_id ? `/api/photos/${item.cover_photo_id}` : null);
                  const photoUrl = rawPhoto
                    ? (rawPhoto.startsWith('http') || rawPhoto.startsWith('/') ? rawPhoto : `/${rawPhoto}`)
                    : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600';

                  return (
                    <div key={item.id} className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden flex flex-col justify-between">
                      <div className="p-4 space-y-3">
                        <div className="flex gap-4">
                          <img
                            src={photoUrl}
                            alt={item.title}
                            className="w-24 h-32 object-cover rounded-xl border border-stone-200 shrink-0"
                          />
                          <div className="space-y-1 text-xs">
                            <span className="font-bold text-emerald-900 bg-emerald-900/10 px-2 py-0.5 rounded-md">
                              {item.genre_name}
                            </span>
                            <h3 className="font-bold text-stone-900 text-sm">{item.title}</h3>
                            <p className="text-stone-500">by {item.author}</p>
                            <p className="text-stone-600 pt-1">
                              <strong>Condition:</strong> {item.condition_label || 'Good'}
                            </p>
                            <p className="text-stone-500">Owner: {item.owner_name} ({item.city})</p>
                          </div>
                        </div>

                        {item.preferred_return && (
                          <div className="p-2 bg-stone-50 rounded-lg text-xs text-stone-600">
                            <strong>Wants in return:</strong> {item.preferred_return}
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedListing(item);
                            setVerifyAction('return');
                            setVerifyError(null);
                            setVerifyModalOpen(true);
                          }}
                        >
                          Return for Revision
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setSelectedListing(item);
                            setVerifyAction('reject');
                            setVerifyError(null);
                            setVerifyModalOpen(true);
                          }}
                        >
                          Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedListing(item);
                            setVerifyAction('approve');
                            setVerifyError(null);
                            setVerifyModalOpen(true);
                          }}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HANDOVER SCHEDULING */}
        {currentTab === 'handovers' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-800" />
                Handover Scheduling Queue
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Assign handover date, time slot, and designated meetup venue for accepted exchanges.
              </p>
            </div>

            {unscheduledTxs.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No accepted exchanges awaiting schedule"
                description="All accepted exchanges have been assigned a handover slot."
              />
            ) : (
              <div className="space-y-4">
                {unscheduledTxs.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">
                          Transaction #{tx.id}
                        </span>
                        <StatusBadge status={tx.status} />
                      </div>
                      <p className="text-stone-700">
                        Swap: <strong className="text-emerald-800">{tx.target_title}</strong> &harr; <strong>{tx.offered_title}</strong>
                      </p>
                      <p className="text-stone-500">
                        Parties: {tx.owner_name} (Owner) & {tx.requester_name} (Requester)
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      icon={Calendar}
                      onClick={() => {
                        setSelectedTxId(tx.id);
                        setScheduleModalOpen(true);
                      }}
                    >
                      Assign Handover Slot
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TRANSACTIONS QUEUE */}
        {currentTab === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-800" />
                All Supervised Transactions
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Monitor status progression, record no-show infractions, or cancel transactions.
              </p>
            </div>

            <div className="space-y-4">
              {allTxs.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm">Transaction #{tx.id}</span>
                      <StatusBadge status={tx.status} />
                    </div>
                    <span className="text-xs text-stone-400">
                      Reschedule count: {tx.reschedule_count}/1
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-stone-50 p-3 rounded-xl">
                    <div>
                      <p className="text-stone-500">Target Book: <strong>{tx.target_title}</strong></p>
                      <p className="text-stone-500">
                        Owner: <strong>{tx.owner_name}</strong>{' '}
                        {tx.owner_confirmed == 1 ? (
                          <span className="text-emerald-700 font-semibold">(Confirmed Receipt ✓)</span>
                        ) : (
                          <span className="text-amber-600 font-semibold">(Receipt Pending)</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-stone-500">Offered Book: <strong>{tx.offered_title}</strong></p>
                      <p className="text-stone-500">
                        Requester: <strong>{tx.requester_name}</strong>{' '}
                        {tx.requester_confirmed == 1 ? (
                          <span className="text-emerald-700 font-semibold">(Confirmed Receipt ✓)</span>
                        ) : (
                          <span className="text-amber-600 font-semibold">(Receipt Pending)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {tx.status === 'scheduled' && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-stone-100">
                      <div className="text-xs">
                        {tx.owner_confirmed == 1 && tx.requester_confirmed == 1 ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                            <CheckCircle className="w-4 h-4 text-emerald-700" />
                            Both parties confirmed physical receipt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-medium">
                            <Clock className="w-4 h-4 text-amber-600" />
                            Awaiting confirmation from both members
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          variant="danger"
                          size="sm"
                          icon={XCircle}
                          onClick={() => handleRecordNoShow(tx.id)}
                        >
                          Record No-Show & Reset Books
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={CheckCircle}
                          isLoading={completingTxId === tx.id}
                          disabled={!(tx.owner_confirmed == 1 && tx.requester_confirmed == 1)}
                          onClick={() => handleCompleteTransaction(tx.id)}
                        >
                          Mark Completed
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DISPUTES & REPORTS */}
        {currentTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Dispute & Discrepancy Reports
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Review reports on misdescribed conditions, no-shows, and inappropriate listings.
              </p>
            </div>

            {reports.length === 0 ? (
              <EmptyState icon={CheckCircle} title="No open dispute reports" description="All reports are resolved." />
            ) : (
              <div className="space-y-4">
                {reports.map((rep) => (
                  <div key={rep.id} className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full uppercase">
                        {rep.report_type.replace(/_/g, ' ')}
                      </span>
                      <StatusBadge status={rep.status} />
                    </div>
                    <p className="text-xs font-semibold text-stone-800">
                      Reported by {rep.reporter_name}
                    </p>
                    <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl italic">
                      "{rep.description}"
                    </p>

                    {rep.resolution && (
                      <p className="text-xs text-emerald-800 bg-emerald-900/10 p-2.5 rounded-xl">
                        <strong>Resolution:</strong> {rep.resolution}
                      </p>
                    )}

                    {rep.status === 'open' && (
                      <div className="pt-2 flex justify-end">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(rep);
                            setReportModalOpen(true);
                          }}
                        >
                          Record Resolution
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      </div>{/* end flex-row wrapper */}

      {/* Verification Modal */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title={`Verification Action: ${verifyAction.toUpperCase()}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleVerifySubmit} className="space-y-4">
          {verifyError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          {selectedListing && (
            <div className="text-xs bg-stone-50 p-3 rounded-xl">
              <p className="font-bold text-stone-900">{selectedListing.title}</p>
              <p className="text-stone-500">by {selectedListing.author}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-stone-700">
              Moderator Reason / Note {verifyAction !== 'approve' && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
              placeholder={
                verifyAction === 'return'
                  ? 'e.g. Photo is blurry. Please re-upload a legible copy.'
                  : verifyAction === 'reject'
                  ? 'e.g. Unauthorized reproductions are prohibited.'
                  : 'Optional note for owner'
              }
              className="block w-full rounded-lg border border-stone-300 text-xs p-3 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
              required={verifyAction !== 'approve'}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setVerifyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={verifyAction === 'approve' ? 'primary' : verifyAction === 'reject' ? 'danger' : 'secondary'}
              isLoading={submittingVerify}
            >
              Confirm {verifyAction}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Handover Modal */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title="Assign Handover Slot"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <Dropdown
            label="Select Available Handover Slot (Administrator Pool)"
            options={availableSlots.map((s) => ({
              id: s.id,
              name: `${s.slot_date} (${(s.start_time || '').slice(0, 5)} - ${(s.end_time || '').slice(0, 5)}) at ${s.location_name} (${s.city || s.location_city || ''})`,
            }))}
            value={selectedSlotId}
            onChange={(e) => setSelectedSlotId(e.target.value)}
            required
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submittingSchedule}>
              Assign Slot
            </Button>
          </div>
        </form>
      </Modal>

      {/* Report Resolution Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Record Dispute Resolution"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResolveReportSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Resolution Findings</label>
            <textarea
              rows={3}
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              placeholder="Detail findings and action taken..."
              className="block w-full rounded-lg border text-xs p-3 focus:outline-none"
              required
            />
          </div>

          <Dropdown
            label="Set Report Status"
            options={[
              { id: 'resolved', name: 'Resolved' },
              { id: 'escalated', name: 'Escalate to Administrator' },
            ]}
            value={reportStatus}
            onChange={(e) => setReportStatus(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReportModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Resolution
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffDashboard;
