# Storefront SDK - Architecture Guide

## Архитектура SDK

SDK разделен на несколько слоев:

```
┌─────────────────────────────────────┐
│   Framework Integrations            │
│   (Vue 3, React)                    │
├─────────────────────────────────────┤
│   Core SDK                          │
│   (API Client, State Management)    │
├─────────────────────────────────────┤
│   HTTP Client                       │
│   (Fetch, Error Handling)           │
└─────────────────────────────────────┘
```

## Структура файлов

```
src/
├── index.ts              # Основной экспорт
├── core/
│   ├── client.ts         # HTTP клиент
│   ├── types.ts          # Типы
│   └── utils.ts          # Утилиты
├── vue/
│   ├── index.ts          # Vue экспорт
│   ├── composables.ts    # Vue composables
│   └── components.ts     # Vue компоненты
├── react/
│   ├── index.ts          # React экспорт
│   ├── hooks.ts          # React hooks
│   └── components.tsx    # React компоненты
└── types/
    └── index.ts          # Экспортируемые типы
```

## Core SDK

### HTTP Client

```typescript
// core/client.ts
class StorefrontClient {
  private baseURL: string
  private apiKey: string

  constructor(config: Config) {
    this.baseURL = config.apiUrl
    this.apiKey = config.apiKey
  }

  async request(method: string, path: string, data?: any) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: data ? JSON.stringify(data) : undefined
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }
}
```

### State Management

```typescript
// core/store.ts
class StorefrontStore {
  private state = {
    products: [],
    cart: [],
    user: null
  }

  getState() {
    return this.state
  }

  setState(updates: Partial<typeof this.state>) {
    this.state = { ...this.state, ...updates }
  }
}
```

## Vue 3 Integration

### Composables

```typescript
// vue/composables.ts
export function useStorefront() {
  const state = reactive({
    products: [],
    loading: false,
    error: null
  })

  const getProducts = async () => {
    state.loading = true
    try {
      state.products = await sdk.getProducts()
    } catch (error) {
      state.error = error.message
    } finally {
      state.loading = false
    }
  }

  return {
    ...toRefs(state),
    getProducts
  }
}
```

## React Integration

### Hooks

```typescript
// react/hooks.ts
export function useStorefront() {
  const [state, setState] = useState({
    products: [],
    loading: false,
    error: null
  })

  const getProducts = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))
    try {
      const products = await sdk.getProducts()
      setState(prev => ({ ...prev, products }))
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message }))
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }, [])

  return {
    ...state,
    getProducts
  }
}
```

## Типы

```typescript
// types/index.ts
export interface Product {
  id: string
  name: string
  price: number
  image: string
}

export interface Cart {
  items: CartItem[]
  total: number
}

export interface CartItem {
  productId: string
  quantity: number
  price: number
}

export interface Config {
  apiUrl: string
  apiKey: string
  storeId: string
}
```

## Обработка ошибок

```typescript
// core/errors.ts
export class StorefrontError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number
  ) {
    super(message)
  }
}

export class ValidationError extends StorefrontError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message)
  }
}

export class AuthError extends StorefrontError {
  constructor(message: string) {
    super('AUTH_ERROR', message, 401)
  }
}
```

## Полезные ссылки

- [SDK GitHub](https://github.com/novasynx/storefront-sdk)
- [TypeScript документация](https://www.typescriptlang.org)
- [Vue 3 документация](https://vuejs.org)
- [React документация](https://react.dev)
