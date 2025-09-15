const express = require('express');
const router = express.Router();
const { register, login, updatePreparation, getProfile } = require('../controllers/authController');
const { protect: authMiddleware } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, getProfile);
router.put('/update-preparation', authMiddleware, updatePreparation);

module.exports = router;