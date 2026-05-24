FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:migrate && pnpm dev --hostname 0.0.0.0"]
