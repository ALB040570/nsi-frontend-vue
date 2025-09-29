# STRUCTURE

## Слои проекта
- **app/** — инициализация приложения (провайдеры, роутер, темы) без бизнес-логики.
- **shared/** — переиспользуемые утилиты, API-клиенты, UI-компоненты без доменной привязки.
- **entities/** — модели и репозитории сущностей; никаких Vue-хуков.
- **features/** — сценарии, композиционные функции и компоненты, собирающие доменную логику.
- **widgets/** — комплексные блоки интерфейса из нескольких фич/сущностей.
- **pages/** — страницы, связывающие фичи и сущности, без работы с сырими API.
- **layouts/** — макеты и обёртки для страниц.

## Правила импортов
- Страница может импортировать только `@features`, `@entities`, `@shared`, `@layouts`.
- Фича может зависеть от `@entities` и `@shared`, но не от `@pages` или `app`.
- Сущности используют только `@shared`.
- У всех слайсов есть barrel (`index.ts`) для единообразных импортов.

## Работа с API
- RPC вызывается через `@shared/api/rpcClient`.
- REST-запросы идут через `@shared/api/httpClient`.
- Страницы/фичи используют репозитории из `entities/*`, а не `@/lib/api`.

## Импорт по алиасам
```
import { ComponentsSelect } from '@features/components-select'
import { fetchObjectTypesSnapshot } from '@entities/object-type'
```

## Добавление нового модуля
1. Определите слой (entity/feature/widget).
2. Создайте структуру `model/`, `api/`, `ui/` и barrel `index.ts`.
3. Добавьте шапку-комментарий (назначение, использование).
4. Подключите модуль через алиасы.

## Правила импортов (линт)
- ESLint (`eslint.config.ts`) запрещает глубокие импорты (`@entities/*/api/*`, `@features/*/model/*`, `@shared/api/*`) — используйте barrel-файлы.
- Для страниц запрещены зависимости от `@app`, `@pages`, `@widgets`, `@/stores` — они работают только с `@features`, `@entities`, `@shared`, `@layouts`.
- Для фич запрещены импорты слоёв `app/pages/layouts/widgets`; для сущностей — любые импорты кроме `@shared`.

## Где лежат общие стили и токены
- Базовые CSS и токены: `src/shared/styles/globals.css`, `src/shared/styles/tokens.css`.
- Глобальные стили приложения Service 360: `src/assets/styles/service360.css`.
