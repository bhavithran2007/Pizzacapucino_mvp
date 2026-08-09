require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PrismaClient, AdminRole, DietaryType } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_SEED_USERNAME || 'admin';
  const password = process.env.ADMIN_SEED_PASSWORD || 'ChangeMe123!';
  const email = process.env.ADMIN_SEED_EMAIL || 'admin@pizzacapucino.local';
  const fullName = process.env.ADMIN_SEED_FULL_NAME || 'Pizza Capucino Admin';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { username },
    update: {
      email,
      fullName,
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true
    },
    create: {
      username,
      email,
      fullName,
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true
    }
  });

  const branches = [
    {
      code: 'CHATHIRAM',
      name: 'Chathiram',
      slug: 'chathiram',
      phone: '+918489813988',
      addressLine1: 'Shop No. A-56, VM Complex, Melachinthamani',
      addressLine2: 'Chathiram',
      city: 'Tiruchirappalli',
      state: 'Tamil Nadu',
      postalCode: '620002',
      totalTables: 20,
      totalSeats: 80,
      opensAt: '10:00',
      closesAt: '23:00',
      isActive: true
    },
    {
      code: 'TENNUR',
      name: 'Tennur',
      slug: 'tennur',
      phone: '+918220472988',
      addressLine1: 'Thillai Nagar Main Road (12th Cross)',
      addressLine2: 'Opposite Shanawaz Hospital',
      city: 'Tiruchirappalli',
      state: 'Tamil Nadu',
      postalCode: '620018',
      totalTables: 18,
      totalSeats: 72,
      opensAt: '10:00',
      closesAt: '23:00',
      isActive: true
    },
    {
      code: 'KATTUR',
      name: 'Kattur',
      slug: 'kattur',
      phone: '+918489264688',
      addressLine1: '4, 268, 4th Street, AVM Jyothi Nagar',
      addressLine2: 'Sakthi Nagar, Pappakurichi Kattur',
      city: 'Tiruchirappalli',
      state: 'Tamil Nadu',
      postalCode: '620019',
      totalTables: 16,
      totalSeats: 64,
      opensAt: '10:00',
      closesAt: '23:00',
      isActive: true
    }
  ];

  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { code: branch.code },
      update: branch,
      create: branch
    });
  }

  const settings = [
    {
      group: 'restaurant',
      key: 'restaurant.details',
      isPublic: true,
      value: {
        name: process.env.RESTAURANT_NAME || 'Pizza Capucino',
        email: 'pizzacapucino@gmail.com',
        phone: '+918680986888',
        tagline: 'Reserve your table and pre-order your favourites.',
        logoUrl: '/assets/images/logo1.png',
        address: 'Tiruchirappalli, Tamil Nadu',
        googleMaps: '',
        branchesExpected: 3
      }
    },
    {
      group: 'booking',
      key: 'booking.policy',
      isPublic: true,
      value: {
        minimumGuests: 1,
        maximumGuests: 20,
        defaultReservationDurationMinutes: 120,
        cancellationHours: 4,
        advancePaymentPercentage: 50,
        operatingHoursStart: '10:00',
        operatingHoursEnd: '23:00'
      }
    },
    {
      group: 'payments',
      key: 'payments.manual_upi',
      isPublic: true,
      value: {
        provider: 'MANUAL_UPI_QR',
        qrImageUrl: process.env.PUBLIC_UPI_QR_URL || '',
        whatsappNumber: process.env.WHATSAPP_BOOKING_NUMBER || '+918680986888',
        screenshotStoredOnServer: false,
        instructions: 'Pay the advance amount using the QR code, then send the payment screenshot to our WhatsApp number.'
      }
    },
    {
      group: 'smtp',
      key: 'smtp.config',
      isPublic: false,
      value: {
        host: process.env.SMTP_HOST || '',
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || 'false') === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        fromName: process.env.SMTP_FROM_NAME || 'Pizza Capucino',
        fromEmail: process.env.SMTP_FROM_EMAIL || 'pizzacapucino@gmail.com'
      }
    },
    {
      group: 'notifications',
      key: 'notifications.config',
      isPublic: false,
      value: {
        sendBookingConfirmationEmail: true,
        sendStatusEmails: true,
        sendPaymentEmails: true
      }
    }
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting
    });
  }

  const menuItems = [
    {
      code: 'PIZZA-CHICKEN',
      name: 'Chicken Pizza',
      slug: 'chicken-pizza',
      description: 'Loaded chicken pizza with cheese and house seasoning.',
      category: 'Pizza',
      price: 299,
      imageUrl: '/assets/menu/chickenpizza.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: true,
      isAvailable: true
    },
    {
      code: 'PIZZA-VEG',
      name: 'Veg Pizza',
      slug: 'veg-pizza',
      description: 'Classic veg pizza topped with fresh vegetables and mozzarella.',
      category: 'Pizza',
      price: 259,
      imageUrl: '/assets/menu/vegpizza.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: true,
      isAvailable: true
    },
    {
      code: 'WRAP-SHAWARMA',
      name: 'Shawarma',
      slug: 'shawarma-wrap',
      description: 'Juicy shawarma wrap with signature sauce and fresh fillings.',
      category: 'Wraps',
      price: 189,
      imageUrl: '/assets/menu/shawarma.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: true,
      isAvailable: true
    },
    {
      code: 'BURGER-CLASSIC',
      name: 'Burger',
      slug: 'classic-burger',
      description: 'Classic burger with fresh lettuce, cheese, and house sauce.',
      category: 'Burgers',
      price: 179,
      imageUrl: '/assets/menu/burger.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'PASTA-CREAMY',
      name: 'Pasta',
      slug: 'creamy-pasta',
      description: 'Creamy pasta tossed with herbs and a rich house-made sauce.',
      category: 'Mains',
      price: 219,
      imageUrl: '/assets/menu/pasta.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'SANDWICH-GRILL',
      name: 'Sandwich',
      slug: 'grilled-sandwich',
      description: 'Grilled sandwich with crispy edges and generous filling.',
      category: 'Snacks',
      price: 149,
      imageUrl: '/assets/menu/sandwich.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'WRAP-GRILLED',
      name: 'Grilled Wrap',
      slug: 'grilled-wrap',
      description: 'Warm grilled wrap with tender filling and crunchy vegetables.',
      category: 'Wraps',
      price: 169,
      imageUrl: '/assets/menu/grilledwrap.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'SIDES-FRIES',
      name: 'French Fries',
      slug: 'french-fries',
      description: 'Golden fries served hot and crisp.',
      category: 'Sides',
      price: 119,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'DRINK-MOJITO',
      name: 'Mojito',
      slug: 'mint-mojito',
      description: 'Refreshing mint mojito, ideal for group pre-orders.',
      category: 'Beverages',
      price: 129,
      imageUrl: '/assets/menu/mojito.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'DRINK-JUICE',
      name: 'Fresh Juice',
      slug: 'fresh-juice',
      description: 'Freshly prepared juice made to order.',
      category: 'Beverages',
      price: 139,
      imageUrl: '/assets/menu/freshjuice.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'DRINK-COFFEE',
      name: 'Cold Coffee',
      slug: 'cold-coffee',
      description: 'Chilled cold coffee with a smooth creamy finish.',
      category: 'Beverages',
      price: 149,
      imageUrl: '/assets/menu/coldcoffee.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'DESSERT-FALOODA',
      name: 'Falooda',
      slug: 'falooda',
      description: 'Sweet falooda topped with chilled layers and flavor.',
      category: 'Desserts',
      price: 159,
      imageUrl: '/assets/menu/falooda.jpg',
      dietaryType: DietaryType.DESSERT,
      isFeatured: false,
      isAvailable: true
    }
  ];

  for (const menuItem of menuItems) {
    await prisma.menuItem.upsert({
      where: { slug: menuItem.slug },
      update: menuItem,
      create: menuItem
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
