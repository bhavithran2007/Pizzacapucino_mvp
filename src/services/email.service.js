const nodemailer = require('nodemailer');
const { getSettingsBundle } = require('./setting.service');

let cachedKey = null;
let cachedTransporter = null;

async function getTransporter() {
  const settings = await getSettingsBundle();
  const smtp = settings.smtp || {};
  const key = JSON.stringify(smtp);

  if (cachedTransporter && cachedKey === key) {
    return cachedTransporter;
  }

  if (smtp.host && smtp.user) {
    cachedTransporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port || 587),
      secure: Boolean(smtp.secure),
      auth: {
        user: smtp.user,
        pass: smtp.pass || ''
      }
    });
  } else {
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true
    });
  }

  cachedKey = key;
  return cachedTransporter;
}

function buildTemplate({ title, bodyLines }) {
  const text = [title, '', ...bodyLines].join('\n');
  const html =
    `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">` +
    `<h2 style="margin-bottom:16px;">${title}</h2>` +
    bodyLines.map((line) => `<p style="margin:0 0 12px;">${line}</p>`).join('') +
    `</div>`;

  return { text, html };
}

async function sendEmail({ to, subject, title, bodyLines }) {
  if (!to) {
    return { skipped: true, reason: 'missing-recipient' };
  }

  const settings = await getSettingsBundle();
  const transporter = await getTransporter();
  const template = buildTemplate({ title, bodyLines });
  const fromName = settings.smtp?.fromName || settings.restaurant?.name || 'Pizza Capucino';
  const fromEmail = settings.smtp?.fromEmail || settings.restaurant?.email || 'no-reply@example.com';

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    text: template.text,
    html: template.html
  });

  return {
    skipped: false,
    transportMode: transporter.options?.jsonTransport ? 'json' : 'smtp',
    messageId: info.messageId || null
  };
}

module.exports = {
  sendEmail
};
