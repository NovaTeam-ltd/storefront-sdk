# @novasynx/storefront-sdk

SDK для разработки storefront-шаблонов NovaHub. Он закрывает загрузку магазина, товаров, категорий, способов оплаты, оформление заказов, калькуляторы пополнений, Telegram Stars/Premium, Steam top-up, историю заказов, поддержку и dev-mode.

SDK доступен в трех вариантах:

- Vanilla TypeScript/JavaScript: `@novasynx/storefront-sdk`
- Vue 3 composables: `@novasynx/storefront-sdk/vue`
- React hooks: `@novasynx/storefront-sdk/react`

## Быстрый Старт

```bash
npm install @novasynx/storefront-sdk
```

Vue:

```js
import { createApp } from 'vue'
import { createNova } from '@novasynx/storefront-sdk/vue'
import App from './App.vue'

createApp(App)
  .use(createNova())
  .mount('#app')
```

React:

```jsx
import { createRoot } from 'react-dom/client'
import { NovaProvider } from '@novasynx/storefront-sdk/react'
import App from './App'

createRoot(document.getElementById('root')).render(
  <NovaProvider>
    <App />
  </NovaProvider>,
)
```

Vanilla:

```js
import { NovaClient, applyTheme } from '@novasynx/storefront-sdk'

const client = new NovaClient()
const shop = await client.getShop()
applyTheme(shop)

const products = await client.getProducts(shop.projectId)
```

## Как SDK Подключается К Магазину

По умолчанию SDK ходит в `apiBase = '/api/storefront'`.

При первом `getShop()` SDK:

- определяет текущий домен;
- получает `projectId` и публичный `projectKey`;
- сохраняет их внутри клиента;
- применяет тему через `applyTheme(shop)`;
- создает visitor cookie;
- отправляет первый `pageview`.

Большинство проектных методов требуют `projectId` и `X-Project-Key`. Если `getShop()` уже был вызван, ключ подставляется автоматически.

```js
const client = new NovaClient({
  apiBase: '/api/storefront',
  credentials: 'include',
})

const shop = await client.getShop()
```

Если шаблон запускается не на домене магазина, можно передать домен явно:

```js
const shop = await client.getShop('shop.example.com')
```

## Основные Методы

| Метод | Что делает |
| --- | --- |
| `getShop(domain?)` | Загружает настройки магазина, `projectId`, `publicKey`, тему, SEO, visitor. |
| `getProducts(projectId, category?)` | Возвращает товары магазина. |
| `getCategories(projectId)` | Возвращает список категорий товаров. |
| `getProduct(projectId, productId)` | Возвращает один товар. |
| `getPaymentMethods(projectId)` | Возвращает включенные способы оплаты. |
| `purchaseProduct(projectId, body, opts?)` | Создает заказ на обычный товар и возвращает `payUrl`. |
| `getOrder(projectId, orderId)` | Возвращает статус обычного заказа. |
| `waitForOrder(projectId, orderId, opts?)` | Опрашивает заказ до терминального статуса. |
| `setPreferences({ locale, currency, theme })` | Сохраняет настройки visitor в cookies. |
| `track(type, meta?)` | Отправляет analytics event. |

## TypeScript И Подсказки IDE

Все публичные DTO экспортируются из root entrypoint:

```ts
import type {
  NovaProduct,
  NovaPaymentMethod,
  NovaStarsPricing,
  NovaTopupQuote,
  NovaSteamTopupV2Request,
  NovaFragmentOrderResult,
} from '@novasynx/storefront-sdk'
```

Vue и React entrypoints также реэкспортируют те же публичные типы, чтобы шаблон можно было писать без переходов в исходники:

```ts
import type { NovaProduct } from '@novasynx/storefront-sdk/vue'
import type { NovaProduct } from '@novasynx/storefront-sdk/react'
```

Ключевые поля имеют JSDoc-комментарии, поэтому VS Code/WebStorm показывают назначение `product.image`, `paymentMethod`, Steam/Stars quote-полей и order DTO прямо в autocomplete.

## Starters

В репозитории SDK есть готовые starter-проекты:

- `starters/vue` - Vue 3 + TypeScript + `@novasynx/storefront-sdk/vue`;
- `starters/react` - React + TypeScript + `@novasynx/storefront-sdk/react`.

Оба starter-а используют публичные SDK-типы напрямую в коде каталога: `NovaProduct`, `NovaPurchaseRequest`, `NovaPaymentMethodId`. В `src/sdk-examples.ts` дополнительно лежат typed helpers для новых сценариев `quoteStarsFromRub()`, `quoteSteamTopupFromRub()`, `NovaStarsOrderRequest` и `NovaSteamTopupV2Request`.

Внутри репозитория зависимость SDK прописана как `file:../..`, чтобы starter build проверял текущие локальные типы. Если вы копируете starter в отдельный проект, замените зависимость на опубликованный пакет: `"@novasynx/storefront-sdk": "^1.1.0"`.

Build starter-а запускает type-check перед Vite-сборкой, поэтому несовпадение с `.d.ts` SDK будет видно сразу:

```bash
cd starters/vue
npm install
npm run build

cd ../react
npm install
npm run build
```

## Товары И Изображения

`NovaProduct.image` может быть `null` или URL картинки. Если картинка пришла от внешнего поставщика, backend отдает ее через безопасный proxy на домене магазина.

Правила для шаблонов:

- используйте `product.image` напрямую в `<img>` или CSS background;
- не парсите URL картинки;
- не рассчитывайте, что в URL есть имя поставщика или исходный путь;
- считайте `image` opaque URL, который может измениться после синка каталога;
- если `image === null`, показывайте fallback.

Пример:

```vue
<article v-for="product in products" :key="product.id">
  <img v-if="product.image" :src="product.image" :alt="product.name" />
  <div v-else class="product-fallback"></div>

  <h3>{{ product.name }}</h3>
  <p>{{ product.price }} {{ shop.currency }}</p>
</article>
```

## Покупка Обычного Товара

Цена всегда считается на сервере. Клиент передает только `productId`, `quantity`, `paymentMethod` и необязательные данные покупателя.

```js
const methods = await client.getPaymentMethods(shop.projectId)

const order = await client.purchaseProduct(shop.projectId, {
  productId: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  quantity: 1,
  paymentMethod: methods[0].id,
  email: 'user@example.com',
})

window.location.href = order.payUrl
```

`purchaseProduct()` автоматически получает checkout token и генерирует `Idempotency-Key`, если вы не передали свой.

```js
await client.purchaseProduct(
  shop.projectId,
  { productId, quantity: 1, paymentMethod: 'cryptobot' },
  { idempotencyKey: crypto.randomUUID().replaceAll('-', '') },
)
```

## Статус И Выдача

После оплаты проверяйте заказ через `getOrder()` или `waitForOrder()`.

```js
const status = await client.waitForOrder(shop.projectId, orderId, {
  intervalMs: 2500,
  timeoutMs: 5 * 60 * 1000,
  onUpdate: (s) => console.log(s.status),
})

if (status.status === 'COMPLETED' && status.delivery?.content) {
  document.querySelector('#delivery').textContent = status.delivery.content
}
```

`delivery`:

- `delivery.manual === false` и `delivery.content` есть: можно показать ключи/коды;
- `delivery.manual === true`: заказ оплачен, продавец выдает вручную;
- `delivery === null`: заказ еще не выдан или не оплачен.

## Steam Top-Up С Калькулятором

Для новых Steam-витрин используйте V2 flow:

1. `getSteamPricing(projectId)` загружает валюты, лимиты, методы оплаты и quote rates.
2. `quoteSteamTopupFromRub(pricing, amountRub, currency)` считает локально без API-запроса на каждый ввод.
3. `quoteSteamTopup(projectId, { amountRub, currency })` делает server quote, если нужен точный расчет с актуальными rate.
4. `purchaseSteamTopupV2(projectId, body)` создает заказ.

Локальный калькулятор:

```js
import { quoteSteamTopupFromRub } from '@novasynx/storefront-sdk'

const pricing = await client.getSteamPricing(shop.projectId)
const quote = quoteSteamTopupFromRub(pricing, 1000, 'RUB')

console.log(quote)
// {
//   receiveAmount: 909,
//   receiveCurrency: 'RUB',
//   chargeRub: 1000,
//   remainingRub: 0,
//   valid: true,
//   minChargeRub: 100,
//   maxChargeRub: 100000
// }
```

Оформление:

```js
const quote = quoteSteamTopupFromRub(pricing, amountRub, currency)
if (!quote.valid) return

const order = await client.purchaseSteamTopupV2(shop.projectId, {
  login: steamLogin,
  amount: quote.receiveAmount,
  currency: quote.receiveCurrency,
  paymentMethod: 'cryptobot',
  email: 'user@example.com',
})

window.location.href = order.payUrl
```

Важно:

- `amount` в `purchaseSteamTopupV2` это сумма, которую пользователь получит в Steam, а не бюджет в рублях;
- `chargeRub` из quote это storefront-сумма до комиссии конкретного PSP;
- поддерживаемые валюты: `RUB`, `KZT`, `UAH`;
- `Steam login` это логин, не nickname.

В SDK также есть legacy метод `purchaseSteamTopup(projectId, body)`. Он оставлен для старых шаблонов. Для новых Steam-витрин используйте `getSteamPricing()`, `quoteSteamTopupFromRub()` или `quoteSteamTopup()`, затем `purchaseSteamTopupV2()`.

## Telegram Stars

Для Stars основной калькулятор обычно работает от суммы в рублях:

```js
import { quoteStarsFromRub } from '@novasynx/storefront-sdk'

const pricing = await client.getStarsPricing(shop.projectId)
const quote = quoteStarsFromRub(pricing, 1000)

console.log(quote.quantity, quote.chargeRub, quote.remainingRub)
```

Правила:

- покупается максимальное целое количество Stars, которое не превышает введенный бюджет;
- если бюджет меньше минимальной покупки, `valid === false`;
- `remainingRub` показывает остаток, если бюджет не делится ровно на цену одной star.

Оформление:

```js
const quote = quoteStarsFromRub(pricing, amountRub)
if (!quote.valid) return

const order = await client.purchaseStars(shop.projectId, {
  username: 'telegram_username',
  quantity: quote.quantity,
  paymentMethod: 'cryptobot',
})

window.location.href = order.payUrl
```

## Telegram Premium

```js
const pricing = await client.getPremiumPricing(shop.projectId)

const order = await client.purchasePremium(shop.projectId, {
  username: 'telegram_username',
  months: 12,
  paymentMethod: pricing.paymentMethods[0].id,
})

window.location.href = order.payUrl
```

Поддерживаемые планы задаются backend-ом. Сейчас типы допускают `3`, `6`, `12` месяцев.

## Bot Orders

Stars, Premium и Steam V2 возвращают `NovaFragmentOrderResult`. Статус таких заказов проверяется отдельно:

```js
const order = await client.waitForBotOrder(shop.projectId, orderId, {
  intervalMs: 3000,
  timeoutMs: 10 * 60 * 1000,
  onUpdate: (s) => console.log(s.status),
})

if (order.status === 'completed') {
  console.log(order.details.deliveredAt)
}
```

Терминальные статусы: `completed`, `failed`, `cancelled`.

## Steam Games Catalog

`getSteamGames()` возвращает дополнительный каталог Steam games из backend service groups. Для обычных карточек товаров в storefront чаще используйте `getProducts()`/`useProducts()`, потому что это товары конкретного проекта.

```js
const catalog = await client.getSteamGames(shop.projectId, {
  limit: 100,
  q: 'cyberpunk',
})

for (const item of catalog.items) {
  console.log(item.name, item.priceRub, item.image)
}
```

## Proxy И VPN

```js
const pricing = await client.getProxyPricing(shop.projectId)

const proxyOrder = await client.createProxyOrder(shop.projectId, {
  proxyType: 'datacenter',
  gbAmount: 10,
  country: 'US',
  paymentMethod: 'cryptobot',
  email: 'user@example.com',
})

const vpnOrder = await client.createVpnOrder(shop.projectId, {
  durationDays: 30,
  paymentMethod: 'cryptobot',
})
```

## Customer Auth И История Заказов

Покупатель может авторизоваться по email OTP.

```js
await client.requestOtp(shop.projectId, 'user@example.com')

const customer = await client.verifyOtp(
  shop.projectId,
  'user@example.com',
  '123456',
)

const orders = await client.getCustomerOrders(shop.projectId)
```

Токен покупателя хранится в `localStorage` на уровне проекта. `logout()` удаляет его:

```js
client.logout()
```

## Support Chat

После заказа можно открыть чат поддержки.

```js
const chat = await client.getSupportChat(orderId)

await client.sendSupportMessage(chat.id, 'Здравствуйте, нужен чек', chat.supportToken)

const stop = client.streamSupportChat(chat.id, {
  onMessage: (message) => console.log(message.text),
  onStatus: (status) => console.log(status),
}, chat.supportToken)

// later
stop()
```

## Vue Composables

Базовые:

| Composable | Возвращает |
| --- | --- |
| `useNova()` | Экземпляр `NovaClient`. |
| `useShop()` | `{ shop, loading, error }`. |
| `useProducts(category?)` | `{ products, loading, error, reload }`. |
| `useCategories()` | `{ categories, loading, error, reload }`. |
| `useProduct(productId)` | `{ product, loading, error, reload }`. |
| `usePaymentMethods()` | `{ methods, loading, error, reload }`. |
| `usePurchase()` | `{ purchase, loading, error, result }`. |
| `useOrder(orderId, opts?)` | `{ order, loading, error, refresh, stop }`. |
| `usePreferences()` | `{ set, loading, error }`. |
| `useVisitor()` | Visitor data из `shop.visitor`. |

Customer/support:

| Composable | Что делает |
| --- | --- |
| `useCustomer()` | OTP login, current customer, logout. |
| `useOrderHistory()` | История заказов авторизованного покупателя. |
| `useSupportChat(orderId, opts?)` | Support chat с SSE по умолчанию. |

Telegram/Steam/Proxy:

| Composable | Что делает |
| --- | --- |
| `useStarsPricing()` | Загружает Stars pricing. |
| `useStarsPurchase()` | Создает Stars order. |
| `usePremiumPricing()` | Загружает Premium pricing. |
| `usePremiumPurchase()` | Создает Premium order. |
| `useSteamPricing()` | Загружает Steam pricing и локальные quote rates. |
| `useSteamTopupQuote()` | Делает server quote Steam top-up. |
| `useSteamTopupV2()` | Создает Steam top-up V2 order. |
| `useSteamGames(opts?)` | Загружает Steam games catalog. |
| `useBotOrder(orderId, opts?)` | Статус Stars/Premium/Steam V2 заказа. |
| `useProxyPricing()` | Загружает Proxy/VPN pricing. |
| `useProxyOrder()` | Создает proxy order. |
| `useVpnOrder()` | Создает VPN order. |

Пример Vue Steam калькулятора без API-запроса на каждый ввод:

```vue
<script setup>
import { computed, ref } from 'vue'
import {
  useSteamPricing,
  useSteamTopupV2,
  quoteSteamTopupFromRub,
} from '@novasynx/storefront-sdk/vue'

const amountRub = ref(1000)
const currency = ref('RUB')
const login = ref('')
const paymentMethod = ref('cryptobot')

const { data: pricing } = useSteamPricing()
const { submit, loading } = useSteamTopupV2()

const quote = computed(() =>
  quoteSteamTopupFromRub(pricing.value, amountRub.value, currency.value),
)

async function pay() {
  if (!quote.value.valid) return
  const order = await submit({
    login: login.value,
    amount: quote.value.receiveAmount,
    currency: quote.value.receiveCurrency,
    paymentMethod: paymentMethod.value,
  })
  window.location.href = order.payUrl
}
</script>
```

## React Hooks

React wrapper сейчас покрывает базовый storefront flow:

| Hook | Возвращает |
| --- | --- |
| `useShop()` | `{ shop, loading, error }`. |
| `useProducts(category?)` | `{ products, loading, error, reload }`. |
| `useCategories()` | `{ categories, loading, error }`. |
| `useProduct(productId)` | `{ product, loading, error }`. |
| `usePaymentMethods()` | `{ methods, loading, error }`. |
| `usePurchase()` | `{ purchase, loading, error, result }`. |
| `useOrder(orderId, opts?)` | `{ order, loading, error, refresh }`. |
| `usePreferences()` | `{ set, loading, error }`. |
| `useVisitor()` | `shop.visitor` или `null`. |
| `useNova()` | Экземпляр `NovaClient`. |

Расширенные flows в React используйте через `useNova()`:

```jsx
import { useNova, useShop } from '@novasynx/storefront-sdk/react'
import { quoteStarsFromRub } from '@novasynx/storefront-sdk'

function StarsCalculator() {
  const client = useNova()
  const { shop } = useShop()

  async function pay(amountRub) {
    const pricing = await client.getStarsPricing(shop.projectId)
    const quote = quoteStarsFromRub(pricing, amountRub)
    if (!quote.valid) return

    const order = await client.purchaseStars(shop.projectId, {
      username: 'telegram_username',
      quantity: quote.quantity,
      paymentMethod: pricing.paymentMethods[0].id,
    })
    window.location.href = order.payUrl
  }
}
```

## CSS Переменные И Тема

`applyTheme(shop)` устанавливает переменные:

```css
:root {
  --nova-primary: #6366f1;
  --nova-primary-rgb: 99, 102, 241;
}
```

SDK также обновляет favicon, manifest name и social image, если они есть в настройках магазина.

## Dev Mode

На `localhost`, `127.0.0.1` и `192.168.*` SDK автоматически включает dev mode и использует mock data.

```js
const client = new NovaClient()
client.isDevMode() // true на localhost
```

Принудительный dev mode:

```js
const client = new NovaClient({
  devMode: true,
  devShop: {
    name: 'Demo Shop',
    primaryColor: '#38bdf8',
    currency: 'RUB',
  },
  devProducts: [
    {
      id: 'dev-1',
      name: 'Demo product',
      price: 100,
      category: 'demo',
      image: null,
      deliveryType: 'auto',
      stock: 10,
    },
  ],
})
```

Готовые mock exports:

```js
import {
  MOCK_SHOP,
  MOCK_PRODUCTS,
  MOCK_PAYMENT_METHODS,
} from '@novasynx/storefront-sdk'
```

## Безопасность

Главные правила:

- не отправляйте цену с клиента, server считает ее сам;
- не храните секретные ключи платежек в шаблоне;
- используйте только `paymentMethod` из `getPaymentMethods()` или pricing response;
- проверяйте `quote.valid` перед созданием Stars/Steam заказа;
- не дергайте внутренние backend endpoints напрямую, используйте SDK methods;
- `product.image` и `NovaSteamGame.image` это safe storefront URL, не upstream URL поставщика;
- платежные и support icons приходят как `data:image/svg+xml`, без внешних запросов.

Server-side ограничения:

- `productId` и `orderId` проверяются как UUID;
- `quantity` для обычных товаров проверяется как integer `1..99`;
- `email`, Telegram username, Steam login валидируются и на клиенте, и на сервере;
- checkout token обязателен для создания заказов;
- idempotency key защищает от дублей обычных заказов;
- rate-limit применяется на платежные и публичные storefront endpoints.

## Основные Типы

```ts
interface NovaShop {
  projectId: string
  publicKey?: string
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
  enabledPaymentMethods?: NovaPaymentMethodId[]
  visitor?: NovaVisitor
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
  id: 'cryptobot' | 'heleket' | 'lolz' | string
  name: string
  icon: string
  currencies: string[]
}

interface NovaPurchaseResult {
  orderId: string
  payUrl: string
  paymentMethod: string
  totalRub: number
  totalPay: number
  currency: string
}

interface NovaTopupQuote {
  receiveAmount: number
  receiveCurrency: 'RUB' | 'KZT' | 'UAH'
  chargeRub: number
  remainingRub: number
  valid: boolean
  minChargeRub: number
  maxChargeRub: number
}

interface NovaFragmentOrderResult {
  orderId: string
  externalOrderId: string
  payUrl: string
  paymentMethod: string
  totalRub: number
  totalPay: number
  currency: string
}
```

Полный список типов экспортируется из `@novasynx/storefront-sdk`.

## Структура Шаблона

Шаблон должен быть SPA, который собирается в статический `dist/`.

Минимальная структура:

```text
my-template/
  package.json
  index.html
  vite.config.js
  src/
    main.js
    App.vue
    components/
```

Требования:

- `package.json` содержит `build`;
- сборка создает `dist/index.html`;
- API-вызовы идут через SDK;
- в шаблон не добавляются секреты;
- внешние изображения поставщиков не используются напрямую.

## Валидация Шаблона

Перед загрузкой шаблон проверяется backend-ом:

- должен быть `index.html`;
- разрешены только безопасные web-расширения;
- запрещены `iframe`, `eval`, `document.cookie`, `new Function`, внешние скрипты;
- лимиты: до 10 MB на файл, до 50 MB всего, до 500 файлов.

API проверки:

```http
POST /api/templates/validate?projectId=<projectId>
Content-Type: multipart/form-data

file=<zip>
```

Ответ:

```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```
