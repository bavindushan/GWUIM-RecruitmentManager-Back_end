const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const setupSwaggerDocs = require('./src/config/swagger');
const Router = require('./src/routes/route');
const errorMiddleware = require('./src/middleware/errorMiddleware');
const { scheduleOtpCleanup } = require('./src/jobs/deleteOtp.cron');

dotenv.config();

const app = express();

app.use(cors({
  origin: '*', // or better: ['http://172.17.141.3:5173'] for only your frontend
  credentials: true // if you use cookies/session
}));

app.use(express.json());

app.use('/api', Router);

setupSwaggerDocs(app);

//scheduleOtpCleanup(); // Start OTP cleanup job

app.use(errorMiddleware);

app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger docs available at: http://localhost:${PORT}/api-docs`);
});
