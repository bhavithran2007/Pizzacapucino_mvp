-- CreateTable
CREATE TABLE `Admin` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(60) NOT NULL,
    `email` VARCHAR(120) NULL,
    `fullName` VARCHAR(120) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'BRANCH_ADMIN', 'STAFF') NOT NULL DEFAULT 'SUPER_ADMIN',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Admin_username_key`(`username`),
    UNIQUE INDEX `Admin_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Branch` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(25) NULL,
    `addressLine1` VARCHAR(255) NOT NULL,
    `addressLine2` VARCHAR(255) NULL,
    `city` VARCHAR(120) NULL,
    `state` VARCHAR(120) NULL,
    `postalCode` VARCHAR(20) NULL,
    `mapsUrl` VARCHAR(500) NULL,
    `totalTables` INTEGER NOT NULL DEFAULT 0,
    `totalSeats` INTEGER NOT NULL DEFAULT 0,
    `opensAt` VARCHAR(5) NULL,
    `closesAt` VARCHAR(5) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Branch_code_key`(`code`),
    UNIQUE INDEX `Branch_slug_key`(`slug`),
    INDEX `Branch_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(120) NOT NULL,
    `mobileNumber` VARCHAR(20) NOT NULL,
    `altMobileNumber` VARCHAR(20) NULL,
    `email` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Customer_mobileNumber_idx`(`mobileNumber`),
    INDEX `Customer_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reservation` (
    `id` VARCHAR(191) NOT NULL,
    `bookingCode` VARCHAR(20) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `serviceDate` DATE NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `guestCount` INTEGER NOT NULL,
    `reservationType` ENUM('TABLE_ONLY', 'TABLE_WITH_PREORDER') NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `paymentStatus` ENUM('NOT_REQUIRED', 'PENDING', 'AWAITING_CONFIRMATION', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'NOT_REQUIRED',
    `paymentMethod` ENUM('NONE', 'CASH', 'CARD', 'MANUAL_UPI_QR', 'RAZORPAY') NOT NULL DEFAULT 'NONE',
    `occasion` ENUM('NONE', 'BIRTHDAY', 'ANNIVERSARY', 'BUSINESS_MEETING', 'FAMILY_DINNER', 'OTHER') NOT NULL DEFAULT 'NONE',
    `specialRequests` TEXT NULL,
    `policyAccepted` BOOLEAN NOT NULL DEFAULT false,
    `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `advanceDue` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `advancePaid` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `balanceDue` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `manualPaymentNote` VARCHAR(255) NULL,
    `source` VARCHAR(50) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Reservation_bookingCode_key`(`bookingCode`),
    INDEX `Reservation_branchId_serviceDate_idx`(`branchId`, `serviceDate`),
    INDEX `Reservation_branchId_startAt_endAt_idx`(`branchId`, `startAt`, `endAt`),
    INDEX `Reservation_status_idx`(`status`),
    INDEX `Reservation_paymentStatus_idx`(`paymentStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReservationItem` (
    `id` VARCHAR(191) NOT NULL,
    `reservationId` VARCHAR(191) NOT NULL,
    `menuItemId` VARCHAR(191) NULL,
    `itemNameSnapshot` VARCHAR(120) NOT NULL,
    `itemPriceSnapshot` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReservationItem_reservationId_idx`(`reservationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MenuItem` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(30) NULL,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(80) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `imageUrl` VARCHAR(500) NULL,
    `dietaryType` ENUM('VEG', 'NON_VEG', 'EGG', 'BEVERAGE', 'DESSERT') NOT NULL DEFAULT 'VEG',
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MenuItem_code_key`(`code`),
    UNIQUE INDEX `MenuItem_slug_key`(`slug`),
    INDEX `MenuItem_category_idx`(`category`),
    INDEX `MenuItem_isAvailable_idx`(`isAvailable`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `reservationId` VARCHAR(191) NOT NULL,
    `provider` ENUM('NONE', 'MANUAL_UPI_QR', 'RAZORPAY') NOT NULL DEFAULT 'NONE',
    `method` ENUM('NONE', 'CASH', 'CARD', 'MANUAL_UPI_QR', 'RAZORPAY') NOT NULL DEFAULT 'NONE',
    `status` ENUM('NOT_REQUIRED', 'PENDING', 'AWAITING_CONFIRMATION', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `advancePercentage` INTEGER NOT NULL DEFAULT 50,
    `currency` VARCHAR(8) NOT NULL DEFAULT 'INR',
    `transactionRef` VARCHAR(120) NULL,
    `instructions` TEXT NULL,
    `proofRequested` BOOLEAN NOT NULL DEFAULT true,
    `proofStored` BOOLEAN NOT NULL DEFAULT false,
    `paidAt` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `verifiedByAdminId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Payment_reservationId_idx`(`reservationId`),
    INDEX `Payment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `id` VARCHAR(191) NOT NULL,
    `group` VARCHAR(80) NOT NULL,
    `key` VARCHAR(120) NOT NULL,
    `value` JSON NOT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Setting_key_key`(`key`),
    INDEX `Setting_group_idx`(`group`),
    INDEX `Setting_isPublic_idx`(`isPublic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NULL,
    `reservationId` VARCHAR(191) NULL,
    `type` ENUM('NEW_BOOKING', 'PAYMENT_UPDATE', 'BOOKING_STATUS', 'SYSTEM') NOT NULL,
    `channel` ENUM('DASHBOARD', 'EMAIL', 'SMS', 'WHATSAPP') NOT NULL DEFAULT 'DASHBOARD',
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `metadata` JSON NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Notification_adminId_isRead_idx`(`adminId`, `isRead`),
    INDEX `Notification_reservationId_idx`(`reservationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnalyticsEvent` (
    `id` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(120) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `reservationId` VARCHAR(191) NULL,
    `payload` JSON NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnalyticsEvent_eventType_idx`(`eventType`),
    INDEX `AnalyticsEvent_occurredAt_idx`(`occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reservation` ADD CONSTRAINT `Reservation_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReservationItem` ADD CONSTRAINT `ReservationItem_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `Reservation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReservationItem` ADD CONSTRAINT `ReservationItem_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `MenuItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `Reservation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_verifiedByAdminId_fkey` FOREIGN KEY (`verifiedByAdminId`) REFERENCES `Admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `Admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `Reservation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalyticsEvent` ADD CONSTRAINT `AnalyticsEvent_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnalyticsEvent` ADD CONSTRAINT `AnalyticsEvent_reservationId_fkey` FOREIGN KEY (`reservationId`) REFERENCES `Reservation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

