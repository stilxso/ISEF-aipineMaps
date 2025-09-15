// controllers/groupController.js
const Group = require('../models/Group');
const User = require('../models/User');

// создать новую группу
exports.createGroup = async (req, res) => {
  try {
    const group = await Group.create({
      name: req.body.name,
      members: [req.user.id],
    });
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create group', error: err.message });
  }
};

// вступить в группу
exports.joinGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (!group.members.includes(req.user.id)) {
      group.members.push(req.user.id);
      await group.save();
    }

    res.json(group);
  } catch (err) {
    res.status(500).json({ message: 'Failed to join group', error: err.message });
  }
};

// получить группы пользователя
exports.getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch groups', error: err.message });
  }
};
