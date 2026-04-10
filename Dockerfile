FROM node:20-slim

# Install Chromium dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    fonts-liberation \
    fonts-freefont-ttf \
    fonts-noto-core \
    fonts-noto \
    wget \
    default-mysql-client \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Create necessary directories for document storage
RUN mkdir -p /app/documents/PDFs \
    /app/documents/Reports \
    /app/documents/Backups \
    /app/documents/Documents \
    /app/documents/Pledges

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "src/index.js"]
