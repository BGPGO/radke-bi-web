# syntax=docker/dockerfile:1
# Multi-stage build: TypeScript -> JS -> Node 20 alpine runtime
# Build context: repo root (so we can COPY ../data.js)
# Build command: docker build -f api/Dockerfile .

# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder
WORKDIR /build

# Install deps with cache-friendly layer ordering
COPY api/package.json api/package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copy TS sources and build
COPY api/tsconfig.json ./
COPY api/src ./src
RUN npm run build

# Prune dev deps for runtime
RUN npm prune --production

# ---------- Stage 2: runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /srv

# Copy built artifacts and production deps
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package.json ./package.json

# Copy data.js from repo root - the API loads it in a vm sandbox to reuse aggregateTx/filterTx
COPY data.js /srv/data.js

# Cache directory for generated reports (volume-mountable)
RUN mkdir -p /srv/cache

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/server.js"]
