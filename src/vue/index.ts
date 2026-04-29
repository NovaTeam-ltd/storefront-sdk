import { ref, shallowRef, readonly, watch, type App, type InjectionKey, inject } from 'vue'
import { NovaClient, applyTheme } from '../index'
import type {
  NovaShop,
  NovaProduct,
  NovaSDKConfig,
  NovaPaymentMethod,
  NovaPurchaseRequest,
  NovaPurchaseOptions,
  NovaPurchaseResult,
  NovaPreferences,
  NovaOrderStatus,
} from '../types'

const NOVA_KEY: InjectionKey<NovaContext> = Symbol('novahub')

interface NovaContext {
  client: NovaClient
  shop: ReturnType<typeof shallowRef<NovaShop | null>>
  loading: ReturnType<typeof ref<boolean>>
  error: ReturnType<typeof ref<string | null>>
}

export function createNova(config: NovaSDKConfig = {}) {
  const client = new NovaClient(config)
  const shop = shallowRef<NovaShop | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const ctx: NovaContext = { client, shop, loading, error }

  return {
    install(app: App) {
      app.provide(NOVA_KEY, ctx)

      client.getShop().then((data) => {
        shop.value = data
        applyTheme(data)
      }).catch((e) => {
        error.value = e instanceof Error ? e.message : 'Failed to load shop'
      }).finally(() => {
        loading.value = false
      })
    },
  }
}

function useNovaContext(): NovaContext {
  const ctx = inject(NOVA_KEY)
  if (!ctx) throw new Error('NovaHub SDK not installed. Call app.use(createNova()) first.')
  return ctx
}

export function useNova() {
  return useNovaContext().client
}

export function useShop() {
  const { shop, loading, error } = useNovaContext()
  return {
    shop: readonly(shop),
    loading: readonly(loading),
    error: readonly(error),
  }
}

export function useProducts(category?: string) {
  const { client, shop } = useNovaContext()
  const products = ref<NovaProduct[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(cat?: string) {
    const projectId = shop.value?.projectId
    if (!projectId) return

    loading.value = true
    error.value = null
    try {
      products.value = await client.getProducts(projectId, cat ?? category)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load products'
    } finally {
      loading.value = false
    }
  }

  watch(shop, (s) => {
    if (s) load()
  }, { immediate: true })

  return {
    products: readonly(products),
    loading: readonly(loading),
    error: readonly(error),
    reload: load,
  }
}

export function useCategories() {
  const { client, shop } = useNovaContext()
  const categories = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    const projectId = shop.value?.projectId
    if (!projectId) return

    loading.value = true
    error.value = null
    try {
      categories.value = await client.getCategories(projectId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load categories'
    } finally {
      loading.value = false
    }
  }

  watch(shop, (s) => {
    if (s) load()
  }, { immediate: true })

  return {
    categories: readonly(categories),
    loading: readonly(loading),
    error: readonly(error),
    reload: load,
  }
}

export function useProduct(productId: string) {
  const { client, shop } = useNovaContext()
  const product = ref<NovaProduct | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    const projectId = shop.value?.projectId
    if (!projectId) return

    loading.value = true
    error.value = null
    try {
      product.value = await client.getProduct(projectId, productId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load product'
    } finally {
      loading.value = false
    }
  }

  watch(shop, (s) => {
    if (s) load()
  }, { immediate: true })

  return {
    product: readonly(product),
    loading: readonly(loading),
    error: readonly(error),
    reload: load,
  }
}

export function usePaymentMethods() {
  const { client, shop } = useNovaContext()
  const methods = ref<NovaPaymentMethod[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    const projectId = shop.value?.projectId
    if (!projectId) return
    loading.value = true
    error.value = null
    try {
      methods.value = await client.getPaymentMethods(projectId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load payment methods'
    } finally {
      loading.value = false
    }
  }

  watch(shop, (s) => { if (s) load() }, { immediate: true })

  return {
    methods: readonly(methods),
    loading: readonly(loading),
    error: readonly(error),
    reload: load,
  }
}

export function usePurchase() {
  const { client, shop } = useNovaContext()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const result = ref<NovaPurchaseResult | null>(null)

  async function purchase(
    body: NovaPurchaseRequest,
    opts: NovaPurchaseOptions = {},
  ): Promise<NovaPurchaseResult> {
    const projectId = shop.value?.projectId
    if (!projectId) throw new Error('Shop is not loaded yet')
    loading.value = true
    error.value = null
    try {
      const r = await client.purchaseProduct(projectId, body, opts)
      result.value = r
      return r
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Purchase failed'
      error.value = msg
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    purchase,
    loading: readonly(loading),
    error: readonly(error),
    result: readonly(result),
  }
}

export function useVisitor() {
  const { shop } = useNovaContext()
  return {
    visitor: readonly(shop) as any,
  }
}

export function usePreferences() {
  const { client } = useNovaContext()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function set(prefs: NovaPreferences) {
    loading.value = true
    error.value = null
    try {
      return await client.setPreferences(prefs)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to set preferences'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { set, loading: readonly(loading), error: readonly(error) }
}

export function useOrder(orderId: string, options: { autoPoll?: boolean; intervalMs?: number } = {}) {
  const { client, shop } = useNovaContext()
  const order = shallowRef<NovaOrderStatus | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let stop = false

  async function fetchOnce() {
    const projectId = shop.value?.projectId
    if (!projectId) return null
    loading.value = true
    error.value = null
    try {
      const r = await client.getOrder(projectId, orderId)
      order.value = r
      return r
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load order'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function poll() {
    const projectId = shop.value?.projectId
    if (!projectId) return
    const terminal = new Set(['COMPLETED', 'FAILED', 'CANCELLED'])
    const interval = Math.max(1000, options.intervalMs ?? 2500)
    while (!stop) {
      try {
        const r = await fetchOnce()
        if (r && terminal.has(r.status)) return r
      } catch {
        /* keep polling on transient errors */
      }
      await new Promise((res) => setTimeout(res, interval))
    }
  }

  if (options.autoPoll !== false) {
    watch(shop, (s) => { if (s) poll() }, { immediate: true })
  } else {
    watch(shop, (s) => { if (s) fetchOnce() }, { immediate: true })
  }

  return {
    order: readonly(order),
    loading: readonly(loading),
    error: readonly(error),
    refresh: fetchOnce,
    stop: () => { stop = true },
  }
}

export type {
  NovaShop,
  NovaProduct,
  NovaSDKConfig,
  NovaPaymentMethod,
  NovaPurchaseRequest,
  NovaPurchaseOptions,
  NovaPurchaseResult,
  NovaPreferences,
  NovaOrderStatus,
}
