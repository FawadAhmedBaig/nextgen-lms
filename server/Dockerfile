# 1. Use a Node.js environment
FROM node:20-alpine

# 2. Install Chromium and dependencies for Puppeteer on Alpine
# We add build-base for native modules and chromium for PDF generation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    make \
    g++

# 3. Tell Puppeteer to use the installed Chromium instead of trying to download it
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# 4. Install dependencies
COPY package*.json ./
RUN npm install

# 5. Copy source code
COPY . .

# 6. Expose the API port
EXPOSE 5000

# 7. Start the server
CMD ["npm", "start"]