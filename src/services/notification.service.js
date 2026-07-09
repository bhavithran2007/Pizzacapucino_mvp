const { NotificationChannel, NotificationType } = require('@prisma/client');
const prisma = require('../config/prisma');

async function createAdminNotifications({
  title,
  message,
  type = NotificationType.SYSTEM,
  reservationId = null,
  metadata = null,
  channel = NotificationChannel.DASHBOARD
}) {
  const admins = await prisma.admin.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true
    }
  });

  if (!admins.length) {
    return [];
  }

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      adminId: admin.id,
      reservationId,
      type,
      channel,
      title,
      message,
      metadata,
      isRead: false
    }))
  });

  return prisma.notification.findMany({
    where: {
      title,
      message
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: admins.length
  });
}

async function listNotifications(filters = {}) {
  const take = Math.min(50, Math.max(1, filters.limit || 12));

  const where = {};

  if (filters.unreadOnly) {
    where.isRead = false;
  }

  if (filters.adminId) {
    where.adminId = filters.adminId;
  }

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take
    }),
    prisma.notification.count({
      where: {
        ...(filters.adminId ? { adminId: filters.adminId } : {}),
        isRead: false
      }
    })
  ]);

  return {
    unreadCount,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      type: item.type,
      channel: item.channel,
      isRead: item.isRead,
      createdAt: item.createdAt,
      metadata: item.metadata
    }))
  };
}

async function markNotificationRead(notificationId) {
  return prisma.notification.update({
    where: {
      id: notificationId
    },
    data: {
      isRead: true
    }
  });
}

async function markAllNotificationsRead(adminId) {
  return prisma.notification.updateMany({
    where: {
      adminId,
      isRead: false
    },
    data: {
      isRead: true
    }
  });
}

module.exports = {
  createAdminNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
};
