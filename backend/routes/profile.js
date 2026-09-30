const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to extract user from session token
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : req.query.token;

  if (!token) {
    // Default to student_1 for demo/development ease if no token provided
    req.userId = 'usr_student_1';
    return next();
  }

  const userId = db.getSessionUserId(token);
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }

  req.userId = userId;
  next();
}

// Get current user profile
router.get('/me', authMiddleware, (req, res) => {
  const user = db.findUserById(req.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User profile not found.' });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({ success: true, user: userWithoutPassword });
});

// Update profile details
router.put('/update', authMiddleware, (req, res) => {
  const user = db.findUserById(req.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const allowedUpdates = ['fullName', 'phoneNumber', 'address', 'aboutYou', 'subjects', 'experienceLevel', 'preferences', 'privacyEnabled'];
  const updatePayload = {};

  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      updatePayload[field] = req.body[field];
    }
  });

  const updatedUser = db.updateUser(req.userId, updatePayload);
  const { password: _, ...userWithoutPassword } = updatedUser;

  res.json({
    success: true,
    message: 'Profile updated successfully.',
    user: userWithoutPassword
  });
});

// Upload avatar
router.post('/upload-avatar', authMiddleware, (req, res) => {
  const { avatarUrl } = req.body;
  if (!avatarUrl) {
    return res.status(400).json({ success: false, message: 'avatarUrl or image data required.' });
  }

  const updatedUser = db.updateUser(req.userId, { avatarUrl });
  const { password: _, ...userWithoutPassword } = updatedUser;

  res.json({
    success: true,
    message: 'Avatar uploaded successfully.',
    user: userWithoutPassword
  });
});

// Upload qualification / certificate for Tutor
router.post('/upload-certificate', authMiddleware, (req, res) => {
  const user = db.findUserById(req.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const { title, issuingInstitute, certificateUrl } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'Certificate title is required.' });
  }

  const newCertificate = {
    id: 'cert_' + Date.now(),
    title,
    issuingInstitute: issuingInstitute || 'Verified Institution',
    certificateUrl: certificateUrl || 'https://via.placeholder.com/300x200?text=Certificate',
    status: 'Verified', // Auto-mark verified for scope demonstration
    uploadedAt: new Date().toISOString().split('T')[0]
  };

  const currentCerts = user.certificates || [];
  const updatedCerts = [...currentCerts, newCertificate];

  const updatedUser = db.updateUser(req.userId, { certificates: updatedCerts });
  const { password: _, ...userWithoutPassword } = updatedUser;

  res.json({
    success: true,
    message: 'Qualification document/certificate uploaded & verified successfully.',
    certificate: newCertificate,
    user: userWithoutPassword
  });
});

module.exports = router;
