const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createSOS,
  createCheckinMissed,
  resolveAlert,
  getUserAlerts,
  getGroupAlerts,
} = require('../controllers/alertController');

const router = express.Router();



router.post('/sos', protect, createSOS);



router.post('/checkin-missed', protect, createCheckinMissed);



router.patch('/:id/resolve', protect, resolveAlert);



router.get('/mine', protect, getUserAlerts);



router.get('/group', protect, getGroupAlerts);

module.exports = router;
