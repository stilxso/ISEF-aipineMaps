const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  mediaUrl: String, // фото, видео
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
