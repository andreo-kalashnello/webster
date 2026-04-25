FROM node:20-alpine

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

ARG APP_PATH=apps/backend
ENV APP_PATH=${APP_PATH}

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --frozen-lockfile

COPY . .
WORKDIR /app/${APP_PATH}
EXPOSE 4000
CMD ["pnpm", "dev"]
