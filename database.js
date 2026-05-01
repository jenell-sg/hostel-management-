// ── DATABASE VIEWER JS ──

function renderTable() {
  const users = DB.getAll();
  const query = document.getElementById('searchInput').value.toLowerCase();
  const tbody = document.getElementById('tableBody');
  const empty = document.getElementById('emptyState');

  // Update stats
  document.getElementById('statTotal').textContent = users.length;
  document.getElementById('statCompleted').textContent = users.filter(u => u.surveyCompleted).length;
  document.getElementById('statPending').textContent = users.filter(u => !u.surveyCompleted).length;

  // Filter
  const filtered = users.filter(u => {
    if (!query) return true;
    const sd = u.surveyData || {};
    return (
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (sd.rollNumber || '').toLowerCase().includes(query)
    );
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = filtered.map((u, i) => {
    const date = new Date(u.createdAt).toLocaleString();
    const completed = u.surveyCompleted;
    const statusBadge = completed
      ? `<span class="badge badge-done">Completed</span>`
      : `<span class="badge badge-pending">Pending</span>`;
    const detailsBtn = completed
      ? `<button class="btn-details" onclick="viewDetails(${u.id})">View</button>`
      : `<span class="na-text">N/A</span>`;
    return `
      <tr>
        <td class="td-id">${i + 1}</td>
        <td class="td-name">${escHtml(u.name)}</td>
        <td class="td-email">${escHtml(u.email)}</td>
        <td class="td-pass"><span class="password-cell">${escHtml(u.password)}</span></td>
        <td class="td-date">${date}</td>
        <td>${statusBadge}</td>
        <td class="td-actions">
          ${detailsBtn}
          <button class="btn-delete" onclick="confirmDelete(${u.id}, '${escHtml(u.name)}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function refreshTable() {
  renderTable();
}

// ── DETAILS MODAL ──
function viewDetails(id) {
  const user = DB.findById(id);
  if (!user || !user.surveyData) return;
  const s = user.surveyData;

  const sections = [
    {
      title: 'Personal Details',
      fields: [
        ['Full Name', s.fullName], ['Roll Number', s.rollNumber],
        ['Email', s.email], ['Mobile', s.mobile],
        ['Gender', s.gender], ['Date of Birth', s.dob],
      ]
    },
    {
      title: 'Academic Details',
      fields: [
        ['College', s.college], ['Department', s.department],
        ['Course', s.course], ['Semester', s.semester],
        ['Academic Year', s.academicYear],
      ]
    },
    {
      title: 'Hostel Preferences',
      fields: [
        ['Hostel Type', s.hostelType], ['Room Type', s.roomType],
        ['Sharing', s.sharing], ['Floor', s.floor || 'No preference'],
      ]
    },
    {
      title: 'Food & Address',
      fields: [
        ['Food Type', s.foodType], ['Address', s.address],
        ['City', s.city], ['State', s.state],
        ['Pincode', s.pincode],
      ]
    },
    {
      title: 'Emergency Contact',
      fields: [
        ['Guardian Name', s.guardianName], ['Contact', s.guardianContact],
        ['Relationship', s.relationship],
      ]
    },
    {
      title: 'Health & Safety',
      fields: [
        ['Blood Group', s.bloodGroup || '—'], ['Allergies', s.allergies || '—'],
        ['Medical Conditions', s.medicalConditions || '—'],
      ]
    },
  ];

  document.getElementById('modalTitle').textContent = user.name + ' — Survey Details';
  document.getElementById('modalBody').innerHTML = sections.map(sec => `
    <div class="detail-section">
      <div class="detail-section-title">${sec.title}</div>
      <div class="detail-grid">
        ${sec.fields.map(([label, val]) => `
          <div class="detail-item">
            <div class="detail-label">${label}</div>
            <div class="detail-value">${escHtml(val || '—')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  document.getElementById('modalBackdrop').style.display = 'block';
  document.getElementById('detailModal').classList.add('modal-open');
}

function closeModal() {
  document.getElementById('modalBackdrop').style.display = 'none';
  document.getElementById('detailModal').classList.remove('modal-open');
}

// ── DELETE CONFIRM ──
function confirmDelete(id, name) {
  document.getElementById('confirmTitle').textContent = 'Delete User';
  document.getElementById('confirmBody').innerHTML =
    `Are you sure you want to remove <strong>${escHtml(name)}</strong>? This action cannot be undone.`;
  document.getElementById('confirmAction').textContent = 'Delete';
  document.getElementById('confirmAction').onclick = () => { DB.deleteUser(id); closeConfirm(); renderTable(); };
  document.getElementById('confirmBackdrop').style.display = 'block';
  document.getElementById('confirmModal').classList.add('modal-open');
}

function confirmClearAll() {
  document.getElementById('confirmTitle').textContent = 'Clear All Data';
  document.getElementById('confirmBody').innerHTML =
    `This will permanently delete <strong>all users</strong> from the database. Are you sure?`;
  document.getElementById('confirmAction').textContent = 'Clear All';
  document.getElementById('confirmAction').onclick = () => { DB.saveAll([]); closeConfirm(); renderTable(); };
  document.getElementById('confirmBackdrop').style.display = 'block';
  document.getElementById('confirmModal').classList.add('modal-open');
}

function closeConfirm() {
  document.getElementById('confirmBackdrop').style.display = 'none';
  document.getElementById('confirmModal').classList.remove('modal-open');
}

// ── EXPORT ──
function exportJSON() {
  const data = DB.getAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hostelhub_users.json';
  a.click();
}

// ── UTIL ──
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', renderTable);