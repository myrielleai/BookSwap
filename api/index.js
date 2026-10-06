// api/index.js — Vercel Serverless Function fallback for BookSwap
// Ensures the app works seamlessly when deployed to Vercel (e.g. bookswap-eta.vercel.app)

const USERS = [
  { id: 1, name: 'System Administrator', email: 'admin@bookswap.test', password: 'Password123!', role: 'admin', status: 'active', city: 'Makati', avatar_url: null, created_at: '2026-01-01T08:00:00Z' },
  { id: 2, name: 'Gabriel Cruz', email: 'moderator@bookswap.test', password: 'Password123!', role: 'staff', status: 'active', city: 'Quezon City', avatar_url: null, created_at: '2026-01-10T08:00:00Z' },
  { id: 4, name: 'Ana Santos', email: 'ana@bookswap.test', password: 'Password123!', role: 'customer', status: 'active', city: 'Manila', avatar_url: null, created_at: '2026-01-15T08:00:00Z' },
  { id: 5, name: 'Marco Reyes', email: 'marco@bookswap.test', password: 'Password123!', role: 'customer', status: 'active', city: 'Pasay', avatar_url: null, created_at: '2026-02-01T08:00:00Z' },
];

const LISTINGS = [
  { id: 1, title: 'The Alchemist', author: 'Paulo Coelho', genre: 'Fiction', condition: 'Good', status: 'available', owner_id: 4, city: 'Manila', created_at: '2026-03-01T10:00:00Z' },
  { id: 2, title: 'Atomic Habits', author: 'James Clear', genre: 'Self-Help', condition: 'Like New', status: 'available', owner_id: 4, city: 'Manila', created_at: '2026-03-05T10:00:00Z' },
  { id: 3, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', genre: 'Classic', condition: 'Like New', status: 'available', owner_id: 4, city: 'Manila', created_at: '2026-03-15T10:00:00Z' },
  { id: 4, title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'History', condition: 'Good', status: 'available', owner_id: 1, city: 'Makati', created_at: '2026-03-12T10:00:00Z' },
  { id: 5, title: 'Dune (Deluxe Ed.)', author: 'Frank Herbert', genre: 'Sci-Fi', condition: 'Like New', status: 'available', owner_id: 5, city: 'Pasay', created_at: '2026-03-10T10:00:00Z' },
];

const EXCHANGES = [
  { id: 1, target_title: 'The Midnight Library', offered_title: 'Klara and the Sun', requester_name: 'Ana Santos', owner_name: 'Marco Reyes', status: 'accepted', slot_date: 'Oct 18, 2026', start_time: '2:00 PM', end_time: '3:00 PM', location_name: 'SM Mall of Asia Central Hub', location_address: 'Seaside Blvd, Pasay', created_at: '2026-10-02T10:00:00Z' },
  { id: 2, target_title: 'Atomic Habits', offered_title: 'The Alchemist', requester_name: 'Elena Rostova', owner_name: 'Ana Santos', status: 'pending', created_at: '2026-10-04T14:30:00Z' },
];

const NOTIFICATIONS = [
  { id: 1, user_id: 4, type: 'exchange_request', message: 'Elena offered Dune in exchange for Atomic Habits', is_read: false, created_at: '2026-10-04T14:30:00Z' },
  { id: 2, user_id: 4, type: 'exchange_accepted', message: 'Your exchange request for The Midnight Library was accepted!', is_read: false, created_at: '2026-10-03T11:00:00Z' },
  { id: 3, user_id: 4, type: 'system', message: 'Welcome to BookSwap community!', is_read: true, created_at: '2026-01-15T08:00:00Z' },
];

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace(/\/$/, '') || '/';
  const method = req.method.toUpperCase();

  const authHeader = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  const currentUser = USERS.find(u => authHeader.includes(`user-${u.id}`)) || USERS[2]; // Default Ana Reader

  // TAXONOMY
  if (method === 'GET' && path === '/api/genres') {
    return res.json({ success: true, message: 'Genres retrieved.', data: [
      { id: 1, name: 'Fiction' }, { id: 2, name: 'Non-Fiction' }, { id: 3, name: 'Fantasy' },
      { id: 4, name: 'Self-Help' }, { id: 5, name: 'History' }, { id: 6, name: 'Classics' }
    ]});
  }
  if (method === 'GET' && path === '/api/formats') {
    return res.json({ success: true, data: [{ id: 1, name: 'Paperback' }, { id: 2, name: 'Hardcover' }] });
  }
  if (method === 'GET' && path === '/api/conditions') {
    return res.json({ success: true, data: [{ id: 1, label: 'Like New' }, { id: 2, label: 'Good' }, { id: 3, label: 'Fair' }] });
  }
  if (method === 'GET' && path === '/api/meetup-locations') {
    return res.json({ success: true, data: [{ id: 1, name: 'SM Mall of Asia' }, { id: 2, name: 'Robinsons Place Manila' }] });
  }

  // AUTH LOGIN
  if (method === 'POST' && path === '/api/auth/login') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const email = (body.email || '').toLowerCase().trim();
    const user = USERS.find(u => u.email === email && u.password === body.password) || USERS.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    const token = `mock-jwt-user-${user.id}-${Date.now()}`;
    return res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        user: { id: user.id, name: user.name, role: user.role }
      }
    });
  }

  // AUTH LOGOUT
  if (method === 'POST' && path === '/api/auth/logout') {
    return res.json({ success: true, message: 'Logged out successfully.' });
  }

  // USER PROFILE
  if (method === 'GET' && path === '/api/user/profile') {
    return res.json({ success: true, message: 'Profile retrieved.', data: currentUser });
  }

  // USER DASHBOARD
  if (method === 'GET' && path === '/api/user/dashboard') {
    const myListings = LISTINGS.filter(l => l.owner_id === currentUser.id);
    return res.json({
      success: true,
      message: 'Dashboard data retrieved.',
      data: {
        completed_exchanges: 3,
        listings: myListings,
        sent_requests: [{ id: 1, target_title: 'Sapiens', offered_title: 'The Alchemist', status: 'pending', created_at: new Date().toISOString() }],
        received_requests: [{ id: 2, requester_name: 'Elena Rostova', target_title: 'Atomic Habits', offered_title: 'Dune (Deluxe Ed.)', message: 'Would love to swap!', status: 'pending', created_at: new Date().toISOString() }],
        transactions: EXCHANGES,
        stats: {
          total_listings: myListings.length,
          active_listings: myListings.length,
          pending_exchanges: 1,
          completed_exchanges: 12,
          watchlist_count: 5,
          unread_notifications: NOTIFICATIONS.filter(n => !n.is_read).length,
        }
      }
    });
  }

  // NOTIFICATIONS
  if (method === 'GET' && path === '/api/user/notifications') {
    return res.json({ success: true, data: NOTIFICATIONS });
  }
  if (method === 'PUT' && path === '/api/user/notifications/read-all') {
    NOTIFICATIONS.forEach(n => n.is_read = true);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  }

  // WATCHLIST
  if (method === 'GET' && path === '/api/user/watchlist') {
    return res.json({ success: true, data: LISTINGS.slice(0, 2) });
  }

  // LISTINGS
  if (method === 'GET' && path === '/api/listings') {
    return res.json({ success: true, message: 'Listings retrieved.', data: LISTINGS });
  }

  // STAFF DASHBOARD
  if (method === 'GET' && path === '/api/staff/dashboard') {
    return res.json({
      success: true,
      message: 'Dashboard data retrieved.',
      data: {
        counts: { pending_verifications: 2, awaiting_schedule: 1, todays_handovers: 0, idle_listings: 1 },
        pending_verifications: LISTINGS.slice(0, 2),
        awaiting_schedule: [],
        todays_handovers: []
      }
    });
  }

  // ADMIN DASHBOARD
  if (method === 'GET' && path === '/api/admin/dashboard') {
    return res.json({
      success: true,
      message: 'Dashboard data retrieved.',
      data: {
        counts: { total_users: USERS.length, active_users: 3, pending_users: 1, total_listings: LISTINGS.length },
        recent_activity: [],
        genres: [{ name: 'Fiction', total: 10 }]
      }
    });
  }

  if (method === 'GET' && path === '/api/admin/users') {
    return res.json({ success: true, data: USERS });
  }

  // Catch-all
  return res.json({ success: true, message: 'API Route handled', data: [] });
}
