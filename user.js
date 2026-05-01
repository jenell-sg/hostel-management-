/* ══════════════════════════════════════════
   HOSTELHUB — USER DASHBOARD LOGIC
   user.js
   ══════════════════════════════════════════ */

// ── DB LAYER (mirrors index.html / db.js keys) ──
const DB_KEY  = 'hostelhub_users';
const SES_KEY = 'hostelhub_session';
const UD_KEY  = 'hostelhub_userdata';

const DB = {
  getAll()      { try { return JSON.parse(localStorage.getItem(DB_KEY)) || []; }    catch(e) { return []; } },
  saveAll(u)    { try { localStorage.setItem(DB_KEY, JSON.stringify(u)); return true; } catch(e) { return false; } },
  findById(id)  { return this.getAll().find(u => u.id === id) || null; },
  getSession()  { try { return JSON.parse(localStorage.getItem(SES_KEY)); }          catch(e) { return null; } },
  logout()      { try { localStorage.removeItem(SES_KEY); }                          catch(e) {} },
  getUD(uid) {
    try {
      const all = JSON.parse(localStorage.getItem(UD_KEY)) || {};
      return all[uid] || { leaves: [], payments: [], complaints: [] };
    } catch(e) { return { leaves: [], payments: [], complaints: [] }; }
  },
  saveUD(uid, d) {
    try {
      const all = JSON.parse(localStorage.getItem(UD_KEY)) || {};
      all[uid] = d;
      localStorage.setItem(UD_KEY, JSON.stringify(all));
    } catch(e) {}
  }
};

// ── STATE ──
let CU = null;   // current user object
let UD = null;   // current user's leave/payment/complaint data

// ══════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════
function show(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
}

// ══════════════════════════════════════════
// LOAD USER DATA INTO PAGE
// ══════════════════════════════════════════
function loadUser() {
  const ses = DB.getSession();

  // No session → show locked screen, hide dashboard
  if (!ses) {
    document.getElementById('noSession').classList.add('show');
    document.querySelector('.layout').style.display = 'none';
    return;
  }

  const user = DB.findById(ses.id);
  if (!user) {
    document.getElementById('noSession').classList.add('show');
    document.querySelector('.layout').style.display = 'none';
    return;
  }

  CU = user;
  UD = DB.getUD(user.id);
  const s = user.surveyData || {};

  // Build initials from name
  const ini = (user.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // ── Topbar ──
  set('tbAvatar', ini);
  set('tbName',   user.name || '—');

  // ── Profile Hero ──
  set('heroAv',     ini);
  set('heroName',   s.fullName  || user.name || '—');
  set('heroEmail',  s.email     || user.email || '—');
  set('heroDept',   s.department || '—');
  set('heroCourse', s.course    || '—');
  set('heroSem',    s.semester  || '—');

  // ── Student ID ──
  set('d-sid', 'Student ID: STU-' + String(user.id).slice(-6));

  // ── Personal Details ──
  set('d-name',   s.fullName || user.name);
  set('d-roll',   s.rollNumber);
  set('d-email',  s.email    || user.email);
  set('d-phone',  s.mobile);
  set('d-gender', cap(s.gender));
  set('d-dob',    s.dob);
  set('d-addr',   [s.address, s.city, s.state, s.pincode].filter(Boolean).join(', '));

  // ── Academic Details ──
  set('d-college', s.college);
  set('d-dept',    s.department);
  set('d-course',  s.course);
  set('d-sem',     s.semester);
  set('d-year',    s.academicYear);

  // ── Health & Emergency ──
  set('d-blood',    s.bloodGroup || 'Not provided');
  set('d-allergy',  s.allergies  || 'None');
  set('d-guardian', s.guardianName);
  set('d-gcontact', s.guardianContact);
  set('d-relation', cap(s.relationship));
  set('d-medical',  s.medicalConditions || 'None');

  // ── Hostel Info ──
  if (user.assignedRoom) {
    const block = user.assignedRoom.startsWith('G-') ? 'G-Block' : 'B-Block';
    set('h-room',    user.assignedRoom);
    set('h-block',   'Block: ' + block);
    set('h-rid',     user.assignedRoom);
    set('h-blk2',    block);
  } else {
    const block = s.hostelType === 'girls' ? 'G-Block' : 'B-Block';
    set('h-room',    'Pending');
    set('h-block',   'Block: ' + block);
    set('h-rid',     'Pending');
    set('h-blk2',    block);
  }

  set('h-rtype',   s.roomType ? (s.roomType === 'ac' ? 'AC' : 'Non-AC') : '—');
  set('h-sharing', cap(s.sharing) || '—');
  set('h-floor',   s.floor ? cap(s.floor) : 'No preference');
  set('h-checkin', fmtDate(user.createdAt));
  set('h-food',    s.foodType    ? cap(s.foodType)   : '—');
  set('h-htype',   s.hostelType  ? cap(s.hostelType) + ' Hostel' : '—');

  // ── Account ──
  set('acc-email', user.email);
  set('acc-pass',  '•'.repeat(user.password.length));
  set('acc-login', 'Today — ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));

  // ── Notification date ──
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  set('nn1', today);

  // ── Pre-fill form dates with today ──
  const iso = new Date().toISOString().split('T')[0];
  ['lstart', 'lend', 'cdate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = iso;
  });

  renderLeaves();
  renderPayments();
  renderComplaints();
}

// ══════════════════════════════════════════
// LEAVE MANAGEMENT
// ══════════════════════════════════════════
function submitLeave() {
  const type   = document.getElementById('ltype').value;
  const start  = document.getElementById('lstart').value;
  const end    = document.getElementById('lend').value;
  const reason = document.getElementById('lreason').value.trim();

  if (!type || !start || !end || !reason) {
    toast('Please fill all required fields.', true);
    return;
  }
  if (end < start) {
    toast('End date cannot be before start date.', true);
    return;
  }

  const leave = {
    id:      'LV-'  + String(Date.now()).slice(-6),
    type,
    start,
    end,
    reason,
    status:  'Pending',
    remarks: 'Awaiting warden review'
  };

  UD.leaves.unshift(leave);
  DB.saveUD(CU.id, UD);

  // Reset form fields
  document.getElementById('ltype').value   = '';
  document.getElementById('lreason').value = '';

  renderLeaves();
  toast('Leave application submitted!');
}

function renderLeaves() {
  const tbody = document.getElementById('leaveBody');

  if (!UD.leaves.length) {
    tbody.innerHTML = emptyRow(7, '&#128197;', 'No leave applications yet');
    return;
  }

  tbody.innerHTML = UD.leaves.map(l => `
    <tr>
      <td class="tm">${l.id}</td>
      <td>${l.type}</td>
      <td class="tm">${l.start}</td>
      <td class="tm">${l.end}</td>
      <td>${l.reason}</td>
      <td>${mkBadge(l.status)}</td>
      <td class="tm">${l.remarks}</td>
    </tr>
  `).join('');

  const pending = UD.leaves.filter(l => l.status === 'Pending').length;
  const badge   = document.getElementById('lbadge');
  badge.style.display = pending ? '' : 'none';
  badge.textContent   = pending;
}

// ══════════════════════════════════════════
// PAYMENTS
// ══════════════════════════════════════════
function addDemoPayment() {
  const methods  = ['UPI', 'Net Banking', 'Cash', 'Card', 'Cheque'];
  const amounts  = [15000, 18000, 20000, 22000];

  const payment = {
    id:      'PAY-' + String(Date.now()).slice(-6),
    receipt: 'RCP-' + Math.floor(Math.random() * 90000 + 10000),
    amount:  amounts[Math.floor(Math.random() * amounts.length)],
    date:    new Date().toLocaleDateString('en-IN'),
    method:  methods[Math.floor(Math.random() * methods.length)],
    status:  'Paid'
  };

  UD.payments.unshift(payment);
  DB.saveUD(CU.id, UD);
  renderPayments();
  toast('Demo payment entry added!');
}

function renderPayments() {
  const tbody = document.getElementById('payBody');

  if (!UD.payments.length) {
    tbody.innerHTML = emptyRow(6, '&#128179;', 'No payment records yet');
    set('totalPaid', '₹0');
    set('totalDue',  '₹18,000');
    return;
  }

  tbody.innerHTML = UD.payments.map(p => `
    <tr>
      <td class="tm">${p.id}</td>
      <td class="tm">${p.receipt}</td>
      <td style="font-weight:600">₹${p.amount.toLocaleString('en-IN')}</td>
      <td class="tm">${p.date}</td>
      <td>${p.method}</td>
      <td>${mkBadge(p.status)}</td>
    </tr>
  `).join('');

  const paid = UD.payments
    .filter(p => p.status === 'Paid')
    .reduce((acc, p) => acc + p.amount, 0);

  set('totalPaid', '₹' + paid.toLocaleString('en-IN'));
}

// ══════════════════════════════════════════
// COMPLAINTS
// ══════════════════════════════════════════
function submitComplaint() {
  const type = document.getElementById('ctype').value;
  const date = document.getElementById('cdate').value;
  const desc = document.getElementById('cdesc').value.trim();

  if (!type || !date || !desc) {
    toast('Please fill all required fields.', true);
    return;
  }

  const complaint = {
    id:     'CMP-' + String(Date.now()).slice(-6),
    type,
    date,
    desc,
    status: 'Open',
    notes:  'Received — pending review'
  };

  UD.complaints.unshift(complaint);
  DB.saveUD(CU.id, UD);

  document.getElementById('ctype').value = '';
  document.getElementById('cdesc').value = '';

  renderComplaints();
  toast('Complaint submitted!');
}

function renderComplaints() {
  const tbody = document.getElementById('compBody');

  if (!UD.complaints.length) {
    tbody.innerHTML = emptyRow(6, '&#128227;', 'No complaints raised yet');
    return;
  }

  tbody.innerHTML = UD.complaints.map(c => `
    <tr>
      <td class="tm">${c.id}</td>
      <td>${c.type}</td>
      <td class="tm">${c.date}</td>
      <td>${c.desc}</td>
      <td>${mkBadge(c.status)}</td>
      <td class="tm">${c.notes}</td>
    </tr>
  `).join('');
}

// ══════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════
function markAllRead() {
  document.querySelectorAll('.ndot').forEach(d => d.classList.add('read'));
  document.getElementById('nbadge').style.display = 'none';
  toast('All notifications marked as read.');
}

// ══════════════════════════════════════════
// ACCOUNT & SECURITY
// ══════════════════════════════════════════
function togglePwCard() {
  const card = document.getElementById('pwCard');
  card.style.display = card.style.display === 'none' ? 'block' : 'none';
}

function changePassword() {
  const curr    = document.getElementById('cpw').value;
  const newPass = document.getElementById('npw').value;
  const confirm = document.getElementById('cnpw').value;

  if (!curr || !newPass || !confirm) { toast('Please fill all fields.', true); return; }
  if (curr !== CU.password)          { toast('Current password is incorrect.', true); return; }
  if (newPass.length < 6)            { toast('New password must be at least 6 characters.', true); return; }
  if (newPass !== confirm)           { toast('Passwords do not match.', true); return; }

  // Update in localStorage
  const users = DB.getAll();
  const idx   = users.findIndex(u => u.id === CU.id);
  if (idx !== -1) {
    users[idx].password = newPass;
    DB.saveAll(users);
    CU.password = newPass;
  }

  set('acc-pass', '•'.repeat(newPass.length));
  ['cpw', 'npw', 'cnpw'].forEach(id => document.getElementById(id).value = '');
  togglePwCard();
  toast('Password updated successfully!');
}

function doLogout() {
  DB.logout();
  window.location.href = '../Login Page/index.html';
}

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════

/** Set textContent of an element by id */
function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val || '—';
}

/** Capitalise first letter */
function cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Format ISO date string to readable date */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Return a coloured badge span for a given status string */
function mkBadge(status) {
  const map = {
    'Pending':         'by',
    'Approved':        'bg',
    'Rejected':        'br',
    'Paid':            'bg',
    'Pending Payment': 'by',
    'Open':            'bb',
    'In Progress':     'bo',
    'Resolved':        'bg',
    'Active':          'bg'
  };
  const cls = map[status] || 'by';
  return `<span class="badge ${cls}">${status}</span>`;
}

/** Return an empty-state table row */
function emptyRow(cols, icon, msg) {
  return `<tr><td colspan="${cols}">
    <div class="es">
      <div class="es-ico">${icon}</div>
      <div class="es-t">${msg}</div>
    </div>
  </td></tr>`;
}

/** Show bottom toast notification */
function toast(msg, isError = false) {
  const t    = document.getElementById('toast');
  const icon = document.getElementById('tchk');
  const text = document.getElementById('tmsg');

  t.style.borderLeftColor  = isError ? 'var(--red)'   : 'var(--green)';
  icon.style.color          = isError ? 'var(--red)'   : 'var(--green)';
  icon.textContent          = isError ? '✕' : '✓';
  text.textContent          = msg;

  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', loadUser);