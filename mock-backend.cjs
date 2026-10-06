const http = require('http');

const USERS = [
  { id: 1, name: 'Ana Reader', email: 'ana@bookswap.test', password: 'Password123!', role: 'customer', status: 'active', city: 'Manila', avatar_url: null, created_at: '2024-01-15T08:00:00Z' },
  { id: 2, name: 'Moderator Staff', email: 'moderator@bookswap.test', password: 'Password123!', role: 'staff', status: 'active', city: 'Quezon City', avatar_url: null, created_at: '2024-01-10T08:00:00Z' },
  { id: 3, name: 'Admin User', email: 'admin@bookswap.test', password: 'Password123!', role: 'admin', status: 'active', city: 'Makati', avatar_url: null, created_at: '2024-01-01T08:00:00Z' },
];
const LISTINGS = [
  { id: 1, title: 'The Alchemist', author: 'Paulo Coelho', genre: 'Fiction', condition: 'Good', status: 'available', owner_id: 1, city: 'Manila', created_at: '2024-03-01T10:00:00Z' },
  { id: 2, title: 'Atomic Habits', author: 'James Clear', genre: 'Self-Help', condition: 'Like New', status: 'available', owner_id: 1, city: 'Manila', created_at: '2024-03-05T10:00:00Z' },
  { id: 3, title: "Harry Potter", author: 'J.K. Rowling', genre: 'Fantasy', condition: 'Fair', status: 'pending', owner_id: 2, city: 'Quezon City', created_at: '2024-03-10T10:00:00Z' },
  { id: 4, title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'History', condition: 'Good', status: 'available', owner_id: 3, city: 'Makati', created_at: '2024-03-12T10:00:00Z' },
  { id: 5, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', genre: 'Classic', condition: 'Like New', status: 'available', owner_id: 1, city: 'Manila', created_at: '2024-03-15T10:00:00Z' },
];
const EXCHANGES = [
  { id: 1, listing_id: 3, requester_id: 1, owner_id: 2, status: 'pending', message: 'I would love to swap!', created_at: '2024-03-20T10:00:00Z' },
  { id: 2, listing_id: 1, requester_id: 2, owner_id: 1, status: 'accepted', message: 'Can we swap this weekend?', created_at: '2024-03-18T10:00:00Z' },
];
const NOTIFICATIONS = [
  { id: 1, user_id: 1, type: 'exchange_request', message: 'Someone requested your listing "The Alchemist"', is_read: false, created_at: '2024-03-20T10:00:00Z' },
  { id: 2, user_id: 1, type: 'exchange_accepted', message: 'Your exchange request was accepted!', is_read: false, created_at: '2024-03-19T10:00:00Z' },
  { id: 3, user_id: 1, type: 'system', message: 'Welcome to BookSwap!', is_read: true, created_at: '2024-01-15T08:00:00Z' },
];

const SESSIONS = {};
function generateToken(userId) { const t = 'mock-jwt-' + userId + '-' + Date.now(); SESSIONS[t] = userId; return t; }
function getUserFromToken(req) { const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim(); const uid = SESSIONS[auth]; return uid ? USERS.find(u => u.id === uid) || USERS[0] : USERS[0]; }

const CORS_HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' };
function sendJSON(res, data, status = 200) { res.writeHead(status, CORS_HEADERS); res.end(JSON.stringify(data)); }
function ok(res, data, status = 200) { sendJSON(res, { success: true, data }, status); }
function fail(res, msg, status = 400) { sendJSON(res, { success: false, message: msg }, status); }
function readBody(req) { return new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => { try { r(JSON.parse(b)); } catch { r({}); } }); }); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:8765');
  const path = url.pathname.replace(/\/$/, '') || '/';
  const method = req.method.toUpperCase();
  if (method === 'OPTIONS') { res.writeHead(204, CORS_HEADERS); return res.end(); }
  console.log('[' + new Date().toLocaleTimeString() + '] ' + method + ' ' + path);

  // AUTH - login returns { success, data: { token, user } }
  if (method === 'POST' && path === '/api/auth/login') {
    const { email, password } = await readBody(req);
    const user = USERS.find(u => u.email === email && u.password === password);
    if (!user) return fail(res, 'Invalid email or password.', 401);
    const token = generateToken(user.id);
    const { password: _, ...safe } = user;
    return ok(res, { token, user: safe });
  }
  if (method === 'POST' && path === '/api/auth/register') {
    const { name, email, password, city } = await readBody(req);
    if (!name || !email || !password) return fail(res, 'Name, email, and password are required.');
    if (USERS.find(u => u.email === email)) return fail(res, 'Email already in use.');
    const newUser = { id: USERS.length + 1, name, email, password, role: 'customer', status: 'active', city: city || '', avatar_url: null, created_at: new Date().toISOString() };
    USERS.push(newUser);
    const token = generateToken(newUser.id);
    const { password: _, ...safe } = newUser;
    return ok(res, { token, user: safe }, 201);
  }
  if (method === 'POST' && path === '/api/auth/logout') { const t = (req.headers['authorization'] || '').replace('Bearer ', '').trim(); delete SESSIONS[t]; return sendJSON(res, { success: true }); }

  // USER
  if (method === 'GET' && path === '/api/user/profile') {
    const u = getUserFromToken(req); if (!u) return fail(res, 'Unauthorized.', 401);
    const { password: _, ...safe } = u;
    return ok(res, safe);
  }
  if (method === 'GET' && path === '/api/user/dashboard') {
    const u = getUserFromToken(req); if (!u) return fail(res, 'Unauthorized.', 401);
    const myL = LISTINGS.filter(l => l.owner_id === u.id);
    const myE = EXCHANGES.filter(e => e.requester_id === u.id || e.owner_id === u.id);
    return ok(res, { user: { id: u.id, name: u.name, email: u.email, role: u.role, city: u.city }, stats: { total_listings: myL.length, active_listings: myL.filter(l => l.status === 'available').length, pending_exchanges: myE.filter(e => e.status === 'pending').length, completed_exchanges: 0, watchlist_count: 2, unread_notifications: NOTIFICATIONS.filter(n => n.user_id === u.id && !n.is_read).length }, recent_listings: myL.slice(0, 3), recent_exchanges: myE.slice(0, 5) });
  }
  if (method === 'GET' && path === '/api/user/notifications') { const u = getUserFromToken(req); if (!u) return fail(res, 'Unauthorized.', 401); return ok(res, NOTIFICATIONS.filter(n => n.user_id === u.id)); }
  if (method === 'PUT' && path === '/api/user/notifications/read-all') { const u = getUserFromToken(req); if (!u) return fail(res, 'Unauthorized.', 401); NOTIFICATIONS.forEach(n => { if (n.user_id === u.id) n.is_read = true; }); return sendJSON(res, { success: true }); }
  if (method === 'GET' && path === '/api/user/watchlist') { const u = getUserFromToken(req); if (!u) return fail(res, 'Unauthorized.', 401); return ok(res, []); }

  // LISTINGS
  if (method === 'GET' && path === '/api/listings') { const avail = LISTINGS.filter(l => l.status === 'available'); return ok(res, avail); }
  const lm = path.match(/^\/api\/listings\/(\d+)$/);
  if (method === 'GET' && lm) { const l = LISTINGS.find(x => x.id === parseInt(lm[1])); return l ? ok(res, l) : fail(res, 'Not found.', 404); }

  // STAFF
  if (method === 'GET' && path === '/api/staff/dashboard') {
    const u = getUserFromToken(req); if (!u) return fail(res, 'Unauthorized.', 401); if (u.role !== 'staff' && u.role !== 'admin') return fail(res, 'Forbidden.', 403);
    return ok(res, { user: { id: u.id, name: u.name, email: u.email, role: u.role }, stats: { pending_verifications: 3, pending_transactions: 5, open_reports: 2, completed_today: 4, total_listings: LISTINGS.length, total_users: USERS.length }, pending_listings: LISTINGS.filter(l => l.status === 'pending'), recent_transactions: [], open_reports: [] });
  }
  if (method === 'GET' && path === '/api/staff/requests') { const u = getUserFromToken(req); if (!u) return fail(res, 'Unauthorized.', 401); return ok(res, []); }
  if (method === 'GET' && path === '/api/staff/transactions') { const u = getUserFromToken(req); if (!u) return fail(res, 'Unauthorized.', 401); return ok(res, []); }
  if (method === 'GET' && path === '/api/staff/reports') { const u = getUserFromToken(req); if (!u) return fail(res, 'Unauthorized.', 401); return ok(res, []); }
  if (method === 'GET' && path === '/api/staff/handover-slots') { const u = getUserFromToken(req); if (!u) return fail(res, 'Unauthorized.', 401); return ok(res, []); }

  // ADMIN
  if (method === 'GET' && path === '/api/admin/dashboard') {
    const u = getUserFromToken(req); if (!u) return fail(res, 'Unauthorized.', 401); if (u.role !== 'admin') return fail(res, 'Forbidden.', 403);
    return ok(res, { user: { id: u.id, name: u.name, email: u.email, role: u.role }, stats: { total_users: USERS.length, total_listings: LISTINGS.length, total_exchanges: EXCHANGES.length, active_listings: LISTINGS.filter(l => l.status === 'available').length, pending_exchanges: EXCHANGES.filter(e => e.status === 'pending').length, completed_exchanges: 0, open_reports: 2, new_users_this_week: 3 }, recent_users: USERS.map(({ password: _, ...x }) => x), recent_listings: LISTINGS.slice(0, 5) });
  }
  if (method === 'GET' && path === '/api/admin/users') { const u = getUserFromToken(req); if (!u) return fail(res, 'Unauthorized.', 401); if (u.role !== 'admin') return fail(res, 'Forbidden.', 403); return ok(res, USERS.map(({ password: _, ...x }) => x)); }

  // TAXONOMY
  if (method === 'GET' && path === '/api/genres') return ok(res, ['Fiction','Non-Fiction','Fantasy','Self-Help','History','Classic','Mystery','Romance','Science','Biography']);
  if (method === 'GET' && path === '/api/formats') return ok(res, ['Paperback','Hardcover','E-Book','Audiobook']);
  if (method === 'GET' && path === '/api/conditions') return ok(res, ['Like New','Good','Fair','Poor']);
  if (method === 'GET' && path === '/api/meetup-locations') return ok(res, ['SM Mall of Asia','Robinsons Place Manila','Ayala Malls Makati','UP Diliman Library']);
  if (method === 'GET' && path === '/api/age-categories') return ok(res, ["Children's",'Young Adult','Adult','All Ages']);

  fail(res, 'Endpoint not found: ' + method + ' ' + path, 404);
});

server.listen(8765, '127.0.0.1', () => {
  console.log('\n  BookSwap Mock Backend running at http://127.0.0.1:8765\n');
  console.log('  Seed Accounts (Password: Password123!):');
  console.log('  Reader : ana@bookswap.test');
  console.log('  Staff  : moderator@bookswap.test');
  console.log('  Admin  : admin@bookswap.test\n');
});
