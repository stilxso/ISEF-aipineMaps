require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const compression = require('compression');
const path = require('path');


const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/location');
const groupRoutes = require('./routes/group');
const postRoutes = require('./routes/post');
const alertRoutes = require('./routes/alert');
const mlRoutes = require('./routes/ml');
const downloadRoutes = require('./routes/download');
const uploadRoutes = require('./routes/upload');
const peaksRoutes = require('./routes/peaks');
const hikeRoutes = require('./routes/hike');



const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');
const { generalLimiter, uploadLimiter, authLimiter, apiLimiter } = require('./middleware/rateLimitMiddleware');


const connectDB = require('./config/db');
require('./utils/overdueChecker');

const app = express();


const corsOptions = {
  origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production'
    ? false 
    : ['http://localhost:3000', 'http://192.168.1.108:8081', 'exp://localhost:8081', 'http://localhost:8081', 'http://10.0.2.2:8081', 'http://10.0.2.2:5000', 'http://192.168.1.108:5000']),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};


app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression()); 
app.use(cors(corsOptions));


app.use(generalLimiter);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));


if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}


app.get('/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));


app.use('/public', express.static(path.join(__dirname, 'public')));


app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/locations', apiLimiter, locationRoutes);
app.use('/api/groups', apiLimiter, groupRoutes);
app.use('/api/posts', apiLimiter, postRoutes);
app.use('/api/alerts', apiLimiter, alertRoutes);
app.use('/api/peaks', apiLimiter, peaksRoutes);
app.use('/api/hike', apiLimiter, hikeRoutes);
app.use('/api', apiLimiter, downloadRoutes);
app.use('/api', uploadLimiter, uploadRoutes); 
app.use('/api/ml', apiLimiter, mlRoutes);


app.use(notFoundHandler);


app.use(errorHandler);

const PORT = process.env.PORT || 5000;


connectDB()
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err.message);
    console.log('Server will start without database connection');
  })
  .finally(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Server is running at http://localhost:${PORT}`);
      console.log(`Server is accessible at http://192.168.1.108:${PORT} (for mobile devices)`);
    });
  });

module.exports = app;
