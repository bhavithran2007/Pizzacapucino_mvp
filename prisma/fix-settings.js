// One-off repair script: finds any Setting row where isPublic isn't a clean
// boolean (this can happen from a manual DB edit or bad migration) and
// resets it based on the defaults in setting.service.js.
//
// Run once with: node prisma/fix-settings.js
// Safe to delete after running.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_IS_PUBLIC = {
  'restaurant.details': true,
  'booking.policy': true,
  'payments.manual_upi': true,
  'smtp.config': false,
  'notifications.config': false
};

async function main() {
  // Raw query because Prisma's typed client will refuse to even read a row
  // where isPublic isn't a valid boolean.
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, \`key\`, isPublic FROM Setting`
  );

  console.log(`Found ${rows.length} setting row(s).`);

  for (const row of rows) {
    const isBadBoolean = row.isPublic !== 0 && row.isPublic !== 1 && row.isPublic !== true && row.isPublic !== false;

    if (isBadBoolean) {
      const fixedValue = DEFAULT_IS_PUBLIC[row.key] ?? false;
      console.log(`Fixing "${row.key}": isPublic was "${row.isPublic}" -> setting to ${fixedValue}`);

      await prisma.$executeRawUnsafe(
        `UPDATE Setting SET isPublic = ? WHERE id = ?`,
        fixedValue,
        row.id
      );
    } else {
      console.log(`OK: "${row.key}" isPublic = ${row.isPublic}`);
    }
  }

  console.log('Done.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Fix script failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
