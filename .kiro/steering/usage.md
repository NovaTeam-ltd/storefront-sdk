# Storefront SDK - Usage Guide

## Установка

```bash
npm install @novasynx/storefront-sdk
```

## Базовое использование

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

## API

### Товары

```javascript
// Получить все товары
const products = await sdk.getProducts()

// Получить товар по ID
const product = await sdk.getProduct(productId)

// Поиск товаров
const results = await sdk.searchProducts('query')
```

### Заказы

```javascript
// Создать заказ
const order = await sdk.createOrder({
  items: [
    { productId: '123', quantity: 1 },
    { productId: '456', quantity: 2 }
  ]
})

// Получить заказ
const order = await sdk.getOrder(orderId)

// Получить мои заказы
const orders = await sdk.getMyOrders()
```

### Корзина

```javascript
// Добавить в корзину
await sdk.addToCart(productId, quantity)

// Получить корзину
const cart = await sdk.getCart()

// Очистить корзину
await sdk.clearCart()
```

### Пользователь

```javascript
// Получить профиль
const profile = await sdk.getProfile()

// Обновить профиль
await sdk.updateProfile({
  name: 'John Doe',
  email: 'john@example.com'
})

// Выход
await sdk.logout()
```

## Обработка ошибок

```javascript
try {
  const products = await sdk.getProducts()
} catch (error) {
  if (error.code === 'UNAUTHORIZED') {
    console.error('Требуется аутентификация')
  } else if (error.code === 'NOT_FOUND') {
    console.error('Ресурс не найден')
  } else {
    console.error('Ошибка:', error.message)
  }
}
```

## Типы

```typescript
interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
}

interface Order {
  id: string
  items: OrderItem[]
  total: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  createdAt: Date
}

interface OrderItem {
  productId: string
  quantity: number
  price: number
}
```

## Полезные ссылки

- [SDK GitHub](https://github.com/novasynx/storefront-sdk)
- [API документация](https://api.novahub.com/docs)
