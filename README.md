# @novasynx/storefront-sdk

SDK для создания кастомных шаблонов магазинов NovaHub. Поддерживает Vue 3, React и Vanilla JS.

## Быстрый старт

Самый быстрый способ — начать со стартового шаблона:

```bash
# Vue
npx degit NovaTeam-ltd/storefront-sdk/starters/vue my-shop
cd my-shop && npm install && npm run dev

# React
npx degit NovaTeam-ltd/storefront-sdk/starters/react my-shop
cd my-shop && npm install && npm run dev
```

Или добавить в существующий проект:

```bash
npm install @novasynx/storefront-sdk
```

## Что предоставляет SDK

| Метод | Описание |
|-------|----------|
| `getShop()` | Название магазина, цветовая схема, валюта, SEO |
| `getProducts(projectId, category?)` | Товары (все или по категории) |
| `getCategories(projectId)` | Список категорий товаров |
| `getProduct(projectId, productId)` | Один товар по ID |

## CSS-переменные

SDK автоматически применяет CSS-переменные при загрузке магазина:

```css
:root {
  --nova-primary: #6366F1;      /* основной цвет магазина */
  --nova-primary-rgb: 99, 102, 241; /* RGB для rgba() */
}
```

Используйте их в своих стилях:
```css
.button { background: var(--nova-primary); }
.overlay { background: rgba(var(--nova-primary-rgb), 0.2); }
```

---

## Vue 3

### Подключение

```js
// main.js
import { createApp } from 'vue'
import { createNova } from '@novasynx/storefront-sdk/vue'
import App from './App.vue'

const app = createApp(App)
app.use(createNova())
app.mount('#app')
```

### Использование

```vue
<script setup>
import { useShop, useProducts, useCategories } from '@novasynx/storefront-sdk/vue'

const { shop, loading, error } = useShop()
const { products, loading: productsLoading } = useProducts()
const { categories } = useCategories()
// фильтрация по категории:
// const { products } = useProducts('gift_card')
</script>

<template>
  <div v-if="loading">Загрузка...</div>
  <div v-else-if="error">{{ error }}</div>
  <div v-else>
    <h1>{{ shop.name }}</h1>

    <div v-for="cat in categories" :key="cat">
      <h2>{{ cat }}</h2>
    </div>

    <div v-for="product in products" :key="product.id">
      <h3>{{ product.name }}</h3>
      <p>{{ product.price }} {{ shop.currency }}</p>
      <img v-if="product.image" :src="product.image" :alt="product.name" />
    </div>
  </div>
</template>
```

---

## React

### Подключение

```jsx
// main.jsx
import { createRoot } from 'react-dom/client'
import { NovaProvider } from '@novasynx/storefront-sdk/react'
import App from './App'

createRoot(document.getElementById('root')).render(
  <NovaProvider>
    <App />
  </NovaProvider>
)
```

### Использование

```jsx
import { useShop, useProducts, useCategories } from '@novasynx/storefront-sdk/react'

function App() {
  const { shop, loading, error } = useShop()
  const { products } = useProducts()
  const { categories } = useCategories()

  if (loading) return <div>Загрузка...</div>
  if (error) return <div>{error}</div>

  return (
    <div>
      <h1>{shop.name}</h1>

      {categories.map(cat => (
        <h2 key={cat}>{cat}</h2>
      ))}

      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>{product.price} {shop.currency}</p>
          {product.image && <img src={product.image} alt={product.name} />}
        </div>
      ))}
    </div>
  )
}
```

---

## Vanilla JS (без фреймворка)

```js
import { NovaClient, applyTheme } from '@novasynx/storefront-sdk'

const client = new NovaClient()

const shop = await client.getShop()
applyTheme(shop)

console.log(shop.name)        // "Мой магазин"
console.log(shop.primaryColor) // "#6366F1"

const products = await client.getProducts(shop.projectId)
const categories = await client.getCategories(shop.projectId)
const steamCards = await client.getProducts(shop.projectId, 'gift_card')
```

---

## Типы

```ts
interface NovaShop {
  projectId: string
  name: string
  template: string
  primaryColor: string
  currency: string
  seoTitle: string
  seoDescription: string
  status: string
}

interface NovaProduct {
  id: string
  name: string
  price: number
  category: string
  image: string | null
  deliveryType: string
  stock: number
}
```

## Структура шаблона для загрузки

Шаблон — это SPA-приложение (Vue/React/Vanilla), которое собирается в статику.

Требования:
1. Сборка должна выдавать `dist/` с `index.html` внутри
2. `package.json` с командой `build`
3. Все API-вызовы через SDK

```
my-template/
├── package.json
├── src/
│   ├── main.js
│   ├── App.vue (или App.jsx)
│   └── components/
├── index.html
└── vite.config.js
```

---

## Dev Mode

При локальной разработке (`localhost`, `127.0.0.1`, `192.168.*`) SDK автоматически переключается в dev mode и использует тестовые данные. Никакие API-запросы не отправляются.

### Автоматическое определение

```js
const client = new NovaClient()
client.isDevMode() // true на localhost
```

### Ручное включение

```js
import { createNova } from '@novasynx/storefront-sdk/vue'

app.use(createNova({
  devMode: true,
}))
```

### Кастомные тестовые данные

```js
app.use(createNova({
  devMode: true,
  devShop: {
    name: 'Мой Магазин',
    primaryColor: '#ff4655',
    currency: 'USD',
  },
  devProducts: [
    { id: '1', name: 'Товар 1', price: 100, category: 'cards', image: null, deliveryType: 'auto', stock: 10 },
    { id: '2', name: 'Товар 2', price: 200, category: 'premium', image: null, deliveryType: 'manual', stock: 5 },
  ],
}))
```

### Готовые моки

SDK экспортирует тестовые данные для использования в тестах:

```js
import { MOCK_SHOP, MOCK_PRODUCTS } from '@novasynx/storefront-sdk'
```

В dev mode в консоли браузера появляется сообщение:
```
[NovaHub SDK] Dev mode active — using mock data
```

---

## Валидация шаблона

При загрузке шаблон проверяется на:

- **Наличие index.html** в корне или dist/
- **Запрещённые расширения файлов** — только html, css, js, json, svg, png, jpg, gif, webp, ico, woff, woff2, ttf, eot, txt, webmanifest
- **Опасные паттерны** — iframe, eval, document.cookie, new Function, внешние скрипты
- **Размер** — до 10MB на файл, до 50MB всего, до 500 файлов

Можно провалидировать до загрузки через API:

```
POST /api/templates/validate?projectId=xxx
Content-Type: multipart/form-data
Body: file (ZIP)
```

Ответ:
```json
{
  "valid": true,
  "errors": [],
  "warnings": ["File hero.png (2.5 MB) is large"]
}
```
