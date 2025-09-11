const cron = require('node-cron');
const Alert = require('../models/Alert');
const User = require('../models/user');

cron.schedule('*/15 * * * *', async () => {
  const inactiveUsers = await User.find({ lastCheckin: { $lt: Date.now() - 15*60*1000 } });
  inactiveUsers.forEach(async (user) => {
    await Alert.create({ user: user._id, type: 'CHECKIN_MISSED' });
    // notificationService.notifyGroup(user.groupId, `${user.name} не отметился`);
  });
});
