// Simple in-memory & file backed storage for TutorLink backend
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

// Initial seed data with example profiles matching design mockups
const initialData = {
  users: [
    {
      id: 'usr_student_1',
      role: 'Student',
      email: 'dinithi.desilva@univ.ac.lk',
      password: 'password123',
      fullName: 'Dinithi de Silva',
      phoneNumber: '+94 77 123 4567',
      subjects: ['Mathematics', 'Physics', 'Computer Science'],
      aboutYou: 'Passionate computer science undergraduate looking for guidance in higher level math and algorithms.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      isEmailVerified: true,
      privacyEnabled: false,
      keywords: ['Math', 'Physics', 'Data Structures', 'Python']
    },
    {
      id: 'usr_tutor_1',
      role: 'Tutor',
      email: 'dilshan.samarawickrama@univ.ac.lk',
      password: 'password123',
      fullName: 'Dilshan Samarawickrama',
      phoneNumber: '+94 71 987 6543',
      address: 'Torrous address beat, Luton Road, Titis inst area here',
      subjects: ['Higher Mathematics', 'Quantum Physics', 'Algorithms'],
      experienceLevel: 'Senior Tutor (4+ years)',
      aboutYou: 'Team oriented and dedicated educator specializing in advanced mathematics and applied physics.',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      isEmailVerified: true,
      certificates: [
        {
          id: 'cert_1',
          title: 'B.Sc. Special Hons Degree Certificate',
          issuingInstitute: 'University of Colombo',
          status: 'Verified',
          uploadedAt: '2026-01-15'
        }
      ],
      paymentMethods: [{ type: 'Visa', last4: '4321' }],
      preferences: { notifications: true, privacy: false }
    }
  ],
  otps: {}, // { email: { code: '123456', expiresAt: timestamp } }
  sessions: {} // { token: userId }
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
