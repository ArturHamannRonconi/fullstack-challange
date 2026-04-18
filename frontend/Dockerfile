FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_API_URL=http://localhost:8000
ARG VITE_WS_URL=http://localhost:4003
ARG VITE_KC_AUTHORITY=http://localhost:8080/realms/crash-game
ARG VITE_KC_CLIENT_ID=crash-game-client
ARG VITE_KC_REDIRECT_URI=http://localhost:3000/callback
ARG VITE_KC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000/
ARG VITE_KC_ACCOUNT_URL=http://localhost:8080/realms/crash-game/account

ENV VITE_API_URL=$VITE_API_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_KC_AUTHORITY=$VITE_KC_AUTHORITY \
    VITE_KC_CLIENT_ID=$VITE_KC_CLIENT_ID \
    VITE_KC_REDIRECT_URI=$VITE_KC_REDIRECT_URI \
    VITE_KC_POST_LOGOUT_REDIRECT_URI=$VITE_KC_POST_LOGOUT_REDIRECT_URI \
    VITE_KC_ACCOUNT_URL=$VITE_KC_ACCOUNT_URL

RUN rm -f .env .env.local .env.production .env.production.local && bun run build

EXPOSE 3000

CMD ["bun", "run", "preview"]
