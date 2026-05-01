// ── HOSTELHUB SHARED DATA LAYER ──
const DB_KEY      = 'hostelhub_users';
const SESSION_KEY = 'hostelhub_session';   // localStorage (not session) so it survives file:// navigation

const DB = {

  // ── STORAGE HELPERS ──
  getAll() {
    try { return JSON.parse(localStorage.getItem(DB_KEY)) || []; }
    catch(e) { return []; }
  },

  saveAll(users) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(users)); return true; }
    catch(e) { return false; }
  },

  // ── FINDERS ──
  findByEmail(email) {
    return this.getAll().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  findById(id) {
    return this.getAll().find(u => u.id === id) || null;
  },

  // ── REGISTER ──
  // Saves user immediately so they appear in DB even before survey completion
  register(name, email, password) {
    try {
      const users = this.getAll();
      if (this.findByEmail(email)) return { ok: false, error: 'email_exists' };

      const user = {
        id: Date.now(),
        name,
        email,
        password,
        createdAt: new Date().toISOString(),
        surveyCompleted: false,
        surveyData: null,
      };

      users.push(user);
      const saved = this.saveAll(users);
      if (!saved) return { ok: false, error: 'storage_error' };

      // Persist session in localStorage so it survives file:// redirects
      this.setSession({ id: user.id, email: user.email, name: user.name });
      return { ok: true, user };
    } catch(e) {
      return { ok: false, error: 'storage_error' };
    }
  },

  // ── LOGIN ──
  login(email, password) {
    try {
      const user = this.findByEmail(email);
      if (!user) return { ok: false, error: 'not_found' };
      if (user.password !== password) return { ok: false, error: 'wrong_password', name: user.name };
      this.setSession({ id: user.id, email: user.email, name: user.name });
      return { ok: true, user };
    } catch(e) {
      return { ok: false, error: 'storage_error' };
    }
  },

  // ── SAVE SURVEY (marks user complete) ──
  saveSurvey(userId, surveyData) {
    try {
      const users = this.getAll();
      const idx = users.findIndex(u => u.id === userId);
      if (idx === -1) return false;
      users[idx].surveyCompleted = true;
      users[idx].surveyData = surveyData;
      return this.saveAll(users);
    } catch(e) { return false; }
  },

  // ── DELETE ──
  deleteUser(id) {
    try { this.saveAll(this.getAll().filter(u => u.id !== id)); }
    catch(e) {}
  },

  // ── NOTIFICATIONS ──
  addNotif(msg, type, userId) {
    try {
      const NOTIF_KEY = 'hostelhub_notifications';
      const n = JSON.parse(localStorage.getItem(NOTIF_KEY)) || [];
      n.unshift({id:'N-'+Date.now(), msg, type: type||'GENERAL', date:new Date().toLocaleDateString('en-IN'), read:false, userId: userId||'all'});
      localStorage.setItem(NOTIF_KEY, JSON.stringify(n));
    } catch(e) {}
  },

  // ── SESSION — uses localStorage so it works on file:// ──
  setSession(data) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); }
    catch(e) {}
  },

  getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch(e) { return null; }
  },

  logout() {
    try { localStorage.removeItem(SESSION_KEY); }
    catch(e) {}
  },

  // ── ROOMS ──
  getRooms() {
    try {
      let r = JSON.parse(localStorage.getItem('hostelhub_rooms'));
      if (!r || !r.some(x => x.floor === 'Eighth')) {
        return this.initRooms();
      }
      return r;
    } catch(e) {
      return this.initRooms();
    }
  },
  saveRooms(r)  { localStorage.setItem('hostelhub_rooms', JSON.stringify(r)); },
  findRoom(id)  { return this.getRooms().find(r=>r.id===id)||null; },
  updateRoom(id,data){
    const rooms=this.getRooms();
    const i=rooms.findIndex(r=>r.id===id);
    if(i!==-1){rooms[i]={...rooms[i],...data};this.saveRooms(rooms);}
  },
  addRoom(room){ const rooms=this.getRooms();rooms.push(room);this.saveRooms(rooms); },
  deleteRoom(id){ const rooms=this.getRooms().filter(r=>r.id!==id);this.saveRooms(rooms); },
  initRooms() {
    const rooms = [];
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

    localStorage.setItem('hostelhub_rooms', JSON.stringify(rooms));
    return rooms;
  }
};