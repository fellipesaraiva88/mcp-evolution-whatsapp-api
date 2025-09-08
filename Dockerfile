# Build Stage
FROM oven/bun:1.0.29 as builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
RUN bun run build

# Production Stage
FROM oven/bun:1.0.29-slim
WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lockb ./

# If needed, copy env or config files
# COPY --from=builder /app/.env ./

RUN bun install --production

# Optional: Copy node_modules if Bun has issues
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/.bun ./.bun

CMD ["bun", "run", "dist/main.js"]
