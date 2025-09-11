const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  createSOS,
  resolveAlert,
  getUserAlerts,
  getGroupAlerts,
} = require('../controllers/alertController');

const router = express.Router();

// 📌 Отправить SOS
// POST /api/alerts/sos
router.post('/sos', protect, createSOS);

// 📌 Закрыть тревогу
// PATCH /api/alerts/:id/resolve
router.patch('/:id/resolve', protect, resolveAlert);

// 📌 Получить все тревоги текущего пользователя
// GET /api/alerts/mine
router.get('/mine', protect, getUserAlerts);

// 📌 Получить тревоги группы (если юзер в группе)
// GET /api/alerts/group
router.get('/group', protect, getGroupAlerts);

module.exports = router;
