# 1. Base Image: Bun use kar rahe hain
FROM oven/bun:latest

# 2. Environment Variables
ENV NODE_ENV=production

# 3. Create app directory
WORKDIR /app

# 4. Install Playwright system dependencies (Important for Browser!)
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# 5. Copy package files and install
COPY package.json bun.lock ./
RUN bun install

# 6. Copy the rest of the code
COPY . .

# 7. Install Playwright browsers (Specifically Chromium)
RUN bun playwright install chromium

# 8. Expose API Port
EXPOSE 3001

# 9. Start the bot
CMD ["bun", "src/index.ts"]
