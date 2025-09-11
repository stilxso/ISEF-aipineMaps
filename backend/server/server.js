require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');

// Routes
const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/location');
const groupRoutes = require('./routes/group');
const postRoutes = require('./routes/post');
const alertRoutes = require('./routes/alert');
const mlRoutes = require('./routes/ml');
const downloadRoutes = require('./routes/download');
const uploadRoutes = require('./routes/upload');


// Middleware
const errorHandler = require('./middleware/errorMiddleware');

// Utils
const connectDB = require('./config/db');
// require('./utils/scheduler'); // Uncomment when node-cron is installed

const app = express();

// Middleware setup
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api', downloadRoutes);
app.use('/api', uploadRoutes); // Add download routes
// app.use('/api/ml', mlRoutes); // Uncomment when ML routes are implemented

// Error handling middleware (must be last)
// app.use(errorHandler); // Temporarily commented out for testing

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Server is running at http://localhost:5000`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect DB:', err);
    process.exit(1);
  });

module.exports = app;
