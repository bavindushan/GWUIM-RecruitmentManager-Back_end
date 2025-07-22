const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const setupSwaggerDocs = require('./src/config/swagger');
const Router = require('./src/routes/route');
const errorMiddleware = require('./src/middleware/errorMiddleware'); 

// Load env variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', Router);

// Swagger docs
setupSwaggerDocs(app);

// Error handler 
app.use(errorMiddleware);

// Load scheduled jobs


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger docs available at: http://localhost:${PORT}/api-docs`);
});
