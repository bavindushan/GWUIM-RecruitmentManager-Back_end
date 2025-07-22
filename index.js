const app = require('./src/app');
const setupSwaggerDocs = require('./src/config/swagger');
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Swagger setup
setupSwaggerDocs(app);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});