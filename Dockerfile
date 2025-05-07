FROM node:lts-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy rest of the source code
COPY . .

# Expose port and start app
EXPOSE 3000
CMD ["node", "src/index.js"]
