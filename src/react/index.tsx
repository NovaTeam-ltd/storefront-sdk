import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { NovaClient, applyTheme } from '../index'
import type {
  NovaShop,
  NovaVisitor,
  NovaAttribution,
  NovaProduct,
  NovaSDKConfig,
  NovaPaymentMethod,
  NovaPaymentMethodId,
  NovaPurchaseRequest,
  NovaPurchaseOptions,
  NovaPurchaseResult,
  NovaPreferences,
  NovaOrderStatus,
  NovaOrderStatusValue,
  NovaOrderDelivery,
  NovaCustomer,
  NovaCustomerOrder,
  NovaSupportChat,
  NovaSupportMessage,
  NovaSupportChatStreamEvent,
  NovaSteamTopupRequest,
  NovaSteamTopupResult,
  NovaSteamPricing,
  NovaSteamCurrency,
  NovaSteamQuoteRate,
  NovaSteamTopupQuoteRequest,
  NovaTopupQuote,
  NovaSteamGame,
  NovaSteamGamesCatalog,
  NovaStarsPricing,
  NovaPremiumPricing,
  NovaStarsOrderRequest,
  NovaPremiumOrderRequest,
  NovaSteamTopupV2Request,
  NovaFragmentOrderResult,
  NovaBotOrderInfo,
  NovaProxyPricing,
  NovaProxyGbOption,
  NovaProxyOrderRequest,
  NovaVpnOrderRequest,
} from '../types'

interface NovaContextValue {
  client: NovaClient
  shop: NovaShop | null
  loading: boolean
  error: string | null
}

const NovaContext = createContext<NovaContextValue | null>(null)

interface NovaProviderProps {
  config?: NovaSDKConfig
  children: ReactNode
}

export function NovaProvider({ config = {}, children }: NovaProviderProps) {
  const [client] = useState(() => new NovaClient(config))
  const [shop, setShop] = useState<NovaShop | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    client.getShop().then((data) => {
      if (cancelled) return
      setShop(data)
      applyTheme(data)
    }).catch((e) => {
      if (cancelled) return
      setError(e instanceof Error ? e.message : 'Failed to load shop')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [client])

  return (
    <NovaContext.Provider value={{ client, shop, loading, error }}>
      {children}
    </NovaContext.Provider>
  )
}

function useNovaContext(): NovaContextValue {
  const ctx = useContext(NovaContext)
  if (!ctx) throw new Error('NovaHub SDK not installed. Wrap your app in <NovaProvider>.')
  return ctx
}

export function useShop() {
  const { shop, loading, error } = useNovaContext()
  return { shop, loading, error }
}

export function useProducts(category?: string) {
  const { client, shop } = useNovaContext()
  const [products, setProducts] = useState<NovaProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (cat?: string) => {
    if (!shop?.projectId) return

    setLoading(true)
    setError(null)
    try {
      const data = await client.getProducts(shop.projectId, cat ?? category)
      setProducts(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [client, shop?.projectId, category])

  useEffect(() => {
    if (shop?.projectId) load()
  }, [shop?.projectId])

  return { products, loading, error, reload: load }
}

export function useCategories() {
  const { client, shop } = useNovaContext()
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shop?.projectId) return
    let cancelled = false

    setLoading(true)
    client.getCategories(shop.projectId).then((data) => {
      if (!cancelled) setCategories(data)
    }).catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load categories')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [client, shop?.projectId])

  return { categories, loading, error }
}

export function useProduct(productId: string) {
  const { client, shop } = useNovaContext()
  const [product, setProduct] = useState<NovaProduct | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shop?.projectId) return
    let cancelled = false

    setLoading(true)
    client.getProduct(shop.projectId, productId).then((data) => {
      if (!cancelled) setProduct(data)
    }).catch((e) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load product')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [client, shop?.projectId, productId])

  return { product, loading, error }
}

export function useNova() {
  return useNovaContext().client
}

export function usePaymentMethods() {
  const { client, shop } = useNovaContext()
  const [methods, setMethods] = useState<NovaPaymentMethod[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!shop?.projectId) return
    let cancelled = false
    setLoading(true)
    client.getPaymentMethods(shop.projectId)
      .then((data) => { if (!cancelled) setMethods(data) })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load payment methods') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [client, shop?.projectId])

  return { methods, loading, error }
}

export function usePurchase() {
  const { client, shop } = useNovaContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<NovaPurchaseResult | null>(null)

  const purchase = useCallback(async (
    body: NovaPurchaseRequest,
    opts: NovaPurchaseOptions = {},
  ): Promise<NovaPurchaseResult> => {
    if (!shop?.projectId) throw new Error('Shop is not loaded yet')
    setLoading(true)
    setError(null)
    try {
      const r = await client.purchaseProduct(shop.projectId, body, opts)
      setResult(r)
      return r
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Purchase failed'
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [client, shop?.projectId])

  return { purchase, loading, error, result }
}

export function useVisitor() {
  const { shop } = useNovaContext()
  return shop?.visitor ?? null
}

export function usePreferences() {
  const { client } = useNovaContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = useCallback(async (prefs: NovaPreferences) => {
    setLoading(true)
    setError(null)
    try {
      return await client.setPreferences(prefs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set preferences')
      throw e
    } finally {
      setLoading(false)
    }
  }, [client])

  return { set, loading, error }
}

export function useOrder(orderId: string, options: { autoPoll?: boolean; intervalMs?: number } = {}) {
  const { client, shop } = useNovaContext()
  const [order, setOrder] = useState<NovaOrderStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!shop?.projectId) return null
    setLoading(true)
    setError(null)
    try {
      const r = await client.getOrder(shop.projectId, orderId)
      setOrder(r)
      return r
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load order')
      throw e
    } finally {
      setLoading(false)
    }
  }, [client, shop?.projectId, orderId])

  useEffect(() => {
    if (!shop?.projectId) return
    let cancelled = false
    const terminal = new Set(['COMPLETED', 'FAILED', 'CANCELLED'])
    const interval = Math.max(1000, options.intervalMs ?? 2500)

    if (options.autoPoll === false) {
      refresh().catch(() => undefined)
      return () => { cancelled = true }
    }

    ;(async () => {
      while (!cancelled) {
        try {
          const r = await client.getOrder(shop.projectId, orderId)
          if (cancelled) return
          setOrder(r)
          if (terminal.has(r.status)) return
        } catch (e) {
          if (cancelled) return
          setError(e instanceof Error ? e.message : 'Failed to load order')
        }
        await new Promise((res) => setTimeout(res, interval))
      }
    })()

    return () => { cancelled = true }
  }, [client, shop?.projectId, orderId])

  return { order, loading, error, refresh }
}

export type {
  NovaShop,
  NovaVisitor,
  NovaAttribution,
  NovaProduct,
  NovaSDKConfig,
  NovaPaymentMethod,
  NovaPaymentMethodId,
  NovaPurchaseRequest,
  NovaPurchaseOptions,
  NovaPurchaseResult,
  NovaPreferences,
  NovaOrderStatus,
  NovaOrderStatusValue,
  NovaOrderDelivery,
  NovaCustomer,
  NovaCustomerOrder,
  NovaSupportChat,
  NovaSupportMessage,
  NovaSupportChatStreamEvent,
  NovaSteamTopupRequest,
  NovaSteamTopupResult,
  NovaSteamPricing,
  NovaSteamCurrency,
  NovaSteamQuoteRate,
  NovaSteamTopupQuoteRequest,
  NovaTopupQuote,
  NovaSteamGame,
  NovaSteamGamesCatalog,
  NovaStarsPricing,
  NovaPremiumPricing,
  NovaStarsOrderRequest,
  NovaPremiumOrderRequest,
  NovaSteamTopupV2Request,
  NovaFragmentOrderResult,
  NovaBotOrderInfo,
  NovaProxyPricing,
  NovaProxyGbOption,
  NovaProxyOrderRequest,
  NovaVpnOrderRequest,
}
