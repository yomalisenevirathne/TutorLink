// Simple in-memory & file backed storage for TutorLink backend
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

// Initial seed data - starts empty for clean app run
const initialData = {
  users: [],
  otps: {},
  sessions: {}
};

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading db file, using initial data:', err);
  }
  saveDatabase(initialData);
  return initialData;
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving db file:', err);
  }
}

let db = loadDatabase();

module.exports = {
  getUsers: () => db.users,
  findUserByEmail: (email) => db.users.find(u => u.email.toLowerCase() === email.toLowerCase()),
  findUserById: (id) => db.users.find(u => u.id === id),
  createUser: (userData) => {
    const newUser = {
      id: 'usr_' + Date.now(),
      isEmailVerified: false,
      privacyEnabled: false,
      ...userData
    };
    db.users.push(newUser);
    saveDatabase(db);
    return newUser;
  },
  updateUser: (id, updateData) => {
    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex === -1) return null;
    db.users[userIndex] = { ...db.users[userIndex], ...updateData };
    saveDatabase(db);
    return db.users[userIndex];
  },
  saveOtp: (email, code) => {
    db.otps[email.toLowerCase()] = {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    };
    saveDatabase(db);
  },
  getOtp: (email) => db.otps[email.toLowerCase()],
  deleteOtp: (email) => {
    delete db.otps[email.toLowerCase()];
    saveDatabase(db);
  },
  createSession: (token, userId) => {
    db.sessions[token] = userId;
    saveDatabase(db);
  },
  getSessionUserId: (token) => db.sessions[token],
  deleteSession: (token) => {
    delete db.sessions[token];
    saveDatabase(db);
  }
};
