# syntax=docker/dockerfile:1

# ── deps ──────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── build ─────────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build \
  && npm prune --omit=dev

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/src/views ./src/views
COPY --from=build /app/package.json ./package.json

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "dist/scripts/healthcheck.js"]

CMD ["node", "dist/src/main.js"]
