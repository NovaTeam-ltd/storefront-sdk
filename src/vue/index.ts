import { ref, shallowRef, readonly, watch, type App, type InjectionKey, inject, computed } from 'vue'
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
  NovaCustomer,
  NovaCustomerOrder,
  NovaSupportChat,
  NovaSupportMessage,
  NovaSteamTopupRequest,
  NovaSteamTopupResult,
  NovaProxyPricing,
  NovaProxyOrderRequest,
  NovaVpnOrderRequest,
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
  NovaCustomer,
  NovaCustomerOrder,
  NovaSupportChat,
  NovaSteamTopupRequest,
  NovaSteamTopupResult,
  NovaProxyPricing,
  NovaProxyOrderRequest,
  NovaVpnOrderRequest,
}

// ── Customer auth (email OTP) ───────────────────────────────────────────
export function useCustomer() {
  const { client, shop } = useNovaContext()
  const isAuthenticated = ref(client.isAuthenticated())
  const customer = shallowRef<NovaCustomer | null>(null)
  const requestingOtp = ref(false)
  const verifying = ref(false)
  const error = ref<string | null>(null)

  function refreshAuthState() {
    isAuthenticated.value = client.isAuthenticated()
  }

  async function requestOtp(email: string) {
    const projectId = shop.value?.projectId
    if (!projectId) throw new Error('Shop is not loaded yet')
    requestingOtp.value = true
    error.value = null
    try {
      return await client.requestOtp(projectId, email)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to request code'
      throw e
    } finally {
      requestingOtp.value = false
    }
  }

  async function verifyOtp(email: string, code: string) {
    const projectId = shop.value?.projectId
    if (!projectId) throw new Error('Shop is not loaded yet')
    verifying.value = true
    error.value = null
    try {
      const r = await client.verifyOtp(projectId, email, code)
      customer.value = r
      refreshAuthState()
      return r
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Invalid code'
      throw e
    } finally {
      verifying.value = false
    }
  }

  async function loadMe() {
    const projectId = shop.value?.projectId
    if (!projectId || !client.isAuthenticated()) return null
    try {
      const r = await client.getCurrentCustomer(projectId)
      customer.value = r
      return r
    } catch (e) {
      refreshAuthState()
      return null
    }
  }

  function logout() {
    client.logout()
    customer.value = null
    refreshAuthState()
  }

  watch(shop, (s) => {
    if (s) loadMe()
  }, { immediate: true })

  return {
    customer: readonly(customer),
    isAuthenticated: readonly(isAuthenticated),
    requestingOtp: readonly(requestingOtp),
    verifying: readonly(verifying),
    error: readonly(error),
    requestOtp,
    verifyOtp,
    logout,
    refresh: loadMe,
  }
}

export function useOrderHistory() {
  const { client, shop } = useNovaContext()
  const orders = shallowRef<NovaCustomerOrder[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    const projectId = shop.value?.projectId
    if (!projectId || !client.isAuthenticated()) {
      orders.value = []
      return
    }
    loading.value = true
    error.value = null
    try {
      orders.value = await client.getCustomerOrders(projectId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load orders'
    } finally {
      loading.value = false
    }
  }

  watch(shop, (s) => { if (s) load() }, { immediate: true })

  return {
    orders: readonly(orders),
    loading: readonly(loading),
    error: readonly(error),
    reload: load,
  }
}

export function useSupportChat(orderId: string, options: { autoPoll?: boolean; intervalMs?: number; realtime?: boolean } = {}) {
  const { client } = useNovaContext()
  const chat = shallowRef<NovaSupportChat | null>(null)
  const loading = ref(false)
  const sending = ref(false)
  const error = ref<string | null>(null)
  const connected = ref(false)
  let stop = false
  let stopStream: (() => void) | null = null
  let pollTimer: any = null
  // Use realtime SSE by default; fall back to polling only when explicitly disabled.
  const realtime = options.realtime !== false

  function appendMessage(msg: NovaSupportMessage) {
    if (!chat.value) return
    if (chat.value.messages.some((m) => m.id === msg.id)) return
    chat.value = { ...chat.value, messages: [...chat.value.messages, msg] }
  }

  function applyStatus(status: string, rating?: number | null) {
    if (!chat.value) return
    chat.value = {
      ...chat.value,
      status,
      rating: typeof rating === 'number' ? rating : chat.value.rating,
    }
  }

  async function load() {
    loading.value = true
    error.value = null
    try {
      chat.value = await client.getSupportChat(orderId)
      return chat.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load chat'
    } finally {
      loading.value = false
    }
  }

  async function send(text: string) {
    if (!chat.value) await load()
    const id = chat.value?.id
    if (!id) throw new Error('Chat unavailable')
    sending.value = true
    try {
      const msg = await client.sendSupportMessage(id, text)
      // Optimistic append; the SSE stream will deduplicate by id.
      appendMessage(msg)
      return msg
    } finally {
      sending.value = false
    }
  }

  async function rate(rating: number) {
    if (!chat.value) await load()
    const id = chat.value?.id
    if (!id) throw new Error('Chat unavailable')
    return client.rateSupportChat(id, rating)
  }

  function startStream() {
    if (!chat.value?.id) return
    stopStream = client.streamSupportChat(chat.value.id, {
      onOpen: () => { connected.value = true },
      onError: () => { connected.value = false },
      onMessage: (m) => appendMessage(m),
      onStatus: (status, rating) => applyStatus(status, rating ?? null),
    })
  }

  function startPolling() {
    const interval = Math.max(2000, options.intervalMs ?? 5000)
    ;(async () => {
      while (!stop) {
        try { await load() } catch { /* ignore */ }
        await new Promise((r) => { pollTimer = setTimeout(r, interval) })
      }
    })()
  }

  load().then(() => {
    if (stop) return
    if (realtime) startStream()
    else if (options.autoPoll !== false) startPolling()
  })

  return {
    chat: readonly(chat),
    loading: readonly(loading),
    sending: readonly(sending),
    error: readonly(error),
    connected: readonly(connected),
    refresh: load,
    send,
    rate,
    stop: () => {
      stop = true
      if (stopStream) { stopStream(); stopStream = null }
      if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
    },
    messageCount: computed(() => chat.value?.messages.length ?? 0),
  }
}

// ── Steam top-up ──────────────────────────────────────────────────────
export function useSteamTopup() {
  const { client, shop } = useNovaContext()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const result = ref<NovaSteamTopupResult | null>(null)

  async function topup(body: NovaSteamTopupRequest): Promise<NovaSteamTopupResult> {
    const projectId = shop.value?.projectId
    if (!projectId) throw new Error('Shop is not loaded yet')
    loading.value = true
    error.value = null
    try {
      const r = await client.purchaseSteamTopup(projectId, body)
      result.value = r
      return r
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Steam top-up failed'
      error.value = msg
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    topup,
    loading: readonly(loading),
    error: readonly(error),
    result: readonly(result),
  }
}

// ── Proxy / VPN ───────────────────────────────────────────────────────
export function useProxyPricing() {
  const { client, shop } = useNovaContext()
  const pricing = shallowRef<NovaProxyPricing | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    const projectId = shop.value?.projectId
    if (!projectId) return
    loading.value = true
    error.value = null
    try {
      pricing.value = await client.getProxyPricing(projectId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load pricing'
    } finally {
      loading.value = false
    }
  }

  watch(shop, (s) => { if (s) load() }, { immediate: true })

  return {
    pricing: readonly(pricing),
    loading: readonly(loading),
    error: readonly(error),
    reload: load,
  }
}

export function useProxyOrder() {
  const { client, shop } = useNovaContext()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function order(body: NovaProxyOrderRequest) {
    const projectId = shop.value?.projectId
    if (!projectId) throw new Error('Shop is not loaded yet')
    loading.value = true
    error.value = null
    try {
      return await client.createProxyOrder(projectId, body)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Proxy order failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { order, loading: readonly(loading), error: readonly(error) }
}

export function useVpnOrder() {
  const { client, shop } = useNovaContext()
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function order(body: NovaVpnOrderRequest) {
    const projectId = shop.value?.projectId
    if (!projectId) throw new Error('Shop is not loaded yet')
    loading.value = true
    error.value = null
    try {
      return await client.createVpnOrder(projectId, body)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'VPN order failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  return { order, loading: readonly(loading), error: readonly(error) }
}
