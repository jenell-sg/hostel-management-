/* ══════════════════════════════════════════════════
   HOSTELHUB — ADMIN DASHBOARD LOGIC
   admin.js
   ══════════════════════════════════════════════════ */

// ── DB KEYS (must match index.html / user.js) ──
const DB_KEY  = 'hostelhub_users';
const SES_KEY = 'hostelhub_session';
const UD_KEY  = 'hostelhub_userdata';
const ROOM_KEY= 'hostelhub_rooms';
const FEE_KEY = 'hostelhub_fees';
const NOTIF_KEY='hostelhub_notifications';

// ── ADMIN CREDENTIALS ──
const ADMIN_EMAIL = 'admin@hostelhub.com';
const ADMIN_PASS  = 'admin123';

// ── STATE ──
let currentFilter = {};

// ══════════════════════════════════════════════════
// DB LAYER
// ══════════════════════════════════════════════════
const DB = {
  // Users
  getUsers()       { try{return JSON.parse(localStorage.getItem(DB_KEY))||[];}catch(e){return[];} },
  saveUsers(u)     { try{localStorage.setItem(DB_KEY,JSON.stringify(u));}catch(e){} },
  findUser(id)     { return this.getUsers().find(u=>u.id===id)||null; },
  updateUser(id,data) {
    const users=this.getUsers();
    const i=users.findIndex(u=>u.id===id);
    if(i!==-1){users[i]={...users[i],...data};this.saveUsers(users);}
    return users[i]||null;
  },
  deleteUser(id) {
    const users=this.getUsers().filter(u=>u.id!==id);
    this.saveUsers(users);
  },
  addUser(user) {
    const users=this.getUsers();
    users.push(user); this.saveUsers(users);
  },

  // Sessions
  getSession()  { try{return JSON.parse(localStorage.getItem(SES_KEY));}catch(e){return null;} },
  logout()      { localStorage.removeItem(SES_KEY); },

  // User data (leaves, payments, complaints)
  getUserData(uid) {
    try{const a=JSON.parse(localStorage.getItem(UD_KEY))||{};return a[uid]||{leaves:[],payments:[],complaints:[]};}
    catch(e){return{leaves:[],payments:[],complaints:[]};}
  },
  saveUserData(uid,d) {
    try{const a=JSON.parse(localStorage.getItem(UD_KEY))||{};a[uid]=d;localStorage.setItem(UD_KEY,JSON.stringify(a));}
    catch(e){}
  },

  // All leaves across all users
  getAllLeaves() {
    try{
      const all=JSON.parse(localStorage.getItem(UD_KEY))||{};
      const users=this.getUsers();
      const result=[];
      for(const uid in all){
        const u=users.find(x=>String(x.id)===String(uid));
        if(!u) continue;
        (all[uid].leaves||[]).forEach(l=>result.push({...l,userId:uid,userName:u.name,userEmail:u.email,roomNum:u.assignedRoom||'Pending'}));
      }
      return result.sort((a,b)=>b.id.localeCompare(a.id));
    }catch(e){return[];}
  },
  updateLeave(userId, leaveId, update) {
    const d=this.getUserData(userId);
    const i=d.leaves.findIndex(l=>l.id===leaveId);
    if(i!==-1){d.leaves[i]={...d.leaves[i],...update};this.saveUserData(userId,d);}
  },

  // All complaints across all users
  getAllComplaints() {
    try{
      const all=JSON.parse(localStorage.getItem(UD_KEY))||{};
      const users=this.getUsers();
      const result=[];
      for(const uid in all){
        const u=users.find(x=>String(x.id)===String(uid));
        if(!u) continue;
        (all[uid].complaints||[]).forEach(c=>result.push({...c,userId:uid,userName:u.name,roomNum:u.assignedRoom||'Pending'}));
      }
      return result.sort((a,b)=>b.id.localeCompare(a.id));
    }catch(e){return[];}
  },
  updateComplaint(userId,compId,update){
    const d=this.getUserData(userId);
    const i=d.complaints.findIndex(c=>c.id===compId);
    if(i!==-1){d.complaints[i]={...d.complaints[i],...update};this.saveUserData(userId,d);}
  },

  // All payments
  getAllPayments() {
    try{
      const all=JSON.parse(localStorage.getItem(UD_KEY))||{};
      const users=this.getUsers();
      const result=[];
      for(const uid in all){
        const u=users.find(x=>String(x.id)===String(uid));
        if(!u) continue;
        (all[uid].payments||[]).forEach(p=>result.push({...p,userId:uid,userName:u.name}));
      }
      return result.sort((a,b)=>b.id.localeCompare(a.id));
    }catch(e){return[];}
  },
  addPayment(userId,payment){
    const d=this.getUserData(userId);
    d.payments.unshift(payment);
    this.saveUserData(userId,d);
  },

  // Fees
  getFees()     { try{return JSON.parse(localStorage.getItem(FEE_KEY))||defaultFees();}catch(e){return defaultFees();} },
  saveFees(f)   { localStorage.setItem(FEE_KEY,JSON.stringify(f)); },

  // Notifications
  getNotifs()   { try{return JSON.parse(localStorage.getItem(NOTIF_KEY))||[];}catch(e){return[];} },
  saveNotifs(n) { localStorage.setItem(NOTIF_KEY,JSON.stringify(n)); },
  addNotif(msg,type,userId){ 
    const n=this.getNotifs();
    n.unshift({id:'N-'+Date.now(),msg,type:type||'GENERAL',date:new Date().toLocaleDateString('en-IN'),read:false,userId:userId||'all'});
    this.saveNotifs(n);
  }
};

function defaultFees(){
  return[
    {id:'F1',label:'Single AC Room (per semester)',amount:20000},
    {id:'F2',label:'Single Non-AC Room (per semester)',amount:15000},
    {id:'F3',label:'Double Sharing AC (per semester)',amount:14000},
    {id:'F4',label:'Double Sharing Non-AC (per semester)',amount:10000},
    {id:'F5',label:'Triple Sharing (per semester)',amount:8000},
    {id:'F6',label:'Mess Fee (per month)',amount:3500},
    {id:'F7',label:'Security Deposit (one time)',amount:5000},
  ];
}

function initRooms(){
  const rooms=[];
  const blocks = ['B-Block', 'G-Block'];
  const floors = ['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth'];
  
  blocks.forEach(block => {
    const prefix = block === 'B-Block' ? 'B-' : 'G-';
    for (let f = 0; f < 8; f++) {
      const type = f < 4 ? 'Non-AC' : 'AC'; // floors 0-3 non-ac, 4-7 ac
      const floorName = floors[f];
      
      for (let r = 1; r <= 18; r++) {
        let sharing = 'Triple';
        let capacity = 3;
        if (r <= 3) { sharing = 'Single'; capacity = 1; }
        else if (r <= 9) { sharing = 'Double'; capacity = 2; }
        
        let roomNum = (f + 1) * 100 + r; // 101-118, 201-218...
        let id = prefix + roomNum;
        
        rooms.push({
          id: id,
          number: String(roomNum),
          block: block,
          floor: floorName,
          type: type,
          sharing: sharing,
          capacity: capacity,
          status: 'Vacant'
        });
      }
    }
  });

  localStorage.setItem(ROOM_KEY,JSON.stringify(rooms));
  return rooms;
}

// ══════════════════════════════════════════════════
// AUTH GUARD
// ══════════════════════════════════════════════════
function checkAdminAuth(){
  const ses=DB.getSession();
  if(!ses||ses.role!=='admin'){
    window.location.href='../Login Page/index.html';
  }
}

function doLogout(){
  DB.logout();
  window.location.href='../Login Page/index.html';
}

// ══════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════
function showPanel(name){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const panel=document.getElementById('panel-'+name);
  const nav=document.getElementById('nav-'+name);
  if(panel) panel.classList.add('active');
  if(nav)   nav.classList.add('active');

  // Refresh panel data
  const loaders={
    dashboard: loadDashboard,
    students:  loadStudents,
    rooms:     loadRooms,
    leave:     loadLeaves,
    payments:  loadPayments,
    complaints:loadComplaints,
    database:  loadDatabase,
    notifications: loadNotifications,
    fees:      loadFees,
    reports:   loadReports
  };
  if(loaders[name]) loaders[name]();
}

// ══════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════
function set(id,val){ const e=document.getElementById(id);if(e)e.textContent=val||'—'; }
function setHTML(id,html){ const e=document.getElementById(id);if(e)e.innerHTML=html; }
function cap(s){ if(!s)return'';return s.charAt(0).toUpperCase()+s.slice(1); }
function fmtDate(iso){ if(!iso)return'—';return new Date(iso).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function initials(name){ return(name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2); }

function mkBadge(status){
  const m={
    'Pending':'by','Approved':'bg','Rejected':'br','Paid':'bg',
    'Open':'bb','In Progress':'bo','Resolved':'bg','Active':'bg',
    'Inactive':'br','Occupied':'bg','Vacant':'bc','Maintenance':'by'
  };
  return`<span class="badge ${m[status]||'by'}">${status}</span>`;
}

function emptyState(icon,title,sub){
  return`<div class="empty-state"><div class="es-ico">${icon}</div><div class="es-title">${title}</div><div class="es-sub">${sub||''}</div></div>`;
}

function toast(msg,type='success'){
  const t=document.getElementById('toast');
  const m=document.getElementById('toastMsg');
  const ic=document.getElementById('toastIco');
  const colors={success:'var(--green)',error:'var(--red)',info:'var(--blue)',warn:'var(--yellow)'};
  const icons={success:'✓',error:'✕',info:'ℹ',warn:'⚠'};
  t.style.borderLeftColor=colors[type]||colors.success;
  ic.style.color=colors[type]||colors.success;
  ic.textContent=icons[type]||'✓';
  m.textContent=msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3500);
}

function openModal(id){ document.getElementById(id).classList.add('show'); }
function closeModal(id){ document.getElementById(id).classList.remove('show'); }

// ══════════════════════════════════════════════════
// 1. DASHBOARD
// ══════════════════════════════════════════════════
function getDynamicRooms() {
  const users = DB.getUsers().filter(u => u.surveyCompleted && u.assignedRoom);
  const occMap = {};
  users.forEach(u => {
    if(!occMap[u.assignedRoom]) occMap[u.assignedRoom] = [];
    occMap[u.assignedRoom].push(u);
  });
  const allRooms = DB.getRooms();
  allRooms.forEach(r => {
    if (r.status === 'Maintenance') return;
    const occs = occMap[r.id] || [];
    if (occs.length === 0) r.status = 'Vacant';
    else if (occs.length >= r.capacity) r.status = 'Full';
    else r.status = 'Occupied';
    r.occupantList = occs; 
  });
  return allRooms;
}

function loadDashboard(){
  const users=DB.getUsers();
  const rooms=getDynamicRooms();
  const allLeaves=DB.getAllLeaves();
  const allComplaints=DB.getAllComplaints();
  const allPayments=DB.getAllPayments();

  const activeUsers=users.filter(u=>u.surveyCompleted).length;
  const occupiedRooms=rooms.filter(r=>r.status==='Occupied' || r.status==='Full').length;
  const pendingLeaves=allLeaves.filter(l=>l.status==='Pending').length;
  const pendingComplaints=allComplaints.filter(c=>c.status==='Open'||c.status==='In Progress').length;
  const totalFees=allPayments.filter(p=>p.status==='Paid').reduce((a,p)=>a+(p.amount||0),0);

  set('dash-students', users.length);
  set('dash-active', activeUsers);
  set('dash-rooms', rooms.length);
  set('dash-occupied', occupiedRooms);
  set('dash-vacant', rooms.filter(r => r.status === 'Vacant').length);
  set('dash-leaves', pendingLeaves);
  set('dash-complaints', pendingComplaints);
  set('dash-fees', '₹'+totalFees.toLocaleString('en-IN'));

  // Occupancy progress
  const pct=rooms.length>0?Math.round(occupiedRooms/rooms.length*100):0;
  const bar=document.getElementById('occupancyBar');
  if(bar) bar.style.width=pct+'%';
  set('occupancyPct',pct+'%');

  // Recent leaves
  const recentLeaves=allLeaves.filter(l=>l.status==='Pending').slice(0,4);
  const lTbl=document.getElementById('recentLeavesList');
  if(lTbl){
    if(!recentLeaves.length){lTbl.innerHTML=emptyState('📅','No pending leaves','All clear!');return;}
    lTbl.innerHTML=recentLeaves.map(l=>`
      <div class="leave-card">
        <div class="leave-card-header">
          <div class="leave-student">
            <div class="leave-av">${initials(l.userName)}</div>
            <div><div class="leave-name">${l.userName}</div><div class="leave-room">Room ${l.roomNum}</div></div>
          </div>
          ${mkBadge(l.status)}
        </div>
        <div class="leave-meta">
          <div class="lm-item"><div class="lm-label">Type</div><div class="lm-val">${l.type}</div></div>
          <div class="lm-item"><div class="lm-label">From</div><div class="lm-val">${l.start}</div></div>
          <div class="lm-item"><div class="lm-label">To</div><div class="lm-val">${l.end}</div></div>
        </div>
        <div class="leave-actions">
          <input class="leave-remarks-input" id="dr-${l.id}" placeholder="Add remarks (optional)..."/>
          <button class="btn-success btn-sm" onclick="quickLeaveAction('${l.userId}','${l.id}','Approved','dr-${l.id}')">✓ Approve</button>
          <button class="btn-danger btn-sm" onclick="quickLeaveAction('${l.userId}','${l.id}','Rejected','dr-${l.id}')">✕ Reject</button>
        </div>
      </div>
    `).join('');
  }

  // Recent complaints
  const recentComp=allComplaints.filter(c=>c.status==='Open').slice(0,4);
  const cList=document.getElementById('recentComplaintsList');
  if(cList){
    if(!recentComp.length){cList.innerHTML=emptyState('📢','No open complaints','All resolved!');return;}
    cList.innerHTML=recentComp.map(c=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border);">
        <div>
          <div style="font-size:13.5px;font-weight:500">${c.type} — <span style="color:var(--text-muted);font-weight:400">${c.userName}</span></div>
          <div style="font-size:12px;color:var(--text-dim);margin-top:2px">${c.desc.slice(0,60)}${c.desc.length>60?'...':''}</div>
        </div>
        <button class="btn-warn btn-xs" onclick="resolveComplaintQuick('${c.userId}','${c.id}')">Resolve</button>
      </div>
    `).join('');
  }
}

// ══════════════════════════════════════════════════
// 2. STUDENT MANAGEMENT
// ══════════════════════════════════════════════════
function loadStudents(search=''){
  let users=DB.getUsers();
  if(search) users=users.filter(u=>
    u.name?.toLowerCase().includes(search)||
    u.email?.toLowerCase().includes(search)||
    u.surveyData?.rollNumber?.toLowerCase().includes(search)
  );

  const tbody=document.getElementById('studentTable');
  if(!tbody) return;
  if(!users.length){tbody.innerHTML=`<tr><td colspan="8">${emptyState('👥','No students found','Register students to get started')}</td></tr>`;return;}

  tbody.innerHTML=users.map(u=>`
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:9px">
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--orange),var(--orange-dark));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${initials(u.name)}</div>
          <div><div style="font-weight:500;font-size:13.5px">${u.name}</div><div style="font-size:11.5px;color:var(--text-muted)">${u.email}</div></div>
        </div>
      </td>
      <td class="tm">STU-${String(u.id).slice(-6)}</td>
      <td class="tm">${u.surveyData?.rollNumber||'—'}</td>
      <td class="tm">${u.surveyData?.department||'—'}</td>
      <td class="tm">${u.surveyData?.semester||'—'}</td>
      <td>${mkBadge(u.surveyCompleted?'Active':'Inactive')}</td>
      <td>${u.surveyCompleted?mkBadge('Approved'):mkBadge('Pending')}</td>
      <td>
        <div class="action-group">
          <button class="btn-info btn-xs" onclick="viewStudent(${u.id})">View</button>
          <button class="btn-warn btn-xs" onclick="editStudent(${u.id})">Edit</button>
          <button class="btn-secondary btn-xs" onclick="toggleStudentStatus(${u.id})">${u.surveyCompleted?'Deactivate':'Activate'}</button>
          <button class="btn-danger btn-xs" onclick="deleteStudent(${u.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  set('studentCount','Total: '+users.length+' students');
}

function viewStudent(id){
  const u=DB.findUser(id);
  if(!u) return;
  const s=u.surveyData||{};
  const ud=DB.getUserData(id);
  const modal=document.getElementById('studentModal');
  if(!modal) return;

  document.getElementById('sm-title').textContent='Student Profile: '+u.name;
  document.getElementById('sm-body').innerHTML=`
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--border)">
      <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--orange),var(--orange-dark));display:flex;align-items:center;justify-content:center;font-family:'DM Serif Display',serif;font-size:22px;color:#fff">${initials(u.name)}</div>
      <div>
        <div style="font-family:'DM Serif Display',serif;font-size:20px;margin-bottom:3px">${u.name}</div>
        <div style="font-size:13px;color:var(--text-muted)">${u.email}</div>
        <div style="margin-top:6px;display:flex;gap:6px">${mkBadge(u.surveyCompleted?'Active':'Inactive')}<span class="badge bc">STU-${String(u.id).slice(-6)}</span></div>
      </div>
    </div>
    <div class="detail-grid">
      <div><div class="dl">Roll Number</div><div class="dv">${s.rollNumber||'—'}</div></div>
      <div><div class="dl">Phone</div><div class="dv">${s.mobile||'—'}</div></div>
      <div><div class="dl">Department</div><div class="dv">${s.department||'—'}</div></div>
      <div><div class="dl">Course</div><div class="dv">${s.course||'—'}</div></div>
      <div><div class="dl">Semester</div><div class="dv">${s.semester||'—'}</div></div>
      <div><div class="dl">Gender</div><div class="dv">${cap(s.gender)||'—'}</div></div>
      <div><div class="dl">Room</div><div class="dv">${u.assignedRoom||'Pending'}</div></div>
      <div><div class="dl">Registered</div><div class="dv">${fmtDate(u.createdAt)}</div></div>
    </div>
    <div style="margin-top:18px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center">
      <div style="background:var(--surface2);border-radius:10px;padding:14px 10px">
        <div style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--orange)">${ud.leaves.length}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:3px">Leave Applications</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:14px 10px">
        <div style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--green)">${ud.payments.length}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:3px">Payments</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:14px 10px">
        <div style="font-family:'DM Serif Display',serif;font-size:22px;color:var(--red)">${ud.complaints.length}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:3px">Complaints</div>
      </div>
    </div>
  `;
  openModal('studentModal');
}

function editStudent(id){
  const u=DB.findUser(id);
  if(!u) return;
  const s=u.surveyData||{};
  document.getElementById('editStudentId').value=id;
  document.getElementById('es-name').value=u.name||'';
  document.getElementById('es-email').value=u.email||'';
  document.getElementById('es-dept').value=s.department||'';
  document.getElementById('es-roll').value=s.rollNumber||'';
  document.getElementById('es-sem').value=s.semester||'';
  document.getElementById('es-phone').value=s.mobile||'';
  openModal('editStudentModal');
}

function saveStudentEdit(){
  const id=parseInt(document.getElementById('editStudentId').value);
  const name=document.getElementById('es-name').value.trim();
  const email=document.getElementById('es-email').value.trim();
  const dept=document.getElementById('es-dept').value.trim();
  const roll=document.getElementById('es-roll').value.trim();
  const sem=document.getElementById('es-sem').value.trim();
  const phone=document.getElementById('es-phone').value.trim();
  if(!name||!email){toast('Name and Email are required.','error');return;}
  const u=DB.findUser(id);
  if(!u){toast('Student not found.','error');return;}
  DB.updateUser(id,{
    name,email,
    surveyData:{...(u.surveyData||{}),department:dept,rollNumber:roll,semester:sem,mobile:phone,fullName:name,email}
  });
  closeModal('editStudentModal');
  toast('Student updated successfully!');
  loadStudents();
}

function toggleStudentStatus(id){
  const u=DB.findUser(id);
  if(!u) return;
  if(confirm(`${u.surveyCompleted?'Deactivate':'Activate'} account for ${u.name}?`)){
    DB.updateUser(id,{surveyCompleted:!u.surveyCompleted});
    loadStudents();
    toast(`Account ${u.surveyCompleted?'deactivated':'activated'}.`,'info');
  }
}

function deleteStudent(id){
  const u=DB.findUser(id);
  if(!u) return;
  if(confirm(`Permanently delete ${u.name}? This cannot be undone.`)){
    DB.deleteUser(id);
    loadStudents();
    loadDashboard();
    toast('Student deleted.','warn');
  }
}

function openAddStudentModal(){
  document.getElementById('addStudentForm').reset();
  openModal('addStudentModal');
}

function saveNewStudent(){
  const name  =document.getElementById('ns-name').value.trim();
  const email =document.getElementById('ns-email').value.trim();
  const pass  =document.getElementById('ns-pass').value;
  const dept  =document.getElementById('ns-dept').value.trim();
  const roll  =document.getElementById('ns-roll').value.trim();
  const sem   =document.getElementById('ns-sem').value;
  const phone =document.getElementById('ns-phone').value.trim();
  const gender=document.getElementById('ns-gender').value;

  if(!name||!email||!pass){toast('Name, email and password are required.','error');return;}
  const existing=DB.getUsers().find(u=>u.email===email);
  if(existing){toast('Email already registered.','error');return;}

  const newUser={
    id:Date.now(), name, email, password:pass,
    createdAt:new Date().toISOString(),
    surveyCompleted:true,
    surveyData:{
      fullName:name, email, rollNumber:roll, department:dept,
      semester:sem, mobile:phone, gender,
      college:'—', course:'—', academicYear:'—'
    }
  };
  DB.addUser(newUser);
  closeModal('addStudentModal');
  toast('Student added successfully!');
  loadStudents();
  loadDashboard();
}

// ══════════════════════════════════════════════════
// 3. ROOM MANAGEMENT
// ══════════════════════════════════════════════════
let currentBlockFilter = 'B-Block';

function loadRooms(filter=''){
  if (filter === 'B-Block' || filter === 'G-Block') {
    currentBlockFilter = filter;
    filter = ''; // Reset secondary filter when switching blocks
  }

  let allRooms = getDynamicRooms();

  // Apply Filters
  let rooms = allRooms.filter(r => r.block === currentBlockFilter);
  if (filter) {
    rooms = rooms.filter(r => r.status === filter || (r.status === 'Full' && filter === 'Occupied') || r.type === filter || r.floor === filter);
  }

  const grid=document.getElementById('roomGrid');
  if(!grid) return;
  if(!rooms.length){grid.innerHTML=emptyState('🏨','No rooms found','Adjust filters to see rooms');return;}

  grid.innerHTML=rooms.map(r=>{
    const occText = r.occupantList && r.occupantList.length > 0 ? `👤 ${r.occupantList.length}/${r.capacity} Occupied` : '';
    const isFull = r.status === 'Full';
    const isMaint = r.status === 'Maintenance';
    const canAssign = !isFull && !isMaint;
    const tileClass = isFull ? 'occupied' : r.status.toLowerCase();
    
    return `
    <div class="room-tile ${tileClass}" onclick="editRoom('${r.id}')">
      <div class="rt-num">${r.id}</div>
      <div class="rt-type">${r.type} · ${r.sharing} · ${r.floor}</div>
      <div class="rt-badge">${mkBadge(r.status)}</div>
      ${occText ? `<div class="rt-occupant" onclick="event.stopPropagation();viewRoomDetails('${r.id}')" style="cursor:pointer;color:var(--blue);text-decoration:underline">${occText}</div>` : ''}
      <div style="margin-top:8px;display:flex;gap:5px">
        <button class="btn-info btn-xs" onclick="event.stopPropagation();editRoom('${r.id}')">Edit</button>
        ${canAssign ? `<button class="btn-success btn-xs" onclick="event.stopPropagation();openAssignRoom('${r.id}')">Assign</button>` : ''}
        ${occText ? `<button class="btn-warn btn-xs" onclick="event.stopPropagation();viewRoomDetails('${r.id}')">View</button>` : ''}
      </div>
    </div>
    `;
  }).join('');

  // Stats for the CURRENT block
  const blockRooms = allRooms.filter(r => r.block === currentBlockFilter);
  set('roomTotal', blockRooms.length);
  set('roomOccupied', blockRooms.filter(r=>r.status==='Occupied' || r.status==='Full').length);
  set('roomVacant', blockRooms.filter(r=>r.status==='Vacant').length);
  set('roomMaint', blockRooms.filter(r=>r.status==='Maintenance').length);

  // Update tabs visually if they exist
  document.querySelectorAll('.filter-btn').forEach(b => {
    if(b.textContent === 'Boys Hostel' && currentBlockFilter === 'B-Block') b.classList.add('active');
    else if(b.textContent === 'Girls Hostel' && currentBlockFilter === 'G-Block') b.classList.add('active');
    else if(b.textContent === 'Boys Hostel' || b.textContent === 'Girls Hostel') b.classList.remove('active');
  });
}

function editRoom(id){
  const r=DB.findRoom(id);
  if(!r) return;
  document.getElementById('er-id').value=id;
  document.getElementById('er-num').value=r.number;
  document.getElementById('er-block').value=r.block;
  document.getElementById('er-floor').value=r.floor;
  document.getElementById('er-type').value=r.type;
  document.getElementById('er-sharing').value=r.sharing;
  document.getElementById('er-status').value=r.status;
  openModal('editRoomModal');
}

function saveRoomEdit(){
  const id=document.getElementById('er-id').value;
  const num=document.getElementById('er-num').value.trim();
  const block=document.getElementById('er-block').value;
  const floor=document.getElementById('er-floor').value;
  const type=document.getElementById('er-type').value;
  const sharing=document.getElementById('er-sharing').value;
  const status=document.getElementById('er-status').value;
  if(!num){toast('Room number required.','error');return;}
  
  let capacity = 3;
  if(sharing === 'Single') capacity = 1;
  else if(sharing === 'Double') capacity = 2;

  DB.updateRoom(id,{number:num,block,floor,type,sharing,capacity,status});
  closeModal('editRoomModal');
  toast('Room updated.');
  loadRooms();
}

function openAddRoomModal(){
  document.getElementById('addRoomForm').reset();
  openModal('addRoomModal');
}

function saveNewRoom(){
  const num=document.getElementById('nr-num').value.trim();
  const block=document.getElementById('nr-block').value;
  const floor=document.getElementById('nr-floor').value;
  const type=document.getElementById('nr-type').value;
  const sharing=document.getElementById('nr-sharing').value;
  if(!num){toast('Room number required.','error');return;}
  
  let capacity = 3;
  if(sharing === 'Single') capacity = 1;
  else if(sharing === 'Double') capacity = 2;

  DB.addRoom({
    id:(block === 'B-Block' ? 'B-' : 'G-') + num,
    number:num,block,floor,type,sharing,capacity,
    status:'Vacant'
  });
  closeModal('addRoomModal');
  toast('Room added!');
  loadRooms();
}

function deleteRoom(id){
  if(confirm('Delete this room?')){
    DB.deleteRoom(id);
    loadRooms();
    toast('Room deleted.','warn');
  }
}

function vacateRoom(roomId){
  if(confirm(`Vacate all students from room ${roomId}?`)){
    const users = DB.getUsers().filter(u => u.surveyCompleted && u.assignedRoom === roomId);
    users.forEach(u => {
      DB.updateUser(u.id, {assignedRoom: null});
    });
    loadRooms(currentBlockFilter);
    toast(`Room ${roomId} vacated.`,'info');
  }
}

function openAssignRoom(roomId){
  document.getElementById('ar-roomId').value=roomId;
  const r=DB.findRoom(roomId);
  if(!r) return;
  set('ar-roomLabel',`Assign Room ${r.id} (${r.type}, ${r.sharing})`);
  
  const sel=document.getElementById('ar-student');
  let users=DB.getUsers().filter(u=>u.surveyCompleted && !u.assignedRoom);
  
  // STRICT MATCHING BASED ON PREFERENCE
  users = users.filter(u => {
    if(!u.surveyData) return false;
    const prefHostel = u.surveyData.hostelType === 'boys' ? 'B-Block' : 'G-Block';
    const prefType = u.surveyData.roomType === 'ac' ? 'AC' : 'Non-AC';
    
    let prefSharing = 'Single';
    if(u.surveyData.sharing === 'double') prefSharing = 'Double';
    if(u.surveyData.sharing === 'triple') prefSharing = 'Triple';
    
    const prefFloor = u.surveyData.floor;
    
    // Check block, type, and sharing
    if (prefHostel !== r.block || prefType !== r.type || prefSharing !== r.sharing) return false;
    
    // Check floor if they specified a preference (not 'any')
    if (prefFloor && prefFloor !== 'any' && prefFloor !== r.floor) return false;
    
    return true;
  });

  if (users.length === 0) {
    sel.innerHTML='<option value="">No matching students for this room</option>';
  } else {
    sel.innerHTML='<option value="">Select student</option>'+users.map(u=>{
      return `<option value="${u.id}">${u.name} — Roll: ${u.surveyData?.rollNumber||'N/A'}</option>`;
    }).join('');
  }
  openModal('assignRoomModal');
}

function saveRoomAssignment(){
  const roomId=document.getElementById('ar-roomId').value;
  const userId=parseInt(document.getElementById('ar-student').value);
  if(!userId){toast('Please select a student.','error');return;}
  const u=DB.findUser(userId);
  if(!u){toast('Student not found.','error');return;}
  // Update the student with the newly assigned room
  DB.updateUser(userId, {assignedRoom: roomId});
  closeModal('assignRoomModal');
  toast(`Room assigned to ${u.name}!`);
  loadRooms(currentBlockFilter);
}

function viewRoomDetails(roomId) {
  const users = DB.getUsers().filter(u => u.surveyCompleted && u.assignedRoom === roomId);
  const r = DB.findRoom(roomId);
  if(!r) return;
  
  let html = `<div style="margin-bottom:15px">Occupants of <strong>${r.id}</strong> (${r.type}, ${r.sharing}):</div>`;
  
  if (users.length === 0) {
    html += emptyState('🛏️', 'Room is currently vacant', '');
  } else {
    html += users.map(u => `
      <div style="display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid var(--border);align-items:center">
        <div>
          <div style="font-weight:500">${u.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">Roll: ${u.surveyData?.rollNumber || '—'}</div>
        </div>
        <button class="btn-warn btn-xs" onclick="vacateStudent(${u.id})">Vacate</button>
      </div>
    `).join('');
  }
  
  document.getElementById('sm-title').textContent = `Room ${r.id} Details`;
  document.getElementById('sm-body').innerHTML = html;
  openModal('studentModal');
}

function vacateStudent(userId) {
  const u = DB.findUser(userId);
  if(!u) return;
  if(confirm(`Remove ${u.name} from their current room?`)) {
    DB.updateUser(userId, {assignedRoom: null});
    toast(`${u.name} vacated.`);
    closeModal('studentModal'); // optional: could just re-render the modal
    loadRooms(currentBlockFilter);
  }
}

// ══════════════════════════════════════════════════
// 4. LEAVE MANAGEMENT
// ══════════════════════════════════════════════════
let leaveFilter='all';

function loadLeaves(filter){
  if(filter) leaveFilter=filter;
  let leaves=DB.getAllLeaves();
  if(leaveFilter!=='all') leaves=leaves.filter(l=>l.status===leaveFilter);

  const search=document.getElementById('leaveSearch')?.value?.toLowerCase()||'';
  if(search) leaves=leaves.filter(l=>l.userName?.toLowerCase().includes(search)||l.type?.toLowerCase().includes(search));

  // Update filter buttons
  document.querySelectorAll('.leave-filter-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.filter===leaveFilter);
  });

  const counts=DB.getAllLeaves().reduce((a,l)=>{a[l.status]=(a[l.status]||0)+1;return a;},{});
  set('lf-all',   DB.getAllLeaves().length);
  set('lf-pend',  counts['Pending']||0);
  set('lf-appr',  counts['Approved']||0);
  set('lf-rej',   counts['Rejected']||0);

  const container=document.getElementById('leaveContainer');
  if(!container) return;
  if(!leaves.length){container.innerHTML=emptyState('📅',`No ${leaveFilter!=='all'?leaveFilter.toLowerCase()+' ':'' }leaves found`,'');return;}

  container.innerHTML=leaves.map(l=>`
    <div class="leave-card">
      <div class="leave-card-header">
        <div class="leave-student">
          <div class="leave-av">${initials(l.userName)}</div>
          <div><div class="leave-name">${l.userName}</div><div class="leave-room">Room ${l.roomNum} · ${l.userEmail}</div></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          ${mkBadge(l.status)}
          <span class="badge bc">${l.id}</span>
        </div>
      </div>
      <div class="leave-meta">
        <div class="lm-item"><div class="lm-label">Leave Type</div><div class="lm-val">${l.type}</div></div>
        <div class="lm-item"><div class="lm-label">Start Date</div><div class="lm-val">${l.start}</div></div>
        <div class="lm-item"><div class="lm-label">End Date</div><div class="lm-val">${l.end}</div></div>
        <div class="lm-item"><div class="lm-label">Applied</div><div class="lm-val" style="color:var(--text-dim)">Today</div></div>
      </div>
      <div class="leave-reason"><strong>Reason:</strong> ${l.reason}</div>
      ${l.remarks&&l.status!=='Pending'?`<div style="font-size:12.5px;color:var(--text-muted);margin-bottom:10px;padding:8px 12px;background:var(--surface3);border-radius:8px"><strong>Remarks:</strong> ${l.remarks}</div>`:''}
      ${l.status==='Pending'?`
      <div class="leave-actions">
        <input class="leave-remarks-input" id="rem-${l.id}" placeholder="Add admin remarks (optional)..."/>
        <button class="btn-success btn-sm" onclick="approveLeave('${l.userId}','${l.id}','rem-${l.id}')">✓ Approve</button>
        <button class="btn-danger btn-sm" onclick="rejectLeave('${l.userId}','${l.id}','rem-${l.id}')">✕ Reject</button>
      </div>`:''}
    </div>
  `).join('');
}

function approveLeave(userId,leaveId,remarkId){
  const remarks=document.getElementById(remarkId)?.value||'Leave approved by admin.';
  DB.updateLeave(userId,leaveId,{status:'Approved',remarks});
  DB.addNotif(`Your leave application ${leaveId} has been APPROVED. ${remarks}`,'LEAVE',userId);
  toast('Leave approved!');
  loadLeaves();
}

function rejectLeave(userId,leaveId,remarkId){
  const remarks=document.getElementById(remarkId)?.value||'Leave rejected by admin.';
  DB.updateLeave(userId,leaveId,{status:'Rejected',remarks});
  DB.addNotif(`Your leave application ${leaveId} has been REJECTED. ${remarks}`,'LEAVE',userId);
  toast('Leave rejected.','warn');
  loadLeaves();
}

function quickLeaveAction(userId,leaveId,action,remarkId){
  const remarks=document.getElementById(remarkId)?.value||(action==='Approved'?'Approved by admin.':'Rejected by admin.');
  DB.updateLeave(userId,leaveId,{status:action,remarks});
  DB.addNotif(`Your leave ${leaveId} has been ${action.toUpperCase()}.`,'LEAVE',userId);
  toast(`Leave ${action.toLowerCase()}!`, action==='Approved'?'success':'warn');
  loadDashboard();
}

// ══════════════════════════════════════════════════
// 5. PAYMENTS
// ══════════════════════════════════════════════════
let payFilter='all';
function loadPayments(filter){
  if(filter) payFilter=filter;
  let payments=DB.getAllPayments();
  if(payFilter==='paid') payments=payments.filter(p=>p.status==='Paid');
  if(payFilter==='pending') payments=payments.filter(p=>p.status!=='Paid');

  const search=document.getElementById('paySearch')?.value?.toLowerCase()||'';
  if(search) payments=payments.filter(p=>p.userName?.toLowerCase().includes(search));

  const allPays=DB.getAllPayments();
  const totalCollected=allPays.filter(p=>p.status==='Paid').reduce((a,p)=>a+(p.amount||0),0);
  set('pay-total', '₹'+totalCollected.toLocaleString('en-IN'));
  set('pay-count', allPays.length);
  set('pay-pending', allPays.filter(p=>p.status!=='Paid').length+' pending');

  document.querySelectorAll('.pay-filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.filter===payFilter));

  const tbody=document.getElementById('paymentTable');
  if(!tbody) return;
  if(!payments.length){tbody.innerHTML=`<tr><td colspan="8">${emptyState('💰','No payment records','')}</td></tr>`;return;}

  tbody.innerHTML=payments.map(p=>`
    <tr>
      <td class="tm">${p.id}</td>
      <td>
        <div style="font-weight:500">${p.userName}</div>
      </td>
      <td class="tm">${p.receipt}</td>
      <td style="font-weight:600;color:var(--green)">₹${(p.amount||0).toLocaleString('en-IN')}</td>
      <td class="tm">${p.date}</td>
      <td>${p.method||'—'}</td>
      <td>${mkBadge(p.status)}</td>
      <td>
        ${p.status!=='Paid'?`<button class="btn-success btn-xs" onclick="markPaid('${p.userId}','${p.id}')">Mark Paid</button>`:'<span style="color:var(--text-dim);font-size:12px">Settled</span>'}
      </td>
    </tr>
  `).join('');
}

function markPaid(userId,payId){
  const d=DB.getUserData(userId);
  const i=d.payments.findIndex(p=>p.id===payId);
  if(i!==-1){d.payments[i].status='Paid';DB.saveUserData(userId,d);}
  DB.addNotif(`Your payment ${payId} has been confirmed as PAID.`,'PAYMENT',userId);
  toast('Payment marked as paid!');
  loadPayments();
}

function openAddPaymentModal(){
  const sel=document.getElementById('ap-student');
  const users=DB.getUsers().filter(u=>u.surveyCompleted);
  sel.innerHTML='<option value="">Select student</option>'+users.map(u=>`<option value="${u.id}">${u.name}</option>`).join('');
  document.getElementById('ap-date').value=new Date().toISOString().split('T')[0];
  openModal('addPaymentModal');
}

function saveNewPayment(){
  const userId=parseInt(document.getElementById('ap-student').value);
  const amount=parseInt(document.getElementById('ap-amount').value);
  const method=document.getElementById('ap-method').value;
  const date=document.getElementById('ap-date').value;
  if(!userId||!amount){toast('Student and amount are required.','error');return;}
  const payment={
    id:'PAY-'+String(Date.now()).slice(-6),
    receipt:'RCP-'+Math.floor(Math.random()*90000+10000),
    amount, method, date:new Date(date).toLocaleDateString('en-IN'),
    status:'Paid', addedByAdmin:true
  };
  DB.addPayment(userId,payment);
  closeModal('addPaymentModal');
  toast('Payment record added!');
  loadPayments();
}

// ══════════════════════════════════════════════════
// 6. COMPLAINTS
// ══════════════════════════════════════════════════
let compFilter='all';
function loadComplaints(filter){
  if(filter) compFilter=filter;
  let comps=DB.getAllComplaints();
  if(compFilter!=='all') comps=comps.filter(c=>c.status===compFilter);

  const search=document.getElementById('compSearch')?.value?.toLowerCase()||'';
  if(search) comps=comps.filter(c=>c.userName?.toLowerCase().includes(search)||c.type?.toLowerCase().includes(search));

  document.querySelectorAll('.comp-filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.filter===compFilter));

  const allC=DB.getAllComplaints();
  set('comp-total',allC.length);
  set('comp-open',allC.filter(c=>c.status==='Open').length);
  set('comp-inprog',allC.filter(c=>c.status==='In Progress').length);
  set('comp-resolved',allC.filter(c=>c.status==='Resolved').length);

  const tbody=document.getElementById('compTable');
  if(!tbody) return;
  if(!comps.length){tbody.innerHTML=`<tr><td colspan="8">${emptyState('📢','No complaints found','')}</td></tr>`;return;}

  tbody.innerHTML=comps.map(c=>`
    <tr>
      <td class="tm">${c.id}</td>
      <td><div style="font-weight:500">${c.userName}</div><div style="font-size:12px;color:var(--text-muted)">Room ${c.roomNum}</div></td>
      <td>${c.type}</td>
      <td class="tm">${c.date}</td>
      <td style="max-width:200px;font-size:13px">${c.desc.slice(0,70)}${c.desc.length>70?'...':''}</td>
      <td>${mkBadge(c.status)}</td>
      <td class="tm">${c.notes}</td>
      <td>
        <div class="action-group">
          ${c.status==='Open'?`<button class="btn-warn btn-xs" onclick="updateComplaintStatus('${c.userId}','${c.id}','In Progress')">Start</button>`:''}
          ${c.status!=='Resolved'?`<button class="btn-success btn-xs" onclick="updateComplaintStatus('${c.userId}','${c.id}','Resolved')">Resolve</button>`:''}
        </div>
      </td>
    </tr>
  `).join('');
}

function updateComplaintStatus(userId,compId,status){
  const notes={
    'In Progress':'Assigned and under review.',
    'Resolved':'Issue resolved by hostel staff.'
  };
  DB.updateComplaint(userId,compId,{status,notes:notes[status]||status});
  if(status==='Resolved') DB.addNotif(`Your complaint ${compId} has been RESOLVED.`,'COMPLAINT',userId);
  toast(`Complaint marked as ${status}.`,status==='Resolved'?'success':'info');
  loadComplaints();
}

function resolveComplaintQuick(userId,compId){
  updateComplaintStatus(userId,compId,'Resolved');
  loadDashboard();
}

// ══════════════════════════════════════════════════
// 7. DATABASE VIEWER
// ══════════════════════════════════════════════════
function loadDatabase(){
  const users=DB.getUsers();
  const tbody=document.getElementById('dbTable');
  if(!tbody) return;
  if(!users.length){tbody.innerHTML=`<tr><td colspan="9">${emptyState('🗄️','Database is empty','No users registered yet')}</td></tr>`;return;}

  tbody.innerHTML=users.map(u=>{
    const s=u.surveyData||{};
    return`
    <tr>
      <td class="tm">STU-${String(u.id).slice(-6)}</td>
      <td><div style="font-weight:500">${u.name}</div></td>
      <td class="tm">${u.email}</td>
      <td class="tm">${u.password}</td>
      <td class="tm">${s.rollNumber||'—'}</td>
      <td class="tm">${s.department||'—'}</td>
      <td class="tm">${u.assignedRoom||'Pending'}</td>
      <td>${mkBadge(u.surveyCompleted?'Active':'Inactive')}</td>
      <td>
        <div class="action-group">
          <button class="btn-info btn-xs" onclick="viewStudent(${u.id})">View</button>
          <button class="btn-warn btn-xs" onclick="editStudent(${u.id})">Edit</button>
          <button class="btn-danger btn-xs" onclick="deleteStudent(${u.id})">Del</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  set('dbCount','Showing '+users.length+' records');

  // User data summary
  const ud=JSON.parse(localStorage.getItem(UD_KEY)||'{}');
  let totalL=0,totalP=0,totalC=0;
  Object.values(ud).forEach(d=>{totalL+=d.leaves?.length||0;totalP+=d.payments?.length||0;totalC+=d.complaints?.length||0;});
  set('db-leaves',totalL);
  set('db-payments',totalP);
  set('db-comps',totalC);
}

function exportDatabase(){
  const users=DB.getUsers();
  const ud=JSON.parse(localStorage.getItem(UD_KEY)||'{}');
  const allData={users, userdata:ud, rooms:DB.getRooms(), fees:DB.getFees(), exportDate:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(allData,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='hostelhub_database_'+new Date().toISOString().split('T')[0]+'.json';
  a.click();
  toast('Database exported!');
}

function clearDatabase(){
  if(prompt('Type CONFIRM to clear ALL student data (this is irreversible):')!=='CONFIRM') return;
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(UD_KEY);
  toast('Database cleared.','warn');
  loadDatabase();
  loadDashboard();
}

// ══════════════════════════════════════════════════
// 8. FEE MANAGEMENT
// ══════════════════════════════════════════════════
function loadFees(){
  const fees=DB.getFees();
  const list=document.getElementById('feeList');
  if(!list) return;
  list.innerHTML=fees.map(f=>`
    <div class="fee-item" id="fee-${f.id}">
      <div>
        <div class="fee-label">${f.label}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">ID: ${f.id}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <div class="fee-val" id="fv-${f.id}">₹${f.amount.toLocaleString('en-IN')}</div>
        <button class="fee-edit" onclick="editFeeAmount('${f.id}','${f.amount}')">✏️</button>
      </div>
    </div>
  `).join('');

  const total=fees.reduce((a,f)=>a+f.amount,0);
  set('feeTotalLabel','Total annual estimate: ₹'+total.toLocaleString('en-IN'));
}

function editFeeAmount(id,current){
  const val=prompt(`Enter new fee amount (current: ₹${parseInt(current).toLocaleString('en-IN')}):`,current);
  if(val===null) return;
  const amount=parseInt(val);
  if(isNaN(amount)||amount<0){toast('Invalid amount.','error');return;}
  const fees=DB.getFees();
  const i=fees.findIndex(f=>f.id===id);
  if(i!==-1){fees[i].amount=amount;DB.saveFees(fees);}
  set('fv-'+id,'₹'+amount.toLocaleString('en-IN'));
  loadFees();
  toast('Fee updated!');
}

// ══════════════════════════════════════════════════
// 9. NOTIFICATIONS
// ══════════════════════════════════════════════════
function loadNotifications(){
  const notifs=DB.getNotifs();
  const list=document.getElementById('notifList');
  if(!list) return;
  if(!notifs.length){list.innerHTML=emptyState('🔔','No notifications sent','');return;}
  list.innerHTML=notifs.map(n=>`
    <div class="notif-item">
      <div><div class="ndot ${n.read?'read':''}"></div></div>
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
          <span class="badge ${n.type==='PAYMENT'?'bb':n.type==='LEAVE'?'bg':n.type==='COMPLAINT'?'br':n.type==='ROOM_REQ'?'bo':'bo'}" style="font-size:10px">${n.type}</span>
          <span style="font-size:12px;color:var(--text-dim)">${n.date}</span>
        </div>
        <div class="nm">${n.msg}</div>
        <div class="nmeta">${n.userId==='all'?'All students':'User '+n.userId}</div>
        ${n.type === 'ROOM_REQ' ? `<button class="btn-primary btn-xs" style="margin-top:8px" onclick="openAssignRoomForStudent('${n.userId}')">Assign Room</button>` : ''}
      </div>
    </div>
  `).join('');
}

function openAssignRoomForStudent(userId) {
  const u=DB.findUser(parseInt(userId));
  if(!u){toast('Student not found.','error');return;}
  if(u.assignedRoom){toast('Student already has a room assigned.','info');return;}
  document.getElementById('arts-studentId').value=u.id;
  set('arts-studentLabel', `Assign Room to ${u.name}`);
  
  const sel=document.getElementById('arts-room');
  let rooms=DB.getRooms().filter(r => r.status !== 'Full' && r.status !== 'Maintenance');
  
  if (u.surveyData) {
    const prefHostel = u.surveyData.hostelType === 'boys' ? 'B-Block' : 'G-Block';
    const prefType = u.surveyData.roomType === 'ac' ? 'AC' : 'Non-AC';
    let prefSharing = 'Single';
    if(u.surveyData.sharing === 'double') prefSharing = 'Double';
    if(u.surveyData.sharing === 'triple') prefSharing = 'Triple';
    const prefFloor = u.surveyData.floor;
    
    rooms = rooms.filter(r => {
      if (prefHostel !== r.block || prefType !== r.type || prefSharing !== r.sharing) return false;
      if (prefFloor && prefFloor !== 'any' && prefFloor !== r.floor) return false;
      return true;
    });
  }

  if (rooms.length === 0) {
    sel.innerHTML='<option value="">No matching rooms found. Student preferences might be too strict.</option>';
  } else {
    sel.innerHTML='<option value="">Select a room</option>'+rooms.map(r=>{
      return `<option value="${r.id}">${r.id} (${r.type}, ${r.sharing}, ${r.floor})</option>`;
    }).join('');
  }
  openModal('assignRoomToStudentModal');
}

function saveStudentRoomAssignment() {
  const userId=parseInt(document.getElementById('arts-studentId').value);
  const roomId=document.getElementById('arts-room').value;
  if(!roomId){toast('Please select a room.','error');return;}
  const u=DB.findUser(userId);
  if(!u){toast('Student not found.','error');return;}
  const r=DB.findRoom(roomId);
  if(!r){toast('Room not found.','error');return;}
  
  DB.updateUser(userId, {assignedRoom: roomId});
  closeModal('assignRoomToStudentModal');
  toast(`Room ${roomId} assigned to ${u.name}!`);
  loadRooms(currentBlockFilter);
}

function sendBroadcast(){
  const msg=document.getElementById('broadcastMsg')?.value?.trim();
  const type=document.getElementById('broadcastType')?.value;
  if(!msg){toast('Please enter a message.','error');return;}
  DB.addNotif(msg,type,'all');
  document.getElementById('broadcastMsg').value='';
  toast('Broadcast sent to all students!');
  loadNotifications();
}

// ══════════════════════════════════════════════════
// 10. REPORTS
// ══════════════════════════════════════════════════
function loadReports(){
  const users=DB.getUsers();
  const leaves=DB.getAllLeaves();
  const payments=DB.getAllPayments();
  const complaints=DB.getAllComplaints();

  set('rpt-students',users.length);
  set('rpt-leaves',leaves.length);
  set('rpt-payments','₹'+payments.filter(p=>p.status==='Paid').reduce((a,p)=>a+(p.amount||0),0).toLocaleString('en-IN'));
  set('rpt-complaints',complaints.length);
}

function exportReport(type){
  const data={
    students:DB.getUsers().map(u=>({id:'STU-'+String(u.id).slice(-6),name:u.name,email:u.email,dept:u.surveyData?.department,room:u.assignedRoom||'Pending',status:u.surveyCompleted?'Active':'Inactive'})),
    leaves:DB.getAllLeaves(),
    payments:DB.getAllPayments(),
    complaints:DB.getAllComplaints(),
    rooms:DB.getRooms(),
    generatedAt:new Date().toISOString()
  };
  const exportData=type==='all'?data:(data[type]||[]);
  const blob=new Blob([JSON.stringify(exportData,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`hostelhub_${type}_report_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  toast(`${cap(type)} report exported!`);
}

// ══════════════════════════════════════════════════
// GLOBAL SEARCH
// ══════════════════════════════════════════════════
function globalSearch(q){
  if(!q||q.length<2) return;
  const results=DB.getUsers().filter(u=>
    u.name?.toLowerCase().includes(q)||
    u.email?.toLowerCase().includes(q)||
    u.surveyData?.rollNumber?.toLowerCase().includes(q)
  );
  if(results.length){
    showPanel('students');
    loadStudents(q.toLowerCase());
  }
}

// ══════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function(){
  checkAdminAuth();
  showPanel('dashboard');

  // Update pending counts in nav
  function updateNavBadges(){
    const pending=DB.getAllLeaves().filter(l=>l.status==='Pending').length;
    const lbadge=document.getElementById('nav-leave-badge');
    if(lbadge){lbadge.style.display=pending?'':'none';lbadge.textContent=pending;}
  }
  updateNavBadges();
  setInterval(updateNavBadges, 5000);
});