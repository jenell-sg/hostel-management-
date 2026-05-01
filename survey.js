// ── STATE ──
const TOTAL_STEPS = 6;
let currentStep = 1;

// ── VALIDATION RULES PER STEP ──
const STEP_RULES = {
  1: [
    { id: 's1-name',   label: 'Full Name',     type: 'text',  required: true },
    { id: 's1-roll',   label: 'Roll Number',   type: 'text',  required: true },
    { id: 's1-email',  label: 'Email ID',      type: 'email', required: true },
    { id: 's1-mobile', label: 'Mobile Number', type: 'tel',   required: true },
    { name: 'gender',  label: 'Gender',        type: 'radio', required: true },
    { id: 's1-dob',    label: 'Date of Birth', type: 'date',  required: true },
  ],
  2: [
    { id: 's2-college', label: 'College Name',   type: 'text',   required: true },
    { id: 's2-dept',    label: 'Department',     type: 'text',   required: true },
    { id: 's2-course',  label: 'Course/Program', type: 'text',   required: true },
    { id: 's2-sem',     label: 'Semester',       type: 'select', required: true },
    { id: 's2-year',    label: 'Academic Year',  type: 'select', required: true },
  ],
  3: [
    { name: 'hostelType', label: 'Hostel Type',        type: 'radio', required: true },
    { name: 'roomType',   label: 'Room Type',          type: 'radio', required: true },
    { name: 'sharing',    label: 'Sharing Preference', type: 'radio', required: true },
    // floor is optional
  ],
  4: [
    { name: 'food', label: 'Food Type', type: 'radio', required: true },
  ],
  5: [
    { id: 's5-address',  label: 'Permanent Address',    type: 'textarea', required: true },
    { id: 's5-city',     label: 'City',                 type: 'text',     required: true },
    { id: 's5-state',    label: 'State',                type: 'text',     required: true },
    { id: 's5-pincode',  label: 'Pincode',              type: 'text',     required: true },
    { id: 's5-guardian', label: 'Guardian Name',        type: 'text',     required: true },
    { id: 's5-gcontact', label: 'Guardian Contact',     type: 'tel',      required: true },
    { id: 's5-relation', label: 'Relationship',         type: 'select',   required: true },
  ],
  6: [], // all optional
};

// ── TOAST NOTIFICATION ──
function showToast(message) {
  // Remove any existing toast
  const existing = document.getElementById('validationToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'validationToast';
  toast.className = 'validation-toast';
  toast.innerHTML = `
    <div class="toast-icon">!</div>
    <div class="toast-text">${message}</div>
  `;
  document.body.appendChild(toast);

  // Trigger entrance
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ── FIELD ERROR HELPERS ──
function showFieldError(el, msg) {
  clearFieldError(el);
  el.classList.add('field-error');
  el.classList.add('shake');
  el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });

  const div = document.createElement('div');
  div.className = 'error-msg';
  div.innerHTML = `<span class="err-icon">!</span>${msg}`;
  el.closest('.field-group').appendChild(div);
}

function showRadioError(name, msg) {
  clearRadioError(name);
  const group = document.querySelector(
    `.chip-group [name="${name}"], .food-card [name="${name}"]`
  );
  if (!group) return;
  const container = group.closest('.pref-section') || group.closest('.field-group');
  if (!container) return;
  container.classList.add('radio-error');

  const div = document.createElement('div');
  div.className = 'error-msg';
  div.innerHTML = `<span class="err-icon">!</span>${msg}`;
  container.appendChild(div);
}

function clearFieldError(el) {
  el.classList.remove('field-error');
  const errEl = el.closest('.field-group')?.querySelector('.error-msg');
  if (errEl) errEl.remove();
}

function clearRadioError(name) {
  const group = document.querySelector(
    `.chip-group [name="${name}"], .food-card [name="${name}"]`
  );
  if (!group) return;
  const container = group.closest('.pref-section') || group.closest('.field-group');
  if (!container) return;
  container.classList.remove('radio-error');
  const errEl = container.querySelector('.error-msg');
  if (errEl) errEl.remove();
}

function clearStepErrors(stepNum) {
  const panel = document.getElementById('step' + stepNum);
  if (!panel) return;
  panel.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
  panel.querySelectorAll('.radio-error').forEach(el => el.classList.remove('radio-error'));
  panel.querySelectorAll('.error-msg').forEach(el => el.remove());
}

// ── VALIDATE STEP ──
function validateStep(stepNum) {
  clearStepErrors(stepNum);
  const rules = STEP_RULES[stepNum] || [];
  const missing = [];
  let firstErrorEl = null;

  for (const rule of rules) {
    if (!rule.required) continue;

    // Radio group
    if (rule.type === 'radio') {
      const checked = document.querySelector(`input[name="${rule.name}"]:checked`);
      if (!checked) {
        showRadioError(rule.name, `Please select a ${rule.label}.`);
        missing.push(rule.label);
        if (!firstErrorEl) {
          firstErrorEl = document.querySelector(`input[name="${rule.name}"]`);
        }
      }
      continue;
    }

    // Regular fields
    const el = document.getElementById(rule.id);
    if (!el) continue;
    const val = el.value.trim();

    if (!val) {
      showFieldError(el, `${rule.label} is required.`);
      missing.push(rule.label);
      if (!firstErrorEl) firstErrorEl = el;
      continue;
    }

    if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      showFieldError(el, 'Please enter a valid email address.');
      missing.push(rule.label);
      if (!firstErrorEl) firstErrorEl = el;
      continue;
    }

    if (rule.type === 'tel' && !/^[0-9+()\s\-]{7,15}$/.test(val)) {
      showFieldError(el, 'Please enter a valid phone number.');
      missing.push(rule.label);
      if (!firstErrorEl) firstErrorEl = el;
      continue;
    }

    if (rule.id === 's5-pincode' && !/^\d{6}$/.test(val)) {
      showFieldError(el, 'Pincode must be exactly 6 digits.');
      missing.push(rule.label);
      if (!firstErrorEl) firstErrorEl = el;
      continue;
    }
  }

  if (missing.length > 0) {
    // Show toast with specific missing fields
    if (missing.length === 1) {
      showToast(`Please fill in: <strong>${missing[0]}</strong>`);
    } else {
      showToast(`Please fill in all required fields: <strong>${missing.join(', ')}</strong>`);
    }

    // Scroll to first error
    if (firstErrorEl) {
      setTimeout(() => {
        firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
    return false;
  }

  return true;
}

// ── NAVIGATION ──
function nextStep() {
  if (!validateStep(currentStep)) return;
  if (currentStep >= TOTAL_STEPS) return;
  goToStep(currentStep + 1);
}

function prevStep() {
  if (currentStep <= 1) return;
  goToStep(currentStep - 1);
}

function goToStep(n) {
  const prevPanel = document.getElementById('step' + currentStep);
  if (prevPanel) prevPanel.classList.remove('active');

  if (n > currentStep) {
    const prevStage = getStageEl(currentStep);
    if (prevStage) { prevStage.classList.remove('active'); prevStage.classList.add('done'); }
  } else {
    const nextStage = getStageEl(currentStep);
    if (nextStage) nextStage.classList.remove('done');
  }

  currentStep = n;

  const nextPanel = document.getElementById('step' + currentStep);
  if (nextPanel) nextPanel.classList.add('active');

  document.querySelectorAll('.stage-item').forEach(el => el.classList.remove('active'));
  const activeStage = getStageEl(currentStep);
  if (activeStage) activeStage.classList.add('active');

  updateProgress();
  document.getElementById('topStepLabel').textContent = 'Step ' + currentStep + ' of ' + TOTAL_STEPS;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getStageEl(n) {
  return document.querySelector('.stage-item[data-step="' + n + '"]');
}

// ── PROGRESS ──
function updateProgress() {
  const pct = (currentStep / TOTAL_STEPS) * 100;
  document.getElementById('progressFill').style.width = pct + '%';
}

// ── COLLECT SURVEY DATA ──
function collectSurveyData() {
  const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const r = (name) => { const el = document.querySelector(`input[name="${name}"]:checked`); return el ? el.value : ''; };
  return {
    // Step 1
    fullName:    g('s1-name'),
    rollNumber:  g('s1-roll'),
    email:       g('s1-email'),
    mobile:      g('s1-mobile'),
    gender:      r('gender'),
    dob:         g('s1-dob'),
    // Step 2
    college:     g('s2-college'),
    department:  g('s2-dept'),
    course:      g('s2-course'),
    semester:    g('s2-sem'),
    academicYear:g('s2-year'),
    // Step 3
    hostelType:  document.querySelector('input[name="hostelType"]:checked')?.value,
    roomType:    document.querySelector('input[name="roomType"]:checked')?.value,
    sharing:     document.querySelector('input[name="sharing"]:checked')?.value,
    floor:       document.querySelector('input[name="floor"]:checked')?.value || 'any',
    // Step 4
    foodType:    r('food'),
    // Step 5
    address:     g('s5-address'),
    city:        g('s5-city'),
    state:       g('s5-state'),
    pincode:     g('s5-pincode'),
    guardianName:g('s5-guardian'),
    guardianContact: g('s5-gcontact'),
    relationship:g('s5-relation'),
    // Step 6 (optional)
    bloodGroup:  g('s6-blood'),
    allergies:   g('s6-allergies'),
    medicalConditions: g('s6-medical'),
  };
}

// ── SUBMIT ──
function submitSurvey() {
  const stage6 = getStageEl(6);
  if (stage6) { stage6.classList.remove('active'); stage6.classList.add('done'); }

  // Save survey data to DB
  const session = DB.getSession();
  if (session) {
    const surveyData = collectSurveyData();
    DB.saveSurvey(session.id, surveyData);

    const prefText = `${surveyData.roomType || 'AC/Non-AC'} ${surveyData.sharing || 'Sharing'}`;
    const prefFloor = surveyData.floor && surveyData.floor !== 'any' ? ` (Prefers ${surveyData.floor} floor)` : '';
    DB.addNotif(`Student ${surveyData.fullName || 'Unknown'} requires a ${prefText} room in ${surveyData.hostelType || 'Hostel'}${prefFloor}.`, 'ROOM_REQ', session.id);
  }

  document.getElementById('step6').classList.remove('active');
  document.getElementById('stepDone').classList.add('active');
  document.getElementById('progressFill').style.width = '100%';
  document.getElementById('topStepLabel').textContent = 'Complete!';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Redirect to user dashboard after a brief delay
  setTimeout(function() {
    window.location.href = '../User Page/user.html';
  }, 1500);
}

// ── DYNAMIC FLOOR PREFERENCES ──
function updateFloorOptions() {
  const hostel = document.querySelector('input[name="hostelType"]:checked')?.value;
  const rtype = document.querySelector('input[name="roomType"]:checked')?.value;
  const share = document.querySelector('input[name="sharing"]:checked')?.value;
  const container = document.getElementById('floorOptionsContainer');
  if(!container) return;

  if (!hostel || !rtype || !share) {
    container.innerHTML = '<div style="font-size:13.5px; color:var(--text-muted); padding:8px 4px;">Please select Hostel, Room Type, and Sharing to see available floors.</div>';
    return;
  }

  const block = hostel === 'boys' ? 'B-Block' : 'G-Block';
  const filterType = rtype === 'ac' ? 'AC' : 'Non-AC';
  let filterSharing = 'Single';
  if(share === 'double') filterSharing = 'Double';
  if(share === 'triple') filterSharing = 'Triple';

  const users = DB.getUsers().filter(u => u.surveyCompleted && u.assignedRoom);
  const occMap = {};
  users.forEach(u => {
    occMap[u.assignedRoom] = (occMap[u.assignedRoom] || 0) + 1;
  });

  const allRooms = DB.getRooms();
  const applicableFloors = filterType === 'AC' 
    ? ['Fifth', 'Sixth', 'Seventh', 'Eighth'] 
    : ['First', 'Second', 'Third', 'Fourth'];

  let html = '';

  applicableFloors.forEach(floorName => {
    const matchingRooms = allRooms.filter(r => r.block === block && r.floor === floorName && r.type === filterType && r.sharing === filterSharing && r.status !== 'Maintenance');
    
    let isFull = true;
    if (matchingRooms.length > 0) {
      for (const r of matchingRooms) {
        if ((occMap[r.id] || 0) < r.capacity) {
          isFull = false;
          break;
        }
      }
    }

    if(isFull) {
      html += `<label class="chip" style="opacity:0.6; cursor:not-allowed;" title="Floor is fully occupied for this room type"><input type="radio" name="floor" value="${floorName}" disabled /><span>${floorName} (Full)</span></label>`;
    } else {
      html += `<label class="chip"><input type="radio" name="floor" value="${floorName}" /><span>${floorName}</span></label>`;
    }
  });

  html += `<label class="chip"><input type="radio" name="floor" value="any" checked /><span>No Preference</span></label>`;
  container.innerHTML = html;
}

// ── AUTO-CLEAR ERRORS ON INPUT ──
document.addEventListener('DOMContentLoaded', () => {
  updateProgress();

  document.querySelectorAll('input[name="hostelType"], input[name="roomType"], input[name="sharing"]').forEach(el => {
    el.addEventListener('change', updateFloorOptions);
  });

  document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="date"], select, textarea').forEach(el => {
    el.addEventListener('input', () => clearFieldError(el));
    el.addEventListener('change', () => clearFieldError(el));
  });

  document.querySelectorAll('input[type="radio"]').forEach(el => {
    el.addEventListener('change', () => clearRadioError(el.name));
  });
});