import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { NovaClient, applyTheme } from '../index'
import type { NovaShop, NovaProduct, NovaSDKConfig } from '../types'

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

export type { NovaShop, NovaProduct, NovaSDKConfig }
