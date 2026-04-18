# Use a lightweight Node.js environment
FROM node:20-alpine

WORKDIR /app

# Install build tools for native dependencies (fixing the syntax error)
RUN apk add --no-cache python3 make g++

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and production .env
COPY . .

# Expose the API port
EXPOSE 5000

# Start the server using the compiled index.js
CMD ["npm", "start"]