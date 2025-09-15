const Post = require('../models/Post');

exports.createPost = async (req, res) => {
  const post = await Post.create({
    group: req.body.groupId,
    author: req.user.id,
    text: req.body.text,
    mediaUrl: req.body.mediaUrl || null
  });
  res.status(201).json(post);
};

exports.getGroupPosts = async (req, res) => {
  const posts = await Post.find({ group: req.params.groupId })
    .populate('author', 'name email')
    .sort({ createdAt: -1 });
  res.json(posts);
};
