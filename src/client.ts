import type {
  NovaShop,
  NovaAttribution,
  NovaProduct,
  NovaSDKConfig,
  NovaTrackMeta,
  NovaTrackType,
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
  NovaSupportChatStreamEvent,
  NovaStarsPricing,
  NovaPremiumPricing,
  NovaSteamPricing,
  NovaSteamCurrency,
  NovaSteamTopupQuoteRequest,
  NovaTopupQuote,
  NovaSteamGamesCatalog,
  NovaStarsOrderRequest,
  NovaPremiumOrderRequest,
  NovaSteamTopupV2Request,
  NovaFragmentOrderResult,
  NovaBotOrderInfo,
} from './types'
import { MOCK_SHOP, MOCK_PRODUCTS, MOCK_PAYMENT_METHODS } from './mock'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_\-]{16,128}$/
const PROJECT_KEY_RE = /^nv_pk_[A-Za-z0-9_\-]{8,128}$/
const OTP_RE = /^\d{4,8}$/
const STEAM_LOGIN_RE = /^[A-Za-z0-9_\-.]{2,64}$/
const MAX_QUANTITY = 99
const CUSTOMER_TOKEN_KEY = 'novahub:customer-token'
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const
const CLICK_ID_KEYS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid', 'yclid', 'msclkid'] as const
const STEAM_CURRENCIES = ['RUB', 'KZT', 'UAH'] as const
const DEV_STEAM_RUB_PER_UNIT: Record<string, number> = { RUB: 1, KZT: 0.21, UAH: 2.2 }

export function quoteStarsFromRub(
  pricing: NovaStarsPricing | null | undefined,
  amountRub: number,
): {
  quantity: number
  chargeRub: number
  remainingRub: number
  valid: boolean
  minChargeRub: number
  maxChargeRub: number
  pricePerStar: number
} {
  const pricePerStar = Number(pricing?.pricePerStar || 1.5)
  const min = Number(pricing?.min || 50)
  const max = Number(pricing?.max || 1000000)
  const budget = Math.floor(Number(amountRub || 0))
  const minChargeRub = pricePerStar > 0 ? Math.ceil(min * pricePerStar) : 0
  const maxChargeRub = pricePerStar > 0 ? Math.ceil(max * pricePerStar) : 0
  if (!pricePerStar || !Number.isFinite(budget) || budget < minChargeRub) {
    return {
      quantity: 0,
      chargeRub: 0,
      remainingRub: Math.max(0, budget || 0),
      valid: false,
      minChargeRub,
      maxChargeRub,
      pricePerStar,
    }
  }
  const quantity = Math.min(max, Math.floor(budget / pricePerStar))
  const chargeRub = Math.ceil(quantity * pricePerStar)
  return {
    quantity,
    chargeRub,
    remainingRub: Math.max(0, budget - chargeRub),
    valid: quantity >= min && chargeRub <= budget,
    minChargeRub,
    maxChargeRub,
    pricePerStar,
  }
}

function steamChargeRub(receiveAmount: number, rubPerUnit: number, markupFactor: number) {
  return Math.ceil(Math.ceil(receiveAmount * rubPerUnit) * markupFactor)
}

export function quoteSteamTopupFromRub(
  pricing: NovaSteamPricing | null | undefined,
  amountRub: number,
  currency: NovaSteamCurrency = 'RUB',
): NovaTopupQuote {
  const cur = ((currency || 'RUB') as string).toUpperCase() as NovaSteamCurrency
  if (!(STEAM_CURRENCIES as readonly string[]).includes(cur)) {
    throw new NovaError('Unsupported currency', 400)
  }

  const budgetRub = Math.floor(Number(amountRub || 0))
  const minReceive = Number(pricing?.min?.[cur] ?? 0)
  const maxReceive = Number(pricing?.max?.[cur] ?? 0)
  const rate = pricing?.quoteRates?.[cur]
  const rubPerUnit = Number(rate?.rubPerUnit || DEV_STEAM_RUB_PER_UNIT[cur] || 1)
  const markupFactor = Number(rate?.markupFactor || (1 + Number(pricing?.steamMarkup || 0) / 100))
  const minChargeRub = Number(rate?.minChargeRub || steamChargeRub(minReceive, rubPerUnit, markupFactor))
  const maxChargeRub = Number(rate?.maxChargeRub || steamChargeRub(maxReceive, rubPerUnit, markupFactor))

  if (!Number.isFinite(budgetRub) || budgetRub < 0 || !rubPerUnit || !markupFactor || maxReceive <= 0) {
    return {
      receiveAmount: 0,
      receiveCurrency: cur,
      chargeRub: 0,
      remainingRub: Math.max(0, budgetRub || 0),
      valid: false,
      minChargeRub,
      maxChargeRub,
    }
  }

  let receiveAmount = Math.min(maxReceive, Math.floor(budgetRub / Math.max(rubPerUnit * markupFactor, 0.0001)))
  while (receiveAmount > 0 && steamChargeRub(receiveAmount, rubPerUnit, markupFactor) > budgetRub) {
    receiveAmount -= 1
  }
  const chargeRub = receiveAmount > 0 ? steamChargeRub(receiveAmount, rubPerUnit, markupFactor) : 0

  return {
    receiveAmount,
    receiveCurrency: cur,
    chargeRub,
    remainingRub: Math.max(0, budgetRub - chargeRub),
    valid: receiveAmount >= minReceive && chargeRub <= budgetRub,
    minChargeRub,
    maxChargeRub,
  }
}

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

function browserPath(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

function appendBrowserAttribution(params: URLSearchParams) {
  if (typeof window === 'undefined') return
  const current = new URLSearchParams(window.location.search)
  params.set('landingPath', browserPath() || '/')
  if (document.referrer) params.set('referrer', document.referrer)
  for (const key of UTM_KEYS) {
    const value = current.get(key)
    if (value) params.set(key, value)
  }
  for (const key of CLICK_ID_KEYS) {
    const value = current.get(key)
    if (value) params.set(key, value)
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
  private visitorId: string | null = null
  private attribution: NovaAttribution | null = null
  private pageviews = new Set<string>()

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
    baseOverride?: string,
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
      response = await fetch(`${baseOverride || this.apiBase}${path}`, {
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
    const params = new URLSearchParams({ domain: host })
    appendBrowserAttribution(params)
    const shop = await this.request<NovaShop & { publicKey?: string }>(
      `/shop?${params.toString()}`,
    )
    if (shop?.projectId && !this.projectId) {
      this.projectId = shop.projectId
      this.customerToken = loadStoredToken(shop.projectId)
    }
    if (shop?.publicKey && !this.projectKey) {
      this.projectKey = shop.publicKey
    }
    this.visitorId = shop.visitor?.id || null
    this.attribution = shop.visitor?.attribution || null
    this.trackInitialPageview(shop)
    return shop
  }

  private trackInitialPageview(shop: NovaShop) {
    if (!shop?.projectId || typeof window === 'undefined') return
    const path = browserPath() || '/'
    const key = `${shop.projectId}:${path}`
    if (this.pageviews.has(key)) return
    this.pageviews.add(key)
    this.track('pageview', { projectId: shop.projectId, path, referrer: document.referrer }).catch(() => {})
  }

  async track(type: NovaTrackType, meta: NovaTrackMeta = {}): Promise<{ ok: boolean }> {
    if (this.devMode) return { ok: true }
    const projectId = meta.projectId || this.projectId
    if (!projectId || !UUID_RE.test(projectId)) throw new NovaError('projectId is required for analytics', 400)
    const path = meta.path || browserPath()
    const referrer = meta.referrer || (typeof document !== 'undefined' ? document.referrer : undefined)
    const base = this.apiBase.replace(/\/storefront$/, '')
    const attribution = this.attribution || {}
    return this.request<{ ok: boolean }>(
      `/analytics/track`,
      {
        method: 'POST',
        body: JSON.stringify({
          ...meta,
          projectId,
          type,
          path,
          referrer,
          visitorId: this.visitorId || undefined,
          firstAttributionId: attribution.firstAttributionId || undefined,
          attributionId: attribution.attributionId || attribution.id || undefined,
        }),
      },
      undefined,
      {},
      base,
    )
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

  // ── Steam top-up ─────────────────────────────────────────────────────
  /**
   * Create a Steam wallet top-up order. Mirrors the Telegram bot flow:
   * `login` is the buyer's Steam login (NOT a nickname), `amount` is the RUB
   * amount that should land on the wallet (the platform adds its markup on top).
   * Returns a CryptoBot pay URL the caller must redirect to.
   */
  async purchaseSteamTopup(
    projectId: string,
    body: NovaSteamTopupRequest,
  ): Promise<NovaSteamTopupResult> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    const login = String(body?.login || '').trim()
    if (!STEAM_LOGIN_RE.test(login)) {
      throw new NovaError('Invalid Steam login', 400)
    }
    const amount = Number(body?.amount)
    if (!Number.isFinite(amount) || amount < 50 || amount > 100000) {
      throw new NovaError('Amount must be between 50 and 100000', 400)
    }
    const region = body?.region ? String(body.region).slice(0, 32) : undefined
    const email = body?.email?.trim() || undefined
    if (email && !EMAIL_RE.test(email)) throw new NovaError('Invalid email', 400)

    if (this.devMode) {
      return {
        orderId: `dev-${safeRandomId().slice(0, 12)}`,
        payUrl: 'https://example.com/pay/dev',
        totalPay: Math.ceil(amount * 1.1),
      }
    }

    const checkoutToken = await this.ensureCheckoutToken(projectId)
    return this.request<NovaSteamTopupResult>(
      `/${projectId}/steam-topup`,
      {
        method: 'POST',
        body: JSON.stringify({ login, amount, region, email }),
      },
      undefined,
      { withKey: true, withCheckout: checkoutToken },
    )
  }

  // ── Telegram Stars / Premium / Steam V2 (multi-PSP) ─────────────────

  async getStarsPricing(projectId: string): Promise<NovaStarsPricing> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    if (this.devMode) {
      return {
        pricePerStar: 1.5, currency: 'RUB', min: 50, max: 1000000,
        packages: [50, 100, 250, 500, 1000, 2500].map(qty => ({ qty, priceRub: Math.ceil(qty * 1.5) })),
        paymentMethods: this.devPaymentMethods,
      }
    }
    return this.request<NovaStarsPricing>(`/${projectId}/stars-pricing`, {}, undefined, { withKey: true })
  }

  async getPremiumPricing(projectId: string): Promise<NovaPremiumPricing> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    if (this.devMode) {
      return {
        plans: [
          { months: 3, priceRub: 990, perMonthRub: 330 },
          { months: 6, priceRub: 1790, perMonthRub: 298 },
          { months: 12, priceRub: 2990, perMonthRub: 249 },
        ],
        currency: 'RUB',
        paymentMethods: this.devPaymentMethods,
      }
    }
    return this.request<NovaPremiumPricing>(`/${projectId}/premium-pricing`, {}, undefined, { withKey: true })
  }

  async getSteamPricing(projectId: string): Promise<NovaSteamPricing> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    if (this.devMode) {
      const markupFactor = 1
      return {
        currencies: ['RUB', 'KZT', 'UAH'],
        min: { RUB: 100, KZT: 500, UAH: 50 },
        max: { RUB: 100000, KZT: 500000, UAH: 50000 },
        steamMarkup: 0,
        quoteRates: {
          RUB: {
            rubPerUnit: DEV_STEAM_RUB_PER_UNIT.RUB,
            markupFactor,
            minChargeRub: steamChargeRub(100, DEV_STEAM_RUB_PER_UNIT.RUB, markupFactor),
            maxChargeRub: steamChargeRub(100000, DEV_STEAM_RUB_PER_UNIT.RUB, markupFactor),
          },
          KZT: {
            rubPerUnit: DEV_STEAM_RUB_PER_UNIT.KZT,
            markupFactor,
            minChargeRub: steamChargeRub(500, DEV_STEAM_RUB_PER_UNIT.KZT, markupFactor),
            maxChargeRub: steamChargeRub(500000, DEV_STEAM_RUB_PER_UNIT.KZT, markupFactor),
          },
          UAH: {
            rubPerUnit: DEV_STEAM_RUB_PER_UNIT.UAH,
            markupFactor,
            minChargeRub: steamChargeRub(50, DEV_STEAM_RUB_PER_UNIT.UAH, markupFactor),
            maxChargeRub: steamChargeRub(50000, DEV_STEAM_RUB_PER_UNIT.UAH, markupFactor),
          },
        },
        paymentMethods: this.devPaymentMethods,
      }
    }
    return this.request<NovaSteamPricing>(`/${projectId}/steam-pricing`, {}, undefined, { withKey: true })
  }

  async quoteSteamTopup(
    projectId: string,
    body: NovaSteamTopupQuoteRequest,
  ): Promise<NovaTopupQuote> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    const amountRub = Math.floor(Number(body?.amountRub || 0))
    if (!Number.isFinite(amountRub) || amountRub < 0) {
      throw new NovaError('amountRub must be a positive number', 400)
    }
    const currency = String(body?.currency || 'RUB').toUpperCase()
    if (!(STEAM_CURRENCIES as readonly string[]).includes(currency)) {
      throw new NovaError('Unsupported currency', 400)
    }

    if (this.devMode) {
      const pricing = await this.getSteamPricing(projectId)
      return quoteSteamTopupFromRub(pricing, amountRub, currency as NovaSteamCurrency)
    }

    return this.request<NovaTopupQuote>(
      `/${projectId}/steam-topup-quote`,
      {
        method: 'POST',
        body: JSON.stringify({ amountRub, currency }),
      },
      undefined,
      { withKey: true },
    )
  }

  async getSteamGames(projectId: string, opts: { limit?: number; q?: string } = {}): Promise<NovaSteamGamesCatalog> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    const params = new URLSearchParams()
    if (opts.limit) params.set('limit', String(opts.limit))
    if (opts.q) params.set('q', String(opts.q))
    const qs = params.toString()
    if (this.devMode) {
      return {
        items: [
          { serviceId: 9001, name: 'Counter-Strike 2 (Prime)', category: 'Valve', image: null, priceRub: 1490, stock: 99 },
          { serviceId: 9002, name: 'Dota 2 — Battle Pass', category: 'Valve', image: null, priceRub: 990, stock: 50 },
          { serviceId: 9003, name: 'Cyberpunk 2077', category: 'CD Projekt', image: null, priceRub: 2790, stock: 12 },
        ],
        total: 3,
      }
    }
    return this.request<NovaSteamGamesCatalog>(
      `/${projectId}/steam-games${qs ? `?${qs}` : ''}`,
      {},
      undefined,
      { withKey: true },
    )
  }

  private validateUsername(username: string): string {
    const u = String(username || '').replace(/^@/, '').trim()
    if (!/^[A-Za-z0-9_]{5,32}$/.test(u)) throw new NovaError('Invalid Telegram username (5–32 chars, A-Z 0-9 _)', 400)
    return u
  }

  async purchaseStars(projectId: string, body: NovaStarsOrderRequest): Promise<NovaFragmentOrderResult> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    const username = this.validateUsername(body?.username || '')
    const quantity = Number(body?.quantity)
    if (!Number.isInteger(quantity) || quantity < 50) throw new NovaError('Quantity must be ≥ 50', 400)
    if (!body?.paymentMethod) throw new NovaError('paymentMethod is required', 400)
    if (body?.email && !EMAIL_RE.test(body.email)) throw new NovaError('Invalid email', 400)

    if (this.devMode) {
      return {
        orderId: `dev-${safeRandomId().slice(0, 12)}`, externalOrderId: 'DEV',
        payUrl: 'https://example.com/pay/dev', paymentMethod: body.paymentMethod,
        totalRub: Math.ceil(quantity * 1.5), totalPay: Math.ceil(quantity * 1.5), currency: 'RUB',
      }
    }
    const checkoutToken = await this.ensureCheckoutToken(projectId)
    return this.request<NovaFragmentOrderResult>(
      `/${projectId}/stars-order`,
      { method: 'POST', body: JSON.stringify({ username, quantity, paymentMethod: body.paymentMethod, email: body.email }) },
      undefined,
      { withKey: true, withCheckout: checkoutToken },
    )
  }

  async purchasePremium(projectId: string, body: NovaPremiumOrderRequest): Promise<NovaFragmentOrderResult> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    const username = this.validateUsername(body?.username || '')
    const months = Number(body?.months)
    if (![3, 6, 12].includes(months)) throw new NovaError('Months must be 3, 6 or 12', 400)
    if (!body?.paymentMethod) throw new NovaError('paymentMethod is required', 400)
    if (body?.email && !EMAIL_RE.test(body.email)) throw new NovaError('Invalid email', 400)

    if (this.devMode) {
      return {
        orderId: `dev-${safeRandomId().slice(0, 12)}`, externalOrderId: 'DEV',
        payUrl: 'https://example.com/pay/dev', paymentMethod: body.paymentMethod,
        totalRub: 990, totalPay: 990, currency: 'RUB',
      }
    }
    const checkoutToken = await this.ensureCheckoutToken(projectId)
    return this.request<NovaFragmentOrderResult>(
      `/${projectId}/premium-order`,
      { method: 'POST', body: JSON.stringify({ username, months, paymentMethod: body.paymentMethod, email: body.email }) },
      undefined,
      { withKey: true, withCheckout: checkoutToken },
    )
  }

  async purchaseSteamTopupV2(projectId: string, body: NovaSteamTopupV2Request): Promise<NovaFragmentOrderResult> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    const login = String(body?.login || '').trim()
    if (!STEAM_LOGIN_RE.test(login)) throw new NovaError('Invalid Steam login', 400)
    const amount = Number(body?.amount)
    if (!Number.isFinite(amount) || amount <= 0) throw new NovaError('Invalid amount', 400)
    if (!body?.paymentMethod) throw new NovaError('paymentMethod is required', 400)
    const currency = (body?.currency || 'RUB').toUpperCase()
    if (!['RUB', 'KZT', 'UAH'].includes(currency)) throw new NovaError('Unsupported currency', 400)
    if (body?.email && !EMAIL_RE.test(body.email)) throw new NovaError('Invalid email', 400)

    if (this.devMode) {
      return {
        orderId: `dev-${safeRandomId().slice(0, 12)}`, externalOrderId: 'DEV',
        payUrl: 'https://example.com/pay/dev', paymentMethod: body.paymentMethod,
        totalRub: Math.ceil(amount), totalPay: Math.ceil(amount), currency: 'RUB',
      }
    }
    const checkoutToken = await this.ensureCheckoutToken(projectId)
    return this.request<NovaFragmentOrderResult>(
      `/${projectId}/steam-topup-v2`,
      {
        method: 'POST',
        body: JSON.stringify({ login, amount, currency, paymentMethod: body.paymentMethod, email: body.email }),
      },
      undefined,
      { withKey: true, withCheckout: checkoutToken },
    )
  }

  async getBotOrder(projectId: string, orderId: string, signal?: AbortSignal): Promise<NovaBotOrderInfo> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    if (!UUID_RE.test(orderId)) throw new NovaError('Invalid orderId', 400)
    if (this.devMode) {
      return {
        orderId, externalOrderId: 'DEV', kind: 'stars', status: 'completed',
        productName: '500 Telegram Stars', totalRub: 750, paymentMethod: 'cryptobot',
        createdAt: new Date().toISOString(),
        details: { username: 'demo', login: null, months: null, currency: null, originalAmount: null, txHash: '0xDEMO', error: null, deliveredAt: new Date().toISOString() },
      }
    }
    return this.request<NovaBotOrderInfo>(
      `/${projectId}/bot-orders/${encodeURIComponent(orderId)}`,
      { method: 'GET' }, signal, { withKey: true },
    )
  }

  async waitForBotOrder(
    projectId: string, orderId: string,
    opts: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal; onUpdate?: (s: NovaBotOrderInfo) => void } = {},
  ): Promise<NovaBotOrderInfo> {
    const interval = Math.max(1000, opts.intervalMs ?? 3000)
    const timeout = Math.max(interval, opts.timeoutMs ?? 10 * 60 * 1000)
    const start = Date.now()
    const terminal = new Set<NovaBotOrderInfo['status']>(['completed', 'failed', 'cancelled'])
    while (true) {
      if (opts.signal?.aborted) throw new NovaError('Aborted', 0)
      const s = await this.getBotOrder(projectId, orderId, opts.signal)
      try { opts.onUpdate?.(s) } catch {}
      if (terminal.has(s.status)) return s
      if (Date.now() - start > timeout) return s
      await new Promise(r => setTimeout(r, interval))
    }
  }

  // ── Proxy / VPN ──────────────────────────────────────────────────────
  async getProxyPricing(projectId: string): Promise<NovaProxyPricing> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    if (this.devMode) {
      return {
        proxy: { datacenter: { gbOptions: [{ gb: 1, priceRub: 90, priceUsd: 1 }] } },
        vpn: [{ durationDays: 30, priceRub: 297 }],
        countries: [{ code: 'US', name: 'United States', flag: '🇺🇸' }],
        gbOptions: [1, 5, 10, 25, 50, 100],
      }
    }
    return this.request<NovaProxyPricing>(`/${projectId}/proxy/pricing`, {}, undefined, {
      withKey: true,
    })
  }

  async createProxyOrder(
    projectId: string,
    body: NovaProxyOrderRequest,
  ): Promise<{ id: string; priceRub: number; status: string } & Record<string, any>> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    const proxyType = String(body?.proxyType || '').trim()
    if (!/^[a-z]{3,32}$/.test(proxyType)) throw new NovaError('Invalid proxyType', 400)
    const gb = Number(body?.gbAmount)
    if (!Number.isInteger(gb) || gb < 1 || gb > 10000) {
      throw new NovaError('gbAmount must be 1..10000', 400)
    }
    const country = body?.country ? String(body.country).slice(0, 8).toUpperCase() : undefined
    const email = body?.email?.trim() || undefined
    if (email && !EMAIL_RE.test(email)) throw new NovaError('Invalid email', 400)

    if (this.devMode) {
      return { id: `dev-${safeRandomId().slice(0, 8)}`, priceRub: gb * 90, status: 'pending' }
    }
    const checkoutToken = await this.ensureCheckoutToken(projectId)
    return this.request(
      `/${projectId}/proxy/order`,
      {
        method: 'POST',
        body: JSON.stringify({ proxyType, gbAmount: gb, country, email, paymentMethod: body?.paymentMethod }),
      },
      undefined,
      { withKey: true, withCheckout: checkoutToken },
    )
  }

  async createVpnOrder(
    projectId: string,
    body: NovaVpnOrderRequest,
  ): Promise<{ id: string; priceRub: number; status: string } & Record<string, any>> {
    if (!UUID_RE.test(projectId)) throw new NovaError('Invalid projectId', 400)
    const days = Number(body?.durationDays)
    if (!Number.isInteger(days) || days < 1 || days > 730) {
      throw new NovaError('durationDays must be 1..730', 400)
    }
    const email = body?.email?.trim() || undefined
    if (email && !EMAIL_RE.test(email)) throw new NovaError('Invalid email', 400)
    if (this.devMode) {
      return { id: `dev-${safeRandomId().slice(0, 8)}`, priceRub: days === 1 ? 0 : 297, status: 'active' }
    }
    const checkoutToken = await this.ensureCheckoutToken(projectId)
    return this.request(
      `/${projectId}/vpn/order`,
      {
        method: 'POST',
        body: JSON.stringify({ durationDays: days, email, paymentMethod: body?.paymentMethod }),
      },
      undefined,
      { withKey: true, withCheckout: checkoutToken },
    )
  }

  // ── Support chat ─────────────────────────────────────────────────────
  async getSupportChat(orderId: string): Promise<NovaSupportChat> {
    if (!UUID_RE.test(orderId)) throw new NovaError('Invalid orderId', 400)
    if (!this.projectId) throw new NovaError('projectId is required', 400)
    if (this.devMode) {
      return { id: 'dev-chat', orderId, status: 'open', messages: [], rating: null, supportToken: 'dev-token' }
    }
    return this.request<NovaSupportChat>(
      `/${this.projectId}/support-chat/${encodeURIComponent(orderId)}`,
      {},
      undefined,
      { withKey: true },
    )
  }

  /**
   * Subscribe to realtime support-chat events via Server-Sent Events.
   * Returns a function that closes the stream. Falls back to a no-op in
   * environments without `EventSource` (e.g. SSR / dev mode).
   */
  streamSupportChat(
    chatId: string,
    listeners: {
      onEvent?: (event: NovaSupportChatStreamEvent) => void
      onMessage?: (message: NovaSupportMessage) => void
      onStatus?: (status: string, rating?: number | null) => void
      onOpen?: () => void
      onError?: (err: Event | Error) => void
    } = {},
    supportToken?: string,
  ): () => void {
    if (!UUID_RE.test(chatId)) throw new NovaError('Invalid chatId', 400)
    if (this.devMode || typeof window === 'undefined' || typeof (window as any).EventSource === 'undefined') {
      return () => {}
    }
    if (!this.projectId) throw new NovaError('projectId is required', 400)
    if (!this.projectKey) throw new NovaError('projectKey is required', 400)
    if (!supportToken) throw new NovaError('supportToken is required', 401)
    const params = new URLSearchParams({
      projectKey: this.projectKey,
      supportToken,
    })
    const url = `${this.apiBase}/${this.projectId}/support-chat/${encodeURIComponent(chatId)}/stream?${params.toString()}`
    const es = new (window as any).EventSource(url, {
      withCredentials: this.credentials === 'include',
    }) as EventSource
    es.onopen = () => listeners.onOpen?.()
    es.onerror = (e) => listeners.onError?.(e)
    es.onmessage = (msg: MessageEvent) => {
      let data: NovaSupportChatStreamEvent | null = null
      try { data = JSON.parse(msg.data as string) } catch { return }
      if (!data) return
      listeners.onEvent?.(data)
      if (data.type === 'message') listeners.onMessage?.(data.message)
      else if (data.type === 'status') listeners.onStatus?.(data.status, data.rating)
    }
    return () => {
      try { es.close() } catch { /* ignore */ }
    }
  }

  async sendSupportMessage(chatId: string, text: string, supportToken?: string): Promise<NovaSupportMessage> {
    if (!UUID_RE.test(chatId)) throw new NovaError('Invalid chatId', 400)
    if (!this.projectId) throw new NovaError('projectId is required', 400)
    if (!text || typeof text !== 'string' || text.length > 4000) {
      throw new NovaError('Invalid message', 400)
    }
    if (this.devMode) {
      return { id: safeRandomId(), sender: 'customer', text, createdAt: new Date().toISOString() }
    }
    if (!supportToken) throw new NovaError('supportToken is required', 401)
    return this.request<NovaSupportMessage>(
      `/${this.projectId}/support-chat/${encodeURIComponent(chatId)}/message`,
      {
        method: 'POST',
        headers: { 'X-Support-Chat-Token': supportToken },
        body: JSON.stringify({ text }),
      },
      undefined,
      { withKey: true },
    )
  }

  async rateSupportChat(chatId: string, rating: number, supportToken?: string): Promise<{ ok: true }> {
    if (!UUID_RE.test(chatId)) throw new NovaError('Invalid chatId', 400)
    if (!this.projectId) throw new NovaError('projectId is required', 400)
    const r = Number(rating)
    if (!Number.isInteger(r) || r < 1 || r > 5) throw new NovaError('Rating must be 1..5', 400)
    if (this.devMode) return { ok: true }
    if (!supportToken) throw new NovaError('supportToken is required', 401)
    return this.request(
      `/${this.projectId}/support-chat/${encodeURIComponent(chatId)}/rate`,
      {
        method: 'POST',
        headers: { 'X-Support-Chat-Token': supportToken },
        body: JSON.stringify({ rating: r }),
      },
      undefined,
      { withKey: true },
    )
  }
}
