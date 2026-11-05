# Multi-stage production build for GDG LabOps Execution Runner
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Production Runner Image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV RUNNER_PORT=8080

# Install Docker CLI inside runner container so it can communicate with host docker socket
RUN apk add --no-cache docker-cli

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Expose HTTP & WebSocket port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start runner server
CMD ["node", "dist/server.js"]
