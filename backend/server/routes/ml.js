const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { renderForest, predictRisk } = require('../controllers/mlController');
const { aiPrompt } = require('../controllers/aiController');

router.get('/render-forest', protect, renderForest);
router.post('/predict-risk', protect, predictRisk);
router.post('/prompt', protect, aiPrompt);

module.exports = router;