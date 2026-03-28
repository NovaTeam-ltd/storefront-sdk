import { ref, shallowRef, readonly, watch, computed, type App, type InjectionKey, inject } from 'vue'
import { NovaClient, applyTheme } from '../index'
import type { NovaShop, NovaProduct, NovaSDKConfig } from '../types'

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

export type { NovaShop, NovaProduct, NovaSDKConfig }
