# Build Stage
FROM node:20-alpine as build
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

# Copy source and the production environment file
COPY . .

# Ensure Vite uses the production environment variables
RUN npm run build -- --mode production

# Production Stage
FROM nginx:stable-alpine
# Copy the build output from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# COPY custom nginx config to handle React Router and API Proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]