# webster

Monorepo.

## Как запускать проект

Ниже 2 рабочих режима:
- Вариант 1: полностью через Docker.
- Вариант 2: только MongoDB в Docker, а frontend/backend через pnpm dev.

### Вариант 1: запуск через Docker

1. Скопировать env-файлы из шаблонов:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

2. Поднять контейнеры:

```bash
docker compose up --build -d
```

или через script:

```bash
pnpm docker:up
```

3. Проверить состояние:

```bash
docker compose ps
```

4. Открыть сервисы:
- Frontend: http://localhost:5173
- Backend health: http://localhost:4000/health
- GraphQL: http://localhost:4000/graphql

Остановка:

```bash
docker compose down -v
```

### Вариант 2: MongoDB в Docker + frontend/backend через pnpm

Требования:
- Node.js >= 20
- pnpm 9.x

1. Установить зависимости:

```bash
pnpm install
```

2. Поднять только MongoDB в Docker:

```bash
docker compose up -d mongo
```

3. Подготовить env-файлы:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

4. Для гибридного режима (Mongo в Docker, backend локально) в apps/backend/.env используй MONGODB_URI с localhost, например:

MONGODB_URI=mongodb://webster:webster@127.0.0.1:27017/webster?authSource=admin

5. Запустить backend + frontend одновременно:

```bash
pnpm dev
```

или по отдельности:

```bash
pnpm dev:backend
pnpm dev:frontend
```

## Как проверить в браузере оба варианта

### Проверка варианта 1 (все через Docker)

1. Открой http://localhost:5173 — должна открыться frontend-страница.
2. Открой http://localhost:4000/health — должен вернуться JSON со статусом API/DB.
3. Открой http://localhost:4000/graphql — endpoint должен быть доступен (обычно вернет 400 на GET, это нормально).

### Проверка варианта 2 (Mongo Docker + pnpm dev)

1. Убедись, что запущены процессы `pnpm dev` (или отдельно backend/frontend).
2. Открой http://localhost:5173 — должна открыться frontend-страница.
3. Открой http://localhost:4000/health — должен вернуться JSON со статусом API/DB.
4. Открой http://localhost:4000/graphql — endpoint должен быть доступен.

### Если запуск через pnpm

- Frontend (Vite): изменения обычно подхватываются сразу (HMR), без перезапуска.
- Backend (текущий script dev на ts-node без watch): после изменений backend обычно нужно перезапускать вручную.

## Что выбрать: pnpm dev или только Docker?

- Для разработки быстрее обычно pnpm dev (особенно для frontend).
- Для проверки «как в проде» и для демонстрации развертывания лучше Docker.
- Нормальная практика: ежедневно разрабатывать через pnpm dev, а перед коммитом/демо проверять через Docker.


## Текущая структура репозитория

```
apps/
	frontend/
	backend/
		src/
			common/
			config/
			graphql/
			modules/
packages/
	shared/
docs/
```

## FSD-структура frontend

Frontend организован по FSD-слоям внутри `apps/frontend/src`:

```text
app/
pages/
widgets/
features/
entities/
shared/
```

### Кто за что отвечает во frontend

- Разработчик 1 (Движок): `shared/lib/canvas-engine`, `widgets/editor-canvas`, `features/editor-history`, части `entities/project`
- Разработчик 2 (Интерактив и интерфейс): `app`, `pages`, `widgets/sidebar`, `features/editor-controls`, `features/auth`
- Общие UI-компоненты и утилиты: `shared/ui`, `shared/lib`

## Backend-структура

Backend организован модульно внутри `apps/backend/src`:

```text
common/
config/
graphql/
modules/
	auth/
	users/
	projects/
	templates/
	uploads/
	export/
```

### Кто за что отвечает в backend

- Разработчик 3 (Бэкенд): `modules/*`, `graphql`, `config`, `common`
- Общие настройки окружения и подключения: `config/*`
- Повторно используемые фильтры, guards, interceptors, utils: `common/*`

## Workspaces

- `@webster/frontend` -> `apps/frontend`
- `@webster/backend` -> `apps/backend`
- `@webster/shared` -> `packages/shared`

## Текущий стек

- Backend: NestJS + TypeScript
- API: GraphQL
- Database: MongoDB
- Frontend: React + TypeScript + Vite
- State: Zustand
- Styles: Tailwind CSS
- Editor: собственный Canvas-движок (Canvas 2D API)
- DevOps: Docker + Docker Compose + Nginx

## Установленные зависимости

- Workspace manager: pnpm
- Frontend: React, Vite, Apollo Client, GraphQL, React Router, Zustand, Tailwind CSS, shadcn/ui support packages
- Backend: NestJS, Apollo Server, GraphQL, Mongoose, JWT, Nodemailer, PDF-lib, class-validator, class-transformer

## Docker-шаблоны

- Root compose: `docker-compose.yml`
- Backend Dockerfile: `apps/backend/Dockerfile`
- Frontend Dockerfile: `apps/frontend/Dockerfile`
- Backend env template: `apps/backend/.env.example`
- Frontend env template: `apps/frontend/.env.example`

## Роли в команде

- Разработчик 1 (Движок): отвечает за ядро canvas-движка, рендер, геометри, сериализацию, undo/redo.
- Разработчик 2 (Интерактив и интерфейс): отвечает за hit detection, drag-and-drop, select/resize/rotate, UI панель и UX редактора.
- Разработчик 3 (Бэкенд): отвечает за NestJS + GraphQL + MongoDB, auth, проекты, версии, шаблоны, export/share.

## Ответственность по папкам (текущий этап)

- Разработчик 1: `apps/frontend/src/shared/lib/canvas-engine`, `apps/frontend/src/widgets/editor-canvas`, `apps/frontend/src/features/editor-history`
- Разработчик 2: `apps/frontend/src/app`, `apps/frontend/src/pages`, `apps/frontend/src/widgets/sidebar`, `apps/frontend/src/features/editor-controls`, `apps/frontend/src/features/auth`
- Разработчик 3: `apps/backend/src/modules`, `apps/backend/src/graphql`, `apps/backend/src/config`, `apps/backend/src/common`
- Общие типы и контракты: `packages/shared`

## Чеклисты

- Основной технический roadmap: docs/ROADMAP_CHECKLIST.md
- Роль 1 (Движок): docs/CHECKLIST_ROLE_1_ENGINE.md
- Роль 2 (Интерактив и интерфейс): docs/CHECKLIST_ROLE_2_INTERACTION_UI.md
- Роль 3 (Бэкенд): docs/CHECKLIST_ROLE_3_BACKEND.md