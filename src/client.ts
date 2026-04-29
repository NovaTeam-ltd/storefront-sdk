import type {
  NovaShop,
  NovaProduct,
  NovaSDKConfig,
  NovaPaymentMethod,
  NovaPurchaseRequest,
  NovaPurchaseOptions,
  NovaPurchaseResult,
  NovaPreferences,
} from './types'
import { MOCK_SHOP, MOCK_PRODUCTS, MOCK_PAYMENT_METHODS } from './mock'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_\-]{16,128}$/
const MAX_QUANTITY = 99

function safeRandomId(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    return (crypto as any).randomUUID().replace(/-/g, '')
  }
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2)
  ).slice(0, 32)
}

export class NovaError extends Error {
  status: number
  details?: unknown
  constructor(message: string, status = 0, details?: unknown) {
    super(message)
    this.name = 'NovaError'
    this.status = status
    this.details = details
  }
}

export class NovaClient {
  private apiBase: string
  private devMode: boolean
  private devShop: NovaShop
  private devProducts: NovaProduct[]
  private devPaymentMethods: NovaPaymentMethod[]
  private credentials: RequestCredentials

  constructor(config: NovaSDKConfig = {}) {
    this.apiBase = (config.apiBase || '/api/storefront').replace(/\/+$/, '')
    this.devMode = config.devMode ?? this.detectDevMode()
    this.devShop = { ...MOCK_SHOP, ...config.devShop }
    this.devProducts = config.devProducts ?? MOCK_PRODUCTS
    this.devPaymentMethods = config.devPaymentMethods ?? MOCK_PAYMENT_METHODS
    this.credentials = config.credentials ?? 'include'

    if (this.devMode && typeof console !== 'undefined') {
      console.info('[NovaHub SDK] Dev mode active — using mock data')
    }
  }

  private detectDevMode(): boolean {
    if (typeof window === 'undefined') return false
    const host = window.location.hostname
    return host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')
  }

  isDevMode(): boolean {
    return this.devMode
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    signal?: AbortSignal,
  ): Promise<T> {
    let response: Response
    try {
      response = await fetch(`${this.apiBase}${path}`, {
        ...init,
        signal: signal ?? init.signal,
        credentials: this.credentials,
        headers: {
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...(init.headers || {}),
        },
      })
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e
      throw new NovaError(`Network error: ${e?.message || 'unknown'}`, 0)
    }

    let payload: any = null
    const ct = response.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      try {
        payload = await response.json()
      } catch {
        /* ignore */
      }
    }

    if (!response.ok) {
      const msg =
        (payload && (payload.message || payload.error)) ||
        `${response.status} ${response.statusText}`
      throw new NovaError(
        Array.isArray(msg) ? msg.join(', ') : String(msg),
        response.status,
        payload,
      )
    }
    return (payload ?? ({} as T)) as T
  }

  async getShop(domain?: string): Promise<NovaShop> {
    if (this.devMode) return this.devShop

    const host = domain || (typeof window !== 'undefined' ? window.location.hostname : '')
    return this.request<NovaShop>(`/shop?domain=${encodeURIComponent(host)}`)
  }

  async getProducts(projectId: string, category?: string): Promise<NovaProduct[]> {
    if (this.devMode) {
      const all = this.devProducts
      return category ? all.filter((p) => p.category === category) : all
    }
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)

    const params = category ? `?category=${encodeURIComponent(category)}` : ''
    return this.request<NovaProduct[]>(`/${projectId}/products${params}`)
  }

  async getCategories(projectId: string): Promise<string[]> {
    if (this.devMode) return [...new Set(this.devProducts.map((p) => p.category))]
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    return this.request<string[]>(`/${projectId}/categories`)
  }

  async getProduct(projectId: string, productId: string): Promise<NovaProduct> {
    if (this.devMode) {
      const product = this.devProducts.find((p) => p.id === productId)
      if (!product) throw new NovaError('Product not found', 404)
      return product
    }
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    return this.request<NovaProduct>(
      `/${projectId}/products/${encodeURIComponent(productId)}`,
    )
  }

  async getPaymentMethods(projectId: string): Promise<NovaPaymentMethod[]> {
    if (this.devMode) return this.devPaymentMethods
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    return this.request<NovaPaymentMethod[]>(`/${projectId}/payment-methods`)
  }

  async setPreferences(
    prefs: NovaPreferences,
  ): Promise<{ ok: boolean } & NovaPreferences> {
    if (this.devMode) return { ok: true, ...prefs }
    return this.request(`/preferences`, {
      method: 'POST',
      body: JSON.stringify(prefs || {}),
    })
  }

  /**
   * Creates a server-side order for a product and returns a `payUrl` to redirect to.
   *
   * Security:
   *  - All inputs are validated client-side AND re-validated server-side.
   *  - Price is computed server-side from the product record — never trusted from the client.
   *  - Stock and payment-method whitelist are enforced server-side.
   *  - Each call sends an `Idempotency-Key` header so retries don't create duplicate orders.
   */
  async purchaseProduct(
    projectId: string,
    body: NovaPurchaseRequest,
    opts: NovaPurchaseOptions = {},
  ): Promise<NovaPurchaseResult> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    if (!body || !UUID_RE.test(body.productId || '')) {
      throw new NovaError('Invalid productId', 400)
    }
    const quantity = Number(body.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new NovaError(`quantity must be an integer 1..${MAX_QUANTITY}`, 400)
    }
    if (!body.paymentMethod || typeof body.paymentMethod !== 'string') {
      throw new NovaError('paymentMethod is required', 400)
    }
    if (body.email && !EMAIL_RE.test(body.email)) {
      throw new NovaError('Invalid email', 400)
    }

    const idempotencyKey = opts.idempotencyKey || safeRandomId()
    if (!IDEMPOTENCY_KEY_RE.test(idempotencyKey)) {
      throw new NovaError('Invalid idempotencyKey', 400)
    }

    if (this.devMode) {
      const product = this.devProducts.find((p) => p.id === body.productId)
      if (!product) throw new NovaError('Product not found', 404)
      const totalRub = Math.ceil(product.price * quantity)
      return {
        orderId: `dev-${safeRandomId().slice(0, 12)}`,
        payUrl: 'https://example.com/pay/dev',
        paymentMethod: body.paymentMethod,
        totalRub,
        totalPay: totalRub,
        currency: this.devShop.currency,
      }
    }

    return this.request<NovaPurchaseResult>(
      `/${projectId}/orders`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          productId: body.productId,
          quantity,
          paymentMethod: body.paymentMethod,
          email: body.email,
          customerInfo: body.customerInfo,
        }),
      },
      opts.signal,
    )
  }

  /**
   * Returns sanitized status of a storefront order.
   * After payment, polling this endpoint reveals when delivery has been completed
   * and (for digital auto-delivery) the delivered content.
   */
  async getOrder(
    projectId: string,
    orderId: string,
    signal?: AbortSignal,
  ): Promise<import('./types').NovaOrderStatus> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    if (!UUID_RE.test(orderId)) throw new NovaError('Invalid orderId', 400)

    if (this.devMode) {
      return {
        orderId,
        status: 'COMPLETED',
        totalRub: 0,
        totalPay: 0,
        productId: undefined,
        productName: 'Demo product',
        quantity: 1,
        paymentMethod: 'cryptobot',
        createdAt: new Date().toISOString(),
        delivery: {
          type: 'auto',
          manual: false,
          content: 'DEMO-XXXX-YYYY-ZZZZ',
          deliveredAt: new Date().toISOString(),
        },
      }
    }

    return this.request(
      `/${projectId}/orders/${encodeURIComponent(orderId)}`,
      { method: 'GET' },
      signal,
    )
  }

  /**
   * Polls the order until it reaches a terminal status (COMPLETED / FAILED / CANCELLED)
   * or the timeout is reached. Designed for the post-redirect "thank-you" page.
   */
  async waitForOrder(
    projectId: string,
    orderId: string,
    opts: {
      intervalMs?: number
      timeoutMs?: number
      signal?: AbortSignal
      onUpdate?: (status: import('./types').NovaOrderStatus) => void
    } = {},
  ): Promise<import('./types').NovaOrderStatus> {
    const interval = Math.max(1000, opts.intervalMs ?? 2500)
    const timeout = Math.max(interval, opts.timeoutMs ?? 5 * 60 * 1000)
    const start = Date.now()
    const terminal = new Set(['COMPLETED', 'FAILED', 'CANCELLED'])

    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (opts.signal?.aborted) throw new NovaError('Aborted', 0)
      const status = await this.getOrder(projectId, orderId, opts.signal)
      try {
        opts.onUpdate?.(status)
      } catch {
        /* ignore listener errors */
      }
      if (terminal.has(status.status)) return status
      if (Date.now() - start > timeout) return status
      await new Promise((r) => setTimeout(r, interval))
    }
  }
}
