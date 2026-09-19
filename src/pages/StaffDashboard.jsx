import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { staffService, categoryService } from '../services/api';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'verifications';

  const [dashboardData, setDashboardData] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verification action modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [verifyAction, setVerifyAction] = useState('approve'); // approve, return, reject
  const [staffNote, setStaffNote] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

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
      const [dashRes, slotsRes, reportsRes] = await Promise.all([
        staffService.getDashboard(),
        staffService.getAvailableSlots().catch(() => ({ data: [] })),
        staffService.getReports().catch(() => ({ data: [] })),
      ]);

      if (dashRes.success) setDashboardData(dashRes.data);
      if (slotsRes.success) setAvailableSlots(slotsRes.data.slots || slotsRes.data || []);
      if (reportsRes.success) setReports(reportsRes.data.reports || reportsRes.data || []);
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
    try {
      const statusMap = {
        approve: 'available',
        return: 'returned',
        reject: 'rejected',
      };
      await staffService.verifyListing(selectedListing.id, statusMap[verifyAction], staffNote);
      setVerifyModalOpen(false);
      setStaffNote('');
      fetchStaffData();
    } catch (err) {
      alert(err.message || 'Verification update failed.');
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

  const unverifiedListings = dashboardData?.unverified_listings || [];
  const unscheduledTxs = dashboardData?.unscheduled_transactions || [];
  const todayHandovers = dashboardData?.today_handovers || [];
  const allTxs = dashboardData?.transactions || [];

  return (
    <div className="flex flex-col lg:flex-row gap-8 pb-12">
      <Sidebar role="staff" activeTab={currentTab} onTabChange={handleTabChange} />

      <main className="flex-1 space-y-6">
        {/* TAB 1: LISTING VERIFICATIONS */}
        {currentTab === 'verifications' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Pending Listing Verifications Queue
              </h2>
              <p className="text-xs text-slate-500 mt-1">
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
                  const photoUrl = item.cover_photo_path
                    ? (item.cover_photo_path.startsWith('http') ? item.cover_photo_path : `/${item.cover_photo_path}`)
                    : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600';

                  return (
                    <div key={item.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
                      <div className="p-4 space-y-3">
                        <div className="flex gap-4">
                          <img
                            src={photoUrl}
                            alt={item.title}
                            className="w-24 h-32 object-cover rounded-xl border border-slate-200 shrink-0"
                          />
                          <div className="space-y-1 text-xs">
                            <span className="font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                              {item.genre_name}
                            </span>
                            <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                            <p className="text-slate-500">by {item.author}</p>
                            <p className="text-slate-600 pt-1">
                              <strong>Condition:</strong> {item.condition_label || 'Good'}
                            </p>
                            <p className="text-slate-500">Owner: {item.owner_name} ({item.city})</p>
                          </div>
                        </div>

                        {item.preferred_return && (
                          <div className="p-2 bg-slate-50 rounded-lg text-xs text-slate-600">
                            <strong>Wants in return:</strong> {item.preferred_return}
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedListing(item);
                            setVerifyAction('return');
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Handover Scheduling Queue
              </h2>
              <p className="text-xs text-slate-500 mt-1">
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
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          Transaction #{tx.id}
                        </span>
                        <StatusBadge status={tx.status} />
                      </div>
                      <p className="text-slate-700">
                        Swap: <strong className="text-brand-700">{tx.target_title}</strong> &harr; <strong>{tx.offered_title}</strong>
                      </p>
                      <p className="text-slate-500">
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                All Supervised Transactions
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Monitor status progression, record no-show infractions, or cancel transactions.
              </p>
            </div>

            <div className="space-y-4">
              {allTxs.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Transaction #{tx.id}</span>
                      <StatusBadge status={tx.status} />
                    </div>
                    <span className="text-xs text-slate-400">
                      Reschedule count: {tx.reschedule_count}/1
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                    <div>
                      <p className="text-slate-500">Target Book: <strong>{tx.target_title}</strong></p>
                      <p className="text-slate-500">Owner: {tx.owner_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Offered Book: <strong>{tx.offered_title}</strong></p>
                      <p className="text-slate-500">Requester: {tx.requester_name}</p>
                    </div>
                  </div>

                  {tx.status === 'scheduled' && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button
                        variant="danger"
                        size="sm"
                        icon={XCircle}
                        onClick={() => handleRecordNoShow(tx.id)}
                      >
                        Record No-Show & Reset Books
                      </Button>
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Dispute & Discrepancy Reports
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Review reports on misdescribed conditions, no-shows, and inappropriate listings.
              </p>
            </div>

            {reports.length === 0 ? (
              <EmptyState icon={CheckCircle} title="No open dispute reports" description="All reports are resolved." />
            ) : (
              <div className="space-y-4">
                {reports.map((rep) => (
                  <div key={rep.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full uppercase">
                        {rep.report_type.replace(/_/g, ' ')}
                      </span>
                      <StatusBadge status={rep.status} />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">
                      Reported by {rep.reporter_name}
                    </p>
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl italic">
                      "{rep.description}"
                    </p>

                    {rep.resolution && (
                      <p className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl">
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

      {/* Verification Modal */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title={`Verification Action: ${verifyAction.toUpperCase()}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleVerifySubmit} className="space-y-4">
          {selectedListing && (
            <div className="text-xs bg-slate-50 p-3 rounded-xl">
              <p className="font-bold text-slate-900">{selectedListing.title}</p>
              <p className="text-slate-500">by {selectedListing.author}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
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
              className="block w-full rounded-lg border border-slate-300 text-xs p-3 focus:ring-1 focus:ring-brand-500 focus:outline-none"
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
              name: `${s.slot_date} (${s.start_time} - ${s.end_time}) at ${s.location_name} (${s.city})`,
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
