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
      code: 'VEGP-001',
      name: 'Mini Veg Pizza',
      slug: 'mini-veg-pizza',
      description: '',
      category: 'Veg Pizza',
      price: 65,
      imageUrl: '/assets/menu/vegpizza.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'VEGP-002',
      name: 'Veg Pizza',
      slug: 'veg-pizza',
      description: '',
      category: 'Veg Pizza',
      price: 115,
      imageUrl: '/assets/menu/vegpizza.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'VEGP-003',
      name: 'Double Cheese Veg Pizza',
      slug: 'double-cheese-veg-pizza',
      description: '',
      category: 'Veg Pizza',
      price: 145,
      imageUrl: '/assets/menu/vegpizza.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'VEGP-004',
      name: 'Paneer Pizza',
      slug: 'paneer-pizza',
      description: '',
      category: 'Veg Pizza',
      price: 140,
      imageUrl: '/assets/menu/vegpizza.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'VEGP-005',
      name: 'Spicy & Crispy Veg Pizza',
      slug: 'spicy-crispy-veg-pizza',
      description: '',
      category: 'Veg Pizza',
      price: 140,
      imageUrl: '/assets/menu/vegpizza.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'VEGP-006',
      name: 'American Corn Pizza',
      slug: 'american-corn-pizza',
      description: '',
      category: 'Veg Pizza',
      price: 140,
      imageUrl: '/assets/menu/vegpizza.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'VEGP-007',
      name: 'Mushroom Pizza',
      slug: 'mushroom-pizza',
      description: '',
      category: 'Veg Pizza',
      price: 140,
      imageUrl: '/assets/menu/vegpizza.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'VEGP-008',
      name: 'Full Cheese Margarita Pizza',
      slug: 'full-cheese-margarita-pizza',
      description: '',
      category: 'Veg Pizza',
      price: 140,
      imageUrl: '/assets/menu/vegpizza.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'VEGP-009',
      name: 'Veg Loaded Pizza (Corn, Mushroom, Paneer)',
      slug: 'veg-loaded-pizza-corn-mushroom-paneer',
      description: '',
      category: 'Veg Pizza',
      price: 180,
      imageUrl: '/assets/menu/vegpizza.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'CHIC-010',
      name: 'Mini Chicken Pizza',
      slug: 'mini-chicken-pizza',
      description: '',
      category: 'Chicken Pizza',
      price: 75,
      imageUrl: '/assets/menu/chickenpizza.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'CHIC-011',
      name: 'Chicken Pizza',
      slug: 'chicken-pizza',
      description: '',
      category: 'Chicken Pizza',
      price: 145,
      imageUrl: '/assets/menu/chickenpizza.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'CHIC-012',
      name: 'Double Cheese Chicken Pizza',
      slug: 'double-cheese-chicken-pizza',
      description: '',
      category: 'Chicken Pizza',
      price: 175,
      imageUrl: '/assets/menu/chickenpizza.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'CHIC-013',
      name: 'Fried Chicken Pizza',
      slug: 'fried-chicken-pizza',
      description: '',
      category: 'Chicken Pizza',
      price: 160,
      imageUrl: '/assets/menu/chickenpizza.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'CHIC-014',
      name: 'Corn & Chicken Pizza',
      slug: 'corn-chicken-pizza',
      description: '',
      category: 'Chicken Pizza',
      price: 160,
      imageUrl: '/assets/menu/chickenpizza.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'CHIC-015',
      name: 'Peri Peri Chicken Pizza',
      slug: 'peri-peri-chicken-pizza',
      description: '',
      category: 'Chicken Pizza',
      price: 165,
      imageUrl: '/assets/menu/chickenpizza.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'CHIC-016',
      name: 'BBQ Chicken Pizza',
      slug: 'bbq-chicken-pizza',
      description: '',
      category: 'Chicken Pizza',
      price: 165,
      imageUrl: '/assets/menu/chickenpizza.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'CHIC-017',
      name: 'Chicken Loaded Pizza',
      slug: 'chicken-loaded-pizza',
      description: '',
      category: 'Chicken Pizza',
      price: 185,
      imageUrl: '/assets/menu/chickenpizza.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'CREA-018',
      name: 'Veg Pasta',
      slug: 'veg-pasta',
      description: '',
      category: 'Creamy Pasta',
      price: 100,
      imageUrl: '/assets/menu/pasta.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'CREA-019',
      name: 'American Corn Pasta',
      slug: 'american-corn-pasta',
      description: '',
      category: 'Creamy Pasta',
      price: 110,
      imageUrl: '/assets/menu/pasta.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'CREA-020',
      name: 'Tender Chicken Pasta',
      slug: 'tender-chicken-pasta',
      description: '',
      category: 'Creamy Pasta',
      price: 120,
      imageUrl: '/assets/menu/pasta.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'CREA-021',
      name: 'Corn & Chicken Pasta',
      slug: 'corn-chicken-pasta',
      description: '',
      category: 'Creamy Pasta',
      price: 130,
      imageUrl: '/assets/menu/pasta.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'CREA-022',
      name: 'Peri Peri Chicken Pasta',
      slug: 'peri-peri-chicken-pasta',
      description: '',
      category: 'Creamy Pasta',
      price: 130,
      imageUrl: '/assets/menu/pasta.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'HOTD-023',
      name: 'Crispy Veg - Hot Dog',
      slug: 'crispy-veg-hot-dog',
      description: '',
      category: 'Hot Dog',
      price: 100,
      imageUrl: '/assets/menu/hotdog.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'HOTD-024',
      name: 'Corn & Aloo Tikki - Hot Dog',
      slug: 'corn-aloo-tikki-hot-dog',
      description: '',
      category: 'Hot Dog',
      price: 110,
      imageUrl: '/assets/menu/hotdog.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'HOTD-025',
      name: 'Crispy Chicken - Hot Dog',
      slug: 'crispy-chicken-hot-dog',
      description: '',
      category: 'Hot Dog',
      price: 120,
      imageUrl: '/assets/menu/hotdog.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-026',
      name: 'Crispy Veg Wrap',
      slug: 'crispy-veg-wrap',
      description: '',
      category: 'Grilled Veg Wrap',
      price: 95,
      imageUrl: '/assets/menu/grilledwrap.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-027',
      name: 'Paneer Tikka Wrap',
      slug: 'paneer-tikka-wrap',
      description: '',
      category: 'Grilled Veg Wrap',
      price: 125,
      imageUrl: '/assets/menu/grilledwrap.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-028',
      name: 'Veg Loaded Wrap (Mushroom, Corn, Aloo)',
      slug: 'veg-loaded-wrap-mushroom-corn-aloo',
      description: '',
      category: 'Grilled Veg Wrap',
      price: 130,
      imageUrl: '/assets/menu/grilledwrap.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-029',
      name: 'Capucino Chicken Shawarma',
      slug: 'capucino-chicken-shawarma',
      description: '',
      category: 'Grilled Chicken Shawarma',
      price: 110,
      imageUrl: '/assets/menu/shawarma.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-030',
      name: 'Corn & Chicken Shawarma',
      slug: 'corn-chicken-shawarma',
      description: '',
      category: 'Grilled Chicken Shawarma',
      price: 120,
      imageUrl: '/assets/menu/shawarma.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-031',
      name: 'Peri Peri Chicken Shawarma',
      slug: 'peri-peri-chicken-shawarma',
      description: '',
      category: 'Grilled Chicken Shawarma',
      price: 130,
      imageUrl: '/assets/menu/shawarma.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'BURG-032',
      name: 'Veg Burger',
      slug: 'veg-burger',
      description: '',
      category: 'Burger',
      price: 100,
      imageUrl: '/assets/menu/burger.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'BURG-033',
      name: 'Veg Cheese Burger',
      slug: 'veg-cheese-burger',
      description: '',
      category: 'Burger',
      price: 115,
      imageUrl: '/assets/menu/burger.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'BURG-034',
      name: 'Tower Burger - Veg',
      slug: 'tower-burger-veg',
      description: '',
      category: 'Burger',
      price: 135,
      imageUrl: '/assets/menu/burger.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'BURG-035',
      name: 'Tower Burger - Chicken',
      slug: 'tower-burger-chicken',
      description: '',
      category: 'Burger',
      price: 155,
      imageUrl: '/assets/menu/burger.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'BURG-036',
      name: 'Fried Chicken Burger',
      slug: 'fried-chicken-burger',
      description: '',
      category: 'Burger',
      price: 120,
      imageUrl: '/assets/menu/burger.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'BURG-037',
      name: 'Fried Chicken Cheese Burger',
      slug: 'fried-chicken-cheese-burger',
      description: '',
      category: 'Burger',
      price: 135,
      imageUrl: '/assets/menu/burger.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'BURG-038',
      name: 'Peri Peri Chicken Burger',
      slug: 'peri-peri-chicken-burger',
      description: '',
      category: 'Burger',
      price: 130,
      imageUrl: '/assets/menu/burger.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'BURG-039',
      name: 'Cheesy Peri Peri Chicken Burger',
      slug: 'cheesy-peri-peri-chicken-burger',
      description: '',
      category: 'Burger',
      price: 145,
      imageUrl: '/assets/menu/burger.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'BURG-040',
      name: 'BBQ Chicken Burger',
      slug: 'bbq-chicken-burger',
      description: '',
      category: 'Burger',
      price: 130,
      imageUrl: '/assets/menu/burger.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'BURG-041',
      name: 'BBQ Chicken Cheese Burger',
      slug: 'bbq-chicken-cheese-burger',
      description: '',
      category: 'Burger',
      price: 145,
      imageUrl: '/assets/menu/burger.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-042',
      name: 'Veg Sandwich',
      slug: 'veg-sandwich',
      description: '',
      category: 'Grilled Sandwich',
      price: 90,
      imageUrl: '/assets/menu/sandwich.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-043',
      name: 'American Corn Sandwich',
      slug: 'american-corn-sandwich',
      description: '',
      category: 'Grilled Sandwich',
      price: 100,
      imageUrl: '/assets/menu/sandwich.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-044',
      name: 'Paneer Sandwich',
      slug: 'paneer-sandwich',
      description: '',
      category: 'Grilled Sandwich',
      price: 100,
      imageUrl: '/assets/menu/sandwich.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-045',
      name: 'Mushroom Sandwich',
      slug: 'mushroom-sandwich',
      description: '',
      category: 'Grilled Sandwich',
      price: 100,
      imageUrl: '/assets/menu/sandwich.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-046',
      name: 'Chicken Sandwich',
      slug: 'chicken-sandwich',
      description: '',
      category: 'Grilled Sandwich',
      price: 110,
      imageUrl: '/assets/menu/sandwich.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-047',
      name: 'Corn & Chicken Sandwich',
      slug: 'corn-chicken-sandwich',
      description: '',
      category: 'Grilled Sandwich',
      price: 120,
      imageUrl: '/assets/menu/sandwich.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-048',
      name: 'Fried Chicken Sandwich',
      slug: 'fried-chicken-sandwich',
      description: '',
      category: 'Grilled Sandwich',
      price: 120,
      imageUrl: '/assets/menu/sandwich.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-049',
      name: 'Peri Peri Chicken Sandwich',
      slug: 'peri-peri-chicken-sandwich',
      description: '',
      category: 'Grilled Sandwich',
      price: 125,
      imageUrl: '/assets/menu/sandwich.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'GRIL-050',
      name: 'BBQ Chicken Sandwich',
      slug: 'bbq-chicken-sandwich',
      description: '',
      category: 'Grilled Sandwich',
      price: 125,
      imageUrl: '/assets/menu/sandwich.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-051',
      name: 'Pack Chicken (3pc Leg, 3pc Lollipop, 3pc Wings) + Mini Chicken Pizza Free - Reg',
      slug: 'pack-chicken-3pc-leg-3pc-lollipop-3pc-wings-mini-chicken-pizza-free-reg',
      description: '',
      category: 'Fried Chicken',
      price: 450,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-052',
      name: 'Pack Chicken (3pc Leg, 3pc Lollipop, 3pc Wings) + Mini Chicken Pizza Free - Spicy',
      slug: 'pack-chicken-3pc-leg-3pc-lollipop-3pc-wings-mini-chicken-pizza-free-spicy',
      description: '',
      category: 'Fried Chicken',
      price: 470,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-053',
      name: 'Big 8 Leg Combo (8 Legs + Free Fried Chicken Burger) - Reg',
      slug: 'big-8-leg-combo-8-legs-free-fried-chicken-burger-reg',
      description: '',
      category: 'Fried Chicken',
      price: 640,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-054',
      name: 'Big 8 Leg Combo (8 Legs + Free Fried Chicken Burger) - Spicy',
      slug: 'big-8-leg-combo-8-legs-free-fried-chicken-burger-spicy',
      description: '',
      category: 'Fried Chicken',
      price: 660,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-055',
      name: 'Crispy Chicken Leg & Wings (2+2 Pc) - Reg',
      slug: 'crispy-chicken-leg-wings-2-2-pc-reg',
      description: '',
      category: 'Fried Chicken',
      price: 210,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-056',
      name: 'Crispy Chicken Leg & Wings (2+2 Pc) - Spicy',
      slug: 'crispy-chicken-leg-wings-2-2-pc-spicy',
      description: '',
      category: 'Fried Chicken',
      price: 220,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-057',
      name: '1/2 Plate Leg & Wings (1+1) - Reg',
      slug: '1-2-plate-leg-wings-1-1-reg',
      description: '',
      category: 'Fried Chicken',
      price: 110,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-058',
      name: '1/2 Plate Leg & Wings (1+1) - Spicy',
      slug: '1-2-plate-leg-wings-1-1-spicy',
      description: '',
      category: 'Fried Chicken',
      price: 120,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-059',
      name: 'Crispy Chicken Leg (1 Pc) - Reg',
      slug: 'crispy-chicken-leg-1-pc-reg',
      description: '',
      category: 'Fried Chicken',
      price: 80,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-060',
      name: 'Crispy Chicken Leg (1 Pc) - Spicy',
      slug: 'crispy-chicken-leg-1-pc-spicy',
      description: '',
      category: 'Fried Chicken',
      price: 85,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-061',
      name: 'Chicken Lollipop (4 Pcs) - Reg',
      slug: 'chicken-lollipop-4-pcs-reg',
      description: '',
      category: 'Fried Chicken',
      price: 150,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-062',
      name: 'Chicken Lollipop (4 Pcs) - Spicy',
      slug: 'chicken-lollipop-4-pcs-spicy',
      description: '',
      category: 'Fried Chicken',
      price: 160,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-063',
      name: 'Chicken Wings (5 Pcs) - Reg',
      slug: 'chicken-wings-5-pcs-reg',
      description: '',
      category: 'Fried Chicken',
      price: 150,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-064',
      name: 'Chicken Wings (5 Pcs) - Spicy',
      slug: 'chicken-wings-5-pcs-spicy',
      description: '',
      category: 'Fried Chicken',
      price: 160,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-065',
      name: 'Chicken Pops (14 Pcs) - Reg',
      slug: 'chicken-pops-14-pcs-reg',
      description: '',
      category: 'Fried Chicken',
      price: 140,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-066',
      name: 'Chicken Pops (14 Pcs) - Spicy',
      slug: 'chicken-pops-14-pcs-spicy',
      description: '',
      category: 'Fried Chicken',
      price: 150,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-067',
      name: 'Crispy Chicken Strips (6 Pcs) - Reg',
      slug: 'crispy-chicken-strips-6-pcs-reg',
      description: '',
      category: 'Fried Chicken',
      price: 160,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-068',
      name: 'Crispy Chicken Strips (6 Pcs) - Spicy',
      slug: 'crispy-chicken-strips-6-pcs-spicy',
      description: '',
      category: 'Fried Chicken',
      price: 170,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-069',
      name: 'Chicken Cutlet (2 Pcs)',
      slug: 'chicken-cutlet-2-pcs',
      description: '',
      category: 'Fried Chicken',
      price: 95,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-070',
      name: 'Chicken Loaded Fries - Reg',
      slug: 'chicken-loaded-fries-reg',
      description: '',
      category: 'Fried Chicken',
      price: 180,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-071',
      name: 'Chicken Loaded Fries - Spicy',
      slug: 'chicken-loaded-fries-spicy',
      description: '',
      category: 'Fried Chicken',
      price: 190,
      imageUrl: '/assets/menu/freid chicken.jpg',
      dietaryType: DietaryType.NON_VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-072',
      name: 'French Fries (Mini) - Reg',
      slug: 'french-fries-mini-reg',
      description: '',
      category: 'Fries (Veg)',
      price: 70,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-073',
      name: 'French Fries (Mini) - Mayo',
      slug: 'french-fries-mini-mayo',
      description: '',
      category: 'Fries (Veg)',
      price: 90,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-074',
      name: 'Peri Peri French Fries (Mini) - Reg',
      slug: 'peri-peri-french-fries-mini-reg',
      description: '',
      category: 'Fries (Veg)',
      price: 80,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-075',
      name: 'Peri Peri French Fries (Mini) - Mayo',
      slug: 'peri-peri-french-fries-mini-mayo',
      description: '',
      category: 'Fries (Veg)',
      price: 100,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-076',
      name: 'French Fries (Large) - Reg',
      slug: 'french-fries-large-reg',
      description: '',
      category: 'Fries (Veg)',
      price: 135,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-077',
      name: 'French Fries (Large) - Mayo',
      slug: 'french-fries-large-mayo',
      description: '',
      category: 'Fries (Veg)',
      price: 165,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-078',
      name: 'Peri Peri French Fries (Large) - Reg',
      slug: 'peri-peri-french-fries-large-reg',
      description: '',
      category: 'Fries (Veg)',
      price: 150,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-079',
      name: 'Peri Peri French Fries (Large) - Mayo',
      slug: 'peri-peri-french-fries-large-mayo',
      description: '',
      category: 'Fries (Veg)',
      price: 180,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-080',
      name: 'Veg Cutlet (2 Pcs) - Reg',
      slug: 'veg-cutlet-2-pcs-reg',
      description: '',
      category: 'Fries (Veg)',
      price: 60,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-081',
      name: 'Veg Cutlet (2 Pcs) - Mayo',
      slug: 'veg-cutlet-2-pcs-mayo',
      description: '',
      category: 'Fries (Veg)',
      price: 80,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-082',
      name: 'Baby Corn Crispy Fries - Reg',
      slug: 'baby-corn-crispy-fries-reg',
      description: '',
      category: 'Fries (Veg)',
      price: 70,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-083',
      name: 'Baby Corn Crispy Fries - Mayo',
      slug: 'baby-corn-crispy-fries-mayo',
      description: '',
      category: 'Fries (Veg)',
      price: 90,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-084',
      name: 'Chilli Garlic Potato (14 Pcs) - Reg',
      slug: 'chilli-garlic-potato-14-pcs-reg',
      description: '',
      category: 'Fries (Veg)',
      price: 65,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-085',
      name: 'Chilli Garlic Potato (14 Pcs) - Mayo',
      slug: 'chilli-garlic-potato-14-pcs-mayo',
      description: '',
      category: 'Fries (Veg)',
      price: 85,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-086',
      name: 'Cheese Balls (7 Pcs) - Reg',
      slug: 'cheese-balls-7-pcs-reg',
      description: '',
      category: 'Fries (Veg)',
      price: 120,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-087',
      name: 'Cheese Balls (7 Pcs) - Mayo',
      slug: 'cheese-balls-7-pcs-mayo',
      description: '',
      category: 'Fries (Veg)',
      price: 140,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-088',
      name: 'Veg Finger (5 Pcs) - Reg',
      slug: 'veg-finger-5-pcs-reg',
      description: '',
      category: 'Fries (Veg)',
      price: 75,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-089',
      name: 'Veg Finger (5 Pcs) - Mayo',
      slug: 'veg-finger-5-pcs-mayo',
      description: '',
      category: 'Fries (Veg)',
      price: 95,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRIE-090',
      name: 'Cheesy Garlic Bread (5 Pcs)',
      slug: 'cheesy-garlic-bread-5-pcs',
      description: '',
      category: 'Fries (Veg)',
      price: 90,
      imageUrl: '/assets/menu/fries.jpg',
      dietaryType: DietaryType.VEG,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'MILK-091',
      name: 'Vanilla Milkshake with I/C Float',
      slug: 'vanilla-milkshake-with-i-c-float',
      description: '',
      category: 'Milkshake with Float',
      price: 100,
      imageUrl: '/assets/menu/coldcoffee.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'MILK-092',
      name: 'Strawberry Milkshake with I/C Float',
      slug: 'strawberry-milkshake-with-i-c-float',
      description: '',
      category: 'Milkshake with Float',
      price: 100,
      imageUrl: '/assets/menu/coldcoffee.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'MILK-093',
      name: 'Oreo Milkshake with I/C Float',
      slug: 'oreo-milkshake-with-i-c-float',
      description: '',
      category: 'Milkshake with Float',
      price: 115,
      imageUrl: '/assets/menu/coldcoffee.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'MILK-094',
      name: 'Chocolate Milkshake with I/C Float',
      slug: 'chocolate-milkshake-with-i-c-float',
      description: '',
      category: 'Milkshake with Float',
      price: 120,
      imageUrl: '/assets/menu/coldcoffee.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'MILK-095',
      name: 'Butter Scotch with I/C Float',
      slug: 'butter-scotch-with-i-c-float',
      description: '',
      category: 'Milkshake with Float',
      price: 120,
      imageUrl: '/assets/menu/coldcoffee.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'MILK-096',
      name: 'Blackcurrant Milkshake with I/C Float',
      slug: 'blackcurrant-milkshake-with-i-c-float',
      description: '',
      category: 'Milkshake with Float',
      price: 130,
      imageUrl: '/assets/menu/coldcoffee.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'MILK-097',
      name: 'Cold Coffee with I/C Float',
      slug: 'cold-coffee-with-i-c-float',
      description: '',
      category: 'Milkshake with Float',
      price: 110,
      imageUrl: '/assets/menu/coldcoffee.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'MILK-098',
      name: 'Cafe Chocolate with I/C Float',
      slug: 'cafe-chocolate-with-i-c-float',
      description: '',
      category: 'Milkshake with Float',
      price: 130,
      imageUrl: '/assets/menu/coldcoffee.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'MILK-099',
      name: 'Mini Milkshake - 50',
      slug: 'mini-milkshake-50',
      description: '',
      category: 'Milkshake with Float',
      price: 50,
      imageUrl: '/assets/menu/coldcoffee.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'MILK-100',
      name: 'Mini Milkshake - 60',
      slug: 'mini-milkshake-60',
      description: '',
      category: 'Milkshake with Float',
      price: 60,
      imageUrl: '/assets/menu/coldcoffee.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRES-101',
      name: 'Apple Juice',
      slug: 'apple-juice',
      description: '',
      category: 'Fresh Juice',
      price: 70,
      imageUrl: '/assets/menu/freshjuice.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRES-102',
      name: 'Madulai Juice',
      slug: 'madulai-juice',
      description: '',
      category: 'Fresh Juice',
      price: 70,
      imageUrl: '/assets/menu/freshjuice.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRES-103',
      name: 'ABC Juice',
      slug: 'abc-juice',
      description: '',
      category: 'Fresh Juice',
      price: 70,
      imageUrl: '/assets/menu/freshjuice.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRES-104',
      name: 'Sathukudi Juice',
      slug: 'sathukudi-juice',
      description: '',
      category: 'Fresh Juice',
      price: 50,
      imageUrl: '/assets/menu/freshjuice.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRES-105',
      name: 'Mint Lemon Juice',
      slug: 'mint-lemon-juice',
      description: '',
      category: 'Fresh Juice',
      price: 35,
      imageUrl: '/assets/menu/freshjuice.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRES-106',
      name: 'Lime Juice',
      slug: 'lime-juice',
      description: '',
      category: 'Fresh Juice',
      price: 20,
      imageUrl: '/assets/menu/freshjuice.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'MOJI-107',
      name: 'Cool Blue Mojito',
      slug: 'cool-blue-mojito',
      description: '',
      category: 'Mojito',
      price: 60,
      imageUrl: '/assets/menu/mojito.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'MOJI-108',
      name: 'Lemon Mint Mojito',
      slug: 'lemon-mint-mojito',
      description: '',
      category: 'Mojito',
      price: 60,
      imageUrl: '/assets/menu/mojito.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'MOJI-109',
      name: 'Strawberry Pink Mojito',
      slug: 'strawberry-pink-mojito',
      description: '',
      category: 'Mojito',
      price: 60,
      imageUrl: '/assets/menu/mojito.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FALO-110',
      name: 'Premium Falooda',
      slug: 'premium-falooda',
      description: '',
      category: 'Falooda',
      price: 150,
      imageUrl: '/assets/menu/falooda.jpg',
      dietaryType: DietaryType.DESSERT,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FALO-111',
      name: 'Falooda Mini',
      slug: 'falooda-mini',
      description: '',
      category: 'Falooda',
      price: 90,
      imageUrl: '/assets/menu/falooda.jpg',
      dietaryType: DietaryType.DESSERT,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FALO-112',
      name: 'Falooda Mini (1+1)',
      slug: 'falooda-mini-1-1',
      description: '',
      category: 'Falooda',
      price: 165,
      imageUrl: '/assets/menu/falooda.jpg',
      dietaryType: DietaryType.DESSERT,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FALO-113',
      name: 'Hot Brownie With Ice Cream',
      slug: 'hot-brownie-with-ice-cream',
      description: '',
      category: 'Falooda',
      price: 85,
      imageUrl: '/assets/menu/falooda.jpg',
      dietaryType: DietaryType.DESSERT,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FALO-114',
      name: 'Hot Brownie With Ice Cream (1+1)',
      slug: 'hot-brownie-with-ice-cream-1-1',
      description: '',
      category: 'Falooda',
      price: 155,
      imageUrl: '/assets/menu/falooda.jpg',
      dietaryType: DietaryType.DESSERT,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'SODA-115',
      name: 'Lemon Soda',
      slug: 'lemon-soda',
      description: '',
      category: 'Soda',
      price: 25,
      imageUrl: '/assets/menu/soda.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'SODA-116',
      name: 'Paneer Soda',
      slug: 'paneer-soda',
      description: '',
      category: 'Soda',
      price: 25,
      imageUrl: '/assets/menu/soda.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'SODA-117',
      name: 'Lemon Paneer',
      slug: 'lemon-paneer',
      description: '',
      category: 'Soda',
      price: 30,
      imageUrl: '/assets/menu/soda.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'SODA-118',
      name: 'Tea / Milk / Coffee',
      slug: 'tea-milk-coffee',
      description: '',
      category: 'Soda',
      price: 20,
      imageUrl: '/assets/menu/soda.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'SODA-119',
      name: 'Green Tea / Lemon Tea',
      slug: 'green-tea-lemon-tea',
      description: '',
      category: 'Soda',
      price: 15,
      imageUrl: '/assets/menu/soda.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'SODA-120',
      name: 'Water Bottle',
      slug: 'water-bottle',
      description: '',
      category: 'Soda',
      price: 20,
      imageUrl: '/assets/menu/soda.jpg',
      dietaryType: DietaryType.BEVERAGE,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'ICEC-121',
      name: 'Vanilla / Strawberry',
      slug: 'vanilla-strawberry',
      description: '',
      category: 'Ice Cream',
      price: 40,
      imageUrl: '/assets/menu/icecream.png',
      dietaryType: DietaryType.DESSERT,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'ICEC-122',
      name: 'Chocolate / Butter Scotch',
      slug: 'chocolate-butter-scotch',
      description: '',
      category: 'Ice Cream',
      price: 50,
      imageUrl: '/assets/menu/icecream.png',
      dietaryType: DietaryType.DESSERT,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'ICEC-123',
      name: 'Blackcurrant',
      slug: 'blackcurrant',
      description: '',
      category: 'Ice Cream',
      price: 55,
      imageUrl: '/assets/menu/icecream.png',
      dietaryType: DietaryType.DESSERT,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRUI-124',
      name: 'Vanilla F/S / Strawberry F/S',
      slug: 'vanilla-f-s-strawberry-f-s',
      description: '',
      category: 'Fruit Salad',
      price: 50,
      imageUrl: '/assets/menu/fruit salad.jpg',
      dietaryType: DietaryType.DESSERT,
      isFeatured: false,
      isAvailable: true
    },
    {
      code: 'FRUI-125',
      name: 'Butter Scotch F/S',
      slug: 'butter-scotch-f-s',
      description: '',
      category: 'Fruit Salad',
      price: 60,
      imageUrl: '/assets/menu/fruit salad.jpg',
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
