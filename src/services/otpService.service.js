const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { sendSMS } = require('../utils/sendSMS');

// Generate random 6-digit OTP
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

async function createOTP(userId, purpose, phoneNumbers) {
    const otpCode = generateOTP();
    const otpExpirationMinutes = Number(process.env.OTP_EXPIRATION_MINUTES) || 5; // default 5 min
    const expiresAt = new Date(Date.now() + otpExpirationMinutes * 60000);


    // Store OTP in DB
    await prisma.otp.create({
        data: {
            userId,
            otpCode,
            purpose,
            expiresAt
        }
    });

    // Send SMS with OTP
    const message = `Your OTP for ${purpose} is ${otpCode}. It will expire in ${process.env.OTP_EXPIRATION_MINUTES} minutes.`;

    try {
        await sendSMS({
            numbers: phoneNumbers,  // Example: ['94771234567', '94771234568']
            message,
            mask: 'GWUIM-Recruitment-System',
            campaignName: 'OTP_Service_for_change_password'
        });
    } catch (error) {
        console.error("Failed to send SMS:", error.message);
    }

    return otpCode;
}

async function verifyOTP(userId, otpCode, purpose) {
    const otpRecord = await prisma.otp.findFirst({
        where: { userId, otpCode, purpose }
    });

    if (!otpRecord) {
        throw new AppError('Invalid OTP', 400);
    }

    if (new Date() > otpRecord.expiresAt) {
        throw new AppError('OTP expired', 400);
    }

    // OTP valid → delete after use
    await prisma.oTP.delete({ where: { id: otpRecord.id } });

    return true;
}

async function deleteExpiredOTPs() {
    await prisma.otp.deleteMany({
        where: {
            expiresAt: { lt: new Date() }
        }
    });
}

module.exports = { createOTP, verifyOTP, deleteExpiredOTPs };
