# 1. Base Image: Bun use kar rahe hain
FROM oven/bun:latest

# 2. Environment Variables
ENV NODE_ENV=production

# 3. Create app directory
WORKDIR /app

# 4. Install system dependencies & Docker CLI (to manage itself)
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    lsb-release \
    libnss3 \
    libatk-bridge2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update && apt-get install -y docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# 5. Copy package files
COPY package.json bun.lock ./

# 6. Install dependencies
# Note: We install everything first so that we have 'playwright' available for the next step
RUN bun install

# 7. Install Playwright browsers (Specifically Chromium)
# WHY: Isse hum COPY . . se PEHLE install kar rahe hain. 
# Ab agar aap sirf code change karoge, toh browser dobara download nahi hoga (Cache hit).
RUN bun playwright install chromium

# 8. Copy the rest of the code
COPY . .

# 9. Expose API Port
EXPOSE 3001

# 10. Start the bot
CMD ["bun", "src/index.ts"]
