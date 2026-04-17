# Build context is the monorepo root (see docker-compose.yml).
FROM oven/bun:1-alpine

# OpenSSL is required by Prisma's query engine on alpine.
RUN apk add --no-cache openssl

WORKDIR /app

# Copy root workspace manifest + lockfile and every workspace package.json
# so Bun can resolve `workspace:*` (frontend and games are present so the
# root package.json's workspaces entries all match, but their source is not
# copied — we never build them here).
COPY package.json bun.lock* /app/
COPY packages/auth/package.json /app/packages/auth/
COPY packages/domain/package.json /app/packages/domain/
COPY services/games/package.json /app/services/games/
COPY services/wallets/package.json /app/services/wallets/
COPY frontend/package.json /app/frontend/

# Install all workspace deps from root. Symlinks workspace packages.
RUN bun install

# Now copy actual source for the packages the wallets service needs.
COPY packages/auth /app/packages/auth
COPY packages/domain /app/packages/domain
COPY services/wallets /app/services/wallets

# Generate Prisma client against the final schema.
WORKDIR /app/services/wallets
RUN bun x prisma generate --schema=src/infrastructure/database/schema.prisma

EXPOSE 4002

# Apply migrations then start the service.
CMD ["sh", "-c", "bun x prisma migrate deploy --schema=src/infrastructure/database/schema.prisma && bun run src/main.ts"]
