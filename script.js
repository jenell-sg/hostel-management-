// ── STATE ──
let currentRole = 'user';

// ── ROLE SWITCHING ──
function switchRole(role) {
  currentRole = role;
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.role === role);
  });
  document.body.classList.toggle('admin-mode', role === 'admin');
}

// ── VIEW SWITCHING ──
function showRegister() {
  document.getElementById('loginView').classList.remove('active');
  document.getElementById('registerView').classList.add('active');
  clearAllErrors();
  // Scroll the right panel back to top so register form is fully visible
  const panel = document.querySelector('.right-panel');
  if (panel) panel.scrollTop = 0;
  window.scrollTo({ top: 0 });
}

function showLogin() {
  document.getElementById('registerView').classList.remove('active');
  document.getElementById('loginView').classList.add('active');
  document.getElementById('registerForm').style.display = 'block';
  document.getElementById('successMsg').style.display = 'none';
  clearAllErrors();
  const panel = document.querySelector('.right-panel');
  if (panel) panel.scrollTop = 0;
  window.scrollTo({ top: 0 });
}

// ── ERROR HELPERS ──
function showError(inputEl, msg) {
  clearError(inputEl);
  inputEl.classList.add('input-error');
  const err = document.createElement('div');
  err.className = 'error-msg';
  err.innerHTML = '<span class="err-badge">!</span>' + msg;
  inputEl.parentElement.appendChild(err);
}

function clearError(inputEl) {
  inputEl.classList.remove('input-error');
  const existing = inputEl.parentElement.querySelector('.error-msg');
  if (existing) existing.remove();
}

function clearAllErrors() {
  document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  document.querySelectorAll('.error-msg').forEach(el => el.remove());
  document.querySelectorAll('.form-banner').forEach(el => el.remove());
}

function showBanner(container, msg, type) {
  container.querySelectorAll('.form-banner').forEach(b => b.remove());
  const banner = document.createElement('div');
  banner.className = 'form-banner form-banner-' + type;
  banner.innerHTML = msg;
  container.insertBefore(banner, container.querySelector('button'));
}

// ── LOGIN ──
function handleLogin() {
  clearAllErrors();
  const emailEl = document.getElementById('loginEmail');
  const passEl  = document.getElementById('loginPassword');
  let valid = true;

  if (!emailEl.value.trim()) {
    showError(emailEl, 'Email is required.'); valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
    showError(emailEl, 'Please enter a valid email address.'); valid = false;
  }
  if (!passEl.value.trim()) {
    showError(passEl, 'Password is required.'); valid = false;
  }
  if (!valid) return;

  // Admin shortcut
  if (currentRole === 'admin') {
    if (emailEl.value.trim() === 'admin@hostelhub.com' && passEl.value === 'admin123') {
      try { localStorage.setItem('hostelhub_session', JSON.stringify({id:'admin',role:'admin',name:'Admin',email:'admin@hostelhub.com'})); } catch(e) {}
      window.location.href = '../admin page/admin.html';
    } else {
      showBanner(document.getElementById('loginView'), 'Invalid admin credentials.', 'error');
    }
    return;
  }

  const result = DB.login(emailEl.value.trim(), passEl.value);
  if (result.ok) {
    if (result.user && result.user.surveyCompleted) {
      window.location.href = '../User Page/user.html';
    } else {
      window.location.href = 'survey.html';
    }
    return;
  }
  if (result.error === 'not_found') {
    showBanner(
      document.getElementById('loginView'),
      'No account found for <strong>' + emailEl.value.trim() + '</strong>. <a href="#" onclick="showRegister()">Create an account</a> to login.',
      'error'
    );
  } else if (result.error === 'wrong_password') {
    showBanner(
      document.getElementById('loginView'),
      'Incorrect password for <strong>' + result.name + '</strong>. Please try again.',
      'error'
    );
    showError(passEl, 'Incorrect password.');
  } else {
    showBanner(document.getElementById('loginView'), 'Something went wrong. Please try again.', 'error');
  }
}

// ── REGISTER ──
function handleRegister() {
  clearAllErrors();

  const nameEl    = document.getElementById('regName');
  const emailEl   = document.getElementById('regEmail');
  const passEl    = document.getElementById('regPassword');
  const confirmEl = document.getElementById('regConfirmPassword');
  let valid = true;

  if (!nameEl.value.trim()) {
    showError(nameEl, 'Full name is required.'); valid = false;
  }
  if (!emailEl.value.trim()) {
    showError(emailEl, 'Email is required.'); valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
    showError(emailEl, 'Please enter a valid email address.'); valid = false;
  }
  if (!passEl.value.trim()) {
    showError(passEl, 'Password is required.'); valid = false;
  } else if (passEl.value.length < 6) {
    showError(passEl, 'Password must be at least 6 characters.'); valid = false;
  }
  if (!confirmEl.value.trim()) {
    showError(confirmEl, 'Please confirm your password.'); valid = false;
  } else if (confirmEl.value !== passEl.value) {
    showError(confirmEl, 'Passwords do not match.'); valid = false;
  }
  if (!valid) return;

  const result = DB.register(nameEl.value.trim(), emailEl.value.trim(), passEl.value);

  if (result.ok) {
    window.location.href = 'survey.html';
    return;
  }

  if (result.error === 'email_exists') {
    showError(emailEl, 'This email is already registered. Please sign in.');
  } else if (result.error === 'storage_error') {
    showBanner(
      document.getElementById('registerForm'),
      'Unable to save your account. Please make sure your browser allows local storage, or try a different browser.',
      'error'
    );
  } else {
    showBanner(document.getElementById('registerForm'), 'Something went wrong. Please try again.', 'error');
  }
}

// ── PASSWORD STRENGTH ──
function checkStrength(val) {
  const bars  = ['bar1','bar2','bar3','bar4'].map(id => document.getElementById(id));
  const label = document.getElementById('strengthLabel');
  bars.forEach(b => { b.className = 'strength-bar'; });
  let score = 0;
  if (val.length >= 6)                          score++;
  if (val.length >= 10)                         score++;
  if (/[A-Z]/.test(val) && /[0-9]/.test(val))  score++;
  if (/[^A-Za-z0-9]/.test(val))                score++;
  const cls    = ['', 'weak', 'fair', 'fair', 'strong'];
  const lbls   = ['Enter a password', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = { 0:'var(--text-dim)', 1:'var(--danger)', 2:'var(--orange)', 3:'var(--orange)', 4:'var(--success)' };
  for (let i = 0; i < score; i++) bars[i].classList.add(cls[score]);
  label.textContent = val.length === 0 ? 'Enter a password' : lbls[score];
  label.style.color = colors[score];
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => clearError(input));
  });
});


// ── STORAGE AVAILABILITY CHECK (runs on page load) ──
function checkStorage() {
  try {
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
    return true;
  } catch(e) {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!checkStorage()) {
    // Show a warning banner on the register form
    const warn = document.createElement('div');
    warn.className = 'form-banner form-banner-error';
    warn.innerHTML = '<strong>Warning:</strong> Your browser is blocking local storage. Registration may not work. Try opening this file in Chrome or Edge, or use a local server (e.g. VS Code Live Server).';
    const form = document.getElementById('registerForm');
    if (form) form.prepend(warn);
  }
});