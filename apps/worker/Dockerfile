FROM node:22-slim AS builder
WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/db build
RUN pnpm --filter worker build

FROM node:22-slim AS runner
WORKDIR /app

RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
RUN pnpm --filter @repo/db build
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

WORKDIR /app/apps/worker
ENV NODE_ENV=production
EXPOSE 4001
CMD ["node", "dist/index.js"]
