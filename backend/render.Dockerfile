# Use a standard Node.js light image now that Puppeteer is removed
FROM node:20.12.2-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json from the 'backend' directory
# (Since build context is root, we access backend/...)
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the backend code
COPY backend/ .

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
