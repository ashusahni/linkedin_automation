# Use the official Puppeteer image which includes Chrome and all dependencies
FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root to install dependencies
USER root

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json from the 'backend' directory
# (Since build context is root, we access backend/...)
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the backend code
COPY backend/ .

# Ensure pptruser owns the app directory
RUN chown -R pptruser:pptruser /usr/src/app

# Switch back to the non-root user provided by the base image
USER pptruser

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
