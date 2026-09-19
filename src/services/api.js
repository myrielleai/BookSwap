import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Add JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bookswap_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Extract data or reject with standardized error
api.interceptors.response.use(
  (response) => {
    // If response returns standard JSON envelope { success, message, data, meta }
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Server responded with non-2xx status
      const resData = error.response.data;
      const errorMessage = resData?.message || 'An unexpected error occurred.';
      const errors = resData?.errors || null;
      
      return Promise.reject({
        status: error.response.status,
        message: errorMessage,
        errors: errors,
        data: resData,
      });
    } else if (error.request) {
      // Request was made but no response received
      return Promise.reject({
        status: 0,
        message: 'Network error. Please check your connection to the BookSwap server.',
      });
    } else {
      return Promise.reject({
        status: 0,
        message: error.message || 'An unknown error occurred.',
      });
    }
  }
);

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
};

export const userService = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  getDashboard: () => api.get('/user/dashboard'),
  deactivateAccount: () => api.put('/user/deactivate'),
  getNotifications: () => api.get('/user/notifications'),
  markNotificationRead: (id) => api.put(`/user/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/user/notifications/read-all'),
  fileReport: (reportData) => api.post('/reports', reportData),
};

export const listingService = {
  getListings: (params) => api.get('/listings', { params }),
  getListing: (id) => api.get(`/listings/${id}`),
  createListing: (formData) => api.post('/listings', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateListing: (id, data) => api.put(`/listings/${id}`, data),
  withdrawListing: (id) => api.delete(`/listings/${id}`),
  addToWatchlist: (id) => api.post(`/listings/${id}/watchlist`),
  removeFromWatchlist: (id) => api.delete(`/listings/${id}/watchlist`),
  getWatchlist: () => api.get('/user/watchlist'),
  getPhotoUrl: (id) => `/api/photos/${id}`,
};

export const categoryService = {
  getGenres: () => api.get('/genres'),
  getFormats: () => api.get('/formats'),
  getAgeCategories: () => api.get('/age-categories'),
  getConditions: () => api.get('/conditions'),
  getMeetupLocations: () => api.get('/meetup-locations'),
};

export const exchangeService = {
  sendRequest: (data) => api.post('/exchanges', data),
  getExchange: (id) => api.get(`/exchanges/${id}`),
  acceptRequest: (id) => api.put(`/exchanges/${id}/accept`),
  declineRequest: (id, decline_reason) => api.put(`/exchanges/${id}/decline`, { decline_reason }),
  withdrawRequest: (id) => api.put(`/exchanges/${id}/withdraw`),
};

export const transactionService = {
  getTransaction: (id) => api.get(`/transactions/${id}`),
  confirmReceipt: (id) => api.put(`/transactions/${id}/confirm`),
};

export const staffService = {
  getDashboard: () => api.get('/staff/dashboard'),
  verifyListing: (id, status, staff_note) => api.put(`/staff/listings/${id}/verify`, { status, staff_note }),
  getRequests: (params) => api.get('/staff/requests', { params }),
  getTransactions: (params) => api.get('/staff/transactions', { params }),
  scheduleHandover: (id, slot_id) => api.post(`/staff/transactions/${id}/schedule`, { slot_id }),
  rescheduleHandover: (id, slot_id) => api.put(`/staff/transactions/${id}/reschedule`, { slot_id }),
  updateStatus: (id, status, cancel_reason) => api.put(`/staff/transactions/${id}/status`, { status, cancel_reason }),
  recordNoShow: (id) => api.put(`/staff/transactions/${id}/no-show`),
  getReports: (params) => api.get('/staff/reports', { params }),
  resolveReport: (id, resolution, status) => api.put(`/staff/reports/${id}`, { resolution, status }),
  getAvailableSlots: () => api.get('/staff/handover-slots'),
};

export const adminService = {
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUserStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  resetPassword: (id, new_password) => api.post(`/admin/users/${id}/reset-password`, { new_password }),
  getDashboard: () => api.get('/admin/dashboard'),
  getSummaryReport: (params) => api.get('/admin/reports/summary', { params }),
  getTopGenresReport: (params) => api.get('/admin/reports/genres', { params }),
  getByCityReport: (params) => api.get('/admin/reports/cities', { params }),
  getByAgeGroupReport: (params) => api.get('/admin/reports/age-groups', { params }),
  getActivityLog: (params) => api.get('/admin/activity-log', { params }),
  createGenre: (name) => api.post('/admin/genres', { name }),
  retireGenre: (id) => api.put(`/admin/genres/${id}/retire`),
  createFormat: (name) => api.post('/admin/formats', { name }),
  retireFormat: (id) => api.put(`/admin/formats/${id}/retire`),
  createAgeCategory: (name) => api.post('/admin/age-categories', { name }),
  retireAgeCategory: (id) => api.put(`/admin/age-categories/${id}/retire`),
  createCondition: (label, description) => api.post('/admin/conditions', { label, description }),
  retireCondition: (id) => api.put(`/admin/conditions/${id}/retire`),
  createMeetupLocation: (data) => api.post('/admin/meetup-locations', data),
  retireMeetupLocation: (id) => api.put(`/admin/meetup-locations/${id}/retire`),
  getSlots: (params) => api.get('/admin/handover-slots', { params }),
  createSlot: (data) => api.post('/admin/handover-slots', data),
  retireSlot: (id) => api.put(`/admin/handover-slots/${id}/retire`),
};

export default api;
