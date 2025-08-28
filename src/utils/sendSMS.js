// // utils/sendSMS.js
// const twilio = require("twilio");

// const accountSid = process.env.TWILIO_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const client = twilio(accountSid, authToken);

// async function sendSMS(to, message) {
//   try {
//     const response = await client.messages.create({
//       body: message,
//       from: process.env.TWILIO_PHONE_NUMBER, // Twilio Number
//       to: to, // Recipient Number with country code
//     });
//     console.log("SMS sent:", response.sid);
//     return true;
//   } catch (err) {
//     console.error("Error sending SMS:", err);
//     return false;
//   }
// }

// module.exports = sendSMS;
