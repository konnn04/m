FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN cd server && npm install

# Copy application files
COPY . .

# Create required directories
RUN mkdir -p /data/public/audios /data/public/infos

# Set proper permissions
RUN chmod +x /app/server/lib/yt-dlp

# Expose port
EXPOSE 3000

# Set the command to run the application
CMD ["npm", "start"]