const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TutorLink Backend API', timestamp: new Date() });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`TutorLink Scope 3 Backend API running on http://localhost:${PORT}`);
    console.log(`=================================`);
  });
}

module.exports = app;
