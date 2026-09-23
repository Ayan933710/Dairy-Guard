# Build stage
FROM node:20-alpine as build-stage

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Accept build arguments for environment variables
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_AI_URL
ARG VITE_ANDROID_APK_URL

# Set them as environment variables during the build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_AI_URL=$VITE_AI_URL
ENV VITE_ANDROID_APK_URL=$VITE_ANDROID_APK_URL

# Increase Node heap size to prevent Out of Memory errors on low-RAM servers
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine as production-stage

# Copy built assets from the build stage to Nginx's default directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy a custom Nginx configuration to handle React Router (SPA routing)
# We will create this file in the next step, or use a default one inline
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
