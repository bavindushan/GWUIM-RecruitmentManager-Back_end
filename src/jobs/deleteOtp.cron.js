// jobs/deleteOtp.cron.js
const { deleteExpiredOTPs } = require('../services/otpService.service');

function scheduleOtpCleanup() {
    // Runs every hour
    setInterval(() => {
        console.log('Running OTP cleanup job...');
        deleteExpiredOTPs()
            .then(() => console.log('Expired OTPs deleted successfully'))
            .catch((err) => console.error('Error deleting expired OTPs:', err));
    }, 60 * 60 * 1000); // 1 hour in ms
}

module.exports = { scheduleOtpCleanup };
