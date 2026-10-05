FROM node:22-alpine

# Install build tools and native dependencies for canvas & voice
RUN apk add --no-cache \
    python3 make g++ \
    cairo-dev pango-dev jpeg-dev giflib-dev \
    ffmpeg docker-cli curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the bot files
COPY . .

# Start the bot
CMD ["sh", "-c", "npm install && node index.js"]
