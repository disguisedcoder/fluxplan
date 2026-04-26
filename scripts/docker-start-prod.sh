#!/bin/sh
set -eu

echo "Waiting for DB..."
node scripts/wait-for-tcp.mjs db 5432 60

echo "Running Prisma migrate deploy..."
npx prisma migrate deploy

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "Seeding enabled: running Prisma seed..."
  npx prisma db seed
fi

echo "Starting Next.js server..."
node server.js

