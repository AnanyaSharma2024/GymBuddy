FROM node:18-alpine

WORKDIR /usr/src/app

# Install dependencies first (better layer caching - only reinstalls when
# package.json/lockfile change, not on every source code edit)
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Run as a non-root user for defense-in-depth inside the container
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
