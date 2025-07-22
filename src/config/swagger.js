const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const PORT = process.env.PORT || 5000

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Recruitment Manager API',
            version: '1.0.0',
            description: 'API documentation for the Recruitment Manager system',
        },
        servers: [
            {
                url: `http://localhost:${PORT}/api`,
            },
        ],
    },
    apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwaggerDocs = (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = setupSwaggerDocs;
