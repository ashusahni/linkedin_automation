# Use a standard Node.js light image now that Puppeteer is removed
FROM node:20.12.2-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose port (default 5000 in your app)
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
