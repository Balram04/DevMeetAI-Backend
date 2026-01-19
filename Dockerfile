# DevMeet Backend Dockerfile
# Uses Debian slim to reduce native-module headaches (e.g., bcrypt).

FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

# Copy source
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Basic container healthcheck (Node 20+ has global fetch)
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "app.js"]
