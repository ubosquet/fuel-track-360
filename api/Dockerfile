# ── Development Stage ──────────────────────────────────────
FROM node:20-slim AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=development
EXPOSE 3000 9229

CMD ["npm", "run", "start:dev"]

# ── Build Stage ────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Production Stage ───────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

ENV NODE_ENV=production
ENV APP_PORT=8080

EXPOSE 8080

CMD ["node", "dist/main.js"]
