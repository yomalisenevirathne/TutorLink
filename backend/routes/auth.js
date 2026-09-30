const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to generate 6-digit OTP code
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 1. Send OTP for email verification
router.post('/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email address is required.' });
  }

  // Generate 6-digit code
  const code = generateOTP();
  db.saveOtp(email, code);

  // In production, an email service (like Nodemailer, SendGrid, or AWS SES) would send this OTP.
  console.log(`[OTP SERVICE] Sent OTP ${code} to ${email}`);

  res.json({
    success: true,
    message: `OTP sent successfully to ${email}.`,
    // Returning code in response payload for easy testing/demo purposes
    otp: code 
  });
});

// 2. Verify OTP
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
  }

  const record = db.getOtp(email);
  if (!record) {
    return res.status(400).json({ success: false, message: 'No OTP requested for this email or OTP expired.' });
  }

  if (Date.now() > record.expiresAt) {
    db.deleteOtp(email);
    return res.status(400).json({ success: false, message: 'OTP code has expired. Please request a new one.' });
  }

  if (record.code !== otp.toString().trim()) {
    return res.status(400).json({ success: false, message: 'Invalid OTP code. Please check and try again.' });
  }

  // OTP verified successfully
  db.deleteOtp(email);

  // Update user verification status if user exists
  const existingUser = db.findUserByEmail(email);
  if (existingUser) {
    db.updateUser(existingUser.id, { isEmailVerified: true });
  }

  res.json({
    success: true,
    message: 'Email verified successfully!'
  });
});

// 3. User Registration (Student or Tutor)
router.post('/register', (req, res) => {
  const { role, email, password, fullName, phoneNumber, subjects, experienceLevel, aboutYou, avatarUrl, certificates } = req.body;

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ success: false, message: 'Role, Full Name, Email, and Password are required.' });
  }

  if (db.findUserByEmail(email)) {
    return res.status(400).json({ success: false, message: 'An account with this email address already exists.' });
  }

  const userRole = role === 'Tutor' ? 'Tutor' : 'Student';
  const isEduEmail = email.toLowerCase().includes('.ac.') || email.toLowerCase().includes('.edu');

  const newUser = db.createUser({
    role: userRole,
    email,
    password, // In real deployment, bcrypt.hashSync(password, 10)
    fullName,
    phoneNumber: phoneNumber || '',
    subjects: Array.isArray(subjects) ? subjects : (subjects ? subjects.split(',').map(s => s.trim()) : []),
    experienceLevel: experienceLevel || '',
    aboutYou: aboutYou || '',
    avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80',
    isEmailVerified: isEduEmail, // Auto-verify if university email, or set true via OTP
    certificates: certificates || [],
    paymentMethods: [{ type: 'Visa', last4: '4321' }],
    preferences: { notifications: true, privacy: false }
  });

  const sessionToken = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  db.createSession(sessionToken, newUser.id);

  const { password: _, ...userWithoutPassword } = newUser;

  res.status(201).json({
    success: true,
    message: 'Account registered successfully.',
    token: sessionToken,
    user: userWithoutPassword
  });
});

// 4. User Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = db.findUserByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const sessionToken = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  db.createSession(sessionToken, user.id);

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    message: 'Login successful.',
    token: sessionToken,
    user: userWithoutPassword
  });
});

module.exports = router;
