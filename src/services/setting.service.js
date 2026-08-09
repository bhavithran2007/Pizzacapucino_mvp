const prisma = require('../config/prisma');

const DEFAULT_SETTINGS = {
  'restaurant.details': {
    group: 'restaurant',
    isPublic: true,
    value: {
      name: 'Pizza Capucino',
      email: 'pizzacapucino@gmail.com',
      phone: '+918680986888',
      tagline: 'Reserve your table and pre-order your favourites.',
      logoUrl: '/assets/images/logo1.png',
      address: 'Tiruchirappalli, Tamil Nadu',
      googleMaps: '',
      branchesExpected: 3
    }
  },
  'booking.policy': {
    group: 'booking',
    isPublic: true,
    value: {
      minimumGuests: 1,
      maximumGuests: 20,
      advancePaymentPercentage: 50,
      defaultReservationDurationMinutes: 120,
      cancellationHours: 4,
      operatingHoursStart: '10:00',
      operatingHoursEnd: '23:00'
    }
  },
  'payments.manual_upi': {
    group: 'payments',
    isPublic: true,
    value: {
      provider: 'MANUAL_UPI_QR',
      qrImageUrl: '',
      whatsappNumber: '+918680986888',
      screenshotStoredOnServer: false,
      instructions:
        'Pay the advance amount using the QR code, then send the payment screenshot to our WhatsApp number.'
    }
  },
  'smtp.config': {
    group: 'smtp',
    isPublic: false,
    value: {
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: '',
      fromName: 'Pizza Capucino',
      fromEmail: 'pizzacapucino@gmail.com'
    }
  },
  'notifications.config': {
    group: 'notifications',
    isPublic: false,
    value: {
      sendBookingConfirmationEmail: true,
      sendStatusEmails: true,
      sendPaymentEmails: true
    }
  }
};

async function getSettingRecord(key) {
  const record = await prisma.setting.findUnique({
    where: { key }
  });

  if (record) {
    return record;
  }

  const fallback = DEFAULT_SETTINGS[key];

  if (!fallback) {
    return null;
  }

  return {
    key,
    group: fallback.group,
    isPublic: fallback.isPublic,
    value: fallback.value
  };
}

async function getSettingValue(key) {
  const record = await getSettingRecord(key);
  return record?.value || null;
}

async function upsertSetting(key, value, override = {}) {
  const fallback = DEFAULT_SETTINGS[key] || {};

  return prisma.setting.upsert({
    where: { key },
    update: {
      group: override.group || fallback.group || 'general',
      isPublic: override.isPublic ?? fallback.isPublic ?? false,
      value
    },
    create: {
      key,
      group: override.group || fallback.group || 'general',
      isPublic: override.isPublic ?? fallback.isPublic ?? false,
      value
    }
  });
}

async function getSettingsBundle() {
  const [restaurant, bookingPolicy, manualPayment, smtpConfig, notificationsConfig] = await Promise.all([
    getSettingValue('restaurant.details'),
    getSettingValue('booking.policy'),
    getSettingValue('payments.manual_upi'),
    getSettingValue('smtp.config'),
    getSettingValue('notifications.config')
  ]);

  return {
    restaurant: restaurant || DEFAULT_SETTINGS['restaurant.details'].value,
    bookingPolicy: bookingPolicy || DEFAULT_SETTINGS['booking.policy'].value,
    manualPayment: manualPayment || DEFAULT_SETTINGS['payments.manual_upi'].value,
    smtp: smtpConfig || DEFAULT_SETTINGS['smtp.config'].value,
    notifications: notificationsConfig || DEFAULT_SETTINGS['notifications.config'].value
  };
}

async function updateSettingsBundle(payload) {
  const operations = [];

  if (payload.restaurant) {
    operations.push(
      upsertSetting('restaurant.details', payload.restaurant, {
        group: 'restaurant',
        isPublic: true
      })
    );
  }

  if (payload.bookingPolicy) {
    operations.push(
      upsertSetting('booking.policy', payload.bookingPolicy, {
        group: 'booking',
        isPublic: true
      })
    );
  }

  if (payload.manualPayment) {
    operations.push(
      upsertSetting('payments.manual_upi', payload.manualPayment, {
        group: 'payments',
        isPublic: true
      })
    );
  }

  if (payload.smtp) {
    operations.push(
      upsertSetting('smtp.config', payload.smtp, {
        group: 'smtp',
        isPublic: false
      })
    );
  }

  if (payload.notifications) {
    operations.push(
      upsertSetting('notifications.config', payload.notifications, {
        group: 'notifications',
        isPublic: false
      })
    );
  }

  await Promise.all(operations);
  return getSettingsBundle();
}

module.exports = {
  DEFAULT_SETTINGS,
  getSettingRecord,
  getSettingValue,
  getSettingsBundle,
  updateSettingsBundle,
  upsertSetting
};
