FROM node:18-alpine

WORKDIR /app

# Copy root package.json first
COPY package*.json ./

# Copy server package.json
COPY server/package*.json ./server/

# Install dependencies
RUN cd server && npm install

# Copy application files
COPY . .

# Create required directories
RUN mkdir -p /data/public/audios /data/public/infos

# Set permissions for yt-dlp
RUN chmod +x server/lib/yt-dlp

# Expose port
EXPOSE 3000

# Set the command to run the application
CMD ["npm", "start"]