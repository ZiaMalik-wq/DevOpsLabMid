# Stage 1: Build Stage
FROM node:20-alpine AS build_stage

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the project (Assuming 'npm run build' generates a 'dist' folder)
RUN npm run build

# Stage 2: Serve Stage
FROM nginx:stable-alpine

# Copy built files from build_stage to Nginx default public directory
COPY --from=build_stage /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
