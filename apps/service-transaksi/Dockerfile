FROM node:24-slim AS builder
RUN npm install -g pnpm@10.33.2
WORKDIR /app
COPY . .
RUN --mount=type=cache,target=/pnpm-store pnpm install --store-dir /pnpm-store
RUN pnpm --filter @beasiswaapp/service-transaksi db:generate
RUN pnpm --filter @beasiswaapp/service-transaksi build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app

EXPOSE 3003
WORKDIR /app/apps/service-transaksi
CMD ["node", "dist/index.mjs"]
