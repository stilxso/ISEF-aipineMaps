const nodemailer = require('nodemailer');
const TelegramBot = require('node-telegram-bot-api');


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT || 587,
  secure: false, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const telegramChatId = process.env.TELEGRAM_CHAT_ID;

async function sendEmail(to, subject, text) {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    };
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

async function sendTelegramMessage(text) {
  try {
    await bot.sendMessage(telegramChatId, text);
    console.log('Telegram message sent successfully');
  } catch (error) {
    console.error('Error sending Telegram message:', error);
  }
}

async function notifyAlert(alert, user) {
  const message = `Alert: ${alert.type} for user ${user.fullName || user.name} (${user.email}). Location: ${alert.location ? `${alert.location.latitude}, ${alert.location.longitude}` : 'Unknown'}. Risk: ${alert.riskAssessment?.riskLevel || 'unknown'}`;

  
  const rescuerEmails = process.env.RESCUER_EMAILS ? process.env.RESCUER_EMAILS.split(',') : [];
  for (const email of rescuerEmails) {
    await sendEmail(email, `Alert: ${alert.type}`, message);
  }

  
  await sendTelegramMessage(message);
}

module.exports = {
  sendEmail,
  sendTelegramMessage,
  notifyAlert,
};