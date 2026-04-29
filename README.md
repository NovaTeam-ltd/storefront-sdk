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
| `getShop()` | Название, цвет, валюта, SEO + `visitor` (язык/валюта/тема пользователя) |
| `getProducts(projectId, category?)` | Товары (все или по категории) |
| `getCategories(projectId)` | Список категорий |
| `getProduct(projectId, productId)` | Один товар |
| `getPaymentMethods(projectId)` | Список доступных способов оплаты с иконками |
| `purchaseProduct(projectId, body, opts?)` | Покупка товара (qty + выбор оплаты) → `payUrl` |
| `getOrder(projectId, orderId)` | Статус заказа после оплаты + содержимое автодоставки |
| `waitForOrder(projectId, orderId, opts?)` | Опрашивает заказ до терминального статуса |
| `setPreferences({ locale, currency, theme })` | Сохраняет настройки визитора в cookies |

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
  favicon?: string | null
  manifestName?: string | null
  locale?: string
  ogImage?: string | null
  /** Список id платёжек, включённых в проекте. */
  enabledPaymentMethods?: string[]
  /** Данные визитора (cookie + Accept-Language). */
  visitor?: NovaVisitor
}

interface NovaVisitor {
  id: string                 // стабильный id из HttpOnly cookie
  fingerprint: string        // sha256(UA + Accept-Language + IP), для аналитики
  locale: string             // cookie > Accept-Language > project default
  currency: string           // cookie override or project default
  theme: 'auto' | 'light' | 'dark'
  defaultLocale: string
  defaultCurrency: string
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

interface NovaPaymentMethod {
  id: 'cryptobot' | 'heleket' | 'lolz'
  name: string
  icon: string               // data:image/svg+xml — сразу в <img src>
  currencies: string[]
}

interface NovaPurchaseRequest {
  productId: string          // uuid
  quantity: number           // 1..99, integer
  paymentMethod: 'cryptobot' | 'heleket' | 'lolz'
  email?: string
  customerInfo?: Record<string, string>
}

interface NovaPurchaseResult {
  orderId: string
  payUrl: string
  paymentMethod: string
  totalRub: number
  totalPay: number
  currency: string
}
```

---

## Покупка товара

На сервере создаётся заказ и выставляется счёт в выбранной платёжной системе. SDK возвращает
`payUrl` — перенаправьте на него пользователя.

### Vue

```vue
<script setup>
import { useShop, usePaymentMethods, usePurchase } from '@novasynx/storefront-sdk/vue'

const { shop } = useShop()
const { methods } = usePaymentMethods()
const { purchase, loading, error } = usePurchase()

async function buy(productId) {
  const res = await purchase({
    productId,
    quantity: 1,
    paymentMethod: 'cryptobot',  // из methods[].id
    email: 'user@example.com',
  })
  window.location.href = res.payUrl
}
</script>

<template>
  <div v-for="m in methods" :key="m.id">
    <img :src="m.icon" :alt="m.name" width="24" height="24" />
    {{ m.name }}
  </div>
</template>
```

### React

```jsx
import { usePaymentMethods, usePurchase } from '@novasynx/storefront-sdk/react'

function BuyButton({ productId }) {
  const { methods } = usePaymentMethods()
  const { purchase, loading, error } = usePurchase()

  async function handleBuy() {
    const res = await purchase({
      productId,
      quantity: 2,
      paymentMethod: methods[0].id,
    })
    window.location.href = res.payUrl
  }

  return <button onClick={handleBuy} disabled={loading}>Купить</button>
}
```

### Vanilla

```js
import { NovaClient } from '@novasynx/storefront-sdk'

const client = new NovaClient()
const shop = await client.getShop()
const methods = await client.getPaymentMethods(shop.projectId)

const { payUrl } = await client.purchaseProduct(shop.projectId, {
  productId: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  quantity: 1,
  paymentMethod: 'cryptobot',
})
location.href = payUrl
```

### Полный круг: оплата → выдача → email

После того как пользователь вернулся со страницы оплаты, опросите статус заказа.
Сервер автоматически:

- получает webhook от провайдера и переводит заказ в `PAID` → `PROCESSING`;
- читает `Product.deliveryType`:
  - `auto` + `externalServiceId` → дергает внешнего поставщика (ns.gifts) `quantity` раз;
  - `auto` + `deliveryData` → возвращает сохранённые ключи/коды;
  - `manual` → оставляет заказ для ручной выдачи продавцом;
- декрементит `stock`;
- отправляет на `email` письмо с содержимым заказа (если он указан).

#### Vue

```vue
<script setup lang="ts">
import { useOrder } from '@novasynx/storefront-sdk/vue'
const { order, loading } = useOrder(route.query.orderId, { autoPoll: true })
</script>

<template>
  <div v-if="loading">Ожидаем подтверждение оплаты…</div>
  <div v-else-if="order?.status === 'COMPLETED' && order.delivery?.content">
    <h2>Ваш товар:</h2>
    <pre>{{ order.delivery.content }}</pre>
  </div>
  <div v-else-if="order?.status === 'COMPLETED' && order.delivery?.manual">
    Заказ оплачен. Продавец выдаст товар в течение 24 часов.
  </div>
  <div v-else-if="order?.status === 'FAILED'">Оплата не прошла</div>
</template>
```

#### React

```tsx
import { useOrder } from '@novasynx/storefront-sdk/react'

export function ThankYou({ orderId }: { orderId: string }) {
  const { order } = useOrder(orderId, { autoPoll: true })
  if (!order) return <p>Ожидаем подтверждение…</p>
  if (order.status === 'COMPLETED' && order.delivery?.content)
    return <pre>{order.delivery.content}</pre>
  if (order.status === 'COMPLETED' && order.delivery?.manual)
    return <p>Заказ принят, продавец выдаст товар вручную.</p>
  return <p>Статус: {order.status}</p>
}
```

#### Vanilla

```js
const status = await client.waitForOrder(shop.projectId, orderId, {
  intervalMs: 2500,
  timeoutMs: 5 * 60 * 1000,
  onUpdate: (s) => console.log(s.status),
})
if (status.status === 'COMPLETED' && status.delivery?.content) {
  document.getElementById('codes').textContent = status.delivery.content
}
```

### Безопасность

Покупка выполнена по принципу **"клиент никогда не доверен"**. Важные правила:

- **Цена считается на сервере** из `Product.price * quantity`. С клиента цена не принимается.
- **`paymentMethod` проверяется по whitelist** проекта (`Project.paymentMethod`).
- **`quantity` валидируется**: integer 1..99 и ≤ stock товара.
- **`productId` — UUID v4**, должен принадлежать этому проекту и быть `active`.
- **`email` валидируется** простым regex на обеих сторонах.
- **Idempotency-Key**: SDK автоматически генерирует ключ (UUID), сервер кэширует ответ на 10 минут — повторные отправки не создают дубликатов.
- **Rate-limit**: `POST /:projectId/orders` — 10/мин/IP, `payment-methods` — 60/мин/IP.
- **Cookies**: `nv_visitor`, `nv_locale`, `nv_currency`, `nv_theme` — `HttpOnly`, `SameSite=Lax`, `Secure` в проде.
- **Статус магазина**: заказ отклоняется, если `project.status ≠ 'active'`.
- **Иконки платёжек** — inline `data:image/svg+xml`, без внешних запросов (не сливают referrer / IP).

Для отмены реквеста можно передать `AbortSignal`:

```js
const ctrl = new AbortController()
client.purchaseProduct(projectId, body, { signal: ctrl.signal })
ctrl.abort()
```

---

## Язык и настройки пользователя (visitor)

`getShop()` ретюрнит поле `visitor` с языком, валютой и темой пользователя.
Приоритет значений:

1. **Cookie** (`nv_locale`, `nv_currency`, `nv_theme`) — если пользователь явно их выбрал.
2. **HTTP `Accept-Language`** — для `locale` выбирается первый поддерживаемый.
3. **Настройки проекта** — fallback.

`visitor.id` — стабильный визитор (UUID в cookie `nv_visitor`, HttpOnly).
`visitor.fingerprint` — срез sha256(UA + Accept-Language + IP), используется только для аналитики
(не для авторизации) и остаётся стабильным при одном браузере/IP.

### Переключение языка

```js
// ванильный JS
await client.setPreferences({ locale: 'en', currency: 'USD', theme: 'dark' })

// Vue
import { usePreferences } from '@novasynx/storefront-sdk/vue'
const { set } = usePreferences()
await set({ locale: 'en' })
```

После вызова сервер пишет cookies, перезагрузите шоп через `client.getShop()` или перезагрузите страницу.

---

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
import { MOCK_SHOP, MOCK_PRODUCTS, MOCK_PAYMENT_METHODS } from '@novasynx/storefront-sdk'
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
