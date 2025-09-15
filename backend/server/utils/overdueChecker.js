const HikeSession = require('../models/HikeSession');
const { sendTelegramMessage, sendEmail } = require('../services/notificationService');


const CHECK_INTERVAL_MS = Number(process.env.OVERDUE_CHECK_INTERVAL_MS || 60_000);

async function checkOverdue() {
  try {
    const now = new Date();
    const overdue = await HikeSession.find({
      status: 'active',
      controlTime: { $ne: null, $lte: now },
      overdueNotified: { $ne: true },
    }).limit(50);

    for (const hike of overdue) {
      const msg = `Overdue hike detected:\nRoute: ${hike.routeName} (${hike.routeId})\nUser: ${hike.userId || 'unknown'}\nStarted: ${hike.startTime?.toISOString()}\nControl time: ${hike.controlTime?.toISOString()}`;
      try {
        await sendTelegramMessage(msg);
        if (process.env.RESCUER_EMAILS) {
          const emails = process.env.RESCUER_EMAILS.split(',');
          for (const email of emails) await sendEmail(email, 'Overdue Hike', msg);
        }
      } catch (e) {
        console.error('Overdue notify error:', e.message || e);
      }

      hike.overdueNotified = true;
      await hike.save();
    }
  } catch (err) {
    console.error('Overdue check error:', err.message || err);
  }
}

setInterval(checkOverdue, CHECK_INTERVAL_MS);
console.log(`[overdueChecker] Started with interval ${CHECK_INTERVAL_MS}ms`);

module.exports = { checkOverdue };


