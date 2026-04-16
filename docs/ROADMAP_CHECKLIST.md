# Webster: технический roadmap-checklist

Только разработка: архитектура, код, тесты, деплой, эксплуатация.

## 1. Стек и окружение

- [+] Утвердить backend: NestJS + TypeScript.
- [+] Утвердить API: GraphQL (Apollo).
- [+] Утвердить БД: MongoDB (Mongoose).
- [+] Утвердить auth: JWT (access/refresh).
- [+] Утвердить email: Nodemailer.
- [ ] Утвердить экспорт: Надо будет потом подумать что для jpg, png, pdf, webp
- [+] Утвердить frontend: React + TypeScript + Vite.
- [+] Утвердить роутинг: React Router.
- [+] Утвердить состояние: Zustand.
- [+] Утвердить GraphQL-клиент: Apollo Client.
- [+] Утвердить стили: Tailwind CSS.
- [+] Утвердить canvas-стек: собственный движок на Canvas 2D API (без Fabric.js/Konva).
- [+] Утвердить DevOps: Docker + Docker Compose + Nginx.
- [+] Зафиксировать вне scope MVP: Nuqs, Lexical.

## 2. Архитектура и контракты

- [ ] Зафиксировать трехуровневую архитектуру: UI / Business / Data.
- [ ] Зафиксировать структуру backend-модулей: auth, users, projects, templates, export, uploads.
- [ ] Зафиксировать структуру frontend-модулей: app, pages, features, entities, shared.
- [ ] Спроектировать GraphQL schema: Query, Mutation, Input, типы ошибок.
- [ ] Спроектировать модель canvas state (JSON) и version snapshot.
- [ ] Спроектировать политику ownership/ACL для проектов и шаблонов.
- [ ] Определить лимиты: max размер проекта, max размер файла, max число объектов.
- [ ] Определить формат технических логов и correlation id.

## 3. Репозиторий и инженерная база

- [ ] Настроить структуру monorepo: apps/frontend, apps/backend, packages/shared.
- [ ] Добавить .editorconfig, .gitignore, .nvmrc.
- [ ] Настроить ESLint + Prettier для frontend/backend.
- [ ] Настроить lint-staged + husky pre-commit.
- [ ] Добавить .env.example для frontend/backend/db.
- [ ] Добавить scripts: dev, build, lint, test, test:e2e, typecheck.
- [ ] Настроить CI: lint -> typecheck -> test -> build.
- [ ] Настроить порог покрытия тестами в CI.

## 4. Backend: core (NestJS + GraphQL + MongoDB)

- [ ] Инициализировать NestJS проект и модули.
- [ ] Подключить Mongoose и модели коллекций.
- [ ] Настроить GraphQLModule (Apollo).
- [ ] Подключить ConfigModule + валидацию env.
- [ ] Настроить глобальный ValidationPipe.
- [ ] Настроить глобальные фильтры исключений.
- [ ] Настроить CORS + helmet + rate limit.
- [ ] Настроить health/readiness endpoints.
- [ ] Настроить структурированные логи (request id, user id, latency).

## 5. Backend: auth и users

- [ ] Mutation register.
- [ ] Хеширование пароля (bcrypt/argon2).
- [ ] Mutation login + выдача access/refresh.
- [ ] Mutation refreshToken.
- [ ] Mutation logout (инвалидация refresh).
- [ ] Mutation verifyEmail.
- [ ] Query me.
- [ ] Mutation updateProfile.
- [ ] Mutation changePassword.
- [ ] GraphQL guards/directives для защищенных резолверов.

## 6. Backend: projects/templates/versioning

- [ ] CRUD проектов через GraphQL.
- [ ] Сохранение canvas state в MongoDB.
- [ ] Автосохранение с debounce + server validation.
- [ ] Создание snapshot версии проекта.
- [ ] Получение списка версий проекта.
- [ ] Восстановление выбранной версии.
- [ ] Soft delete/restore проекта.
- [ ] Базовые шаблоны (read-only).
- [ ] Пользовательские шаблоны (create/update/delete).
- [ ] Создание проекта из шаблона.
- [ ] Проверка ownership на уровне service/resolver.

## 7. Backend: uploads/export/share

- [ ] Upload изображения (GraphQL upload или REST endpoint под upload).
- [ ] Валидация MIME, размера и расширения.
- [ ] Санитизация имени файла и безопасный storage path.
- [ ] Удаление неиспользуемых файлов по расписанию.
- [ ] Экспорт проекта в JPG.
- [ ] Экспорт проекта в PNG.
- [ ] Экспорт проекта в PDF.
- [ ] Экспорт в дополнительный формат (SVG или WEBP).
- [ ] Генерация публичной share-ссылки.
- [ ] Метаданные для preview (OG tags/preview endpoint).

## 8. Frontend: app shell и data layer

- [ ] Инициализировать React + TS + Vite.
- [ ] Подключить Tailwind.
- [ ] Подключить React Router.
- [ ] Подключить Apollo Client.
- [ ] Настроить auth link + refresh flow.
- [ ] Настроить Zustand для editor UI state.
- [ ] Настроить error boundary и fallback UI.
- [ ] Настроить toaster/notifications.
- [ ] Настроить skeleton/loading states.

## 9. Frontend: auth/profile/pages

- [ ] Страница регистрации + GraphQL mutation.
- [ ] Страница логина + GraphQL mutation.
- [ ] Страница подтверждения email.
- [ ] Страница профиля + updateProfile.
- [ ] Страница проектов пользователя.
- [ ] Страница шаблонов.
- [ ] Страница пользовательских шаблонов.
- [ ] Страница редактора.

## 10. Canvas engine: core (собственный движок)

- [ ] Реализовать Scene Model (nodes, selection, z-index).
- [ ] Реализовать Renderer (full redraw + dirty rect оптимизация).
- [ ] Реализовать Camera/Viewport (pan, zoom, dpi scaling).
- [ ] Реализовать Transform Matrix утилиты.
- [ ] Реализовать модуль hit detection.
- [ ] Реализовать object bounds и handles.
- [ ] Реализовать serialization/deserialization scene JSON.
- [ ] Реализовать undo/redo command stack.
- [ ] Реализовать клавиатурные команды (delete, duplicate, arrows).

## 11. Canvas engine: инструменты и объекты

- [ ] Tool: Select.
- [ ] Tool: Text (create/edit/style).
- [ ] Tool: Pencil.
- [ ] Tool: Rect.
- [ ] Tool: Triangle.
- [ ] Tool: Arrow.
- [ ] Tool: Image (insert/resize/rotate).
- [ ] Команды copy/paste.
- [ ] Изменение порядка слоев.
- [ ] Изменение размера canvas.
- [ ] Zoom in/out/reset.

## 12. Интеграция frontend <-> backend

- [ ] Подключить сохранение проекта к GraphQL mutation.
- [ ] Подключить загрузку проекта к GraphQL query.
- [ ] Подключить версии (save/list/restore).
- [ ] Подключить шаблоны (base/user).
- [ ] Подключить upload изображений.
- [ ] Подключить экспорт и скачивание файлов.
- [ ] Подключить share-link генерацию.

## 13. Тесты и качество

- [ ] Unit-тесты backend services/resolvers.
- [ ] Unit-тесты canvas math/render utils.
- [ ] Unit-тесты editor commands (undo/redo, transform).
- [ ] Integration-тесты GraphQL auth.
- [ ] Integration-тесты GraphQL projects/templates.
- [ ] E2E: register -> verify -> login.
- [ ] E2E: create project -> edit -> autosave -> reload.
- [ ] E2E: version save -> restore.
- [ ] E2E: export JPG/PNG/PDF/additional.
- [ ] E2E: user template create -> use in new project.
- [ ] Негативные кейсы: 401/403/validation/upload limit.

## 14. Security/Performance hardening

- [ ] Проверить защищенность GraphQL endpoint (depth/complexity/rate limit).
- [ ] Проверить защиту от XSS в текстовых полях и именах файлов.
- [ ] Проверить secure headers и CORS policy.
- [ ] Проверить срок жизни токенов и ротацию refresh.
- [ ] Проверить маскирование чувствительных данных в логах.
- [ ] Замерить FPS при 100/500/1000 объектах на сцене.
- [ ] Замерить время cold start редактора.
- [ ] Замерить размер frontend bundle и включить code splitting.
- [ ] Оптимизировать экспорт (offscreen canvas / web worker при необходимости).

## 15. Docker/Deploy

- [ ] Dockerfile backend (multi-stage, production).
- [ ] Dockerfile frontend (build + nginx serve).
- [ ] Dockerfile/compose сервис MongoDB.
- [ ] docker-compose.dev и docker-compose.prod.
- [ ] Настроить internal network + volume для MongoDB.
- [ ] Настроить healthcheck для backend/frontend/mongo.
- [ ] Настроить Nginx reverse proxy и websocket/graphql passthrough.
- [ ] Настроить HTTPS (SSL) и редирект HTTP -> HTTPS.
- [ ] Настроить сбор и ротацию логов контейнеров.
- [ ] Подготовить rollback-процедуру.

## 16. Технический DoD

- [ ] GraphQL schema покрывает все обязательные сценарии.
- [ ] Собственный canvas-движок реализует обязательный функционал.
- [ ] Все критические баги закрыты.
- [ ] CI зеленый: lint, typecheck, test, build.
- [ ] Docker-сборка воспроизводима локально и на сервере.
- [ ] Приложение доступно по домену.
- [ ] README актуален для локального и docker запуска.



