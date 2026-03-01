FROM node:22-slim AS builder
WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build

FROM node:22-slim AS runner
WORKDIR /app

RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile --prod --ignore-scripts
COPY --from=builder /app/apps/web/.next ./apps/web/.next

WORKDIR /app/apps/web
ENV NODE_ENV=production
EXPOSE 3002
CMD ["pnpm", "start:prod"]
