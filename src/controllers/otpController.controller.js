const { createOTP, verifyOTP } = require('../services/otpService.service');
const sendSMS = require('../utils/sendSMS.js');

// Generate OTP
exports.generateOTP = async (req, res, next) => {
    try {
        const { purpose } = req.body;
        const userId = req.user.id; // from JWT

        const otpCode = await createOTP(userId, purpose);

        // Send OTP via SMS API
        await sendSMS(req.user.phoneNumber, `Your Password Reset OTP is: ${otpCode}`);

        res.status(200).json({ status: 'success', message: 'OTP sent successfully' });
    } catch (err) {
        next(err);
    }
};

// Verify OTP
exports.verifyOTP = async (req, res, next) => {
    try {
        const { otpCode, purpose } = req.body;
        const userId = req.user.id; // from JWT

        await verifyOTP(userId, otpCode, purpose);

        // Apply changes (e.g., password reset) here if needed
        res.status(200).json({ status: 'success', message: 'OTP verified successfully' });
    } catch (err) {
        next(err);
    }
};
