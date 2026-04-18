# Build context is the monorepo root (see docker-compose.yml).
FROM oven/bun:1-alpine

# OpenSSL is required by Prisma's query engine on alpine.
RUN apk add --no-cache openssl

WORKDIR /app

# Copy root workspace manifest + lockfile and every workspace package.json
# so Bun can resolve `workspace:*` across all workspaces.
COPY package.json bun.lock* /app/
COPY packages/auth/package.json /app/packages/auth/
COPY packages/domain/package.json /app/packages/domain/
COPY packages/events/package.json /app/packages/events/
COPY packages/game/package.json /app/packages/game/
COPY packages/provably-fair/package.json /app/packages/provably-fair/
COPY packages/real-time-db/package.json /app/packages/real-time-db/
COPY packages/utils/package.json /app/packages/utils/
COPY services/games/package.json /app/services/games/
COPY services/wallets/package.json /app/services/wallets/
COPY services/websockets/package.json /app/services/websockets/
COPY frontend/package.json /app/frontend/

# Install all workspace deps from root. Symlinks workspace packages.
RUN bun install

# Copy source of the packages the games service needs plus the service itself.
COPY packages/auth /app/packages/auth
COPY packages/domain /app/packages/domain
COPY packages/events /app/packages/events
COPY packages/game /app/packages/game
COPY packages/provably-fair /app/packages/provably-fair
COPY packages/real-time-db /app/packages/real-time-db
COPY packages/utils /app/packages/utils
COPY services/games /app/services/games

WORKDIR /app/services/games
RUN bun x prisma generate --schema=src/infrastructure/database/schema.prisma

EXPOSE 4001

CMD ["sh", "-c", "bun x prisma migrate deploy --schema=src/infrastructure/database/schema.prisma && bun run src/main.ts"]
