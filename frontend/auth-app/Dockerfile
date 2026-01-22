FROM node:18-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Set build-time environment variable if passed
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Write to .env so CRA can read it during build
RUN echo "REACT_APP_API_URL=$REACT_APP_API_URL" >> .env

# Build the React app
RUN npm run build

# Production stage using NGINX to serve static files
FROM nginx:alpine

# Copy build output to NGINX HTML dir
COPY --from=build /app/build /usr/share/nginx/html

# Optional: custom NGINX config (replace if needed)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
