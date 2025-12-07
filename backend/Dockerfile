# Multi-stage build for production optimization
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package metadata
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (incl. devDeps for build)
RUN npm ci && npm cache clean --force

# Copy source and config
COPY src ./src
COPY nest-cli.json ./nest-cli.json

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs \
  && adduser -S banking -u 1001

# Copy production node_modules and built app from builder
COPY --from=builder --chown=banking:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=banking:nodejs /app/dist ./dist
COPY --chown=banking:nodejs package*.json ./

# Switch to non-root user
USER banking

# Expose port
EXPOSE 3001

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]