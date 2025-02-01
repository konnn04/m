FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY server .

# Create necessary directories
RUN mkdir -p /data/public/audios /data/public/infos

# Set permissions for yt-dlp
RUN chmod +x lib/yt-dlp

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]