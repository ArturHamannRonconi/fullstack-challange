FROM oven/bun:1-alpine AS build

WORKDIR /app

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

RUN bun install

COPY packages/events /app/packages/events
COPY packages/game /app/packages/game
COPY packages/real-time-db /app/packages/real-time-db
COPY services/websockets /app/services/websockets

# Compile each workspace package + the service with tsc.
# tsc is used (not tsx/esbuild) because workspace symlinks under node_modules
# cause esbuild to skip tsconfig files, breaking decorator support.
RUN cd /app/packages/events && bun x tsc -p ./tsconfig.json --outDir ./dist --rootDir ./src \
    && cd /app/packages/game && bun x tsc -p ./tsconfig.json --outDir ./dist --rootDir ./src \
    && cd /app/packages/real-time-db && bun x tsc -p ./tsconfig.json --outDir ./dist --rootDir ./src \
    && cd /app/services/websockets && bun x tsc -p ./tsconfig.json --outDir ./dist --rootDir ./src

# Swap each package's entry from `src/index.ts` → `dist/index.js` and drop
# `"type": "module"` so the compiled CJS plays nicely with Bun's CJS loader.
RUN sed -i \
    -e 's|"./src/index.ts"|"./dist/index.js"|g' \
    -e 's|,\s*"type":\s*"module"||g' \
    -e 's|"type":\s*"module",\s*||g' \
    /app/packages/events/package.json /app/packages/game/package.json /app/packages/real-time-db/package.json

# ---- Runtime image ----
FROM oven/bun:1-alpine

WORKDIR /app

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/packages/events/package.json /app/packages/events/package.json
COPY --from=build /app/packages/events/dist /app/packages/events/dist
COPY --from=build /app/packages/game/package.json /app/packages/game/package.json
COPY --from=build /app/packages/game/dist /app/packages/game/dist
COPY --from=build /app/packages/real-time-db/package.json /app/packages/real-time-db/package.json
COPY --from=build /app/packages/real-time-db/dist /app/packages/real-time-db/dist
COPY --from=build /app/services/websockets/package.json /app/services/websockets/package.json
COPY --from=build /app/services/websockets/dist /app/services/websockets/dist
COPY --from=build /app/services/websockets/node_modules /app/services/websockets/node_modules

WORKDIR /app/services/websockets

EXPOSE 4003

# NODE_PATH ensures compiled packages/events + packages/game (under /app/packages)
# resolve their @nestjs/* deps from the service's node_modules.
ENV NODE_PATH=/app/services/websockets/node_modules:/app/node_modules

CMD ["bun", "run", "dist/main.js"]
