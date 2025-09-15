const User = require('../models/User');

const requireRescuer = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'rescuer') {
      return res.status(403).json({ message: 'Access denied. Rescuer role required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { requireRescuer };