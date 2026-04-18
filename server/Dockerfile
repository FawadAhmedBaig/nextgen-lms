FROM node:20-alpine
WORKDIR /app
# Install build tools for any native dependencies (like bcrypt)
RUN apk add --no-generated-build-deps --no-cache python3 make g++
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]