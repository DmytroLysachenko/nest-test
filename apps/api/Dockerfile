FROM node:22-slim AS builder
WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/db build
RUN pnpm --filter api build

FROM node:22-slim AS runner
WORKDIR /app

RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
RUN pnpm --filter @repo/db build
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
