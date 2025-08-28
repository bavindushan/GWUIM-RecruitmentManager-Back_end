const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const AppError = require('../utils/AppError');


// Generate random 6-digit OTP
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

async function createOTP(userId, purpose) {
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + process.env.OTP_EXPIRATION_MINUTES * 60000);

    // Store OTP in DB
    await prisma.oTP.create({
        data: {
            userId,
            otpCode,
            purpose,
            expiresAt
        }
    });

    return otpCode;
}

async function verifyOTP(userId, otpCode, purpose) {
    const otpRecord = await prisma.oTP.findFirst({
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
    await prisma.oTP.deleteMany({
        where: {
            expiresAt: { lt: new Date() }
        }
    });
}

module.exports = { createOTP, verifyOTP, deleteExpiredOTPs };
