# Stage 1: Build
FROM node:18 AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy Prisma schema BEFORE npm install
COPY prisma ./prisma

# Install only production dependencies
RUN npm install --production

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Stage 2: Production image
FROM node:18-slim

WORKDIR /app

# Copy only the necessary files from build stage
COPY --from=build /app ./

# Expose backend port
EXPOSE 5000

# Run server
CMD ["node", "index.js"]
