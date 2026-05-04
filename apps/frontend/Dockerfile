FROM node:20-alpine

RUN apk add --no-cache wget

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

ARG APP_PATH=apps/frontend
ENV APP_PATH=${APP_PATH}

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --frozen-lockfile

COPY . .
WORKDIR /app/${APP_PATH}
EXPOSE 5173
CMD ["pnpm", "dev"]
