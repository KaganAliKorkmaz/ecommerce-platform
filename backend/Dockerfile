FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Modify the entry point to use our Docker-specific database configuration
RUN cp config/db.docker.js config/db.js

# Expose the port the app runs on
EXPOSE 5001

# Command to run the application
CMD ["node", "server.js"] 