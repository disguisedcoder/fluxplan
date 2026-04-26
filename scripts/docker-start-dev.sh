#!/bin/sh
set -eu

echo "Waiting for DB..."
node scripts/wait-for-tcp.mjs db 5432 60

echo "Running Prisma migrate + seed..."
npx prisma migrate dev --name init --skip-generate
npx prisma db seed

echo "Starting Next.js dev server..."
npm run dev -- -H 0.0.0.0 -p 3000

