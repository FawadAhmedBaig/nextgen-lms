# 1. Use a Node.js environment
FROM node:20-alpine

# 2. Install Chromium and system dependencies for Puppeteer
# Added dbus, udev, and mesa-gl for better headless stability
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dbus \
    udev \
    mesa-gl \
    python3 \
    make \
    g++

# 3. Puppeteer Environment Variables
# Ensures Puppeteer points to the Alpine binary
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# 4. Install dependencies (Clean install)
COPY package*.json ./
RUN npm install --omit=dev

# 5. Copy source code
COPY . .

# 6. Expose the API port
EXPOSE 5000

# 7. Start the server
CMD ["npm", "start"]