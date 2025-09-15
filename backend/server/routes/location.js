const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { savePoint, getLast, getHistory } = require('../controllers/locationController');

router.use(protect);

router.post('/point', savePoint);

router.get('/last', getLast);

router.get('/history', getHistory);

module.exports = router;