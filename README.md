# @novahub/storefront-sdk

SDK для создания кастомных шаблонов магазинов NovaHub. Поддерживает Vue 3 и React.

## Установка

```bash
npm install @novahub/storefront-sdk
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
import { createNova } from '@novahub/storefront-sdk/vue'
import App from './App.vue'

const app = createApp(App)
app.use(createNova())
app.mount('#app')
```

### Использование

```vue
<script setup>
import { useShop, useProducts, useCategories } from '@novahub/storefront-sdk/vue'

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
import { NovaProvider } from '@novahub/storefront-sdk/react'
import App from './App'

createRoot(document.getElementById('root')).render(
  <NovaProvider>
    <App />
  </NovaProvider>
)
```

### Использование

```jsx
import { useShop, useProducts, useCategories } from '@novahub/storefront-sdk/react'

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
import { NovaClient, applyTheme } from '@novahub/storefront-sdk'

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
