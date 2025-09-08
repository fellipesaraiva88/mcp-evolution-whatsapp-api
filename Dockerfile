# Build Stage
FROM oven/bun:1.0.29 as builder
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
RUN bun install

# Copy source code
COPY . .

# Build both MCP server and HTTP server
RUN bun run build && bun run build:server

# Production Stage
FROM oven/bun:1.0.29-slim
WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Expose port for HTTP server
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start HTTP server by default
CMD ["bun", "run", "dist/server.js"]
