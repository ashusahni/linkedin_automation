# Use the official Puppeteer image which includes Chrome and all dependencies
FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root to install dependencies if needed, or stick to 'pptruser'
# The base image sets USER pptruser by default.
# We need to copy our app files as root first, then chown them.

USER root

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
# Use 'npm ci' for clean install, --ignore-scripts prevents potential issues with puppeteer downloading chrome (since it's already in base image)
# BUT puppeteer package needs to know where chrome is. 
# The base image sets PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true by default.
RUN npm ci

# Copy the rest of the application code
COPY . .

# Ensure pptruser owns the app directory
RUN chown -R pptruser:pptruser /usr/src/app

# Switch back to the non-root user provided by the base image
USER pptruser

# Expose port (default 5000 in your app)
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
