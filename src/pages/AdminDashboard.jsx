import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminService, categoryService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import FormInput from '../components/FormInput';
import Dropdown from '../components/Dropdown';
import { LoadingState, EmptyState } from '../components/LoadingState';
import { validateText, validateCity } from '../utils/validation';
import {
  ShieldCheck,
  User,
  Users,
  List,
  Calendar,
  BarChart3,
  FileText,
  Plus,
  CheckCircle,
  XCircle,
  X,
  TrendingUp,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'users';

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

  const [users, setUsers] = useState([]);
  const [summaryReport, setSummaryReport] = useState(null);
  const [topGenresReport, setTopGenresReport] = useState([]);
  const [cityReport, setCityReport] = useState([]);
  const [activityLog, setActivityLog] = useState([]);

  const [genres, setGenres] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [meetupLocations, setMeetupLocations] = useState([]);
  const [slots, setSlots] = useState([]);

  const [loading, setLoading] = useState(true);

  // New Category Modals
  const [newGenreName, setNewGenreName] = useState('');
  const [newConditionLabel, setNewConditionLabel] = useState('');
  const [newConditionDesc, setNewConditionDesc] = useState('');

  // New Location / Slot Modals
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocCity, setNewLocCity] = useState('');

  const [slotLocId, setSlotLocId] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('10:00');
  const [slotEndTime, setSlotEndTime] = useState('11:00');

<<<<<<< Updated upstream
  // One validation message per taxonomy/slot form, shown under that form.
  const [formErrors, setFormErrors] = useState({});
  const showFormError = (form, message) => setFormErrors((prev) => ({ ...prev, [form]: message }));
  // First field message from the API (e.g. "Date cannot be in the past."), else its summary.
  const apiErrorMessage = (err, fallback) =>
    (err.errors && Object.values(err.errors)[0]) || err.message || fallback;
=======
  // Report Date Range State (Feature F-12)
  const defaultFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const defaultTo = new Date().toISOString().split('T')[0];
  const [reportDateFrom, setReportDateFrom] = useState(defaultFrom);
  const [reportDateTo, setReportDateTo] = useState(defaultTo);
  const [generatingReport, setGeneratingReport] = useState(false);

  const handleGenerateReport = async (e) => {
    if (e) e.preventDefault();
    setGeneratingReport(true);
    try {
      const params = { from: reportDateFrom, to: reportDateTo };
      const [sumRes, genRepRes, cityRepRes] = await Promise.all([
        adminService.getSummaryReport(params).catch(() => ({ data: null })),
        adminService.getTopGenresReport(params).catch(() => ({ data: [] })),
        adminService.getByCityReport(params).catch(() => ({ data: [] })),
      ]);

      if (sumRes.success) setSummaryReport(sumRes.data?.summary || sumRes.data || null);
      if (genRepRes.success) {
        const rows = genRepRes.data?.genres || genRepRes.data?.rows || (Array.isArray(genRepRes.data) ? genRepRes.data : []);
        setTopGenresReport(Array.isArray(rows) ? rows : []);
      }
      if (cityRepRes.success) {
        const rows = cityRepRes.data?.cities || cityRepRes.data?.rows || (Array.isArray(cityRepRes.data) ? cityRepRes.data : []);
        setCityReport(Array.isArray(rows) ? rows : []);
      }
    } catch (err) {
      alert(err.message || 'Failed to generate report.');
    } finally {
      setGeneratingReport(false);
    }
  };
>>>>>>> Stashed changes

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [uRes, sumRes, genRepRes, cityRepRes, actRes, gRes, cRes, locRes, slotRes] = await Promise.all([
        adminService.getUsers(),
        adminService.getSummaryReport().catch(() => ({ data: null })),
        adminService.getTopGenresReport().catch(() => ({ data: [] })),
        adminService.getByCityReport().catch(() => ({ data: [] })),
        adminService.getActivityLog().catch(() => ({ data: [] })),
        categoryService.getGenres(),
        categoryService.getConditions(),
        categoryService.getMeetupLocations(),
        adminService.getSlots().catch(() => ({ data: [] })),
      ]);

      if (uRes.success) setUsers(uRes.data?.users || (Array.isArray(uRes.data) ? uRes.data : []));
      if (sumRes.success) setSummaryReport(sumRes.data?.summary || sumRes.data || null);
      if (genRepRes.success) {
        const rows = genRepRes.data?.genres || genRepRes.data?.rows || (Array.isArray(genRepRes.data) ? genRepRes.data : []);
        setTopGenresReport(Array.isArray(rows) ? rows : []);
      }
      if (cityRepRes.success) {
        const rows = cityRepRes.data?.cities || cityRepRes.data?.rows || (Array.isArray(cityRepRes.data) ? cityRepRes.data : []);
        setCityReport(Array.isArray(rows) ? rows : []);
      }
      if (actRes.success) {
        const rows = actRes.data?.activity_log || actRes.data?.rows || (Array.isArray(actRes.data) ? actRes.data : []);
        setActivityLog(Array.isArray(rows) ? rows : []);
      }
      if (gRes.success) setGenres(gRes.data?.genres || (Array.isArray(gRes.data) ? gRes.data : []));
      if (cRes.success) setConditions(cRes.data?.conditions || (Array.isArray(cRes.data) ? cRes.data : []));
      if (locRes.success) setMeetupLocations(locRes.data?.locations || (Array.isArray(locRes.data) ? locRes.data : []));
      if (slotRes.success) setSlots(slotRes.data?.slots || (Array.isArray(slotRes.data) ? slotRes.data : []));
    } catch (err) {
      console.error('Admin dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  // Helper to extract detailed validation error messages
  const getErrorMessage = (err, fallback = 'Operation failed.') => {
    if (err?.errors && typeof err.errors === 'object') {
      const messages = Object.entries(err.errors).map(([field, msg]) => `• ${field}: ${msg}`);
      if (messages.length > 0) {
        return `${err.message || 'Validation failed'}:\n${messages.join('\n')}`;
      }
    }
    return err?.response?.data?.message || err?.message || fallback;
  };

  // Actions
  const handleUserStatusUpdate = async (userId, newStatus) => {
    try {
      await adminService.updateUserStatus(userId, newStatus);
      fetchAdminData();
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to update user status.'));
    }
  };

  const handleUserRoleUpdate = async (userId, newRole) => {
    try {
      await adminService.updateUserRole(userId, newRole);
      fetchAdminData();
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to update user role.'));
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Permanently delete "${userName}"? This cannot be undone.`)) return;
    try {
      await adminService.deleteUser(userId);
      fetchAdminData();
    } catch (err) {
      alert(getErrorMessage(err, 'Failed to delete user.'));
    }
  };

  const handleAddGenre = async (e) => {
    e.preventDefault();
    const problem = validateText(newGenreName, 'Genre name', 100, true);
    showFormError('genre', problem);
    if (problem) return;
    try {
      await adminService.createGenre(newGenreName.trim());
      setNewGenreName('');
      fetchAdminData();
    } catch (err) {
<<<<<<< Updated upstream
      showFormError('genre', apiErrorMessage(err, 'Failed to add genre.'));
=======
      alert(getErrorMessage(err, 'Failed to add genre.'));
>>>>>>> Stashed changes
    }
  };

  const handleAddCondition = async (e) => {
    e.preventDefault();
    const problem =
      validateText(newConditionLabel, 'Condition label', 50, true) ||
      validateText(newConditionDesc, 'Rubric description', 1000, true);
    showFormError('condition', problem);
    if (problem) return;
    try {
      await adminService.createCondition(newConditionLabel.trim(), newConditionDesc.trim());
      setNewConditionLabel('');
      setNewConditionDesc('');
      fetchAdminData();
    } catch (err) {
<<<<<<< Updated upstream
      showFormError('condition', apiErrorMessage(err, 'Failed to add condition.'));
=======
      alert(getErrorMessage(err, 'Failed to add condition.'));
>>>>>>> Stashed changes
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    const problem =
      validateText(newLocName, 'Location name', 150, true) ||
      validateText(newLocAddress, 'Address', 255, true) ||
      validateText(newLocCity, 'City', 100, true) ||
      validateCity(newLocCity);
    showFormError('location', problem);
    if (problem) return;
    try {
      await adminService.createMeetupLocation({
        name: newLocName.trim(),
        address: newLocAddress.trim(),
        city: newLocCity.trim(),
      });
      setNewLocName('');
      setNewLocAddress('');
      setNewLocCity('');
      fetchAdminData();
    } catch (err) {
<<<<<<< Updated upstream
      showFormError('location', apiErrorMessage(err, 'Failed to add meetup location.'));
=======
      alert(getErrorMessage(err, 'Failed to add meetup location.'));
>>>>>>> Stashed changes
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
<<<<<<< Updated upstream
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let problem = null;
    if (!slotLocId) problem = 'Venue is required.';
    else if (!slotDate) problem = 'Date is required.';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) problem = 'Date must be a valid date.';
    else if (slotDate < today) problem = 'Date cannot be in the past.';
    else if (!slotStartTime || !slotEndTime) problem = 'Start and end times are required.';
    else if (slotEndTime <= slotStartTime) problem = 'End time must be later than the start time.';
    showFormError('slot', problem);
    if (problem) return;
=======
    if (!slotLocId || !slotDate || !slotStartTime || !slotEndTime) return;

    const today = new Date().toISOString().split('T')[0];
    if (slotDate < today) {
      alert(`Validation failed:\n• slot_date: Handover slot date (${slotDate}) cannot be in the past. Today is ${today}.`);
      return;
    }
    if (slotEndTime <= slotStartTime) {
      alert('Validation failed:\n• end_time: End time must be later than start time.');
      return;
    }

>>>>>>> Stashed changes
    try {
      await adminService.createSlot({
        location_id: parseInt(slotLocId),
        slot_date: slotDate,
        start_time: slotStartTime,
        end_time: slotEndTime,
      });
      alert('Handover slot created successfully.');
      setSlotDate('');
      fetchAdminData();
    } catch (err) {
<<<<<<< Updated upstream
      showFormError('slot', apiErrorMessage(err, 'Failed to create slot.'));
=======
      alert(getErrorMessage(err, 'Failed to create slot.'));
>>>>>>> Stashed changes
    }
  };

  if (loading) return <LoadingState message="Loading Administrator Control Console..." />;

  return (
    <div className="flex flex-col gap-0 pb-12">
      {/* ── Welcome Banner ── */}
      {showWelcome && (
        <div
          style={{
            background: 'linear-gradient(135deg, #15803d 0%, #16a34a 60%, #22c55e 100%)',
            animation: 'slideDownFade 0.5s ease forwards',
          }}
          className="relative flex items-center justify-between gap-4 rounded-2xl px-6 py-4 mb-6 shadow-lg text-white overflow-hidden"
        >
          <div className="absolute -top-8 -left-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl shrink-0">👋</div>
            <div>
              <p className="text-base font-bold leading-tight">Welcome back, {welcomeName}!</p>
              <p className="text-xs text-white/80 mt-0.5">You're signed in as Administrator — full control console is ready. ⭐</p>
            </div>
          </div>
          <button
            onClick={() => setShowWelcome(false)}
            className="relative z-10 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors shrink-0"
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
      <Sidebar role="admin" activeTab={currentTab} onTabChange={handleTabChange} />

      <main className="flex-1 space-y-6">
        {/* TAB 1: USER GOVERNANCE */}
        {currentTab === 'users' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-800" />
                  User Account Governance & Approvals
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Approve pending reader registrations, deactivate accounts, and grant Staff volunteer roles.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                  <tr>
                    <th className="p-3.5">User Details</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Registered</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="p-3.5">
                        <p className="font-bold text-stone-900">{u.name}</p>
                        <p className="text-stone-500">{u.email}</p>
                        {u.city && <p className="text-[10px] text-stone-400">{u.city}</p>}
                      </td>
                      <td className="p-3.5">
                        <span className="capitalize font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="p-3.5 text-stone-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        {u.status === 'pending' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleUserStatusUpdate(u.id, 'active')}
                          >
                            Approve Account
                          </Button>
                        )}
                        {u.status === 'active' && u.role !== 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUserStatusUpdate(u.id, 'inactive')}
                          >
                            Deactivate
                          </Button>
                        )}
                        {u.status === 'inactive' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleUserStatusUpdate(u.id, 'active')}
                          >
                            Reactivate
                          </Button>
                        )}
                        {u.role === 'customer' && u.status === 'active' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleUserRoleUpdate(u.id, 'staff')}
                          >
                            Promote to Staff
                          </Button>
                        )}
                        {u.role === 'staff' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUserRoleUpdate(u.id, 'customer')}
                          >
                            Revoke Staff
                          </Button>
                        )}
                        {(u.status === 'pending' || u.status === 'inactive') && u.role !== 'admin' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                          >
                            Delete
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: TAXONOMIES & CATEGORIES */}
        {currentTab === 'taxonomies' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                <List className="w-5 h-5 text-emerald-800" />
                Category & Taxonomy Governance
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Maintain book genres, condition assessment rubrics, and catalog taxonomies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Genres Governance */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-4">
                <h3 className="font-bold text-stone-800 text-sm">Book Genres</h3>
                <form noValidate onSubmit={handleAddGenre} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New genre name..."
                    value={newGenreName}
                    onChange={(e) => setNewGenreName(e.target.value)}
                    className="flex-1 border border-stone-300 rounded-lg text-xs p-2.5 focus:outline-none"
                    required
                  />
                  <Button type="submit" variant="primary" size="sm" icon={Plus}>
                    Add Genre
                  </Button>
                </form>
                {formErrors.genre && (
                  <p className="text-xs text-rose-600 font-medium">{formErrors.genre}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {genres.map((g) => (
                    <span key={g.id} className="px-3 py-1 bg-stone-100 rounded-full text-xs font-semibold text-stone-700">
                      {g.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Conditions Governance */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-4">
                <h3 className="font-bold text-stone-800 text-sm">Condition Grading Rubrics</h3>
                <form noValidate onSubmit={handleAddCondition} className="space-y-2">
                  <input
                    type="text"
                    placeholder="Condition Label (e.g. Near Mint)..."
                    value={newConditionLabel}
                    onChange={(e) => setNewConditionLabel(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg text-xs p-2.5 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Written rubric description shown to users..."
                    value={newConditionDesc}
                    onChange={(e) => setNewConditionDesc(e.target.value)}
                    className="w-full border border-stone-300 rounded-lg text-xs p-2.5 focus:outline-none"
                    required
                  />
                  {formErrors.condition && (
                    <p className="text-xs text-rose-600 font-medium">{formErrors.condition}</p>
                  )}
                  <Button type="submit" variant="primary" size="sm" icon={Plus}>
                    Add Condition Rubric
                  </Button>
                </form>

                <div className="space-y-2 pt-2">
                  {conditions.map((c) => (
                    <div key={c.id} className="p-2.5 bg-stone-50 rounded-xl text-xs">
                      <p className="font-bold text-stone-800">{c.label}</p>
                      <p className="text-stone-500">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HANDOVER VENUES & SLOTS */}
        {currentTab === 'slots' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-800" />
                Handover Meetup Locations & Time Slots Pool
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Define approved community meetup points and scheduled time slots for staff assignments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Meetup Locations */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-4">
                <h3 className="font-bold text-stone-800 text-sm">Add Designated Meetup Location</h3>
                <form noValidate onSubmit={handleAddLocation} className="space-y-2">
                  <FormInput
                    placeholder="Location Name (e.g. Ermita Public Library)"
                    value={newLocName}
                    onChange={(e) => setNewLocName(e.target.value)}
                    required
                  />
                  <FormInput
                    placeholder="Address Instructions"
                    value={newLocAddress}
                    onChange={(e) => setNewLocAddress(e.target.value)}
                    required
                  />
                  <FormInput
                    placeholder="City"
                    value={newLocCity}
                    onChange={(e) => setNewLocCity(e.target.value)}
                    required
                  />
                  {formErrors.location && (
                    <p className="text-xs text-rose-600 font-medium">{formErrors.location}</p>
                  )}
                  <Button type="submit" variant="primary" size="sm" icon={Plus}>
                    Add Meetup Venue
                  </Button>
                </form>

                <div className="space-y-2 pt-2">
                  {meetupLocations.map((loc) => (
                    <div key={loc.id} className="p-3 bg-stone-50 rounded-xl text-xs">
                      <p className="font-bold text-stone-900">{loc.name} ({loc.city})</p>
                      <p className="text-stone-500">{loc.address}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Handover Slots Pool */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-4">
                <h3 className="font-bold text-stone-800 text-sm">Create Handover Slot</h3>
                <form noValidate onSubmit={handleAddSlot} className="space-y-2">
                  <Dropdown
                    label="Venue"
                    options={meetupLocations}
                    value={slotLocId}
                    onChange={(e) => setSlotLocId(e.target.value)}
                    required
                  />
                  <FormInput
                    type="date"
                    label="Date"
                    min={new Date().toISOString().split('T')[0]}
                    value={slotDate}
                    onChange={(e) => setSlotDate(e.target.value)}
                    helperText={`Cannot be in the past. Today is ${new Date().toISOString().split('T')[0]}`}
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FormInput
                      type="time"
                      label="Start Time"
                      value={slotStartTime}
                      onChange={(e) => setSlotStartTime(e.target.value)}
                      required
                    />
                    <FormInput
                      type="time"
                      label="End Time"
                      value={slotEndTime}
                      onChange={(e) => setSlotEndTime(e.target.value)}
                      required
                    />
                  </div>
                  {formErrors.slot && (
                    <p className="text-xs text-rose-600 font-medium">{formErrors.slot}</p>
                  )}
                  <Button type="submit" variant="primary" size="sm" icon={Plus}>
                    Create Time Slot
                  </Button>
                </form>

                <div className="space-y-2 pt-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {slots.map((s) => (
                    <div key={s.id} className="p-2.5 bg-stone-50 rounded-xl text-xs flex justify-between items-center">
                      <div>
                        <p className="font-bold text-stone-800">{s.slot_date} ({s.start_time} - {s.end_time})</p>
                        <p className="text-stone-500">{s.location_name}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.is_available ? 'bg-emerald-900/10 text-emerald-900' : 'bg-stone-200 text-stone-600'}`}>
                        {s.is_available ? 'Available' : 'Booked'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REPORTS & ANALYTICS */}
        {currentTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-800" />
                Platform Analytics & System Metrics
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Periodic reports covering listings posted, exchanges completed, cancellation rates, and regional participation.
              </p>
            </div>

            {/* Date Range Selector & Generate Report Form (Feature F-12) */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm">
              <form onSubmit={handleGenerateReport} className="flex flex-col md:flex-row items-end gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={reportDateFrom}
                    onChange={(e) => setReportDateFrom(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 bg-white"
                    required
                  />
                </div>

                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={reportDateTo}
                    onChange={(e) => setReportDateTo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 bg-white"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  icon={BarChart3}
                  isLoading={generatingReport}
                  className="w-full md:w-auto h-[42px] px-6"
                >
                  Generate Report
                </Button>
              </form>
            </div>

            {/* Metric Cards */}
            {summaryReport && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-1">
                  <p className="text-xs font-semibold text-stone-400">Total Book Listings</p>
                  <p className="text-3xl font-serif font-bold text-stone-900">{summaryReport.listings_posted ?? summaryReport.total_listings ?? 0}</p>
                  <p className="text-[11px] text-emerald-800 font-medium">Catalog size</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-1">
                  <p className="text-xs font-semibold text-stone-400">Exchanges Completed</p>
                  <p className="text-3xl font-serif font-bold text-emerald-800">{summaryReport.exchanges_completed ?? summaryReport.completed_swaps ?? 0}</p>
                  <p className="text-[11px] text-emerald-800 font-medium">Successful peer swaps</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-1">
                  <p className="text-xs font-semibold text-stone-400">Cancellation Rate</p>
                  <p className="text-3xl font-serif font-bold text-rose-600">
                    {summaryReport.cancellation_rate != null ? `${summaryReport.cancellation_rate}%` : '0%'}
                  </p>
                  <p className="text-[11px] text-stone-500 font-medium">Includes no-show rates</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Requested Genres */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-3">
                <h3 className="font-bold text-stone-800 text-sm">Most Requested Reading Genres</h3>
                <div className="space-y-2 text-xs">
                  {Array.isArray(topGenresReport) && topGenresReport.length > 0 ? (
                    topGenresReport.map((g, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-stone-50 rounded-lg">
                        <span className="font-semibold text-stone-800">{g.genre_name || g.name}</span>
                        <span className="font-bold text-emerald-800">{g.request_count} requests</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-stone-400 italic py-2">No genre activity recorded in this period.</p>
                  )}
                </div>
              </div>

              {/* Participation by City */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-3">
                <h3 className="font-bold text-stone-800 text-sm">Regional Reader Activity by City</h3>
                <div className="space-y-2 text-xs">
                  {Array.isArray(cityReport) && cityReport.length > 0 ? (
                    cityReport.map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-stone-50 rounded-lg">
                        <span className="font-semibold text-stone-800">{c.city || 'Unknown'}</span>
                        <span className="font-bold text-emerald-800">
                          {c.active_members ?? c.active_users ?? c.count ?? 0} members {c.completed_exchanges ? `(${c.completed_exchanges} swaps)` : ''}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-stone-400 italic py-2">No regional activity recorded in this period.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SYSTEM AUDIT LOG */}
        {currentTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-800" />
                Administrative System Audit Trail Log
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Tamper-evident activity log tracing who verified, approved, scheduled, or modified given records.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Actor ID</th>
                    <th className="p-3">Entity Type</th>
                    <th className="p-3">Record ID</th>
                    <th className="p-3">Action Verb</th>
                    <th className="p-3">Context Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {activityLog.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/60">
                      <td className="p-3 text-stone-500 font-mono text-[11px]">{log.created_at}</td>
                      <td className="p-3 font-semibold text-stone-800">User #{log.actor_id}</td>
                      <td className="p-3 text-stone-700 capitalize">{log.record_type}</td>
                      <td className="p-3 font-mono">#{log.record_id}</td>
                      <td className="p-3">
                        <span className="font-bold text-emerald-900 bg-emerald-900/10 px-2 py-0.5 rounded">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-stone-600 max-w-xs truncate">{log.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      </div>{/* end flex-row wrapper */}
    </div>
  );
};

export default AdminDashboard;
