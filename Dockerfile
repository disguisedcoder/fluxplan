FROM node:22-bookworm-slim AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Minimal OS deps (Prisma + HTTPS)
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

# ---------- deps ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

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

RUN groupadd -r nodejs && useradd -r -g nodejs nextjs

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/scripts ./scripts

ENV HOME=/home/nextjs
ENV NPM_CONFIG_CACHE=/home/nextjs/.npm
RUN mkdir -p /home/nextjs/.npm \
  && chown -R nextjs:nodejs /home/nextjs

USER nextjs
EXPOSE 3000
CMD ["node","scripts/docker-start-prod.mjs"]

