FROM mcr.microsoft.com/devcontainers/javascript-node:22-bookworm AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- deps ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------- dev (for docker-compose local dev) ----------
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["node","scripts/docker-start-dev.mjs"]

# ---------- build ----------
FROM deps AS build
ENV NODE_ENV=production
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- runner ----------
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/scripts ./scripts

USER nextjs
EXPOSE 3000
CMD ["node","scripts/docker-start-prod.mjs"]

