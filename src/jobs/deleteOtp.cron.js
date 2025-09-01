// jobs/deleteOtp.cron.js
const { deleteExpiredOTPs } = require('../services/otpService.service');

function scheduleOtpCleanup() {
    // Run cleanup immediately on server start
    (async () => {
        try {
            console.log('Running initial OTP cleanup...');
            await deleteExpiredOTPs();
            console.log('Initial expired OTPs deleted successfully');
        } catch (err) {
            console.error('Error deleting expired OTPs on startup:', err);
        }
    })();

    // Schedule cleanup every hour
    setInterval(async () => {
        try {
            console.log('Running scheduled OTP cleanup...');
            await deleteExpiredOTPs();
            console.log('Expired OTPs deleted successfully');
        } catch (err) {
            console.error('Error deleting expired OTPs:', err);
        }
    }, 60 * 60 * 1000); // 1 hour in milliseconds
}

module.exports = { scheduleOtpCleanup };
