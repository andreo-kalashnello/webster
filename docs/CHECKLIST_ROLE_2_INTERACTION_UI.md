# Webster: чеклист роли 2 (лендос, auth и UI слоя редактора)

Цель роли: сделать внешний пользовательский слой продукта, точки входа в приложение, auth-потоки и экран интерфейса редактора с подключением к backend.

## Backend Setup (фундамент для Role 2)

### Что было сделано на backend (с которым работает Role 2):

**Проблема:** Backend не запускался через `ts-node` с ошибкой `TS5110` (конфликт `module` и `moduleResolution`).

**Решения, реализованные:**

1. **`apps/backend/src/main.ts`** — модуль инициализации приложения
   - **Исправлено:** `express-mongo-sanitize` теперь используется безопасно через `sanitize()` для `body/params` (избегаем мутации `req.query` в Express 5)
   - **Сохранено:** helmet (безопасность), cookie-parser (JWT в cookies), CORS (связь с frontend)
   - **Использование cookies:** JWT токены хранятся в secure httpOnly cookies, отправляются автоматически при credentials: "include" в apolloClient
   - **Запуск:** Backend слушает на `0.0.0.0:4000` (доступен для frontend контейнера)

2. **`apps/backend/tsconfig.json`** — конфигурация TypeScript компилятора
   - **Исправлено:** `moduleResolution` и `module` приведены к `Node16`
   - **Согласовано:** override для `ts-node` использует тот же `module: "Node16"`
   - **Результат:** устранена ошибка `TS5110`, backend корректно стартует через `ts-node`

### Что получила Role 2 на вход:

- ✅ Работающий GraphQL API на http://backend:4000/graphql
- ✅ Мутации: `register(input: RegisterDto)`, `login(input: LoginDto)` — возвращают обновленный user объект
- ✅ Query: `me` — текущий пользователь из сессии (JWT из cookie)
- ✅ Middleware для проверки auth (guards и decorators)
- ✅ Хранилище пользователей в MongoDB
- ✅ CORS настроен для cookies (credentials: true)

**Важно для Role 2:** 
- На frontend используется `ApolloClient` с `credentials: "include"` — cookies автоматически отправляются с каждым запросом
- JWT токен хранится в secure httpOnly cookie `token` (не видно из JavaScript)
- Logout = удаление cookie (backend уже это поддерживает)

---

## Границы роли 2 (чтобы не было конфликтов)

### Входит в роль 2
- Landing page, login/register, auth UX и продуктовые страницы.
- App shell и навигация между страницами.
- Интеграция frontend с backend API (проекты/версии/шаблоны/экспорт/share).
- UX-устойчивость, доступность, тесты пользовательских сценариев.

### Не входит в роль 2
- Реализация canvas-движка, его интерактивных алгоритмов и низкоуровневого рендера.
- Внутренние детали scene model, history engine, hit detection ядра.

### Зависимость от роли 1
- Роль 2 использует готовый engine API и не дублирует canvas-логику.

## 1. Landing page и вход в продукт

- [x] Реализовать лендос с понятным позиционированием продукта.
- [x] Реализовать CTA-переходы на login и register.
- [x] Реализовать минимальные marketing/intro блоки для первого входа.
- [x] Реализовать responsive layout для desktop/tablet/mobile.

## 2. Авторизация и сессия

- [x] Реализовать auth state/store (`user`, `isAuthenticated`, `loading`).
- [x] Реализовать hydrate сессии через `me` query при старте приложения.
- [x] Реализовать формы `login/register` с client-side валидацией.
- [x] Реализовать `verifyEmail` flow по токену из URL.
- [x] Реализовать `requestPasswordReset/resetPassword` flow.
- [x] Реализовать `oauthLogin` flow (Google/Facebook/Github).
- [x] Реализовать `magic-link` flow (`requestMagicLink/verifyMagicLink`).
- [x] Реализовать 2FA шаг в login (ввод кода при включенной 2FA).
- [x] Реализовать `refreshToken` flow при истечении access token.

Примечание: OAuth-кнопки активируются при наличии `VITE_GOOGLE_CLIENT_ID`, `VITE_FACEBOOK_CLIENT_ID`, `VITE_GITHUB_CLIENT_ID` в frontend env.
- [x] Реализовать logout с очисткой локального состояния и redirect.

## 3. Страницы и навигация

- [x] Страница логина.
- [x] Страница регистрации.
- [x] Страница подтверждения email.
- [x] Страница сброса пароля.
- [x] Страница профиля.
- [x] Страница списка проектов.
- [x] Страница **My templates** (`/templates`) — единый экран пользовательских шаблонов.
- [x] Редирект `/user-templates` → `/templates` (старый URL).
- [x] Страница редактора.

## 4. Интерфейс редактора

- [x] Реализовать layout редактора: toolbar, sidebar, canvas area, footer.
- [x] Реализовать state панели инструментов (UI-слой).
- [x] Реализовать state панели свойств выделенного объекта (UI-слой).
- [x] Реализовать унифицированные UI-компоненты контролов.
- [x] Реализовать editor shell и маршрутизацию до страницы редактора.
- [x] Подключить canvas-area к engine API роли 1 без копирования логики движка.
- [x] Реализовать панель свойств, работающую через engine API (без логики трансформаций в UI).

## 5. Интеграция UI с backend

- [x] Подключить загрузку проекта при открытии редактора.
- [x] Подключить автосохранение проекта (debounce).
- [x] Подключить ручное сохранение проекта.
- [x] Подключить сохранение/восстановление версии.
- [x] Подключить загрузку пользовательских шаблонов (`userTemplates`).
- [x] Подключить сохранение пользовательского шаблона (редактор + страница My templates).
- [x] Подключить создание / редактирование / удаление шаблона (`createUserTemplate`, `updateUserTemplate`, `deleteUserTemplate`).
- [x] Подключить создание проекта из шаблона (`createProjectFromTemplate` → редактор).
- [x] Подключить экспорт и download flow.
- [x] Подключить генерацию share-link в UI.
- [x] Согласовать с ролью 1 формат payload для save/load canvas state.

### Примечание (§4–§5, реализация 2026-05)

- Редактор `/editor`: `CanvasEnginePage` оборачивает канвас в `CanvasEditorLayout` + `EditorWorkspaceProvider` — тулбар/свойства/футер получают один и тот же `CanvasEngine` через контекст; вся геометрия/рендер остаётся в движке.
- `Project.content` / autosave / шаблоны: тот же JSON, что `serializeSceneToJson` / `SerializableSceneState`; маппинг в `apps/frontend/src/shared/lib/editor/scene-from-project-content.ts`.
- Футер: Save now (`autosaveProject`), snapshot / restore версий (`createVersion`, `restoreVersion`), JSON (клиентский файл), PNG (`exportPng` + URL), шаблон (`createUserTemplate`), share (`createShareLink` + буфер обмена).
- **My templates** (`/templates`): список `userTemplates`, New template (пустая сцена), Edit (title/size), Delete, New project из шаблона. В навигации только «My templates» (без отдельного каталога base templates в UI).
- Логотип: `src/assets/webster-logo.svg` + `WebsterLogoIcon` в `BrandLogo` (шапка, редактор, favicon).
- `/canvas-engine`: по-прежнему полноэкранный стенд движка без product shell.

## 6. UX-устойчивость

- [x] Реализовать обработку loading/error состояний всех запросов.
- [x] Реализовать optimistic UI для безопасных операций.
- [x] Реализовать блокировки UI на критичных операциях.
- [x] Реализовать toast-уведомления об успехе/ошибке.
- [x] Реализовать confirm modal для удаления.
- [x] Реализовать unsaved changes guard при выходе.

## 7. Доступность и качество интерфейса

- [ ] Добавить aria-label для интерактивных кнопок.
- [ ] Добавить фокус-стили для клавиатурной навигации.
- [ ] Проверить tab order на основных экранах.
- [ ] Проверить контрастность элементов управления.
- [ ] Проверить UI на разрешениях 1280+, 1024, 768.

## 8. Тесты роли

- [ ] Unit-тесты для UI утилит и локального state.
- [ ] Component-тесты панели инструментов.
- [ ] Component-тесты панели свойств.
- [ ] E2E-тесты навигации landing -> login/register.
- [ ] E2E-тесты auth-сценариев (login/register/refresh/logout).
- [ ] E2E-тесты verify/reset/magic-link/2FA flow.
- [ ] E2E-тесты редактора и backend flows (load/save/export/share).

## 9. Done-критерии роли

- [ ] Есть landing page как точка входа в продукт.
- [ ] Auth flow (login/register/refresh/logout/verify/reset/magic-link/2FA) стабилен.
- [ ] Есть отдельная страница редактора и основной UI-скелет.
- [ ] UI корректно обрабатывает ошибки backend.
- [ ] Критические пользовательские сценарии покрыты e2e тестами.
- [ ] Нет дублирования canvas-логики из роли 1 внутри UI-слоя.
