const Alert = require('../models/Alert');

exports.createSOS = async (req, res) => {
  const alert = await Alert.create({
    user: req.user.id,
    type: 'SOS'
  });
  // TODO: вызвать notificationService
  res.status(201).json(alert);
};

exports.getUserAlerts = async (req, res) => {
    try {
      const alerts = await Alert.find({ user: req.user.id }).sort({ createdAt: -1 });
      res.json(alerts);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch alerts', error: err.message });
    }
  };

exports.resolveAlert = async (req, res) => {
 try {
   const alert = await Alert.findById(req.params.id);
   if (!alert) return res.status(404).json({ message: 'Alert not found' });
   if (alert.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

   alert.status = 'resolved';
   await alert.save();
   res.json(alert);
 } catch (err) {
   res.status(500).json({ message: 'Failed to resolve alert', error: err.message });
 }
};

  exports.getGroupAlerts = async (req, res) => {
    try {
      if (!req.user.groupId) {
        return res.status(400).json({ message: 'User not in a group' });
      }
      const alerts = await Alert.find({}).populate('user', 'name').sort({ createdAt: -1 });
      res.json(alerts.filter(a => a.user.groupId?.toString() === req.user.groupId.toString()));
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch group alerts', error: err.message });
    }
  };
  