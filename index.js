const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const setupSwaggerDocs = require('./src/config/swagger');
const Router = require('./src/routes/route');
const errorMiddleware = require('./src/middleware/errorMiddleware');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', Router);

setupSwaggerDocs(app);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger docs available at: http://localhost:${PORT}/api-docs`);
});
