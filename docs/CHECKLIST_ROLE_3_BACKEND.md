# Webster: чеклист роли 3 (backend: NestJS + GraphQL + MongoDB)

Цель роли: реализовать API, хранение данных редактора и серверную инфраструктуру.

## 1. Базовый каркас backend

- [ ] Инициализировать NestJS проект.
- [ ] Подключить ConfigModule + env validation.
- [ ] Подключить MongoDB через Mongoose.
- [ ] Подключить GraphQLModule (Apollo).
- [ ] Настроить CORS.
- [ ] Настроить helmet.
- [ ] Настроить rate limiting.
- [ ] Настроить global ValidationPipe.
- [ ] Настроить global exception filter.
- [ ] Настроить health/readiness endpoints.

## 2. Схема данных MongoDB

- [ ] Создать schema User.
- [ ] Создать schema RefreshToken.
- [ ] Создать schema Project.
- [ ] Создать schema ProjectVersion.
- [ ] Создать schema Template.
- [ ] Создать schema UploadAsset.
- [ ] Создать нужные индексы по userId/projectId/updatedAt.
- [ ] Добавить soft delete поля там, где нужно.
- [ ] Добавить timestamps ко всем ключевым коллекциям.

## 3. GraphQL schema и резолверы

- [ ] Описать GraphQL типы доменных сущностей.
- [ ] Описать Input типы для mutation.
- [ ] Описать Query для чтения данных.
- [ ] Описать Mutation для изменения данных.
- [ ] Реализовать резолверы auth.
- [ ] Реализовать резолверы profile.
- [ ] Реализовать резолверы projects.
- [ ] Реализовать резолверы templates.
- [ ] Реализовать резолверы versions.
- [ ] Реализовать резолверы export/share.

## 4. Auth и безопасность

- [ ] Реализовать register mutation.
- [ ] Реализовать login mutation.
- [ ] Реализовать refreshToken mutation.
- [ ] Реализовать logout mutation.
- [ ] Реализовать verifyEmail mutation.
- [ ] Реализовать me query.
- [ ] Реализовать changePassword mutation.
- [ ] Реализовать JWT guard для защищенных резолверов.
- [ ] Реализовать ротацию/инвалидацию refresh токенов.
- [ ] Реализовать throttle на auth мутациях.

## 5. Projects API

- [ ] Реализовать createProject mutation.
- [ ] Реализовать updateProject mutation.
- [ ] Реализовать deleteProject mutation.
- [ ] Реализовать project query by id.
- [ ] Реализовать projects query list + pagination.
- [ ] Реализовать autosaveProject mutation.
- [ ] Реализовать cloneProject mutation.
- [ ] Реализовать ownership проверки в сервисах.

## 6. Versioning API

- [ ] Реализовать createVersion mutation.
- [ ] Реализовать versions query.
- [ ] Реализовать restoreVersion mutation.
- [ ] Реализовать лимит числа версий на проект.
- [ ] Реализовать очистку старых версий по политике.

## 7. Templates API

- [ ] Реализовать baseTemplates query.
- [ ] Реализовать userTemplates query.
- [ ] Реализовать createUserTemplate mutation.
- [ ] Реализовать updateUserTemplate mutation.
- [ ] Реализовать deleteUserTemplate mutation.
- [ ] Реализовать createProjectFromTemplate mutation.

## 8. Upload/Export/Share API

- [ ] Реализовать upload endpoint (GraphQL upload или REST).
- [ ] Реализовать валидацию MIME и размера файлов.
- [ ] Реализовать безопасное хранение путей и имен файлов.
- [ ] Реализовать exportJpg mutation.
- [ ] Реализовать exportPng mutation.
- [ ] Реализовать exportPdf mutation.
- [ ] Реализовать exportAdditionalFormat mutation.
- [ ] Реализовать createShareLink mutation.
- [ ] Реализовать resolveShareLink query.

## 9. Инфраструктура и наблюдаемость

- [ ] Добавить structured logging.
- [ ] Добавить request id в логи.
- [ ] Добавить логирование GraphQL ошибок.
- [ ] Добавить метрики latency по резолверам.
- [ ] Добавить метрики ошибок 4xx/5xx.
- [ ] Добавить cron очистки orphan files.

## 10. Тесты роли

- [ ] Unit-тесты auth service.
- [ ] Unit-тесты projects service.
- [ ] Unit-тесты templates service.
- [ ] Unit-тесты versions service.
- [ ] Integration-тесты GraphQL auth.
- [ ] Integration-тесты GraphQL projects.
- [ ] Integration-тесты GraphQL templates/versions.
- [ ] Integration-тесты upload/export/share.
- [ ] Негативные тесты валидации и авторизации.

## 11. Done-критерии роли

- [ ] Все обязательные GraphQL операции реализованы.
- [ ] MongoDB схема стабильна и индексирована.
- [ ] Auth и ownership работают корректно.
- [ ] Критические backend сценарии покрыты тестами.
- [ ] API готов к интеграции с frontend без блокеров.
