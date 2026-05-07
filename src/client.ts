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
} from './types'
import { MOCK_SHOP, MOCK_PRODUCTS, MOCK_PAYMENT_METHODS } from './mock'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_\-]{16,128}$/
const PROJECT_KEY_RE = /^nv_pk_[A-Za-z0-9_\-]{8,128}$/
const OTP_RE = /^\d{4,8}$/
const MAX_QUANTITY = 99
const CUSTOMER_TOKEN_KEY = 'novahub:customer-token'

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

function loadStoredToken(projectId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(`${CUSTOMER_TOKEN_KEY}:${projectId}`)
  } catch {
    return null
  }
}

function persistToken(projectId: string, token: string | null) {
  if (typeof window === 'undefined') return
  try {
    const k = `${CUSTOMER_TOKEN_KEY}:${projectId}`
    if (token) window.localStorage.setItem(k, token)
    else window.localStorage.removeItem(k)
  } catch {
    /* ignore */
  }
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
  private projectKey: string | null
  private projectId: string | null
  private customerToken: string | null
  private checkoutToken: { token: string; exp: number } | null = null

  constructor(config: NovaSDKConfig = {}) {
    this.apiBase = (config.apiBase || '/api/storefront').replace(/\/+$/, '')
    this.devMode = config.devMode ?? this.detectDevMode()
    this.devShop = { ...MOCK_SHOP, ...config.devShop }
    this.devProducts = config.devProducts ?? MOCK_PRODUCTS
    this.devPaymentMethods = config.devPaymentMethods ?? MOCK_PAYMENT_METHODS
    this.credentials = config.credentials ?? 'include'
    this.projectKey = config.projectKey || null
    this.projectId = config.projectId || null
    this.customerToken = this.projectId ? loadStoredToken(this.projectId) : null

    if (this.projectKey && !PROJECT_KEY_RE.test(this.projectKey)) {
      throw new NovaError('Invalid projectKey format (expected nv_pk_…)', 400)
    }

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

  setProjectKey(key: string) {
    if (!PROJECT_KEY_RE.test(key)) throw new NovaError('Invalid projectKey', 400)
    this.projectKey = key
  }

  setProjectId(id: string) {
    if (!UUID_RE.test(id)) throw new NovaError('Invalid projectId', 400)
    this.projectId = id
    this.customerToken = loadStoredToken(id)
  }

  isAuthenticated(): boolean {
    return !!this.customerToken
  }

  getCustomerToken(): string | null {
    return this.customerToken
  }

  logout() {
    if (this.projectId) persistToken(this.projectId, null)
    this.customerToken = null
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    signal?: AbortSignal,
    opts: { withKey?: boolean; withCustomer?: boolean; withCheckout?: string } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...((init.headers as Record<string, string>) || {}),
    }
    if (opts.withKey) {
      if (!this.projectKey) throw new NovaError('projectKey is required', 400)
      headers['X-Project-Key'] = this.projectKey
    }
    if (opts.withCustomer) {
      if (!this.customerToken) throw new NovaError('Authentication required', 401)
      headers['Authorization'] = `Bearer ${this.customerToken}`
    }
    if (opts.withCheckout) {
      headers['X-Checkout-Token'] = opts.withCheckout
    }

    let response: Response
    try {
      response = await fetch(`${this.apiBase}${path}`, {
        ...init,
        signal: signal ?? init.signal,
        credentials: this.credentials,
        headers,
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
      if (response.status === 401 && opts.withCustomer) this.logout()
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
    const shop = await this.request<NovaShop & { publicKey?: string }>(
      `/shop?domain=${encodeURIComponent(host)}`,
    )
    if (shop?.projectId && !this.projectId) {
      this.projectId = shop.projectId
      this.customerToken = loadStoredToken(shop.projectId)
    }
    if (shop?.publicKey && !this.projectKey) {
      this.projectKey = shop.publicKey
    }
    return shop
  }

  async getProducts(projectId: string, category?: string): Promise<NovaProduct[]> {
    if (this.devMode) {
      const all = this.devProducts
      return category ? all.filter((p) => p.category === category) : all
    }
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    const params = category ? `?category=${encodeURIComponent(category)}` : ''
    return this.request<NovaProduct[]>(`/${projectId}/products${params}`, {}, undefined, {
      withKey: true,
    })
  }

  async getCategories(projectId: string): Promise<string[]> {
    if (this.devMode) return [...new Set(this.devProducts.map((p) => p.category))]
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    return this.request<string[]>(`/${projectId}/categories`, {}, undefined, { withKey: true })
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
      {},
      undefined,
      { withKey: true },
    )
  }

  async getPaymentMethods(projectId: string): Promise<NovaPaymentMethod[]> {
    if (this.devMode) return this.devPaymentMethods
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    return this.request<NovaPaymentMethod[]>(
      `/${projectId}/payment-methods`,
      {},
      undefined,
      { withKey: true },
    )
  }

  async setPreferences(prefs: NovaPreferences): Promise<{ ok: boolean } & NovaPreferences> {
    if (this.devMode) return { ok: true, ...prefs }
    return this.request(`/preferences`, {
      method: 'POST',
      body: JSON.stringify(prefs || {}),
    })
  }

  // ── Customer auth (email OTP) ────────────────────────────────────────
  async requestOtp(projectId: string, email: string): Promise<{ ok: true; throttleSeconds?: number }> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    if (!email || !EMAIL_RE.test(email)) throw new NovaError('Invalid email', 400)
    if (this.devMode) return { ok: true }
    return this.request(
      `/${projectId}/auth/request-otp`,
      { method: 'POST', body: JSON.stringify({ email }) },
      undefined,
      { withKey: true },
    )
  }

  async verifyOtp(projectId: string, email: string, code: string): Promise<NovaCustomer> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    if (!email || !EMAIL_RE.test(email)) throw new NovaError('Invalid email', 400)
    if (!OTP_RE.test(String(code || ''))) throw new NovaError('Invalid code', 400)

    if (this.devMode) {
      const customer: NovaCustomer = { id: 'dev-customer', email, token: 'dev-token' }
      this.customerToken = customer.token ?? null
      this.projectId = projectId
      persistToken(projectId, customer.token ?? null)
      return customer
    }

    const result = await this.request<NovaCustomer>(
      `/${projectId}/auth/verify-otp`,
      { method: 'POST', body: JSON.stringify({ email, code }) },
      undefined,
      { withKey: true },
    )
    if (result?.token) {
      this.customerToken = result.token
      this.projectId = projectId
      persistToken(projectId, result.token)
    }
    return result
  }

  async getCurrentCustomer(projectId: string): Promise<NovaCustomer> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    if (this.devMode) return { id: 'dev-customer', email: 'demo@example.com' }
    return this.request<NovaCustomer>(`/${projectId}/customer/me`, {}, undefined, {
      withKey: true,
      withCustomer: true,
    })
  }

  async getCustomerOrders(projectId: string): Promise<NovaCustomerOrder[]> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    if (this.devMode) return []
    return this.request<NovaCustomerOrder[]>(
      `/${projectId}/customer/orders`,
      {},
      undefined,
      { withKey: true, withCustomer: true },
    )
  }

  // ── Checkout token (anti-bot) ────────────────────────────────────────
  private async ensureCheckoutToken(projectId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    if (this.checkoutToken && this.checkoutToken.exp - 10 > now) return this.checkoutToken.token
    const r = await this.request<{ token: string; exp: number }>(
      `/${projectId}/checkout-token`,
      { method: 'POST', body: '{}' },
      undefined,
      { withKey: true },
    )
    this.checkoutToken = r
    return r.token
  }

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

    const checkoutToken = await this.ensureCheckoutToken(projectId)

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
      { withKey: true, withCheckout: checkoutToken },
    )
  }

  async getOrder(
    projectId: string,
    orderId: string,
    signal?: AbortSignal,
  ): Promise<NovaOrderStatus> {
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
      { withKey: true },
    )
  }

  async waitForOrder(
    projectId: string,
    orderId: string,
    opts: {
      intervalMs?: number
      timeoutMs?: number
      signal?: AbortSignal
      onUpdate?: (status: NovaOrderStatus) => void
    } = {},
  ): Promise<NovaOrderStatus> {
    const interval = Math.max(1000, opts.intervalMs ?? 2500)
    const timeout = Math.max(interval, opts.timeoutMs ?? 5 * 60 * 1000)
    const start = Date.now()
    const terminal = new Set(['COMPLETED', 'FAILED', 'CANCELLED'])

    while (true) {
      if (opts.signal?.aborted) throw new NovaError('Aborted', 0)
      const status = await this.getOrder(projectId, orderId, opts.signal)
      try {
        opts.onUpdate?.(status)
      } catch {
        /* ignore */
      }
      if (terminal.has(status.status)) return status
      if (Date.now() - start > timeout) return status
      await new Promise((r) => setTimeout(r, interval))
    }
  }

  // ── Support chat ─────────────────────────────────────────────────────
  async getSupportChat(orderId: string): Promise<NovaSupportChat> {
    if (!UUID_RE.test(orderId)) throw new NovaError('Invalid orderId', 400)
    if (this.devMode) {
      return { id: 'dev-chat', orderId, status: 'open', messages: [], rating: null }
    }
    return this.request<NovaSupportChat>(`/support-chat/${encodeURIComponent(orderId)}`)
  }

  async sendSupportMessage(chatId: string, text: string): Promise<NovaSupportMessage> {
    if (!UUID_RE.test(chatId)) throw new NovaError('Invalid chatId', 400)
    if (!text || typeof text !== 'string' || text.length > 4000) {
      throw new NovaError('Invalid message', 400)
    }
    if (this.devMode) {
      return { id: safeRandomId(), sender: 'customer', text, createdAt: new Date().toISOString() }
    }
    return this.request<NovaSupportMessage>(
      `/support-chat/${encodeURIComponent(chatId)}/message`,
      { method: 'POST', body: JSON.stringify({ text }) },
    )
  }

  async rateSupportChat(chatId: string, rating: number): Promise<{ ok: true }> {
    if (!UUID_RE.test(chatId)) throw new NovaError('Invalid chatId', 400)
    const r = Number(rating)
    if (!Number.isInteger(r) || r < 1 || r > 5) throw new NovaError('Rating must be 1..5', 400)
    if (this.devMode) return { ok: true }
    return this.request(
      `/support-chat/${encodeURIComponent(chatId)}/rate`,
      { method: 'POST', body: JSON.stringify({ rating: r }) },
    )
  }
}
