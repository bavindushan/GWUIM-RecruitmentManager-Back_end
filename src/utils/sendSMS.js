const axios = require('axios');
const crypto = require('crypto');

const SMS_URL = process.env.SMS_API_URL; 
const SMS_USERNAME = process.env.SMS_API_USERNAME; 
const SMS_PASSWORD = process.env.SMS_API_PASSWORD;

function generateDigest(password) {
    return crypto.createHash('md5').update(password).digest('hex');
}

function getCreatedTimestamp() {
    // ISO 8601 format: YYYY-MM-DDTHH:mm:ss (GMT)
    return new Date().toISOString().split('.')[0];
}

async function sendSMS({ numbers, message, mask, campaignName }) {
    try {
        if (!numbers || numbers.length === 0) {
            throw new Error('No recipient numbers provided');
        }
        const digest = generateDigest(SMS_PASSWORD);
        const now = getCreatedTimestamp();

        // Construct payload according to Dialog API v4.2.1
        const payload = {
            messages: numbers.map((number, idx) => ({
                clientRef: `ref_${Date.now()}_${idx}`, // unique reference per message
                number,
                mask,
                text: message,
                campaignName
            }))
        };

        const headers = {
            'Content-Type': 'application/json',
            'USER': SMS_USERNAME,
            'DIGEST': digest,
            'CREATED': now
        };

        const response = await axios.post(SMS_URL, payload, { headers });

        if (response.data.resultCode !== 0) {
            console.error('SMS API returned error:', response.data);
            throw new Error(`SMS sending failed: ${response.data.resultDesc}`);
        }

        return response.data;
    } catch (err) {
        console.error('Error sending SMS:', err.response?.data || err.message);
        throw new Error('Failed to send SMS');
    }
}

module.exports = { sendSMS };
