const { createOTP, verifyOTP } = require('../services/otpService.service');

// Generate OTP
exports.generateOTP = async (req, res, next) => {
    try {
        const { purpose } = req.body;
        const userId = req.user.id; // from JWT
        const phoneNumbers = [req.user.phoneNumber]; // array for multiple numbers support

        await createOTP(userId, purpose, phoneNumbers);

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

        res.status(200).json({ status: 'success', message: 'OTP verified successfully' });
    } catch (err) {
        next(err);
    }
};
