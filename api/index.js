// api/index.js — Vercel Serverless Function fallback for BookSwap
// Ensures the entire app works seamlessly when deployed to Vercel (e.g. bookswap-eta.vercel.app)

let USERS = [
  { id: 1, name: 'System Administrator', email: 'admin@bookswap.test', password: 'Password123!', role: 'admin', status: 'active', city: 'Makati', phone: '09171110001', created_at: '2026-01-01T08:00:00Z' },
  { id: 2, name: 'Gabriel Cruz', email: 'moderator@bookswap.test', password: 'Password123!', role: 'staff', status: 'active', city: 'Quezon City', phone: '09171110002', created_at: '2026-01-10T08:00:00Z' },
  { id: 4, name: 'Ana Santos', email: 'ana@bookswap.test', password: 'Password123!', role: 'customer', status: 'active', city: 'Manila', phone: '09181110004', favorite_genres: [1, 3], created_at: '2026-01-15T08:00:00Z' },
  { id: 5, name: 'Marco Reyes', email: 'marco@bookswap.test', password: 'Password123!', role: 'customer', status: 'active', city: 'Pasay', phone: '09181110005', favorite_genres: [2], created_at: '2026-02-01T08:00:00Z' },
];

let LISTINGS = [
  { id: 1, title: 'The Alchemist', author: 'Paulo Coelho', genre: 'Fiction', genre_id: 1, condition: 'Good', status: 'available', owner_id: 4, city: 'Manila', created_at: '2026-03-01T10:00:00Z' },
  { id: 2, title: 'Atomic Habits', author: 'James Clear', genre: 'Self-Help', genre_id: 4, condition: 'Like New', status: 'available', owner_id: 4, city: 'Manila', created_at: '2026-03-05T10:00:00Z' },
  { id: 3, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', genre: 'Classic', genre_id: 6, condition: 'Like New', status: 'available', owner_id: 4, city: 'Manila', created_at: '2026-03-15T10:00:00Z' },
  { id: 4, title: 'Sapiens: A Brief History', author: 'Yuval Noah Harari', genre: 'History', genre_id: 5, condition: 'Good', status: 'available', owner_id: 1, city: 'Makati', created_at: '2026-03-12T10:00:00Z' },
  { id: 5, title: 'Dune (Deluxe Ed.)', author: 'Frank Herbert', genre: 'Sci-Fi', genre_id: 2, condition: 'Like New', status: 'available', owner_id: 5, city: 'Pasay', created_at: '2026-03-10T10:00:00Z' },
  { id: 6, title: '1984', author: 'George Orwell', genre: 'Fiction', genre_id: 1, condition: 'Fair', status: 'available', owner_id: 5, city: 'Pasay', created_at: '2026-03-18T10:00:00Z' },
];

let EXCHANGES = [
  { id: 1, target_title: 'The Midnight Library', offered_title: 'Klara and the Sun', requester_name: 'Ana Santos', requester_id: 4, owner_name: 'Marco Reyes', owner_id: 5, status: 'accepted', slot_date: 'Oct 18, 2026', start_time: '2:00 PM', end_time: '3:00 PM', location_name: 'SM Mall of Asia Central Hub', location_address: 'Seaside Blvd, Pasay', requester_confirmed: false, owner_confirmed: true, created_at: '2026-10-02T10:00:00Z' },
  { id: 2, target_title: 'Atomic Habits', offered_title: 'Dune (Deluxe Ed.)', requester_name: 'Elena Rostova', requester_id: 2, owner_name: 'Ana Santos', owner_id: 4, message: 'Would love to trade for Atomic Habits!', status: 'pending', created_at: '2026-10-04T14:30:00Z' },
];

let NOTIFICATIONS = [
  { id: 1, user_id: 4, type: 'exchange_request', message: 'Elena offered Dune in exchange for Atomic Habits', is_read: false, created_at: '2026-10-04T14:30:00Z' },
  { id: 2, user_id: 4, type: 'exchange_accepted', message: 'Your exchange request for The Midnight Library was accepted!', is_read: false, created_at: '2026-10-03T11:00:00Z' },
  { id: 3, user_id: 4, type: 'system', message: 'Welcome to BookSwap community!', is_read: true, created_at: '2026-01-15T08:00:00Z' },
];

export default async function handler(req, res) {
  // Global CORS Headers
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
  const tokenMatch = authHeader.match(/user-(\d+)/);
  const tokenUserId = tokenMatch ? parseInt(tokenMatch[1], 10) : null;
  const currentUser = USERS.find(u => u.id === tokenUserId) || USERS[2]; // Default Ana Reader

  // TAXONOMIES
  if (method === 'GET' && path === '/api/genres') {
    return res.json({ success: true, message: 'Genres retrieved.', data: [
      { id: 1, name: 'Fiction' }, { id: 2, name: 'Non-Fiction' }, { id: 3, name: 'Fantasy' },
      { id: 4, name: 'Self-Help' }, { id: 5, name: 'History' }, { id: 6, name: 'Classics' }
    ]});
  }
  if (method === 'GET' && path === '/api/formats') {
    return res.json({ success: true, data: [{ id: 1, name: 'Paperback' }, { id: 2, name: 'Hardcover' }, { id: 3, name: 'Mass Market Paperback' }] });
  }
  if (method === 'GET' && path === '/api/age-categories') {
    return res.json({ success: true, data: [{ id: 1, name: "Children's" }, { id: 2, name: 'Young Adult' }, { id: 3, name: 'Adult' }] });
  }
  if (method === 'GET' && path === '/api/conditions') {
    return res.json({ success: true, data: [
      { id: 1, label: 'Like New', description: 'Cover and pages intact with no markings.' },
      { id: 2, label: 'Good', description: 'Light signs of reading, clean pages.' },
      { id: 3, label: 'Fair', description: 'Noticeable shelf wear or creased spine.' }
    ]});
  }
  if (method === 'GET' && path === '/api/meetup-locations') {
    return res.json({ success: true, data: [
      { id: 1, name: 'SM Mall of Asia Central Hub', address: 'Seaside Blvd, Pasay, Metro Manila' },
      { id: 2, name: 'Robinsons Place Manila Hub', address: 'Pedro Gil St, Ermita, Manila' },
      { id: 3, name: 'Ayala Malls Manila Bay', address: 'Diosdado Macapagal Blvd, Parañaque' }
    ]});
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
        user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status }
      }
    });
  }

  // AUTH REGISTER
  if (method === 'POST' && path === '/api/auth/register') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const newUser = {
      id: USERS.length + 1,
      name: body.name || 'New Reader',
      email: (body.email || '').toLowerCase().trim(),
      password: body.password || 'Password123!',
      role: 'customer',
      status: 'pending',
      city: body.city || 'Manila',
      created_at: new Date().toISOString()
    };
    USERS.push(newUser);
    return res.status(201).json({ success: true, message: 'Registration submitted! Awaiting verification.', data: { user_id: newUser.id } });
  }

  // AUTH LOGOUT
  if (method === 'POST' && path === '/api/auth/logout') {
    return res.json({ success: true, message: 'Logged out successfully.' });
  }

  // USER PROFILE
  if (method === 'GET' && path === '/api/user/profile') {
    return res.json({ success: true, message: 'Profile retrieved.', data: currentUser });
  }
  if (method === 'PUT' && path === '/api/user/profile') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    Object.assign(currentUser, body);
    return res.json({ success: true, message: 'Profile updated.', data: currentUser });
  }

  // USER DASHBOARD
  if (method === 'GET' && path === '/api/user/dashboard') {
    const myListings = LISTINGS.filter(l => l.owner_id === currentUser.id);
    const sentReqs = [{ id: 1, target_title: 'Sapiens: A Brief History', offered_title: 'The Alchemist', status: 'pending', created_at: '2026-10-02T10:00:00Z' }];
    const recReqs = [{ id: 2, requester_name: 'Elena Rostova', target_title: 'Atomic Habits', offered_title: 'Dune (Deluxe Ed.)', message: 'Would love to trade for Atomic Habits!', status: 'pending', created_at: '2026-10-04T14:30:00Z' }];

    return res.json({
      success: true,
      message: 'Dashboard data retrieved.',
      data: {
        completed_exchanges: 3,
        listings: myListings,
        sent_requests: sentReqs,
        received_requests: recReqs,
        transactions: EXCHANGES,
        stats: {
          total_listings: myListings.length,
          active_listings: myListings.filter(l => l.status === 'available').length,
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
    return res.json({ success: true, data: NOTIFICATIONS.filter(n => n.user_id === currentUser.id) });
  }
  if (method === 'PUT' && path === '/api/user/notifications/read-all') {
    NOTIFICATIONS.forEach(n => { if (n.user_id === currentUser.id) n.is_read = true; });
    return res.json({ success: true, message: 'All notifications marked as read.' });
  }
  if (method === 'PUT' && path.match(/^\/api\/user\/notifications\/(\d+)\/read$/)) {
    const nid = parseInt(path.split('/')[4], 10);
    const notif = NOTIFICATIONS.find(n => n.id === nid);
    if (notif) notif.is_read = true;
    return res.json({ success: true });
  }

  // WATCHLIST
  if (method === 'GET' && path === '/api/user/watchlist') {
    return res.json({ success: true, data: LISTINGS.slice(0, 3) });
  }

  // LISTINGS
  if (method === 'GET' && path === '/api/listings') {
    return res.json({ success: true, message: 'Listings retrieved.', data: LISTINGS.filter(l => l.status === 'available') });
  }
  if (method === 'POST' && path === '/api/listings') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const newListing = {
      id: LISTINGS.length + 1,
      title: body.title || 'Untitled',
      author: body.author || 'Unknown',
      genre: body.genre || 'Fiction',
      condition: body.condition || 'Like New',
      status: 'available',
      owner_id: currentUser.id,
      city: currentUser.city || 'Manila',
      created_at: new Date().toISOString()
    };
    LISTINGS.unshift(newListing);
    return res.status(201).json({ success: true, message: 'Book listed successfully.', data: newListing });
  }
  if (method === 'DELETE' && path.match(/^\/api\/listings\/(\d+)$/)) {
    const lid = parseInt(path.split('/')[3], 10);
    LISTINGS = LISTINGS.filter(l => l.id !== lid);
    return res.json({ success: true, message: 'Listing withdrawn.' });
  }

  // EXCHANGES
  if (method === 'POST' && path === '/api/exchanges') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const newEx = {
      id: EXCHANGES.length + 1,
      target_title: 'Selected Book',
      offered_title: 'Offered Book',
      requester_name: currentUser.name,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    EXCHANGES.push(newEx);
    return res.status(201).json({ success: true, message: 'Swap proposal submitted.', data: newEx });
  }
  if (method === 'PUT' && path.match(/^\/api\/exchanges\/(\d+)\/accept$/)) {
    return res.json({ success: true, message: 'Swap proposal accepted.' });
  }
  if (method === 'PUT' && path.match(/^\/api\/exchanges\/(\d+)\/decline$/)) {
    return res.json({ success: true, message: 'Swap proposal declined.' });
  }
  if (method === 'PUT' && path.match(/^\/api\/exchanges\/(\d+)\/withdraw$/)) {
    return res.json({ success: true, message: 'Swap request withdrawn.' });
  }

  // TRANSACTIONS
  if (method === 'PUT' && path.match(/^\/api\/transactions\/(\d+)\/confirm$/)) {
    return res.json({ success: true, message: 'Handover receipt confirmed.' });
  }

  // STAFF DASHBOARD & WORKFLOWS
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
  if (method === 'GET' && path === '/api/staff/handover-slots') {
    return res.json({ success: true, data: [
      { id: 1, slot_date: '2026-10-18', start_time: '14:00', end_time: '15:00', location_name: 'SM Mall of Asia' },
      { id: 2, slot_date: '2026-10-19', start_time: '10:00', end_time: '11:00', location_name: 'Robinsons Place Manila' }
    ]});
  }
  if (method === 'GET' && path === '/api/staff/requests') {
    return res.json({ success: true, data: [] });
  }
  if (method === 'GET' && path === '/api/staff/transactions') {
    return res.json({ success: true, data: EXCHANGES });
  }
  if (method === 'GET' && path === '/api/staff/reports') {
    return res.json({ success: true, data: [] });
  }

  // ADMIN DASHBOARD & WORKFLOWS
  if (method === 'GET' && path === '/api/admin/dashboard') {
    return res.json({
      success: true,
      message: 'Dashboard data retrieved.',
      data: {
        counts: { total_users: USERS.length, active_users: 3, pending_users: 1, total_listings: LISTINGS.length },
        recent_activity: [],
        genres: [{ name: 'Fiction', total: 10 }, { name: 'Self-Help', total: 6 }]
      }
    });
  }
  if (method === 'GET' && path === '/api/admin/users') {
    return res.json({ success: true, data: USERS });
  }
  if (method === 'GET' && path === '/api/admin/reports/summary') {
    return res.json({ success: true, data: { completed_exchanges: 12, total_listings: LISTINGS.length, active_members: 8 } });
  }
  if (method === 'GET' && path === '/api/admin/reports/genres') {
    return res.json({ success: true, data: [{ genre: 'Fiction', count: 12 }, { genre: 'Self-Help', count: 8 }] });
  }
  if (method === 'GET' && path === '/api/admin/reports/cities') {
    return res.json({ success: true, data: [{ city: 'Manila', count: 15 }, { city: 'Quezon City', count: 9 }] });
  }
  if (method === 'GET' && path === '/api/admin/reports/age-groups') {
    return res.json({ success: true, data: [{ age_group: 'Adult', count: 18 }, { age_group: 'Young Adult', count: 10 }] });
  }
  if (method === 'GET' && path === '/api/admin/activity-log') {
    return res.json({ success: true, data: [] });
  }

  // Catch-all
  return res.json({ success: true, message: 'API Route handled', data: [] });
}
