FROM node:22-slim AS builder
WORKDIR /app

RUN corepack enable

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WORKER_URL
ARG NEXT_PUBLIC_ENABLE_TESTER=false
ARG NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=local-dev-google-client-id
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WORKER_URL=${NEXT_PUBLIC_WORKER_URL}
ENV NEXT_PUBLIC_ENABLE_TESTER=${NEXT_PUBLIC_ENABLE_TESTER}
ENV NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID}

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build

FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 8080
CMD ["node", "apps/web/server.js"]
