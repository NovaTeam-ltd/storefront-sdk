# Storefront SDK - Steering Guide

## Описание проекта

**Storefront SDK** - это TypeScript SDK для интеграции NovaHub в пользовательские шаблоны магазинов. Поддерживает Vue 3 и React.

SDK предоставляет:
- **API клиент** - работа с REST API NovaHub
- **State management** - управление состоянием приложения
- **Vue 3 composables** - интеграция с Vue 3
- **React hooks** - интеграция с React
- **TypeScript типы** - полная типизация
- **Обработка ошибок** - удобная обработка ошибок

## Стек технологий

- **Язык**: TypeScript - типизированный JavaScript
- **Сборка**: tsup - быстрая сборка TypeScript
- **Фреймворки**: Vue 3 (опционально), React 18+ (опционально)
- **Тип модуля**: ESM - современный стандарт модулей

## Структура проекта

```
storefront-sdk/
├── src/
│   ├── index.ts         # Основной экспорт
│   ├── core/            # Основная логика SDK
│   │   ├── client.ts    # HTTP клиент
│   │   ├── types.ts     # Типы
│   │   ├── errors.ts    # Обработка ошибок
│   │   └── utils.ts     # Утилиты
│   ├── vue/             # Vue 3 интеграция
│   │   ├── index.ts     # Vue экспорт
│   │   ├── composables.ts # Vue composables
│   │   └── components.ts # Vue компоненты
│   ├── react/           # React интеграция
│   │   ├── index.ts     # React экспорт
│   │   ├── hooks.ts     # React hooks
│   │   └── components.tsx # React компоненты
│   └── types/
│       └── index.ts     # Экспортируемые типы
├── starters/            # Примеры использования
│   ├── vue-example/
│   └── react-example/
├── dist/                # Скомпилированный код
├── package.json
└── tsconfig.json
```

## Инструкции по разработке

### Установка зависимостей

```bash
npm install
```

Установит все зависимости из `package.json`.

### Запуск в режиме разработки

```bash
npm run dev
```

Tsup будет следить за изменениями и пересобирать код.

**Что происходит:**
- Tsup компилирует TypeScript в JavaScript
- Создает файлы в папке `dist/`
- При изменении файлов пересобирает код
- Генерирует типы для TypeScript

### Сборка

```bash
npm run build
```

Компилирует TypeScript в JavaScript в папку `dist/`.

**Что создается:**
```
dist/
├── index.js           # Основной экспорт
├── index.d.ts         # TypeScript типы
├── vue/
│   ├── index.js
│   └── index.d.ts
├── react/
│   ├── index.js
│   └── index.d.ts
└── ...
```

## Экспорты

SDK предоставляет несколько точек входа:

```javascript
// Основной экспорт
import { StorefrontSDK, useStorefront } from '@novasynx/storefront-sdk'

// Vue 3 интеграция
import { useStorefront } from '@novasynx/storefront-sdk/vue'

// React интеграция
import { useStorefront } from '@novasynx/storefront-sdk/react'
```

## Стандарты кодирования

### Типы

- Все функции и классы должны быть типизированы
- Экспортируйте типы для использования в приложениях
- Используйте `interface` для определения контрактов

**Пример:**
```typescript
export interface Product {
  id: string
  name: string
  price: number
  image: string
}

export interface CreateOrderRequest {
  items: OrderItem[]
  paymentMethod: 'card' | 'wallet' | 'crypto'
}

export async function createOrder(request: CreateOrderRequest): Promise<Order> {
  // Реализация
}
```

### Документация

- Документируйте все публичные API
- Добавляйте примеры использования в комментариях
- Поддерживайте README с примерами

**Пример:**
```typescript
/**
 * Получить список товаров
 * @param filter - фильтр для поиска
 * @returns массив товаров
 * 
 * @example
 * const products = await sdk.getProducts({ category: 'electronics' })
 */
export async function getProducts(filter?: ProductFilter): Promise<Product[]> {
  // Реализация
}
```

### Совместимость

- Поддерживайте Vue 3.0+ и React 18+
- Используйте peer dependencies для опциональных фреймворков
- Тестируйте с разными версиями

**Пример package.json:**
```json
{
  "peerDependencies": {
    "vue": "^3.0.0",
    "react": "^18.0.0 || ^19.0.0"
  },
  "peerDependenciesMeta": {
    "vue": { "optional": true },
    "react": { "optional": true }
  }
}
```

## Использование

### Vanilla JavaScript

```javascript
import { StorefrontSDK } from '@novasynx/storefront-sdk'

const sdk = new StorefrontSDK({
  apiUrl: 'https://api.novahub.com',
  storeId: 'your-store-id'
})

// Получить товары
const products = await sdk.getProducts()

// Создать заказ
const order = await sdk.createOrder({
  items: [{ productId: '123', quantity: 1 }]
})
```

### Vue 3

```vue
<template>
  <div>
    <div v-for="product in products" :key="product.id">
      {{ product.name }} - {{ product.price }}
    </div>
  </div>
</template>

<script setup>
import { useStorefront } from '@novasynx/storefront-sdk/vue'

const { products, getProducts } = useStorefront()

onMounted(() => {
  getProducts()
})
</script>
```

### React

```jsx
import { useStorefront } from '@novasynx/storefront-sdk/react'

export function ProductList() {
  const { products, getProducts } = useStorefront()

  useEffect(() => {
    getProducts()
  }, [])

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>
          {product.name} - {product.price}
        </div>
      ))}
    </div>
  )
}
```

## Публикация

SDK публикуется в npm как `@novasynx/storefront-sdk`:

```bash
npm publish
```

**Перед публикацией:**
1. Обновите версию в `package.json`
2. Запустите `npm run build`
3. Протестируйте сборку
4. Создайте git tag
5. Опубликуйте в npm

## Полезные ссылки

- [tsup документация](https://tsup.egoist.dev)
- [TypeScript документация](https://www.typescriptlang.org)
- [Vue 3 документация](https://vuejs.org)
- [React документация](https://react.dev)
- [npm документация](https://docs.npmjs.com)
