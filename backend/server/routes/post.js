const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createPost, getGroupPosts } = require('../controllers/postController');

const router = express.Router();

router.post('/', protect, createPost);
router.get('/:groupId', protect, getGroupPosts);

module.exports = router;