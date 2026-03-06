FROM node:22-slim AS builder
WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @repo/db build
RUN pnpm --filter api build
RUN pnpm --filter api --prod deploy --legacy /prod/api
RUN mkdir -p /prod/api/dist
RUN cp -R /app/apps/api/dist/. /prod/api/dist/
RUN mkdir -p /prod/api/node_modules/@repo/db/dist
RUN cp -R /app/packages/db/dist/. /prod/api/node_modules/@repo/db/dist/

FROM node:22-slim AS runner
WORKDIR /app

COPY --from=builder /prod/api ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
