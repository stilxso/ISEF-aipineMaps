const cron = require('node-cron');
const Alert = require('../models/Alert');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

cron.schedule('*/15 * * * *', async () => {
  const inactiveUsers = await User.find({ lastCheckin: { $lt: Date.now() - 15*60*1000 } });
  for (const user of inactiveUsers) {
    const alert = await Alert.create({ user: user._id, type: 'CHECKIN_MISSED' });
    await notificationService.notifyAlert(alert, user);
  }
});
