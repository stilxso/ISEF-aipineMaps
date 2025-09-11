const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createGroup, joinGroup, getMyGroups } = require('../controllers/groupController');

const router = express.Router();

router.post('/', protect, createGroup);
router.post('/:id/join', protect, joinGroup);
router.get('/my', protect, getMyGroups);

module.exports = router;
