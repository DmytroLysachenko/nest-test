FROM node:22-slim AS builder
WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/db build
RUN pnpm --filter worker build
RUN pnpm --filter worker --prod deploy --legacy /prod/worker
RUN mkdir -p /prod/worker/dist
RUN cp -R /app/apps/worker/dist/. /prod/worker/dist/

FROM node:22-slim AS runner
WORKDIR /app

COPY --from=builder /prod/worker ./
RUN npx playwright install --with-deps chromium
ENV NODE_ENV=production
EXPOSE 4001
CMD ["node", "dist/index.js"]
