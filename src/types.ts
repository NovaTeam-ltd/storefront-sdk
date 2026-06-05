export type NovaPaymentMethodId = 'cryptobot' | 'heleket' | 'lolz' | (string & {})

export interface NovaAttribution {
  id?: string
  firstAttributionId?: string | null
  attributionId?: string | null
  source?: string | null
  medium?: string | null
  campaign?: string | null
  term?: string | null
  content?: string | null
  landingPath?: string | null
  referrer?: string | null
  clickIds?: Record<string, string> | null
  createdAt?: string | Date
}

export interface NovaVisitor {
  /** Stable per-browser id stored in HttpOnly cookie. */
  id: string
  /** Hashed UA + Accept-Language + IP — for analytics, not auth. */
  fingerprint: string
  /** Effective locale: cookie > Accept-Language > project default. */
  locale: string
  /** Effective currency: cookie override or project default. */
  currency: string
  /** UI theme preference. */
  theme: 'auto' | 'light' | 'dark'
  defaultLocale: string
  defaultCurrency: string
  attribution?: NovaAttribution | null
}

export interface NovaShop {
  projectId: string
  /** Public key (`nv_pk_…`) — аутентификация запросов SDK к storefront API. */
  publicKey?: string
  name: string
  template: string
  primaryColor: string
  currency: string
  seoTitle: string
  seoDescription: string
  status: string
  favicon?: string | null
  manifestName?: string | null
  locale?: string
  ogImage?: string | null
  enabledPaymentMethods?: NovaPaymentMethodId[]
  /** Web analytics tags (GA4, Yandex Metrika, FB Pixel, VK, TikTok). */
  analytics?: {
    gaTrackingId?: string | null
    ymCounterId?: string | null
    fbPixelId?: string | null
    vkPixelId?: string | null
    tiktokPixelId?: string | null
  }
  visitor?: NovaVisitor
}

export interface NovaProduct {
  id: string
  name: string
  price: number
  category: string
  image: string | null
  deliveryType: string
  stock: number
}

export interface NovaPaymentMethod {
  id: NovaPaymentMethodId
  name: string
  /** Inline data-URI SVG icon. Safe to use in <img src> or CSS background. */
  icon: string
  currencies: string[]
}

export interface NovaPurchaseRequest {
  productId: string
  quantity: number
  paymentMethod: NovaPaymentMethodId
  email?: string
  customerInfo?: Record<string, string>
}

export interface NovaPurchaseOptions {
  /** Idempotency key. Auto-generated if omitted. 16..128 chars [A-Za-z0-9_-]. */
  idempotencyKey?: string
  signal?: AbortSignal
}

export interface NovaPurchaseResult {
  orderId: string
  payUrl: string
  paymentMethod: NovaPaymentMethodId
  totalRub: number
  totalPay: number
  currency: string
}

export type NovaOrderStatusValue =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | (string & {})

export interface NovaOrderDelivery {
  type: string
  /** True when the order requires manual fulfillment by the seller. */
  manual: boolean
  /** Auto-delivery payload (codes/keys) once the order is COMPLETED. */
  content: string | null
  /** ISO timestamp of fulfillment, when applicable. */
  deliveredAt: string | null
}

export interface NovaOrderStatus {
  orderId: string
  status: NovaOrderStatusValue
  totalRub: number
  totalPay: number
  productId?: string
  productName?: string
  quantity?: number
  paymentMethod?: NovaPaymentMethodId
  createdAt: string
  delivery: NovaOrderDelivery | null
}

export interface NovaPreferences {
  locale?: string
  currency?: string
  theme?: 'auto' | 'light' | 'dark'
}

export interface NovaSDKConfig {
  apiBase?: string
  devMode?: boolean
  devShop?: Partial<NovaShop>
  devProducts?: NovaProduct[]
  devPaymentMethods?: NovaPaymentMethod[]
  /**
   * Whether `fetch` should send/receive credentials (cookies).
   * Defaults to `'include'` so the visitor cookie is persisted.
   */
  credentials?: RequestCredentials
  /**
   * Public project key (`nv_pk_…`). Required for all project-scoped calls.
   * If omitted, it will be picked up automatically from `getShop()` response.
   */
  projectKey?: string
  /**
   * Pre-known projectId. If omitted, it is inferred from `getShop()`.
   */
  projectId?: string
}

export type NovaTrackType =
  | 'pageview'
  | 'add_to_cart'
  | 'checkout_start'
  | 'purchase'
  | 'product_view'
  | (string & {})

export interface NovaTrackMeta {
  projectId?: string
  path?: string
  referrer?: string
  productId?: string
  [key: string]: unknown
}

export interface NovaCustomer {
  id: string
  email: string
  /** JWT, only present in verifyOtp() response. */
  token?: string
}

export interface NovaCustomerOrder {
  orderId: string
  status: string
  totalRub: number
  totalPay: number
  productId?: string | null
  productName?: string
  quantity?: number
  paymentMethod?: string
  createdAt: string
  delivery: NovaOrderDelivery | null
}

export interface NovaSupportMessage {
  id: string
  sender: 'customer' | 'support' | 'system' | string
  text: string
  createdAt: string
  fileId?: string | null
  fileType?: string | null
}

export interface NovaSupportChat {
  id: string
  orderId: string
  status: string
  messages: NovaSupportMessage[]
  rating: number | null
  supportToken?: string
}

export interface NovaSteamTopupRequest {
  /** Steam login (NOT a nickname). 2..64 chars [A-Za-z0-9_\-.]. */
  login: string
  /** Top-up amount in RUB (the "₽" the user wants in their Steam wallet). 50..100000. */
  amount: number
  /** Region hint (e.g. 'russia', 'kazakhstan'). Optional. */
  region?: string
  email?: string
  /** Reserved for future multi-method support — currently the bot path uses CryptoBot. */
  paymentMethod?: NovaPaymentMethodId
}

export interface NovaSteamTopupResult {
  orderId: string
  payUrl?: string | null
  totalPay: number
}

// ── Telegram Stars / Premium / Steam (multi-PSP via BotOrder) ───────────

export interface NovaStarsPackage { qty: number; priceRub: number }

export interface NovaStarsPricing {
  pricePerStar: number
  currency: string
  min: number
  max: number
  packages: NovaStarsPackage[]
  paymentMethods: NovaPaymentMethod[]
}

export interface NovaPremiumPlan { months: 3 | 6 | 12; priceRub: number; perMonthRub: number }

export interface NovaPremiumPricing {
  plans: NovaPremiumPlan[]
  currency: string
  paymentMethods: NovaPaymentMethod[]
}

export interface NovaSteamPricing {
  currencies: readonly string[]
  min: Record<string, number>
  max: Record<string, number>
  steamMarkup: number
  quoteRates?: Partial<Record<NovaSteamCurrency, NovaSteamQuoteRate>>
  paymentMethods: NovaPaymentMethod[]
}

export type NovaSteamCurrency = 'RUB' | 'KZT' | 'UAH'

export interface NovaSteamQuoteRate {
  rubPerUnit: number
  markupFactor: number
  minChargeRub: number
  maxChargeRub: number
}

export interface NovaSteamTopupQuoteRequest {
  /** Amount in RUB the buyer wants to spend before payment-provider fees. */
  amountRub: number
  /** Steam wallet currency the buyer wants to receive. */
  currency?: NovaSteamCurrency
}

export interface NovaTopupQuote {
  receiveAmount: number
  receiveCurrency: NovaSteamCurrency
  chargeRub: number
  remainingRub: number
  valid: boolean
  minChargeRub: number
  maxChargeRub: number
}

export interface NovaSteamGame {
  serviceId: number
  name: string
  category: string
  priceRub: number
  stock: number
}

export interface NovaSteamGamesCatalog {
  items: NovaSteamGame[]
  total: number
}

export interface NovaStarsOrderRequest {
  username: string
  quantity: number
  paymentMethod: string
  email?: string
}

export interface NovaPremiumOrderRequest {
  username: string
  months: 3 | 6 | 12
  paymentMethod: string
  email?: string
}

export interface NovaSteamTopupV2Request {
  login: string
  amount: number
  currency?: 'RUB' | 'KZT' | 'UAH'
  paymentMethod: string
  email?: string
}

export interface NovaFragmentOrderResult {
  orderId: string
  externalOrderId: string
  payUrl: string
  paymentMethod: string
  totalRub: number
  totalPay: number
  currency: string
}

export type NovaBotOrderStatus =
  | 'pending'
  | 'awaiting_payment'
  | 'paid'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface NovaBotOrderInfo {
  orderId: string
  externalOrderId: string
  kind: 'stars' | 'premium' | 'steam-topup' | 'product'
  status: NovaBotOrderStatus
  productName: string
  totalRub: number
  paymentMethod: string | null
  createdAt: string
  details: {
    username: string | null
    login: string | null
    months: number | null
    currency: string | null
    originalAmount: number | null
    txHash: string | null
    error: string | null
    deliveredAt: string | null
  }
}

export interface NovaProxyGbOption {
  gb: number
  priceRub: number
  priceUsd: number
}

export interface NovaProxyPricing {
  proxy: Record<string, { gbOptions: NovaProxyGbOption[] }>
  vpn: Array<{ durationDays: number; priceRub: number; free?: boolean }>
  countries: Array<{ code: string; name: string; flag?: string }>
  gbOptions: number[]
}

export interface NovaProxyOrderRequest {
  proxyType: 'datacenter' | 'residential' | 'mobile' | 'premium' | (string & {})
  gbAmount: number
  country?: string
  email?: string
  paymentMethod?: string
}

export interface NovaVpnOrderRequest {
  durationDays: 1 | 30 | 90 | 180 | 365 | (number & {})
  email?: string
  paymentMethod?: string
}

export type NovaSupportChatStreamEvent =
  | { type: 'open'; chatId: string }
  | { type: 'heartbeat'; t: number }
  | { type: 'message'; message: NovaSupportMessage }
  | { type: 'status'; status: string; rating?: number | null }
